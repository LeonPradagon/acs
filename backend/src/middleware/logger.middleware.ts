import { Request, Response, NextFunction } from "express";

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

    // Color-coded level based on status code
    const level =
      statusCode >= 500
        ? "ERROR"
        : statusCode >= 400
          ? "WARN"
          : "INFO";

    console.log(
      `[${level}] ${method} ${path} → ${statusCode} (${duration}ms) [${requestId}]`,
    );
  });

  next();
};
