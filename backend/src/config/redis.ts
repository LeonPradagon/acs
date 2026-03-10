import Redis from "ioredis";
import { env } from "../common/env";

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

redisConnection.on("error", (err) => {
  console.error("[Redis] Connection Error:", err);
});

redisConnection.on("ready", () => {
  console.log("[Redis] Connected successfully");
});
