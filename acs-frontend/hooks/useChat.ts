import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "@/types/chat";
import { aiQueryService, ChatSessionItem } from "@/lib/ai-query.service";

interface UseChatOptions {
  onProcessComplete?: (message: ChatMessage) => void;
  initialMode?: string;
  initialPersona?: string;
  selectedModel?: string;
}

export const useChat = (options: UseChatOptions = {}) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState("");
  const [apiStatus, setApiStatus] = useState<"idle" | "connected" | "error">(
    "idle",
  );

  // Session Management State
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // AbortController for stop generation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Function to load all sessions
  const loadSessionsList = useCallback(async () => {
    try {
      const list = await aiQueryService.listSessions();
      setSessions(list);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  }, []);

  // Initialize
  useEffect(() => {
    const initChat = async () => {
      try {
        const isHealthy = await aiQueryService.checkHealth();
        setApiStatus(isHealthy ? "connected" : "error");

        if (isHealthy) {
          await loadSessionsList();
        }
      } catch {
        setApiStatus("error");
      }
    };

    initChat();
  }, [loadSessionsList]);

  // Handle setting welcome message if no history
  useEffect(() => {
    if (chatHistory.length === 0 && !currentSessionId) {
      setChatHistory([
        {
          id: "welcome",
          content:
            "Halo! Saya ACS AI Assistant. Saya siap membantu Anda dengan berbagai pertanyaan — mulai dari analisis data, coding, penjelasan konsep, hingga diskusi umum. Silakan ketik pertanyaan Anda! 🚀",
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
    }
  }, [chatHistory.length, currentSessionId]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 100);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, streamingContent, scrollToBottom]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // --- Session Actions ---

  const handleNewSession = useCallback(async () => {
    try {
      const newSession = await aiQueryService.createSession();
      setCurrentSessionId(newSession.id);
      setChatHistory([
        {
          id: "welcome",
          content:
            "Sesi obrolan baru dimulai. Ada yang bisa saya bantu hari ini?",
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
      await loadSessionsList();
    } catch (err) {
      console.error("Failed to create session", err);
    }
  }, [loadSessionsList]);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    try {
      const history = await aiQueryService.loadSessionHistory(sessionId);
      if (history.length > 0) {
        setChatHistory(history);
      } else {
        setChatHistory([
          {
            id: "welcome",
            content: "Sesi obrolan baru. Silakan ketik pertanyaan Anda.",
            role: "assistant",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to load session history", err);
    }
  }, []);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await aiQueryService.deleteSession(sessionId);
        await loadSessionsList();
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null);
          setChatHistory([]);
        }
      } catch (err) {
        console.error("Failed to delete session", err);
      }
    },
    [currentSessionId, loadSessionsList],
  );

  const clearChat = useCallback(() => {
    if (currentSessionId) {
      handleDeleteSession(currentSessionId);
    } else {
      setChatHistory([
        {
          id: "cleared",
          content: "Percakapan telah dibersihkan. Ada yang bisa saya bantu?",
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
      setStreamingContent("");
    }
  }, [currentSessionId, handleDeleteSession]);

  const copyConversation = useCallback(() => {
    const text = chatHistory
      .map(
        (msg) => `${msg.role === "user" ? "ANDA" : "ASISTEN"}: ${msg.content}`,
      )
      .join("\n\n");
    navigator.clipboard.writeText(text);
  }, [chatHistory]);

  // --- Stop Generation ---
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;

      // Save whatever content was streamed so far as a message
      setStreamingContent((currentContent) => {
        if (currentContent) {
          const partialMessage: ChatMessage = {
            id: Date.now().toString(),
            content:
              currentContent + "\n\n*(Generasi dihentikan oleh pengguna)*",
            role: "assistant",
            timestamp: new Date(),
          };
          setChatHistory((prev) => [...prev, partialMessage]);
        }
        return "";
      });

      setIsProcessing(false);
    }
  }, []);

  // --- Regenerate Last Response ---
  const handleRegenerate = useCallback(async () => {
    // Find the last user message
    const lastUserIndex = [...chatHistory]
      .reverse()
      .findIndex((m) => m.role === "user");
    if (lastUserIndex === -1) return;

    const actualIndex = chatHistory.length - 1 - lastUserIndex;
    const lastUserMessage = chatHistory[actualIndex];

    // Remove all messages after (and including) the last assistant response after this user message
    const newHistory = chatHistory.slice(0, actualIndex + 1);
    setChatHistory(newHistory);

    // Re-send the query
    handleProcess(
      lastUserMessage.content,
      "universal",
      "universal",
      "auto",
      {},
      newHistory,
    );
  }, [chatHistory]);

  // --- Export to Markdown ---
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

  // --- Feedback ---
  const submitFeedback = useCallback(
    async (messageId: string, rating: "thumbs_up" | "thumbs_down") => {
      try {
        await aiQueryService.submitFeedback(messageId, rating);
        return true;
      } catch (err) {
        console.error("Failed to submit feedback:", err);
        return false;
      }
    },
    [],
  );

  // --- Rename Session ---
  const handleRenameSession = useCallback(
    async (sessionId: string, title: string) => {
      try {
        await aiQueryService.renameSession(sessionId, title);
        await loadSessionsList();
      } catch (err) {
        console.error("Failed to rename session:", err);
      }
    },
    [loadSessionsList],
  );

  // --- Edit & Re-submit ---
  const handleEditAndResubmit = useCallback(
    async (messageIndex: number, newContent: string) => {
      // Remove this message and everything after it
      const newHistory = chatHistory.slice(0, messageIndex);

      // Add the edited message
      const editedMessage: ChatMessage = {
        id: Date.now().toString(),
        content: newContent,
        role: "user",
        timestamp: new Date(),
      };
      const updatedHistory = [...newHistory, editedMessage];
      setChatHistory(updatedHistory);

      // Re-process with the edited query
      handleProcess(
        newContent,
        "universal",
        "universal",
        "auto",
        {},
        updatedHistory,
      );
    },
    [chatHistory],
  );

  /**
   * Process a user message with streaming response
   */
  const handleProcess = async (
    userQuery: string,
    _mode: string,
    _persona: string,
    _ontologyMode: string,
    _ontologyOptions: any,
    existingHistory?: ChatMessage[],
    files?: any[],
  ) => {
    if (!userQuery.trim() || isProcessing) return;

    let activeSessionId = currentSessionId;

    // If no active session, create one first
    if (!activeSessionId) {
      try {
        const newSession = await aiQueryService.createSession();
        activeSessionId = newSession.id;
        setCurrentSessionId(activeSessionId);
      } catch (err) {
        console.error("Failed to auto-create session", err);
      }
    }

    // Add user message to UI (only if not regenerating — regenerating already has it)
    const currentHistory = existingHistory || chatHistory;
    if (!existingHistory) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content: userQuery,
        role: "user",
        timestamp: new Date(),
        files: files && files.length > 0 ? files : undefined,
      };
      setChatHistory((prev) => [...prev, userMessage]);
    }

    setIsProcessing(true);
    setStreamingContent("");
    setError("");
    setQuery("");

    // Create AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Build conversation history for memory (exclude welcome message)
      const historyForAPI = currentHistory
        .filter((m) => m.id !== "welcome" && m.id !== "cleared")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Use streaming + link to session
      const result = await aiQueryService.processQuery(
        userQuery,
        historyForAPI,
        (token: string) => {
          setStreamingContent((prev) => prev + token);
        },
        activeSessionId || undefined,
        controller.signal,
        files,
      );

      setChatHistory((prev) => [...prev, result]);
      setStreamingContent("");
      setApiStatus("connected");

      // Refresh the session list so the new title reflects in the sidebar
      await loadSessionsList();

      if (options.onProcessComplete) {
        options.onProcessComplete(result);
      }
    } catch (err: any) {
      // Don't log abort errors — they're user-initiated
      if (err.name === "AbortError") return;

      console.error("Error processing query:", err);

      const errorMessage =
        err.response?.status === 401
          ? "Sesi Anda telah berakhir. Silakan login kembali."
          : err.message || "Terjadi kesalahan saat memproses permintaan.";

      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        content: errorMessage,
        role: "assistant",
        timestamp: new Date(),
      };

      setChatHistory((prev) => [...prev, errorMsg]);
      setStreamingContent("");
      setError(errorMessage);
      setApiStatus("error");
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  return {
    chatHistory,
    setChatHistory,
    query,
    setQuery,
    isProcessing,
    streamingContent,
    error,
    setError,
    apiStatus,
    setApiStatus,
    messagesEndRef,
    textareaRef,
    clearChat,
    copyConversation,
    handleProcess,
    scrollToBottom,
    // Session exports
    sessions,
    currentSessionId,
    isSidebarOpen,
    setIsSidebarOpen,
    handleNewSession,
    handleSelectSession,
    handleDeleteSession,
    handleRenameSession,
    // New features
    stopGeneration,
    handleRegenerate,
    handleEditAndResubmit,
    exportToMarkdown,
    submitFeedback,
  };
};
