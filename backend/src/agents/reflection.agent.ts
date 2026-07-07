import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { env } from "../common/env";

export interface EvalResult {
  relevancyScore: number;
  faithfulnessScore: number;
  feedback: string;
}

export class ReflectionAgent {
  /**
   * Reflects on a poor response and evaluation feedback to generate a better instruction.
   * Returns a specific instruction to improve the response generation in the next loop.
   */
  static async reflect(
    originalQuery: string,
    draftResponse: string,
    evaluation: EvalResult
  ): Promise<string> {
    const startTime = Date.now();
    try {
      const llm = new ChatOpenAI({
        apiKey: env.OLLAMA_API_KEY || "dummy",
        model: process.env.OLLAMA_MODEL || "gpt-oss:120b-cloud",
        configuration: {
          baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
        },
        temperature: 0.2, // Low temp for analytical reflection
        maxRetries: 1,
      });

      const systemPrompt = `You are a Reflection and Self-Correction AI for an enterprise system.
Your job is to analyze a drafted response that received a low evaluation score and provide strict, actionable instructions on how to rewrite it properly.

Original User Query: "${originalQuery}"
Evaluator Feedback: "${evaluation.feedback}"
Current Relevancy Score: ${evaluation.relevancyScore}
Current Faithfulness Score: ${evaluation.faithfulnessScore}

Drafted Response:
"""
${draftResponse}
"""

Output ONLY the specific instructions for the AI generator on how to fix the issues, and exactly what to emphasize or avoid. Do not rewrite the response yourself.`;

      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage("Provide the improvement instructions.")
      ]);

      console.log(`[ReflectionAgent] Reflection complete in ${Date.now() - startTime}ms`);
      return response.content.toString();

    } catch (error) {
      console.error("[ReflectionAgent] Reflection failed:", error);
      return "Ensure you answer the query accurately based ONLY on the provided context.";
    }
  }
}
