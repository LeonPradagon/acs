import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { prisma } from "../config/db";

interface EvalResult {
  relevancyScore: number;
  faithfulness: number;
  feedback: string;
}

export class EvaluationService {
  /**
   * Run an asynchronous LLM-as-a-Judge evaluation on a chatbot response.
   * This should be called without awaiting (fire and forget) or via a message queue.
   */
  static async evaluateResponseAsync(
    chatSessionId: string | undefined,
    question: string,
    answer: string,
    context: any[],
    modelUsed: string = "gpt-oss:120b-cloud"
  ) {
    try {
      const llm = new ChatOpenAI({
        apiKey: process.env.OLLAMA_API_KEY || "dummy",
        model: process.env.OLLAMA_MODEL || "gpt-oss:120b-cloud",
        configuration: {
          baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
        },
        temperature: 0.1, // low temperature for evaluation consistency
        maxRetries: 2,
      });

      const systemPrompt = `You are an expert AI evaluator.
Your task is to evaluate the quality of an AI Assistant's answer to a user's question, based on the provided context.
You must output a strictly valid JSON object with EXACTLY three keys:
- "relevancyScore": float between 0.0 and 1.0 (how well it answers the question)
- "faithfulness": float between 0.0 and 1.0 (how accurate it is relative to the context, 1.0 if no hallucination)
- "feedback": string (brief 1-sentence reasoning)

Do NOT wrap the JSON in markdown code blocks. Just output raw JSON.`;

      const userPrompt = `Context retrieved:
${JSON.stringify(context.map(c => c.content), null, 2)}

User Question:
${question}

AI Answer:
${answer}

Evaluate this now.`;

      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ]);

      let contentStr = response.content.toString().trim();
      
      // Clean up potential markdown formatting if the LLM disobeys
      if (contentStr.startsWith("```json")) {
        contentStr = contentStr.replace(/```json/g, "").replace(/```/g, "").trim();
      } else if (contentStr.startsWith("```")) {
        contentStr = contentStr.replace(/```/g, "").trim();
      }

      const parsed: EvalResult = JSON.parse(contentStr);

      await prisma.evaluationResult.create({
        data: {
          chatSessionId: chatSessionId || null,
          question,
          answer,
          contextUsed: context.length > 0 ? context : undefined,
          relevancyScore: parsed.relevancyScore,
          faithfulness: parsed.faithfulness,
          feedback: parsed.feedback,
          modelUsed
        }
      });

      console.log(`[Eval Pipeline] Evaluated Q: "${question.substring(0, 30)}..." | Rel: ${parsed.relevancyScore}, Faith: ${parsed.faithfulness}`);
    } catch (err: any) {
      console.warn(`[Eval Pipeline] Evaluation failed silently:`, err.message);
    }
  }
}
