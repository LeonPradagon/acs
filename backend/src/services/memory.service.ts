import { prisma } from "../config/db";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export class MemoryService {
  /**
   * Periodically summarizes a chat session to maintain long-term context
   * without blowing up the token window.
   */
  static async summarizeConversation(sessionId: string): Promise<void> {
    try {
      // Get all un-summarized messages (or just the recent block)
      const messages = await prisma.chatHistory.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
      });

      // If less than 10 messages, maybe skip summarizing for now
      if (messages.length < 10) return;

      // For simplicity, we just summarize everything we have so far
      const conversationText = messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n\n");

      const llm = new ChatOpenAI({
        apiKey: process.env.OLLAMA_API_KEY || "dummy",
        model: process.env.OLLAMA_MODEL || "gpt-oss:120b-cloud",
        configuration: {
          baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
        },
        temperature: 0.1,
      });

      const systemPrompt = `You are a memory condensation agent.
Your task is to summarize the following conversation into a concise summary of key facts, 
decisions, and context. Do not include conversational filler. Focus on what would be 
useful for an AI to remember if they pick up this conversation weeks later.`;

      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(conversationText),
      ]);

      const summary = response.content.toString().trim();

      // Save to DB
      await prisma.conversationSummary.create({
        data: {
          sessionId,
          summary,
        },
      });

      console.log(`[MemoryService] Summarized session ${sessionId}`);
    } catch (error) {
      console.error("[MemoryService] Failed to summarize conversation:", error);
    }
  }

  /**
   * Extracts entities from a user query/response and stores them globally for the user.
   */
  static async extractAndStoreEntities(userId: string | undefined, text: string): Promise<void> {
    if (!userId) return;

    try {
      const llm = new ChatOpenAI({
        apiKey: process.env.OLLAMA_API_KEY || "dummy",
        model: process.env.OLLAMA_MODEL || "gpt-oss:120b-cloud",
        configuration: {
          baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
        },
        temperature: 0.0,
      });

      const systemPrompt = `Extract key entities from the user's text. 
Entities can be: PERSON, ORGANIZATION, PROJECT, PREFERENCE (e.g. "prefers dark mode", "always wants short answers").
Format as JSON array of objects: [{"entityType": "TYPE", "entityName": "Name", "entityValue": "Context/Value"}].
If no clear entities exist, output an empty array [].`;

      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(text),
      ]);

      let jsonStr = response.content.toString().trim();
      
      // Remove markdown blocks if any
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
      }

      const entities = JSON.parse(jsonStr);

      if (Array.isArray(entities) && entities.length > 0) {
        // Prepare bulk insert
        const data = entities.map((e: any) => ({
          userId,
          entityType: e.entityType || "UNKNOWN",
          entityName: e.entityName || "Unknown",
          entityValue: e.entityValue || "",
        }));

        await prisma.entityMemory.createMany({
          data,
        });

        console.log(`[MemoryService] Extracted ${entities.length} entities for user ${userId}`);
      }
    } catch (error) {
      // Quiet fail to not interrupt main flow
      console.warn("[MemoryService] Failed to extract entities.");
    }
  }

  /**
   * Retrieves long-term memory (summaries + entities) to inject into the prompt.
   */
  static async getLongTermMemoryContext(sessionId: string, userId?: string): Promise<string> {
    let memoryContext = "";

    try {
      // 1. Get recent summary
      const latestSummary = await prisma.conversationSummary.findFirst({
        where: { sessionId },
        orderBy: { createdAt: "desc" },
      });

      if (latestSummary) {
        memoryContext += `[Previous Conversation Summary]:\n${latestSummary.summary}\n\n`;
      }

      // 2. Get user entities
      if (userId) {
        const entities = await prisma.entityMemory.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 10, // top 10 recent entities
        });

        if (entities.length > 0) {
          memoryContext += `[User Profile & Entities]:\n`;
          entities.forEach((e: any) => {
            memoryContext += `- ${e.entityType} (${e.entityName}): ${e.entityValue}\n`;
          });
          memoryContext += "\n";
        }
      }
    } catch (error) {
      console.error("[MemoryService] Failed to retrieve memory:", error);
    }

    return memoryContext.trim();
  }
}
