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
  "tabel",
  "table",
  "isinya",
  "data",
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
  const contexts: RagContext[] = [];

  try {
    // 1. Elasticsearch Keyword / Full-Text Search
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

  // 2. PostgreSQL Fallback — use ALL meaningful keywords with OR logic
  if (contexts.length === 0) {
    try {
      const keywords = extractKeywords(query);
      if (keywords.length > 0) {
        const whereConditions = keywords.map((word) => ({
          content: {
            contains: word,
            mode: "insensitive" as const,
          },
        }));

        const pgDocs = await prisma.document.findMany({
          where: {
            OR: whereConditions,
          },
          take: 10,
        });

        const scoredDocs = pgDocs.map((doc) => {
          const contentLower = doc.content.toLowerCase();
          const titleLower = (doc.title || "").toLowerCase();
          let score = 0;

          keywords.forEach((keyword) => {
            if (contentLower.includes(keyword)) score += 1;
            if (titleLower.includes(keyword)) score += 2;
          });

          score = score / (keywords.length * 3);

          return {
            content: doc.content,
            source: doc.title || "PostgreSQL Document",
            score: Math.min(score, 1.0),
          };
        });

        scoredDocs
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .forEach((doc) => contexts.push(doc));
      }
    } catch (err) {
      console.warn(
        "[RAG] PostgreSQL fallback search failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // 3. Recency Fallback — If still empty, check if asking about "uploaded files"/meta-info
  if (contexts.length === 0) {
    const isAskingAboutFiles = META_KEYWORDS.some((kw) =>
      query.toLowerCase().includes(kw),
    );

    if (isAskingAboutFiles) {
      try {
        const recentDocs = await prisma.document.findMany({
          orderBy: { createdAt: "desc" },
          take: 3,
        });

        recentDocs.forEach((doc) => {
          contexts.push({
            content: doc.content,
            source: `${doc.title} (Recently Uploaded)`,
            score: 0.5,
          });
        });
        console.log(
          `[RAG] Meta-query detected, added ${recentDocs.length} recent documents.`,
        );
      } catch (err) {
        console.warn("[RAG] Recency fallback failed:", err);
      }
    }
  }

  return contexts;
};
