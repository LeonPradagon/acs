import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import chatRoutes from "./routes/chat.routes";
import authRoutes from "./routes/auth.routes";
import documentRoutes from "./routes/document.routes";
import healthRoutes from "./routes/health.routes";
import adminRoutes from "./routes/admin.routes";
import emailRoutes from "./routes/email.routes";
import userRoutes from "./routes/user.routes";
import integrationRoutes from "./routes/integration.routes";
import { prisma, esClient, testConnections } from "./config/db";
import { redisConnection } from "./config/redis";
import { documentWorker } from "./workers/document.worker";
import { errorMiddleware } from "./middleware/error.middleware";
import { requestLogger } from "./middleware/logger.middleware";
import { env } from "./common/env";
import { EmbeddingService } from "./services/embedding.service";

import { httpTracingMiddleware } from "./config/tracing";

const app = express();

app.use(httpTracingMiddleware);
// ============================================================
// Security Middleware
// ============================================================

// Helmet — set secure HTTP headers
app.use(helmet());

// CORS — whitelist production domains, fallback open for dev/unknown
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Always allow *.asiasistem.com (production)
      if (origin.endsWith(".asiasistem.com") || origin.endsWith(".asiasistem.co.id")) {
        return callback(null, true);
      }

      // Allow configured origins from .env (ALLOWED_ORIGINS)
      if (env.ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      // Allow localhost only in development
      if (env.NODE_ENV !== "production" && (origin.includes("localhost") || origin.includes("127.0.0.1"))) {
        return callback(null, true);
      }

      // Strict mode: block all unknown origins
      console.warn(`[CORS] Blocked request from unknown origin: ${origin}`);
      return callback(new Error(`CORS policy: Origin ${origin} is not allowed`), false);
    },
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
app.use(cookieParser()); // A7: Parse httpOnly cookies for refresh token

// ============================================================
// Request ID Middleware
// ============================================================
app.use((req, res, next) => {
  const requestId = uuidv4();
  (req as any).id = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});

// Request Logger — log after request ID is assigned
app.use(requestLogger);

// ============================================================
// Rate Limiting
// ============================================================

// Global Rate Limiter — 500 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
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

import { apiVersionMiddleware, userRateLimiter } from "./middleware/api-version.middleware";

// ============================================================
// Routes (API Gateway Layer)
// ============================================================
// API Versioning
app.use("/api", apiVersionMiddleware("v1"));

app.use("/api/auth", authRoutes);
// Chat endpoint uses stricter userRateLimiter instead of generic chatLimiter
app.use("/api/chat", userRateLimiter, chatRoutes);
app.use("/api/rag", documentRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/users", userRoutes);
app.use("/api/integration", integrationRoutes);

// Global Error Handler (must be before 404 to catch thrown errors)
app.use(errorMiddleware);

// 404 Fallback — must be last
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

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

    // Close Embedding Thread
    await EmbeddingService.close();
    console.log("✔ Embedding Thread closed.");

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
