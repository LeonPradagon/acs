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
