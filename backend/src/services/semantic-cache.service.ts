import { redisConnection } from "../config/redis";
import { EmbeddingService } from "./embedding.service";

interface SemanticCacheEntry {
  originalQuery: string;
  response: string;
  embedding: number[];
}

export class SemanticCacheService {
  private static SIMILARITY_THRESHOLD = 0.95; // Very high threshold for exact/near-exact matches
  private static CACHE_TTL_SEC = 24 * 60 * 60; // 24 hours

  /**
   * Check if there's a highly similar query already cached in Redis.
   */
  static async checkCache(query: string, userId: string = "global"): Promise<string | null> {
    try {
      const keys = await redisConnection.keys(`semantic_cache:${userId}:*`);
      if (keys.length === 0) return null;

      const queryVector = await EmbeddingService.generateEmbedding(query);
      if (!queryVector) return null;

      let bestMatch: string | null = null;
      let highestSimilarity = 0;

      for (const key of keys) {
        const cachedData = await redisConnection.get(key);
        if (cachedData) {
          const entry: SemanticCacheEntry = JSON.parse(cachedData);
          const similarity = this.cosineSimilarity(queryVector, entry.embedding);

          if (similarity >= this.SIMILARITY_THRESHOLD && similarity > highestSimilarity) {
            highestSimilarity = similarity;
            bestMatch = entry.response;
          }
        }
      }

      if (bestMatch) {
        console.log(`[Semantic Cache] HIT with similarity ${highestSimilarity.toFixed(3)}`);
      }

      return bestMatch;
    } catch (err) {
      console.warn("[Semantic Cache] Check failed:", err);
      return null;
    }
  }

  /**
   * Save a generated response to the Semantic Cache.
   */
  static async setCache(query: string, response: string, userId: string = "global"): Promise<void> {
    try {
      const queryVector = await EmbeddingService.generateEmbedding(query);
      if (!queryVector) return;

      const cacheKey = `semantic_cache:${userId}:${Date.now()}`;
      const entry: SemanticCacheEntry = {
        originalQuery: query,
        response,
        embedding: queryVector
      };

      await redisConnection.setex(cacheKey, this.CACHE_TTL_SEC, JSON.stringify(entry));
    } catch (err) {
      console.warn("[Semantic Cache] Set failed:", err);
    }
  }

  private static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
