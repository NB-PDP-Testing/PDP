"use node";

/**
 * Federation API Client
 *
 * Reusable HTTP client for making authenticated requests to federation APIs.
 * Handles authentication (OAuth2, API Key, Basic), retries with exponential backoff,
 * and rate limiting.
 *
 * Usage:
 * ```typescript
 * const client = createFederationApiClient(ctx, connectorId);
 * const data = await client.request<MemberData>('/api/members', { method: 'GET' });
 * ```
 */

import { api, internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { withRetry } from "./backoff";
import { decryptCredentials, type FederationCredentials } from "./encryption";

// ===== TypeScript Types =====

/**
 * Options for API requests
 */
export interface FederationApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number; // milliseconds
}

/**
 * Error thrown when API request fails
 */
export class FederationApiError extends Error {
  statusCode?: number;
  responseBody?: unknown;

  constructor(message: string, statusCode?: number, responseBody?: unknown) {
    super(message);
    this.name = "FederationApiError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

/**
 * Rate limiter state
 */
interface RateLimitState {
  requests: number[];
  lastCleanup: number;
}

// ===== Rate Limiter =====

// Global rate limit tracking (per connector)
// Maps connectorId -> state
const rateLimiters = new Map<string, RateLimitState>();

/**
 * Check if we've exceeded rate limit and wait if needed
 */
async function checkRateLimit(
  connectorId: string,
  maxRequestsPerMinute = 60
): Promise<void> {
  const now = Date.now();
  let state = rateLimiters.get(connectorId);

  if (!state) {
    state = { requests: [], lastCleanup: now };
    rateLimiters.set(connectorId, state);
  }

  // Clean up requests older than 1 minute
  const oneMinuteAgo = now - 60_000;
  state.requests = state.requests.filter((time) => time > oneMinuteAgo);

  // Check if we've exceeded limit
  if (state.requests.length >= maxRequestsPerMinute) {
    // Calculate how long to wait until oldest request expires
    const oldestRequest = state.requests[0];
    const waitTime = oldestRequest + 60_000 - now;

    if (waitTime > 0) {
      await new Promise((resolve) => {
        setTimeout(resolve, waitTime);
      });
      // Recursive call after waiting
      return checkRateLimit(connectorId, maxRequestsPerMinute);
    }
  }

  // Record this request
  state.requests.push(now);
}

// ===== API Client =====

/**
 * Federation API Client
 */
export interface FederationApiClient {
  /**
   * Make an authenticated HTTP request to the federation API
   */
  request<T>(endpoint: string, options?: FederationApiOptions): Promise<T>;
}

/**
 * Create a federation API client for a specific connector
 *
 * @param ctx - Action context
 * @param connectorId - ID of the federation connector
 * @returns API client instance
 */
export function createFederationApiClient(
  ctx: ActionCtx,
  connectorId: Id<"federationConnectors">
): FederationApiClient {
  return {
    request: async <T>(
      endpoint: string,
      options: FederationApiOptions = {}
    ): Promise<T> => {
      // Load connector configuration
      const connector = await ctx.runQuery(
        api.models.federationConnectors.getConnector,
        { connectorId }
      );

      if (!connector) {
        throw new FederationApiError("Connector not found");
      }

      if (connector.status !== "active") {
        throw new FederationApiError(`Connector is ${connector.status}`);
      }

      // Load and decrypt credentials
      const credentialsBlob = await ctx.storage.get(
        connector.credentialsStorageId
      );
      if (!credentialsBlob) {
        throw new FederationApiError("Connector credentials not found");
      }

      const credentialsBuffer = await credentialsBlob.arrayBuffer();
      const credentialsBase64 =
        Buffer.from(credentialsBuffer).toString("base64");
      let credentials: FederationCredentials =
        await decryptCredentials(credentialsBase64);

      // Check if OAuth token needs refresh
      if (
        credentials.type === "oauth2" &&
        credentials.expiresAt &&
        credentials.expiresAt < Date.now()
      ) {
        // Token expired, refresh it
        await ctx.runAction(
          (internal as any)["actions/federationAuth"].refreshOAuthToken,
          { connectorId }
        );

        // Reload credentials after refresh
        const refreshedBlob = await ctx.storage.get(
          connector.credentialsStorageId
        );
        if (!refreshedBlob) {
          throw new FederationApiError("Credentials not found after refresh");
        }
        const refreshedBuffer = await refreshedBlob.arrayBuffer();
        const refreshedBase64 = Buffer.from(refreshedBuffer).toString("base64");
        const refreshedCredentials: FederationCredentials =
          await decryptCredentials(refreshedBase64);

        // Update credentials reference
        credentials = refreshedCredentials;
      }

      // Build authentication headers
      const authHeaders: Record<string, string> = {};
      if (credentials.type === "oauth2") {
        authHeaders.Authorization = `Bearer ${credentials.accessToken}`;
      } else if (credentials.type === "api_key") {
        authHeaders["X-API-Key"] = credentials.apiKey;
      } else if (credentials.type === "basic") {
        const basicAuth = Buffer.from(
          `${credentials.username}:${credentials.password}`
        ).toString("base64");
        authHeaders.Authorization = `Basic ${basicAuth}`;
      }

      // Combine headers
      const headers = {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(options.headers || {}),
      };

      // Build full URL
      const baseUrl: string = connector.endpoints.membershipList; // Base API URL
      const fullUrl = `${baseUrl}${endpoint}`;

      // Check rate limit before making request
      await checkRateLimit(connectorId, 60); // 60 requests per minute

      // Make request with retry logic
      const makeRequest = async (): Promise<T> => {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          controller.abort();
        }, options.timeout || 30_000);

        try {
          const response = await fetch(fullUrl, {
            method: options.method || "GET",
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (!response.ok) {
            const errorBody = await response.text();
            throw new FederationApiError(
              `HTTP ${response.status}: ${response.statusText}`,
              response.status,
              errorBody
            );
          }

          const data = await response.json();
          return data as T;
        } catch (error) {
          clearTimeout(timeout);
          if (error instanceof FederationApiError) {
            throw error;
          }
          throw new FederationApiError(
            error instanceof Error ? error.message : "Unknown error"
          );
        }
      };

      // Execute with retry logic (3 attempts with exponential backoff)
      return withRetry(makeRequest, 3);
    },
  };
}
