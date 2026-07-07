import { AgentContext, AgentResult } from "./types";
import { EmailService } from "../services/email.service";

export class EmailAgent {
  static async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      // In a real implementation, we might extract search terms from the query.
      // For now, let's just do a basic search using the raw query or just fetch recent emails.
      const emails = await EmailService.searchEmails(context.userId, context.query, 5);

      return {
        agentName: "email",
        data: emails,
        confidence: emails.length > 0 ? 0.8 : 0.0,
        latencyMs: Date.now() - startTime
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
