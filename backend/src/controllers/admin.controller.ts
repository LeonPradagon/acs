import { Request, Response } from "express";
import { prisma, esClient } from "../config/db";

// ==========================================
// User Management Logic
// ==========================================

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
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
      return res.status(400).json({ success: false, error: "Invalid role specified." });
    }
    
    // Prevent demoting yourself to avoid locking out the only admin
    const currentUser = (req as any).user;
    if (currentUser?.userId === id && role === "user") {
      return res.status(403).json({ success: false, error: "You cannot demote yourself." });
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

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting oneself
    const currentUser = (req as any).user;
    if (currentUser?.userId === id) {
      return res.status(403).json({ success: false, error: "You cannot delete your own account." });
    }
    
    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: "User deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// Document Management Logic
// ==========================================

export const getAllDocuments = async (req: Request, res: Response) => {
  try {
    const docs = await prisma.document.findMany({
      include: {
        user: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    
    // Calculate global vs private
    const enrichedDocs = docs.map(doc => ({
      ...doc,
      visibility: doc.userId ? "Private (Email)" : "Global (Public)",
    }));
    
    res.json({ success: true, data: enrichedDocs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 1. Delete chunks from Elasticsearch gracefully
    try {
      await esClient.deleteByQuery({
        index: "documents",
        query: { term: { database_id: id } }
      });
      console.log(`[Admin] Deleted ES chunks for doc: ${id}`);
    } catch (esErr) {
      console.warn(`[Admin] ES Cleanup warning for ${id}:`, esErr);
    }
    
    // 2. PostgreSQL Cascade will automatically delete DocumentChunk vectors
    await prisma.document.delete({ where: { id } });
    
    res.json({ success: true, message: "Document completely removed from Knowledge Base." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
