import { prisma } from "../config/db";
import { NotFoundError } from "../common/errors";

export class FeedbackService {
  /**
   * Submit or update feedback for a chat message.
   */
  static async submitFeedback(
    messageId: string,
    rating: "thumbs_up" | "thumbs_down",
    userId?: string,
    comment?: string,
  ) {
    return prisma.chatFeedback.upsert({
      where: { messageId },
      update: { rating, comment: comment || null },
      create: {
        messageId,
        userId: userId || null,
        rating,
        comment: comment || null,
      },
    });
  }

  /**
   * Get all feedback for messages in a session.
   */
  static async getFeedbackBySession(sessionId: string) {
    const messages = await prisma.chatHistory.findMany({
      where: { sessionId },
      include: { feedback: true },
    });

    const feedbackMap: Record<string, any> = {};
    messages.forEach((m) => {
      if (m.feedback) {
        feedbackMap[m.id] = m.feedback;
      }
    });

    return feedbackMap;
  }
}
