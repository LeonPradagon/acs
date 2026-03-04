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

  /**
   * Process a user message with streaming response
   */
  const handleProcess = async (
    userQuery: string,
    _mode: string,
    _persona: string,
    _ontologyMode: string,
    _ontologyOptions: any,
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

    // Add user message to UI
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: userQuery,
      role: "user",
      timestamp: new Date(),
    };

    setChatHistory((prev) => [...prev, userMessage]);
    setIsProcessing(true);
    setStreamingContent("");
    setError("");
    setQuery("");

    try {
      // Build conversation history for memory (exclude welcome message)
      const historyForAPI = chatHistory
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
  };
};
