import { Request, Response } from "express";
import { getUniversalResponse, getStreamingResponse } from "../services/ollama.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { OnyxService } from "../services/onyx.service";
import { prisma } from "../config/db";
import {
  shouldSkipRAG,
  buildConversationHistory,
  getRAGContext,
  saveAndTitleSession,
  parseExportData,
  cleanExportTags,
} from "../services/chat-stream.service";
import { ChatService } from "../services/chat.service";
import { SessionService } from "../services/session.service";
import { retrieveContext } from "../services/rag.service";

// ============================================================
// Streaming Chat Endpoint (SSE)
// ============================================================

export const streamChat = async (req: AuthRequest, res: Response) => {
  const {
    question,
    model = "openai/gpt-oss-120b",
    messages = [],
    sessionId,
    files = [],
    effortLevel = "medium",
    isThinking = false,
  } = req.body;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Handle client disconnect
  const abortController = new AbortController();
  let isClientDisconnected = false;

  // SC6: SSE heartbeat to prevent proxy/load balancer timeout
  const heartbeatInterval = setInterval(() => {
    if (!isClientDisconnected) {
      res.write(": heartbeat\n\n");
    }
  }, 15000);

  req.on("close", () => {
    isClientDisconnected = true;
    abortController.abort();
    clearInterval(heartbeatInterval);
    console.log("[StreamChat] Client disconnected, aborting LLM stream...");
  });

  try {
    // === Onyx Integration Branch ===
    if (OnyxService.isConfigured) {
      if (!isClientDisconnected) {
          res.write(`data: ${JSON.stringify({ type: "step", step: "🔄 Menyambungkan ke Onyx Enterprise AI..." })}\n\n`);
      }

      let onyxSessionId = null;
      
      // Attempt to load existing onyxSessionId
      if (sessionId) {
          const sessionModel = await prisma.chatSession.findUnique({ where: { id: sessionId } });
          if (sessionModel?.onyxSessionId) {
             onyxSessionId = sessionModel.onyxSessionId;
          } else {
             // Create a new session in Onyx for this existing ACS ChatSession
             onyxSessionId = await OnyxService.createSession();
             await prisma.chatSession.update({
                 where: { id: sessionId },
                 data: { onyxSessionId }
             });
          }
      } else {
          // If the user hasn't saved the chat yet, just create a temporary session
          onyxSessionId = await OnyxService.createSession();
      }

      let fullResponse = "";
      
      await OnyxService.streamChat(
          onyxSessionId,
          question,
          (token: string) => {
              if (!isClientDisconnected) {
                  fullResponse += token;
                  res.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
              }
          }
      );

      if (!isClientDisconnected) {
          res.write(`data: ${JSON.stringify({ type: "step", step: "✅ Selesai" })}\n\n`);
          res.write(`data: ${JSON.stringify({ type: "done", model: "Onyx API backend" })}\n\n`);
          clearInterval(heartbeatInterval);
          res.end();
      }

      // Save to database + auto-title (fire and forget)
      if (sessionId) {
        saveAndTitleSession(sessionId, question, fullResponse, files);
      }
      return;
    }
    // === End Onyx Integration Branch ===

    // 1. Query Classification — skip RAG for general knowledge
    if (!isClientDisconnected) {
      res.write(
        `data: ${JSON.stringify({ type: "step", step: "🔍 Mengklasifikasikan query..." })}\n\n`,
      );
    }

    const contexts = await getRAGContext(question, {
      userId: req.user?.userId,
      divisionId: req.user?.divisionId,
      role: req.user?.role,
      clearanceLevel: req.user?.clearanceLevel,
    });

    if (contexts.length > 0 && !isClientDisconnected) {
      res.write(
        `data: ${JSON.stringify({ type: "step", step: "📚 Mencari referensi terisolasi di database..." })}\n\n`,
      );
    }

    // 2. Build history
    const conversationHistory = buildConversationHistory(messages);

    if (isThinking) {
      let effortInstruction = "";
      switch (effortLevel.toLowerCase()) {
        case "low":
          effortInstruction = "Keep your thinking process brief and concise. Focus only on the most essential points.";
          break;
        case "medium":
          effortInstruction = "Provide a balanced step-by-step thinking process before answering.";
          break;
        case "high":
          effortInstruction = "Perform a thorough step-by-step analysis. Consider multiple angles and edge cases before answering.";
          break;
        case "ultra high":
          effortInstruction = "Engage in an extremely detailed, exhaustive internal monologue. Break down the problem into fundamental components, evaluate all possible strategies, self-correct if necessary, and synthesize the best possible approach before providing the final answer.";
          break;
        default:
          effortInstruction = "Provide a balanced step-by-step thinking process before answering.";
      }
      
      const thinkingSystemPrompt = `You are required to use a chain-of-thought reasoning process before you output the final answer.\n${effortInstruction}\nIMPORTANT: You MUST enclose your entire reasoning process strictly inside <think> and </think> tags. Do not put any of your final answer inside these tags.\nExample:\n<think>\nFirst I will analyze...\n</think>\nFinal Answer here...`;
      
      conversationHistory.unshift({ role: "system", content: thinkingSystemPrompt });
    }

    // Send sources first
    if (!isClientDisconnected) {
      res.write(
        `data: ${JSON.stringify({
          type: "sources",
          sources: contexts.map((c, i) => ({
            id: `source-${i}`,
            title: c.source,
            content: c.content,
            score: c.score || 0.8,
          })),
        })}\n\n`,
      );
      res.write(
        `data: ${JSON.stringify({ type: "step", step: "🧠 Menyusun jawaban berdasarkan konteks..." })}\n\n`,
      );
    }

    // 3. Stream tokens — buffer to intercept <EXPORT_DATA> blocks
    let fullResponse = "";
    let isBufferingExport = false;
    let exportBuffer = "";
    let heldBackChars = "";

    const EXPORT_TAG_START = "<EXPORT_DATA>";

    await getStreamingResponse(
      question,
      contexts,
      model,
      conversationHistory,
      req.user?.divisionId || null,
      (token: string) => {
        if (isClientDisconnected) return;
        fullResponse += token;

        if (isBufferingExport) {
          exportBuffer += token;
          return;
        }

        const tailCheck = fullResponse.slice(-EXPORT_TAG_START.length * 2);
        if (tailCheck.includes(EXPORT_TAG_START)) {
          isBufferingExport = true;
          const tagStartIdx = fullResponse.lastIndexOf(EXPORT_TAG_START);
          const alreadySentUpTo = fullResponse.length - token.length;
          if (tagStartIdx > alreadySentUpTo) {
            const safePart = token.substring(0, tagStartIdx - alreadySentUpTo);
            if (safePart) {
              res.write(`data: ${JSON.stringify({ type: "token", token: safePart })}\n\n`);
            }
          }
          exportBuffer = fullResponse.slice(tagStartIdx);
          heldBackChars = "";
          return;
        }

        let partialMatch = false;
        for (let len = 1; len < EXPORT_TAG_START.length; len++) {
          if (fullResponse.endsWith(EXPORT_TAG_START.substring(0, len))) {
            partialMatch = true;
            break;
          }
        }

        if (partialMatch) {
          heldBackChars += token;
          return;
        }

        if (heldBackChars) {
          res.write(`data: ${JSON.stringify({ type: "token", token: heldBackChars })}\n\n`);
          heldBackChars = "";
        }
        res.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
      },
      async () => {
        if (!isClientDisconnected) {
          // Check for Document Export request
          const exportData = parseExportData(fullResponse);
          if (exportData) {
            res.write(
              `data: ${JSON.stringify({ type: "step", step: "⚙️ Men-generate dokumen..." })}\n\n`
            );
            try {
              const { DocumentGeneratorService } = require("../services/document-generator.service");
              const base64Payload = await DocumentGeneratorService.generate(
                exportData.format,
                exportData.title,
                exportData.content
              );

              res.write(
                `data: ${JSON.stringify({
                  type: "file_export",
                  format: exportData.format,
                  filename: `${exportData.title}.${exportData.format}`,
                  payload: base64Payload,
                })}\n\n`
              );
            } catch (err) {
              console.error("[Document Export Error]", err);
            }
          }

          res.write(
            `data: ${JSON.stringify({ type: "step", step: "✅ Selesai" })}\n\n`,
          );
          res.write(`data: ${JSON.stringify({ type: "done", model })}\n\n`);
          clearInterval(heartbeatInterval);
          res.end();
        }

        // Save to database + auto-title (fire and forget)
        if (sessionId) {
          saveAndTitleSession(sessionId, question, fullResponse, files);
        }
      },
      abortController.signal
    );
  } catch (error: any) {
    if (error.name === "AbortError" || isClientDisconnected) {
      console.log("[Stream Chat] Request aborted safely.");
      clearInterval(heartbeatInterval);
      return;
    }
    console.error("[Stream Chat] Error:", error);
    if (!isClientDisconnected) {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          message:
            "Terjadi kesalahan saat memproses permintaan. Silakan coba lagi.",
        })}\n\n`,
      );
      clearInterval(heartbeatInterval);
      res.end();
    } else {
      clearInterval(heartbeatInterval);
    }
  }
};

// ============================================================
// Non-streaming universal chat (fallback)
// ============================================================

export const universalChat = async (req: AuthRequest, res: Response) => {
  const {
    question,
    model = "openai/gpt-oss-120b",
    messages = [],
    sessionId,
    files = [],
    effortLevel = "medium",
    isThinking = false,
  } = req.body;

  try {
    // Query Classification
    const contexts = await getRAGContext(question, {
      userId: req.user?.userId,
      divisionId: req.user?.divisionId,
      role: req.user?.role,
      clearanceLevel: req.user?.clearanceLevel,
    });

    const conversationHistory = buildConversationHistory(messages);

    if (isThinking) {
      let effortInstruction = "";
      switch (effortLevel.toLowerCase()) {
        case "low":
          effortInstruction = "Keep your thinking process brief and concise. Focus only on the most essential points.";
          break;
        case "medium":
          effortInstruction = "Provide a balanced step-by-step thinking process before answering.";
          break;
        case "high":
          effortInstruction = "Perform a thorough step-by-step analysis. Consider multiple angles and edge cases before answering.";
          break;
        case "ultra high":
          effortInstruction = "Engage in an extremely detailed, exhaustive internal monologue. Break down the problem into fundamental components, evaluate all possible strategies, self-correct if necessary, and synthesize the best possible approach before providing the final answer.";
          break;
        default:
          effortInstruction = "Provide a balanced step-by-step thinking process before answering.";
      }
      
      const thinkingSystemPrompt = `You are required to use a chain-of-thought reasoning process before you output the final answer.\n${effortInstruction}\nIMPORTANT: You MUST enclose your entire reasoning process strictly inside <think> and </think> tags. Do not put any of your final answer inside these tags.\nExample:\n<think>\nFirst I will analyze...\n</think>\nFinal Answer here...`;
      
      conversationHistory.unshift({ role: "system", content: thinkingSystemPrompt });
    }

    const responseData = await getUniversalResponse(
      question,
      contexts,
      model,
      conversationHistory,
      req.user?.divisionId || null,
    );

    if (sessionId) {
      try {
        const answerContent =
          typeof responseData.data === "string"
            ? responseData.data
            : JSON.stringify(responseData.data);
        await ChatService.saveMessages(
          sessionId,
          question,
          answerContent,
          files,
        );
      } catch (dbErr) {
        console.warn("[UniversalChat] Failed to save history:", dbErr);
      }
    }

    // Calculate real confidence based on RAG results
    const avgScore =
      contexts.length > 0
        ? contexts.reduce((sum, c) => sum + (c.score || 0), 0) / contexts.length
        : 0;
    const confidence = contexts.length > 0 ? Math.round(avgScore * 100) : null;

    let responseObj: any = {
      model,
      timestamp: new Date().toISOString(),
      sources: contexts.map((c, i) => ({
        id: `source-${i}`,
        title: c.source,
        content: c.content,
        score: c.score || 0.8,
        type: "database_hybrid_search",
      })),
      data_source: contexts.length > 0 ? "real_data" : "general_knowledge",
      is_real_data: contexts.length > 0,
      data_summary: {
        data_points: contexts.length,
        ...(confidence !== null ? { confidence } : {}),
      },
    };

    if (responseData.isJson) {
      Object.assign(responseObj, responseData.data);
    } else {
      responseObj.type = "text_response";
      responseObj.answer = responseData.data;
      responseObj.narrative = responseData.data;
    }

    res.status(200).json(responseObj);
  } catch (error: any) {
    console.error("[Universal Chat] Error:", error);
    res.status(500).json({
      error: "Terjadi kesalahan saat memproses permintaan. Silakan coba lagi.",
    });
  }
};
