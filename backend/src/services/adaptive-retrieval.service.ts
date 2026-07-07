import { RagContext } from "./rag.service";

export interface RetrievalConfig {
  topK: number;
  weights: {
    semantic: number;
    keyword: number;
    recency: number;
    authority: number;
  };
  timeBoostWindow?: number; // Hours for recency boost
}

export class AdaptiveRetrievalService {
  /**
   * Determine retrieval parameters based on the query type/complexity.
   */
  static determineConfig(query: string, planHints?: any): RetrievalConfig {
    const q = query.toLowerCase();
    
    // Complex comparison or analysis query
    if (q.includes("bandingkan") || q.includes("analisis") || q.includes("perbedaan")) {
      return {
        topK: 30,
        weights: { semantic: 0.5, keyword: 0.2, recency: 0.1, authority: 0.2 }
      };
    }
    
    // Very recent data query
    if (q.includes("terbaru") || q.includes("hari ini") || q.includes("minggu ini")) {
      return {
        topK: 15,
        weights: { semantic: 0.3, keyword: 0.2, recency: 0.5, authority: 0.0 },
        timeBoostWindow: 24 // 24 hours
      };
    }
    
    // Specific entity search (keyword heavy)
    if (q.includes("id:") || q.includes("nomor") || q.includes("kode")) {
      return {
        topK: 10,
        weights: { semantic: 0.2, keyword: 0.8, recency: 0.0, authority: 0.0 }
      };
    }
    
    // Default config for simple Q&A
    return {
      topK: 10,
      weights: { semantic: 0.6, keyword: 0.3, recency: 0.1, authority: 0.0 }
    };
  }

  /**
   * Implements Reciprocal Rank Fusion (RRF) to combine multiple ranked lists.
   */
  static fuseRankings(rankedLists: RagContext[][], k: number = 60): RagContext[] {
    const fusedScores = new Map<string, { score: number, context: RagContext }>();
    
    for (const list of rankedLists) {
      list.forEach((item, rank) => {
        // Use a hash of the content or an ID if available to identify unique documents
        const key = item.documentId || item.content.substring(0, 100);
        
        const currentScore = fusedScores.get(key)?.score || 0;
        const newScore = currentScore + (1 / (k + rank + 1));
        
        // Retain the context with the highest original score or best metadata if updating
        const existingContext = fusedScores.get(key)?.context;
        const contextToSave = existingContext && (existingContext.score || 0) > (item.score || 0) ? existingContext : item;
        
        fusedScores.set(key, { score: newScore, context: contextToSave });
      });
    }

    // Convert map to array and sort by fused score
    const fusedArray = Array.from(fusedScores.values()).map(entry => {
      // We can optionally store the original score somewhere else or override it with the RRF score
      const ctx = { ...entry.context };
      ctx.score = entry.score; // Replace with RRF score
      return ctx;
    });

    fusedArray.sort((a, b) => (b.score || 0) - (a.score || 0));
    return fusedArray;
  }
}
