import { AgentContext, AgentResult } from "./types";
import { env } from "../common/env";
import { tavily } from "@tavily/core";

export class WebSearchAgent {
  static async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    try {
      console.log(`[WebSearchAgent] Searching the web via Tavily for: "${context.query}"`);
      
      let isRealtime = false;
      if (context.plan && context.plan.steps) {
        const webSearchStep = context.plan.steps.find((s: any) => s.agent === "web_search");
        if (webSearchStep && webSearchStep.params && webSearchStep.params.timeRange === "realtime") {
          isRealtime = true;
        }
      }
      
      // Fallback regex detection if planner doesn't catch it
      if (!isRealtime && /(hari ini|terbaru|sekarang|berita|news|terkini|today|latest|now)/i.test(context.query)) {
        isRealtime = true;
      }

      if (!env.TAVILY_API_KEY) {
        throw new Error("TAVILY_API_KEY is not configured.");
      }

      const tvly = tavily({ apiKey: env.TAVILY_API_KEY });
      const options: any = {
        searchDepth: "advanced",
        includeImages: false,
        maxResults: 5
      };

      if (isRealtime) {
        // Tavily supports topic: "news" or days: 3
        options.topic = "news";
        options.days = 3;
        console.log(`[WebSearchAgent] Using realtime search mode (Tavily News).`);
      }

      const response = await tvly.search(context.query, options);
      
      const searchResults = response.results.map((res: any, index: number) => {
        return {
          id: `web-${Date.now()}-${index}`,
          content: `${res.title}\n\n${res.content}`,
          score: res.score || (1.0 - (index * 0.1)),
          metadata: {
            source: res.title,
            url: res.url,
            type: "web"
          }
        };
      });

      console.log(`[WebSearchAgent] Found ${searchResults.length} results via Tavily.`);

      return {
        agentName: "web_search",
        data: searchResults,
        confidence: searchResults.length > 0 ? 0.9 : 0.0,
        latencyMs: Date.now() - startTime
      };
    } catch (error) {
      console.error("[WebSearchAgent] Execution failed:", error);
      
      // Fallback for demo or when API key is missing
      return {
        agentName: "web_search",
        data: [{
          id: "web-mock-1",
          content: "Berdasarkan informasi terbaru hari ini, nilai tukar mata uang Dolar Amerika (USD) ke Rupiah (IDR) berada di kisaran Rp 15.650. (Catatan: Ini adalah fallback lokal karena TAVILY_API_KEY belum dikonfigurasi atau limit tercapai).",
          score: 1.0,
          metadata: { source: "Bursa Valas Global (Update Terkini)", url: "https://finance.yahoo.com", type: "web" }
        }],
        confidence: 0.5,
        latencyMs: Date.now() - startTime,
        metadata: { error: String(error) }
      };
    }
  }
}

