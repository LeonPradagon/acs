import { prisma } from "../config/db";
import { NotFoundError, ForbiddenError } from "../common/errors";

export class SessionService {
  /**
   * List all chat sessions for a user, ordered by most recent.
   */
  static async listSessions(userId?: string) {
    if (!userId) {
      throw new ForbiddenError("User ID is required to list sessions");
    }
    
    return prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          take: 1,
          orderBy: { createdAt: "asc" },
          where: { role: "user" },
          select: { content: true },
        },
      },
    });
  }

  /**
   * Create a new chat session.
   */
  static async createSession(userId?: string) {
    return prisma.chatSession.create({
      data: {
        title: "New Chat",
        ...(userId ? { userId } : {}),
      },
    });
  }

  /**
   * Helper method to verify session existence and ownership
   */
  private static async _getSessionAndVerify(sessionId: string, userId?: string) {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError("Session");
    }

    if (session.userId && userId && session.userId !== userId) {
      throw new ForbiddenError("Not authorized to access this session");
    }

    return session;
  }

  /**
   * Rename a chat session with ownership check.
   */
  static async renameSession(
    sessionId: string,
    title: string,
    userId?: string,
  ) {
    await this._getSessionAndVerify(sessionId, userId);

    return prisma.chatSession.update({
      where: { id: sessionId },
      data: { title: title.substring(0, 100) },
    });
  }

  /**
   * Delete a chat session with ownership check.
   */
  static async deleteSession(sessionId: string, userId?: string) {
    await this._getSessionAndVerify(sessionId, userId);

    await prisma.chatSession.delete({
      where: { id: sessionId },
    });
  }

  /**
   * Load chat history for a session with ownership check.
   */
  static async getChatHistory(sessionId: string, userId?: string) {
    await this._getSessionAndVerify(sessionId, userId);

    return prisma.chatHistory.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Update session's updatedAt timestamp.
   */
  static async touchSession(sessionId: string) {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });
  }

  /**
   * Update session title if it's still the default "New Chat".
   */
  static async updateTitleIfDefault(sessionId: string, newTitle: string) {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (session && session.title === "New Chat") {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { title: newTitle, updatedAt: new Date() },
      });
    } else {
      await this.touchSession(sessionId);
    }
  }
}
