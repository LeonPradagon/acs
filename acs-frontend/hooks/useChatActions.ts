import { useCallback } from "react";
import { ChatMessage } from "@/types/chat";

/**
 * Hook for chat utility actions (copy, export, feedback).
 * Extracted from useChat to reduce complexity.
 */
export const useChatActions = (chatHistory: ChatMessage[]) => {
  const copyConversation = useCallback(() => {
    const text = chatHistory
      .map(
        (msg) => `${msg.role === "user" ? "ANDA" : "ASISTEN"}: ${msg.content}`,
      )
      .join("\n\n");
    navigator.clipboard.writeText(text);
  }, [chatHistory]);

  const exportToMarkdown = useCallback(() => {
    const lines: string[] = [];
    lines.push("# Percakapan ACS AI Assistant");
    lines.push(`*Diekspor pada ${new Date().toLocaleString("id-ID")}*\n`);
    lines.push("---\n");

    chatHistory
      .filter((m) => m.id !== "welcome" && m.id !== "cleared")
      .forEach((msg) => {
        const role =
          msg.role === "user" ? "👤 **Anda**" : "🤖 **ACS AI Assistant**";
        const time =
          msg.timestamp instanceof Date
            ? msg.timestamp.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
        lines.push(`### ${role} ${time ? `_(${time})_` : ""}`);
        lines.push("");
        lines.push(msg.content);
        lines.push("");
        lines.push("---\n");
      });

    const blob = new Blob([lines.join("\n")], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [chatHistory]);

  const submitFeedback = useCallback(
    async (messageId: string, rating: "thumbs_up" | "thumbs_down") => {
      try {
        const { aiQueryService } = await import("@/lib/ai-query.service");
        await aiQueryService.submitFeedback(messageId, rating);
        return true;
      } catch (err) {
        console.error("Failed to submit feedback:", err);
        return false;
      }
    },
    [],
  );

  return {
    copyConversation,
    exportToMarkdown,
    submitFeedback,
  };
};
