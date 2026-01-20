/**
 * AI Model Configuration - Queries and Mutations
 *
 * Manages AI model settings per feature with platform-wide defaults
 * and optional per-organization overrides.
 *
 * Platform Staff can manage via /platform/ai-config
 */

import { v } from "convex/values";
import { internalQuery, mutation, query } from "../_generated/server";

// Feature type for validation
const featureValidator = v.union(
  v.literal("voice_transcription"),
  v.literal("voice_insights"),
  v.literal("sensitivity_classification"),
  v.literal("parent_summary"),
  v.literal("session_plan"),
  v.literal("recommendations"),
  v.literal("comparison_insights")
);

// Provider type for validation
const providerValidator = v.union(
  v.literal("openai"),
  v.literal("anthropic"),
  v.literal("openrouter")
);

// Scope type for validation
const scopeValidator = v.union(
  v.literal("platform"),
  v.literal("organization")
);

/**
 * Get AI config for a specific feature
 * Returns org-specific config if exists, otherwise platform default
 */
export const getConfigForFeature = query({
  args: {
    feature: featureValidator,
    organizationId: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      _id: v.id("aiModelConfig"),
      feature: v.string(),
      scope: v.string(),
      organizationId: v.optional(v.string()),
      provider: v.string(),
      modelId: v.string(),
      maxTokens: v.optional(v.number()),
      temperature: v.optional(v.number()),
      isActive: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // First, try to find org-specific config
    if (args.organizationId) {
      const orgConfig = await ctx.db
        .query("aiModelConfig")
        .withIndex("by_feature_scope_org", (q) =>
          q
            .eq("feature", args.feature)
            .eq("scope", "organization")
            .eq("organizationId", args.organizationId)
        )
        .first();

      if (orgConfig?.isActive) {
        return {
          _id: orgConfig._id,
          feature: orgConfig.feature,
          scope: orgConfig.scope,
          organizationId: orgConfig.organizationId,
          provider: orgConfig.provider,
          modelId: orgConfig.modelId,
          maxTokens: orgConfig.maxTokens,
          temperature: orgConfig.temperature,
          isActive: orgConfig.isActive,
        };
      }
    }

    // Fall back to platform default
    const platformConfig = await ctx.db
      .query("aiModelConfig")
      .withIndex("by_feature_and_scope", (q) =>
        q.eq("feature", args.feature).eq("scope", "platform")
      )
      .first();

    if (!platformConfig?.isActive) {
      return null;
    }

    return {
      _id: platformConfig._id,
      feature: platformConfig.feature,
      scope: platformConfig.scope,
      organizationId: platformConfig.organizationId,
      provider: platformConfig.provider,
      modelId: platformConfig.modelId,
      maxTokens: platformConfig.maxTokens,
      temperature: platformConfig.temperature,
      isActive: platformConfig.isActive,
    };
  },
});

/**
 * Internal query for use in actions (can't use regular queries)
 */
export const getConfigForFeatureInternal = internalQuery({
  args: {
    feature: featureValidator,
    organizationId: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      provider: v.string(),
      modelId: v.string(),
      maxTokens: v.optional(v.number()),
      temperature: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // First, try to find org-specific config
    if (args.organizationId) {
      const orgConfig = await ctx.db
        .query("aiModelConfig")
        .withIndex("by_feature_scope_org", (q) =>
          q
            .eq("feature", args.feature)
            .eq("scope", "organization")
            .eq("organizationId", args.organizationId)
        )
        .first();

      if (orgConfig?.isActive) {
        return {
          provider: orgConfig.provider,
          modelId: orgConfig.modelId,
          maxTokens: orgConfig.maxTokens,
          temperature: orgConfig.temperature,
        };
      }
    }

    // Fall back to platform default
    const platformConfig = await ctx.db
      .query("aiModelConfig")
      .withIndex("by_feature_and_scope", (q) =>
        q.eq("feature", args.feature).eq("scope", "platform")
      )
      .first();

    if (!platformConfig?.isActive) {
      return null;
    }

    return {
      provider: platformConfig.provider,
      modelId: platformConfig.modelId,
      maxTokens: platformConfig.maxTokens,
      temperature: platformConfig.temperature,
    };
  },
});

/**
 * Get all platform-wide AI configs (for Platform Staff UI)
 */
