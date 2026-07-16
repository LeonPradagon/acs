import { AgentContext, AgentResult } from "./types";
import { EmailService } from "../services/email.service";
import { ModelRouterService } from "../services/model-router.service";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";

const SearchIntentSchema = z.object({
  keyword: z.string().optional().describe("General keywords to search for in body"),
  subject: z.string().optional().describe("Specific words expected in the subject line"),
  from: z.string().optional().describe("Sender name or email address"),
  isSearch: z.boolean().describe("Whether this query requires searching (true) or just getting recent inbox (false)"),
});

export class EmailAgent {
  static async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      // 1. Use LLM to extract search intent from query
      const llm = new ChatOpenAI({
        apiKey: process.env.OLLAMA_API_KEY || "dummy",
        model: "gemma4:31b",
        configuration: {
          baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
        },
        temperature: 0.1,
      });
      const structuredLlm = llm.withStructuredOutput(SearchIntentSchema);
      
      const prompt = `Analyze the following user query and extract email search parameters. 
If the user is just asking for "recent emails" or "my inbox", set isSearch to false.
If they are looking for specific emails (e.g. "email from John", "email about project X"), set isSearch to true and fill the appropriate fields.

User Query: "${context.query}"`;

      let intent;
      try {
        intent = await structuredLlm.invoke(prompt) as z.infer<typeof SearchIntentSchema>;
      } catch (err) {
        console.warn("[EmailAgent] LLM extraction failed, falling back to recent inbox");
        intent = { isSearch: false };
      }

      // 2. Fetch emails based on intent
      let emails = [];
      if (intent.isSearch && (intent.keyword || intent.subject || intent.from)) {
        console.log("[EmailAgent] Searching with intent:", intent);
        const result = await EmailService.searchEmails(context.userId, {
          keyword: intent.keyword,
          subject: intent.subject,
          from: intent.from,
          limit: 5
        });
        emails = result.messages;
      } else {
        console.log("[EmailAgent] Fetching recent inbox");
        const result = await EmailService.getInbox(context.userId, 1, 5);
        emails = result.messages;
      }

      return {
        agentName: "email",
        data: emails,
        confidence: emails.length > 0 ? 0.8 : 0.0,
        latencyMs: Date.now() - startTime,
        metadata: { intent }
      };
    } catch (error) {
      console.error("[EmailAgent] Execution failed:", error);
      return {
        agentName: "email",
        data: [],
        confidence: 0,
        latencyMs: Date.now() - startTime,
        metadata: { error: String(error) }
      };
    }
  }
}
