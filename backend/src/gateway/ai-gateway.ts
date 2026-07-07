import { ChatOpenAI } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { CostTracker } from "./cost-tracker";
import { env } from "../common/env";

export interface GatewayRequest {
  model?: string;
  messages: any[];
  temperature?: number;
  userId?: string;
  maxRetries?: number;
}

export interface GatewayResponse {
  content: string;
  metadata: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    estimatedCostUsd: number;
    latencyMs: number;
  };
}

export class AIGateway {
  private static getProviderModel(modelName: string): BaseChatModel {
    // In the future, this can route to different providers (Anthropic, OpenAI, local)
    // based on the model name. For now, it defaults to Ollama format.
    return new ChatOpenAI({
      apiKey: env.OLLAMA_API_KEY || "dummy",
      model: modelName,
      configuration: {
        baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
      },
    });
  }

  static async invoke(req: GatewayRequest): Promise<GatewayResponse> {
    const startTime = Date.now();
    const modelName = req.model || process.env.OLLAMA_MODEL || "gpt-oss:120b-cloud";
    
    // Check Quota here if needed
    // ...

    const llm = this.getProviderModel(modelName);
    // Apply temperature if passed
    if (req.temperature !== undefined) {
      (llm as any).temperature = req.temperature;
    }
    
    const response = await llm.invoke(req.messages);
    const latency = Date.now() - startTime;
    
    // Estimate tokens (in real implementation, get from response.response_metadata)
    const usage = (response.response_metadata?.tokenUsage || {}) as any;
    const promptTokens = usage.promptTokens || Math.round(JSON.stringify(req.messages).length / 4);
    const completionTokens = usage.completionTokens || Math.round((response.content.toString()).length / 4);
    
    const cost = CostTracker.estimateCost(modelName, promptTokens, completionTokens);

    return {
      content: response.content.toString(),
      metadata: {
        model: modelName,
        promptTokens,
        completionTokens,
        estimatedCostUsd: cost,
        latencyMs: latency,
      }
    };
  }
}
