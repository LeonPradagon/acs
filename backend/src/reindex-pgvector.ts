import { PrismaClient } from "@prisma/client";
import { EmbeddingService } from "./services/embedding.service";

const prisma = new PrismaClient();
const EMBEDDING_BATCH_SIZE = 5;

/**
 * Reindex script: generates vector embeddings for all existing documents
 * and stores them in the DocumentChunk table with pgvector.
 *
 * Usage: npx tsx src/reindex-pgvector.ts
 */
async function main() {
  console.log("[Reindex] Starting pgvector reindex for existing documents...");

  // 1. Check if pgvector extension is available
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
  } catch (err: any) {
    console.error(
      "❌ pgvector extension is not available on this PostgreSQL server.",
      err.message,
    );
    console.error(
      "Please install pgvector first: https://github.com/pgvector/pgvector",
    );
    process.exit(1);
  }

  // 2. Ensure embedding column exists
  const columns: any[] = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'DocumentChunk' AND column_name = 'embedding'
  `;

  if (columns.length === 0) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "DocumentChunk" ADD COLUMN "embedding" vector(384)`,
    );
    console.log("[Reindex] Added embedding column to DocumentChunk");
  }

  // 3. Ensure HNSW index exists
  const indexes: any[] = await prisma.$queryRaw`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'DocumentChunk' AND indexname = 'DocumentChunk_embedding_idx'
  `;

  if (indexes.length === 0) {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX "DocumentChunk_embedding_idx" ON "DocumentChunk"
       USING hnsw ("embedding" vector_cosine_ops)`,
    );
    console.log("[Reindex] Created HNSW index");
  }

  // 4. Get all documents with content
  const documents = await prisma.document.findMany({
    where: {
      content: { not: "" },
      status: { in: ["COMPLETED", "COMPLETED_NO_INDEX"] },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`[Reindex] Found ${documents.length} documents to process.`);

  let totalChunks = 0;
  let processedDocs = 0;

  for (const doc of documents) {
    try {
      console.log(
        `[Reindex] (${processedDocs + 1}/${documents.length}) Processing: ${doc.title}`,
      );

      // Remove existing chunks for this document
      await prisma.documentChunk.deleteMany({
        where: { documentId: doc.id },
      });

      // Chunk the content
      const chunks = EmbeddingService.semanticChunk(doc.content);
      console.log(`  → ${chunks.length} chunks`);

      // Process embeddings in batches
      for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
        const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
        const embeddings = await Promise.all(
          batch.map((chunk) => EmbeddingService.generateEmbedding(chunk.content)),
        );

        for (let j = 0; j < batch.length; j++) {
          const chunkIndex = i + j;

          // Create chunk record
          const chunkRecord = await prisma.documentChunk.create({
            data: {
              documentId: doc.id,
              content: batch[j].content,
              heading: batch[j].heading,
              chunkIndex,
            },
          });

          // Insert vector using raw SQL
          const vectorArray = `[${embeddings[j].join(",")}]`;
          await prisma.$executeRawUnsafe(
            `UPDATE "DocumentChunk" SET embedding = $1::vector WHERE id = $2`,
            vectorArray,
            chunkRecord.id,
          );
        }

        totalChunks += batch.length;
      }

      processedDocs++;
    } catch (err: any) {
      console.error(`  ❌ Failed to process "${doc.title}": ${err.message}`);
    }
  }

  console.log(`\n✅ Reindex complete!`);
  console.log(`   Documents processed: ${processedDocs}/${documents.length}`);
  console.log(`   Total chunks with embeddings: ${totalChunks}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
