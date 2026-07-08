import { AgentContext, AgentResult } from "./types";
import { EvaluationService } from "../services/evaluation.service";

export class EvaluatorAgent {
  static async evaluate(query: string, responseText: string, contextUsed: any[]): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      // Evaluate relevancy and faithfulness using LLM-as-a-judge
      const result = await EvaluationService.evaluateResponseAsync(
        undefined, // sessionId not strictly needed for the raw eval
        query,
        responseText,
        contextUsed
      );

      return {
        agentName: "evaluator",
        data: result,
        confidence: 1.0,
        latencyMs: Date.now() - startTime
      };
    } catch (error) {
      console.error("[EvaluatorAgent] Execution failed:", error);
      return {
        agentName: "evaluator",
        data: null,
        confidence: 0,
        latencyMs: Date.now() - startTime,
        metadata: { error: String(error) }
      };
    }
  }
}
