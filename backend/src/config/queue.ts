import { Queue } from "bullmq";
import { redisConnection } from "./redis";

export const DOCUMENT_QUEUE_NAME = "document-processing";
export const DEAD_LETTER_QUEUE_NAME = "document-processing-dlq";

export const documentQueue = new Queue(DOCUMENT_QUEUE_NAME, {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,    // 5s, 10s, 20s
    },
    removeOnComplete: {
      count: 100,       // Keep last 100 completed jobs for debugging
      age: 24 * 3600,   // Remove completed jobs older than 24h
    },
    removeOnFail: false, // Keep failed jobs for investigation
  },
});

// Dead Letter Queue — stores jobs that exceeded max retries
export const deadLetterQueue = new Queue(DEAD_LETTER_QUEUE_NAME, {
  connection: redisConnection as any,
});
