import { prisma, esClient } from "../config/db";
import { EmbeddingService } from "./embedding.service";

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
 * Searches for relevant context using Hybrid Search:
 * 1. Elasticsearch kNN (Semantic/Vector)
 * 2. Elasticsearch BM25 (Keyword)
 * with a PostgreSQL fallback.
 */
export const retrieveContext = async (query: string): Promise<RagContext[]> => {
  let contexts: RagContext[] = [];
  const queryLower = query.toLowerCase();

  // 1. Detection: Is the user asking about recent uploads?
  const isAskingAboutRecent = META_KEYWORDS.some((kw) =>
    queryLower.includes(kw.toLowerCase()),
  );

  // 2. Proactive: Get very recent documents (only if relevant)
  let recentDocs: any[] = [];
  if (isAskingAboutRecent) {
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
  }

  // 3. Hybrid Search in Elasticsearch
  try {
    const queryVector = await EmbeddingService.generateEmbedding(query);

    const esResponse = await esClient.search({
      index: "documents",
      knn: {
        field: "embedding",
        query_vector: queryVector,
        k: 10,
        num_candidates: 100,
      },
      query: {
        bool: {
          should: [
            {
              multi_match: {
                query: query,
                fields: ["content^2", "title"],
                fuzziness: "AUTO",
              },
            },
          ],
        },
      },
      size: 10,
    });

    if (esResponse.hits.hits.length > 0) {
      esResponse.hits.hits.forEach((hit: any) => {
        const source: any = hit._source;
        if (source && source.content) {
          if (!contexts.some((c) => c.content === source.content)) {
            contexts.push({
              content: source.content,
              source:
                source.title || source.filename || "Elasticsearch Document",
              score: hit._score || 0,
            });
          }
        }
      });
    }
  } catch (error: any) {
    console.warn("[RAG] Hybrid search failed:", error.message);
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

  // 5. Integration: Merge Recent Docs if user is asking about them
  if (recentDocs.length > 0) {
    recentDocs.forEach((doc) => {
      const exists = contexts.some(
        (c) => c.content === doc.content || c.source === doc.title,
      );

      if (!exists) {
        if (isAskingAboutRecent) {
          contexts.unshift({
            content: doc.content,
            source: doc.title,
            score: 0.95,
          });
        } else if (contexts.length < 2) {
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
  if (contexts.length === 0 && recentDocs.length > 0) {
    recentDocs.slice(0, 3).forEach((doc) => {
      contexts.push({
        content: doc.content,
        source: doc.title,
        score: 0.8,
      });
    });
  }

  return contexts.slice(0, 5);
};
