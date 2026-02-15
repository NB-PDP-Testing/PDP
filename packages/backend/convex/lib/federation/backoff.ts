/**
 * Exponential backoff with jitter utilities
 *
 * Prevents thundering herd problems when retrying failed requests.
 * Uses exponential backoff with randomized jitter to spread retry attempts.
 */

/**
 * Calculate exponential backoff delay with jitter
 *
 * Formula: delay = min(baseDelayMs * 2^attempt, maxDelayMs)
 * Jitter: randomize between 50% and 100% of calculated delay
 *
 * @param attempt - Retry attempt number (0-indexed)
 * @param baseDelayMs - Base delay in milliseconds (default: 1000ms = 1s)
 * @param maxDelayMs - Maximum delay in milliseconds (default: 30000ms = 30s)
 * @returns Promise that resolves after the calculated delay
 *
 * @example
 * await exponentialBackoff(0); // ~500-1000ms delay
 * await exponentialBackoff(1); // ~1000-2000ms delay
 * await exponentialBackoff(2); // ~2000-4000ms delay
 */
export function exponentialBackoff(
  attempt: number,
  baseDelayMs = 1000,
  maxDelayMs = 30_000
): Promise<void> {
  // Calculate exponential delay: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * 2 ** attempt;

  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter: randomize between 50% and 100% of delay
  // This prevents multiple clients from retrying at the exact same time
  const jitter = 0.5 + Math.random() * 0.5; // Random value between 0.5 and 1.0
  const delayWithJitter = Math.floor(cappedDelay * jitter);

  // Return Promise that resolves after delay
  return new Promise((resolve) => {
    setTimeout(resolve, delayWithJitter);
  });
}

/**
 * Retry a function with exponential backoff
 *
 * Executes the provided function and retries with exponential backoff
 * if it throws an error. Gives up after maxAttempts and throws the last error.
 *
 * @param fn - Async function to execute and retry on failure
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param baseDelayMs - Base delay in milliseconds (default: 1000ms)
 * @param maxDelayMs - Maximum delay in milliseconds (default: 30000ms)
 * @returns Promise that resolves with the function's result
 * @throws The last error if all attempts fail
 *
 * @example
 * const result = await withRetry(async () => {
 *   const response = await fetch('https://api.example.com/data');
 *   return response.json();
 * });
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
  maxDelayMs = 30_000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Attempt to execute function
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this was the last attempt, throw the error
      if (attempt === maxAttempts - 1) {
        throw lastError;
      }

      // Log retry attempt (optional - can be removed if logging is not desired)
      console.warn(
        `Attempt ${attempt + 1}/${maxAttempts} failed: ${lastError.message}. Retrying...`
      );

      // Wait with exponential backoff before next attempt
      await exponentialBackoff(attempt, baseDelayMs, maxDelayMs);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError || new Error("All retry attempts exhausted");
}

/**
 * Check if an error is retryable
 *
 * Helper function to determine if an error should trigger a retry.
 * Common retryable errors: network errors, rate limits, temporary server errors.
 *
 * @param error - Error to check
 * @returns True if error should be retried
 *
 * @example
 * try {
 *   await fetch('https://api.example.com/data');
 * } catch (error) {
 *   if (isRetryableError(error)) {
 *     await exponentialBackoff(0);
 *     // retry
 *   }
 * }
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  // Network errors
  if (
    error.message.includes("ECONNRESET") ||
    error.message.includes("ETIMEDOUT") ||
    error.message.includes("ENOTFOUND") ||
    error.message.includes("fetch failed")
  ) {
    return true;
  }

  // HTTP errors (if error has status code property)
  const httpError = error as Error & { status?: number };
  if (httpError.status) {
    // Retry on:
    // - 429 Too Many Requests
    // - 500 Internal Server Error
    // - 502 Bad Gateway
    // - 503 Service Unavailable
    // - 504 Gateway Timeout
    return [429, 500, 502, 503, 504].includes(httpError.status);
  }

  return false;
}
