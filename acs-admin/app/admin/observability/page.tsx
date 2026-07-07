"use client";

import React, { useEffect, useState } from "react";
import { Activity, Clock, ShieldAlert, CheckCircle, XCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import apiClient from "@/lib/api-client";

export default function ObservabilityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/api/admin/trace-logs");
      if (res.data.success) {
        setLogs(res.data.data);
      } else {
        setError(res.data.error || "Failed to fetch trace logs");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // Auto refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Activity className="w-8 h-8 text-indigo-500" />
          Observability Traces
        </h1>
        <p className="text-muted-foreground text-sm">
          Live view of AI Agent pipeline traces, execution times, and errors.
        </p>
      </div>

      <Card className="border-white/10 bg-black/20 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-lg">Recent Traces</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              Loading traces...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 text-red-500 rounded-lg">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="p-4 rounded-lg border border-white/10 bg-white/5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {log.status === "SUCCESS" ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-semibold text-sm">{log.name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {log.durationMs}ms
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Trace: {log.traceId}
                    </div>
                    {log.error && (
                      <div className="text-xs text-red-400 mt-1 bg-red-500/10 p-2 rounded">
                        {log.error}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {logs.length === 0 && !loading && (
                <div className="text-center p-8 text-muted-foreground">
                  No trace logs found.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
