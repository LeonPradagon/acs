import { prisma, esClient, pgVectorAvailable } from "../config/db";
import { EmbeddingService } from "./embedding.service";
import { redisConnection } from "../config/redis";
import { AdaptiveRetrievalService } from "./adaptive-retrieval.service";
import crypto from "crypto";
export interface RagContext {
  content: string;
  source: string;
  score?: number;
  documentId?: string;
  chunkId?: string;
  pageNumber?: number;
  heading?: string;
  sectionPath?: string;
  highlight?: string;
  metadata?: Record<string, any>;
}

// Minimum relevance score — results below this are filtered out
const MIN_RELEVANCE_SCORE = 0.25;

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
  "bacakan",
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

// L1 Cache (In-Memory)
const L1_CACHE = new Map<string, { data: RagContext[], expiresAt: number }>();
const CACHE_TTL_SEC = 3600; // 1 Hour

export const clearRagCache = async () => {
  L1_CACHE.clear();
  try {
    const keys = await redisConnection.keys("rag_cache:*");
    if (keys.length > 0) {
      await redisConnection.del(...keys);
    }
    console.log("[RAG Cache] Cleared L1 and L2 caches.");
  } catch (err) {
    console.warn("[RAG Cache] Failed to clear Redis:", err);
  }
};

/**
 * Searches for relevant context using Hybrid Search:
 * 1. Elasticsearch kNN (Semantic/Vector)
 * 2. Elasticsearch BM25 (Keyword)
 * with a PostgreSQL fallback.
 */
