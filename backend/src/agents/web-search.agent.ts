import { AgentContext, AgentResult } from "./types";
import google from "googlethis";

export class WebSearchAgent {
  static async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      console.log(`[WebSearchAgent] Searching the web for: "${context.query}"`);
      
      const options = {
        page: 0, 
        safe: false, // Safe Search
        parse_ads: false, // Do not parse ads
        additional_params: {
          hl: 'id' // Indonesian language default
        }
      };

      const response = await google.search(context.query, options);
      
      const searchResults = response.results.slice(0, 5).map((res: any, index: number) => {
        return {
          id: `web-${Date.now()}-${index}`,
          content: `${res.title}\n\n${res.description}`,
          score: 1.0 - (index * 0.1), // Mock relevancy score based on rank
          metadata: {
            source: res.title,
            url: res.url,
            type: "web"
          }
        };
      });

      // Also append a "Knowledge Panel" or "Dictionary" result if available
      if (response.knowledge_panel && response.knowledge_panel.title) {
        searchResults.unshift({
          id: `web-knowledge-${Date.now()}`,
          content: `${response.knowledge_panel.title}\n${response.knowledge_panel.description}`,
          score: 1.0,
          metadata: {
            source: "Knowledge Panel",
            url: response.knowledge_panel.url || "",
            type: "web"
          }
        });
      }

      console.log(`[WebSearchAgent] Found ${searchResults.length} results.`);

      return {
        agentName: "web_search",
        data: searchResults,
        confidence: searchResults.length > 0 ? 0.9 : 0.0,
        latencyMs: Date.now() - startTime
      };
    } catch (error) {
      console.error("[WebSearchAgent] Execution failed:", error);
      return {
        agentName: "web_search",
        data: [],
        confidence: 0,
        latencyMs: Date.now() - startTime,
        metadata: { error: String(error) }
      };
    }
  }
}
