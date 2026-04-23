import { Worker, Job } from "bullmq";
import fs from "fs";
import { redisConnection } from "../config/redis";
import { DOCUMENT_QUEUE_NAME, deadLetterQueue } from "../config/queue";
import { prisma, esClient, pgVectorAvailable } from "../config/db";
import { DocumentExtractorService } from "../services/document-extractor.service";
import { EmbeddingService } from "../services/embedding.service";

const EMBEDDING_BATCH_SIZE = 5;

export const documentWorker = new Worker(
  DOCUMENT_QUEUE_NAME,
  async (job: Job) => {
    const { documentId, filePath, originalname, mimetype } = job.data;
    console.log(
      `[Worker] Started processing document ${documentId} (${originalname}) — Attempt ${job.attemptsMade + 1}`,
    );

    try {
      // 1. Update status to PROCESSING
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "PROCESSING" },
      });

      // 2. Extract Content
      let content = "";
      if (job.data.skipExtraction) {
        const existingDoc = await prisma.document.findUnique({ where: { id: documentId } });
        content = existingDoc?.content || "";
      } else {
        try {
          content = await DocumentExtractorService.extractHybrid(
            filePath,
            mimetype,
          );
        } catch (extractError: any) {
          console.error(
            `[Worker] Extraction error for ${originalname}:`,
            extractError,
          );
          throw new Error(`Extraction failed: ${extractError.message}`);
        }
      }

      // 3. Update DB with content
      const doc = await prisma.document.update({
        where: { id: documentId },
        data: { content },
      });

      // 4. Generate Embeddings and Index to ES + PostgreSQL (with batching)
      const chunks = EmbeddingService.semanticChunk(content);
      console.log(
        `[Worker] Split ${originalname} into ${chunks.length} chunks (semantic).`,
      );

      // Report progress for long-running jobs
      await job.updateProgress(10);

      // Collect all embeddings for both ES and PG indexing
      const allEmbeddings: number[][] = [];
      const esOperations: any[] = [];

      // Process embeddings in batches for better performance
      for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
        const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
        const embeddings = await Promise.all(
          batch.map((chunk) => EmbeddingService.generateEmbedding(chunk)),
        );

        for (let j = 0; j < batch.length; j++) {
          const chunkIndex = i + j;
          allEmbeddings.push(embeddings[j]);
          esOperations.push({
            index: {
              _index: "documents",
              _id: `${doc.id}_chunk_${chunkIndex}`,
            },
          });
          esOperations.push({
            title: doc.title,
            content: batch[j],
            category: doc.category,
            classification: doc.classification,
            tags: doc.tags,
            userId: doc.userId,
            divisionId: doc.divisionId,
            clearanceLevel: doc.clearanceLevel,
            database_id: doc.id,
            chunk_index: chunkIndex,
            timestamp: new Date(),
            embedding: embeddings[j],
          });
        }

        // Report progress
        const progress = 10 + Math.round((i / chunks.length) * 70);
        await job.updateProgress(progress);
      }

      // 4a. Index to Elasticsearch
      try {
        if (esOperations.length > 0) {
          await esClient.bulk({ refresh: true, operations: esOperations });
        }
        console.log(`[Worker] ES indexing completed for ${originalname}`);
      } catch (esError: any) {
        console.warn(
          `[Worker] ES indexing failed for ${originalname}: ${esError.message}`,
        );
      }

      await job.updateProgress(85);

      // 4b. Store chunks + embeddings in PostgreSQL
      try {
        // First, remove any existing chunks for this document (in case of re-processing)
        await prisma.documentChunk.deleteMany({
          where: { documentId: doc.id },
        });

        // Insert chunks via Prisma
        const createdChunks = await prisma.documentChunk.createMany({
          data: chunks.map((chunkContent, idx) => ({
            documentId: doc.id,
            content: chunkContent,
            chunkIndex: idx,
          })),
        });

        // If pgvector is available, update embedding column via raw SQL
        if (pgVectorAvailable) {
          const pgChunks = await prisma.documentChunk.findMany({
            where: { documentId: doc.id },
            orderBy: { chunkIndex: "asc" },
            select: { id: true, chunkIndex: true },
          });

          for (const pgChunk of pgChunks) {
            const embedding = allEmbeddings[pgChunk.chunkIndex];
            if (embedding) {
              const vectorStr = `[${embedding.join(",")}]`;
              await prisma.$executeRawUnsafe(
                `UPDATE "DocumentChunk" SET "embedding" = $1::vector WHERE "id" = $2`,
                vectorStr,
                pgChunk.id,
              );
            }
          }
          console.log(
            `[Worker] PG vector indexing completed for ${originalname} (${pgChunks.length} chunks)`,
          );
        } else {
          console.log(
            `[Worker] PG chunks saved without embeddings (pgvector not available) for ${originalname}`,
          );
        }
      } catch (pgError: any) {
        console.warn(
          `[Worker] PG chunk storage failed for ${originalname}: ${pgError.message}`,
        );
      }

      // 5. Update Status to COMPLETED
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "COMPLETED" },
      });

      // 6. Cleanup uploaded file to save disk space
      if (!job.data.skipExtraction && filePath) {
        try {
          await fs.promises.unlink(filePath);
          console.log(`[Worker] Cleaned up file: ${filePath}`);
        } catch (cleanupErr) {
          console.warn(
            `[Worker] Failed to cleanup file ${filePath}:`,
            cleanupErr,
          );
        }
      }

      await job.updateProgress(100);
      console.log(`[Worker] Successfully completed document ${documentId}`);
      return { success: true, chunks: chunks.length };
    } catch (error: any) {
      console.error(
        `[Worker] Failed processing document ${documentId} (attempt ${job.attemptsMade + 1}):`,
        error.message,
      );
      // Update status to FAILED only on final attempt
      if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
        await prisma.document.update({
          where: { id: documentId },
          data: { status: "FAILED" },
        });
      }
      throw error;
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 2,
  },
);

documentWorker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} has completed!`);
});

documentWorker.on("failed", async (job, err) => {
  console.log(`[Worker] Job ${job?.id} has failed with ${err.message}`);
  
  // SC5: Move to Dead Letter Queue after all retries exhausted
  if (job && (job.attemptsMade >= (job.opts.attempts || 3))) {
    try {
      await deadLetterQueue.add("failed-document", {
        originalJobId: job.id,
        documentId: job.data.documentId,
        originalname: job.data.originalname,
        error: err.message,
        failedAt: new Date().toISOString(),
        attempts: job.attemptsMade,
      });
      console.log(`[Worker] Job ${job.id} moved to Dead Letter Queue`);
    } catch (dlqErr) {
      console.error(`[Worker] Failed to move job to DLQ:`, dlqErr);
    }
  }
});
