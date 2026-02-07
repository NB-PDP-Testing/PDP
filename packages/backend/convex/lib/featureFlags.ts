/**
 * Feature Flags - Cascading Flag Evaluation
 *
 * Supports a 4-level cascade (first match wins):
 *   1. Environment variable override (VOICE_NOTES_V2_GLOBAL)
 *   2. Platform-wide flag (scope = "platform")
 *   3. Organization-specific flag (scope = "organization")
 *   4. User-specific flag (scope = "user")
 *   5. Default: false
 *
 * Pattern follows aiModelConfig cascade (see models/aiModelConfig.ts).
 * All functions are internal (server-to-server only).
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

const scopeValidator = v.union(
  v.literal("platform"),
  v.literal("organization"),
  v.literal("user")
);

/**
 * Evaluate whether the v2 voice notes pipeline should be used.
 * Called from actions via ctx.runQuery.
 *
 * Cascade (first match wins):
 *   1. env var VOICE_NOTES_V2_GLOBAL === "true"/"false"
 *   2. platform-scope flag for "voice_notes_v2"
 *   3. organization-scope flag for "voice_notes_v2" + orgId
 *   4. user-scope flag for "voice_notes_v2" + userId
 *   5. default: false
 */
export const shouldUseV2Pipeline = internalQuery({
  args: {
    organizationId: v.string(),
    userId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const featureKey = "voice_notes_v2";

    // 1. Environment variable override (highest priority)
    const envOverride = process.env.VOICE_NOTES_V2_GLOBAL;
    if (envOverride === "true") {
      return true;
    }
    if (envOverride === "false") {
      return false;
    }

    // 2. Platform-wide flag
    const platformFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_featureKey_and_scope", (q) =>
        q.eq("featureKey", featureKey).eq("scope", "platform")
      )
      .first();

    if (platformFlag) {
      return platformFlag.enabled;
    }

    // 3. Organization-specific flag
    const orgFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_featureKey_scope_org", (q) =>
        q
          .eq("featureKey", featureKey)
          .eq("scope", "organization")
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (orgFlag) {
      return orgFlag.enabled;
    }

    // 4. User-specific flag
    const userFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_featureKey_scope_user", (q) =>
        q
          .eq("featureKey", featureKey)
          .eq("scope", "user")
          .eq("userId", args.userId)
      )
      .first();

    if (userFlag) {
      return userFlag.enabled;
    }

    // 5. Default: v1 pipeline
    return false;
  },
});

/**
 * Evaluate whether entity resolution should run for a coach.
 * Called from claimsExtraction.ts after claims are stored.
 *
 * Cascade (first match wins):
 *   1. env var ENTITY_RESOLUTION_V2_GLOBAL === "true"/"false"
 *   2. platform-scope flag for "entity_resolution_v2"
 *   3. organization-scope flag for "entity_resolution_v2" + orgId
 *   4. user-scope flag for "entity_resolution_v2" + userId
 *   5. default: false
 */
export const shouldUseEntityResolution = internalQuery({
  args: {
    organizationId: v.string(),
    userId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const featureKey = "entity_resolution_v2";

    // 1. Environment variable override (highest priority)
    const envOverride = process.env.ENTITY_RESOLUTION_V2_GLOBAL;
    if (envOverride === "true") {
      return true;
    }
    if (envOverride === "false") {
      return false;
    }

    // 2. Platform-wide flag
    const platformFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_featureKey_and_scope", (q) =>
        q.eq("featureKey", featureKey).eq("scope", "platform")
      )
      .first();

    if (platformFlag) {
      return platformFlag.enabled;
    }

    // 3. Organization-specific flag
    const orgFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_featureKey_scope_org", (q) =>
        q
          .eq("featureKey", featureKey)
          .eq("scope", "organization")
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (orgFlag) {
      return orgFlag.enabled;
    }

    // 4. User-specific flag
    const userFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_featureKey_scope_user", (q) =>
        q
          .eq("featureKey", featureKey)
          .eq("scope", "user")
          .eq("userId", args.userId)
      )
      .first();

    if (userFlag) {
      return userFlag.enabled;
    }

    // 5. Default: disabled
    return false;
  },
});

/**
 * Generic feature flag lookup for any feature key.
 * Returns the enabled state or null if no flag is set.
 */
export const getFeatureFlag = internalQuery({
  args: {
    featureKey: v.string(),
    scope: scopeValidator,
    organizationId: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      _id: v.id("featureFlags"),
      _creationTime: v.number(),
      featureKey: v.string(),
      scope: scopeValidator,
      organizationId: v.optional(v.string()),
      userId: v.optional(v.string()),
      enabled: v.boolean(),
      updatedBy: v.optional(v.string()),
      updatedAt: v.number(),
      notes: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    if (args.scope === "platform") {
      return await ctx.db
        .query("featureFlags")
        .withIndex("by_featureKey_and_scope", (q) =>
          q.eq("featureKey", args.featureKey).eq("scope", "platform")
        )
        .first();
    }

    if (args.scope === "organization" && args.organizationId) {
      return await ctx.db
        .query("featureFlags")
        .withIndex("by_featureKey_scope_org", (q) =>
          q
            .eq("featureKey", args.featureKey)
            .eq("scope", "organization")
            .eq("organizationId", args.organizationId)
        )
        .first();
    }

    if (args.scope === "user" && args.userId) {
      return await ctx.db
        .query("featureFlags")
        .withIndex("by_featureKey_scope_user", (q) =>
          q
            .eq("featureKey", args.featureKey)
            .eq("scope", "user")
            .eq("userId", args.userId)
        )
        .first();
    }

    return null;
  },
});

/**
 * Set or update a feature flag.
 * Used by admin to toggle flags at any scope level.
 */
export const setFeatureFlag = internalMutation({
  args: {
    featureKey: v.string(),
    scope: scopeValidator,
    organizationId: v.optional(v.string()),
    userId: v.optional(v.string()),
    enabled: v.boolean(),
    updatedBy: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("featureFlags"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find existing flag at this scope
    const findExisting = async () => {
      if (args.scope === "platform") {
        return await ctx.db
          .query("featureFlags")
          .withIndex("by_featureKey_and_scope", (q) =>
            q.eq("featureKey", args.featureKey).eq("scope", "platform")
          )
          .first();
      }
      if (args.scope === "organization" && args.organizationId) {
        return await ctx.db
          .query("featureFlags")
          .withIndex("by_featureKey_scope_org", (q) =>
            q
              .eq("featureKey", args.featureKey)
              .eq("scope", "organization")
              .eq("organizationId", args.organizationId)
          )
          .first();
      }
      if (args.scope === "user" && args.userId) {
        return await ctx.db
          .query("featureFlags")
          .withIndex("by_featureKey_scope_user", (q) =>
            q
              .eq("featureKey", args.featureKey)
              .eq("scope", "user")
              .eq("userId", args.userId)
          )
          .first();
      }
      return null;
    };

    const existing = await findExisting();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        updatedBy: args.updatedBy,
        updatedAt: now,
        notes: args.notes,
      });
      return existing._id;
    }

    // Create new flag
    return await ctx.db.insert("featureFlags", {
      featureKey: args.featureKey,
      scope: args.scope,
      organizationId: args.organizationId,
      userId: args.userId,
      enabled: args.enabled,
      updatedBy: args.updatedBy,
      updatedAt: now,
      notes: args.notes,
    });
  },
});
