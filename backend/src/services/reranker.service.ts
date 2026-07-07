import { pipeline, env } from "@xenova/transformers";

// Optional: don't use local cache if you strictly want to force download once, 
// but usually it's better to cache models locally.
env.allowLocalModels = true;

let rerankerPipeline: any = null;
let isInitializing = false;

export class RerankerService {
  /**
   * Initializes the Cross-Encoder model.
   * Using 'Xenova/bge-reranker-base' which is optimized for transformers.js
   */
  static async init() {
    if (rerankerPipeline || isInitializing) return;
    isInitializing = true;
    try {
      console.log("[Reranker] Loading cross-encoder model...");
      // bge-reranker uses sequence classification with 1 label (score)
      rerankerPipeline = await pipeline("text-classification", "Xenova/bge-reranker-base");
      console.log("[Reranker] Model loaded successfully.");
    } catch (error) {
      console.error("[Reranker] Failed to load model:", error);
    } finally {
      isInitializing = false;
    }
  }

  /**
   * Reranks a list of contexts against the query using a Cross-Encoder.
   */
  static async rerank(query: string, contexts: any[], topK: number = 5): Promise<any[]> {
    if (contexts.length === 0) return [];
    
    if (!rerankerPipeline) {
      await this.init();
      // If it still fails, gracefully fallback to original ranking
      if (!rerankerPipeline) {
        console.warn("[Reranker] Model not available, skipping reranking.");
        return contexts.slice(0, topK);
      }
    }

    try {
      // Prepare arrays for Xenova text-classification with text_pair
      const queries = Array(contexts.length).fill(String(query || ""));
      const docs = contexts.map(c => String(c.content || ""));

      // Predict scores
      const results = await rerankerPipeline(queries, { text_pair: docs });

      // results is typically an array of { label: 'LABEL_0', score: 0.99 }
      // Merge scores back into contexts
      const scoredContexts = contexts.map((c, index) => {
        // Some models output raw scores (logits), some output probabilities.
        // We just use the raw score value returned.
        const score = results[index]?.score || 0;
        return {
          ...c,
          rerankScore: score,
        };
      });

      // Sort by rerank score descending
      scoredContexts.sort((a, b) => b.rerankScore - a.rerankScore);

      return scoredContexts.slice(0, topK);
    } catch (error) {
      console.error("[Reranker] Reranking failed:", error);
      // Fallback to original order
      return contexts.slice(0, topK);
    }
  }
}