export const retrieveContext = async (query: string, userId?: string, divisionId?: string | null, role: string = 'user', clearanceLevel: number = 1): Promise<RagContext[]> => {
  // Generate Cache Key
  const cachePayload = `${query.trim().toLowerCase()}_${role}_${divisionId || 'ALL'}_${clearanceLevel}`;
  const cacheKeyHash = crypto.createHash('sha256').update(cachePayload).digest('hex');
  const cacheKey = `rag_cache:${cacheKeyHash}`;

  // 1. Check L1 Cache
  const now = Date.now();
  const l1Hit = L1_CACHE.get(cacheKey);
  if (l1Hit && l1Hit.expiresAt > now) {
    console.log(`[RAG Cache] L1 Hit for: ${query}`);
    return l1Hit.data;
  }

  // 2. Check L2 Cache (Redis)
  try {
    const l2Hit = await redisConnection.get(cacheKey);
    if (l2Hit) {
      console.log(`[RAG Cache] L2 Hit for: ${query}`);
      const parsedData = JSON.parse(l2Hit);
      
      // Populate L1 cache for future
      L1_CACHE.set(cacheKey, { data: parsedData, expiresAt: now + (CACHE_TTL_SEC * 1000) });
      return parsedData;
    }
  } catch (err) {
    console.warn("[RAG Cache] L2 read failed:", err);
  }

  let contexts: RagContext[] = [];
  const queryLower = query.toLowerCase();

  // Generate query vector once — reused by both ES and PG searches
  let queryVector: number[] | null = null;
  try {
    queryVector = await EmbeddingService.generateEmbedding(query);
  } catch (err: any) {
    console.warn("[RAG] Failed to generate query embedding:", err.message);
  }

  // 1. Detection: Is the user asking about recent uploads?
  const isAskingAboutRecent = META_KEYWORDS.some((kw) =>
    queryLower.includes(kw.toLowerCase()),
  );

  // 2. Proactive: Get very recent documents (only if relevant)
  let recentDocs: any[] = [];
  if (isAskingAboutRecent) {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      // Determine data isolation filter
      const accessFilter = role === 'superadmin' 
        ? {} // Superadmin can see everything
        : {
            OR: [
              { divisionId: null }, // Global docs
              ...(divisionId ? [{ divisionId }] : []) // Division docs
            ],
            clearanceLevel: { lte: clearanceLevel }
          };

      recentDocs = await prisma.document.findMany({
        where: {
          createdAt: { gte: fiveMinutesAgo },
          ...accessFilter
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
    } catch (err) {
      console.warn("[RAG] Failed to fetch very recent docs:", err);
    }
  }

  // 3. Hybrid Search in Elasticsearch
  if (queryVector) {
      const esFilter = role === 'superadmin' ? [] : [
        {
          bool: {
            must: [
              { range: { clearanceLevel: { lte: clearanceLevel } } }
            ],
            should: [
              { bool: { must_not: { exists: { field: "divisionId" } } } },
              ...(divisionId ? [{ term: { "divisionId.keyword": divisionId } }] : [])
            ],
            minimum_should_match: 1
          }
        }
      ];

      const adaptiveConfig = AdaptiveRetrievalService.determineConfig(query);
      const topK = adaptiveConfig.topK;

      try {
        const esResponse = await esClient.search({
        index: "documents",
        knn: {
          field: "embedding",
          query_vector: queryVector,
          k: topK,
          num_candidates: 100,
          filter: esFilter.length > 0 ? esFilter[0] : undefined
        },
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: query,
                  fields: ["content^2", "title"],
                  fuzziness: "AUTO",
                },
              },
            ],
            filter: esFilter
          },
        },
        size: topK,
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
  }

  // Filter valid ES contexts before deciding to fallback
  const validEsContexts = contexts.filter((c) => (c.score || 0) >= MIN_RELEVANCE_SCORE);

  // 4. PostgreSQL Fallback (if ES is sparse or irrelevant)
  if (validEsContexts.length < 3) {
    // 4a. pgvector cosine similarity search (primary PG fallback)
    if (pgVectorAvailable && queryVector) {
      try {
        const vectorStr = `[${queryVector.join(",")}]`;
        
        // Build parameterized query — clearanceLevel uses $3 instead of interpolation
        const params: any[] = [vectorStr];
        let paramIdx = 2;
        
        let pgWhereClause = '';
        if (role !== 'superadmin') {
          const divisionFilter = divisionId ? `OR d."divisionId" = $${paramIdx++}` : '';
          pgWhereClause = `AND (d."divisionId" IS NULL ${divisionFilter}) AND d."clearanceLevel" <= $${paramIdx}`;
        }

        const queryParams: any[] = [vectorStr];
        if (role !== 'superadmin' && divisionId) queryParams.push(divisionId);
        if (role !== 'superadmin') queryParams.push(clearanceLevel);

        const pgChunks: any[] = await prisma.$queryRawUnsafe(
          `SELECT dc."content", d."title",
                  1 - (dc."embedding" <=> $1::vector) AS score
           FROM "DocumentChunk" dc
           JOIN "Document" d ON dc."documentId" = d."id"
           WHERE dc."embedding" IS NOT NULL
           ${pgWhereClause}
           ORDER BY dc."embedding" <=> $1::vector
           LIMIT 5`,
          ...queryParams
        );

        pgChunks.forEach((chunk: any) => {
          if (!contexts.some((c) => c.content === chunk.content)) {
            contexts.push({
              content: chunk.content,
              source: chunk.title || "PostgreSQL Vector Search",
              score: Number(chunk.score) || 0.7,
            });
          }
        });
      } catch (err: any) {
        console.warn("[RAG] pgvector search failed:", err.message);
      }
    }

    // 4b. Keyword fallback (if pgvector unavailable or still sparse)
    if (contexts.length < 3) {
      try {
        const keywords = extractKeywords(query);
        if (keywords.length > 0) {
          const pgDocs = await prisma.document.findMany({
            where: {
              AND: [
                {
                  OR: keywords.map((word) => ({
                    content: { contains: word, mode: "insensitive" as const },
                  })),
                },
                {
                  ... (role === 'superadmin' ? {} : {
                    OR: [
                      { divisionId: null },
                      ...(divisionId ? [{ divisionId }] : [])
                    ],
                    clearanceLevel: { lte: clearanceLevel }
                  })
                }
              ]
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
        console.warn("[RAG] PostgreSQL keyword fallback search failed:", err);
      }
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

  // Filter out low-relevance results
  const filtered = contexts.filter((c) => (c.score || 0) >= MIN_RELEVANCE_SCORE);
  const finalContexts = filtered.slice(0, 15);

  // Set L1 and L2 Caches
  L1_CACHE.set(cacheKey, { data: finalContexts, expiresAt: Date.now() + (CACHE_TTL_SEC * 1000) });
  try {
    await redisConnection.setex(cacheKey, CACHE_TTL_SEC, JSON.stringify(finalContexts));
  } catch (err) {
    console.warn("[RAG Cache] L2 write failed:", err);
  }

  return finalContexts;
};
