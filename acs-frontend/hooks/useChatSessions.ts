import { useState, useRef, useCallback } from "react";
import { ChatMessage } from "@/types/chat";
import { aiQueryService, ChatSessionItem } from "@/lib/ai-query.service";

/**
 * Hook for managing chat sessions (CRUD, sidebar, navigation).
 * Extracted from useChat to reduce complexity.
 */
export const useChatSessions = () => {
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const loadSessionsList = useCallback(async () => {
    try {
      const list = await aiQueryService.listSessions();
      setSessions(list);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  }, []);

  const handleNewSession = useCallback(
    async (setChatHistory: (history: ChatMessage[]) => void) => {
      try {
        const newSession = await aiQueryService.createSession();
        setCurrentSessionId(newSession.id);
        setChatHistory([
          {
            id: "welcome",
            content: "Sesi obrolan baru dimulai. Ada yang bisa saya bantu hari ini?",
            role: "assistant",
            timestamp: new Date(),
          },
        ]);
        await loadSessionsList();
      } catch (err) {
        console.error("Failed to create session", err);
      }
    },
    [loadSessionsList],
  );

  const handleSelectSession = useCallback(
    async (sessionId: string, setChatHistory: (history: ChatMessage[]) => void) => {
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
    },
    [],
  );

  const handleDeleteSession = useCallback(
    async (
      sessionId: string,
      setChatHistory: (history: ChatMessage[]) => void,
    ) => {
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

  return {
    sessions,
    setSessions,
    currentSessionId,
    setCurrentSessionId,
    isSidebarOpen,
    setIsSidebarOpen,
    loadSessionsList,
    handleNewSession,
    handleSelectSession,
    handleDeleteSession,
    handleRenameSession,
  };
};
