import { retrieveContext, RagContext } from "./rag.service";
import { getStreamingResponse, getUniversalResponse } from "./ollama.service";
import { ChatService } from "./chat.service";
import { SessionService } from "./session.service";
import { OnyxService } from "./onyx.service";
import { prisma } from "../config/db";
import { QueryRewriterService } from "./query-rewriter.service";
import { RerankerService } from "./reranker.service";
import { ContextCompressorService } from "./context-compressor.service";
import { KnowledgeGraphService } from "./knowledge-graph.service";
import { PlannerAgent } from "../agents/planner.agent";
import { WebSearchAgent } from "../agents/web-search.agent";

// ============================================================
// Query Classification Logic
// ============================================================
const GENERAL_PATTERNS = [
  /^(halo|hai|hi|hello|hey|selamat|good morning|good afternoon)/i,
  /^(apa itu|what is|jelaskan|explain|define|definisi)/i,
  /^(bagaimana cara|how to|how do|tutorial|cara)/i,
  /^(tolong|please|bantu|help)/i,
  /\b(coding|code|program|javascript|python|java|typescript|html|css|react|node)\b/i,
  /\b(matematika|math|hitung|calculate|rumus|formula)\b/i,
  /\b(translate|terjemahkan|bahasa)\b/i,
  /^(terima kasih|thank|thanks)/i,
];

const DATA_PATTERNS = [
  /\b(data|laporan|report|statistik|statistic|grafik|chart|tren|trend)\b/i,
  /\b(dokumen|document|file|arsip|archive)\b/i,
  /\b(keamanan|security|ancaman|threat|serangan|attack|cyber|siber)\b/i,
  /\b(analisis|analysis|monitor|intelijen|intelligence)\b/i,
  /\b(berapa|jumlah|total|persentase|percentage)\b/i,
  /\b(tahun|year|bulan|month|kuartal|quarter)\b\s*\d/i,
  /\b(isi|berkas|bacakan|ringkas|summary|file)\b/i,
];

export function shouldSkipRAG(query: string): boolean {
  const hasDataPattern = DATA_PATTERNS.some((p) => p.test(query));
  if (hasDataPattern) return false;

  const hasGeneralPattern = GENERAL_PATTERNS.some((p) => p.test(query));
  if (hasGeneralPattern && query.length < 100) return true;

  return false;
}

// ============================================================
// Conversation History Builder (with sliding window)
// ============================================================
const MAX_HISTORY_MESSAGES = 20; // 10 user-assistant pairs
const MAX_CONTENT_LENGTH = 2000;

export function buildConversationHistory(
  messages: any[],
  limit: number = MAX_HISTORY_MESSAGES,
): any[] {
  let history = messages
    .filter((m: any) => ["system", "user", "assistant", "tool"].includes(m.role))
    .slice(-limit)
    .map((m: any) => {
      let content = m.content || "";
      if (typeof content === "string" && content.length > MAX_CONTENT_LENGTH && m.role === "assistant") {
        content = content.substring(0, MAX_CONTENT_LENGTH) + "\n...[truncated for context window]";
      }
      
      const result: any = { role: m.role, content };
      if (m.tool_calls) result.tool_calls = m.tool_calls;
      if (m.tool_call_id) result.tool_call_id = m.tool_call_id;
      if (m.name) result.name = m.name;
      return result;
    });

  // Smart Trimming based on character length / estimated tokens
  // 12,000 tokens = ~48,000 characters (roughly 4 chars per token)
  const MAX_ALLOWED_CHAR_LENGTH = 48000;
  
  const getCharCount = (hist: any[]) => 
    hist.reduce((acc, m) => acc + (typeof m.content === "string" ? m.content.length : JSON.stringify(m.content || "").length), 0);

  while (history.length > 2 && getCharCount(history) > MAX_ALLOWED_CHAR_LENGTH) {
    history.shift();
  }

  return history;
}

// ============================================================
// Export Data Parser
// ============================================================
const EXPORT_TAG_START = "<EXPORT_DATA>";
const EXPORT_TAG_END = "</EXPORT_DATA>";

export interface ExportPayload {
  format: string;
  title: string;
  content: string;
}

export function parseExportData(fullResponse: string): ExportPayload | null {
  if (!fullResponse.includes(EXPORT_TAG_START)) return null;
  
  try {
    const match = fullResponse.match(/<EXPORT_DATA>([\s\S]*?)<\/EXPORT_DATA>/);
    if (match && match[1]) {
      return JSON.parse(match[1]) as ExportPayload;
    }
  } catch (err) {
    console.error("[ChatStreamService] Failed to parse EXPORT_DATA:", err);
  }
  return null;
}

