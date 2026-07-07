import { ChatOpenAI } from "@langchain/openai";
import { shouldSkipRAG } from "./chat-stream.service";

export type ModelComplexity = "simple" | "complex" | "ultra";

export interface RoutedModel {
  modelName: string;
  temperature: number;
}

export class ModelRouterService {
  /**
   * Determine the complexity of the query.
   * - 'simple': Greetings, generic QA, short queries without RAG.
   * - 'complex': Analytical queries, queries requiring RAG.
   * - 'ultra': (Reserved for deep thinking / heavy analytics if specified by user)
   */
  static classifyQuery(query: string, hasRAGContext: boolean, effortLevel: string = "medium"): ModelComplexity {
    if (effortLevel === "ultra high") return "ultra";
    if (effortLevel === "high") return "complex";
    if (effortLevel === "low") return "simple";

    if (hasRAGContext) return "complex";

    if (shouldSkipRAG(query) && query.length < 50) {
      return "simple";
    }

    return "complex";
  }

  /**
   * Routes the query to the most appropriate model based on complexity.
   * 
   * Local Open Source Models in use:
   * - gpt-oss:120b-cloud (Large/Complex)
   * - gemma4:31b (Small/Fast/Simple)
   */
  static routeModel(complexity: ModelComplexity): RoutedModel {
    switch (complexity) {
      case "simple":
        return { modelName: process.env.OLLAMA_MODEL_SIMPLE || "gemma4:31b", temperature: 0.2 };
      case "ultra":
        return { modelName: process.env.OLLAMA_MODEL || "gpt-oss:120b-cloud", temperature: 0.5 };
      case "complex":
      default:
        return { modelName: process.env.OLLAMA_MODEL || "gpt-oss:120b-cloud", temperature: 0.3 };
    }
  }

  /**
   * Factory function to create an LLM instance with Fallback logic.
   * If the primary model fails (e.g., OOM, timeout), it falls back to a safer model.
   */
  static createLLMWithFallback(routedModel: RoutedModel, maxTokens: number = 4096, tools?: any[]) {
    // Primary LLM
    const primaryLlm = new ChatOpenAI({
      apiKey: process.env.OLLAMA_API_KEY || "dummy",
      model: routedModel.modelName,
      configuration: {
        baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
      },
      temperature: routedModel.temperature,
      maxTokens,
      maxRetries: 1, // Only 1 retry before fallback
    });

    // Fallback LLM (Always use a smaller, highly reliable model as fallback)
    const fallbackLlm = new ChatOpenAI({
      apiKey: process.env.OLLAMA_API_KEY || "dummy",
      model: process.env.OLLAMA_MODEL_FALLBACK || "gemma4:31b",
      configuration: {
        baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
      },
      temperature: 0.2,
      maxTokens,
      maxRetries: 2,
    });

    if (tools && tools.length > 0) {
      const primaryWithTools = primaryLlm.bindTools(tools);
      const fallbackWithTools = fallbackLlm.bindTools(tools);
      
      // Return LangChain's WithFallbacks wrapper
      return primaryWithTools.withFallbacks({
        fallbacks: [fallbackWithTools],
      });
    }

    // Return LangChain's WithFallbacks wrapper
    return primaryLlm.withFallbacks({
      fallbacks: [fallbackLlm],
    });
  }
}
