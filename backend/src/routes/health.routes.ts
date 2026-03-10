import { Router } from "express";
import { prisma, esClient } from "../config/db";
import { redisConnection } from "../config/redis";

const router = Router();

router.get("/", async (req, res) => {
  const healthStatus: any = {
    status: "UP",
    timestamp: new Date(),
    services: {
      database: "UNKNOWN",
      redis: "UNKNOWN",
      elasticsearch: "UNKNOWN",
    },
  };

  try {
    // 1. Check PostgreSQL
    await prisma.$queryRaw`SELECT 1`;
    healthStatus.services.database = "CONNECTED";
  } catch (err) {
    healthStatus.services.database = "DISCONNECTED";
    healthStatus.status = "DOWN";
  }

  try {
    // 2. Check Redis
    const pong = await redisConnection.ping();
    healthStatus.services.redis = pong === "PONG" ? "CONNECTED" : "DEGRADED";
  } catch (err) {
    healthStatus.services.redis = "DISCONNECTED";
    healthStatus.status = "DOWN";
  }

  try {
    // 3. Check Elasticsearch
    const esPing = await esClient.ping();
    healthStatus.services.elasticsearch = esPing ? "CONNECTED" : "DISCONNECTED";
  } catch (err) {
    healthStatus.services.elasticsearch = "DISCONNECTED";
    healthStatus.status = "DOWN";
  }

  const statusCode = healthStatus.status === "UP" ? 200 : 503;
  return res.status(statusCode).json(healthStatus);
});

export default router;
