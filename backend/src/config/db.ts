import { PrismaClient } from "@prisma/client";
import { Client } from "@elastic/elasticsearch";
import { env } from "../common/env";

const prisma = new PrismaClient();

// Elasticsearch Configuration
const esClient = new Client({
  node: env.ES_NODE,
  auth: {
    username: env.ES_USERNAME,
    password: env.ES_PASSWORD,
  },
});

export { prisma, esClient };

// Track pgvector availability at runtime
export let pgVectorAvailable = false;

/**
 * Setup pgvector extension and vector column on DocumentChunk.
 * This runs at startup and gracefully degrades if pgvector is not installed.
 */
export const setupPgVector = async () => {
  try {
    // 1. Try to enable the pgvector extension
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);

    // 2. Check if embedding column already exists on DocumentChunk
    const columns: any[] = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'DocumentChunk' AND column_name = 'embedding'
    `;

    if (columns.length === 0) {
      // Add vector column (384 dimensions for all-MiniLM-L6-v2)
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "DocumentChunk" ADD COLUMN "embedding" vector(384)`,
      );
      console.log("[pgvector] Added embedding column to DocumentChunk");
    }

    // 3. Check if HNSW index exists
    const indexes: any[] = await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'DocumentChunk' AND indexname = 'DocumentChunk_embedding_idx'
    `;

    if (indexes.length === 0) {
      await prisma.$executeRawUnsafe(
        `CREATE INDEX "DocumentChunk_embedding_idx" ON "DocumentChunk"
         USING hnsw ("embedding" vector_cosine_ops)`,
      );
      console.log("[pgvector] Created HNSW index on DocumentChunk.embedding");
    }

    pgVectorAvailable = true;
    console.log("✅ pgvector is available and configured");
  } catch (err: any) {
    pgVectorAvailable = false;
    console.warn(
      "⚠️ pgvector setup failed. PostgreSQL vector search will be unavailable.",
      err.message,
    );
  }
};

export const setupIndices = async () => {
  try {
    const indexName = "documents";
    const exists = await esClient.indices.exists({ index: indexName });

    if (!exists) {
      console.log(`[ES] Creating index "${indexName}" with vector mapping...`);
      await esClient.indices.create({
        index: indexName,
        mappings: {
          properties: {
            title: { type: "text" },
            content: { type: "text" },
            category: { type: "keyword" },
            classification: { type: "keyword" },
            tags: { type: "keyword" },
            database_id: { type: "keyword" },
            timestamp: { type: "date" },
            embedding: {
              type: "dense_vector",
              dims: 384,
              index: true,
              similarity: "cosine",
            },
          },
        },
      });
      console.log(`✅ [ES] Index "${indexName}" created.`);
    } else {
      console.log(`[ES] Index "${indexName}" already exists.`);
    }
  } catch (err) {
    console.error("[ES] Failed to setup indices:", err);
  }
};

export const testConnections = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Prisma (PostgreSQL) connected successfully");

    // Setup pgvector extension and vector column
    await setupPgVector();

    try {
      const esRes = await esClient.info();
      console.log(`✅ Elasticsearch connected: ${esRes.cluster_name}`);
      await setupIndices();
    } catch (esErr) {
      console.warn(
        "⚠️ Elasticsearch connection failed. Hybrid Search (ES) will be bypassed, falling back to PostgreSQL RAG.",
      );
    }
  } catch (err) {
    console.error("❌ Prisma Database connection failed", err);
  }
};
