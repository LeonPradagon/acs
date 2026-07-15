import { Request, Response } from "express";
import { getUniversalResponse } from "../services/ollama.service";
import { GuardrailsService } from "../services/guardrails.service";
import { getRAGContext, buildConversationHistory } from "../services/chat-stream.service";
import { SemanticCacheService } from "../services/semantic-cache.service";
import { KnowledgeGraphService } from "../services/knowledge-graph.service";
import { shouldSkipRAG } from "../services/chat-stream.service";

/**
 * Headless Chat Integration Controller
 * Processes chat requests from external applications via API Key.
 */
export const chatIntegration = async (req: Request, res: Response) => {
  const {
    question,
    model = "openai/gpt-oss-120b",
    messages = [],
    userId = "system_integration", // Default fallback if not provided by caller
    divisionId = "Global", // Default fallback
    effortLevel = "medium",
    isThinking = false,
  } = req.body;

  if (!question) {
    res.status(400).json({ error: "Missing 'question' parameter." });
    return;
  }

  try {
    // 1. Input Guardrails
    const inputGuard = GuardrailsService.validateInput(question);
    if (!inputGuard.isValid) {
      res.status(403).json({ error: "Input validation failed", reason: inputGuard.reason });
      return;
    }

    const conversationHistory = buildConversationHistory(messages);

    // 2. Query Classification & Multi-Query Retrieval
    const { contexts, needsKnowledge } = await getRAGContext(question, {
      userId,
      divisionId,
      role: "integration",
      clearanceLevel: 1, // Base clearance for integration
    }, conversationHistory);

    let finalQueryForModel = question;

    // Optional Chain of Thought prompt injection
    if (isThinking) {
      const thinkingSystemPrompt = `\n\n[SYSTEM INSTRUCTION: You are required to use a chain-of-thought reasoning process before you output the final answer.\nIMPORTANT: You MUST enclose your entire reasoning process strictly inside <think> and </think> tags. Do not put any of your final answer inside these tags.]`;
      finalQueryForModel = question + thinkingSystemPrompt;
    }

    // 3. AI Generation
    const responseData = await getUniversalResponse(
      finalQueryForModel,
      contexts,
      model,
      conversationHistory,
      divisionId,
      []
    );

    // Output Guardrails (PII Masking & Content Blocking)
    let answerContent = typeof responseData.data === "string"
      ? responseData.data
      : JSON.stringify(responseData.data);

    const outputGuard = GuardrailsService.validateAndSanitizeOutput(answerContent);
    answerContent = outputGuard.sanitizedText;

    if (typeof responseData.data === "string") {
      responseData.data = answerContent;
    }

    // Save to Semantic Cache
    if (!shouldSkipRAG(question)) {
      SemanticCacheService.setCache(question, answerContent, userId);
    }

    // Calculate real confidence based on RAG results
    const avgScore = contexts.length > 0
      ? contexts.reduce((sum, c) => sum + (c.score || 0), 0) / contexts.length
      : 0;
    const confidence = contexts.length > 0 ? Math.round(avgScore * 100) : null;

    // Prepare clean JSON response
    const payload: any = {
      model,
      confidence,
      sources: contexts.map(c => ({
        source: c.source,
        score: c.score,
        content: c.content
      }))
    };

    if (responseData.isJson && typeof responseData.data === "object") {
       // If the AI returned a structured visual_analysis
       payload.type = responseData.data.type || "visual_analysis";
       payload.visualization = responseData.data.visualization;
       payload.analysis_results = responseData.data.analysis_results;
       // Add ontology data if graph requested
       if (needsKnowledge) {
          try {
             payload.ontology_data = await KnowledgeGraphService.buildOntologyResponse(
               question, answerContent, contexts
             );
          } catch(e) {
             console.warn("[Integration] Ontology generation failed", e);
          }
       }
    } else {
       // Standard text response
       payload.type = "text_response";
       payload.answer = answerContent;
    }

    res.status(200).json(payload);
  } catch (error: any) {
    console.error("[Integration Controller] Error:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
};
