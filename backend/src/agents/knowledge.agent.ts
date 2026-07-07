import { AgentContext, AgentResult } from "./types";
import { KnowledgeGraphService } from "../services/knowledge-graph.service";
import { QueryRewriterService } from "../services/query-rewriter.service";

export class KnowledgeAgent {
  static async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      // For a simple implementation, we assume the query contains entities we can look up
      // Ideally we'd extract entities using an LLM first
      const keywords = context.query.split(" ").filter(w => w.length > 4);
      
      let graphNodes = [];
      for (const kw of keywords) {
        try {
          const nodes = await KnowledgeGraphService.retrieveGraphContext(kw);
          if (nodes && nodes.length > 0) {
            graphNodes.push(...nodes);
          }
        } catch (e) {
          // ignore error for individual keyword
        }
      }

      return {
        agentName: "knowledge",
        data: graphNodes,
        confidence: graphNodes.length > 0 ? 0.8 : 0.0,
        latencyMs: Date.now() - startTime
      };
    } catch (error) {
      console.error("[KnowledgeAgent] Execution failed:", error);
      return {
        agentName: "knowledge",
        data: [],
        confidence: 0,
        latencyMs: Date.now() - startTime,
        metadata: { error: String(error) }
      };
    }
  }
}
