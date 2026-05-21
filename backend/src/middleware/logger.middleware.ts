import { Request, Response, NextFunction } from "express";
import { logger } from "../common/logger";

/**
 * Request logging middleware — logs each request with method, path, status, and duration.
 * Designed for structured, concise output suitable for production monitoring.
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startTime = Date.now();
  const requestId = (req as any).id || "-";

  // Log after response finishes
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const method = req.method;
    const path = req.originalUrl || req.path;

    const message = `${method} ${path} → ${statusCode} (${duration}ms)`;

    // Select correct structured log level based on status code
    if (statusCode >= 500) {
      logger.error(message, "HTTP", { method, path, statusCode, duration }, requestId);
    } else if (statusCode >= 400) {
      logger.warn(message, "HTTP", { method, path, statusCode, duration }, requestId);
    } else {
      logger.info(message, "HTTP", { method, path, statusCode, duration }, requestId);
    }
  });

  next();
};
