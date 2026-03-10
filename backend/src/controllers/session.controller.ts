import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { SessionService } from "../services/session.service";
import { AppError } from "../common/errors";

/**
 * List all chat sessions for the authenticated user.
 */
export const listSessions = async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await SessionService.listSessions(req.user?.userId);
    res.status(200).json({ success: true, data: sessions });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json({ success: false, error: error.message });
    }
    console.error("[Sessions] List error:", error);
    res.status(500).json({ success: false, error: "Failed to load sessions" });
  }
};

/**
 * Create a new chat session linked to the authenticated user.
 */
export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const session = await SessionService.createSession(req.user?.userId);
    res.status(201).json({ success: true, data: session });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json({ success: false, error: error.message });
    }
    console.error("[Sessions] Create error:", error);
    res.status(500).json({ success: false, error: "Failed to create session" });
  }
};

/**
 * Rename a chat session (validated by Zod middleware).
 */
export const renameSession = async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;
  const { title } = req.body;

  try {
    const updated = await SessionService.renameSession(
      sessionId,
      title,
      req.user?.userId,
    );
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json({ success: false, error: error.message });
    }
    console.error("[Sessions] Rename error:", error);
    res.status(500).json({ success: false, error: "Failed to rename session" });
  }
};

/**
 * Delete a chat session (only if owned by user).
 */
export const deleteSession = async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;

  try {
    await SessionService.deleteSession(sessionId, req.user?.userId);
    res.status(200).json({ success: true });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json({ success: false, error: error.message });
    }
    console.error("[Sessions] Delete error:", error);
    res.status(500).json({ success: false, error: "Failed to delete session" });
  }
};

/**
 * Load chat history for a session (with ownership check).
 */
export const getChatHistory = async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;

  try {
    const history = await SessionService.getChatHistory(
      sessionId,
      req.user?.userId,
    );
    res.status(200).json({ success: true, data: history });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json({ success: false, error: error.message });
    }
    console.error("[Chat] History error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to load chat history" });
  }
};
