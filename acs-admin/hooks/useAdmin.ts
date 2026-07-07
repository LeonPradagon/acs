import { useState, useCallback } from "react";
import apiClient from "@/lib/api-client";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  divisionId?: string | null;
  division?: { name: string } | null;
  clearanceLevel?: number;
  createdAt: string;
}

export interface AdminDocument {
  id: string;
  title: string;
  status: string;
  visibility: string;
  divisionId?: string | null;
  clearanceLevel?: number;
  createdAt: string;
  user?: { email: string; name: string };
  userId?: string | null;
  version?: number;
  deletedAt?: string | null;
  embeddingJobs?: { status: string; progress: number }[];
}

export interface SecurityLog {
  id: string;
  traceId: string;
  name: string;
  status: string;
  durationMs: number;
  error?: string | null;
  metadata?: any;
  createdAt: string;
}

export interface KnowledgeGraphData {
  nodes: { id: string; label: string; type: string; properties?: any }[];
  edges: { id: string; sourceId: string; targetId: string; relationship: string; weight: number }[];
}

export interface PromptVersion {
  id: string;
  name: string;
  version: number;
  content: string;
  isActive: boolean;
  createdAt: string;
}

export function useAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [prompts, setPrompts] = useState<PromptVersion[]>([]);
  const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraphData>({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get("/api/admin/users");
      if (data.success) setUsers(data.data);
      else setError(data.error);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUserRole = async (id: string, role: string) => {
    try {
      const { data } = await apiClient.put(`/api/admin/users/${id}/role`, { role });
      if (data.success) {
        setUsers(users.map((u) => (u.id === id ? { ...u, role } : u)));
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const updateUserSecurity = async (id: string, clearanceLevel: number, divisionId: string | null) => {
    try {
      const { data } = await apiClient.put(`/api/admin/users/${id}/security`, { clearanceLevel, divisionId });
      if (data.success) {
        setUsers(users.map((u) => (u.id === id ? { ...u, clearanceLevel, divisionId } : u)));
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { data } = await apiClient.delete(`/api/admin/users/${id}`);
      if (data.success) {
        setUsers(users.filter((u) => u.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get("/api/admin/documents");
      if (data.success) setDocuments(data.data);
      else setError(data.error);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteDocument = async (id: string) => {
    try {
      const { data } = await apiClient.delete(`/api/admin/documents/${id}`);
      if (data.success) {
        setDocuments(documents.map((d) => 
          d.id === id ? { ...d, deletedAt: d.deletedAt ? d.deletedAt : new Date().toISOString() } : d
        ));
        // If it was already deleted, it's permanently deleted so remove it
        if (data.message.includes("permanently")) {
          setDocuments(documents.filter((d) => d.id !== id));
        }
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const restoreDocument = async (id: string) => {
    try {
      const { data } = await apiClient.post(`/api/admin/documents/${id}/restore`);
      if (data.success) {
        setDocuments(documents.map((d) => 
          d.id === id ? { ...d, deletedAt: null } : d
        ));
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const [settings, setSettings] = useState<Record<string, string>>({});

  const fetchSecurityLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get("/api/admin/security-logs");
      if (data.success) setSecurityLogs(data.data);
      else setError(data.error);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchKnowledgeGraph = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get("/api/admin/knowledge-graph");
      if (data.success) setKnowledgeGraph(data.data);
      else setError(data.error);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSystemSettings = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/api/admin/settings");
      if (data.success) setSettings(data.data);
    } catch (err: any) {
      console.error("Failed to fetch settings", err);
    }
  }, []);

  const fetchPrompts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get("/api/admin/prompts");
      if (data.success) setPrompts(data.data);
      else setError(data.error);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const savePrompt = async (name: string, content: string) => {
    try {
      const { data } = await apiClient.post("/api/admin/prompts", { name, content });
      if (data.success) {
        setPrompts([data.data, ...prompts]);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const activatePrompt = async (id: string) => {
    try {
      const { data } = await apiClient.post(`/api/admin/prompts/${id}/activate`);
      if (data.success) {
        // Optimistic update
        const targetPrompt = prompts.find(p => p.id === id);
        if (targetPrompt) {
          setPrompts(prompts.map(p => ({
            ...p,
            isActive: p.name === targetPrompt.name ? (p.id === id) : p.isActive
          })));
        }
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const updateSystemSetting = async (key: string, value: string) => {
    try {
      const { data } = await apiClient.put("/api/admin/settings", { key, value });
      if (data.success) {
        setSettings((prev) => ({ ...prev, [key]: value }));
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const testConnection = async (mode: string, url: string, apiKey?: string) => {
    try {
      const { data } = await apiClient.post("/api/admin/settings/test-connection", { mode, url, apiKey });
      return data;
    } catch (err: any) {
      return err.response?.data || { success: false, error: err.message };
    }
  };

  return {
    users,
    documents,
    settings,
    isLoading,
    error,
    fetchUsers,
    updateUserRole,
    updateUserSecurity,
    deleteUser,
    fetchDocuments,
    deleteDocument,
    restoreDocument,
    fetchSecurityLogs,
    securityLogs,
    fetchKnowledgeGraph,
    knowledgeGraph,
    fetchPrompts,
    prompts,
    savePrompt,
    activatePrompt,
    fetchSystemSettings,
    updateSystemSetting,
    testConnection,
  };
}
