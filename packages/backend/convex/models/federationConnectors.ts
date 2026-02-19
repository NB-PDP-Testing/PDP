/**
 * Federation Connector CRUD operations
 *
 * Manages federation connector configurations for external sports management systems.
 * Handles credential encryption/storage, organization connections, and connector health.
 */

import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  action,
  internalMutation,
  mutation,
  query,
} from "../_generated/server";
import {
  encryptCredentials,
  type FederationCredentials,
} from "../lib/federation/encryption";

// ===== Create Connector =====

export const createConnector = action({
  args: {
    name: v.string(),
    federationCode: v.string(),
    authType: v.union(
      v.literal("oauth2"),
      v.literal("api_key"),
      v.literal("basic")
    ),
    credentials: v.any(), // FederationCredentials object (will be encrypted)
    endpoints: v.object({
      membershipList: v.string(),
      memberDetail: v.optional(v.string()),
      webhookSecret: v.optional(v.string()),
    }),
    syncConfig: v.object({
      enabled: v.boolean(),
      schedule: v.optional(v.string()),
      conflictStrategy: v.string(),
    }),
    templateId: v.id("importTemplates"),
  },
  returns: v.id("federationConnectors"),
  handler: async (ctx, args): Promise<Id<"federationConnectors">> => {
    // Encrypt credentials
    const encryptedData = await encryptCredentials(
      args.credentials as FederationCredentials
    );

    // Store encrypted credentials in file storage
    const credentialsBlob = new Blob([encryptedData], {
      type: "application/octet-stream",
    });
    const credentialsStorageId = await ctx.storage.store(credentialsBlob);

    // Create connector record via mutation
    const connectorId: Id<"federationConnectors"> = await ctx.runMutation(
      internal.models.federationConnectors.createConnectorInternal,
      {
        name: args.name,
        federationCode: args.federationCode,
        authType: args.authType,
        credentialsStorageId,
        endpoints: args.endpoints,
        syncConfig: args.syncConfig,
        templateId: args.templateId,
      }
    );

    return connectorId;
  },
});

// ===== Internal: Create Connector Record =====

