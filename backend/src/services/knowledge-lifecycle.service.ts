import { prisma } from "../config/db";
import crypto from "crypto";

export class KnowledgeLifecycleService {
  /**
   * Soft deletes a document and its related data.
   */
  static async softDeleteDocument(documentId: string, userId: string): Promise<boolean> {
    try {
      const doc = await prisma.document.findUnique({
        where: { id: documentId }
      });
      
      if (!doc || doc.userId !== userId) {
        return false; // Unauthorized or not found
      }

      await prisma.document.update({
        where: { id: documentId },
        data: { 
          deletedAt: new Date(),
          status: "DELETED"
        }
      });
      
      return true;
    } catch (error) {
      console.error("[LifecycleService] Soft delete failed:", error);
      return false;
    }
  }

  /**
   * Generates a SHA-256 checksum for a string.
   */
  static generateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Checks if a document with the exact same content already exists (duplicate detection).
   */
  static async isDuplicate(checksum: string): Promise<boolean> {
    const existing = await prisma.document.findFirst({
      where: { 
        checksum,
        deletedAt: null 
      }
    });
    return !!existing;
  }

  /**
   * Creates a re-index job for a document.
   */
  static async queueReindexJob(documentId: string): Promise<string | null> {
    try {
      const job = await prisma.embeddingJob.create({
        data: {
          documentId,
          status: "PENDING"
        }
      });
      return job.id;
    } catch (error) {
      console.error("[LifecycleService] Queue re-index failed:", error);
      return null;
    }
  }
}
