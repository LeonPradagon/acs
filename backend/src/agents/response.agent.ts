import { AgentContext, AgentResult } from "./types";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { env } from "../common/env";

export class ResponseAgent {
  static async executeStream(
    context: AgentContext,
    onToken: (token: string) => void
  ): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      const llm = new ChatOpenAI({
        apiKey: env.OLLAMA_API_KEY || "dummy",
        model: process.env.OLLAMA_MODEL || "gpt-oss:120b-cloud",
        configuration: {
          baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
        },
        temperature: 0.2,
        streaming: true,
      });

      // Aggregate context from other agents
      let contextStr = "";
      if (context.agentResults) {
        for (const [agentName, result] of Object.entries(context.agentResults)) {
          if (result.data) {
            contextStr += `\n--- Context from ${agentName} ---\n`;
            if (Array.isArray(result.data)) {
              contextStr += result.data.map(d => JSON.stringify(d)).join("\n");
            } else {
              contextStr += JSON.stringify(result.data);
            }
          }
        }
      }

      const systemPrompt = `You are an AI assistant. Use the provided context to answer the user's query.
If you don't know the answer based on the context, say so.
Do not hallucinate.

Context:
${contextStr}`;

      let fullResponse = "";
      const stream = await llm.stream([
        new SystemMessage(systemPrompt),
        ...context.conversationHistory.map(m => 
          m.role === "user" ? new HumanMessage(m.content) : new SystemMessage(m.content)
        ),
        new HumanMessage(context.query)
      ]);

      for await (const chunk of stream) {
        const token = chunk.content.toString();
        fullResponse += token;
        onToken(token);
      }

      return {
        agentName: "response",
        data: fullResponse,
        confidence: 0.9,
        latencyMs: Date.now() - startTime
      };
    } catch (error) {
      console.error("[ResponseAgent] Execution failed:", error);
      return {
        agentName: "response",
        data: "An error occurred while generating the response.",
        confidence: 0,
        latencyMs: Date.now() - startTime,
        metadata: { error: String(error) }
      };
    }
  }
}