export const getAllPlatformConfigs = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("aiModelConfig"),
      feature: v.string(),
      scope: v.string(),
      provider: v.string(),
      modelId: v.string(),
      maxTokens: v.optional(v.number()),
      temperature: v.optional(v.number()),
      isActive: v.boolean(),
      updatedBy: v.string(),
      updatedAt: v.number(),
      notes: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const configs = await ctx.db
      .query("aiModelConfig")
      .withIndex("by_scope", (q) => q.eq("scope", "platform"))
      .collect();

    return configs.map((c) => ({
      _id: c._id,
      feature: c.feature,
      scope: c.scope,
      provider: c.provider,
      modelId: c.modelId,
      maxTokens: c.maxTokens,
      temperature: c.temperature,
      isActive: c.isActive,
      updatedBy: c.updatedBy,
      updatedAt: c.updatedAt,
      notes: c.notes,
    }));
  },
});

/**
 * Get organization-specific overrides
 */
export const getOrgOverrides = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("aiModelConfig"),
      feature: v.string(),
      provider: v.string(),
      modelId: v.string(),
      maxTokens: v.optional(v.number()),
      temperature: v.optional(v.number()),
      isActive: v.boolean(),
      updatedBy: v.string(),
      updatedAt: v.number(),
      notes: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const configs = await ctx.db
      .query("aiModelConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return configs.map((c) => ({
      _id: c._id,
      feature: c.feature,
      provider: c.provider,
      modelId: c.modelId,
      maxTokens: c.maxTokens,
      temperature: c.temperature,
      isActive: c.isActive,
      updatedBy: c.updatedBy,
      updatedAt: c.updatedAt,
      notes: c.notes,
    }));
  },
});

/**
 * Create or update AI config (Platform Staff only)
 */
export const upsertConfig = mutation({
  args: {
    feature: featureValidator,
    scope: scopeValidator,
    organizationId: v.optional(v.string()),
    provider: providerValidator,
    modelId: v.string(),
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
    userId: v.string(), // Who is making the change
  },
  returns: v.id("aiModelConfig"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find existing config
    let existingConfig: {
      _id: import("../_generated/dataModel").Id<"aiModelConfig">;
      feature: string;
      scope: string;
      organizationId?: string;
      provider: string;
      modelId: string;
      maxTokens?: number;
      temperature?: number;
      isActive: boolean;
      updatedBy: string;
      updatedAt: number;
      createdAt: number;
      notes?: string;
    } | null = null;
    if (args.scope === "organization" && args.organizationId) {
      existingConfig = await ctx.db
        .query("aiModelConfig")
        .withIndex("by_feature_scope_org", (q) =>
          q
            .eq("feature", args.feature)
            .eq("scope", "organization")
            .eq("organizationId", args.organizationId)
        )
        .first();
    } else {
      existingConfig = await ctx.db
        .query("aiModelConfig")
        .withIndex("by_feature_and_scope", (q) =>
          q.eq("feature", args.feature).eq("scope", "platform")
        )
        .first();
    }

    if (existingConfig) {
      // Log the change
      await ctx.db.insert("aiModelConfigLog", {
        configId: existingConfig._id,
        feature: args.feature,
        action: "updated",
        previousValue: {
          provider: existingConfig.provider,
          modelId: existingConfig.modelId,
          maxTokens: existingConfig.maxTokens,
          temperature: existingConfig.temperature,
          isActive: existingConfig.isActive,
        },
        newValue: {
          provider: args.provider,
          modelId: args.modelId,
          maxTokens: args.maxTokens,
          temperature: args.temperature,
          isActive: args.isActive,
        },
        changedBy: args.userId,
        changedAt: now,
        reason: args.notes,
      });

      // Update existing
      await ctx.db.patch(existingConfig._id, {
        provider: args.provider,
        modelId: args.modelId,
        maxTokens: args.maxTokens,
        temperature: args.temperature,
        isActive: args.isActive,
        notes: args.notes,
        updatedBy: args.userId,
        updatedAt: now,
      });

      return existingConfig._id;
    }

    // Create new config
    const configId = await ctx.db.insert("aiModelConfig", {
      feature: args.feature,
      scope: args.scope,
      organizationId: args.organizationId,
      provider: args.provider,
      modelId: args.modelId,
      maxTokens: args.maxTokens,
      temperature: args.temperature,
      isActive: args.isActive,
      notes: args.notes,
      updatedBy: args.userId,
      updatedAt: now,
      createdAt: now,
    });

    // Log the creation
    await ctx.db.insert("aiModelConfigLog", {
      configId,
      feature: args.feature,
      action: "created",
      newValue: {
        provider: args.provider,
        modelId: args.modelId,
        maxTokens: args.maxTokens,
        temperature: args.temperature,
        isActive: args.isActive,
      },
      changedBy: args.userId,
      changedAt: now,
      reason: args.notes,
    });

    return configId;
  },
});

