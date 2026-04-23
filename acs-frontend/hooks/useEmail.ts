"use client";

import { useState, useCallback } from "react";
import apiClient from "@/lib/api-client";

export interface EmailStatus {
  connected: boolean;
  email?: string;
  provider?: string;
  status?: string;
  connectedAt?: string;
  lastSyncAt?: string;
  scopes?: string[];
}

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  fromEmail: string;
  receivedAt: string;
  preview: string;
  isRead: boolean;
  hasAttachments: boolean;
}

export interface EmailDetail {
  id: string;
  subject: string;
  from: string;
  fromEmail: string;
  to: { name: string; email: string }[];
  receivedAt: string;
  body: string;
  bodyType: string;
  isRead: boolean;
  hasAttachments: boolean;
}

export function useEmail() {
  const [status, setStatus] = useState<EmailStatus>({ connected: false });
  const [inbox, setInbox] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Fetch email connection status
   */
  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get("/api/email/status");
      setStatus(response.data.data);
    } catch (err: any) {
      // Not connected is not an error
      setStatus({ connected: false });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Connect via IMAP — email + app password (no Azure AD needed)
   */
  const connectImap = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiClient.post("/api/email/connect", { email, password });
      await fetchStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to connect email");
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatus]);

  /**
   * Start OAuth flow — opens Microsoft login in a new window (requires Azure AD)
   */
  const connectOAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get("/api/email/auth-url");
      const { authUrl } = response.data.data;

      // Open OAuth in a popup window
      const popup = window.open(
        authUrl,
        "email-oauth",
        "width=600,height=700,scrollbars=yes,resizable=yes",
      );

      // Poll for popup close
      const pollTimer = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(pollTimer);
          // Refresh status after popup closes
          await fetchStatus();
          setIsLoading(false);
        }
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to start OAuth connection");
      setIsLoading(false);
    }
  }, [fetchStatus]);

  /**
   * Disconnect email
   */
  const disconnectEmail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await apiClient.delete("/api/email/disconnect");
      setStatus({ connected: false });
      setInbox([]);
      setSelectedMessage(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to disconnect email");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch inbox
   */
  const fetchInbox = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get(`/api/email/inbox?page=${page}&limit=15`);
      const data = response.data.data;

      if (page === 1) {
        setInbox(data.messages);
      } else {
        setInbox((prev) => [...prev, ...data.messages]);
      }
      setHasMore(data.hasMore);
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch inbox");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Read a specific email
   */
  const readMessage = useCallback(async (messageId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get(`/api/email/message/${messageId}`);
      setSelectedMessage(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to read message");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Import emails into RAG
   */
  const importToRAG = useCallback(async (messageIds: string[]) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.post("/api/email/import-to-rag", {
        messageIds,
      });
      return response.data.data;
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to import emails");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    status,
    inbox,
    selectedMessage,
    isLoading,
    error,
    hasMore,
    currentPage,
    fetchStatus,
    connectImap,
    connectOAuth,
    disconnectEmail,
    fetchInbox,
    readMessage,
    importToRAG,
    setSelectedMessage,
    setError,
  };
}
