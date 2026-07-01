"use client";

import React, { useState, useEffect } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Database, Globe, Key, Shield, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function IntegrationsCMSPage() {
  const adminInfo = useAdmin();
  
  const [mode, setMode] = useState<"DB" | "API">("DB");
  const [dbUrl, setDbUrl] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    adminInfo.fetchSystemSettings();
  }, []);

  useEffect(() => {
    if (adminInfo.settings) {
      setMode((adminInfo.settings.ERP_CONNECTION_MODE as "DB" | "API") || "DB");
      setDbUrl(adminInfo.settings.ERP_DB_URL || "");
      setApiUrl(adminInfo.settings.ERP_API_BASE_URL || "");
      setApiKey(adminInfo.settings.ERP_API_KEY || "");
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
    await adminInfo.updateSystemSetting("ERP_CONNECTION_MODE", mode);
    if (mode === "DB") {
      await adminInfo.updateSystemSetting("ERP_DB_URL", dbUrl);
    } else {
      await adminInfo.updateSystemSetting("ERP_API_BASE_URL", apiUrl);
      await adminInfo.updateSystemSetting("ERP_API_KEY", apiKey);
    }
    setTestStatus("idle");
    setTestMessage("Settings saved successfully.");
    setTimeout(() => setTestMessage(""), 3000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex flex-col shrink-0">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">System Integrations CMS</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base max-w-2xl">
          Configure secure connection strings and API credentials to allow the AI Assistant to fetch live enterprise data dynamically.
        </p>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
          
          {/* Left Panel: Mode Selection */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <h3 className="font-semibold text-lg text-foreground/90">Connection Mode</h3>
            
            <div 
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${mode === "DB" ? "border-indigo-500 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.1)]" : "border-border/50 hover:border-indigo-500/30 bg-card"}`}
              onClick={() => setMode("DB")}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-xl ${mode === "DB" ? "bg-indigo-500 text-white shadow-sm" : "bg-muted text-muted-foreground"}`}>
                  <Database className="w-4 h-4" />
                </div>
                <span className="font-bold text-[15px]">Direct Database</span>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed mt-3">Connect directly to a PostgreSQL database. Recommended for highest performance and complex analytical RAG queries.</p>
            </div>

            <div 
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${mode === "API" ? "border-indigo-500 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.1)]" : "border-border/50 hover:border-indigo-500/30 bg-card"}`}
              onClick={() => setMode("API")}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-xl ${mode === "API" ? "bg-indigo-500 text-white shadow-sm" : "bg-muted text-muted-foreground"}`}>
                  <Globe className="w-4 h-4" />
                </div>
                <span className="font-bold text-[15px]">REST API</span>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed mt-3">Connect via standard HTTP API. Recommended for strict enterprise boundaries and internal microservice validations.</p>
            </div>
          </div>

          {/* Right Panel: Configuration Forms */}
          <div className="md:col-span-2">
            <div className="bg-card border border-border/80 shadow-xl shadow-black/5 dark:shadow-white/5 rounded-3xl p-6 md:p-8">
              
              <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-2xl font-bold tracking-tight">{mode === "DB" ? "Database Setup" : "API Endpoint Setup"}</h3>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <Shield className="w-3.5 h-3.5" />
                  Read-Only Enforced
                </div>
              </div>

              {mode === "DB" ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">PostgreSQL Connection URL</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Database className="h-4 w-4 text-muted-foreground/60" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="postgresql://user:password@host:port/database"
                        className="w-full bg-background/50 border border-border text-sm rounded-xl pl-11 pr-4 py-3.5 outline-none focus:ring-2 ring-indigo-500/50 transition-all font-mono"
                        value={dbUrl}
                        onChange={(e) => setDbUrl(e.target.value)}
                      />
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-2 ml-1">Leave empty to use the built-in mock database for sandbox testing.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">REST API Base URL</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Globe className="h-4 w-4 text-muted-foreground/60" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="https://api.perusahaan.com/v1"
                        className="w-full bg-background/50 border border-border text-sm rounded-xl pl-11 pr-4 py-3.5 outline-none focus:ring-2 ring-indigo-500/50 transition-all font-mono"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">API Key / Auth Token (Optional)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Key className="h-4 w-4 text-muted-foreground/60" />
                      </div>
                      <input 
                        type="password" 
                        placeholder="Bearer Token or API Key..."
                        className="w-full bg-background/50 border border-border text-sm rounded-xl pl-11 pr-4 py-3.5 outline-none focus:ring-2 ring-indigo-500/50 transition-all font-mono"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Status Alert */}
              {testMessage && (
                <div className={`mt-8 p-4 rounded-xl border flex items-start gap-3 animate-in fade-in zoom-in-95 ${
                  testStatus === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                  testStatus === "error" ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400" :
                  "bg-muted border-border text-foreground"
                }`}>
                  {testStatus === "success" && <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />}
                  {testStatus === "error" && <XCircle className="w-5 h-5 mt-0.5 shrink-0" />}
                  {testStatus === "idle" && <CheckCircle className="w-5 h-5 mt-0.5 shrink-0 text-muted-foreground" />}
                  <span className="text-[13px] font-medium leading-relaxed">{testMessage}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-10 pt-6 border-t border-border/50">
                <Button 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={testStatus === "loading"}
                  className="rounded-xl font-semibold shadow-sm h-11 px-6 text-[13px]"
                >
                  {testStatus === "loading" ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</>
                  ) : "Test Connection"}
                </Button>
                <Button 
                  onClick={handleSaveSettings}
                  className="rounded-xl font-semibold shadow-md bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-6 text-[13px]"
                >
                  Save Configuration
                </Button>
              </div>

            </div>
          </div>

      </div>
    </div>
  );
}