export const createConnectorInternal = internalMutation({
  args: {
    name: v.string(),
    federationCode: v.string(),
    authType: v.union(
      v.literal("oauth2"),
      v.literal("api_key"),
      v.literal("basic")
    ),
    credentialsStorageId: v.id("_storage"),
    endpoints: v.object({
      membershipList: v.string(),
      memberDetail: v.optional(v.string()),
      webhookSecret: v.optional(v.string()),
    }),
    syncConfig: v.object({
      enabled: v.boolean(),
      schedule: v.optional(v.string()),
      conflictStrategy: v.string(),
    }),
    templateId: v.id("importTemplates"),
  },
  returns: v.id("federationConnectors"),
  handler: async (ctx, args) => {
    const connectorId = await ctx.db.insert("federationConnectors", {
      name: args.name,
      federationCode: args.federationCode,
      status: "inactive", // Start inactive until tested
      authType: args.authType,
      credentialsStorageId: args.credentialsStorageId,
      endpoints: args.endpoints,
      syncConfig: args.syncConfig,
      templateId: args.templateId,
      connectedOrganizations: [],
      consecutiveFailures: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return connectorId;
  },
});

// ===== Update Connector =====

export const updateConnector = mutation({
  args: {
    connectorId: v.id("federationConnectors"),
    name: v.optional(v.string()),
    endpoints: v.optional(
      v.object({
        membershipList: v.string(),
        memberDetail: v.optional(v.string()),
        webhookSecret: v.optional(v.string()),
      })
    ),
    syncConfig: v.optional(
      v.object({
        enabled: v.boolean(),
        schedule: v.optional(v.string()),
        conflictStrategy: v.string(),
      })
    ),
    templateId: v.optional(v.id("importTemplates")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { connectorId, ...updates } = args;

    await ctx.db.patch(connectorId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ===== Update Connector Credentials =====

export const updateConnectorCredentials = action({
  args: {
    connectorId: v.id("federationConnectors"),
    credentials: v.any(), // FederationCredentials object (will be encrypted)
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify connector exists
    const connector = await ctx.runQuery(
      api.models.federationConnectors.getConnector,
      { connectorId: args.connectorId }
    );
    if (!connector) {
      throw new Error("Connector not found");
    }

    // Encrypt new credentials
    const encryptedData = await encryptCredentials(
      args.credentials as FederationCredentials
    );

    // Store encrypted credentials in file storage
    const credentialsBlob = new Blob([encryptedData], {
      type: "application/octet-stream",
    });
    const credentialsStorageId = await ctx.storage.store(credentialsBlob);

    // Update connector with new credentials storage ID via mutation
    // Note: Old credentials file is NOT deleted (keep for audit trail)
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

// ===== Internal: Update Connector Credentials =====

export const updateConnectorCredentialsInternal = internalMutation({
  args: {
    connectorId: v.id("federationConnectors"),
    credentialsStorageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectorId, {
      credentialsStorageId: args.credentialsStorageId,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ===== Delete Connector =====

export const deleteConnector = mutation({
  args: {
    connectorId: v.id("federationConnectors"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Hard delete the connector record.
    // Do NOT delete the credentials file in storage (keep for audit trail).
    await ctx.db.delete(args.connectorId);

    return null;
  },
});

// ===== Get Connector =====

export const getConnector = query({
  args: {
    connectorId: v.id("federationConnectors"),
  },
  returns: v.union(
    v.object({
      _id: v.id("federationConnectors"),
      _creationTime: v.number(),
      name: v.string(),
      federationCode: v.string(),
      status: v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("error")
      ),
      authType: v.union(
        v.literal("oauth2"),
        v.literal("api_key"),
        v.literal("basic")
      ),
      credentialsStorageId: v.id("_storage"),
      endpoints: v.object({
        membershipList: v.string(),
        memberDetail: v.optional(v.string()),
        webhookSecret: v.optional(v.string()),
      }),
      syncConfig: v.object({
        enabled: v.boolean(),
        schedule: v.optional(v.string()),
        conflictStrategy: v.string(),
      }),
      templateId: v.id("importTemplates"),
      connectedOrganizations: v.array(
        v.object({
          organizationId: v.string(),
          federationOrgId: v.string(),
          enabledAt: v.number(),
          lastSyncAt: v.optional(v.number()),
        })
      ),
      lastErrorAt: v.optional(v.number()),
      lastSuccessAt: v.optional(v.number()),
      consecutiveFailures: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const connector = await ctx.db.get(args.connectorId);

    // SECURITY: Never return decrypted credentials in queries
    // Credentials should only be decrypted in actions when making API calls
    return connector;
  },
});

// ===== List Connectors =====

export const listConnectors = query({
  args: {
    status: v.optional(
      v.union(v.literal("active"), v.literal("inactive"), v.literal("error"))
    ),
  },
  returns: v.array(
    v.object({
      _id: v.id("federationConnectors"),
      _creationTime: v.number(),
      name: v.string(),
      federationCode: v.string(),
      status: v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("error")
      ),
      authType: v.union(
        v.literal("oauth2"),
        v.literal("api_key"),
        v.literal("basic")
      ),
      credentialsStorageId: v.id("_storage"),
      endpoints: v.object({
        membershipList: v.string(),
        memberDetail: v.optional(v.string()),
        webhookSecret: v.optional(v.string()),
      }),
      syncConfig: v.object({
        enabled: v.boolean(),
        schedule: v.optional(v.string()),
        conflictStrategy: v.string(),
      }),
      templateId: v.id("importTemplates"),
      connectedOrganizations: v.array(
        v.object({
          organizationId: v.string(),
          federationOrgId: v.string(),
          enabledAt: v.number(),
          lastSyncAt: v.optional(v.number()),
        })
      ),
      lastErrorAt: v.optional(v.number()),
      lastSuccessAt: v.optional(v.number()),
      consecutiveFailures: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    if (args.status) {
      // Use index to filter by status
      const status = args.status;
      return await ctx.db
        .query("federationConnectors")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    }

    // Return all connectors
    return await ctx.db.query("federationConnectors").collect();
  },
});

// ===== Connect Organization to Connector =====

export const connectOrganization = mutation({
  args: {
    connectorId: v.id("federationConnectors"),
    organizationId: v.string(), // Better Auth organization ID
    federationOrgId: v.string(), // External federation organization ID
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connector = await ctx.db.get(args.connectorId);
    if (!connector) {
      throw new Error("Connector not found");
    }

    // Check if organization already connected
    const alreadyConnected = connector.connectedOrganizations.some(
      (org) => org.organizationId === args.organizationId
    );

    if (alreadyConnected) {
      throw new Error("Organization already connected to this connector");
    }

    // Add organization to connectedOrganizations array
    const updatedOrgs = [
      ...connector.connectedOrganizations,
      {
        organizationId: args.organizationId,
        federationOrgId: args.federationOrgId,
        enabledAt: Date.now(),
        // lastSyncAt is optional and starts undefined
      },
    ];

    await ctx.db.patch(args.connectorId, {
      connectedOrganizations: updatedOrgs,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ===== Disconnect Organization from Connector =====

export const disconnectOrganization = mutation({
  args: {
    connectorId: v.id("federationConnectors"),
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connector = await ctx.db.get(args.connectorId);
    if (!connector) {
      throw new Error("Connector not found");
    }

    // Remove organization from array
    // Note: Does NOT delete sync history (keep audit trail)
    const updatedOrgs = connector.connectedOrganizations.filter(
      (org) => org.organizationId !== args.organizationId
    );

    await ctx.db.patch(args.connectorId, {
      connectedOrganizations: updatedOrgs,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ===== Update Last Sync Time =====

export const updateLastSyncTime = mutation({
  args: {
    connectorId: v.id("federationConnectors"),
    organizationId: v.string(),
    lastSyncAt: v.number(), // Unix timestamp
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connector = await ctx.db.get(args.connectorId);
    if (!connector) {
      throw new Error("Connector not found");
    }

    // Update lastSyncAt for specific organization
    const updatedOrgs = connector.connectedOrganizations.map((org) => {
      if (org.organizationId === args.organizationId) {
        return {
          ...org,
          lastSyncAt: args.lastSyncAt,
        };
      }
      return org;
    });

    await ctx.db.patch(args.connectorId, {
      connectedOrganizations: updatedOrgs,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ===== Get Connected Organizations =====

export const getConnectedOrganizations = query({
  args: {
    connectorId: v.id("federationConnectors"),
  },
  returns: v.array(
    v.object({
      organizationId: v.string(),
      federationOrgId: v.string(),
      enabledAt: v.number(),
      lastSyncAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const connector = await ctx.db.get(args.connectorId);
    if (!connector) {
      return [];
    }

    return connector.connectedOrganizations;
  },
});

// ===== Get Organization Connectors =====

export const getOrganizationConnectors = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("federationConnectors"),
      _creationTime: v.number(),
      name: v.string(),
      federationCode: v.string(),
      status: v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("error")
      ),
      authType: v.union(
        v.literal("oauth2"),
        v.literal("api_key"),
        v.literal("basic")
      ),
      credentialsStorageId: v.id("_storage"),
      endpoints: v.object({
        membershipList: v.string(),
        memberDetail: v.optional(v.string()),
        webhookSecret: v.optional(v.string()),
      }),
      syncConfig: v.object({
        enabled: v.boolean(),
        schedule: v.optional(v.string()),
        conflictStrategy: v.string(),
      }),
      templateId: v.id("importTemplates"),
      connectedOrganizations: v.array(
        v.object({
          organizationId: v.string(),
          federationOrgId: v.string(),
          enabledAt: v.number(),
          lastSyncAt: v.optional(v.number()),
        })
      ),
      lastErrorAt: v.optional(v.number()),
      lastSuccessAt: v.optional(v.number()),
      consecutiveFailures: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get all connectors
    const allConnectors = await ctx.db.query("federationConnectors").collect();

    // Filter to those connected to this organization
    const connectedConnectors = allConnectors.filter((connector) =>
      connector.connectedOrganizations.some(
        (org) => org.organizationId === args.organizationId
      )
    );

    return connectedConnectors;
  },
});

// ===== Update Connector Status =====

export const updateConnectorStatus = mutation({
  args: {
    connectorId: v.id("federationConnectors"),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("error")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectorId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ===== Record Connector Error =====

export const recordConnectorError = mutation({
  args: {
    connectorId: v.id("federationConnectors"),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connector = await ctx.db.get(args.connectorId);
    if (!connector) {
      throw new Error("Connector not found");
    }

    const consecutiveFailures = (connector.consecutiveFailures || 0) + 1;
    const updates: {
      lastErrorAt: number;
      consecutiveFailures: number;
      updatedAt: number;
      status?: "error";
    } = {
      lastErrorAt: Date.now(),
      consecutiveFailures,
      updatedAt: Date.now(),
    };

    // Auto-disable connector after 5 consecutive failures
    if (consecutiveFailures >= 5) {
      updates.status = "error";
    }

    await ctx.db.patch(args.connectorId, updates);

    // TODO: Log error message to error log (capped at 50 errors)
    // For now, just tracking the count and timestamp

    return null;
  },
});

// ===== Record Connector Success =====

export const recordConnectorSuccess = mutation({
  args: {
    connectorId: v.id("federationConnectors"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectorId, {
      lastSuccessAt: Date.now(),
      consecutiveFailures: 0, // Reset failure counter on success
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ===== Clear Connector Errors =====

export const clearConnectorErrors = mutation({
  args: {
    connectorId: v.id("federationConnectors"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectorId, {
      consecutiveFailures: 0,
      status: "active", // Re-enable connector
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ===== Get Connector Health =====

export const getConnectorHealth = query({
  args: {
    connectorId: v.id("federationConnectors"),
  },
  returns: v.union(
    v.object({
      connectorId: v.id("federationConnectors"),
      name: v.string(),
      status: v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("error")
      ),
      lastErrorAt: v.optional(v.number()),
      lastSuccessAt: v.optional(v.number()),
      consecutiveFailures: v.number(),
      // Health metrics
      uptimePercentage: v.number(), // Percentage of successful syncs
      lastSyncTime: v.optional(v.number()), // Most recent sync across all connected orgs
      errorRate: v.number(), // Failures in last 24 hours
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const connector = await ctx.db.get(args.connectorId);
    if (!connector) {
      return null;
    }

    // Calculate health metrics
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    // Find most recent sync time across all connected organizations
    const lastSyncTimes = connector.connectedOrganizations
      .map((org) => org.lastSyncAt)
      .filter((t): t is number => t !== undefined);
    const lastSyncTime =
      lastSyncTimes.length > 0 ? Math.max(...lastSyncTimes) : undefined;

    // Simple uptime calculation based on recent activity
    // If no recent errors, 100%; if currently in error state, calculate based on failure count
    let uptimePercentage = 100;
    if (connector.status === "error") {
      uptimePercentage = Math.max(
        0,
        100 - (connector.consecutiveFailures || 0) * 20
      );
    } else if (connector.consecutiveFailures) {
      uptimePercentage = Math.max(
        0,
        100 - (connector.consecutiveFailures || 0) * 10
      );
    }

    // Error rate: approximate based on consecutive failures and timestamps
    // (In production, would track detailed error log)
    let errorRate = 0;
    if (connector.lastErrorAt && connector.lastErrorAt > dayAgo) {
      errorRate = connector.consecutiveFailures || 0;
    }

    return {
      connectorId: connector._id,
      name: connector.name,
      status: connector.status,
      lastErrorAt: connector.lastErrorAt,
      lastSuccessAt: connector.lastSuccessAt,
      consecutiveFailures: connector.consecutiveFailures || 0,
      uptimePercentage,
      lastSyncTime,
      errorRate,
    };
  },
});

// ===== Webhook Support =====

/**
 * Log webhook event for debugging and audit trail
 */
export const logWebhook = internalMutation({
  args: {
    connectorId: v.id("federationConnectors"),
    organizationId: v.string(),
    event: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("deleted")
    ),
    memberId: v.string(),
    federationOrgId: v.string(),
    receivedAt: v.number(),
    processedAt: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  returns: v.id("webhookLogs"),
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("webhookLogs", {
      connectorId: args.connectorId,
      organizationId: args.organizationId,
      event: args.event,
      memberId: args.memberId,
      federationOrgId: args.federationOrgId,
      receivedAt: args.receivedAt,
      processedAt: args.processedAt,
      processingTimeMs: args.processedAt - args.receivedAt,
      success: args.success,
      error: args.error,
    });

    console.log(`[Webhook Log] Logged webhook event: ${logId}`, {
      connector: args.connectorId,
      event: args.event,
      success: args.success,
    });

    return logId;
  },
});

/**
 * Log webhook security event (invalid signature, rate limit exceeded)
 */
export const logWebhookSecurityEvent = internalMutation({
  args: {
    connectorId: v.id("federationConnectors"),
    event: v.union(
      v.literal("invalid_signature"),
      v.literal("rate_limit_exceeded")
    ),
    details: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.warn(
      `[Webhook Security] ${args.event} for connector ${args.connectorId}`,
      {
        details: args.details,
      }
    );

    // Could store in security log table if needed
    // For now, just log to console

    // Update connector health if too many invalid signatures
    if (args.event === "invalid_signature") {
      const connector = await ctx.db.get(args.connectorId);
      if (!connector) {
        return null;
      }

      // Auto-disable connector after 10 invalid signatures in a row
      const invalidSignatureCount = (connector.invalidSignatureCount || 0) + 1;
      if (invalidSignatureCount >= 10) {
        await ctx.db.patch(args.connectorId, {
          status: "error",
          lastErrorAt: Date.now(),
          lastError:
            "Too many invalid webhook signatures - connector auto-disabled",
          invalidSignatureCount,
        });
        console.error(
          `[Webhook Security] Auto-disabled connector ${args.connectorId} after ${invalidSignatureCount} invalid signatures`
        );
      } else {
        await ctx.db.patch(args.connectorId, {
          invalidSignatureCount,
        });
      }
    }

    return null;
  },
});

/**
 * Check webhook rate limit for connector
 * Returns true if within limit, false if exceeded
 */
export const checkWebhookRateLimit = internalMutation({
  args: {
    connectorId: v.id("federationConnectors"),
    limit: v.number(), // max webhooks per window
    windowMs: v.number(), // time window in milliseconds
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const windowStart = now - args.windowMs;

    // Count recent webhook events for this connector
    const recentWebhooks = await ctx.db
      .query("webhookLogs")
      .withIndex("by_connector_and_time", (q) =>
        q.eq("connectorId", args.connectorId).gte("receivedAt", windowStart)
      )
      .collect();

    const count = recentWebhooks.length;

    if (count >= args.limit) {
      console.warn(
        `[Rate Limit] Connector ${args.connectorId} exceeded webhook rate limit: ${count}/${args.limit} in last ${args.windowMs}ms`
      );
      return false;
    }

    console.log(
      `[Rate Limit] Connector ${args.connectorId} webhook count: ${count}/${args.limit}`
    );

    return true;
  },
});
