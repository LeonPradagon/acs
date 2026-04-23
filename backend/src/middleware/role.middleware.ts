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

/**
 * Middleware to check if the authenticated user has access to a specific division.
 * Superadmins have access to everything.
 * Requires `divisionId` either in req.params or req.body, depending on implementation.
 */
export const authorizeDivisionAccess = () => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Access denied. User not authenticated." });
    }

    if (req.user.role === "superadmin") {
      return next(); // Superadmin bypassed
    }

    // Try to get target division from params or query or body
    const targetDivisionId = req.params.divisionId || req.query.divisionId || req.body.divisionId;

    if (!targetDivisionId) {
      // If there's no specific division, we might let them proceed but their RAG scope will be limited by service logic
      return next();
    }

    if (req.user.divisionId !== targetDivisionId) {
      return res.status(403).json({ error: "Forbidden. You do not have access to this division's data." });
    }

    next();
  };
};
