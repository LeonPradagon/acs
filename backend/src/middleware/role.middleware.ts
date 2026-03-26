import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

/**
 * Middleware to check if the authenticated user has one of the allowed roles.
 * Must be used AFTER `authenticateToken`.
 */
export const authorizeRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res
        .status(403)
        .json({ error: "Access denied. Role is missing in credential." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Forbidden. You do not have the required access level." });
    }

    next();
  };
};
