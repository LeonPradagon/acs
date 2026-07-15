import { Request, Response, NextFunction } from "express";
import { env } from "../common/env";

/**
 * Middleware to protect Headless API integration routes.
 * Checks for a valid 'x-api-key' header.
 */
export const requireApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKeyHeader = req.headers["x-api-key"];

  if (!env.INTEGRATION_API_KEY) {
    console.error("[API Key Auth] Integration API Key is not configured in .env");
    res.status(500).json({ error: "Server Configuration Error" });
    return;
  }

  if (!apiKeyHeader || apiKeyHeader !== env.INTEGRATION_API_KEY) {
    res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
    return;
  }

  next();
};
