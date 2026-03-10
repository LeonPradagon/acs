import apiClient from "./api-client";
import { ChatMessage } from "@/types/chat";

const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
};

// ===== Session Management =====

export interface ChatSessionItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export const listSessions = async (): Promise<ChatSessionItem[]> => {
  const res = await apiClient.get("/api/chat/sessions");
  return res.data.data || [];
};

export const createSession = async (): Promise<ChatSessionItem> => {
  const res = await apiClient.post("/api/chat/sessions");
  return res.data.data;
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  await apiClient.delete(`/api/chat/sessions/${sessionId}`);
};

export const loadSessionHistory = async (
  sessionId: string,
): Promise<ChatMessage[]> => {
  const res = await apiClient.get(`/api/chat/history/${sessionId}`);
  return (res.data.data || []).map((m: any) => ({
    id: m.id,
    content: m.content,
    role: m.role,
    timestamp: new Date(m.createdAt),
    files: m.files,
  }));
};

// ===== Health =====

export const checkHealth = async (): Promise<boolean> => {
  try {
    const res = await apiClient.get("/api/chat/health");
    return res.data?.status === "healthy";
  } catch {
    return false;
  }
};

// ===== Feedback =====

export const submitFeedback = async (
  messageId: string,
  rating: "thumbs_up" | "thumbs_down",
  comment?: string,
): Promise<any> => {
  const res = await apiClient.post("/api/chat/feedback", {
    messageId,
    rating,
    comment,
  });
  return res.data.data;
};

// ===== Utilities =====

export const validateAndFixAnalysisData = (data: any): any => {
  if (!data) return { items: [] };
  if (Array.isArray(data)) return { items: data };
  if (data.items && Array.isArray(data.items)) return data;
  return { items: [data] };
};

// ===== Streaming Chat =====

export const streamChatRequest = async (
  question: string,
  messages: any[] = [],
  options: any = {},
  onToken: (token: string) => void,
  onSources?: (sources: any[]) => void,
  onStep?: (step: string) => void,
  onDone?: (model: string) => void,
  onError?: (message: string) => void,
  signal?: AbortSignal,
): Promise<void> => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const response = await fetch(`${getBaseUrl()}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      question,
      messages,
      model: options.model || "openai/gpt-oss-120b",
      sessionId: options.sessionId,
      files: options.files || [],
    }),
    signal,
  });

  if (!response.ok) throw new Error(`Stream failed: ${response.status}`);

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No readable stream");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            switch (data.type) {
              case "token":
                onToken(data.token);
                break;
              case "sources":
                onSources?.(data.sources);
                break;
              case "step":
                onStep?.(data.step);
                break;
              case "done":
                onDone?.(data.model);
                break;
              case "error":
                onError?.(data.message);
                break;
            }
          } catch {}
        }
      }
    }
  } catch (err: any) {
    if (err.name === "AbortError") {
      // User cancelled — this is expected
      reader.cancel();
      return;
    }
    throw err;
  }
};

// ===== Main processQuery =====

export const processQuery = async (
  userQuery: string,
  chatHistory: any[],
  onStreamToken?: (token: string) => void,
  onStep?: (step: string) => void,
  sessionId?: string,
  signal?: AbortSignal,
  files?: any[],
  model?: string,
): Promise<ChatMessage> => {
  const startTime = Date.now();

  if (onStreamToken) {
    return new Promise<ChatMessage>((resolve, reject) => {
      let fullContent = "";
      let sources: any[] = [];
      let modelUsed = "openai/gpt-oss-120b";

      streamChatRequest(
        userQuery,
        chatHistory,
        { sessionId, files, model },
        (token) => {
          fullContent += token;
          onStreamToken(token);
        },
        (s) => {
          sources = s;
        },
        (step) => {
          onStep?.(step);
        },
        (model) => {
          modelUsed = model;
          resolve({
            id: Date.now().toString(),
            content: fullContent,
            role: "assistant",
            timestamp: new Date(),
            sources,
            modelUsed,
            processingTime: Date.now() - startTime,
          });
        },
        (errorMsg) => {
          reject(new Error(errorMsg));
        },
        signal,
      );
    });
  }

  // Fallback non-streaming
  try {
    const res = await apiClient.post("/api/chat/universal", {
      question: userQuery,
      messages: chatHistory,
      sessionId,
      files,
    });
    const result = res.data;
    return {
      id: Date.now().toString(),
      content: result.answer || result.narrative || "",
      role: "assistant",
      timestamp: new Date(),
      sources: result.sources || [],
      modelUsed: result.model,
      processingTime: Date.now() - startTime,
    };
  } catch {
    return {
      id: Date.now().toString(),
      content: "Terjadi kesalahan saat memproses permintaan.",
      role: "assistant",
      timestamp: new Date(),
      processingTime: Date.now() - startTime,
    };
  }
};

export const renameSession = async (
  sessionId: string,
  title: string,
): Promise<void> => {
  await apiClient.patch(`/api/chat/sessions/${sessionId}`, { title });
};

export const aiQueryService = {
  checkHealth,
  processQuery,
  streamChatRequest,
  listSessions,
  createSession,
  renameSession,
  deleteSession,
  loadSessionHistory,
  submitFeedback,
};
