import { Worker, Job } from "bullmq";
import fs from "fs";
import { redisConnection } from "../config/redis";
import { DOCUMENT_QUEUE_NAME } from "../config/queue";
import { prisma, esClient } from "../config/db";
import { DocumentExtractorService } from "../services/document-extractor.service";
import { EmbeddingService } from "../services/embedding.service";

const EMBEDDING_BATCH_SIZE = 5;

export const documentWorker = new Worker(
  DOCUMENT_QUEUE_NAME,
  async (job: Job) => {
    const { documentId, filePath, originalname, mimetype } = job.data;
    console.log(
      `[Worker] Started processing document ${documentId} (${originalname})`,
    );

    try {
      // 1. Update status to PROCESSING
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "PROCESSING" },
      });

      // 2. Extract Content
      let content = "";
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

      // 3. Update DB with content
      const doc = await prisma.document.update({
        where: { id: documentId },
        data: { content },
      });

      // 4. Generate Embeddings and Index to ES (with batching)
      const chunks = EmbeddingService.semanticChunk(content);
      console.log(
        `[Worker] Split ${originalname} into ${chunks.length} chunks (semantic).`,
      );

      try {
        const operations = [];

        // Process embeddings in batches for better performance
        for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
          const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
          const embeddings = await Promise.all(
            batch.map((chunk) => EmbeddingService.generateEmbedding(chunk)),
          );

          for (let j = 0; j < batch.length; j++) {
            const chunkIndex = i + j;
            operations.push({
              index: {
                _index: "documents",
                _id: `${doc.id}_chunk_${chunkIndex}`,
              },
            });
            operations.push({
              title: doc.title,
              content: batch[j],
              category: doc.category,
              classification: doc.classification,
              tags: doc.tags,
              database_id: doc.id,
              chunk_index: chunkIndex,
              timestamp: new Date(),
              embedding: embeddings[j],
            });
          }
        }

        if (operations.length > 0) {
          await esClient.bulk({ refresh: true, operations });
        }

        // 5. Update Status to COMPLETED
        await prisma.document.update({
          where: { id: documentId },
          data: { status: "COMPLETED" },
        });
      } catch (esError: any) {
        // Graceful degradation: content is saved, but ES indexing failed
        console.warn(
          `[Worker] ES indexing failed for ${originalname}: ${esError.message}. Document saved without search index.`,
        );
        await prisma.document.update({
          where: { id: documentId },
          data: { status: "COMPLETED_NO_INDEX" },
        });
      }

      // 6. Cleanup uploaded file to save disk space
      try {
        await fs.promises.unlink(filePath);
        console.log(`[Worker] Cleaned up file: ${filePath}`);
      } catch (cleanupErr) {
        console.warn(
          `[Worker] Failed to cleanup file ${filePath}:`,
          cleanupErr,
        );
      }

      console.log(`[Worker] Successfully completed document ${documentId}`);
      return { success: true, chunks: chunks.length };
    } catch (error: any) {
      console.error(
        `[Worker] Failed processing document ${documentId}:`,
        error,
      );
      // Update status to FAILED
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "FAILED" },
      });
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

documentWorker.on("failed", (job, err) => {
  console.log(`[Worker] Job ${job?.id} has failed with ${err.message}`);
});
