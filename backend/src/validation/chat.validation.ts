import { z } from "zod";

// ===== Chat Schemas =====

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.union([
    z.string(),
    z.array(
      z.object({
        type: z.enum(["text", "image_url"]),
        text: z.string().optional(),
        image_url: z.object({ url: z.string() }).optional(),
      }),
    ),
  ]),
});

export const streamChatSchema = z.object({
  question: z
    .string()
    .min(1, "Question is required")
    .max(5000, "Question exceeds maximum length of 5000 characters"),
  model: z.string().default("openai/gpt-oss-120b"),
  messages: z.array(messageSchema).max(50).default([]),
  sessionId: z.string().uuid().optional(),
  files: z.array(z.any()).default([]),
});

export const universalChatSchema = streamChatSchema; // Same shape

// ===== Session Schemas =====

export const renameSessionSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title too long")
    .transform((val) => val.trim()),
});

// ===== Feedback Schemas =====

export const submitFeedbackSchema = z.object({
  messageId: z.string().min(1, "messageId is required"),
  rating: z.enum(["thumbs_up", "thumbs_down"], {
    message: "Rating must be 'thumbs_up' or 'thumbs_down'",
  }),
  comment: z.string().optional(),
});
