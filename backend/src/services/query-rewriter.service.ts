import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export class QueryRewriterService {
  /**
   * Rewrites a conversational user query into a concise, keyword-rich search query 
   * optimized for vector and BM25 retrieval.
   * If the LLM fails, it gracefully falls back to the original query.
   */
  static async rewriteQuery(originalQuery: string, conversationHistory: string = ""): Promise<string> {
    try {
      const llm = new ChatOpenAI({
        apiKey: process.env.OLLAMA_API_KEY || "dummy",
        model: process.env.OLLAMA_MODEL || "gpt-oss:120b-cloud",
        configuration: {
          baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
        },
        temperature: 0.0, // Strict and deterministic
        maxRetries: 1,
      });

      const systemPrompt = `You are a search query optimization engine for an enterprise RAG system.
Your task is to rewrite the user's conversational query into a highly optimized search query.
RULES:
1. Extract only the core entities, keywords, and intent.
2. Remove conversational filler (e.g., "please", "can you tell me", "I want to know").
3. Use the same language as the user.
4. Keep it concise (max 10-15 words).
5. If the query is already concise, just output it as is.
6. Only output the rewritten query, nothing else (no quotes, no preamble).

Example 1:
User: "Tolong dong carikan informasi tentang berapa standar gaji untuk karyawan di divisi IT tahun ini?"
Output: standar gaji karyawan divisi IT tahun ini

Example 2:
User: "SOP pengajuan cuti sakit"
Output: SOP pengajuan cuti sakit`;

      let userPrompt = `User Query: ${originalQuery}`;
      
      if (conversationHistory) {
        userPrompt = `Conversation Context (for pronoun resolution if needed):\n${conversationHistory}\n\nUser Query: ${originalQuery}`;
      }

      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ]);

      const rewritten = response.content.toString().trim();
      
      // Safety check: if the LLM output is too long or empty, fallback
      if (!rewritten || rewritten.length > 200) {
        return originalQuery;
      }
      
      console.log(`[Query Rewriter] Original: "${originalQuery}" -> Rewritten: "${rewritten}"`);
      return rewritten;
      
    } catch (error) {
      console.warn("[Query Rewriter] Failed, falling back to original query:", error);
      return originalQuery;
    }
  }

  /**
   * Generates 3 variations of the search query for Multi-Query Retrieval.
   */
  static async generateMultiQueries(originalQuery: string, conversationHistory: string = ""): Promise<string[]> {
    try {
      const llm = new ChatOpenAI({
        apiKey: process.env.OLLAMA_API_KEY || "dummy",
        model: process.env.OLLAMA_MODEL || "gpt-oss:120b-cloud",
        configuration: {
          baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
        },
        temperature: 0.7, // Slightly higher for variation
        maxRetries: 1,
      });

      const systemPrompt = `You are an AI assistant for an enterprise RAG system.
Your task is to generate 3 different versions of the user's search query to retrieve relevant documents.
By generating multiple perspectives, you help overcome the limitations of distance-based similarity search.
Provide these alternative questions separated by newlines.
Do NOT number them. Do NOT add any preamble or quotes. Just output exactly 3 lines.

Example:
gaji karyawan IT
standar kompensasi divisi teknologi informasi
struktur upah pegawai IT`;

      let userPrompt = `User Query: ${originalQuery}`;
      if (conversationHistory) {
        userPrompt = `Context:\n${conversationHistory}\n\nUser Query: ${originalQuery}`;
      }

      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ]);

      const variations = response.content.toString().trim().split("\n").map(q => q.trim()).filter(q => q.length > 5);
      
      // Ensure we always have the original query included
      const results = [originalQuery, ...variations];
      
      // Limit to 3 max unique queries (original + 2 variations)
      return Array.from(new Set(results)).slice(0, 3);
      
    } catch (error) {
      console.warn("[Multi-Query] Failed, returning original only:", error);
      return [originalQuery];
    }
  }
}
