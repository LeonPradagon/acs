import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../common/env";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
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

  jwt.verify(token, env.JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    
    // Prevent refresh tokens from being used for generic access
    if (decoded?.type === "refresh") {
      return res.status(403).json({ error: "Refresh token cannot be used to access endpoints" });
    }

    req.user = decoded;
    next();
  });
};
