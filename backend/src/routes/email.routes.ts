import { Router } from "express";
import {
  connectImap,
  getAuthUrl,
  oauthCallback,
  getInbox,
  getMessage,
  getStatus,
  disconnect,
  importToRAG,
} from "../controllers/email.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// IMAP Connection (email + password — no Azure AD needed)
router.post("/connect", authenticateToken, connectImap);

// OAuth Flow (requires Azure AD setup)
router.get("/auth-url", authenticateToken, getAuthUrl);
router.get("/callback", oauthCallback);

// Email Operations (all require authentication)
router.get("/inbox", authenticateToken, getInbox);
router.get("/message/:messageId", authenticateToken, getMessage);
router.get("/status", authenticateToken, getStatus);
router.delete("/disconnect", authenticateToken, disconnect);

// Email → RAG Import
router.post("/import-to-rag", authenticateToken, importToRAG);

export default router;
