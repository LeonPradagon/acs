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

export const env = {
  // Server
  PORT: parseInt(optionalEnv("PORT", "3002"), 10),
  NODE_ENV: optionalEnv("NODE_ENV", "development"),

  // Security
  JWT_SECRET: requireEnv("JWT_SECRET"),
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

  // Document Extractor
  TIKA_URL: optionalEnv("TIKA_URL", "http://localhost:9998"),
} as const;
