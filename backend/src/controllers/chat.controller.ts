import { Request, Response } from "express";
import { retrieveContext } from "../services/rag.service";
import {
  getUniversalResponse,
  getStreamingResponse,
} from "../services/groq.service";
import { prisma } from "../config/db";

/**
 * List all chat sessions (for sidebar)
 */
export const listSessions = async (req: Request, res: Response) => {
  try {
    const sessions = await (prisma as any).chatSession.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          take: 1,
          orderBy: { createdAt: "asc" },
          where: { role: "user" },
          select: { content: true },
        },
      },
    });
    res.status(200).json({ success: true, data: sessions });
  } catch (error: any) {
    console.error("[Sessions] List error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Create a new chat session
 */
export const createSession = async (req: Request, res: Response) => {
  try {
    const session = await (prisma as any).chatSession.create({
      data: { title: "New Chat" },
    });
    res.status(201).json({ success: true, data: session });
  } catch (error: any) {
    console.error("[Sessions] Create error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Delete a chat session (cascade deletes messages)
 */
export const deleteSession = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  try {
    await (prisma as any).chatSession.delete({
      where: { id: sessionId },
    });
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("[Sessions] Delete error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Load chat history for a session
 */
export const getChatHistory = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  try {
    const history = await prisma.chatHistory.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Streaming Chat Endpoint (SSE)
 */
export const streamChat = async (req: Request, res: Response) => {
  const {
    question,
    model = "openai/gpt-oss-120b",
    messages = [],
    sessionId,
  } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    // 1. RAG Context
    const contexts = await retrieveContext(question);

    // 2. Build history
    const conversationHistory = messages
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .slice(-20)
      .map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Send sources first
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

    // 3. Stream tokens
    let fullResponse = "";

    await getStreamingResponse(
      question,
      contexts,
      model,
      conversationHistory,
      (token: string) => {
        fullResponse += token;
        res.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
      },
      () => {
        res.write(`data: ${JSON.stringify({ type: "done", model })}\n\n`);
        res.end();

        // Save to database + auto-title
        if (sessionId) {
          // Save messages
          prisma.chatHistory
            .createMany({
              data: [
                { sessionId, role: "user", content: question },
                { sessionId, role: "assistant", content: fullResponse },
              ],
            })
            .catch((err) =>
              console.warn("[Stream] Failed to save history:", err),
            );

          // Auto-title: use first user message as title
          (prisma as any).chatSession
            .updateMany({
              where: { id: sessionId, title: "New Chat" },
              data: {
                title:
                  question.substring(0, 60) +
                  (question.length > 60 ? "..." : ""),
                updatedAt: new Date(),
              },
            })
            .catch(() => {});

          // Always update session timestamp
          (prisma as any).chatSession
            .update({
              where: { id: sessionId },
              data: { updatedAt: new Date() },
            })
            .catch(() => {});
        }
      },
    );
  } catch (error: any) {
    console.error("[Stream Chat] Error:", error);
    res.write(
      `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`,
    );
    res.end();
  }
};

/**
 * Non-streaming universal chat (fallback)
 */
export const universalChat = async (req: Request, res: Response) => {
  const {
    question,
    model = "openai/gpt-oss-120b",
    messages = [],
    sessionId,
    ...options
  } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    const contexts = await retrieveContext(question);
    const conversationHistory = messages
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .slice(-20)
      .map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const responseData = await getUniversalResponse(
      question,
      contexts,
      model,
      conversationHistory,
    );

    if (sessionId) {
      try {
        await prisma.chatHistory.createMany({
          data: [
            { sessionId, role: "user", content: question },
            {
              sessionId,
              role: "assistant",
              content:
                typeof responseData.data === "string"
                  ? responseData.data
                  : JSON.stringify(responseData.data),
            },
          ],
        });
      } catch (dbErr) {
        console.warn("[Chat] Failed to save history:", dbErr);
      }
    }

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
      data_source: "real_data",
      is_real_data: true,
      data_summary: {
        data_points: contexts.length,
        confidence: 95,
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
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const healthCheck = (req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
};
