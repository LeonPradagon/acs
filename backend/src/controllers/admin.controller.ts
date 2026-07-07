import { Request, Response } from "express";
import { prisma, esClient } from "../config/db";
import { clearRagCache } from "../services/rag.service";

// ==========================================
// User Management Logic
// ==========================================

export const getUsers = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;

    // Filter users: superadmin sees all, division_admin sees only users in their division
    let whereFilter = {};
    if (currentUser?.role !== "superadmin" && currentUser?.divisionId) {
      whereFilter = {
        divisionId: currentUser.divisionId,
      };
    }

    const users = await prisma.user.findMany({
      where: whereFilter,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        divisionId: true,
        division: { select: { name: true } },
        clearanceLevel: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["admin", "user"].includes(role)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid role specified." });
    }

    // Prevent demoting yourself to avoid locking out the only admin
    const currentUser = (req as any).user;
    if (currentUser?.userId === id && role === "user") {
      return res
        .status(403)
        .json({ success: false, error: "You cannot demote yourself." });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateUserSecurity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { clearanceLevel, divisionId } = req.body;

    let finalDivisionId = divisionId || null;
    if (finalDivisionId) {
      // Check if it's NOT a UUID (if it's a name like "HRD")
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          finalDivisionId,
        );

      if (!isUuid) {
        let div = await prisma.division.findFirst({
          where: { name: { equals: finalDivisionId, mode: "insensitive" } },
        });
        if (!div) {
          div = await prisma.division.create({
            data: { name: finalDivisionId.toUpperCase() },
          });
        }
        finalDivisionId = div.id;
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        clearanceLevel: clearanceLevel ? parseInt(clearanceLevel) : 1,
        divisionId: finalDivisionId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        clearanceLevel: true,
        divisionId: true,
        division: { select: { name: true } },
      },
    });
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deleting oneself
    const currentUser = (req as any).user;
    if (currentUser?.userId === id) {
      return res
        .status(403)
        .json({ success: false, error: "You cannot delete your own account." });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    // Soft delete: deactivate the user instead of hard deleting
    // This preserves documents and audit trail
    await prisma.$transaction(async (tx) => {
      // Deactivate user
      await tx.user.update({
        where: { id },
        data: {
          role: "user",
          name: `[DELETED] ${user.name || user.email}`,
          clearanceLevel: 0,
        },
      });

      // Clean up sessions (these are safe to delete)
      await tx.chatSession.deleteMany({ where: { userId: id } });

      // Revoke email connection if exists
      await tx.emailConnection.deleteMany({ where: { userId: id } });
    });

    console.log(
      `[Admin] User ${id} (${user.email}) soft-deleted by ${currentUser?.userId}`,
    );
    res.json({ success: true, message: "User deactivated successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// Document Management Logic
// ==========================================

export const getAllDocuments = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;

    let whereFilter = {};
    if (currentUser?.role !== "superadmin") {
      whereFilter = {
        OR: [
          { divisionId: null },
          // if user belongs to a division, they can see their division's documents
          ...(currentUser?.divisionId
            ? [{ divisionId: currentUser.divisionId }]
            : []),
        ],
      };
    }

    const docs = await prisma.document.findMany({
      where: whereFilter,
      include: {
        user: { select: { email: true, name: true } },
        division: { select: { name: true } },
        embeddingJobs: { select: { status: true, progress: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate global vs private/division
    const enrichedDocs = docs.map((doc) => ({
      ...doc,
      visibility: doc.division
        ? `Div: ${doc.division.name}`
        : doc.userId
          ? "Private (User)"
          : "Global (Public)",
    }));

    res.json({ success: true, data: enrichedDocs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 0. Verify document exists
    const doc = await prisma.document.findUnique({
      where: { id },
      select: { id: true, title: true, deletedAt: true },
    });
    if (!doc) {
      return res
        .status(404)
        .json({ success: false, error: "Document not found." });
    }

    if (doc.deletedAt) {
      // Hard delete if already soft deleted
      const pgChunkCount = await prisma.documentChunk.count({
        where: { documentId: id },
      });
      await prisma.document.delete({ where: { id } });
      console.log(`[Admin] Hard deleted doc: ${id}`);
    } else {
      // Soft delete
      await prisma.document.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      console.log(`[Admin] Soft deleted doc: ${id}`);
    }
    
    res.json({
      success: true,
      message: doc.deletedAt 
        ? "Document permanently deleted." 
        : "Document soft deleted.",
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const restoreDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc = await prisma.document.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    
    if (!doc) {
      return res.status(404).json({ success: false, error: "Document not found." });
    }
    if (!doc.deletedAt) {
      return res.status(400).json({ success: false, error: "Document is not deleted." });
    }
    
    await prisma.document.update({
      where: { id },
      data: { deletedAt: null },
    });
    
    res.json({ success: true, message: "Document restored successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// System Settings Logic
// ==========================================
// ==========================================
// Knowledge Graph Logic
// ==========================================

export const getKnowledgeGraph = async (req: Request, res: Response) => {
  try {
    const nodes = await prisma.knowledgeGraphNode.findMany({ take: 100 });
    const edges = await prisma.knowledgeGraphEdge.findMany({ take: 200 });
    res.json({ success: true, data: { nodes, edges } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================

export const getSecurityLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.traceLog.findMany({
      where: {
        OR: [
          { name: "Prompt Injection Detected" },
          { name: "PII Masking Triggered" },
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getTraceLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.traceLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// Prompt Manager Logic
// ==========================================

export const getPrompts = async (req: Request, res: Response) => {
  try {
    const prompts = await prisma.promptVersion.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: prompts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const savePrompt = async (req: Request, res: Response) => {
  try {
    const { name, content } = req.body;
    
    // Auto increment version
    const lastPrompt = await prisma.promptVersion.findFirst({
      where: { name },
      orderBy: { version: "desc" },
    });
    
    const version = lastPrompt ? lastPrompt.version + 1 : 1;
    
    const prompt = await prisma.promptVersion.create({
      data: { name, content, version, isActive: false },
    });
    
    res.json({ success: true, data: prompt });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const activatePrompt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const promptToActivate = await prisma.promptVersion.findUnique({ where: { id } });
    if (!promptToActivate) {
      return res.status(404).json({ success: false, error: "Prompt not found." });
    }
    
    // Deactivate all other prompts with the same name
    await prisma.promptVersion.updateMany({
      where: { name: promptToActivate.name },
      data: { isActive: false },
    });
    
    // Activate the requested prompt
    await prisma.promptVersion.update({
      where: { id },
      data: { isActive: true },
    });
    
    res.json({ success: true, message: "Prompt activated successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getSystemSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    // Convert to key-value object
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    // Default ERP_CONNECTION_MODE to DB if not set
    if (!settingsObj["ERP_CONNECTION_MODE"]) {
      settingsObj["ERP_CONNECTION_MODE"] = "DB";
    }

    res.json({ success: true, data: settingsObj });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSystemSetting = async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;

    if (!key || typeof value === "undefined") {
      return res
        .status(400)
        .json({ success: false, error: "Key and value are required." });
    }

    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    res.json({
      success: true,
      message: `Setting ${key} updated successfully.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Validate that a URL doesn't point to internal/private network (SSRF protection).
 */
function isUrlSafe(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    const hostname = parsed.hostname.toLowerCase();

    // Block internal addresses
    const blockedPatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^0\.0\.0\.0$/,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];

    if (blockedPatterns.some((p) => p.test(hostname))) return false;
    if (
      !["http:", "https:", "postgresql:", "postgres:"].includes(parsed.protocol)
    )
      return false;

    return true;
  } catch {
    return false;
  }
}

export const testConnection = async (req: Request, res: Response) => {
  try {
    const { mode, url, apiKey } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: "URL is required" });
    }

    // SSRF Protection: block connections to internal networks
    if (!isUrlSafe(url)) {
      return res
        .status(400)
        .json({
          success: false,
          error:
            "Connection to internal/private network addresses is not allowed.",
        });
    }

    if (mode === "DB") {
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });
      try {
        await pool.query("SELECT 1");
        return res.json({
          success: true,
          message: "Database connection successful!",
        });
      } catch (err: any) {
        return res.json({ success: false, error: err.message });
      } finally {
        await pool.end().catch(() => {});
      }
    } else if (mode === "API") {
      const axios = require("axios");
      try {
        const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
        await axios.get(url, { headers, timeout: 5000, maxRedirects: 2 });
        return res.json({
          success: true,
          message: "API connection successful!",
        });
      } catch (err: any) {
        if (err.response) {
          return res.json({
            success: true,
            message: `API reached (Status: ${err.response.status})`,
          });
        }
        return res.json({ success: false, error: err.message });
      }
    }

    return res
      .status(400)
      .json({ success: false, error: "Invalid mode. Use 'DB' or 'API'." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// AI Brain & Context Logic
// ==========================================

export const getAiBrainStatus = async (req: Request, res: Response) => {
  try {
    // 1. Measure real ERP (PostgreSQL) latency
    const erpStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const erpLatency = Date.now() - erpStart;

    // 2. Measure real RAG (Elasticsearch) latency
    let ragLatency = 0;
    const ragStart = Date.now();
    try {
      await esClient.info();
      ragLatency = Date.now() - ragStart;
    } catch {
      ragLatency = 15; // default fallback if ES is not running/accessible
    }

    // Parallel data fetching for efficiency
    const [recentDocs, totalDocs, recentSessions, totalUsers, charCountResult] =
      await Promise.all([
        prisma.document.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { division: { select: { name: true } } },
        }),
        prisma.document.count(),
        prisma.chatSession.findMany({
          take: 8,
          orderBy: { updatedAt: "desc" },
          include: {
            _count: { select: { messages: true } },
          },
        }),
        prisma.user.count(),
        prisma.$queryRaw<any[]>`SELECT SUM(LENGTH(content))::int as sum FROM "Document"`,
      ]);

    // Manually resolve user names for sessions
    const sessionUserIds = [...new Set(recentSessions.map((s) => s.userId).filter(Boolean))] as string[];
    const sessionUsers = sessionUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: sessionUserIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const userMap = new Map(sessionUsers.map((u) => [u.id, u.name || u.email]));

    const knowledgeBase = recentDocs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      status: doc.status,
      visibility: doc.division
        ? `Restricted (${doc.division.name})`
        : doc.userId
          ? "Private"
          : "Global",
      createdAt: doc.createdAt,
    }));

    // Format session feed
    const sessionFeed = recentSessions.map((s) => ({
      id: s.id,
      title: s.title || "Untitled Session",
      user: s.userId ? (userMap.get(s.userId) || "Unknown") : "Anonymous",
      messageCount: s._count?.messages || 0,
      updatedAt: s.updatedAt,
    }));

    // Real estimated token usage based on document characters / 4
    const totalChars = Number(charCountResult?.[0]?.sum || 0);
    const estimatedTokensUsed = Math.min(Math.round(totalChars / 4) + 800, 120000);
    const contextWindowMax = 128000;
    const tokenUsagePercent = Math.round((estimatedTokensUsed / contextWindowMax) * 100);

    // Health stats
    const stats = {
      totalDocs,
      totalUsers,
      activeSessions: recentSessions.length,
      avgLatency: Math.round((erpLatency + ragLatency) / 2),
      tokenUsage: {
        used: estimatedTokensUsed,
        max: contextWindowMax,
        percent: tokenUsagePercent,
      },
    };

    // Generate Semantic Graph Data
    const graphNodes: any[] = [
      { id: "core_ai", name: "ACS AI Engine", group: "core", val: 18 },
      { id: "erp_db", name: "ERP Database", group: "core", val: 14 },
    ];
    const graphLinks: any[] = [{ source: "core_ai", target: "erp_db" }];

    // Dynamically retrieve unique categories from the database
    const uniqueCategoriesObj = await prisma.document.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ["category"],
    });

    const categories = uniqueCategoriesObj.length > 0
      ? uniqueCategoriesObj.map((d) => d.category as string)
      : ["General", "Finance", "HRD", "Cybersecurity", "Operational"];

    // Add category nodes to graph
    categories.forEach((cat) => {
      const catId = `concept_${cat.toLowerCase().replace(/\s+/g, "_")}`;
      graphNodes.push({
        id: catId,
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        group: "concept",
        val: 10,
      });
      graphLinks.push({ source: "core_ai", target: catId });
    });

    // Add document nodes and link them to their actual categories
    recentDocs.forEach((doc) => {
      const docId = `doc_${doc.id}`;
      graphNodes.push({
        id: docId,
        name: doc.title.substring(0, 15) + (doc.title.length > 15 ? "..." : ""),
        group: "document",
        val: 9,
      });
      graphLinks.push({ source: docId, target: "core_ai" });

      if (doc.category) {
        const docCatId = `concept_${doc.category.toLowerCase().replace(/\s+/g, "_")}`;
        // Ensure this concept node exists or create it
        if (!graphNodes.some((node) => node.id === docCatId)) {
          graphNodes.push({
            id: docCatId,
            name: doc.category.charAt(0).toUpperCase() + doc.category.slice(1),
            group: "concept",
            val: 10,
          });
          graphLinks.push({ source: "core_ai", target: docCatId });
        }
        graphLinks.push({ source: docId, target: docCatId });
      } else {
        const generalCatId = "concept_general";
        if (!graphNodes.some((node) => node.id === generalCatId)) {
          graphNodes.push({
            id: generalCatId,
            name: "General",
            group: "concept",
            val: 10,
          });
          graphLinks.push({ source: "core_ai", target: generalCatId });
        }
        graphLinks.push({ source: docId, target: generalCatId });
      }
    });

    const data = {
      config: {
        model: "gpt-oss-120b",
        provider: "Open Source Server",
        temperature: 0.7,
        maxTokens: 8000,
        contextWindow: "128k",
        status: "active",
      },
      tools: [
        { name: "ERP Database Queries", iconType: "Database", status: "Connected", latency: `${erpLatency}ms` },
        { name: "Document RAG Index", iconType: "FileText", status: "Connected", latency: `${ragLatency}ms` },
        { name: "External API Access", iconType: "Globe", status: "Restricted", latency: "-" },
        { name: "Code Execution", iconType: "Code", status: "Sandbox Only", latency: "-" },
      ],
      systemPrompt: `You are a highly capable AI Agent embedded within the ACS (Enterprise Resource Planning) platform.\nYour primary role is to assist users with financial analysis, report generation, and system queries.\nAlways maintain a professional tone. You have access to real-time data from the ERP database and the corporate document repository. Do NOT disclose internal IDs or sensitive API keys.`,
      knowledgeBase,
      graphData: { nodes: graphNodes, links: graphLinks },
      stats,
      sessionFeed,
    };

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};


