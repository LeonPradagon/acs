import dotenv from "dotenv";

dotenv.config();

/**
 * Validated environment configuration.
 * Fails fast on startup if required variables are missing.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

// Build JWT_SECRET first so it can be referenced by JWT_REFRESH_SECRET
const _JWT_SECRET = requireEnv("JWT_SECRET");

export const env = {
  // Server
  PORT: parseInt(optionalEnv("PORT", "3002"), 10),
  NODE_ENV: optionalEnv("NODE_ENV", "development"),

  // Security
  JWT_SECRET: _JWT_SECRET,
  JWT_REFRESH_SECRET: optionalEnv("JWT_REFRESH_SECRET", _JWT_SECRET),
  ALLOWED_ORIGINS: optionalEnv("ALLOWED_ORIGINS", "http://localhost:3000")
    .split(",")
    .map((s) => s.trim()),

  // Database
  DATABASE_URL: requireEnv("DATABASE_URL"),

  // Elasticsearch
  ES_NODE: optionalEnv("ES_NODE", "http://localhost:9200"),
  ES_USERNAME: optionalEnv("ES_USERNAME", "elastic"),
  ES_PASSWORD: optionalEnv("ES_PASSWORD", "changeme"),

  // Redis
  REDIS_URL: optionalEnv("REDIS_URL", "redis://localhost:6379"),

  // AI Services
  GROQ_API_KEY: requireEnv("GROQ_API_KEY"),
  LLAMAPARSE_API_KEY: process.env.LLAMAPARSE_API_KEY || "",
  
  // Onyx AI
  ONYX_API_KEY: process.env.ONYX_API_KEY || "",
  ONYX_API_URL: process.env.ONYX_API_URL || "http://localhost:8080",

  // Document Extractor
  TIKA_URL: optionalEnv("TIKA_URL", "http://localhost:9998"),

  // Microsoft Email OAuth (Outlook Integration)
  MICROSOFT_CLIENT_ID: optionalEnv("MICROSOFT_CLIENT_ID", ""),
  MICROSOFT_CLIENT_SECRET: optionalEnv("MICROSOFT_CLIENT_SECRET", ""),
  MICROSOFT_TENANT_ID: optionalEnv("MICROSOFT_TENANT_ID", "common"),
  MICROSOFT_REDIRECT_URI: optionalEnv("MICROSOFT_REDIRECT_URI", "http://localhost:3002/api/email/callback"),
  EMAIL_ENCRYPTION_KEY: optionalEnv("EMAIL_ENCRYPTION_KEY", ""),
} as const;

// ============================================================
// Startup Validation Warnings
// ============================================================
if (env.JWT_REFRESH_SECRET === env.JWT_SECRET) {
  console.warn("⚠️  WARNING: JWT_REFRESH_SECRET is identical to JWT_SECRET. Use separate secrets in production.");
}

if (env.NODE_ENV === "production" && !env.EMAIL_ENCRYPTION_KEY) {
  console.warn("⚠️  WARNING: EMAIL_ENCRYPTION_KEY is not set. Email integration will be unavailable.");
}
