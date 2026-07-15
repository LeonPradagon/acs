import { prisma } from "../config/db";
import { randomUUID } from "crypto";

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentId?: string;
}

export class TracingService {
  /**
   * Generates a new root trace context.
   */
  static createRootContext(): TraceContext {
    return {
      traceId: randomUUID(),
      spanId: randomUUID(),
    };
  }

  /**
   * Creates a child context from a parent context.
   */
  static createChildContext(parent: TraceContext): TraceContext {
    return {
      traceId: parent.traceId,
      spanId: randomUUID(),
      parentId: parent.spanId,
    };
  }

  /**
   * Records a step execution in the workflow.
   */
  static async recordStep(
    context: TraceContext,
    name: string,
    status: "SUCCESS" | "ERROR",
    durationMs: number,
    metadata?: Record<string, any>,
    error?: string
  ): Promise<void> {
    try {
      await prisma.traceLog.create({
        data: {
          traceId: context.traceId,
          spanId: context.spanId,
          parentId: context.parentId,
          name,
          status,
          durationMs,
          metadata: metadata || {},
          error,
        },
      });
      console.log(`[Trace] ${name} | ${status} | ${durationMs}ms`);
    } catch (err) {
      console.warn("[TracingService] Failed to record trace:", err);
    }
  }

  /**
   * Helper to automatically trace an async function execution.
   */
  static async traceAsync<T>(
    parentContext: TraceContext | undefined,
    name: string,
    fn: (ctx: TraceContext) => Promise<T>,
    metadataExtractor?: (result: T) => Record<string, any>
  ): Promise<T> {
    const context = parentContext 
      ? this.createChildContext(parentContext) 
      : this.createRootContext();
      
    const startTime = Date.now();
    try {
      const result = await fn(context);
      const durationMs = Date.now() - startTime;
      
      const metadata = metadataExtractor ? metadataExtractor(result) : undefined;
      
      // Fire and forget
      this.recordStep(context, name, "SUCCESS", durationMs, metadata);
      
      return result;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      // Fire and forget
      this.recordStep(
        context, 
        name, 
        "ERROR", 
        durationMs, 
        { errorMessage: error.message },
        error.stack
      );
      throw error;
    }
  }
}
