export const MODEL_COSTS: Record<string, { promptPer1K: number; completionPer1K: number }> = {
  "gpt-oss:120b-cloud": { promptPer1K: 0.002, completionPer1K: 0.006 },
  "gemma4:31b": { promptPer1K: 0.0005, completionPer1K: 0.0015 },
  "llama3:8b": { promptPer1K: 0.0001, completionPer1K: 0.0002 },
};

export class CostTracker {
  static estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    const costProfile = MODEL_COSTS[model];
    if (!costProfile) {
      // Default fallback cost if unknown model
      return (promptTokens / 1000) * 0.001 + (completionTokens / 1000) * 0.002;
    }
    
    const promptCost = (promptTokens / 1000) * costProfile.promptPer1K;
    const completionCost = (completionTokens / 1000) * costProfile.completionPer1K;
    
    return parseFloat((promptCost + completionCost).toFixed(6));
  }
}
