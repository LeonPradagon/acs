import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import chatRoutes from "./routes/chat.routes";
import authRoutes from "./routes/auth.routes";
import documentRoutes from "./routes/document.routes";
import healthRoutes from "./routes/health.routes";
import { prisma, esClient, testConnections } from "./config/db";
import { redisConnection } from "./config/redis";
import { documentWorker } from "./workers/document.worker";
import { errorMiddleware } from "./middleware/error.middleware";
import { env } from "./common/env";

// Initialize BullMQ Worker
import "./workers/document.worker";

const app = express();

// ============================================================
// Security Middleware
// ============================================================

// Helmet — set secure HTTP headers
app.use(helmet());

// CORS — use env-based origins instead of wildcard
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

// ============================================================
// Request ID Middleware
// ============================================================
app.use((req, res, next) => {
  const requestId = uuidv4();
  (req as any).id = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});

// ============================================================
// Rate Limiting
// ============================================================

// Global Rate Limiter — 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict Rate Limiter for Chat — 30 requests per minute per IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    error:
      "Terlalu banyak pesan. Silakan tunggu sebentar sebelum mengirim pesan lagi.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// ============================================================
// Routes
// ============================================================
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatLimiter, chatRoutes);
app.use("/api/rag", documentRoutes);
app.use("/api/health", healthRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global Error Handler
app.use(errorMiddleware);

// ============================================================
// Server Startup
// ============================================================
app.listen(env.PORT, () => {
  console.log(`🚀 Universal AI Chat Backend running on port ${env.PORT}`);
  testConnections();
});

// ============================================================
// Graceful Shutdown — close ALL connections
// ============================================================
const shutdown = async (signal: string) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  try {
    // Close BullMQ worker
    await documentWorker.close();
    console.log("✔ BullMQ Worker closed.");

    // Close database connections
    await prisma.$disconnect();
    console.log("✔ PostgreSQL disconnected.");

    // Close Elasticsearch
    await esClient.close();
    console.log("✔ Elasticsearch disconnected.");

    // Close Redis
    await redisConnection.quit();
    console.log("✔ Redis disconnected.");

    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
