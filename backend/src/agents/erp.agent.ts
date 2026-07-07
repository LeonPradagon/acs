import { AgentContext, AgentResult } from "./types";
import { ErpService } from "../services/erp.service";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { env } from "../common/env";

export class ErpAgent {
  static async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      const llm = new ChatOpenAI({
        apiKey: env.OLLAMA_API_KEY || "dummy",
        model: process.env.OLLAMA_MODEL || "gpt-oss:120b-cloud",
        configuration: {
          baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
        },
        temperature: 0.1,
        maxRetries: 1,
      });

      const tools = ErpService.getErpTools();
      const llmWithTools = llm.bindTools(tools);

      const systemPrompt = `You are an ERP Agent.
Your job is to fetch information from the ERP database to answer the user's query.
You have access to tools that can query the ERP system.
Schema for ErpEmployee and ErpSalary:
Employee: id, firstName, lastName, divisionName, jobTitle, hireDate, status
Salary: id, employeeId, baseSalary, allowance, currency, effectiveDate

Analyze the query, call the appropriate tool, and return the raw data retrieved.`;

      const response = await llmWithTools.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(context.query)
      ]);

      // Execute tool calls if any
      let rawData = null;
      let toolCalled = false;
      
      if (response.tool_calls && response.tool_calls.length > 0) {
        toolCalled = true;
        const toolCall = response.tool_calls[0]; // execute first tool
        const tool = tools.find(t => t.name === toolCall.name);
        if (tool) {
          console.log(`[ErpAgent] Executing tool: ${tool.name}`);
          rawData = await tool.invoke(toolCall.args);
        }
      }

      return {
        agentName: "erp",
        data: rawData || "No data could be retrieved from the ERP.",
        confidence: toolCalled && rawData ? 0.9 : 0.0,
        latencyMs: Date.now() - startTime,
        metadata: {
          toolCalled
        }
      };
    } catch (error) {
      console.error("[ErpAgent] Execution failed:", error);
      return {
        agentName: "erp",
        data: null,
        confidence: 0,
        latencyMs: Date.now() - startTime,
        metadata: { error: String(error) }
      };
    }
  }
}
