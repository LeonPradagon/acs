import { AgentContext, AgentResult } from "./types";
import { RagContext, retrieveContext } from "../services/rag.service";
import { QueryRewriterService } from "../services/query-rewriter.service";
import { RerankerService } from "../services/reranker.service";
import { ContextCompressorService } from "../services/context-compressor.service";
import { AdaptiveRetrievalService } from "../services/adaptive-retrieval.service";

export class RetrievalAgent {
  static async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      // 1. Generate optimized multi-queries (e.g. 3 variations)
      let queries = [context.query];
      try {
        const optimized = await QueryRewriterService.generateMultiQueries(context.query);
        if (optimized.length > 0) {
          queries = optimized;
        }
      } catch (err) {
        console.warn("[RetrievalAgent] Failed to generate multi-queries:", err);
      }

      console.log(`[RetrievalAgent] Running retrieval for queries:`, queries);

      // 2. Retrieve contexts in parallel for all query variations
      const retrievalPromises = queries.map(q => 
        retrieveContext(q, context.userId, context.divisionId, context.role, context.clearanceLevel)
      );
      const resultsArray = await Promise.all(retrievalPromises);
      // 3. Merge and deduplicate results using RRF (Reciprocal Rank Fusion)
      let finalContexts = AdaptiveRetrievalService.fuseRankings(resultsArray);
      
      // 4. Rerank
      if (finalContexts.length > 0) {
        finalContexts = await RerankerService.rerank(context.query, finalContexts, 10);
      }

      // 5. Compress
      if (finalContexts.length > 0) {
        finalContexts = await ContextCompressorService.compressContexts(context.query, finalContexts);
      }

      // Calculate confidence
      let maxScore = 0;
      if (finalContexts.length > 0) {
        maxScore = Math.max(...finalContexts.map(c => c.score || 0));
      }
      // Assuming scores are between 0 and 1, usually typical for cosine similarity
      // Or they could be BM25 scores (which can be > 1), but let's normalize roughly.
      let confidence = Math.min(1.0, maxScore);

      return {
        agentName: "retrieval",
        data: finalContexts,
        confidence: confidence,
        latencyMs: Date.now() - startTime,
        metadata: {
          queriesUsed: queries,
          totalRetrieved: finalContexts.length
        }
      };
    } catch (error) {
      console.error("[RetrievalAgent] Execution failed:", error);
      return {
        agentName: "retrieval",
        data: [],
        confidence: 0,
        latencyMs: Date.now() - startTime,
        metadata: { error: String(error) }
      };
    }
  }
}
