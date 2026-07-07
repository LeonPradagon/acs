"use client";

import React, { useState, useEffect } from "react";
import {
  Brain,
  Database,
  FileText,
  Zap,
  Settings,
  Network,
  Globe,
  Lock,
  Code,
  Cpu,
  RefreshCw,
  Users,
  MessageSquare,
  Activity,
  Clock,
  BarChart3,
} from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import apiClient from "@/lib/api-client";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";

const SemanticGraph = dynamic(
  () => import("@/components/admin/semantic-graph"),
  { ssr: false },
);

// Dynamic Icons mapping
const iconMap: Record<string, React.ElementType> = {
  Database,
  FileText,
  Globe,
  Code,
  Zap,
  Network,
};

// Network Node Topology Config
const NODES = [
  {
    id: "core",
    label: "ACS Core AI",
    x: 50,
    y: 50,
    icon: Brain,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/50",
    glow: "shadow-[0_0_30px_rgba(99,102,241,0.5)]",
  },
  {
    id: "erp",
    label: "ERP Database",
    x: 20,
    y: 25,
    icon: Database,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/50",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]",
  },
  {
    id: "docs",
    label: "Knowledge Base",
    x: 80,
    y: 25,
    icon: FileText,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/50",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.3)]",
  },
  {
    id: "api",
    label: "External API",
    x: 80,
    y: 75,
    icon: Globe,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/50",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.3)]",
  },
  {
    id: "code",
    label: "Code Sandbox",
    x: 20,
    y: 75,
    icon: Code,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/50",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.3)]",
  },
];

const EDGES = [
  { source: "core", target: "erp", color: "text-blue-500" },
  { source: "core", target: "docs", color: "text-emerald-500" },
  { source: "core", target: "api", color: "text-amber-500" },
  { source: "core", target: "code", color: "text-purple-500" },
];

