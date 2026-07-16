"use client";

import React, { useState, useEffect } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Database, Globe, Key, Shield, CheckCircle, XCircle, Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ConnectionEntry {
  id: string;
  mode: "DB" | "API";
  url: string;
  createdAt: string;
  status: string;
}

export default function IntegrationsCMSPage() {
  const adminInfo = useAdmin();
  
  const [mode, setMode] = useState<"DB" | "API">("DB");
  const [dbUrl, setDbUrl] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [dbSchema, setDbSchema] = useState("");
  const [apiSchema, setApiSchema] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  
  const [connections, setConnections] = useState<ConnectionEntry[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    adminInfo.fetchSystemSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (adminInfo.settings) {
      // Parse history or fallback to the current one if it exists
      try {
        if (adminInfo.settings.ERP_CONNECTIONS_HISTORY) {
          setConnections(JSON.parse(adminInfo.settings.ERP_CONNECTIONS_HISTORY));
        } else if (adminInfo.settings.ERP_CONNECTION_MODE) {
          // Fallback initial connection
          const currentMode = adminInfo.settings.ERP_CONNECTION_MODE as "DB" | "API";
          const currentUrl = currentMode === "DB" 
            ? adminInfo.settings.ERP_DB_URL 
            : adminInfo.settings.ERP_API_BASE_URL;
          
          if (currentUrl) {
            setConnections([{
              id: Date.now().toString(),
              mode: currentMode,
              url: currentUrl,
              createdAt: new Date().toISOString(),
              status: "Active"
            }]);
          }
        }
      } catch (e) {
        console.error("Failed to parse connections history");
      }
      
      setMode((adminInfo.settings.ERP_CONNECTION_MODE as "DB" | "API") || "DB");
      setDbUrl(adminInfo.settings.ERP_DB_URL || "");
      setApiUrl(adminInfo.settings.ERP_API_BASE_URL || "");
      setApiKey(adminInfo.settings.ERP_API_KEY || "");
      setDbSchema(adminInfo.settings.ERP_DB_SCHEMA_DOC || "");
      setApiSchema(adminInfo.settings.ERP_API_SCHEMA_DOC || "");
    }
  }, [adminInfo.settings]);

  const handleTestConnection = async () => {
    const url = mode === "DB" ? dbUrl : apiUrl;
    if (!url) {
      setTestStatus("error");
      setTestMessage("URL is required");
      return;
    }
    setTestStatus("loading");
    setTestMessage("");

    const result = await adminInfo.testConnection(mode, url, apiKey);
    if (result.success) {
      setTestStatus("success");
      setTestMessage(result.message || "Connection successful");
    } else {
      setTestStatus("error");
      setTestMessage(result.error || "Connection failed");
    }
  };

  const handleSaveSettings = async () => {
    const currentUrl = mode === "DB" ? dbUrl : apiUrl;
    if (!currentUrl) {
      setTestStatus("error");
      setTestMessage("URL is required before saving.");
      return;
    }

    await adminInfo.updateSystemSetting("ERP_CONNECTION_MODE", mode);
    if (mode === "DB") {
      await adminInfo.updateSystemSetting("ERP_DB_URL", dbUrl);
      await adminInfo.updateSystemSetting("ERP_DB_SCHEMA_DOC", dbSchema);
    } else {
      await adminInfo.updateSystemSetting("ERP_API_BASE_URL", apiUrl);
      await adminInfo.updateSystemSetting("ERP_API_KEY", apiKey);
      await adminInfo.updateSystemSetting("ERP_API_SCHEMA_DOC", apiSchema);
    }
    
    // Update connections history
    let nextConnections;
    
    if (editingId) {
      // Find the old connection
      const oldConn = connections.find(c => c.id === editingId);
      const updatedConnection: ConnectionEntry = {
        ...(oldConn as ConnectionEntry),
        mode,
        url: currentUrl,
        status: "Active"
      };
      // Deactivate previous active connections
      nextConnections = connections.map(c => {
        if (c.id === editingId) return updatedConnection;
        return { ...c, status: c.status === "Active" ? "Success" : c.status };
      });
      // Move edited to top
      nextConnections = [updatedConnection, ...nextConnections.filter(c => c.id !== editingId)];
    } else {
      const newConnection: ConnectionEntry = {
        id: Date.now().toString(),
        mode,
        url: currentUrl,
        createdAt: new Date().toISOString(),
        status: "Active"
      };
  
      // Deactivate previous active connection
      const updatedConnections = connections.map(c => ({
        ...c,
        status: c.status === "Active" ? "Success" : c.status
      }));
      
      nextConnections = [newConnection, ...updatedConnections];
    }
    
    setConnections(nextConnections);
    await adminInfo.updateSystemSetting("ERP_CONNECTIONS_HISTORY", JSON.stringify(nextConnections));

    setTestStatus("idle");
    setTestMessage("Settings saved successfully.");
    setTimeout(() => {
      setTestMessage("");
      setIsDialogOpen(false);
      setEditingId(null);
    }, 1500);
  };

  const handleOpenAddConnection = () => {
    setEditingId(null);
    setMode("DB");
    setDbUrl("");
    setApiUrl("");
    setApiKey("");
    setDbSchema("");
    setApiSchema("");
    setTestStatus("idle");
    setTestMessage("");
    setIsDialogOpen(true);
  };

  const handleEditConnection = (conn: ConnectionEntry) => {
    setEditingId(conn.id);
    setMode(conn.mode);
    if (conn.mode === "DB") {
      setDbUrl(conn.url);
      // We don't have schema saved in history, but we can fetch it if it's the active one
      // For now, let it be populated if it's the active one via settings fallback
    } else {
      setApiUrl(conn.url);
    }
    setTestStatus("idle");
    setTestMessage("");
    setIsDialogOpen(true);
  };

  const handleDeleteConnection = async (id: string) => {
    const nextConnections = connections.filter(c => c.id !== id);
    setConnections(nextConnections);
    await adminInfo.updateSystemSetting("ERP_CONNECTIONS_HISTORY", JSON.stringify(nextConnections));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">System Integrations CMS</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base max-w-2xl">
            Configure secure connection strings and API credentials to allow the AI Assistant to fetch live enterprise data dynamically.
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAddConnection} className="rounded-xl font-semibold shadow-md bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-6 text-[13px] flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Connection
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:w-[90vw] lg:w-[85vw] max-w-7xl sm:max-w-7xl max-h-[90vh] overflow-y-auto p-4 md:p-6 lg:p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Add New Connection</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              {/* Left Panel: Mode Selection */}
              <div className="md:col-span-1 flex flex-col gap-4">
                <h3 className="font-semibold text-sm text-foreground/90 uppercase tracking-wider">Choose Connection</h3>
                
                <div 
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${mode === "DB" ? "border-indigo-500 bg-indigo-500/5 shadow-sm" : "border-border/50 hover:border-indigo-500/30 bg-card"}`}
                  onClick={() => setMode("DB")}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`p-2 rounded-lg ${mode === "DB" ? "bg-indigo-500 text-white shadow-sm" : "bg-muted text-muted-foreground"}`}>
                      <Database className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-[14px]">Direct Database</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed mt-2">Connect directly to a PostgreSQL database.</p>
                </div>

                <div 
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${mode === "API" ? "border-indigo-500 bg-indigo-500/5 shadow-sm" : "border-border/50 hover:border-indigo-500/30 bg-card"}`}
                  onClick={() => setMode("API")}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`p-2 rounded-lg ${mode === "API" ? "bg-indigo-500 text-white shadow-sm" : "bg-muted text-muted-foreground"}`}>
                      <Globe className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-[14px]">REST API</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed mt-2">Connect via standard HTTP API.</p>
                </div>
              </div>

              {/* Right Panel: Configuration Forms */}
              <div className="md:col-span-2">
                <div className="bg-card border border-border/80 shadow-sm rounded-2xl p-6">
                  
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <h3 className="text-xl font-bold tracking-tight">{mode === "DB" ? "Database Setup" : "API Endpoint Setup"}</h3>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <Shield className="w-3 h-3" />
                      Read-Only
                    </div>
                  </div>

                  {mode === "DB" ? (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">PostgreSQL Connection URL</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Database className="h-4 w-4 text-muted-foreground/60" />
                          </div>
                          <input 
                            type="text" 
                            placeholder="postgresql://user:password@host:port/database"
                            className="w-full bg-background/50 border border-border text-sm rounded-lg pl-10 pr-3 py-2.5 outline-none focus:ring-2 ring-indigo-500/50 transition-all font-mono"
                            value={dbUrl}
                            onChange={(e) => setDbUrl(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Database Schema Documentation</label>
                        <textarea 
                          placeholder="e.g. Table: employees (id, name, role), Table: salaries (id, amount)"
                          className="w-full bg-background/50 border border-border text-sm rounded-lg p-3 min-h-[100px] outline-none focus:ring-2 ring-indigo-500/50 transition-all font-mono custom-scrollbar"
                          value={dbSchema}
                          onChange={(e) => setDbSchema(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">REST API Base URL</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Globe className="h-4 w-4 text-muted-foreground/60" />
                          </div>
                          <input 
                            type="text" 
                            placeholder="https://api.perusahaan.com/v1"
                            className="w-full bg-background/50 border border-border text-sm rounded-lg pl-10 pr-3 py-2.5 outline-none focus:ring-2 ring-indigo-500/50 transition-all font-mono"
                            value={apiUrl}
                            onChange={(e) => setApiUrl(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">API Key / Auth Token (Optional)</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Key className="h-4 w-4 text-muted-foreground/60" />
                          </div>
                          <input 
                            type="password" 
                            placeholder="Bearer Token or API Key..."
                            className="w-full bg-background/50 border border-border text-sm rounded-lg pl-10 pr-3 py-2.5 outline-none focus:ring-2 ring-indigo-500/50 transition-all font-mono"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">API Documentation (Swagger / Markdown)</label>
                        <textarea 
                          placeholder="e.g. GET /api/v1/employees?status=ACTIVE"
                          className="w-full bg-background/50 border border-border text-sm rounded-lg p-3 min-h-[100px] outline-none focus:ring-2 ring-indigo-500/50 transition-all font-mono custom-scrollbar"
                          value={apiSchema}
                          onChange={(e) => setApiSchema(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Status Alert */}
                  {testMessage && (
                    <div className={`mt-6 p-3 rounded-lg border flex items-start gap-2.5 animate-in fade-in zoom-in-95 ${
                      testStatus === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                      testStatus === "error" ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400" :
                      "bg-muted border-border text-foreground"
                    }`}>
                      {testStatus === "success" && <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                      {testStatus === "error" && <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                      {testStatus === "idle" && <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />}
                      <span className="text-[12px] font-medium leading-relaxed">{testMessage}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-border/50">
                    <Button 
                      variant="outline" 
                      onClick={handleTestConnection}
                      disabled={testStatus === "loading"}
                      className="rounded-lg font-semibold shadow-sm h-10 px-5 text-[12px]"
                    >
                      {testStatus === "loading" ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Testing...</>
                      ) : "Test Connection"}
                    </Button>
                    <Button 
                      onClick={handleSaveSettings}
                      disabled={testStatus !== "success" && testStatus !== "idle"}
                      className="rounded-lg font-semibold shadow-md bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-5 text-[12px]"
                    >
                      Save Configuration
                    </Button>
                  </div>

                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Connections Table */}
      <div className="flex-1 min-h-0 bg-card border border-border/80 shadow-sm rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border/50 bg-muted/20">
          <h3 className="font-semibold text-sm">Connection History</h3>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar p-0">
          {connections.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
              <Database className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">No connections configured yet.</p>
              <p className="text-xs mt-1">Click &quot;Add Connection&quot; to set up your first integration.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[120px]">Mode</TableHead>
                  <TableHead>URL / Endpoint</TableHead>
                  <TableHead className="w-[180px]">Date Configured</TableHead>
                  <TableHead className="w-[100px] text-center">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((conn) => (
                  <TableRow key={conn.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {conn.mode === "DB" ? (
                          <Database className="w-4 h-4 text-indigo-500" />
                        ) : (
                          <Globe className="w-4 h-4 text-emerald-500" />
                        )}
                        {conn.mode === "DB" ? "Database" : "REST API"}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[300px]" title={conn.url}>
                      {conn.url}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(conn.createdAt).toLocaleDateString()} {new Date(conn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-center">
                      {conn.status === "Active" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Success
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50"
                          onClick={() => handleEditConnection(conn)}
                          title="Edit Connection"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteConnection(conn.id)}
                          title="Delete Connection"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

