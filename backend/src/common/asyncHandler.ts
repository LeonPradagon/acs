import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { AppError } from "./errors";

/**
 * Shared async handler wrapper for Express route controllers.
 * Eliminates repetitive try/catch blocks and provides consistent error handling.
 * 
 * Usage:
 *   export const myHandler = asyncHandler(async (req, res) => {
 *     // your logic — errors will be caught automatically
 *   });
 */
export function asyncHandler(
  fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | any>,
) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error: any) {
      if (error instanceof AppError) {
        return res
          .status(error.statusCode)
          .json({ success: false, error: error.message, code: error.code });
      }

      console.error(`[asyncHandler] Unhandled error:`, error);
      res.status(500).json({
        success: false,
        error: error.message || "Internal server error",
      });
    }
  };
}
