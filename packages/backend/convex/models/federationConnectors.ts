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

// ===== Delete Connector (Soft Delete) =====

export const deleteConnector = mutation({
  args: {
    connectorId: v.id("federationConnectors"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Soft delete: set status to inactive
    // Do NOT delete credentials file (keep for audit trail)
    await ctx.db.patch(args.connectorId, {
      status: "inactive",
      updatedAt: Date.now(),
    });

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
