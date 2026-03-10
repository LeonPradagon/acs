import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Express middleware factory for Zod request body validation.
 * Usage: router.post("/endpoint", validate(mySchema), controller);
 */
export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue: any) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details,
        });
      }
      next(error);
    }
  };
