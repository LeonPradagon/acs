export interface AgentStep {
  agent: "retrieval" | "erp" | "email" | "knowledge" | "general" | "evaluator" | "response" | "web_search";
  action: string;
  priority: number;
  params?: Record<string, any>;
}

export interface ExecutionPlan {
  reasoning: string;
  steps: AgentStep[];
  needsMemory?: boolean;
}

export interface AgentContext {
  query: string;
  userId: string;
  divisionId?: string | null;
  role: string;
  clearanceLevel: number;
  conversationHistory: any[];
  sessionId?: string;
  plan?: ExecutionPlan;
  agentResults?: Record<string, AgentResult>;
}

export interface AgentResult {
  agentName: string;
  data: any;
  confidence: number;
  latencyMs: number;
  metadata?: Record<string, any>;
}
