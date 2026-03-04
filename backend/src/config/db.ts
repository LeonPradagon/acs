import { PrismaClient } from "@prisma/client";
import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

// Elasticsearch Configuration
const esClient = new Client({
  node: process.env.ES_NODE || "http://localhost:9200",
  auth: {
    username: process.env.ES_USERNAME || "elastic",
    password: process.env.ES_PASSWORD || "changeme",
  },
});

export { prisma, esClient };

export const testConnections = async () => {
  try {
    // Test Prisma Connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Prisma (PostgreSQL) connected successfully");

    // Test Elasticsearch
    try {
      const esRes = await esClient.info();
      console.log(`✅ Elasticsearch connected: ${esRes.cluster_name}`);
    } catch (esErr) {
      console.warn(
        "⚠️ Elasticsearch connection failed. Hybrid Search (ES) will be bypassed, falling back to PostgreSQL RAG.",
      );
    }
  } catch (err) {
    console.error("❌ Prisma Database connection failed", err);
  }
};
