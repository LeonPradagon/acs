import { Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/db";
import { AuthRequest } from "../middleware/auth.middleware";

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        divisionId: true,
        clearanceLevel: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const now = new Date();
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [fiveHoursUsage, oneWeekUsage, oldestFiveHour, oldestOneWeek] = await Promise.all([
      prisma.tokenUsage.aggregate({
        where: { userId, createdAt: { gte: fiveHoursAgo } },
        _sum: { tokens: true }
      }),
      prisma.tokenUsage.aggregate({
        where: { userId, createdAt: { gte: oneWeekAgo } },
        _sum: { tokens: true }
      }),
      prisma.tokenUsage.findFirst({
        where: { userId, createdAt: { gte: fiveHoursAgo } },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.tokenUsage.findFirst({
        where: { userId, createdAt: { gte: oneWeekAgo } },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    const usage = {
      fiveHours: fiveHoursUsage._sum.tokens || 0,
      oneWeek: oneWeekUsage._sum.tokens || 0,
      nextResetFiveHours: oldestFiveHour ? new Date(oldestFiveHour.createdAt.getTime() + 5 * 60 * 60 * 1000) : null,
      nextResetOneWeek: oldestOneWeek ? new Date(oldestOneWeek.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
    };

    res.json({ ...user, usage });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updatePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.id !== userId) {
      return res.status(409).json({ error: "Email already in use by another account" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        divisionId: true,
        clearanceLevel: true,
        createdAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
