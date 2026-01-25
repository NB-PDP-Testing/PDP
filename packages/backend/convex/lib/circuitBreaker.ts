/**
 * Circuit Breaker Pattern for AI Service Health
 *
 * Implements circuit breaker logic to prevent cascading failures
 * when the Anthropic API is down or degraded.
 *
 * State transitions:
 * - closed → open: After 5 failures within 5-minute window
 * - open → half_open: After 1-minute cooldown
 * - half_open → closed: On successful test call
 * - half_open → open: On failed test call
 */

import type { Doc } from "../_generated/dataModel";

// Circuit breaker thresholds
const FAILURE_THRESHOLD = 5; // Number of failures before opening circuit
const FAILURE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const COOLDOWN_MS = 1 * 60 * 1000; // 1 minute before half-open attempt

/**
 * Determines if API calls should be allowed based on circuit breaker state
 *
 * @param serviceHealth - Current AI service health record
 * @returns true if API call should proceed, false if blocked
 */
export function shouldCallAPI(
  serviceHealth: Doc<"aiServiceHealth"> | null
): boolean {
  // If no health record exists, allow call (first-time setup)
  if (!serviceHealth) {
    return true;
  }

  const now = Date.now();

  switch (serviceHealth.circuitBreakerState) {
    case "closed":
      // Normal operation - allow all calls
      return true;

    case "open": {
      // Circuit is open - check if cooldown period has elapsed
      const timeSinceLastFailure = now - serviceHealth.lastFailureAt;
      if (timeSinceLastFailure >= COOLDOWN_MS) {
        // Cooldown elapsed - allow ONE test call (caller should transition to half_open)
        return true;
      }
      // Still in cooldown - block the call
      return false;
    }

    case "half_open":
      // Allow ONE test call to check if service recovered
      // Caller is responsible for transitioning to closed/open based on result
      return true;

    default:
      // Unknown state - default to allowing call
      return true;
  }
}

/**
 * Calculate the next circuit breaker state based on API result
 *
 * @param currentState - Current circuit breaker state
 * @param success - Whether the API call succeeded
 * @param recentFailureCount - Current failure count in window
 * @param lastFailureAt - Timestamp of last failure
 * @returns New circuit breaker state
 */
export function calculateNextState(
  currentState: "closed" | "open" | "half_open",
  success: boolean,
  recentFailureCount: number,
  lastFailureAt: number
): "closed" | "open" | "half_open" {
  const now = Date.now();

  if (success) {
    // Success - reset to closed state
    return "closed";
  }

  // Failure occurred
  switch (currentState) {
    case "closed": {
      // Check if we've hit failure threshold
      const timeSinceLastFailure = now - lastFailureAt;
      const isWithinWindow = timeSinceLastFailure < FAILURE_WINDOW_MS;

      if (isWithinWindow && recentFailureCount >= FAILURE_THRESHOLD - 1) {
        // This failure pushes us over the threshold - open circuit
        return "open";
      }

      // Still below threshold - stay closed
      return "closed";
    }

    case "half_open":
      // Test call failed - go back to open
      return "open";

    case "open":
      // Already open, stay open
      return "open";

    default:
      return currentState;
  }
}

/**
 * Calculate the updated failure count based on API result
 *
 * @param success - Whether the API call succeeded
 * @param currentCount - Current failure count
 * @param lastFailureAt - Timestamp of last failure
 * @returns New failure count
 */
export function calculateFailureCount(
  success: boolean,
  currentCount: number,
  lastFailureAt: number
): number {
  if (success) {
    // Success - reset failure count
    return 0;
  }

  const now = Date.now();
  const timeSinceLastFailure = now - lastFailureAt;

  if (timeSinceLastFailure >= FAILURE_WINDOW_MS) {
    // Last failure was outside the window - reset count and start fresh
    return 1;
  }

  // Increment failure count (within window)
  return currentCount + 1;
}

/**
 * Calculate the updated health status based on circuit breaker state
 *
 * @param circuitState - Current circuit breaker state
 * @returns Health status
 */
export function calculateHealthStatus(
  circuitState: "closed" | "open" | "half_open"
): "healthy" | "degraded" | "down" {
  switch (circuitState) {
    case "closed":
      return "healthy";
    case "half_open":
      return "degraded";
    case "open":
      return "down";
    default:
      return "healthy";
  }
}

/**
 * Build the updates to apply to aiServiceHealth record after an API call
 *
 * @param serviceHealth - Current service health record (or null if first time)
 * @param success - Whether the API call succeeded
 * @returns Object with fields to update
 */
export function buildHealthUpdate(
  serviceHealth: Doc<"aiServiceHealth"> | null,
  success: boolean
): Partial<Doc<"aiServiceHealth">> {
  const now = Date.now();

  // If no health record, initialize with defaults
  if (!serviceHealth) {
    return {
      service: "anthropic",
      status: success ? "healthy" : "degraded",
      lastSuccessAt: success ? now : 0,
      lastFailureAt: success ? 0 : now,
      recentFailureCount: success ? 0 : 1,
      failureWindow: FAILURE_WINDOW_MS,
      circuitBreakerState: success ? "closed" : "closed", // Start closed even on first failure
      lastCheckedAt: now,
    };
  }

  // Calculate new state
  const newFailureCount = calculateFailureCount(
    success,
    serviceHealth.recentFailureCount,
    serviceHealth.lastFailureAt
  );

  const newState = calculateNextState(
    serviceHealth.circuitBreakerState,
    success,
    newFailureCount,
    serviceHealth.lastFailureAt
  );

  const newStatus = calculateHealthStatus(newState);

  return {
    status: newStatus,
    lastSuccessAt: success ? now : serviceHealth.lastSuccessAt,
    lastFailureAt: success ? serviceHealth.lastFailureAt : now,
    recentFailureCount: newFailureCount,
    circuitBreakerState: newState,
    lastCheckedAt: now,
  };
}
