import { describe, it, expect } from "vitest";
import {
  shouldSkipRAG,
  buildConversationHistory,
  parseExportData,
  cleanExportTags,
} from "../../src/services/chat-stream.service";

describe("ChatStreamService — Query Classification", () => {
  it("should skip RAG for greetings", () => {
    expect(shouldSkipRAG("halo apa kabar?")).toBe(true);
    expect(shouldSkipRAG("hello")).toBe(true);
    expect(shouldSkipRAG("hi")).toBe(true);
  });

  it("should skip RAG for general coding questions", () => {
    expect(shouldSkipRAG("bagaimana cara coding javascript?")).toBe(true);
  });

  it("should NOT skip RAG for data questions", () => {
    expect(shouldSkipRAG("berapa total data karyawan?")).toBe(false);
    expect(shouldSkipRAG("tampilkan laporan keuangan")).toBe(false);
    expect(shouldSkipRAG("analisis trend serangan cyber")).toBe(false);
  });

  it("should NOT skip RAG for document references", () => {
    expect(shouldSkipRAG("bacakan dokumen SOP IT")).toBe(false);
    expect(shouldSkipRAG("ringkas file laporan")).toBe(false);
  });

  it("should NOT skip RAG for long general questions (>100 chars)", () => {
    const longQuestion = "tolong bantu saya " + "x".repeat(100);
    expect(shouldSkipRAG(longQuestion)).toBe(false);
  });
});

describe("ChatStreamService — Conversation History Builder", () => {
  it("should filter invalid roles", () => {
    const messages = [
      { role: "user", content: "hello" },
      { role: "invalid_role", content: "xxx" },
      { role: "assistant", content: "hi there" },
    ];
    const result = buildConversationHistory(messages);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
  });

  it("should truncate long assistant content", () => {
    const longContent = "x".repeat(5000);
    const messages = [
      { role: "assistant", content: longContent },
    ];
    const result = buildConversationHistory(messages);
    expect(result[0].content.length).toBeLessThan(longContent.length);
    expect(result[0].content).toContain("[truncated for context window]");
  });

  it("should NOT truncate user messages", () => {
    const longContent = "x".repeat(5000);
    const messages = [
      { role: "user", content: longContent },
    ];
    const result = buildConversationHistory(messages);
    expect(result[0].content).toBe(longContent);
  });

  it("should respect the sliding window limit", () => {
    const messages = Array.from({ length: 50 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `message ${i}`,
    }));
    const result = buildConversationHistory(messages, 10);
    expect(result).toHaveLength(10);
    expect(result[0].content).toBe("message 40");
  });

  it("should preserve tool_calls metadata", () => {
    const messages = [
      { role: "assistant", content: "", tool_calls: [{ id: "tc1" }] },
      { role: "tool", content: "result", tool_call_id: "tc1", name: "query_erp_sql" },
    ];
    const result = buildConversationHistory(messages);
    expect(result[0].tool_calls).toEqual([{ id: "tc1" }]);
    expect(result[1].tool_call_id).toBe("tc1");
    expect(result[1].name).toBe("query_erp_sql");
  });
});

describe("ChatStreamService — Export Data Parser", () => {
  it("should parse valid EXPORT_DATA block", () => {
    const response = `Here is your report.\n<EXPORT_DATA>{"format":"pdf","title":"Report","content":"Hello world"}</EXPORT_DATA>`;
    const result = parseExportData(response);
    expect(result).not.toBeNull();
    expect(result!.format).toBe("pdf");
    expect(result!.title).toBe("Report");
    expect(result!.content).toBe("Hello world");
  });

  it("should return null if no EXPORT_DATA", () => {
    expect(parseExportData("Just a normal response")).toBeNull();
  });

  it("should return null for malformed JSON", () => {
    const response = "<EXPORT_DATA>not json</EXPORT_DATA>";
    expect(parseExportData(response)).toBeNull();
  });

  it("should clean export tags from response", () => {
    const response = "Report here\n<EXPORT_DATA>{}</EXPORT_DATA>\nDone";
    const cleaned = cleanExportTags(response);
    expect(cleaned).toBe("Report here\n\nDone");
  });
});
