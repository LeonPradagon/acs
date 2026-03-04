import { Router } from "express";
import {
  universalChat,
  streamChat,
  getChatHistory,
  listSessions,
  createSession,
  deleteSession,
  healthCheck,
} from "../controllers/chat.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// Health Check (Public)
router.get("/health", healthCheck);

// Session Management
router.get("/sessions", authenticateToken, listSessions);
router.post("/sessions", authenticateToken, createSession);
router.delete("/sessions/:sessionId", authenticateToken, deleteSession);

// Chat History
router.get("/history/:sessionId", authenticateToken, getChatHistory);

// Chat Endpoints
router.post("/universal", authenticateToken, universalChat);
router.post("/stream", authenticateToken, streamChat);

export default router;
