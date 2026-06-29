import { Router } from "express";
import { prisma, esClient } from "../config/db";
import { redisConnection } from "../config/redis";
import fs from "fs";
import path from "path";

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

router.get("/version", (req, res) => {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return res.status(200).json({ version: pkg.version || "1.0.0" });
  } catch (err) {
    return res.status(200).json({ version: "1.0.0" });
  }
});

export default router;
