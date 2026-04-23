import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { EmailService } from "../services/email.service";
import { asyncHandler } from "../common/asyncHandler";

/**
 * Connect email via IMAP (email + app password).
 * No Azure AD required — works immediately.
 */
export const connectImap = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password are required" });
  }

  const result = await EmailService.connectImap(req.user.userId, email, password);
  res.status(200).json({ success: true, data: result });
});

/**
 * Get the Microsoft OAuth2 authorization URL (requires Azure AD setup).
 */
export const getAuthUrl = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }

  if (!EmailService.isOAuthConfigured) {
    return res.status(503).json({
      success: false,
      error: "OAuth is not configured. Use IMAP login instead, or configure MICROSOFT_CLIENT_ID.",
    });
  }

  const authUrl = EmailService.generateAuthUrl(req.user.userId);
  res.status(200).json({ success: true, data: { authUrl } });
});

/**
 * Handle the OAuth2 callback from Microsoft.
 */
export const oauthCallback = async (req: AuthRequest, res: Response) => {
  const { code, state: userId, error } = req.query;

  if (error) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    return res.redirect(`${frontendUrl}/settings?email_error=${error}`);
  }

  if (!code || !userId) {
    return res.status(400).json({ success: false, error: "Missing authorization code or user state" });
  }

  try {
    const result = await EmailService.exchangeCodeForTokens(code as string, userId as string);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/settings?email_connected=${encodeURIComponent(result.email)}`);
  } catch (err: any) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/settings?email_error=token_exchange_failed`);
  }
};

/**
 * Get the user's inbox (paginated).
 */
export const getInbox = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

  const result = await EmailService.getInbox(req.user.userId, page, limit);
  res.status(200).json({ success: true, data: result });
});

/**
 * Read a specific email message.
 */
export const getMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }

  const { messageId } = req.params;
  if (!messageId) {
    return res.status(400).json({ success: false, error: "Message ID is required" });
  }

  const message = await EmailService.getMessage(req.user.userId, messageId);
  res.status(200).json({ success: true, data: message });
});

/**
 * Get email connection status.
 */
export const getStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }

  const status = await EmailService.getStatus(req.user.userId);
  res.status(200).json({ success: true, data: status });
});

/**
 * Disconnect email — deletes all stored tokens.
 */
export const disconnect = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }

  const result = await EmailService.disconnect(req.user.userId);
  res.status(200).json({ success: true, data: result });
});

/**
 * Import selected emails into the RAG system as private documents.
 */
export const importToRAG = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }

  const { messageIds } = req.body;
  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ success: false, error: "messageIds array is required" });
  }

  if (messageIds.length > 20) {
    return res.status(400).json({ success: false, error: "Maximum 20 emails can be imported at once" });
  }

  const result = await EmailService.importEmailToRAG(req.user.userId, messageIds);
  res.status(200).json({ success: true, data: result });
});
