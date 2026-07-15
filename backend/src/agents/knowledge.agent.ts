import { AgentContext, AgentResult } from "./types";
import { KnowledgeGraphService } from "../services/knowledge-graph.service";
import { ModelRouterService } from "../services/model-router.service";
import { z } from "zod";

const EntityExtractionSchema = z.object({
  entities: z.array(z.string()).describe("List of key entities (people, organizations, projects, concepts) extracted from the query"),
});

export class KnowledgeAgent {
  static async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      // 1. Extract entities using LLM
      const llm = new ChatOpenAI({
        apiKey: process.env.OLLAMA_API_KEY || "dummy",
        model: "gemma4:31b",
        configuration: {
          baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
        },
        temperature: 0.1,
      });
      const structuredLlm = llm.withStructuredOutput(EntityExtractionSchema);
      
      const prompt = `Extract the most important entities from the following user query.
Entities can be names of people, organizations, projects, technologies, or core concepts.
Return them as a list of strings.

User Query: "${context.query}"`;

      let extractedEntities: string[] = [];
      try {
        const result = await structuredLlm.invoke(prompt) as z.infer<typeof EntityExtractionSchema>;
        extractedEntities = result.entities || [];
      } catch (err) {
        console.warn("[KnowledgeAgent] LLM extraction failed, falling back to basic keywords");
        extractedEntities = context.query.split(" ").filter(w => w.length > 4);
      }

      console.log(`[KnowledgeAgent] Extracted entities: ${extractedEntities.join(", ")}`);

      // 2. Perform graph retrieval and multi-hop traversal
      let graphContexts: string[] = [];
      for (const entity of extractedEntities) {
        try {
          // Direct node lookup
          const nodeContext = await KnowledgeGraphService.retrieveGraphContext(entity);
          if (nodeContext) {
            graphContexts.push(nodeContext);
          }
          
          // Multi-hop traversal (up to 2 hops)
          const hopContext = await KnowledgeGraphService.traverseRelationships(entity, 2);
          if (hopContext) {
             graphContexts.push(hopContext);
          }
        } catch (e) {
          // ignore error for individual entity
        }
      }

      // Deduplicate contexts
      const uniqueContexts = Array.from(new Set(graphContexts));

      return {
        agentName: "knowledge",
        data: uniqueContexts,
        confidence: uniqueContexts.length > 0 ? 0.8 : 0.0,
        latencyMs: Date.now() - startTime,
        metadata: { extractedEntities }
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
