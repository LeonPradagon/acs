import { describe, it, expect, vi } from "vitest";
import { EvaluationService } from "../services/evaluation.service";
import { prisma } from "../config/db";

// Mock prisma and openai
vi.mock("../config/db", () => ({
  prisma: {
    evaluationResult: {
      create: vi.fn().mockResolvedValue({ id: "mock-id" }),
    },
  },
}));

vi.mock("@langchain/openai", () => {
  return {
    ChatOpenAI: class {
      invoke = vi.fn().mockResolvedValue({
        content: JSON.stringify({
          relevancyScore: 0.95,
          faithfulness: 1.0,
          feedback: "Great answer."
        }),
      });
    },
  };
});

describe("EvaluationService", () => {
  it("should evaluate response and save to DB without throwing", async () => {
    const question = "Berapa cuti tahunan?";
    const answer = "12 hari.";
    const context = [{ content: "Cuti tahunan 12 hari" }];

    // This should not throw
    await expect(
      EvaluationService.evaluateResponseAsync("session-123", question, answer, context)
    ).resolves.not.toThrow();

    expect(prisma.evaluationResult.create).toHaveBeenCalled();
  });
});
