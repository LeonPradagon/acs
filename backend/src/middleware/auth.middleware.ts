import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../common/env";
import { prisma } from "../config/db";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    divisionId?: string | null;
    clearanceLevel?: number;
    exp?: number;  // JWT expiration timestamp (seconds since epoch)
    type?: string; // "access" | "refresh"
  };
}

/**
 * In-memory cache for user role/security data.
 * Avoids DB query on every request, but ensures roles refresh within 30 seconds
 * if admin changes them (unlike pure JWT which never refreshes until re-login).
 */
const _userCache = new Map<string, { data: any; expiresAt: number }>();
const USER_CACHE_TTL = 30_000; // 30 seconds

async function getFreshUserData(userId: string) {
  const cached = _userCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, divisionId: true, clearanceLevel: true },
    });
    if (user) {
      _userCache.set(userId, { data: user, expiresAt: Date.now() + USER_CACHE_TTL });
    }
    return user;
  } catch (err) {
    // If DB is unreachable, fall back to JWT data (better than blocking)
    console.warn("[Auth] Failed to refresh user data from DB, using JWT data");
    return null;
  }
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: "Access token is required" });
  }

  jwt.verify(token, env.JWT_SECRET, async (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    
    // Prevent refresh tokens from being used for generic access
    if (decoded?.type === "refresh") {
      return res.status(403).json({ error: "Refresh token cannot be used to access endpoints" });
    }

    // S1 Fix: Refresh role/clearance from DB (cached 30s)
    // This ensures admin role changes take effect within 30 seconds
    // instead of requiring the user to re-login
    const freshData = await getFreshUserData(decoded.userId);
    if (freshData) {
      decoded.role = freshData.role;
      decoded.divisionId = freshData.divisionId;
      decoded.clearanceLevel = freshData.clearanceLevel;
    }

    req.user = decoded;
    next();
  });
};
