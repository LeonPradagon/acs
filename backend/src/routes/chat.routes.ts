import { Router } from "express";
import {
  universalChat,
  streamChat,
  getChatHistory,
  listSessions,
  createSession,
  renameSession,
  deleteSession,
  healthCheck,
  submitFeedback,
  getFeedback,
} from "../controllers/chat.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// Health Check (Public)
router.get("/health", healthCheck);

// Session Management
router.get("/sessions", authenticateToken, listSessions);
router.post("/sessions", authenticateToken, createSession);
router.patch("/sessions/:sessionId", authenticateToken, renameSession);
router.delete("/sessions/:sessionId", authenticateToken, deleteSession);

// Chat History
router.get("/history/:sessionId", authenticateToken, getChatHistory);

// Chat Endpoints
router.post("/universal", authenticateToken, universalChat);
router.post("/stream", authenticateToken, streamChat);

// Feedback
router.post("/feedback", authenticateToken, submitFeedback);
router.get("/feedback/:sessionId", authenticateToken, getFeedback);

export default router;
