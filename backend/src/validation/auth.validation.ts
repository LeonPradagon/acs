import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .optional(),
});

export const loginSchema = z
  .object({
    email: z.string().optional(),
    username: z.string().optional(),
    password: z.string().min(1, "Password is required"),
  })
  .refine((data) => data.email || data.username, {
    message: "Email or username is required",
    path: ["email"],
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Token is required"),
});
