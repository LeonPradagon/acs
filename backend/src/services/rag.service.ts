import { prisma, esClient } from "../config/db";

export interface RagContext {
  content: string;
  source: string;
  score?: number;
}

// Indonesian stopwords to filter out from search queries
const STOPWORDS = new Set([
  "yang",
  "dan",
  "di",
  "ke",
  "dari",
  "ini",
  "itu",
  "dengan",
  "untuk",
  "pada",
  "adalah",
  "dalam",
  "akan",
  "tidak",
  "juga",
  "sudah",
  "saya",
  "anda",
  "kamu",
  "kami",
  "mereka",
  "bisa",
  "ada",
  "atau",
  "oleh",
  "jika",
  "maka",
  "seperti",
  "lebih",
  "banyak",
  "harus",
  "telah",
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "a",
  "an",
  "the",
  "and",
  "but",
  "or",
  "for",
  "nor",
  "on",
  "at",
  "to",
  "from",
  "by",
  "in",
  "of",
  "with",
  "as",
  "it",
  "its",
  "if",
  "this",
  "that",
  "what",
  "how",
  "apa",
  "bagaimana",
  "kenapa",
  "mengapa",
  "siapa",
  "dimana",
  "kapan",
  "berapa",
  "tolong",
  "mohon",
  "silakan",
  "bisakah",
  "apakah",
]);

// Meta-keywords that suggest the user is asking about uploaded files/recency
const META_KEYWORDS = [
  "upload",
  "unggah",
  "file",
  "dokumen",
  "document",
  "baru",
  "terbaru",
  "tadi",
  "barusan",
  "baru saja",
  "tabel",
  "table",
  "isinya",
  "data",
  "terakhir",
  "pengunggahan",
  "berkas",
  "lampiran",
  "isi dari",
  "summary",
  "ringkasan",
  "isi",
  "bacakan",
  "apa",
  "tentang",
  "data baru",
  "file baru",
];

/**
 * Extract meaningful search keywords from a query
 */
function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

/**
 * Searches for relevant context using Elasticsearch (keyword + fuzzy)
 * with a PostgreSQL fallback using all meaningful query words.
 */
export const retrieveContext = async (query: string): Promise<RagContext[]> => {
  let contexts: RagContext[] = [];
  const queryLower = query.toLowerCase();

  // 1. Detection: Is the user asking about recent uploads?
  const isAskingAboutRecent = META_KEYWORDS.some((kw) =>
    queryLower.includes(kw.toLowerCase()),
  );

  // 2. Proactive: Get very recent documents (last 5 minutes)
  let recentDocs: any[] = [];
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    recentDocs = await prisma.document.findMany({
      where: {
        createdAt: { gte: fiveMinutesAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  } catch (err) {
    console.warn("[RAG] Failed to fetch very recent docs:", err);
  }

  // 3. Search Elasticsearch
  try {
    const esResponse = await esClient.search({
      index: "documents",
      query: {
        multi_match: {
          query: query,
          fields: ["content", "title"],
          fuzziness: "AUTO",
        },
      },
      size: 5,
    });

    if (esResponse.hits.hits.length > 0) {
      esResponse.hits.hits.forEach((hit: any) => {
        const source: any = hit._source;
        if (source && source.content) {
          contexts.push({
            content: source.content,
            source: source.title || source.filename || "Elasticsearch Document",
            score: hit._score || 0,
          });
        }
      });
    }
  } catch (error: any) {
    if (error.name !== "ResponseError" || error.meta?.statusCode !== 404) {
      console.warn(
        "[RAG] Elasticsearch query failed. Falling back to PostgreSQL.",
      );
    }
  }

  // 4. PostgreSQL Keyword Fallback (if ES is sparse)
  if (contexts.length < 3) {
    try {
      const keywords = extractKeywords(query);
      if (keywords.length > 0) {
        const pgDocs = await prisma.document.findMany({
          where: {
            OR: keywords.map((word) => ({
              content: { contains: word, mode: "insensitive" },
            })),
          },
          take: 5,
        });

        pgDocs.forEach((doc) => {
          // Avoid duplicates
          if (!contexts.some((c) => c.content === doc.content)) {
            contexts.push({
              content: doc.content,
              source: doc.title || "PostgreSQL Document",
              score: 0.5,
            });
          }
        });
      }
    } catch (err) {
      console.warn("[RAG] PostgreSQL fallback search failed:", err);
    }
  }

  // 5. Integration: Merge Recent Docs if user is asking about them OR if context is still sparse
  if (recentDocs.length > 0) {
    recentDocs.forEach((doc) => {
      // Check if already in contexts to avoid duplicates
      const exists = contexts.some(
        (c) => c.content === doc.content || c.source === doc.title,
      );

      if (!exists) {
        if (isAskingAboutRecent) {
          // Priority: Add to the beginning if asking about recent
          contexts.unshift({
            content: doc.content,
            source: doc.title,
            score: 0.95, // High score for better accuracy/priority
          });
        } else if (contexts.length < 2) {
          // Supplemental: Add if context is empty/sparse
          contexts.push({
            content: doc.content,
            source: doc.title,
            score: 0.85,
          });
        }
      }
    });
  }

  // 6. Safety Fallback: If still no context, force include the absolute latest documents
  // even if they don't explicitly match keywords, to catch "just uploaded" files.
  if (contexts.length === 0 && recentDocs.length > 0) {
    recentDocs.slice(0, 3).forEach((doc) => {
      contexts.push({
        content: doc.content,
        source: doc.title,
        score: 0.8,
      });
    });
  }

  return contexts.slice(0, 5); // Keep top 5 most relevant/recent
};
