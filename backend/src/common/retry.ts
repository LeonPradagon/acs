/**
 * Reusable retry utility with exponential backoff.
 * Use for external API calls (Groq, LlamaParse, etc.) to handle transient failures.
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /**
   * Optional predicate to decide if the error is retryable.
   * Return true to retry, false to throw immediately.
   */
  shouldRetry?: (error: any, attempt: number) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry,
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // If a shouldRetry predicate is provided, check if we should retry
      if (shouldRetry && !shouldRetry(error, attempt)) {
        throw error;
      }

      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt - 1),
          maxDelayMs,
        );
        // Add jitter to prevent thundering herd
        const jitter = delay * 0.1 * Math.random();
        console.warn(
          `[Retry] Attempt ${attempt}/${maxRetries} failed: ${error.message}. Retrying in ${Math.round(delay + jitter)}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      }
    }
  }

  throw lastError;
}
