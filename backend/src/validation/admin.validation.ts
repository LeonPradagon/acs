import { z } from "zod";

// ===== User Management =====

export const updateUserRoleSchema = z.object({
  role: z.enum(["user", "admin", "superadmin"], {
    message: "Role must be 'user', 'admin', or 'superadmin'",
  }),
});

export const updateUserSecuritySchema = z.object({
  clearanceLevel: z
    .number()
    .int()
    .min(1, "Clearance level must be at least 1")
    .max(5, "Clearance level cannot exceed 5"),
  divisionId: z.string().uuid("Invalid division ID format").nullable().optional(),
});

// ===== System Settings =====

export const updateSettingSchema = z.object({
  key: z
    .string()
    .min(1, "Setting key is required")
    .max(100, "Setting key too long")
    .regex(/^[A-Z_]+$/, "Setting key must be UPPER_SNAKE_CASE"),
  value: z.string().max(2000, "Setting value too long"),
});

export const testConnectionSchema = z.object({
  mode: z.enum(["DB", "API"], {
    message: "Mode must be 'DB' or 'API'",
  }),
  url: z.string().url("Invalid URL format").max(500, "URL too long"),
  apiKey: z.string().max(500).optional(),
});

// ===== Document Management =====

export const deleteDocumentParamsSchema = z.object({
  id: z.string().min(1, "Document ID is required"),
});

export const userIdParamsSchema = z.object({
  id: z.string().uuid("Invalid user ID format"),
});
