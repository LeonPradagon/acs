import { parentPort } from "worker_threads";
import { pipeline } from "@xenova/transformers";

let extractor: any = null;

parentPort?.on("message", async (msg) => {
  try {
    if (msg.type === "INIT") {
      if (!extractor) {
        extractor = await pipeline(
          "feature-extraction",
          "Xenova/all-MiniLM-L6-v2",
        );
      }
      parentPort?.postMessage({ type: "INIT_DONE" });
    } else if (msg.type === "EMBED") {
      if (!extractor) {
        throw new Error("Extractor not initialized. Call INIT first.");
      }
      const output = await extractor(msg.text, {
        pooling: "mean",
        normalize: true,
      });
      parentPort?.postMessage({
        type: "EMBED_DONE",
        id: msg.id,
        data: Array.from(output.data),
      });
    }
  } catch (err: any) {
    parentPort?.postMessage({ type: "ERROR", id: msg?.id, error: err.message });
  }
});
