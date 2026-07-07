export interface CircuitBreakerOptions {
  failureThreshold: number; // e.g. 5 failures
  resetTimeoutMs: number;   // e.g. 30000 ms (30 seconds)
}

export class CircuitBreaker {
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private failures = 0;
  private nextAttemptTime = 0;

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = { failureThreshold: 5, resetTimeoutMs: 30000 }
  ) {}

  async execute<T>(action: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() > this.nextAttemptTime) {
        this.state = "HALF_OPEN";
        console.log(`[CircuitBreaker] ${this.name} state changed to HALF_OPEN`);
      } else {
        throw new Error(`CircuitBreaker ${this.name} is OPEN. Request denied.`);
      }
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === "HALF_OPEN") {
      this.state = "CLOSED";
      console.log(`[CircuitBreaker] ${this.name} state changed to CLOSED (Recovered)`);
    }
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= this.options.failureThreshold) {
      this.state = "OPEN";
      this.nextAttemptTime = Date.now() + this.options.resetTimeoutMs;
      console.warn(`[CircuitBreaker] ${this.name} state changed to OPEN. Failing fast for ${this.options.resetTimeoutMs}ms`);
    }
  }
}
