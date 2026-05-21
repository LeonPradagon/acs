import { env } from "./env";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  requestId?: string;
  meta?: any;
}

const levelSeverity: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Default log level based on environment or fallback
const currentLogLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
const currentSeverity = levelSeverity[currentLogLevel] ?? 1;

function shouldLog(level: LogLevel): boolean {
  return levelSeverity[level] >= currentSeverity;
}

function formatLog(
  level: LogLevel,
  message: string,
  context?: string,
  meta?: any,
  requestId?: string
): LogPayload {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
    ...(requestId ? { requestId } : {}),
    ...(meta ? { meta } : {}),
  };
}

export const logger = {
  debug(message: string, context?: string, meta?: any, requestId?: string) {
    if (shouldLog("debug")) {
      console.log(JSON.stringify(formatLog("debug", message, context, meta, requestId)));
    }
  },

  info(message: string, context?: string, meta?: any, requestId?: string) {
    if (shouldLog("info")) {
      console.log(JSON.stringify(formatLog("info", message, context, meta, requestId)));
    }
  },

  warn(message: string, context?: string, meta?: any, requestId?: string) {
    if (shouldLog("warn")) {
      console.warn(JSON.stringify(formatLog("warn", message, context, meta, requestId)));
    }
  },

  error(message: string, context?: string, meta?: any, requestId?: string) {
    if (shouldLog("error")) {
      console.error(JSON.stringify(formatLog("error", message, context, meta, requestId)));
    }
  },
};
