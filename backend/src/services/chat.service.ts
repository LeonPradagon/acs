import { prisma } from "../config/db";
import { getUniversalResponse } from "./groq.service";

/**
 * Service for chat-related business logic (title generation, history saving).
 */
export class ChatService {
  /**
   * Save a user message and assistant response to the database.
   */
  static async saveMessages(
    sessionId: string,
    question: string,
    answer: string,
    files?: any[],
  ) {
    await prisma.chatHistory.create({
      data: {
        sessionId,
        role: "user",
        content: question,
        files: files && files.length > 0 ? files : undefined,
      },
    });

    await prisma.chatHistory.create({
      data: {
        sessionId,
        role: "assistant",
        content: answer,
      },
    });
  }

  /**
   * Generate a short AI title for a chat session based on the first Q&A.
   */
  static async generateSessionTitle(
    question: string,
    answer: string,
  ): Promise<string> {
    try {
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
}
