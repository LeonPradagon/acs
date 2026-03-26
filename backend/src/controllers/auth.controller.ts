import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import { env } from "../common/env";

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
      { userId: user.id, email: user.email, role: user.role, type: "access" },
      env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, type: "refresh" },
      env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      message: "User registered successfully",
      token: accessToken, // Kept for legacy compatibility
      tokens: {
        accessToken,
        refreshToken,
      },
      user: { id: user.id, email: user.email, name: user.name },
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

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, type: "access" },
      env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, type: "refresh" },
      env.JWT_SECRET,
      { expiresIn: "7d" },
    );

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

export const verifyToken = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        remainingTime: 7 * 24 * 60 * 60,
        isExpiringSoon: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
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
  const { refreshToken: incomingToken } = req.body;
  if (!incomingToken)
    return res.status(400).json({ success: false, message: "Token required" });

  try {
    const decoded: any = jwt.verify(incomingToken, env.JWT_SECRET);
    
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

    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, type: "access" },
      env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        remainingTime: 1 * 60 * 60,
      },
    });
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
};

export const quickRefresh = refreshToken;
