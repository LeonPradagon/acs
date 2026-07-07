import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { AgentContext, ExecutionPlan } from "./types";
import { env } from "../common/env";

export class PlannerAgent {
  /**
   * Plans the execution steps for a user query.
   */
  static async plan(context: AgentContext): Promise<ExecutionPlan> {
    const startTime = Date.now();
    try {
      const llm = new ChatOpenAI({
        apiKey: env.OLLAMA_API_KEY || "dummy",
        model: process.env.OLLAMA_MODEL_SIMPLE || "gemma4:31b-cloud",
        configuration: {
          baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
        },
        temperature: 0.1, // Low temperature for deterministic planning
        maxRetries: 1,
        modelKwargs: { response_format: { type: "json_object" } }
      });

      const systemPrompt = `You are an AI Query Planner for an enterprise intelligence system.
Your job is to analyze the user's query and output a JSON execution plan determining which agents should process it.

Available Agents:
- "retrieval": Search internal documents, policies, or general data using RAG.
- "erp": Query structured data like employee information, salaries, organization data from the ERP database.
- "email": Search the user's emails.
- "knowledge": Query the knowledge graph for complex entity relationships.
- "web_search": Search the public internet for external information, current events, or general facts not in internal data.
- "general": Answer simple conversational questions without needing data.

You must output valid JSON in the following format:
{
  "reasoning": "Explanation of why these agents were chosen",
  "steps": [
    {
      "agent": "agent_name",
      "action": "description of what the agent should do",
      "priority": 1
    }
  ],
  "needsMemory": true
}

Rules:
1. "steps" should be an array ordered by priority (1 is highest).
2. For simple conversational queries (like "hi" or general questions), just use "general".
3. For questions about salary, employees, or structured data, use "erp".
4. For questions about documents, files, reports, use "retrieval".
5. For questions about external facts, current events, or public knowledge, use "web_search".
6. Set "needsMemory" to true if the query seems to depend on past context or preferences.`;

      const userPrompt = `User Query: "${context.query}"\n\nGenerate the JSON execution plan:`;

      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      let planStr = response.content.toString().trim();
      
      // Strip markdown code block if present
      if (planStr.startsWith("```")) {
        const match = planStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
          planStr = match[1].trim();
        }
      }

      const plan = JSON.parse(planStr) as ExecutionPlan;
      
      // Default step if generation fails or provides empty steps
      if (!plan.steps || plan.steps.length === 0) {
        plan.steps = [{ agent: "general", action: "answer query", priority: 1 }];
      }

      console.log(`[PlannerAgent] Generated plan in ${Date.now() - startTime}ms:`, JSON.stringify(plan));
      return plan;
    } catch (error) {
      console.error("[PlannerAgent] Failed to generate plan, falling back to retrieval:", error);
      // Fallback plan
      return {
        reasoning: "Fallback plan due to planning failure.",
        steps: [{ agent: "retrieval", action: "search_documents", priority: 1 }],
        needsMemory: false,
      };
    }
  }
}
