import { Request, Response } from "express";
import { getUniversalResponse, getStreamingResponse } from "../services/ollama.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { OnyxService } from "../services/onyx.service";
import { prisma } from "../config/db";
import { encodingForModel, TiktokenModel } from "js-tiktoken";
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
import { EvaluationService } from "../services/evaluation.service";
import { SemanticCacheService } from "../services/semantic-cache.service";
import { MemoryService } from "../services/memory.service";
import { GuardrailsService } from "../services/guardrails.service";
import { KnowledgeGraphService } from "../services/knowledge-graph.service";

const recordTokenUsage = async (userId: string | undefined, question: string, response: string, model: string) => {
  if (!userId) return;

  let promptTokens = 0;
  let completionTokens = 0;

  try {
    // Gunakan gpt-4 tokenizer sebagai pendekatan standar karena Ollama Llama 3 / Mistral 
    // memiliki rasio tokenizer yang mirip dengan cl100k_base.
    const enc = encodingForModel("gpt-4");
    promptTokens = enc.encode(question).length;
    completionTokens = enc.encode(response).length;
  } catch (e) {
    // Fallback heuristic jika enc.encode gagal
    promptTokens = Math.ceil(question.length / 4);
    completionTokens = Math.ceil(response.length / 4);
  }

  const estimatedTokens = promptTokens + completionTokens;

  try {
    await prisma.tokenUsage.create({
      data: {
        userId,
        tokens: estimatedTokens,
        promptTokens,
        completionTokens,
        model
      }
    });
  } catch (err) {
    console.error("[Token Usage] Failed to save:", err);
  }
};

// ============================================================
// Streaming Chat Endpoint (SSE)
// ============================================================

