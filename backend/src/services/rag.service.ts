import { prisma, esClient } from "../config/db";

export interface RagContext {
  content: string;
  source: string;
  score?: number;
}

/**
 * Searches for relevant context using a combination of Elasticsearch (Keyword)
 * and PostgreSQL via Prisma (Raw Data Fallback).
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
      size: 5, // Top 5 relevant chunks
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
        "Elasticsearch query failed or index not found. Proceeding to Postgres fallback.",
      );
    }
  }

  // 2. PostgreSQL Fallback via Prisma (If ES returns no results or fails)
  if (contexts.length === 0) {
    try {
      const words = query.split(" ").filter((w) => w.length > 3);
      if (words.length > 0) {
        const likeQuery = `%${words[0]}%`;

        // Using Prisma's queryRaw for ILIKE fallback, or findMany with contains.
        const pgDocs = await prisma.document.findMany({
          where: {
            content: {
              contains: words[0],
              mode: "insensitive", // Requires PostgreSQL
            },
          },
          take: 5,
        });

        pgDocs.forEach((doc) => {
          contexts.push({
            content: doc.content,
            source: doc.title || "PostgreSQL Document",
          });
        });
      }
    } catch (err) {
      console.warn(
        "PostgreSQL fallback search failed. Ensure 'Document' table exists.",
      );
    }
  }

  return contexts;
};