const NetworkGraph = () => {
  return (
    <div className="relative w-full h-[400px] md:h-[500px] bg-black/50 rounded-2xl overflow-hidden border border-border/50 backdrop-blur-md flex items-center justify-center p-4">
      {/* Dynamic Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-background/80 to-background z-0"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] z-0"></div>

      {/* Container for SVG and Nodes */}
      <div className="relative w-full h-full max-w-[800px] z-10">
        {/* Core Node Pulse Background */}
        <motion.div
          className="absolute left-[50%] top-[50%] transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-40 md:h-40 bg-indigo-500/20 rounded-full blur-xl"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.1, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* SVG Lines */}
        <svg className="absolute inset-0 w-full h-full overflow-visible">
          {EDGES.map((edge, i) => {
            const sourceNode = NODES.find((n) => n.id === edge.source);
            const targetNode = NODES.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            return (
              <g key={`edge-${i}`}>
                <line
                  x1={`${sourceNode.x}%`}
                  y1={`${sourceNode.y}%`}
                  x2={`${targetNode.x}%`}
                  y2={`${targetNode.y}%`}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-border/40"
                  strokeDasharray="4 4"
                />

                {/* Data Flow Particle 1 */}
                <motion.circle
                  r="3.5"
                  className={`fill-current ${edge.color} drop-shadow-[0_0_8px_currentColor]`}
                  initial={{
                    cx: `${sourceNode.x}%`,
                    cy: `${sourceNode.y}%`,
                    opacity: 0,
                  }}
                  animate={{
                    cx: [`${sourceNode.x}%`, `${targetNode.x}%`],
                    cy: [`${sourceNode.y}%`, `${targetNode.y}%`],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 1.5,
                    repeat: Infinity,
                    ease: "linear",
                    delay: Math.random(),
                  }}
                />

                {/* Data Flow Particle 2 (Return Pulse) */}
                <motion.circle
                  r="2.5"
                  className="fill-white/80 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]"
                  initial={{
                    cx: `${targetNode.x}%`,
                    cy: `${targetNode.y}%`,
                    opacity: 0,
                  }}
                  animate={{
                    cx: [`${targetNode.x}%`, `${sourceNode.x}%`],
                    cy: [`${targetNode.y}%`, `${sourceNode.y}%`],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: 2.5 + Math.random() * 2,
                    repeat: Infinity,
                    ease: "linear",
                    delay: Math.random() * 1.5,
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {NODES.map((node) => {
          const isCore = node.id === "core";
          return (
            <motion.div
              key={node.id}
              className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              whileHover={{ scale: 1.15 }}
            >
              <div
                className={`
                ${isCore ? "w-20 h-20 md:w-24 md:h-24" : "w-14 h-14 md:w-16 md:h-16"} 
                rounded-2xl flex items-center justify-center border backdrop-blur-xl 
                ${node.bg} ${node.border} ${node.glow} relative group
              `}
              >
                <node.icon
                  className={`
                  ${isCore ? "w-10 h-10 md:w-12 md:h-12" : "w-6 h-6 md:w-8 md:h-8"} 
                  ${node.color} transition-colors duration-300
                `}
                />

                {/* Active Indicator Ring */}
                <div
                  className={`absolute inset-0 rounded-2xl border-2 ${node.border} opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-all duration-300`}
                ></div>
              </div>
              <div className="mt-3 text-xs md:text-sm font-semibold bg-black/60 px-3 py-1.5 rounded-lg border border-border/50 shadow-xl backdrop-blur-md whitespace-nowrap text-foreground/90">
                {node.label}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default function AIBrainPage() {
  const [brainStatus, setBrainStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const config = brainStatus?.config || {
    model: "gpt-oss-120b",
    provider: "Open Source Server",
    temperature: 0.7,
    maxTokens: 8000,
    contextWindow: "128k",
  };
  const tools = brainStatus?.tools || [];
  const systemPrompt = brainStatus?.systemPrompt || "Loading system directive...";
  const stats = brainStatus?.stats;
  const sessionFeed = brainStatus?.sessionFeed || [];

  const fetchStatus = async () => {
    try {
      const { data } = await apiClient.get("/api/admin/ai-brain-status");
      if (data.success) {
        setBrainStatus(data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Failed to fetch AI Brain Status", err);
    } finally {
      setIsLoading(false);
    }
  };

  const adminInfo = useAdmin();

  useEffect(() => {
    fetchStatus();
    adminInfo.fetchKnowledgeGraph();
    const intervalId = setInterval(fetchStatus, 2500);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeAgo = lastUpdated
    ? `${Math.round((Date.now() - lastUpdated.getTime()) / 1000)}s ago`
    : "—";

  // KPI cards config
  const kpiCards = [
    { label: "Indexed Docs", value: stats?.totalDocs ?? "—", icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "Active Users", value: stats?.totalUsers ?? "—", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { label: "Recent Sessions", value: stats?.activeSessions ?? "—", icon: MessageSquare, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    { label: "Avg. Latency", value: stats ? `${stats.avgLatency}ms` : "—", icon: Activity, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            AI Core Intelligence
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Real-time telemetry of the ACS LLM Engine. Monitor active network connections, tool latencies, and base cognitive directives.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchStatus} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-background/60 px-3 py-1.5 rounded-lg border border-border/40">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/60 px-3 py-1.5 rounded-lg border border-border/40">
            <Clock className="w-3.5 h-3.5" />
            {timeAgo}
          </div>
          {isLoading && (
            <Badge variant="secondary" className="animate-pulse">Connecting...</Badge>
          )}
          <Badge variant="outline" className="w-fit bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-4 py-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            System Live
          </Badge>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`bg-card/20 backdrop-blur-xl shadow-lg border ${kpi.border}`}>
              <CardContent className="flex items-center gap-4 py-4 px-5">
                <div className={`p-3 rounded-xl ${kpi.bg}`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Token Usage Bar */}
      {stats?.tokenUsage && (
        <Card className="bg-card/20 border-border/40 backdrop-blur-xl shadow-lg">
          <CardContent className="flex flex-col md:flex-row items-center gap-4 py-4 px-6">
            <div className="flex items-center gap-3 shrink-0">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-semibold">Context Window Usage</span>
            </div>
            <div className="flex-1 w-full">
              <div className="w-full h-3 bg-background/60 rounded-full overflow-hidden border border-border/30">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.tokenUsage.percent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
            <span className="text-sm text-muted-foreground font-mono shrink-0">
              {(stats.tokenUsage.used / 1000).toFixed(1)}k / {(stats.tokenUsage.max / 1000).toFixed(0)}k tokens ({stats.tokenUsage.percent}%)
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visualization Area */}
        <Card className="col-span-1 lg:col-span-2 bg-card/20 border-border/40 backdrop-blur-xl shadow-2xl overflow-hidden">
          <CardHeader className="border-b border-border/20 bg-background/40">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Network className="w-5 h-5 text-indigo-400" />
              Live Neural Topology
            </CardTitle>
            <CardDescription>
              Dynamic mapping of data streams and integrated sub-systems.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <NetworkGraph />
          </CardContent>
        </Card>

        {/* Configuration Column */}
        <div className="space-y-6">
          <Card className="bg-card/20 border-border/40 backdrop-blur-xl shadow-xl">
            <CardHeader className="pb-3 border-b border-border/20 bg-background/40">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Active Model Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-2 gap-y-5 gap-x-4 text-sm">
                <div className="bg-background/40 p-2.5 rounded-lg border border-border/30">
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-1 font-bold">
                    Model ID
                  </p>
                  <p className="font-semibold text-foreground text-[13px]">
                    {config.model}
                  </p>
                </div>
                <div className="bg-background/40 p-2.5 rounded-lg border border-border/30">
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-1 font-bold">
                    Provider
                  </p>
                  <p className="font-semibold text-foreground text-[13px]">
                    {config.provider}
                  </p>
                </div>
                <div className="bg-background/40 p-2.5 rounded-lg border border-border/30">
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-1 font-bold">
                    Context Window
                  </p>
                  <p className="font-semibold text-foreground text-[13px]">
                    {config.contextWindow}
                  </p>
                </div>
                <div className="bg-background/40 p-2.5 rounded-lg border border-border/30">
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-1 font-bold">
                    Temperature
                  </p>
                  <p className="font-semibold text-foreground text-[13px]">
                    {config.temperature}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/20 border-border/40 backdrop-blur-xl shadow-xl">
            <CardHeader className="pb-3 border-b border-border/20 bg-background/40 flex flex-row items-center justify-between">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Live Tool Telemetry
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="space-y-3">
                {tools.length === 0 && isLoading && (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    Fetching telemetry...
                  </div>
                )}
                {tools.map((tool: any, i: number) => {
                  const IconComp = iconMap[tool.iconType] || Database;
                  const isConnected = tool.status === "Connected";
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-background/50 border border-border/30 hover:bg-background/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-card border border-border/50 shadow-sm">
                          <IconComp className="w-4 h-4 text-foreground/80" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-semibold">
                            {tool.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {tool.latency} latency
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          isConnected
                            ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                            : "text-amber-500 border-amber-500/30 bg-amber-500/10"
                        }
                      >
                        {tool.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Prompt Area */}
        <Card className="col-span-1 lg:col-span-3 bg-card/20 border-border/40 backdrop-blur-xl shadow-xl">
          <CardHeader className="border-b border-border/20 bg-background/40 flex flex-row items-center justify-between py-5">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="w-5 h-5 text-purple-400" />
                Core Cognitive Directive
              </CardTitle>
              <CardDescription className="mt-1">
                The foundational prompt guiding the AI&apos;s behavior and
                operational constraints.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 bg-background/60 px-3 py-1.5 rounded-lg border border-border/40 shadow-sm">
              <Lock className="w-4 h-4 text-rose-400" />
              <span className="text-xs text-foreground/80 font-bold uppercase tracking-wider">
                Restricted Access
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-purple-500 to-indigo-500 rounded-l-md opacity-80"></div>
              <pre className="p-5 pl-8 bg-black/60 rounded-xl border border-border/40 overflow-x-auto text-sm text-foreground/90 font-mono whitespace-pre-wrap leading-relaxed shadow-inner group-hover:border-purple-500/30 transition-colors">
                {systemPrompt}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Live Session Feed + Knowledge Base side by side */}
        <Card className="col-span-1 lg:col-span-2 bg-card/20 border-border/40 backdrop-blur-xl shadow-xl">
          <CardHeader className="border-b border-border/20 bg-background/40 flex flex-row items-center justify-between py-5">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-emerald-400" />
                Active Knowledge Base Memory
              </CardTitle>
              <CardDescription className="mt-1">Documents fully indexed and accessible to the AI.</CardDescription>
            </div>
            <Badge variant="outline" className="bg-background/60 border-border/40">
              {brainStatus?.knowledgeBase?.length || 0} Items
            </Badge>
          </CardHeader>
          <CardContent className="p-0 max-h-[350px] overflow-y-auto">
            <div className="divide-y divide-border/20">
              {!brainStatus?.knowledgeBase || brainStatus.knowledgeBase.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {isLoading ? "Loading..." : "No documents indexed."}
                </div>
              ) : (
                brainStatus.knowledgeBase.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3.5 hover:bg-background/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground/90 truncate max-w-[200px]">{doc.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            {doc.visibility}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 text-[10px]">
                      {doc.status === "processing" ? "Indexing..." : "Active"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Session Feed */}
        <Card className="col-span-1 bg-card/20 border-border/40 backdrop-blur-xl shadow-xl">
          <CardHeader className="border-b border-border/20 bg-background/40 py-5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              Live Session Feed
            </CardTitle>
            <CardDescription className="mt-1">Recent user interactions with the AI agent.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 max-h-[350px] overflow-y-auto">
            <div className="divide-y divide-border/20">
              {sessionFeed.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {isLoading ? "Loading sessions..." : "No recent sessions."}
                </div>
              ) : (
                sessionFeed.map((s: any) => (
                  <div key={s.id} className="p-3.5 hover:bg-background/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground/90 truncate max-w-[180px]">{s.title}</h4>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {s.messageCount} msgs
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {s.user}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(s.updatedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Interactive Semantic Graph */}
        <Card className="col-span-1 lg:col-span-3 bg-card/20 border-border/40 backdrop-blur-xl shadow-xl overflow-hidden">
          <CardHeader className="border-b border-border/20 bg-background/40 flex flex-row items-center justify-between py-5">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Network className="w-5 h-5 text-fuchsia-400" />
                Interactive Semantic Knowledge Graph
              </CardTitle>
              <CardDescription className="mt-1">
                Drag nodes to explore connections. Scroll to zoom.
              </CardDescription>
            </div>
            {/* Graph Legend */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500"></span><span className="text-[10px] text-muted-foreground">Core</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span><span className="text-[10px] text-muted-foreground">Document</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span><span className="text-[10px] text-muted-foreground">Concept</span></div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {adminInfo.knowledgeGraph.nodes.length > 0 ? (
              <SemanticGraph data={{
                nodes: adminInfo.knowledgeGraph.nodes.map(n => ({
                  id: n.id,
                  name: n.label,
                  group: n.type,
                  val: 5 + (n.properties?.weight || 0) * 5
                })),
                links: adminInfo.knowledgeGraph.edges.map(e => ({
                  source: e.sourceId,
                  target: e.targetId
                }))
              }} />
            ) : (
              <div className="w-full h-[400px] flex flex-col items-center justify-center text-muted-foreground bg-black/40">
                {adminInfo.isLoading ? "Initializing Physics Engine..." : "No semantic data available."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
