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
    tokenEndpoint: v.string(),
    redirectUri: v.string(),
    clientId: v.string(),
    clientSecret: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Validate state (CSRF protection)
    if (args.state !== args.expectedState) {
      throw new Error("Invalid state parameter - possible CSRF attack");
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(args.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: args.code,
        redirect_uri: args.redirectUri,
        client_id: args.clientId,
        client_secret: args.clientSecret,
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
