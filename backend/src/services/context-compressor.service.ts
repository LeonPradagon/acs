import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export class ContextCompressorService {
  /**
   * Compresses an array of retrieved context chunks by extracting only 
   * the information strictly relevant to the user's query.
   * This reduces prompt token usage and noise.
   */
  static async compressContexts(query: string, contexts: any[]): Promise<any[]> {
    if (contexts.length === 0) return contexts;

    try {
      const llm = new ChatOpenAI({
        apiKey: process.env.OLLAMA_API_KEY || "dummy",
        model: process.env.OLLAMA_MODEL || "gpt-oss:120b-cloud",
        configuration: {
          baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
        },
        temperature: 0.0,
        maxRetries: 1,
      });

      const systemPrompt = `You are a strict context compressor for a RAG system.
Your goal is to extract ONLY the sentences or facts from the provided text that are directly relevant to answering the User Query.
If the text contains nothing relevant to the query, output exactly "NO_RELEVANT_INFO".
Do not rewrite or summarize unnecessarily—just extract the highly relevant parts verbatim or in a highly condensed form.
Do not include any conversational filler.`;

      // Compress contexts in parallel to save time
      const compressedPromises = contexts.map(async (c) => {
        const userPrompt = `User Query: ${query}\n\nSource Text:\n${c.content}\n\nExtracted Relevant Information:`;
        
        try {
          const response = await llm.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userPrompt)
          ]);
          
          const compressedText = response.content.toString().trim();
          
          if (compressedText === "NO_RELEVANT_INFO") {
            return null; // Will filter out later
          }
          
          return {
            ...c,
            originalContent: c.content, // Keep a backup of original if needed
            content: compressedText,    // Replace with compressed version
          };
        } catch (err) {
          // If a single compression fails, just return the original context
          return c;
        }
      });

      const compressedResults = await Promise.all(compressedPromises);
      
      // Filter out chunks that were deemed totally irrelevant
      const finalContexts = compressedResults.filter(c => c !== null);
      
      console.log(`[Context Compressor] Compressed ${contexts.length} chunks to ${finalContexts.length} relevant chunks.`);
      return finalContexts;
      
    } catch (error) {
      console.warn("[Context Compressor] Global compression failed, returning original contexts:", error);
      return contexts;
    }
  }
}
