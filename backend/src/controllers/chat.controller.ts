import { Request, Response } from "express";
import { retrieveContext } from "../services/rag.service";
import {
  getUniversalResponse,
  getStreamingResponse,
} from "../services/groq.service";
import { prisma } from "../config/db";
import { AuthRequest } from "../middleware/auth.middleware";

// ============================================================
// Helper: Query Classification — skip RAG for general questions
// ============================================================
const GENERAL_PATTERNS = [
  /^(halo|hai|hi|hello|hey|selamat|good morning|good afternoon)/i,
  /^(apa itu|what is|jelaskan|explain|define|definisi)/i,
  /^(bagaimana cara|how to|how do|tutorial|cara)/i,
  /^(tolong|please|bantu|help)/i,
  /\b(coding|code|program|javascript|python|java|typescript|html|css|react|node)\b/i,
  /\b(matematika|math|hitung|calculate|rumus|formula)\b/i,
  /\b(translate|terjemahkan|bahasa)\b/i,
  /^(terima kasih|thank|thanks)/i,
];

const DATA_PATTERNS = [
  /\b(data|laporan|report|statistik|statistic|grafik|chart|tren|trend)\b/i,
  /\b(dokumen|document|file|arsip|archive)\b/i,
  /\b(keamanan|security|ancaman|threat|serangan|attack|cyber|siber)\b/i,
  /\b(analisis|analysis|monitor|intelijen|intelligence)\b/i,
  /\b(berapa|jumlah|total|persentase|percentage)\b/i,
  /\b(tahun|year|bulan|month|kuartal|quarter)\b\s*\d/i,
  /\b(isi|berkas|bacakan|ringkas|summary|file)\b/i,
];

function shouldSkipRAG(query: string): boolean {
  const hasDataPattern = DATA_PATTERNS.some((p) => p.test(query));
  if (hasDataPattern) return false;

  const hasGeneralPattern = GENERAL_PATTERNS.some((p) => p.test(query));
  // Be more conservative: skip only if remarkably general AND short
  if (hasGeneralPattern && query.length < 100) return true;

  return false;
}

// ============================================================
// Input Validation
// ============================================================
const MAX_QUERY_LENGTH = 5000;
const MAX_MESSAGES_LENGTH = 50;

function validateChatInput(
  question: any,
  messages: any,
): { valid: boolean; error?: string } {
  if (!question || typeof question !== "string") {
    return { valid: false, error: "Question is required" };
  }
  if (question.trim().length === 0) {
    return { valid: false, error: "Question cannot be empty" };
  }
  if (question.length > MAX_QUERY_LENGTH) {
    return {
      valid: false,
      error: `Question exceeds maximum length of ${MAX_QUERY_LENGTH} characters`,
    };
  }
  if (messages && !Array.isArray(messages)) {
    return { valid: false, error: "Messages must be an array" };
  }
  if (messages && messages.length > MAX_MESSAGES_LENGTH) {
    return {
      valid: false,
      error: `Too many messages (max ${MAX_MESSAGES_LENGTH})`,
    };
  }
  return { valid: true };
}

// ============================================================
// Session Management
// ============================================================

/**
 * List all chat sessions for the authenticated user
 */
export const listSessions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const sessions = await (prisma as any).chatSession.findMany({
      where: userId ? { userId } : {},
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
    res.status(500).json({ success: false, error: "Failed to load sessions" });
  }
};

/**
 * Create a new chat session linked to the authenticated user
 */
export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const session = await (prisma as any).chatSession.create({
      data: {
        title: "New Chat",
        ...(userId ? { userId } : {}),
      },
    });
    res.status(201).json({ success: true, data: session });
  } catch (error: any) {
    console.error("[Sessions] Create error:", error);
    res.status(500).json({ success: false, error: "Failed to create session" });
  }
};

/**
 * Rename a chat session
 */
export const renameSession = async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;
  const { title } = req.body;
  const userId = req.user?.userId;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ success: false, error: "Title is required" });
  }

  try {
    const session = await (prisma as any).chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }

    if (session.userId && userId && session.userId !== userId) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const updated = await (prisma as any).chatSession.update({
      where: { id: sessionId },
      data: { title: title.trim().substring(0, 100) },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[Sessions] Rename error:", error);
    res.status(500).json({ success: false, error: "Failed to rename session" });
  }
};

/**
 * Delete a chat session (only if owned by user)
 */
export const deleteSession = async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;
  const userId = req.user?.userId;

  try {
    // Verify ownership
    const session = await (prisma as any).chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }

    if (session.userId && userId && session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this session",
      });
    }

    await (prisma as any).chatSession.delete({
      where: { id: sessionId },
    });
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("[Sessions] Delete error:", error);
    res.status(500).json({ success: false, error: "Failed to delete session" });
  }
};

/**
 * Load chat history for a session (with ownership check)
 */
export const getChatHistory = async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;
  const userId = req.user?.userId;

  try {
    // Verify ownership
    const session = await (prisma as any).chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }

    if (session.userId && userId && session.userId !== userId) {
      return res
        .status(403)
        .json({ success: false, error: "Not authorized to view this session" });
    }

    const history = await prisma.chatHistory.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json({ success: true, data: history });
  } catch (error: any) {
    console.error("[Chat] History error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to load chat history" });
  }
};

