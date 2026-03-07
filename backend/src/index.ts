import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import chatRoutes from "./routes/chat.routes";
import authRoutes from "./routes/auth.routes";
import documentRoutes from "./routes/document.routes";
import { testConnections } from "./config/db";

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(
  cors({
    origin: "*",
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

// Main Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatLimiter, chatRoutes);
app.use("/api/rag", documentRoutes);

// General 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.listen(port, () => {
  console.log(`🚀 Universal AI Chat Backend running on port ${port}`);

  // Test Database Connections on startup
  testConnections();
});
