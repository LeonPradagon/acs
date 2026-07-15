import { StateGraph, END } from "@langchain/langgraph";
import { AgentContext } from "../agents/types";
import { PlannerAgent } from "../agents/planner.agent";
import { RetrievalAgent } from "../agents/retrieval.agent";
import { ErpAgent } from "../agents/erp.agent";
import { EmailAgent } from "../agents/email.agent";
import { KnowledgeAgent } from "../agents/knowledge.agent";
import { WebSearchAgent } from "../agents/web-search.agent";
import { ResponseAgent } from "../agents/response.agent";
import { GuardrailsService } from "../services/guardrails.service";
import { MemoryService } from "../services/memory.service";
import { TracingService, TraceContext } from "../services/tracing.service";
import { EvaluatorAgent } from "../agents/evaluator.agent";
import { ReflectionAgent, EvalResult } from "../agents/reflection.agent";

export interface WorkflowState {
  context: AgentContext;
  onToken?: (token: string) => void;
  error?: string;
  isStream?: boolean;
  reflectionAttempts?: number;
  memoryContext?: string;
  traceContext?: TraceContext;
}

const channels = {
  context: {
    value: (x: AgentContext, y: AgentContext) => ({ ...x, ...y, agentResults: { ...x.agentResults, ...y.agentResults } }),
    default: () => ({}) as AgentContext,
  },
  onToken: {
    value: (x: any, y: any) => y || x,
    default: () => undefined,
  },
  error: {
    value: (x: string | undefined, y: string | undefined) => y || x,
    default: () => undefined,
  },
  isStream: {
    value: (x: boolean | undefined, y: boolean | undefined) => y !== undefined ? y : x,
    default: () => true,
  },
  reflectionAttempts: {
    value: (x: number | undefined, y: number | undefined) => y !== undefined ? y : x,
    default: () => 0,
  },
  memoryContext: {
    value: (x: string | undefined, y: string | undefined) => y !== undefined ? y : x,
    default: () => undefined,
  },
  traceContext: {
    value: (x: TraceContext | undefined, y: TraceContext | undefined) => y || x,
    default: () => undefined,
  }
};

export class ChatWorkflow {
  private graph;

