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
}

export function useAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
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
        setDocuments(documents.filter((d) => d.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const [settings, setSettings] = useState<Record<string, string>>({});

  const fetchSystemSettings = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/api/admin/settings");
      if (data.success) setSettings(data.data);
    } catch (err: any) {
      console.error("Failed to fetch settings", err);
    }
  }, []);

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
    fetchSystemSettings,
    updateSystemSetting,
    testConnection,
  };
}
