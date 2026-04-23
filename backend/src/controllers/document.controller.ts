import { Request, Response } from "express";
import { prisma } from "../config/db";
import { documentQueue } from "../config/queue";

/**
 * Handle multiple document uploads with PostgreSQL storage and BullMQ queueing.
 * Defers PDF text extraction and Semantic Search (Vector) indexing to background workers.
 */
export const uploadDocuments = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const metadataStr = req.body.metadata;
    let metadata: any = {};

    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch (e) {
        console.warn("Failed to parse metadata:", e);
      }
    }

    const currentUser = (req as any).user;
    let explicitDivisionId = metadata.divisionId !== undefined ? metadata.divisionId : currentUser?.divisionId || null;
    let explicitClearanceLevel = metadata.clearanceLevel !== undefined ? metadata.clearanceLevel : 1;

    // Normal users cannot override to other divisions or set high clearances
    if (currentUser?.role !== "admin" && currentUser?.role !== "superadmin") {
       explicitDivisionId = currentUser?.divisionId || null;
       explicitClearanceLevel = 1; // standard documents created by users get level 1
    }

    // Resolve string name to Division UUID if valid string
    if (explicitDivisionId && explicitDivisionId.length < 36) {
        let div = await prisma.division.findFirst({
            where: { name: { equals: explicitDivisionId, mode: "insensitive" } }
        });
        if (!div) {
            div = await prisma.division.create({
                data: { name: explicitDivisionId.toUpperCase() }
            });
        }
        explicitDivisionId = div.id;
    }

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No files uploaded",
      });
    }

    const savedDocuments = [];
    for (const file of files) {
      // 1. Save to PostgreSQL via Prisma with PENDING status
      const doc = await prisma.document.create({
        data: {
          title: file.originalname,
          content: "", // Empty for now, filled by worker
          category: metadata.category || "General",
          classification: metadata.classification || "Unclassified",
          tags: Array.isArray(metadata.tags) ? metadata.tags : [],
          status: "PENDING",
          userId: currentUser?.userId || null,
          divisionId: explicitDivisionId,
          clearanceLevel: explicitClearanceLevel,
          metadata: {
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            ...metadata,
          },
        } as any,
      });

      // 2. Add Job to Queue
      await documentQueue.add("extract-document", {
        documentId: doc.id,
        filePath: file.path,
        originalname: file.originalname,
        mimetype: file.mimetype,
      });

      savedDocuments.push(doc);
    }

    return res.status(202).json({
      success: true,
      message: "Documents are being processed in the background.",
      data: {
        queued: savedDocuments.length,
        documents: savedDocuments,
      },
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error during upload",
    });
  }
};
