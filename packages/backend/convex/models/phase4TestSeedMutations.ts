// @ts-nocheck
/**
 * Internal mutations for Phase 4 test data seeding
 *
 * These are called by the main seedPhase4TestData action.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const createTestImportTemplate = internalMutation({
  args: {},
  returns: v.id("importTemplates"),
  handler: async (ctx) => {
    // Check if test template already exists
    const allTemplates = await ctx.db.query("importTemplates").collect();
    const existing = allTemplates.find(
      (t) => t.name === "[TEST] Phase 4 Template"
    );

    if (existing) {
      return existing._id;
    }

    // Create new test template
    const templateId = await ctx.db.insert("importTemplates", {
      name: "[TEST] Phase 4 Template",
      description: "Test import template for Phase 4 seed data",
      createdBy: "system",
      organizationId: "system",
      scope: "platform",
      sourceType: "csv",
      columnMappings: [
        {
          sourcePattern: "firstName",
          targetField: "firstName",
          required: true,
        },
        {
          sourcePattern: "lastName",
          targetField: "lastName",
          required: true,
        },
        {
          sourcePattern: "email",
          targetField: "email",
          required: false,
        },
      ],
      skillInitialization: {
        strategy: "middle",
      },
      defaults: {
        createTeams: false,
        createPassports: true,
      },
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return templateId;
  },
});

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
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("error")
    ),
    consecutiveFailures: v.number(),
    lastSuccessAt: v.optional(v.number()),
    lastErrorAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
  },
  returns: v.id("federationConnectors"),
  handler: async (ctx, args) => {
    const connectorId = await ctx.db.insert("federationConnectors", {
      name: args.name,
      federationCode: args.federationCode,
      status: args.status,
      authType: args.authType,
      credentialsStorageId: args.credentialsStorageId,
      endpoints: args.endpoints,
      syncConfig: args.syncConfig,
      templateId: args.templateId,
      connectedOrganizations: [],
      consecutiveFailures: args.consecutiveFailures,
      lastSuccessAt: args.lastSuccessAt,
      lastErrorAt: args.lastErrorAt,
      lastError: args.lastError,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return connectorId;
  },
});

export const connectOrganizationInternal = internalMutation({
  args: {
    connectorId: v.id("federationConnectors"),
    organizationId: v.string(),
    federationOrgId: v.string(),
    enabledAt: v.number(),
    lastSyncAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connector = await ctx.db.get(args.connectorId);
    if (!connector) {
      throw new Error("Connector not found");
    }

    await ctx.db.patch(args.connectorId, {
      connectedOrganizations: [
        ...connector.connectedOrganizations,
        {
          organizationId: args.organizationId,
          federationOrgId: args.federationOrgId,
          enabledAt: args.enabledAt,
          lastSyncAt: args.lastSyncAt,
        },
      ],
    });

    return null;
  },
});

export const createSyncHistoryInternal = internalMutation({
  args: {
    connectorId: v.id("federationConnectors"),
    organizationId: v.string(),
    syncType: v.union(
      v.literal("scheduled"),
      v.literal("manual"),
      v.literal("webhook")
    ),
    status: v.union(v.literal("completed"), v.literal("failed")),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    stats: v.object({
      playersProcessed: v.number(),
      playersCreated: v.number(),
      playersUpdated: v.number(),
      conflictsDetected: v.number(),
      conflictsResolved: v.number(),
      errors: v.number(),
    }),
    error: v.optional(v.string()),
    conflictDetails: v.array(
      v.object({
        playerId: v.string(),
        playerName: v.string(),
        conflicts: v.array(
          v.object({
            field: v.string(),
            federationValue: v.optional(v.string()),
            localValue: v.optional(v.string()),
            resolvedValue: v.optional(v.string()),
            strategy: v.string(),
          })
        ),
      })
    ),
  },
  returns: v.id("syncHistory"),
  handler: async (ctx, args) => {
    const syncId = await ctx.db.insert("syncHistory", {
      connectorId: args.connectorId,
      organizationId: args.organizationId,
      syncType: args.syncType,
      status: args.status,
      startedAt: args.startedAt,
      completedAt: args.completedAt,
      stats: args.stats,
      conflictDetails: args.conflictDetails,
      errors: args.error
        ? [
            {
              error: args.error,
              timestamp: Date.now(),
            },
          ]
        : undefined,
    });

    return syncId;
  },
});

export const createAiCacheEntryInternal = internalMutation({
  args: {
    columnPattern: v.string(),
    sampleValues: v.array(v.string()),
    suggestedField: v.string(),
    confidence: v.number(),
    reasoning: v.string(),
    expiresAt: v.number(),
  },
  returns: v.id("aiMappingCache"),
  handler: async (ctx, args) => {
    const cacheId = await ctx.db.insert("aiMappingCache", {
      columnPattern: args.columnPattern,
      sampleValues: args.sampleValues,
      suggestedField: args.suggestedField,
      confidence: args.confidence,
      reasoning: args.reasoning,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });

    return cacheId;
  },
});

export const createWebhookLogInternal = internalMutation({
  args: {
    connectorId: v.id("federationConnectors"),
    organizationId: v.string(),
    federationOrgId: v.string(),
    memberId: v.string(),
    event: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("deleted")
    ),
    receivedAt: v.number(),
    processedAt: v.number(),
    processingTimeMs: v.number(),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  returns: v.id("webhookLogs"),
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("webhookLogs", {
      connectorId: args.connectorId,
      organizationId: args.organizationId,
      federationOrgId: args.federationOrgId,
      memberId: args.memberId,
      event: args.event,
      receivedAt: args.receivedAt,
      processedAt: args.processedAt,
      processingTimeMs: args.processingTimeMs,
      success: args.success,
      error: args.error,
    });

    return logId;
  },
});
