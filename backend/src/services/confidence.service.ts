export interface ConfidenceBreakdown {
  overall: number;       // 0.0 - 1.0
  level: "HIGH" | "MEDIUM" | "LOW";
  signals: {
    retrievalScore: number;     // Avg RAG relevance
    rerankerScore: number;      // Avg cross-encoder score
    toolSuccessRate: number;    // % tools that succeeded
    faithfulnessScore: number;  // From evaluator agent
    contextCoverage: number;    // How much context was used
  };
}

export class ConfidenceService {
  /**
   * Calculates a composite confidence score based on multiple signals.
   */
  static calculate(signals: Partial<ConfidenceBreakdown["signals"]>): ConfidenceBreakdown {
    const defaultSignals = {
      retrievalScore: 0.5,
      rerankerScore: 0.5,
      toolSuccessRate: 1.0,
      faithfulnessScore: 0.8,
      contextCoverage: 0.5,
      ...signals
    };

    // Weights
    const weights = {
      retrievalScore: 0.25,
      rerankerScore: 0.20,
      toolSuccessRate: 0.15,
      faithfulnessScore: 0.25,
      contextCoverage: 0.15
    };

    let overall = 
      (defaultSignals.retrievalScore * weights.retrievalScore) +
      (defaultSignals.rerankerScore * weights.rerankerScore) +
      (defaultSignals.toolSuccessRate * weights.toolSuccessRate) +
      (defaultSignals.faithfulnessScore * weights.faithfulnessScore) +
      (defaultSignals.contextCoverage * weights.contextCoverage);

    overall = Math.min(1.0, Math.max(0.0, overall));

    let level: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
    if (overall >= 0.8) level = "HIGH";
    else if (overall <= 0.4) level = "LOW";

    return {
      overall,
      level,
      signals: defaultSignals
    };
  }
}
