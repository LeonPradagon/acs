import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { FeedbackService } from "../services/feedback.service";
import { AppError } from "../common/errors";

/**
 * Submit feedback for a chat message (validated by Zod middleware).
 */
export const submitFeedback = async (req: AuthRequest, res: Response) => {
  const { messageId, rating, comment } = req.body;

  try {
    const feedback = await FeedbackService.submitFeedback(
      messageId,
      rating,
      req.user?.userId,
      comment,
    );
    res.status(200).json({ success: true, data: feedback });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json({ success: false, error: error.message });
    }
    console.error("[Feedback] Submit error:", error);
    res.status(500).json({ success: false, error: "Failed to save feedback" });
  }
};

/**
 * Get feedback for messages in a session.
 */
export const getFeedback = async (req: AuthRequest, res: Response) => {
  const { sessionId } = req.params;

  try {
    const feedbackMap = await FeedbackService.getFeedbackBySession(sessionId);
    res.status(200).json({ success: true, data: feedbackMap });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json({ success: false, error: error.message });
    }
    console.error("[Feedback] Get error:", error);
    res.status(500).json({ success: false, error: "Failed to load feedback" });
  }
};
