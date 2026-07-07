import React, { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Network, Search, Database, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentStep {
  agent: string;
  action: string;
  status: "pending" | "done" | "error";
}

interface AgentProgressProps {
  steps: AgentStep[];
}

export const AgentProgressViewer = ({ steps }: AgentProgressProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!steps || steps.length === 0) return null;

  const getAgentIcon = (agent: string) => {
    const lower = agent.toLowerCase();
    if (lower.includes("planner")) return <Network className="w-3.5 h-3.5" />;
    if (lower.includes("erp") || lower.includes("database")) return <Database className="w-3.5 h-3.5" />;
    if (lower.includes("retriever") || lower.includes("search")) return <Search className="w-3.5 h-3.5" />;
    return <CheckCircle2 className="w-3.5 h-3.5" />;
  };

  const getStatusIcon = (status: string) => {
    if (status === "pending") return <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />;
    if (status === "done") return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    return <CheckCircle2 className="w-3.5 h-3.5 text-red-500" />;
  };

  return (
    <div className="mb-3 border border-border/50 rounded-xl overflow-hidden bg-background/50 shadow-sm">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-medium">
          <Network className="w-4 h-4 text-primary" />
          <span>Agent Workflow ({steps.length} steps)</span>
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      
      {isExpanded && (
        <div className="p-3 space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="mt-0.5 relative">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  {getAgentIcon(step.agent)}
                </div>
                {idx !== steps.length - 1 && (
                  <div className="absolute top-6 left-3 w-px h-full -ml-[0.5px] bg-border/50" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground/80">{step.agent}</span>
                  {getStatusIcon(step.status)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{step.action}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
