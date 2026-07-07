import { AIGateway } from "../gateway/ai-gateway";
import * as fs from "fs";

export interface BenchmarkDataset {
  name: string;
  items: {
    query: string;
    expectedAnswer: string;
    contextRequired?: boolean;
  }[];
}

export interface BenchmarkReport {
  runId: string;
  datasetName: string;
  model: string;
  accuracy: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  results: any[];
}

export class BenchmarkRunner {
  static async run(datasetPath: string, model: string): Promise<BenchmarkReport> {
    console.log(`[Benchmark] Starting run for ${datasetPath} using model ${model}`);
    
    let dataset: BenchmarkDataset;
    try {
      const data = fs.readFileSync(datasetPath, "utf-8");
      dataset = JSON.parse(data);
    } catch (err) {
      throw new Error(`Failed to load dataset at ${datasetPath}`);
    }

    const runId = `run-${Date.now()}`;
    let totalLatency = 0;
    let totalCost = 0;
    let correct = 0;
    const results = [];

    for (const item of dataset.items) {
      // In a real implementation, this would call ChatWorkflow.
      // We simulate calling AIGateway directly for benchmarking raw LLM capabilities.
      const res = await AIGateway.invoke({
        model,
        messages: [{ role: "user", content: item.query }],
        temperature: 0.0
      });

      totalLatency += res.metadata.latencyMs;
      totalCost += res.metadata.estimatedCostUsd;
      
      // Basic fuzzy match for accuracy
      const isCorrect = res.content.toLowerCase().includes(item.expectedAnswer.toLowerCase());
      if (isCorrect) correct++;

      results.push({
        query: item.query,
        expected: item.expectedAnswer,
        actual: res.content,
        isCorrect,
        latencyMs: res.metadata.latencyMs
      });
    }

    const report: BenchmarkReport = {
      runId,
      datasetName: dataset.name,
      model,
      accuracy: correct / dataset.items.length,
      avgLatencyMs: totalLatency / dataset.items.length,
      totalCostUsd: totalCost,
      results
    };

    console.log(`[Benchmark] Run complete. Accuracy: ${report.accuracy * 100}%. Cost: $${report.totalCostUsd}`);
    
    // In a real implementation, save to Prisma BenchmarkResult table
    return report;
  }
}
