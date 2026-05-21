import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import { env } from "../common/env";
import { AuthRequest } from "../middleware/auth.middleware";

// A7: Cookie options for refresh token (httpOnly for XSS protection)
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, divisionId: user.divisionId, clearanceLevel: user.clearanceLevel, type: "access" },
      env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, divisionId: user.divisionId, clearanceLevel: user.clearanceLevel, type: "refresh" },
      env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    // A7: Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(201).json({
      message: "User registered successfully",
      token: accessToken, // Kept for legacy compatibility
      tokens: {
        accessToken,
        refreshToken,
      },
      user: { id: user.id, email: user.email, name: user.name, divisionId: user.divisionId, clearanceLevel: user.clearanceLevel },
    });
  } catch (error: any) {
    console.error("[Auth Register Error]:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, username, password } = req.body;
  const loginIdentifier = email || username;

  try {
    const user = await prisma.user.findUnique({
      where: { email: loginIdentifier },
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username/email or password",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid username/email or password",
      });
    }

    // Block soft-deleted/deactivated users
    if (user.clearanceLevel === 0 || user.name?.startsWith("[DELETED]")) {
      return res.status(403).json({
        success: false,
        message: "Akun telah dinonaktifkan. Hubungi administrator.",
      });
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, divisionId: user.divisionId, clearanceLevel: user.clearanceLevel, type: "access" },
      env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, divisionId: user.divisionId, clearanceLevel: user.clearanceLevel, type: "refresh" },
      env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    // A7: Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          username: user.email,
          email: user.email,
          name: user.name,
          role: user.role,
          divisionId: user.divisionId,
          clearanceLevel: user.clearanceLevel,
        },
        tokens: {
          accessToken: accessToken,
          refreshToken: refreshToken,
          expiresIn: "1h",
          remainingTime: 1 * 60 * 60,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Auth Login Error]:", error);
    res.status(500).json({ success: false, message: "Failed to login" });
  }
};

export const verifyToken = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Calculate real remaining time from the JWT itself
    const tokenExp = req.user.exp; // JWT exp is in seconds
    const nowSec = Math.floor(Date.now() / 1000);
    const remainingTime = tokenExp ? Math.max(0, tokenExp - nowSec) : 0;
    const isExpiringSoon = remainingTime < 10 * 60; // less than 10 minutes

    res.status(200).json({
      success: true,
      data: {
        remainingTime,
        isExpiringSoon,
        expiresAt: tokenExp
          ? new Date(tokenExp * 1000).toISOString()
          : new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          divisionId: user.divisionId,
          clearanceLevel: user.clearanceLevel,
        },
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Token verification failed" });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  // A7: Try cookie first, then body (backward compatible)
  const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingToken)
    return res.status(400).json({ success: false, message: "Token required" });

  try {
    const decoded: any = jwt.verify(incomingToken, env.JWT_REFRESH_SECRET);
    
    // Explicitly reject access tokens when refreshing
    if (decoded.type === "access") {
      return res.status(401).json({ success: false, message: "Use refresh token to acquire a new access token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Block soft-deleted/deactivated users from refreshing
    if (user.clearanceLevel === 0 || user.name?.startsWith("[DELETED]")) {
      res.clearCookie("refreshToken", { path: "/api/auth" });
      return res.status(403).json({ success: false, message: "Akun telah dinonaktifkan." });
    }

    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, divisionId: user.divisionId, clearanceLevel: user.clearanceLevel, type: "access" },
      env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // A7: Rotate refresh token — issue a new one each time
    const newRefreshToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, divisionId: user.divisionId, clearanceLevel: user.clearanceLevel, type: "refresh" },
      env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        remainingTime: 1 * 60 * 60,
      },
    });
  } catch (error) {
    // A7: Clear invalid cookie
    res.clearCookie("refreshToken", { path: "/api/auth" });
    res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
};

export const quickRefresh = refreshToken;
