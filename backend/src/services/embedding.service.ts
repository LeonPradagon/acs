import { pipeline } from "@xenova/transformers";

/**
 * Service to generate vector embeddings locally and handle document chunking.
 * Uses the all-MiniLM-L6-v2 model (384 dimensions).
 */
export class EmbeddingService {
  private static extractor: any = null;

  /**
   * Initialize the embedding pipeline
   */
  static async init() {
    if (!this.extractor) {
      console.log("[Embedding] Initializing all-MiniLM-L6-v2 model...");
      this.extractor = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
      );
    }
  }

  /**
   * Generate an embedding vector for a given string
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    await this.init();

    const output = await this.extractor(text, {
      pooling: "mean",
      normalize: true,
    });

    return Array.from(output.data);
  }

  /**
   * Character-based chunking with overlap (legacy).
   */
  static chunkText(
    text: string,
    chunkSize: number = 800,
    overlap: number = 150,
  ): string[] {
    if (text.length <= chunkSize) return [text];

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.substring(start, end));
      start += chunkSize - overlap;
    }

    return chunks;
  }

  /**
   * Semantic chunking: split by paragraphs/headers first, then fallback to
   * character-based splitting if individual sections are too large.
   * This prevents cutting chunks in the middle of sentences.
   */
  static semanticChunk(
    text: string,
    maxChunkSize: number = 800,
    overlap: number = 100,
  ): string[] {
    if (text.length <= maxChunkSize) return [text];

    // Split by double newlines (paragraphs) or markdown headers
    const sections = text.split(/\n\n+|\n(?=#{1,6}\s)/);
    const chunks: string[] = [];
    let buffer = "";

    for (const section of sections) {
      const trimmedSection = section.trim();
      if (!trimmedSection) continue;

      // If adding this section would exceed the limit, flush the buffer
      if (
        buffer.length > 0 &&
        buffer.length + trimmedSection.length + 2 > maxChunkSize
      ) {
        chunks.push(buffer.trim());

        // Keep overlap from end of previous chunk
        if (overlap > 0 && buffer.length > overlap) {
          buffer = buffer.slice(-overlap) + "\n\n" + trimmedSection;
        } else {
          buffer = trimmedSection;
        }
      } else {
        buffer += (buffer ? "\n\n" : "") + trimmedSection;
      }

      // If a single section is larger than maxChunkSize, split it further
      if (buffer.length > maxChunkSize) {
        const subChunks = this.chunkText(buffer, maxChunkSize, overlap);
        // Push all but the last sub-chunk
        for (let i = 0; i < subChunks.length - 1; i++) {
          chunks.push(subChunks[i]);
        }
        // Keep the last sub-chunk in the buffer for potential merging
        buffer = subChunks[subChunks.length - 1];
      }
    }

    // Flush remaining buffer
    if (buffer.trim()) {
      chunks.push(buffer.trim());
    }

    return chunks;
  }
}
