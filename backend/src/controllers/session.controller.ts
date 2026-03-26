import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { SessionService } from "../services/session.service";
import { AppError } from "../common/errors";

/**
 * Async handler wrapper — eliminates repetitive try/catch + AppError handling.
 */
function asyncHandler(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return async (req: AuthRequest, res: Response) => {
    try {
      await fn(req, res);
    } catch (error: any) {
      if (error instanceof AppError) {
        return res
          .status(error.statusCode)
          .json({ success: false, error: error.message });
      }
      console.error(`[Sessions] Error:`, error);
      res.status(500).json({ success: false, error: error.message || "Internal server error" });
    }
  };
}

/**
 * List all chat sessions for the authenticated user.
 */
export const listSessions = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const result = await SessionService.listSessions(req.user?.userId, page, limit);
  res.status(200).json({ success: true, data: result.sessions, pagination: result.pagination });
});

/**
 * Create a new chat session linked to the authenticated user.
 */
export const createSession = asyncHandler(async (req, res) => {
  const session = await SessionService.createSession(req.user?.userId);
  res.status(201).json({ success: true, data: session });
});

/**
 * Rename a chat session (validated by Zod middleware).
 */
export const renameSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { title } = req.body;
  const updated = await SessionService.renameSession(
    sessionId,
    title,
    req.user?.userId,
  );
  res.status(200).json({ success: true, data: updated });
});

/**
 * Delete a chat session (only if owned by user).
 */
export const deleteSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  await SessionService.deleteSession(sessionId, req.user?.userId);
  res.status(200).json({ success: true });
});

/**
 * Load chat history for a session (with ownership check).
 */
export const getChatHistory = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const history = await SessionService.getChatHistory(
    sessionId,
    req.user?.userId,
  );
  res.status(200).json({ success: true, data: history });
});

/**
 * Delete ALL sessions for the authenticated user (bulk clear).
 */
export const deleteAllSessions = asyncHandler(async (req, res) => {
  const result = await SessionService.deleteAllSessions(req.user?.userId);
  res.status(200).json({ success: true, data: result });
});

/**
 * Search chat history across all sessions.
 */
export const searchChatHistory = asyncHandler(async (req, res) => {
  const query = req.query.q as string;
  const results = await SessionService.searchChatHistory(req.user?.userId, query);
  res.status(200).json({ success: true, data: results });
});
