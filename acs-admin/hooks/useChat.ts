import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "@/types/chat";
import { aiQueryService } from "@/lib/ai-query.service";
import { useChatSessions } from "./useChatSessions";
import { useChatActions } from "./useChatActions";

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
  const [processingSteps, setProcessingSteps] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(
    options.selectedModel || "openai/gpt-oss-120b",
  );
  const [effortLevel, setEffortLevel] = useState<string>("medium");
  const [isThinking, setIsThinking] = useState<boolean>(true);

  // Compose session management from extracted hook
  const sessionManager = useChatSessions();
  const {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    isSidebarOpen,
    setIsSidebarOpen,
    loadSessionsList,
  } = sessionManager;

  // Compose utility actions from extracted hook
  const chatActions = useChatActions(chatHistory);
  const { copyConversation, exportToMarkdown, submitFeedback } = chatActions;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // AbortController for stop generation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stable ref to always access the latest handleProcess
  const handleProcessRef = useRef<typeof handleProcess>(null as any);



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

  // --- Delegated Session Actions ---

  const handleNewSession = useCallback(async () => {
    await sessionManager.handleNewSession(setChatHistory);
  }, [sessionManager]);

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      await sessionManager.handleSelectSession(sessionId, setChatHistory);
    },
    [sessionManager],
  );

  const hasInit = useRef(false);

  // Initialize
  useEffect(() => {
    if (hasInit.current) return;
    hasInit.current = true;

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

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      await sessionManager.handleDeleteSession(sessionId, setChatHistory);
    },
    [sessionManager],
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

  // --- Stop Generation ---
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;

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
    const lastUserIndex = [...chatHistory]
      .reverse()
      .findIndex((m) => m.role === "user");
    if (lastUserIndex === -1) return;

    const actualIndex = chatHistory.length - 1 - lastUserIndex;
    const lastUserMessage = chatHistory[actualIndex];

    const newHistory = chatHistory.slice(0, actualIndex + 1);
    setChatHistory(newHistory);

    handleProcessRef.current(
      lastUserMessage.content,
      "universal",
      "universal",
      "auto",
      {},
      newHistory,
      lastUserMessage.files,
      selectedModel,
      lastUserMessage.images,
      effortLevel,
      isThinking
    );
  }, [chatHistory, selectedModel, effortLevel, isThinking]);

  // --- Edit & Re-submit ---
  const handleEditAndResubmit = useCallback(
    async (messageIndex: number, newContent: string) => {
      const newHistory = chatHistory.slice(0, messageIndex);

      const editedMessage: ChatMessage = {
        id: Date.now().toString(),
        content: newContent,
        role: "user",
        timestamp: new Date(),
      };
      const updatedHistory = [...newHistory, editedMessage];
      setChatHistory(updatedHistory);

      handleProcessRef.current(
        newContent,
        "universal",
        "universal",
        "auto",
        {},
        updatedHistory,
        undefined,
        selectedModel,
        undefined,
        effortLevel,
        isThinking
      );
    },
    [chatHistory, selectedModel, effortLevel, isThinking],
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
    modelOverride?: string,
    images?: string[],
    overrideEffort?: string,
    overrideThinking?: boolean
  ) => {
    if (!userQuery.trim() && !(images && images.length > 0)) return;
    if (isProcessing) return;

    const activeModel = modelOverride || selectedModel;
    const activeEffort = overrideEffort || effortLevel;
    const activeThinking = overrideThinking !== undefined ? overrideThinking : isThinking;

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

    // Add user message to UI (only if not regenerating)
    const currentHistory = existingHistory || chatHistory;
    if (!existingHistory) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content: userQuery,
        role: "user",
        timestamp: new Date(),
        files: files && files.length > 0 ? files : undefined,
        images: images && images.length > 0 ? images : undefined,
      };
      setChatHistory((prev) => [...prev, userMessage]);
    }

    setIsProcessing(true);
    setStreamingContent("");
    setProcessingSteps([]);
    setError("");
    setQuery("");

    // Create AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Build conversation history for memory (exclude welcome message)
      const historyForAPI = currentHistory
        .filter((m) => m.id !== "welcome" && m.id !== "cleared")
        .map((m) => {
          if (m.images && m.images.length > 0) {
            return {
              role: m.role,
              content: [
                { type: "text", text: m.content },
                ...m.images.map((img) => ({
                  type: "image_url",
                  image_url: { url: img },
                })),
              ],
            };
          }
          return {
            role: m.role,
            content: m.content,
          };
        });

      // Use streaming + link to session
      const result = await aiQueryService.processQuery(
        userQuery,
        historyForAPI,
        (token: string) => {
          setStreamingContent((prev) => prev + token);
        },
        (step: string) => {
          setProcessingSteps((prev) => [...prev, step]);
        },
        activeSessionId || undefined,
        controller.signal,
        files,
        activeModel,
        activeEffort,
        activeThinking,
        images
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

  // Keep ref in sync so callbacks always call the latest version
  handleProcessRef.current = handleProcess;

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
    processingSteps,
    selectedModel,
    setSelectedModel,
    effortLevel,
    setEffortLevel,
    isThinking,
    setIsThinking,
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
    handleRenameSession: sessionManager.handleRenameSession,
    // New features
    stopGeneration,
    handleRegenerate,
    handleEditAndResubmit,
    exportToMarkdown,
    submitFeedback,
  };
};
