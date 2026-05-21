import { Request, Response, NextFunction } from "express";
import { AppError } from "../common/errors";
import { ZodError } from "zod";
import { env } from "../common/env";
import { logger } from "../common/logger";

/**
 * Global error handling middleware for Express.
 * Handles AppError subclasses, ZodError, and generic errors.
 */
export const errorMiddleware = (
  err: Error | AppError | ZodError | any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const requestId = (req as any).id || "-";

  // Handle custom AppError
  if (err instanceof AppError) {
    logger.warn(`AppError [${err.statusCode}]: ${err.message}`, "ErrorHandler", { code: err.code }, requestId);
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.issues.map((issue: any) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    logger.warn(`ZodError validation failed`, "ErrorHandler", { details }, requestId);
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details,
    });
  }

  // Handle generic errors
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  logger.error(
    `[Error ${statusCode}] ${req.method} ${req.path}: ${message}`,
    "ErrorHandler",
    { stack: err.stack, error: err },
    requestId
  );

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