export function cleanExportTags(response: string): string {
  return response.replace(/<EXPORT_DATA>[\s\S]*?<\/EXPORT_DATA>/g, "").trim();
}

// ============================================================
// Retrieve Context (thin wrapper for testability)
// ============================================================
export interface UserContext {
  userId?: string;
  divisionId?: string | null;
  role?: string;
  clearanceLevel?: number;
  isWebSearchEnabled?: boolean;
}

export async function getRAGContext(
  question: string,
  user: UserContext,
  conversationHistory: any[] = []
): Promise<{ contexts: RagContext[], needsKnowledge: boolean }> {
  if (shouldSkipRAG(question)) {
    return { contexts: [], needsKnowledge: false };
  }

  // 1. Use Planner to determine what to retrieve
  // We can run Planner in parallel with query rewriting to save time
  const historyString = conversationHistory.map((m: any) => `${m.role}: ${m.content}`).join("\n");
  
  const [multiQueries, plan] = await Promise.all([
    QueryRewriterService.generateMultiQueries(question, historyString),
    user.isWebSearchEnabled ? PlannerAgent.plan({ query: question, userId: user.userId || "anonymous", role: user.role || "user", clearanceLevel: user.clearanceLevel || 0, conversationHistory: conversationHistory }) : Promise.resolve(null)
  ]);

  const needsWebSearch = plan ? plan.steps.some((s: any) => s.agent === "web_search") : false;
  const needsKnowledge = plan ? plan.steps.some((s: any) => s.agent === "knowledge") : false;
  
  if (needsWebSearch) {
    console.log("[ChatStreamService] Planner decided Web Search is needed.");
  }
  if (needsKnowledge) {
    console.log("[ChatStreamService] Planner decided Knowledge Graph is needed.");
  }

  // 2. Execute RAG Retrieval in Parallel
  const [parallelResults, graphContext, webResults] = await Promise.all([
    Promise.all(
      multiQueries.map(q => retrieveContext(q, user.userId, user.divisionId, user.role, user.clearanceLevel))
    ),
    KnowledgeGraphService.retrieveGraphContext(question),
    needsWebSearch ? WebSearchAgent.execute({ query: question, userId: user.userId || "anonymous", role: user.role || "user", clearanceLevel: user.clearanceLevel || 0, conversationHistory: conversationHistory }) : Promise.resolve(null)
  ]);

  let allResults = parallelResults.flat();
  if (graphContext) {
    allResults.push({
      content: "[KNOWLEDGE GRAPH CONTEXT]\n" + graphContext,
      score: 1.0,
      source: "Knowledge Graph"
    });
  }
  
  if (webResults && webResults.data && webResults.data.length > 0) {
    // Map web search results to RagContext format
    webResults.data.forEach((w: any) => {
      allResults.push({
        content: w.content,
        score: w.score,
        source: w.metadata.source,
        metadata: w.metadata
      });
    });
  }

  // 3. Merge and Deduplicate Results (Union)
  const mergedContexts = new Map<string, RagContext>();
  allResults.forEach(ctx => {
    // Deduplicate by source (or a combination of source and content snippet if needed)
    // For now, we'll use a combination of source and first 50 chars of content as key
    const dedupKey = `${ctx.source}_${ctx.content.substring(0, 50)}`;
    if (!mergedContexts.has(dedupKey)) {
      mergedContexts.set(dedupKey, ctx);
    } else {
      // If duplicate found, keep the one with the higher score
      const existing = mergedContexts.get(dedupKey)!;
      if ((ctx.score || 0) > (existing.score || 0)) {
        mergedContexts.set(dedupKey, ctx);
      }
    }
  });

  // Sort by initial retrieval score descending (top 20 for reranking)
  let candidateContexts = Array.from(mergedContexts.values())
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 20);

  // 4. Cross-Encoder Reranking
  if (candidateContexts.length > 0) {
    candidateContexts = await RerankerService.rerank(question, candidateContexts, 10);
  }

  // 5. Context Compression
  if (candidateContexts.length > 0) {
    candidateContexts = await ContextCompressorService.compressContexts(question, candidateContexts);
  }

  return { contexts: candidateContexts, needsKnowledge };
}

// ============================================================
// Save & Title (fire-and-forget helper)
// ============================================================
export async function saveAndTitleSession(
  sessionId: string,
  question: string,
  response: string,
  files?: any[],
  images?: string[],
): Promise<void> {
  try {
    const cleanResponse = cleanExportTags(response);
    await ChatService.saveMessages(sessionId, question, cleanResponse, files, images);

    const aiTitle = await ChatService.generateSessionTitle(question, cleanResponse);
    await SessionService.updateTitleIfDefault(sessionId, aiTitle);
  } catch (err) {
    console.error("[ChatStreamService] Error saving history:", err);
  }
}
