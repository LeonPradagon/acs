import { Worker } from "worker_threads";
import path from "path";

/**
 * Service to generate vector embeddings locally and handle document chunking.
 * Refactored to use worker_threads to prevent Express Event Loop blocking.
 */
export class EmbeddingService {
  private static worker: Worker | null = null;
  private static pendingRequests = new Map<
    string,
    { resolve: (data: number[]) => void; reject: (err: any) => void }
  >();
  private static messageIdCounter = 0;
  private static isInitialized = false;
  private static initPromise: Promise<void> | null = null;

  /**
   * Initialize the embedding worker thread
   */
  static async init() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      console.log("[Embedding] Starting Xenova worker thread...");
      
      // Determine correct path whether running via ts-node, tsx, or compiled js
      const workerPath = path.join(__dirname, "embedding.thread.ts");
      const ext = path.extname(__filename);
      const isTsNode = (process as any)[Symbol.for("ts-node.register.instance")] || process.env.TS_NODE_DEV;
      
      let workerInstance: Worker;
      if (ext === ".ts" || isTsNode) {
        // Run TS file via ts-node/register in worker
        workerInstance = new Worker(`
          require('ts-node').register();
          require('${workerPath.replace(/\\/g, '\\\\')}');
        `, { eval: true });
      } else {
        // Compiled JS
        workerInstance = new Worker(path.join(__dirname, "embedding.thread.js"));
      }

      this.worker = workerInstance;

      this.worker.on("message", (msg) => {
        if (msg.type === "INIT_DONE") {
          console.log("[Embedding] Worker thread initialized successfully.");
          this.isInitialized = true;
          resolve();
        } else if (msg.type === "EMBED_DONE") {
          const req = this.pendingRequests.get(msg.id);
          if (req) {
            req.resolve(msg.data);
            this.pendingRequests.delete(msg.id);
          }
        } else if (msg.type === "ERROR") {
          const req = this.pendingRequests.get(msg.id);
          if (req) {
            req.reject(new Error(msg.error));
            this.pendingRequests.delete(msg.id);
          } else {
            console.error("[Embedding] Worker Error:", msg.error);
            reject(new Error(msg.error));
          }
        }
      });

      this.worker.on("error", (err) => {
        console.error("[Embedding Worker] Process Error:", err);
        reject(err);
      });

      this.worker.postMessage({ type: "INIT" });
    });

    return this.initPromise;
  }

  /**
   * Generate an embedding vector for a given string via worker thread
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const id = `req_${++this.messageIdCounter}`;
      this.pendingRequests.set(id, { resolve, reject });
      
      this.worker?.postMessage({
        type: "EMBED",
        id: id,
        text: text,
      });
    });
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
    maxChunkSize: number = 1500,
    overlap: number = 300,
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

  /**
   * Terminate the worker thread gracefully
   */
  static async close() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.initPromise = null;
    }
  }
}
