import { Request, Response } from "express";
import { prisma } from "../config/db"; // trigger TS server update

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    // 1. Total Token Usage
    const tokenAggr = await prisma.tokenUsage.aggregate({
      _sum: { tokens: true, promptTokens: true, completionTokens: true }
    });
    const totalTokens = tokenAggr._sum?.tokens || 0;
    
    // 2. Average Latency (from TraceLog)
    const traceAggr = await prisma.traceLog.aggregate({
      _avg: { durationMs: true },
      where: { name: { contains: "HTTP" } }
    });
    const avgLatency = traceAggr._avg?.durationMs || 0;

    // 3. Failure Rate
    const totalTraces = await prisma.traceLog.count();
    const errorTraces = await prisma.traceLog.count({ where: { status: "ERROR" } });
    const failureRate = totalTraces > 0 ? (errorTraces / totalTraces) * 100 : 0;

    // 4. Token Cost Estimation (Assuming $2.50 per 1M tokens approx for gpt-oss / mixtral equivalent)
    const estimatedCost = (totalTokens / 1_000_000) * 2.5;

    res.json({
      totalTokens,
      avgLatency: Math.round(avgLatency),
      failureRate: Number(failureRate.toFixed(2)),
      estimatedCost: Number(estimatedCost.toFixed(4)),
      totalRequests: totalTraces
    });
  } catch (error: any) {
    console.error("[Analytics Controller] Error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};
