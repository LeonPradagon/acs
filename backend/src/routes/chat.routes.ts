import { Router } from "express";
import { universalChat, streamChat } from "../controllers/chat.controller";
import {
  listSessions,
  createSession,
  renameSession,
  deleteSession,
  getChatHistory,
} from "../controllers/session.controller";
import {
  submitFeedback,
  getFeedback,
} from "../controllers/feedback.controller";
import { authenticateToken } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  streamChatSchema,
  universalChatSchema,
  renameSessionSchema,
  submitFeedbackSchema,
} from "../validation/chat.validation";

const router = Router();

// Session Management
router.get("/sessions", authenticateToken, listSessions);
router.post("/sessions", authenticateToken, createSession);
router.patch(
  "/sessions/:sessionId",
  authenticateToken,
  validate(renameSessionSchema),
  renameSession,
);
router.delete("/sessions/:sessionId", authenticateToken, deleteSession);

// Chat History
router.get("/history/:sessionId", authenticateToken, getChatHistory);

// Chat Endpoints (with Zod validation)
router.post(
  "/universal",
  authenticateToken,
  validate(universalChatSchema),
  universalChat,
);
router.post(
  "/stream",
  authenticateToken,
  validate(streamChatSchema),
  streamChat,
);

// Feedback (with Zod validation)
router.post(
  "/feedback",
  authenticateToken,
  validate(submitFeedbackSchema),
  submitFeedback,
);
router.get("/feedback/:sessionId", authenticateToken, getFeedback);

export default router;
