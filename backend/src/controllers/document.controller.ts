import { Request, Response } from "express";
import { prisma, esClient } from "../config/db";
import fs from "fs";
import path from "path";
import { DocumentExtractorService } from "../services/document-extractor.service";

/**
 * Handle multiple document uploads with PostgreSQL storage and Elasticsearch indexing.
 * Includes PDF text extraction to avoid UTF-8 encoding errors.
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

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No files uploaded",
      });
    }

    const savedDocuments = [];
    for (const file of files) {
      let content = "";

      try {
        content = await DocumentExtractorService.extractHybrid(
          file.path,
          file.mimetype,
        );
      } catch (extractError: any) {
        console.error(
          `Failed to extract text from ${file.originalname}:`,
          extractError,
        );
        content = `[Content extraction failed for ${file.originalname}]`;
      }

      // 1. Save to PostgreSQL via Prisma
      const doc = (await prisma.document.create({
        data: {
          title: file.originalname,
          content: content,
          category: metadata.category || "General",
          classification: metadata.classification || "Unclassified",
          tags: Array.isArray(metadata.tags) ? metadata.tags : [],
          metadata: {
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            ...metadata,
          },
        } as any,
      })) as any;

      // 2. Index to Elasticsearch for accurate RAG retrieval
      try {
        await esClient.index({
          index: "documents",
          id: doc.id,
          refresh: true,
          document: {
            title: doc.title,
            content: doc.content,
            category: doc.category,
            classification: doc.classification,
            tags: doc.tags,
            database_id: doc.id,
            timestamp: new Date(),
          },
        });
        console.log(
          `✅ Indexed document ${doc.id} to Elasticsearch (refreshed)`,
        );
      } catch (esError) {
        console.error(`❌ Failed to index document ${doc.id} to ES:`, esError);
      }

      savedDocuments.push(doc);
    }

    return res.status(200).json({
      success: true,
      data: {
        successful: savedDocuments.length,
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