/**
 * Delete an organization override (returns to platform default)
 */
export const deleteOrgOverride = mutation({
  args: {
    configId: v.id("aiModelConfig"),
    userId: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const config = await ctx.db.get(args.configId);

    if (!config || config.scope !== "organization") {
      return false;
    }

    // Log the deletion
    await ctx.db.insert("aiModelConfigLog", {
      configId: args.configId,
      feature: config.feature,
      action: "deactivated",
      previousValue: {
        provider: config.provider,
        modelId: config.modelId,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        isActive: config.isActive,
      },
      newValue: {
        provider: config.provider,
        modelId: config.modelId,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        isActive: false,
      },
      changedBy: args.userId,
      changedAt: Date.now(),
      reason: args.reason || "Override removed, returning to platform default",
    });

    await ctx.db.delete(args.configId);
    return true;
  },
});

/**
 * Get change log for a specific config
 */
export const getConfigChangeLog = query({
  args: {
    configId: v.id("aiModelConfig"),
  },
  returns: v.array(
    v.object({
      _id: v.id("aiModelConfigLog"),
      action: v.string(),
      previousValue: v.optional(v.any()),
      newValue: v.any(),
      changedBy: v.string(),
      changedAt: v.number(),
      reason: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("aiModelConfigLog")
      .withIndex("by_config", (q) => q.eq("configId", args.configId))
      .order("desc")
      .collect();

    return logs.map((log) => ({
      _id: log._id,
      action: log.action,
      previousValue: log.previousValue,
      newValue: log.newValue,
      changedBy: log.changedBy,
      changedAt: log.changedAt,
      reason: log.reason,
    }));
  },
});

/**
 * Seed default platform configs (run once on setup)
 * Can be called from Platform Staff UI
 */
export const seedDefaultConfigs = mutation({
  args: {
    userId: v.string(), // Platform staff user ID
  },
  returns: v.number(), // Number of configs created
  handler: async (ctx, args) => {
    const now = Date.now();
    let created = 0;

    const defaults = [
      {
        feature: "voice_transcription" as const,
        provider: "openai" as const,
        modelId: "gpt-4o-mini-transcribe",
      },
      {
        feature: "voice_insights" as const,
        provider: "openai" as const,
        modelId: "gpt-4o",
      },
      {
        feature: "sensitivity_classification" as const,
        provider: "anthropic" as const,
        modelId: "claude-3-5-haiku-20241022",
        maxTokens: 500,
      },
      {
        feature: "parent_summary" as const,
        provider: "anthropic" as const,
        modelId: "claude-3-5-haiku-20241022",
        maxTokens: 500,
      },
      {
        feature: "session_plan" as const,
        provider: "anthropic" as const,
        modelId: "claude-3-5-haiku-20241022",
        maxTokens: 1200,
        temperature: 0.7,
      },
      {
        feature: "recommendations" as const,
        provider: "anthropic" as const,
        modelId: "claude-3-5-haiku-20241022",
        maxTokens: 1500,
        temperature: 0.7,
      },
      {
        feature: "comparison_insights" as const,
        provider: "anthropic" as const,
        modelId: "claude-3-5-haiku-20241022",
        maxTokens: 2000,
        temperature: 0.7,
      },
    ];

    for (const config of defaults) {
      // Check if platform config already exists
      const existing = await ctx.db
        .query("aiModelConfig")
        .withIndex("by_feature_and_scope", (q) =>
          q.eq("feature", config.feature).eq("scope", "platform")
        )
        .first();

      if (!existing) {
        await ctx.db.insert("aiModelConfig", {
          feature: config.feature,
          scope: "platform",
          provider: config.provider,
          modelId: config.modelId,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          isActive: true,
          updatedBy: args.userId,
          updatedAt: now,
          createdAt: now,
          notes: "Initial platform default",
        });
        created += 1;
      }
    }

    return created;
  },
});