export const streamChat = async (req: AuthRequest, res: Response): Promise<void> => {
    const { 
      question, 
      sessionId, 
      model = "openai/gpt-oss-120b", 
      effortLevel = "medium",
      files = [],
      messages = [],
      isThinking = false,
      isWebSearchEnabled = true,
      images = []
    } = req.body;

    if (!question) {
      res.status(400).json({ message: "Question is required." });
      return;
    }


    // 1. Input Guardrails
    const inputGuard = GuardrailsService.validateInput(question);
    if (!inputGuard.isValid) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ chunk: inputGuard.reason })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }

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
        saveAndTitleSession(sessionId, question, fullResponse, files, images);
      }
      
      // Record Token Usage
      recordTokenUsage(req.user?.userId, question, fullResponse, "onyx");

      // Async AI Memory Extraction & Summarization
      if (sessionId) {
        MemoryService.extractAndStoreEntities(req.user?.userId, question + "\n" + fullResponse);
        const history = buildConversationHistory(messages);
        if (history.length > 0 && history.length % 10 === 0) {
          MemoryService.summarizeConversation(sessionId);
        }
      }

      return;
    }
    // === End Onyx Integration Branch ===

    // 0. Semantic Cache Check
    const cachedResponse = await SemanticCacheService.checkCache(question, req.user?.userId);
    if (cachedResponse) {
      if (!isClientDisconnected) {
        res.write(`data: ${JSON.stringify({ type: "step", step: "⚡ Mengambil dari Semantic Cache..." })}\n\n`);
        
        // Stream the cached response quickly
        const chunks = cachedResponse.split(" ");
        for (let i = 0; i < chunks.length; i++) {
          if (isClientDisconnected) break;
          res.write(`data: ${JSON.stringify({ type: "token", token: chunks[i] + " " })}\n\n`);
          await new Promise(r => setTimeout(r, 10)); // tiny delay for effect
        }
        
        res.write(`data: ${JSON.stringify({ type: "step", step: "✅ Selesai (Cached)" })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "done", model: "Semantic Cache" })}\n\n`);
        clearInterval(heartbeatInterval);
        res.end();
      }
      return;
    }

    // 1. Query Classification — skip RAG for general knowledge
    if (!isClientDisconnected) {
      res.write(
        `data: ${JSON.stringify({ type: "step", step: "🔍 Mengklasifikasikan query..." })}\n\n`,
      );
    }

    // 2. Build history
    const conversationHistory = buildConversationHistory(messages);

    const { contexts, needsKnowledge } = await getRAGContext(question, {
      userId: req.user?.userId,
      divisionId: req.user?.divisionId,
      role: req.user?.role,
      clearanceLevel: req.user?.clearanceLevel,
      isWebSearchEnabled: isWebSearchEnabled
    }, conversationHistory);

    if (contexts.length > 0 && !isClientDisconnected) {
      res.write(
        `data: ${JSON.stringify({ type: "step", step: "📚 Mencari referensi terisolasi di database..." })}\n\n`,
      );
    }

    // 3. Get AI Memory (Summaries & Entities)
    let memoryContext = "";
    if (sessionId) {
      memoryContext = await MemoryService.getLongTermMemoryContext(sessionId, req.user?.userId);
    }

    let finalQueryForModel = question;
    if (memoryContext) {
      finalQueryForModel = `[LONG-TERM MEMORY]\n${memoryContext}\n\n[USER QUERY]\n${question}`;
    }

    if (isThinking) {
      let effortInstruction = "";
      switch (effortLevel.toLowerCase()) {
        case "low":
          effortInstruction = "Rely on immediate, intuitive logic. Focus on providing a direct, straightforward reasoning without over-analyzing or exploring alternative edge cases.";
          break;
        case "medium":
          effortInstruction = "Provide standard analytical reasoning. Break down the core components of the problem and verify basic constraints before formulating your answer.";
          break;
        case "high":
          effortInstruction = "Employ advanced analytical thinking. Methodically deconstruct the problem, explore alternative interpretations, check for subtle edge cases, and validate your logic step-by-step.";
          break;
        case "ultra high":
          effortInstruction = "Apply the highest level of rigorous, multi-layered cognitive processing. Actively brainstorm multiple hypotheses, heavily critique your own initial assumptions, perform mental simulations of different scenarios, and conduct exhaustive self-correction. Leave no logical stone unturned.";
          break;
        default:
          effortInstruction = "Provide standard analytical reasoning. Break down the core components of the problem and verify basic constraints before formulating your answer.";
      }
      
      const thinkingSystemPrompt = `\n\n[SYSTEM INSTRUCTION: You are required to use a chain-of-thought reasoning process before you output the final answer.\n${effortInstruction}\nIMPORTANT: You MUST enclose your entire reasoning process strictly inside <think> and </think> tags. Do not put any of your final answer inside these tags.\nExample:\n<think>\nFirst I will analyze...\n</think>\nFinal Answer here...]`;
      
      finalQueryForModel = question + thinkingSystemPrompt;
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
      finalQueryForModel,
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

          const { ConfidenceService } = require("../services/confidence.service");
          const confidence = ConfidenceService.calculate({
            retrievalScore: contexts.length > 0 ? Math.max(...contexts.map((c: any) => c.score || 0)) : 0.5,
            toolSuccessRate: 1.0, // Assuming no tools failed in this flow for now
            contextCoverage: contexts.length > 0 ? 0.8 : 0.2
          });

          // Generate Ontology if requested or needed by planner
          const shouldGenerateOntology = needsKnowledge || req.body.ontologyMode !== undefined;
          
          if (shouldGenerateOntology && !isClientDisconnected) {
            try {
              res.write(
                `data: ${JSON.stringify({ type: "step", step: "🕸️ Membuat graf hubungan..." })}\n\n`
              );
              const ontologyData = await KnowledgeGraphService.buildOntologyResponse(
                question, 
                fullResponse, 
                contexts
              );
              if (ontologyData && ontologyData.nodes && ontologyData.nodes.length > 0) {
                res.write(`data: ${JSON.stringify({ type: "ontology", data: ontologyData })}\n\n`);
              }
            } catch (err) {
              console.warn("[Ontology] Failed to generate:", err);
            }
          }

          res.write(
            `data: ${JSON.stringify({ type: "step", step: "✅ Selesai" })}\n\n`,
          );
          res.write(`data: ${JSON.stringify({ type: "done", model, confidence })}\n\n`);
          clearInterval(heartbeatInterval);
          res.end();
        }

        // Save to database + auto-title (fire and forget)
        if (sessionId) {
          saveAndTitleSession(sessionId, question, fullResponse, files, images);
        }
        
        // Record Token Usage
        recordTokenUsage(req.user?.userId, question, fullResponse, model);

        // Run Async AI Evaluation
        EvaluationService.evaluateResponseAsync(
          sessionId,
          question,
          fullResponse,
          contexts,
          model
        );

        // Async AI Memory Extraction & Summarization
        MemoryService.extractAndStoreEntities(req.user?.userId, question + "\n" + fullResponse);
        if (messages.length > 0 && messages.length % 10 === 0) {
          MemoryService.summarizeConversation(sessionId);
        }

        // Save to Semantic Cache
        if (!shouldSkipRAG(question)) {
          SemanticCacheService.setCache(question, fullResponse, req.user?.userId);
        }
      },
      abortController.signal,
      images
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
    images = [],
  } = req.body;

  try {
    // 1. Input Guardrails
    const inputGuard = GuardrailsService.validateInput(question);
    if (!inputGuard.isValid) {
      res.status(403).json({ isJson: false, data: inputGuard.reason });
      return;
    }

    const conversationHistory = buildConversationHistory(messages);

    // Query Classification & Multi-Query Retrieval
    const { contexts, needsKnowledge } = await getRAGContext(question, {
      userId: req.user?.userId,
      divisionId: req.user?.divisionId,
      role: req.user?.role,
      clearanceLevel: req.user?.clearanceLevel,
    }, conversationHistory);

    // Get AI Memory
    let memoryContext = "";
    if (sessionId) {
      memoryContext = await MemoryService.getLongTermMemoryContext(sessionId, req.user?.userId);
    }

    let finalQueryForModel = question;
    if (memoryContext) {
      finalQueryForModel = `[LONG-TERM MEMORY]\n${memoryContext}\n\n[USER QUERY]\n${question}`;
    }

    if (isThinking) {
      let effortInstruction = "";
      switch (effortLevel.toLowerCase()) {
        case "low":
          effortInstruction = "Rely on immediate, intuitive logic. Focus on providing a direct, straightforward reasoning without over-analyzing or exploring alternative edge cases.";
          break;
        case "medium":
          effortInstruction = "Provide standard analytical reasoning. Break down the core components of the problem and verify basic constraints before formulating your answer.";
          break;
        case "high":
          effortInstruction = "Employ advanced analytical thinking. Methodically deconstruct the problem, explore alternative interpretations, check for subtle edge cases, and validate your logic step-by-step.";
          break;
        case "ultra high":
          effortInstruction = "Apply the highest level of rigorous, multi-layered cognitive processing. Actively brainstorm multiple hypotheses, heavily critique your own initial assumptions, perform mental simulations of different scenarios, and conduct exhaustive self-correction. Leave no logical stone unturned.";
          break;
        default:
          effortInstruction = "Provide standard analytical reasoning. Break down the core components of the problem and verify basic constraints before formulating your answer.";
      }
      
      const thinkingSystemPrompt = `\n\n[SYSTEM INSTRUCTION: You are required to use a chain-of-thought reasoning process before you output the final answer.\n${effortInstruction}\nIMPORTANT: You MUST enclose your entire reasoning process strictly inside <think> and </think> tags. Do not put any of your final answer inside these tags.\nExample:\n<think>\nFirst I will analyze...\n</think>\nFinal Answer here...]`;
      
      finalQueryForModel = question + thinkingSystemPrompt;
    }

    const responseData = await getUniversalResponse(
      finalQueryForModel,
      contexts,
      model,
      conversationHistory,
      req.user?.divisionId || null,
      images
    );

    // Output Guardrails (PII Masking & Content Blocking)
    let answerContent = typeof responseData.data === "string"
            ? responseData.data
            : JSON.stringify(responseData.data);
            
    const outputGuard = GuardrailsService.validateAndSanitizeOutput(answerContent);
    answerContent = outputGuard.sanitizedText;

    // Update response data with sanitized text
    if (typeof responseData.data === "string") {
      responseData.data = answerContent;
    }

    if (sessionId) {
      try {
        await ChatService.saveMessages(
          sessionId,
          question,
          answerContent,
          files,
          images
        );
        
        // Record Token Usage
        recordTokenUsage(req.user?.userId, question, answerContent, model);
      } catch (dbErr) {
        console.warn("[UniversalChat] Failed to save history:", dbErr);
      }
    }

    // Run Async AI Evaluation (fire and forget)
    EvaluationService.evaluateResponseAsync(
      sessionId,
      question,
      answerContent,
      contexts,
      model
    );

    // Async AI Memory Extraction & Summarization
    if (sessionId) {
      MemoryService.extractAndStoreEntities(req.user?.userId, question + "\n" + answerContent);
      if (conversationHistory.length > 0 && conversationHistory.length % 10 === 0) {
        MemoryService.summarizeConversation(sessionId);
      }
    }

    // Save to Semantic Cache
    if (!shouldSkipRAG(question)) {
      SemanticCacheService.setCache(question, answerContent, req.user?.userId);
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

    // Generate Ontology if requested or needed by planner
    const shouldGenerateOntology = needsKnowledge || req.body.ontologyMode !== undefined;
    
    if (shouldGenerateOntology) {
      try {
        const ontologyData = await KnowledgeGraphService.buildOntologyResponse(
          question, 
          answerContent, 
          contexts
        );
        if (ontologyData && ontologyData.nodes && ontologyData.nodes.length > 0) {
          responseObj.ontology_data = ontologyData;
        }
      } catch (err) {
        console.warn("[Ontology] Failed to generate for universal chat:", err);
      }
    }

    res.status(200).json(responseObj);
  } catch (error: any) {
    console.error("[Universal Chat] Error:", error);
    res.status(500).json({
      error: "Terjadi kesalahan saat memproses permintaan. Silakan coba lagi.",
    });
  }
};
