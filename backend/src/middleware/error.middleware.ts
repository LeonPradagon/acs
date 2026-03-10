import { Request, Response, NextFunction } from "express";
import { AppError } from "../common/errors";
import { ZodError } from "zod";

/**
 * Global error handling middleware for Express.
 * Handles AppError subclasses, ZodError, and generic errors.
 */
export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Handle custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: err.issues.map((issue: any) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  // Handle generic errors
  const statusCode = err.status || 500;
  const message = err.message || "Internal Server Error";

  console.error(`[Error] ${req.method} ${req.path}:`, err);

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