  constructor() {
    const builder = new StateGraph<WorkflowState>({ channels: channels as any });

    // 1. Guardrails Node
    builder.addNode("guardrails", async (state: WorkflowState) => {
      return await TracingService.traceAsync(state.traceContext, "guardrails", async () => {
        const guard = GuardrailsService.validateInput(state.context.query);
        if (!guard.isValid) {
          if (state.onToken) state.onToken(guard.reason || "Invalid input");
          return { error: guard.reason };
        }
        return {};
      });
    });

    // 1.5 Enrich Memory Node
    builder.addNode("enrich_memory", async (state: WorkflowState) => {
      if (state.error || !state.context.sessionId) return {};
      return await TracingService.traceAsync(state.traceContext, "enrich_memory", async () => {
        const memoryContext = await MemoryService.getLongTermMemoryContext(state.context.sessionId!, state.context.userId);
        if (memoryContext) {
          const updatedQuery = `[LONG-TERM MEMORY]\n${memoryContext}\n\n[USER QUERY]\n${state.context.query}`;
          return { memoryContext, context: { ...state.context, query: updatedQuery } };
        }
        return {};
      });
    });

    // 2. Planner Node
    builder.addNode("planner", async (state: WorkflowState) => {
      if (state.error) return {};
      return await TracingService.traceAsync(state.traceContext, "planner", async () => {
        const plan = await PlannerAgent.plan(state.context);
        return { context: { ...state.context, plan, agentResults: state.context.agentResults || {} } };
      });
    });

    // 3. Execution Node (Runs agents from the plan)
    builder.addNode("execute", async (state: WorkflowState) => {
      if (state.error || !state.context.plan) return {};
      
      return await TracingService.traceAsync(state.traceContext, "execute_agents", async () => {
        const results: Record<string, any> = {};
        const promises = [];

        for (const step of state.context.plan!.steps) {
          if (step.agent === "retrieval") {
            promises.push(RetrievalAgent.execute(state.context).then(res => results["retrieval"] = res));
          } else if (step.agent === "erp") {
            promises.push(ErpAgent.execute(state.context).then(res => results["erp"] = res));
          } else if (step.agent === "email") {
            promises.push(EmailAgent.execute(state.context).then(res => results["email"] = res));
          } else if (step.agent === "knowledge") {
            promises.push(KnowledgeAgent.execute(state.context).then(res => results["knowledge"] = res));
          } else if (step.agent === "web_search") {
            promises.push(WebSearchAgent.execute(state.context).then(res => results["web_search"] = res));
          }
        }

        await Promise.all(promises);
        return { context: { ...state.context, agentResults: { ...state.context.agentResults, ...results } } };
      });
    });

    // 4. Response Node
    builder.addNode("response", async (state: WorkflowState) => {
      if (state.error) return {};
      
      return await TracingService.traceAsync(state.traceContext, "response_generation", async () => {
        const onToken = state.onToken || (() => {});
        const res = await ResponseAgent.executeStream(state.context, onToken);
        return { context: { ...state.context, agentResults: { ...state.context.agentResults, response: res } } };
      });
    });

    // 5. Evaluate Node
    builder.addNode("evaluate", async (state: WorkflowState) => {
      if (state.error || !state.context.agentResults?.response) return {};
      
      return await TracingService.traceAsync(state.traceContext, "evaluate", async () => {
        const responseText = state.context.agentResults!.response.data;
        const contextUsed = state.context.agentResults!.retrieval?.data || [];
        
        const evalResult = await EvaluatorAgent.evaluate(state.context.query, responseText, contextUsed);
        return { context: { ...state.context, agentResults: { ...state.context.agentResults, evaluation: evalResult } } };
      });
    });

    // 6. Reflection Node
    builder.addNode("reflect", async (state: WorkflowState) => {
      if (state.error || !state.context.agentResults?.evaluation) return {};
      
      return await TracingService.traceAsync(state.traceContext, "reflect", async () => {
        const responseText = state.context.agentResults!.response?.data;
        const evalData = state.context.agentResults!.evaluation.data as EvalResult;
        
        const reflectionInstruction = await ReflectionAgent.reflect(state.context.query, responseText, evalData);
        
        // Inject the instruction into the context query for the response agent to use on the next run
        const updatedContext = {
          ...state.context,
          query: state.context.query + "\n\n[REVISION INSTRUCTION]\n" + reflectionInstruction
        };
        
        const attempts = (state.reflectionAttempts || 0) + 1;
        return { context: updatedContext, reflectionAttempts: attempts };
      });
    });

    // 7. Output Guardrails Node
    builder.addNode("output_guardrails", async (state: WorkflowState) => {
      if (state.error || !state.context.agentResults?.response) return {};
      
      return await TracingService.traceAsync(state.traceContext, "output_guardrails", async () => {
        const responseText = state.context.agentResults!.response.data;
        const guard = GuardrailsService.validateAndSanitizeOutput(responseText);
        
        // Update response text with sanitized text
        const updatedResponse = { ...state.context.agentResults!.response, data: guard.sanitizedText };
        return { context: { ...state.context, agentResults: { ...state.context.agentResults, response: updatedResponse } } };
      });
    });

    // 8. Save Memory Node
    builder.addNode("save_memory", async (state: WorkflowState) => {
      if (state.error || !state.context.agentResults?.response || !state.context.sessionId) return {};
      
      return await TracingService.traceAsync(state.traceContext, "save_memory", async () => {
        const responseText = state.context.agentResults!.response.data;
        // Fire and forget memory operations
        MemoryService.extractAndStoreEntities(state.context.userId, state.context.query + "\n" + responseText);
        
        return {};
      });
    });

    // Edges
    builder.addEdge("guardrails" as any, "enrich_memory" as any);
    builder.addConditionalEdges("enrich_memory" as any, (state: WorkflowState) => state.error ? END : "planner" as any);
    builder.addConditionalEdges("planner" as any, (state: WorkflowState) => state.error ? END : "execute" as any);
    builder.addEdge("execute" as any, "response" as any);
    builder.addEdge("response" as any, "evaluate" as any);
    
    builder.addConditionalEdges("evaluate" as any, (state: WorkflowState) => {
      if (state.error) return END;
      const evalData = state.context.agentResults?.evaluation?.data as EvalResult;
      const score = (evalData?.relevancyScore || 0);
      const attempts = state.reflectionAttempts || 0;
      
      if (score < 0.7 && attempts < 2) {
        return "reflect" as any;
      }
      return "output_guardrails" as any;
    });
    
    builder.addEdge("reflect" as any, "response" as any); // Loop back to generation
    builder.addEdge("output_guardrails" as any, "save_memory" as any);
    builder.addEdge("save_memory" as any, END);

    builder.setEntryPoint("guardrails" as any);
    this.graph = builder.compile();
  }

  async executeStream(
    context: AgentContext,
    onToken: (token: string) => void
  ) {
    const traceContext = TracingService.createRootContext();
    TracingService.recordStep(traceContext, "workflow_start", "SUCCESS", 0);

    const initialState: WorkflowState = {
      context: { ...context, agentResults: {} },
      onToken,
      isStream: true,
      traceContext
    };

    const finalState = await this.graph.invoke(initialState as any);
    
    TracingService.recordStep(traceContext, "workflow_end", "SUCCESS", 0);
    return finalState;
  }
}
