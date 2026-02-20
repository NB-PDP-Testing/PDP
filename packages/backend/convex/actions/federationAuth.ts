"use node";

/**
 * Federation OAuth 2.0 Authentication Actions
 *
 * Handles OAuth 2.0 authorization flow for federation connectors.
 * Supports authorization code exchange, token refresh, and CSRF protection.
 */

import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { action } from "../_generated/server";
import {
  decryptCredentials,
  encryptCredentials,
  type OAuth2Credentials,
} from "../lib/federation/encryption";

// ===== Start OAuth Flow =====

export const startOAuthFlow = action({
  args: {
    connectorId: v.id("federationConnectors"),
    redirectUri: v.string(),
    scope: v.optional(v.string()),
  },
  returns: v.object({
    authorizationUrl: v.string(),
    state: v.string(),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{ authorizationUrl: string; state: string }> => {
    // Get connector configuration
    const connector = await ctx.runQuery(
      api.models.federationConnectors.getConnector,
      { connectorId: args.connectorId }
    );

    if (!connector) {
      throw new Error("Connector not found");
    }

    if (connector.authType !== "oauth2") {
      throw new Error("Connector is not configured for OAuth 2.0");
    }

    // Generate random state for CSRF protection
    const stateBytes = crypto.getRandomValues(new Uint8Array(32));
    let state = "";
    for (const byte of stateBytes) {
      state += byte.toString(16).padStart(2, "0");
    }

    // Build authorization URL
    const authUrl: URL = new URL(connector.endpoints.membershipList); // Base authorization endpoint
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", args.redirectUri);
    authUrl.searchParams.set("state", state);
    if (args.scope) {
      authUrl.searchParams.set("scope", args.scope);
    }

    // Note: client_id should be part of the connector configuration
    // For now, we'll assume it's included in the endpoints object or credentials

    return {
      authorizationUrl: authUrl.toString(),
      state,
    };
  },
});

// ===== Complete OAuth Flow =====

export const completeOAuthFlow = action({
  args: {
    connectorId: v.id("federationConnectors"),
    code: v.string(),
    state: v.string(),
    expectedState: v.string(),
    redirectUri: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Validate state (CSRF protection)
    if (args.state !== args.expectedState) {
      throw new Error("Invalid state parameter - possible CSRF attack");
    }

    // Get connector configuration
    const connector = await ctx.runQuery(
      api.models.federationConnectors.getConnector,
      { connectorId: args.connectorId }
    );

    if (!connector) {
      throw new Error("Connector not found");
    }

    if (connector.authType !== "oauth2") {
      throw new Error("Connector is not configured for OAuth 2.0");
    }

    // Get encrypted credentials from storage
    const storedCredentialsBlob = await ctx.storage.get(
      connector.credentialsStorageId
    );
    if (!storedCredentialsBlob) {
      throw new Error("Credentials not found in storage");
    }

    const storedCredentialsData = await storedCredentialsBlob.text();

    // Decrypt credentials to get OAuth config
    // Note: For OAuth2, initial credentials contain clientId, clientSecret, authorizationUrl, tokenUrl
    // After completion, they'll be replaced with accessToken, refreshToken, etc.
    const initialCredentials = JSON.parse(storedCredentialsData) as {
      clientId?: string;
      clientSecret?: string;
      tokenUrl?: string;
      authorizationUrl?: string;
    };

    if (!(initialCredentials.clientId && initialCredentials.clientSecret)) {
      throw new Error(
        "OAuth configuration missing. Please configure client credentials in connector settings."
      );
    }

    if (!initialCredentials.tokenUrl) {
      throw new Error("OAuth token URL not configured in connector settings.");
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(initialCredentials.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: args.code,
        redirect_uri: args.redirectUri,
        client_id: initialCredentials.clientId,
        client_secret: initialCredentials.clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    };

    // Calculate token expiry time
    const expiresAt = tokenData.expires_in
      ? Date.now() + tokenData.expires_in * 1000
      : undefined;

    // Create OAuth2 credentials object
    const credentials: OAuth2Credentials = {
      type: "oauth2",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      tokenType: tokenData.token_type || "Bearer",
      scope: tokenData.scope,
    };

    // Encrypt and store credentials
    const encryptedData = await encryptCredentials(credentials);
    const credentialsBlob = new Blob([encryptedData], {
      type: "application/octet-stream",
    });
    const credentialsStorageId = await ctx.storage.store(credentialsBlob);

    // Update connector with new credentials
    await ctx.runMutation(
      internal.models.federationConnectors.updateConnectorCredentialsInternal,
      {
        connectorId: args.connectorId,
        credentialsStorageId,
      }
    );

    return null;
  },
});

// ===== Refresh OAuth Token =====

export const refreshOAuthToken = action({
  args: {
    connectorId: v.id("federationConnectors"),
    tokenEndpoint: v.string(),
    clientId: v.string(),
    clientSecret: v.string(),
  },
  returns: v.object({
    accessToken: v.string(),
    expiresAt: v.optional(v.number()),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{ accessToken: string; expiresAt?: number }> => {
    // Get connector and credentials
    const connector = await ctx.runQuery(
      api.models.federationConnectors.getConnector,
      { connectorId: args.connectorId }
    );

    if (!connector) {
      throw new Error("Connector not found");
    }

    // Get encrypted credentials from storage
    const credentialsBlob = await ctx.storage.get(
      connector.credentialsStorageId
    );
    if (!credentialsBlob) {
      throw new Error("Credentials not found in storage");
    }

    const encryptedData = await credentialsBlob.text();
    const credentials = await decryptCredentials(encryptedData);

    if (credentials.type !== "oauth2") {
      throw new Error("Connector does not use OAuth 2.0");
    }

    if (!credentials.refreshToken) {
      throw new Error("No refresh token available");
    }

    // Check if token is expired
    const now = Date.now();
    if (credentials.expiresAt && credentials.expiresAt > now) {
      // Token is still valid
      return {
        accessToken: credentials.accessToken,
        expiresAt: credentials.expiresAt,
      };
    }

    // Refresh the token
    const tokenResponse = await fetch(args.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: credentials.refreshToken,
        client_id: args.clientId,
        client_secret: args.clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token refresh failed: ${errorText}`);
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    };

    // Calculate new expiry time
    const expiresAt = tokenData.expires_in
      ? Date.now() + tokenData.expires_in * 1000
      : undefined;

    // Update credentials with new token
    const updatedCredentials: OAuth2Credentials = {
      type: "oauth2",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || credentials.refreshToken,
      expiresAt,
      tokenType: tokenData.token_type || credentials.tokenType,
      scope: tokenData.scope || credentials.scope,
    };

    // Encrypt and store updated credentials
    const updatedEncryptedData = await encryptCredentials(updatedCredentials);
    const updatedCredentialsBlob = new Blob([updatedEncryptedData], {
      type: "application/octet-stream",
    });
    const newCredentialsStorageId = await ctx.storage.store(
      updatedCredentialsBlob
    );

    // Update connector
    await ctx.runMutation(
      internal.models.federationConnectors.updateConnectorCredentialsInternal,
      {
        connectorId: args.connectorId,
        credentialsStorageId: newCredentialsStorageId,
      }
    );

    return {
      accessToken: updatedCredentials.accessToken,
      expiresAt: updatedCredentials.expiresAt,
    };
  },
});

// ===== Test Connection =====

export const testConnection = action({
  args: {
    connectorId: v.id("federationConnectors"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    responseTime: v.number(),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; message: string; responseTime: number }> => {
    const startTime = Date.now();

    try {
      // Get connector configuration
      const connector = await ctx.runQuery(
        api.models.federationConnectors.getConnector,
        { connectorId: args.connectorId }
      );

      if (!connector) {
        return {
          success: false,
          message: "Connector not found",
          responseTime: Date.now() - startTime,
        };
      }

      // Get encrypted credentials from storage
      const credentialsBlob = await ctx.storage.get(
        connector.credentialsStorageId
      );
      if (!credentialsBlob) {
        return {
          success: false,
          message: "Credentials not found in storage",
          responseTime: Date.now() - startTime,
        };
      }

      const encryptedData = await credentialsBlob.text();
      const credentials = await decryptCredentials(encryptedData);

      // Build test request to membership list endpoint (limit 1 for speed)
      const testUrl = new URL(connector.endpoints.membershipList);
      testUrl.searchParams.set("limit", "1"); // Only fetch 1 record for testing

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add authentication based on type
      if (credentials.type === "oauth2") {
        headers.Authorization = `${credentials.tokenType} ${credentials.accessToken}`;
      } else if (credentials.type === "api_key") {
        headers[credentials.keyName ?? "X-API-Key"] = credentials.apiKey;
      } else if (credentials.type === "basic") {
        const base64Creds = btoa(
          `${credentials.username}:${credentials.password}`
        );
        headers.Authorization = `Basic ${base64Creds}`;
      }

      // Make test API call
      const response = await fetch(testUrl.toString(), {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(10_000), // 10 second timeout
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;

        // Provide helpful error messages for common cases
        if (response.status === 401) {
          errorMessage = "Invalid credentials (401 Unauthorized)";
        } else if (response.status === 403) {
          errorMessage = "Access forbidden (403 Forbidden)";
        } else if (response.status === 404) {
          errorMessage = "Endpoint not found (404 Not Found)";
        } else if (response.status === 429) {
          errorMessage = "Rate limit exceeded (429 Too Many Requests)";
        } else if (response.status >= 500) {
          errorMessage = `Server error (${response.status})`;
        }

        return {
          success: false,
          message: errorMessage,
          responseTime,
        };
      }

      // Connection successful
      return {
        success: true,
        message: `Connection successful! Fetched data from ${connector.name}`,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (error instanceof Error) {
        // Handle specific error types
        if (error.name === "TimeoutError") {
          return {
            success: false,
            message: "Request timed out after 10 seconds",
            responseTime,
          };
        }

        if (error.message.includes("fetch failed")) {
          return {
            success: false,
            message: "Network error - could not reach endpoint",
            responseTime,
          };
        }

        return {
          success: false,
          message: error.message,
          responseTime,
        };
      }

      return {
        success: false,
        message: "Unknown error occurred",
        responseTime,
      };
    }
  },
});
