/**
 * Data Retention Configuration — GDPR Article 5(1)(e) Storage Limitation
 *
 * Provides org-configurable retention periods per data category.
 * Legal minimums are enforced server-side:
 *   - injuryDays: minimum 2555 (7 years — Ireland HSE healthcare standard)
 *   - auditLogDays: minimum 1095 (3 years — GDPR Article 30)
 *
 * Also provides helpers to soft-delete records (set retentionExpired flag).
 */

import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";

// ============================================================
// DEFAULT RETENTION PERIODS (days)
// ============================================================

export const RETENTION_DEFAULTS = {
  wellnessDays: 730, // 2 years
  assessmentDays: 1825, // 5 years
  injuryDays: 2555, // 7 years (Ireland HSE healthcare minimum)
  coachFeedbackDays: 1825, // 5 years
  auditLogDays: 1095, // 3 years (GDPR Article 30 minimum)
  communicationDays: 365, // 1 year
} as const;

export const RETENTION_LEGAL_MINIMUMS = {
  injuryDays: 2555,
  auditLogDays: 1095,
} as const;

const retentionConfigValidator = v.object({
  wellnessDays: v.number(),
  assessmentDays: v.number(),
  injuryDays: v.number(),
  coachFeedbackDays: v.number(),
  auditLogDays: v.number(),
  communicationDays: v.number(),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get the retention config for an org.
 * Returns defaults if no config has been saved yet.
 */
export const getOrgRetentionConfig = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    _id: v.optional(v.id("orgRetentionConfig")),
    organizationId: v.string(),
    wellnessDays: v.number(),
    assessmentDays: v.number(),
    injuryDays: v.number(),
    coachFeedbackDays: v.number(),
    auditLogDays: v.number(),
    communicationDays: v.number(),
    updatedAt: v.optional(v.number()),
    updatedByUserId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("orgRetentionConfig")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .unique();

    if (config) {
      return {
        _id: config._id,
        organizationId: config.organizationId,
        wellnessDays: config.wellnessDays,
        assessmentDays: config.assessmentDays,
        injuryDays: config.injuryDays,
        coachFeedbackDays: config.coachFeedbackDays,
        auditLogDays: config.auditLogDays,
        communicationDays: config.communicationDays,
        updatedAt: config.updatedAt,
        updatedByUserId: config.updatedByUserId,
      };
    }

    // Return defaults if not configured
    return {
      organizationId: args.organizationId,
      ...RETENTION_DEFAULTS,
    };
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Create or update the retention configuration for an org (admin-only).
 * Enforces legal minimums on injuryDays and auditLogDays.
 */
export const upsertOrgRetentionConfig = mutation({
  args: {
    organizationId: v.string(),
    config: retentionConfigValidator,
    updatedByUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Enforce legal minimums
    if (args.config.auditLogDays < RETENTION_LEGAL_MINIMUMS.auditLogDays) {
      throw new Error(
        `Audit log retention cannot be set below ${RETENTION_LEGAL_MINIMUMS.auditLogDays} days (3 years — GDPR Article 30 legal minimum).`
      );
    }
    if (args.config.injuryDays < RETENTION_LEGAL_MINIMUMS.injuryDays) {
      throw new Error(
        `Injury record retention cannot be set below ${RETENTION_LEGAL_MINIMUMS.injuryDays} days (7 years — Ireland HSE healthcare legal minimum).`
      );
    }
    // General minimum for all categories
    const categories = Object.values(args.config);
    if (categories.some((days) => days < 30)) {
      throw new Error(
        "Retention period cannot be set below 30 days for any category."
      );
    }

    const existing = await ctx.db
      .query("orgRetentionConfig")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args.config,
        updatedAt: now,
        updatedByUserId: args.updatedByUserId,
      });
    } else {
      await ctx.db.insert("orgRetentionConfig", {
        organizationId: args.organizationId,
        ...args.config,
        updatedAt: now,
        updatedByUserId: args.updatedByUserId,
      });
    }

    return null;
  },
});

/**
 * Stamp a retention expiry date on a newly created record.
 * Called at record creation time to pre-stamp the expiry date.
 * Currently only supports dailyPlayerHealthChecks.
 */
export const stampWellnessRetentionExpiry = internalMutation({
  args: {
    recordId: v.id("dailyPlayerHealthChecks"),
    retentionDays: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const expiresAt = Date.now() + args.retentionDays * 24 * 60 * 60 * 1000;
    await ctx.db.patch(args.recordId, {
      retentionExpiresAt: expiresAt,
    });
    return null;
  },
});

/**
 * Soft-delete a single dailyPlayerHealthChecks record.
 * Sets retentionExpired: true and retentionExpiredAt: Date.now().
 * Used by the erasure execution action and the retention cron.
 */
export const softDeleteWellnessRecord = internalMutation({
  args: {
    recordId: v.id("dailyPlayerHealthChecks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.recordId, {
      retentionExpired: true,
      retentionExpiredAt: Date.now(),
    });
    return null;
  },
});

/**
 * Soft-delete all dailyPlayerHealthChecks for a player in an org (erasure execution).
 * Processes all records via the by_player index.
 * For very large datasets, further batching via ctx.scheduler.runAfter() could be added.
 */
export const softDeleteAllWellnessForPlayer = internalMutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const records = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    let count = 0;
    for (const record of records) {
      if (record.organizationId !== args.organizationId) {
        continue;
      }
      if (!record.retentionExpired) {
        await ctx.db.patch(record._id, {
          retentionExpired: true,
          retentionExpiredAt: now,
        });
        count += 1;
      }
    }
    return count;
  },
});

/**
 * Soft-delete all whatsappWellnessSessions for a player in an org.
 * Used by the erasure execution action for COMMUNICATION_DATA category.
 */
export const softDeleteAllWellnessSessionsForPlayer = internalMutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("whatsappWellnessSessions")
      .withIndex("by_player_and_date", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    let count = 0;
    for (const session of sessions) {
      if (session.organizationId !== args.organizationId) {
        continue;
      }
      // whatsappWellnessSessions sessions expire naturally — we delete them directly
      // They are short-lived session records with no long-term historical value
      await ctx.db.delete(session._id);
      count += 1;
    }
    return count;
  },
});