// ============================================================
// AI-Generated Session Title
// ============================================================

async function generateSessionTitle(
  question: string,
  answer: string,
): Promise<string> {
  try {
    const { getUniversalResponse } = await import("../services/groq.service");
    const result = await getUniversalResponse(
      `Berikan judul singkat (maksimal 5 kata) untuk percakapan berikut. Jawab HANYA dengan judul saja, tanpa tanda kutip atau penjelasan.

Pertanyaan: ${question.substring(0, 200)}
Jawaban: ${answer.substring(0, 200)}`,
      [],
      "openai/gpt-oss-120b",
      [],
    );

    const title = (result.data as string)
      .replace(/["""''']/g, "")
      .trim()
      .substring(0, 80);

    return title || question.substring(0, 60);
  } catch {
    // Fallback to truncated question
    return question.substring(0, 60) + (question.length > 60 ? "..." : "");
  }
}

// ============================================================
// Streaming Chat Endpoint (SSE)
// ============================================================

export const streamChat = async (req: AuthRequest, res: Response) => {
  const {
    question,
    model = "openai/gpt-oss-120b",
    messages = [],
    sessionId,
  } = req.body;

  // Input validation
  const validation = validateChatInput(question, messages);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Handle client disconnect
  let isClientDisconnected = false;
  req.on("close", () => {
    isClientDisconnected = true;
  });

  try {
    // 1. Query Classification — skip RAG for general knowledge
    let contexts: any[] = [];
    if (!shouldSkipRAG(question)) {
      contexts = await retrieveContext(question);
    }

    // 2. Build history
    const conversationHistory = messages
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .slice(-20)
      .map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

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
    }

    // 3. Stream tokens
    let fullResponse = "";

    await getStreamingResponse(
      question,
      contexts,
      model,
      conversationHistory,
      (token: string) => {
        if (!isClientDisconnected) {
          fullResponse += token;
          res.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
        }
      },
      () => {
        if (!isClientDisconnected) {
          res.write(`data: ${JSON.stringify({ type: "done", model })}\n\n`);
          res.end();
        }

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

          // AI-Generated Title: use LLM for better titles
          (prisma as any).chatSession
            .findUnique({ where: { id: sessionId } })
            .then(async (session: any) => {
              if (session && session.title === "New Chat") {
                const aiTitle = await generateSessionTitle(
                  question,
                  fullResponse,
                );
                await (prisma as any).chatSession.update({
                  where: { id: sessionId },
                  data: { title: aiTitle, updatedAt: new Date() },
                });
              } else {
                // Just update timestamp
                await (prisma as any).chatSession.update({
                  where: { id: sessionId },
                  data: { updatedAt: new Date() },
                });
              }
            })
            .catch(() => {});
        }
      },
    );
  } catch (error: any) {
    console.error("[Stream Chat] Error:", error);
    if (!isClientDisconnected) {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          message:
            "Terjadi kesalahan saat memproses permintaan. Silakan coba lagi.",
        })}\n\n`,
      );
      res.end();
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
    ...options
  } = req.body;

  // Input validation
  const validation = validateChatInput(question, messages);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    // Query Classification
    let contexts: any[] = [];
    if (!shouldSkipRAG(question)) {
      contexts = await retrieveContext(question);
    }

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

// ============================================================
// Health Check
// ============================================================

export const healthCheck = (req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
};

// ============================================================
// Feedback System (👍/👎)
// ============================================================

/**
 * Submit feedback for a chat message
 */
export const submitFeedback = async (req: AuthRequest, res: Response) => {
  const { messageId, rating, comment } = req.body;
  const userId = req.user?.userId;

  if (!messageId || !rating) {
    return res
      .status(400)
      .json({ success: false, error: "messageId and rating are required" });
  }

  if (!["thumbs_up", "thumbs_down"].includes(rating)) {
    return res.status(400).json({
      success: false,
      error: "Rating must be 'thumbs_up' or 'thumbs_down'",
    });
  }

  try {
    const feedback = await (prisma as any).chatFeedback.upsert({
      where: { messageId },
      update: { rating, comment: comment || null },
      create: {
        messageId,
        userId: userId || null,
        rating,
        comment: comment || null,
      },
    });

    res.status(200).json({ success: true, data: feedback });
  } catch (error: any) {
    console.error("[Feedback] Submit error:", error);
    res.status(500).json({ success: false, error: "Failed to save feedback" });
  }
};

/**
 * Get feedback for messages in a session
 */
export const getFeedback = async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;

  try {
    const messages = await (prisma as any).chatHistory.findMany({
      where: { sessionId },
      include: {
        feedback: true,
      },
    });

    const feedbackMap: Record<string, any> = {};
    messages.forEach((m: any) => {
      if (m.feedback) {
        feedbackMap[m.id] = m.feedback;
      }
    });

    res.status(200).json({ success: true, data: feedbackMap });
  } catch (error: any) {
    console.error("[Feedback] Get error:", error);
    res.status(500).json({ success: false, error: "Failed to load feedback" });
  }
};
