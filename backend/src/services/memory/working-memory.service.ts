import { redisConnection } from "../../config/redis";

export interface WorkingMemory {
  sessionId: string;
  activeContext: string[];
  toolCallHistory: any[];
  planState: any;
}

export class WorkingMemoryService {
  /**
   * Retrieves the current working memory (short-term session context)
   */
  static async get(sessionId: string): Promise<WorkingMemory> {
    try {
      const data = await redisConnection.get(`wm:${sessionId}`);
      if (data) {
        return JSON.parse(data) as WorkingMemory;
      }
    } catch (err) {
      console.warn("[WorkingMemory] Failed to read from Redis:", err);
    }
    
    return {
      sessionId,
      activeContext: [],
      toolCallHistory: [],
      planState: {}
    };
  }

  /**
   * Updates the working memory
   */
  static async update(sessionId: string, memory: WorkingMemory): Promise<void> {
    try {
      // Expire working memory after 24 hours of inactivity
      await redisConnection.set(`wm:${sessionId}`, JSON.stringify(memory), "EX", 86400);
    } catch (err) {
      console.warn("[WorkingMemory] Failed to save to Redis:", err);
    }
  }
}
