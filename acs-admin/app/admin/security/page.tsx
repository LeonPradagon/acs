"use client";

import React, { useEffect, useState } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RefreshCw, ShieldAlert, ShieldCheck, EyeOff, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SecurityLogsPage() {
  const adminInfo = useAdmin();
  
  // Filtering state
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  useEffect(() => {
    adminInfo.fetchSecurityLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let displayLogs = adminInfo.securityLogs;
  if (searchTerm) {
    displayLogs = displayLogs.filter(log => 
      log.traceId.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  if (severityFilter !== "ALL") {
    if (severityFilter === "CRITICAL") {
      displayLogs = displayLogs.filter(log => log.name.includes("Injection"));
    } else if (severityFilter === "WARNING") {
      displayLogs = displayLogs.filter(log => log.name.includes("PII"));
    }
  }

  const injectionCount = adminInfo.securityLogs.filter(log => log.name === "Prompt Injection Detected").length;
  const piiCount = adminInfo.securityLogs.filter(log => log.name === "PII Masking Triggered").length;

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Security & Guardrails</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base max-w-2xl">
            Monitor AI guardrail interventions, blocked prompt injections, and PII masking events.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={adminInfo.fetchSecurityLogs}
          disabled={adminInfo.isLoading}
          className="shadow-sm rounded-xl h-10 px-4"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${adminInfo.isLoading ? "animate-spin" : ""}`}
          />
          Refresh Logs
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">Prompt Injections Blocked</CardTitle>
            <ShieldAlert className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-500">{injectionCount}</div>
            <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">Malicious queries intercepted</p>
          </CardContent>
        </Card>
        
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">PII Data Masked</CardTitle>
            <EyeOff className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-500">{piiCount}</div>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">Sensitive entities redacted</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 min-h-[400px] border border-white/10 shadow-sm rounded-2xl bg-black/40 backdrop-blur-md overflow-hidden flex flex-col relative">
        <div className="px-4 py-3 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-sm font-semibold text-white/90">Intervention Log ({displayLogs.length})</div>
          
          {/* Advanced Toolbar */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/40" />
              <Input 
                placeholder="Search Trace ID or Event..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-white/5 border-white/10 text-white text-xs placeholder:text-white/40 focus-visible:ring-indigo-500/50" 
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[130px] h-9 bg-white/5 border-white/10 text-white text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/10 text-white">
                <SelectItem value="ALL">All Events</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader className="bg-white/5 sticky top-0 z-10 backdrop-blur-md shadow-sm border-b border-white/10">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="font-bold text-[10px] text-white/50 uppercase tracking-wider py-3 w-[25%]">Event Type</TableHead>
                <TableHead className="font-bold text-[10px] text-white/50 uppercase tracking-wider">Trace ID</TableHead>
                <TableHead className="font-bold text-[10px] text-white/50 uppercase tracking-wider w-[40%]">Details</TableHead>
                <TableHead className="font-bold text-[10px] text-white/50 uppercase tracking-wider text-right pr-6">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminInfo.isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i} className="border-white/5 hover:bg-transparent">
                      <TableCell className="px-4 py-3"><Skeleton className="h-6 w-[180px] bg-white/10" /></TableCell>
                      <TableCell className="py-3"><Skeleton className="h-5 w-[80px] bg-white/10" /></TableCell>
                      <TableCell className="py-3"><Skeleton className="h-4 w-[250px] bg-white/10" /></TableCell>
                      <TableCell className="py-3 text-right"><Skeleton className="h-4 w-[120px] ml-auto bg-white/10" /></TableCell>
                    </TableRow>
                  ))}
                </>
              ) : displayLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-60 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-white/40">
                      <ShieldCheck className="w-12 h-12 text-emerald-500/50 mb-2" />
                      <span className="text-sm font-medium">No security interventions found.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {displayLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="group hover:bg-white/5 transition-colors border-white/5"
                    >
                      <TableCell className="font-medium text-xs py-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded shrink-0 border ${
                            log.name.includes("Injection") 
                              ? "bg-red-500/20 text-red-400 border-red-500/30" 
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          }`}>
                            {log.name.includes("Injection") ? <ShieldAlert className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </div>
                          <span className="font-semibold text-white/90">{log.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[10px] text-white/50 bg-black/40 border border-white/10 px-1.5 py-0.5 rounded">
                          {log.traceId.substring(0, 8)}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-[11px] text-white/60 truncate max-w-[400px]">
                          {log.error || (log.metadata ? JSON.stringify(log.metadata) : "No details")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6 py-2 text-xs text-white/50 font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
