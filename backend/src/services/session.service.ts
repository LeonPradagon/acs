import { prisma } from "../config/db";
import { NotFoundError, ForbiddenError } from "../common/errors";

export class SessionService {
  /**
   * List all chat sessions for a user, ordered by most recent.
   */
  static async listSessions(userId?: string, page: number = 1, limit: number = 20) {
    if (!userId) {
      throw new ForbiddenError("User ID is required to list sessions");
    }

    const skip = (page - 1) * limit;
    
    const [sessions, total] = await Promise.all([
      prisma.chatSession.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
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
      }),
      prisma.chatSession.count({ where: { userId } }),
    ]);

    return {
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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

    // Reject if session belongs to a user but requestor is not authenticated
    if (session.userId && !userId) {
      throw new ForbiddenError("Authentication required to access this session");
    }

    // Reject if session belongs to a different user
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
   * SC4: Supports cursor-based pagination for large conversations.
   */
  static async getChatHistory(
    sessionId: string,
    userId?: string,
    options: { cursor?: string; limit?: number } = {},
  ) {
    await this._getSessionAndVerify(sessionId, userId);

    const limit = Math.min(options.limit || 50, 100);

    const messages = await prisma.chatHistory.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      ...(options.cursor
        ? { cursor: { id: options.cursor }, skip: 1 }
        : {}),
      take: limit + 1, // Fetch 1 extra to detect hasMore
    });

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

    return {
      messages: data,
      pagination: {
        hasMore,
        nextCursor,
        count: data.length,
      },
    };
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

  /**
   * Delete ALL sessions for a user (bulk clear).
   */
  static async deleteAllSessions(userId?: string) {
    if (!userId) {
      throw new ForbiddenError("User ID is required to delete sessions");
    }

    const result = await prisma.chatSession.deleteMany({
      where: { userId },
    });

    return { deleted: result.count };
  }

  /**
   * Search across all chat messages for a user.
   */
  static async searchChatHistory(userId?: string, query?: string) {
    if (!userId) {
      throw new ForbiddenError("User ID is required to search");
    }
    if (!query || query.trim().length < 2) {
      throw new ForbiddenError("Search query must be at least 2 characters");
    }

    const messages = await prisma.chatHistory.findMany({
      where: {
        session: { userId },
        content: {
          contains: query.trim(),
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
        sessionId: true,
        session: {
          select: { title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return messages;
  }
}
