import { Request, Response } from "express";
import { retrieveContext } from "../services/rag.service";
import {
  getUniversalResponse,
  getStreamingResponse,
} from "../services/groq.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { ChatService } from "../services/chat.service";
import { SessionService } from "../services/session.service";

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
// Streaming Chat Endpoint (SSE)
// ============================================================

export const streamChat = async (req: AuthRequest, res: Response) => {
  const {
    question,
    model = "openai/gpt-oss-120b",
    messages = [],
    sessionId,
    files = [],
  } = req.body;

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
    if (!isClientDisconnected) {
      res.write(
        `data: ${JSON.stringify({ type: "step", step: "🔍 Mengklasifikasikan query..." })}\n\n`,
      );
    }

    let contexts: any[] = [];
    if (!shouldSkipRAG(question)) {
      if (!isClientDisconnected) {
        res.write(
          `data: ${JSON.stringify({ type: "step", step: "📚 Mencari referensi di database internal..." })}\n\n`,
        );
      }
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
      res.write(
        `data: ${JSON.stringify({ type: "step", step: "🧠 Menyusun jawaban berdasarkan konteks..." })}\n\n`,
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
          res.write(
            `data: ${JSON.stringify({ type: "step", step: "✅ Selesai" })}\n\n`,
          );
          res.write(`data: ${JSON.stringify({ type: "done", model })}\n\n`);
          res.end();
        }

        // Save to database + auto-title (fire and forget with error handling)
        if (sessionId) {
          (async () => {
            try {
              await ChatService.saveMessages(
                sessionId,
                question,
                fullResponse,
                files,
              );

              // AI-Generated Title for new sessions
              const aiTitle = await ChatService.generateSessionTitle(
                question,
                fullResponse,
              );
              await SessionService.updateTitleIfDefault(sessionId, aiTitle);
            } catch (err) {
              console.error("[StreamChat] Error saving history:", err);
            }
          })();
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
    files = [],
  } = req.body;

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
