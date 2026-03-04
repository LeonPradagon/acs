import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRoutes from "./routes/chat.routes";
import authRoutes from "./routes/auth.routes";
import documentRoutes from "./routes/document.routes";
import { testConnections } from "./config/db";

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Main Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
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
