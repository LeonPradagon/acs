import { prisma } from "../config/db";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export interface GraphPath {
  nodes: any[];
  edges: any[];
}

export class KnowledgeGraphService {
  /**
   * Extracts entities and relations from document text and stores them in PostgreSQL as a Graph.
   */
  static async extractAndStoreGraph(documentId: string, text: string): Promise<void> {
    try {
      const llm = new ChatOpenAI({
        apiKey: process.env.OLLAMA_API_KEY || "dummy",
        model: process.env.OLLAMA_MODEL || "gpt-oss:120b-cloud",
        configuration: {
          baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
        },
        temperature: 0.1,
      });

      const systemPrompt = `You are a Knowledge Graph Extraction Engine.
Extract entities and relationships from the provided text.
Entities can be: PERSON, ORGANIZATION, PROJECT, TECHNOLOGY, LOCATION, CONCEPT.
Relationships (edges) describe how entities connect (e.g. "WORKS_FOR", "DEPENDS_ON", "USES", "PART_OF").

Output ONLY a raw JSON object (no markdown formatting, no backticks) with this structure:
{
  "nodes": [
    { "id": "Name_of_entity", "type": "ENTITY_TYPE" }
  ],
  "edges": [
    { "source": "Name_of_entity", "target": "Name_of_other_entity", "relation": "RELATION_TYPE" }
  ]
}`;

      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(`Text to analyze:\n\n${text}`),
      ]);

      let jsonStr = response.content.toString().trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```/, "").replace(/```$/, "").trim();
      }

      const graphData = JSON.parse(jsonStr);

      if (!graphData.nodes || !graphData.edges) return;

      // 1. Insert Nodes (Upsert)
      const nodeMap = new Map<string, string>(); // name -> db id
      
      for (const node of graphData.nodes) {
        if (!node.id || !node.type) continue;
        
        const upsertedNode = await prisma.knowledgeGraphNode.upsert({
          where: { entityName: node.id },
          update: { 
            entityType: node.type,
            // Only update documentId if it was not previously linked
          },
          create: {
            entityName: node.id,
            entityType: node.type,
            documentId: documentId
          }
        });
        nodeMap.set(node.id, upsertedNode.id);
      }

      // 2. Insert Edges (Ignore conflicts)
      for (const edge of graphData.edges) {
        if (!edge.source || !edge.target || !edge.relation) continue;
        
        const sourceId = nodeMap.get(edge.source);
        const targetId = nodeMap.get(edge.target);
        
        if (sourceId && targetId) {
          try {
            await prisma.knowledgeGraphEdge.create({
              data: {
                sourceNodeId: sourceId,
                targetNodeId: targetId,
                relationType: edge.relation
              }
            });
          } catch (e: any) {
            // Ignore unique constraint violations (P2002) for edges
            if (e.code !== 'P2002') {
              console.warn("[KnowledgeGraphService] Failed to insert edge:", e.message);
            }
          }
        }
      }

      console.log(`[KnowledgeGraphService] Extracted ${graphData.nodes.length} nodes and ${graphData.edges.length} edges for Document ${documentId}`);
    } catch (error) {
      console.warn("[KnowledgeGraphService] Graph extraction failed.");
    }
  }

  /**
   * Traverse the graph to find related context for a user query.
   * This is a simplified "Graph RAG" retrieval.
   */
  static async retrieveGraphContext(query: string): Promise<string> {
    try {
      // Very naive approach: extract keywords from query and search nodes
      const keywords = query.split(" ").filter(w => w.length > 4);
      
      if (keywords.length === 0) return "";

      let contextStr = "";

      for (const kw of keywords) {
        const nodes = await prisma.knowledgeGraphNode.findMany({
          where: {
            entityName: { contains: kw, mode: 'insensitive' }
          },
          include: {
            sourceEdges: {
              include: { targetNode: true }
            },
            targetEdges: {
              include: { sourceNode: true }
            }
          },
          take: 3
        });

        for (const node of nodes) {
          contextStr += `Entity [${node.entityName}] (${node.entityType}):\n`;
          node.sourceEdges.forEach((e: any) => {
            contextStr += `  - ${e.relationType} -> [${e.targetNode.entityName}]\n`;
          });
          node.targetEdges.forEach((e: any) => {
            contextStr += `  <- ${e.relationType} - [${e.sourceNode.entityName}]\n`;
          });
          contextStr += "\n";
        }
      }

      return contextStr.trim();
    } catch (error) {
      console.error("[KnowledgeGraphService] Retrieval failed:", error);
      return "";
    }
  }

  /**
   * Multi-hop traversal starting from a specific entity name
   */
  static async traverseRelationships(
    startEntity: string, 
    maxHops: number = 2
  ): Promise<string> {
    try {
      const startNode = await prisma.knowledgeGraphNode.findFirst({
        where: { entityName: { equals: startEntity, mode: 'insensitive' } }
      });

      if (!startNode) return "";

      const visitedNodes = new Set<string>();
      const queue: { nodeId: string; hop: number }[] = [{ nodeId: startNode.id, hop: 0 }];
      visitedNodes.add(startNode.id);
      
      let contextStr = `Multi-hop traversal for [${startNode.entityName}]:\n`;

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.hop >= maxHops) continue;

        const nodeData = await prisma.knowledgeGraphNode.findUnique({
          where: { id: current.nodeId },
          include: {
            sourceEdges: { include: { targetNode: true } },
            targetEdges: { include: { sourceNode: true } }
          }
        });

        if (!nodeData) continue;

        for (const edge of nodeData.sourceEdges) {
          contextStr += `(Hop ${current.hop + 1}) [${nodeData.entityName}] --${edge.relationType}--> [${edge.targetNode.entityName}]\n`;
          if (!visitedNodes.has(edge.targetNode.id)) {
            visitedNodes.add(edge.targetNode.id);
            queue.push({ nodeId: edge.targetNode.id, hop: current.hop + 1 });
          }
        }
        
        for (const edge of nodeData.targetEdges) {
          contextStr += `(Hop ${current.hop + 1}) [${nodeData.entityName}] <--${edge.relationType}-- [${edge.sourceNode.entityName}]\n`;
          if (!visitedNodes.has(edge.sourceNode.id)) {
            visitedNodes.add(edge.sourceNode.id);
            queue.push({ nodeId: edge.sourceNode.id, hop: current.hop + 1 });
          }
        }
      }

      return contextStr.trim();
    } catch (err) {
      console.warn("[KnowledgeGraphService] Multi-hop traversal failed:", err);
      return "";
    }
  }

  /**
   * Find connection path between two entities
   */
  static async findConnectionPath(
    entityA: string, 
    entityB: string
  ): Promise<string> {
    console.log(`[KnowledgeGraphService] Finding connection between ${entityA} and ${entityB}`);
    // Basic placeholder for BFS shortest-path search
    return "";
  }
}
