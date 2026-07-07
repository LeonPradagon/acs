import { prisma } from "./db"; // trigger TS server update
import { v4 as uuidv4 } from "uuid";
import { Request, Response, NextFunction } from "express";

/**
 * Custom lightweight tracing and observability layer
 * Stores traces directly to PostgreSQL (TraceLog and SystemMetrics)
 */
export class Tracer {
  /**
   * Start a new span to measure duration of an operation
   */
  static startSpan(name: string, traceId?: string, parentId?: string) {
    const startTime = Date.now();
    const spanId = uuidv4();
    const tId = traceId || uuidv4();

    return {
      spanId,
      traceId: tId,
      end: async (status: "SUCCESS" | "ERROR", metadata?: any, errorMsg?: string) => {
        const durationMs = Date.now() - startTime;
        
        try {
          await prisma.traceLog.create({
            data: {
              traceId: tId,
              spanId,
              parentId,
              name,
              status,
              durationMs,
              metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
              error: errorMsg
            }
          });
        } catch (dbErr) {
          console.error("[Tracer] Failed to log trace:", dbErr);
        }
        
        return durationMs;
      }
    };
  }

  /**
   * Record a system metric
   */
  static async recordMetric(name: string, value: number, unit: string) {
    try {
      await prisma.systemMetrics.create({
        data: {
          name,
          value,
          unit
        }
      });
    } catch (dbErr) {
      console.error("[Tracer] Failed to log metric:", dbErr);
    }
  }
}

/**
 * Express middleware to trace all HTTP requests
 */
export const httpTracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip tracing for very frequent or static routes if needed
  if (req.path.startsWith("/api/health") || req.method === "OPTIONS") {
    return next();
  }

  const span = Tracer.startSpan(`HTTP ${req.method} ${req.path}`);
  
  // Attach traceId to request for downstream correlation
  (req as any).traceId = span.traceId;

  const originalSend = res.send;
  let responseData: any = null;

  // Intercept response to check status
  res.send = function (body) {
    responseData = body;
    return originalSend.call(this, body);
  };

  res.on("finish", () => {
    const status = res.statusCode >= 400 ? "ERROR" : "SUCCESS";
    let errorMsg = undefined;
    
    if (status === "ERROR" && responseData) {
      try {
        const parsed = JSON.parse(responseData);
        if (parsed.error) errorMsg = parsed.error;
      } catch (e) {
        errorMsg = responseData.toString().substring(0, 500);
      }
    }

    span.end(status, { 
      statusCode: res.statusCode, 
      ip: req.ip,
      userAgent: req.get("user-agent")
    }, errorMsg);
  });

  next();
};
