import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { authComponent } from "../auth";
import {
  calculateProgressToNextLevel,
  calculateTrustLevel,
} from "../lib/trustLevelCalculator";

/**
 * Coach Trust Levels for AI Summary Automation
 *
 * ARCHITECTURE: Platform-wide trust + per-org preferences
 *
 * Trust levels are PLATFORM-WIDE (one record per coach):
 * - Earned globally based on approval/suppression patterns across all orgs
 * - Level 0 (New): Manual review required for all summaries
 * - Level 1 (Learning): Quick review with AI suggestions (10+ approvals)
 * - Level 2 (Trusted): Auto-approve normal summaries, review sensitive (50+ approvals, <10% suppression)
 * - Level 3 (Expert): Full automation with coach opt-in (200+ approvals)
 *
 * Preferences are PER-ORG (coachOrgPreferences table):
 * - parentSummariesEnabled: Whether to generate parent summaries
 * - skipSensitiveInsights: Whether to skip injury/behavior from summaries
 */

// ============================================================
// VALIDATORS
// ============================================================

const trustLevelValidator = v.object({
  _id: v.id("coachTrustLevels"),
  _creationTime: v.number(),
  coachId: v.string(),
  currentLevel: v.number(),
  preferredLevel: v.optional(v.number()),
  totalApprovals: v.number(),
  totalSuppressed: v.number(),
  consecutiveApprovals: v.number(),
  levelHistory: v.array(
    v.object({
      level: v.number(),
      changedAt: v.number(),
      reason: v.string(),
    })
  ),
  lastActivityAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const orgPreferencesValidator = v.object({
  _id: v.id("coachOrgPreferences"),
  _creationTime: v.number(),
  coachId: v.string(),
  organizationId: v.string(),

  // Feature toggles
  parentSummariesEnabled: v.optional(v.boolean()),
  aiInsightMatchingEnabled: v.optional(v.boolean()),
  autoApplyInsightsEnabled: v.optional(v.boolean()),
  skipSensitiveInsights: v.optional(v.boolean()),

  // Trust Gate Individual Override
  trustGateOverride: v.optional(v.boolean()),
  overrideGrantedBy: v.optional(v.string()),
  overrideGrantedAt: v.optional(v.number()),
  overrideReason: v.optional(v.string()),
  overrideExpiresAt: v.optional(v.number()),

  // AI Control Rights
  aiControlRightsEnabled: v.optional(v.boolean()),
  grantedBy: v.optional(v.string()),
  grantedAt: v.optional(v.number()),
  grantNote: v.optional(v.string()),
  revokedBy: v.optional(v.string()),
  revokedAt: v.optional(v.number()),
  revokeReason: v.optional(v.string()),

  // Admin Block
  adminBlockedFromAI: v.optional(v.boolean()),
  blockReason: v.optional(v.string()),
  blockedBy: v.optional(v.string()),
  blockedAt: v.optional(v.number()),

  createdAt: v.number(),
  updatedAt: v.number(),
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get or create a platform-wide trust level record for a coach.
 */
async function getOrCreateTrustLevelHelper(
  ctx: { db: any },
  coachId: string
): Promise<Doc<"coachTrustLevels">> {
  // Try to find existing record
  const existing = await ctx.db
    .query("coachTrustLevels")
    .withIndex("by_coach", (q: any) => q.eq("coachId", coachId))
    .first();

  if (existing) {
    return existing;
  }

  // Create new record with default values
  const now = Date.now();
  const newId = await ctx.db.insert("coachTrustLevels", {
    coachId,
    currentLevel: 0,
    preferredLevel: undefined,
    totalApprovals: 0,
    totalSuppressed: 0,
    consecutiveApprovals: 0,
    levelHistory: [],
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
  });

  const created = await ctx.db.get(newId);
  if (!created) {
    throw new Error("Failed to create trust level record");
  }

  return created;
}

/**
 * Get or create per-org preferences for a coach.
 */
async function getOrCreateOrgPreferencesHelper(
  ctx: { db: any },
  coachId: string,
  organizationId: string
): Promise<Doc<"coachOrgPreferences">> {
  // Try to find existing record
  const existing = await ctx.db
    .query("coachOrgPreferences")
    .withIndex("by_coach_org", (q: any) =>
      q.eq("coachId", coachId).eq("organizationId", organizationId)
    )
    .first();

  if (existing) {
    return existing;
  }

  // Create new record with default values
  const now = Date.now();
  const newId = await ctx.db.insert("coachOrgPreferences", {
    coachId,
    organizationId,
    parentSummariesEnabled: undefined, // null means default (true)
    skipSensitiveInsights: undefined, // null means default (false)
    createdAt: now,
    updatedAt: now,
  });

  const created = await ctx.db.get(newId);
  if (!created) {
    throw new Error("Failed to create org preferences record");
  }

  return created;
}

// ============================================================
// INTERNAL MUTATIONS
// ============================================================

/**
 * Get or create a platform-wide trust level record for a coach.
 * Internal mutation called by other mutations to ensure record exists.
 */
export const getOrCreateTrustLevel = internalMutation({
  args: {
    coachId: v.string(),
  },
  returns: trustLevelValidator,
  handler: async (ctx, args) =>
    await getOrCreateTrustLevelHelper(ctx, args.coachId),
});

/**
 * Update trust metrics after coach action (approve/suppress/edit).
 * Platform-wide - aggregates across all organizations.
 */
export const updateTrustMetrics = internalMutation({
  args: {
    coachId: v.string(),
    action: v.union(
      v.literal("approved"),
      v.literal("suppressed"),
      v.literal("edited")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get or create platform-wide trust record
    const trustRecord = await getOrCreateTrustLevelHelper(ctx, args.coachId);

    const now = Date.now();
    const updates: Partial<typeof trustRecord> = {
      lastActivityAt: now,
      updatedAt: now,
    };

    // Update counters based on action
    if (args.action === "approved") {
      updates.totalApprovals = trustRecord.totalApprovals + 1;
      updates.consecutiveApprovals = trustRecord.consecutiveApprovals + 1;
    } else if (args.action === "suppressed") {
      updates.totalSuppressed = trustRecord.totalSuppressed + 1;
      updates.consecutiveApprovals = 0; // Reset streak
    }
    // 'edited' action doesn't change counters, just lastActivityAt

    // Calculate new trust level
    const newTotalApprovals =
      updates.totalApprovals ?? trustRecord.totalApprovals;
    const newTotalSuppressed =
      updates.totalSuppressed ?? trustRecord.totalSuppressed;
    const hasOptedInToLevel3 =
      trustRecord.preferredLevel !== undefined &&
      trustRecord.preferredLevel >= 3;

    const earnedLevel = calculateTrustLevel(
      newTotalApprovals,
      newTotalSuppressed,
      hasOptedInToLevel3
    );

    // Only upgrade if within preferred level cap (or no cap set)
    const preferredCap = trustRecord.preferredLevel ?? 3;
    const newLevel = Math.min(earnedLevel, preferredCap);

    // Update level and history if changed
    if (newLevel !== trustRecord.currentLevel) {
      updates.currentLevel = newLevel;

      const reason =
        newLevel > trustRecord.currentLevel
          ? `Reached ${newTotalApprovals} approvals`
          : `Capped at level ${newLevel} by preference`;

      updates.levelHistory = [
        ...trustRecord.levelHistory,
        {
          level: newLevel,
          changedAt: now,
          reason,
        },
      ];
    }

    // Apply updates
    await ctx.db.patch(trustRecord._id, updates);
    return null;
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Set coach's preferred maximum trust level (platform-wide).
 * Coaches can cap their automation level if they want more control.
 */
export const setCoachPreferredLevel = mutation({
  args: {
    preferredLevel: v.number(), // 0, 1, 2, or 3
  },
  returns: trustLevelValidator,
  handler: async (ctx, args) => {
    // Validate preferredLevel
    if (![0, 1, 2, 3].includes(args.preferredLevel)) {
      throw new Error("preferredLevel must be 0, 1, 2, or 3");
    }

    // Get authenticated user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get the user ID (use _id or userId depending on what's available)
    const coachId = user.userId || user._id;
    if (!coachId) {
      throw new Error("User ID not found");
    }

    // Get or create platform-wide trust record
    const trustRecord = await getOrCreateTrustLevelHelper(ctx, coachId);

    const now = Date.now();
    const updates: Partial<typeof trustRecord> = {
      preferredLevel: args.preferredLevel,
      updatedAt: now,
    };

    // NOTE: We do NOT downgrade currentLevel here.
    // currentLevel represents what the coach has EARNED.
    // preferredLevel is just their automation cap preference.
    // The effective level is calculated as min(currentLevel, preferredLevel ?? currentLevel)

    await ctx.db.patch(trustRecord._id, updates);

    const updated = await ctx.db.get(trustRecord._id);
    if (!updated) {
      throw new Error("Failed to update trust level");
    }

    return updated;
  },
});

/**
 * Set insight auto-apply preferences per category (Phase 7.3)
 * Controls which types of insights can be automatically applied to player profiles.
 * Platform-wide setting (applies to all orgs coach works with).
 */
export const setInsightAutoApplyPreferences = mutation({
  args: {
    preferences: v.object({
      skills: v.boolean(),
      attendance: v.boolean(),
      goals: v.boolean(),
      performance: v.boolean(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get the user ID (use _id or userId depending on what's available)
    const coachId = user.userId || user._id;
    if (!coachId) {
      throw new Error("User ID not found");
    }

    // Get or create platform-wide trust record
    const trustRecord = await getOrCreateTrustLevelHelper(ctx, coachId);

    // Update insightAutoApplyPreferences
    await ctx.db.patch(trustRecord._id, {
      insightAutoApplyPreferences: args.preferences,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Toggle parent summaries generation on/off (per-org).
 * When disabled, insights are still captured but no parent summaries are generated.
 */
export const setParentSummariesEnabled = mutation({
  args: {
    organizationId: v.string(),
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get the user ID (use _id or userId depending on what's available)
    const coachId = user.userId || user._id;
    if (!coachId) {
      throw new Error("User ID not found");
    }

    // Get or create per-org preferences
    const prefs = await getOrCreateOrgPreferencesHelper(
      ctx,
      coachId,
      args.organizationId
    );

    // Update the setting
    await ctx.db.patch(prefs._id, {
      parentSummariesEnabled: args.enabled,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Toggle skipping sensitive insights (injury/behavior) from parent summaries (per-org).
 * When enabled, only normal insights generate parent summaries.
 */
export const setSkipSensitiveInsights = mutation({
  args: {
    organizationId: v.string(),
    skip: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get the user ID (use _id or userId depending on what's available)
    const coachId = user.userId || user._id;
    if (!coachId) {
      throw new Error("User ID not found");
    }

    // Get or create per-org preferences
    const prefs = await getOrCreateOrgPreferencesHelper(
      ctx,
      coachId,
      args.organizationId
    );

    // Update the setting
    await ctx.db.patch(prefs._id, {
      skipSensitiveInsights: args.skip,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get coach's current trust level with progress metrics.
 * Combines platform-wide trust level with per-org preferences.
 */
export const getCoachTrustLevel = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    currentLevel: v.number(),
    preferredLevel: v.optional(v.number()),
    parentSummariesEnabled: v.boolean(),
    skipSensitiveInsights: v.boolean(),
    totalApprovals: v.number(),
    totalSuppressed: v.number(),
    consecutiveApprovals: v.number(),
    progressToNextLevel: v.object({
      currentCount: v.number(),
      threshold: v.number(),
      percentage: v.number(),
      blockedBySuppressionRate: v.boolean(),
    }),
  }),
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await authComponent.safeGetAuthUser(ctx);

    // Get the user ID (use _id or userId depending on what's available)
    const coachId = user?.userId || user?._id;
    if (!coachId) {
      // Return default values if not authenticated
      return {
        currentLevel: 0,
        preferredLevel: undefined,
        parentSummariesEnabled: true,
        skipSensitiveInsights: false,
        totalApprovals: 0,
        totalSuppressed: 0,
        consecutiveApprovals: 0,
        progressToNextLevel: {
          currentCount: 0,
          threshold: 10,
          percentage: 0,
          blockedBySuppressionRate: false,
        },
      };
    }

    // Get platform-wide trust record
    const trustRecord = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach", (q) => q.eq("coachId", coachId))
      .first();

    // Get per-org preferences
    const orgPrefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", coachId).eq("organizationId", args.organizationId)
      )
      .first();

    // Return defaults if no trust record exists
    if (!trustRecord) {
      return {
        currentLevel: 0,
        preferredLevel: undefined,
        parentSummariesEnabled: orgPrefs?.parentSummariesEnabled ?? true,
        skipSensitiveInsights: orgPrefs?.skipSensitiveInsights ?? false,
        totalApprovals: 0,
        totalSuppressed: 0,
        consecutiveApprovals: 0,
        progressToNextLevel: {
          currentCount: 0,
          threshold: 10, // Level 1 threshold
          percentage: 0,
          blockedBySuppressionRate: false,
        },
      };
    }

    // Calculate progress to next level
    const progressToNextLevel = calculateProgressToNextLevel(
      trustRecord.currentLevel,
      trustRecord.totalApprovals,
      trustRecord.totalSuppressed
    );

    return {
      currentLevel: trustRecord.currentLevel,
      preferredLevel: trustRecord.preferredLevel,
      parentSummariesEnabled: orgPrefs?.parentSummariesEnabled ?? true,
      skipSensitiveInsights: orgPrefs?.skipSensitiveInsights ?? false,
      totalApprovals: trustRecord.totalApprovals,
      totalSuppressed: trustRecord.totalSuppressed,
      consecutiveApprovals: trustRecord.consecutiveApprovals,
      progressToNextLevel,
    };
  },
});

/**
 * Get coach's platform-wide trust level (no org context).
 * Used in coach profile / settings dialog.
 */
export const getCoachPlatformTrustLevel = query({
  args: {},
  returns: v.union(
    v.object({
      currentLevel: v.number(),
      preferredLevel: v.optional(v.number()),
      totalApprovals: v.number(),
      totalSuppressed: v.number(),
      consecutiveApprovals: v.number(),
      progressToNextLevel: v.object({
        currentCount: v.number(),
        threshold: v.number(),
        percentage: v.number(),
        blockedBySuppressionRate: v.boolean(),
      }),
      insightAutoApplyPreferences: v.optional(
        v.object({
          skills: v.boolean(),
          attendance: v.boolean(),
          goals: v.boolean(),
          performance: v.boolean(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Get authenticated user
    const user = await authComponent.safeGetAuthUser(ctx);

    // Get the user ID (use _id or userId depending on what's available)
    const coachId = user?.userId || user?._id;
    if (!coachId) {
      return null;
    }

    // Get platform-wide trust record
    const trustRecord = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach", (q) => q.eq("coachId", coachId))
      .first();

    if (!trustRecord) {
      return {
        currentLevel: 0,
        preferredLevel: undefined,
        totalApprovals: 0,
        totalSuppressed: 0,
        consecutiveApprovals: 0,
        progressToNextLevel: {
          currentCount: 0,
          threshold: 10,
          percentage: 0,
          blockedBySuppressionRate: false,
        },
        insightAutoApplyPreferences: undefined,
      };
    }

    const progressToNextLevel = calculateProgressToNextLevel(
      trustRecord.currentLevel,
      trustRecord.totalApprovals,
      trustRecord.totalSuppressed
    );

    return {
      currentLevel: trustRecord.currentLevel,
      preferredLevel: trustRecord.preferredLevel,
      totalApprovals: trustRecord.totalApprovals,
      totalSuppressed: trustRecord.totalSuppressed,
      consecutiveApprovals: trustRecord.consecutiveApprovals,
      progressToNextLevel,
      insightAutoApplyPreferences: trustRecord.insightAutoApplyPreferences,
    };
  },
});

/**
 * Get all org preferences for the current coach.
 * Used in coach settings to show per-org toggles.
 */
export const getCoachAllOrgPreferences = query({
  args: {},
  returns: v.array(orgPreferencesValidator),
  handler: async (ctx) => {
    // Get authenticated user
    const user = await authComponent.safeGetAuthUser(ctx);

    // Get the user ID (use _id or userId depending on what's available)
    const coachId = user?.userId || user?._id;
    if (!coachId) {
      return [];
    }

    // Get all org preferences for this coach
    const prefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach", (q) => q.eq("coachId", coachId))
      .collect();

    return prefs;
  },
});

// ============================================================
// INTERNAL QUERIES
// ============================================================

/**
 * Get coach's trust level for internal use (no auth check).
 * @internal
 */
export const getCoachTrustLevelInternal = internalQuery({
  args: {
    coachId: v.string(),
  },
  returns: v.object({
    currentLevel: v.number(),
    preferredLevel: v.optional(v.number()),
    totalApprovals: v.number(),
    totalSuppressed: v.number(),
    insightConfidenceThreshold: v.optional(v.number()),
    insightAutoApplyPreferences: v.optional(
      v.object({
        skills: v.boolean(),
        attendance: v.boolean(),
        goals: v.boolean(),
        performance: v.boolean(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const trustRecord = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach", (q) => q.eq("coachId", args.coachId))
      .first();

    if (!trustRecord) {
      return {
        currentLevel: 0,
        preferredLevel: undefined,
        totalApprovals: 0,
        totalSuppressed: 0,
        insightConfidenceThreshold: undefined,
        insightAutoApplyPreferences: undefined,
      };
    }

    return {
      currentLevel: trustRecord.currentLevel,
      preferredLevel: trustRecord.preferredLevel,
      totalApprovals: trustRecord.totalApprovals,
      totalSuppressed: trustRecord.totalSuppressed,
      insightConfidenceThreshold: trustRecord.insightConfidenceThreshold,
      insightAutoApplyPreferences: trustRecord.insightAutoApplyPreferences,
    };
  },
});

/**
 * Get coach trust level with insight auto-apply fields (Phase 7.1)
 * Used by insights UI to calculate wouldAutoApply predictions
 */
export const getCoachTrustLevelWithInsightFields = query({
  args: {},
  returns: v.union(
    v.object({
      currentLevel: v.number(),
      preferredLevel: v.optional(v.number()),
      insightConfidenceThreshold: v.optional(v.number()),
      insightAutoApplyPreferences: v.optional(
        v.object({
          skills: v.boolean(),
          attendance: v.boolean(),
          goals: v.boolean(),
          performance: v.boolean(),
        })
      ),
      insightPreviewModeStats: v.optional(
        v.object({
          wouldAutoApplyInsights: v.number(),
          coachAppliedThose: v.number(),
          coachDismissedThose: v.number(),
          agreementRate: v.number(),
          startedAt: v.number(),
          completedAt: v.optional(v.number()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Get authenticated user
    const user = await authComponent.safeGetAuthUser(ctx);

    // Get the user ID (use _id or userId depending on what's available)
    const coachId = user?.userId || user?._id;
    if (!coachId) {
      return null;
    }

    // Get platform-wide trust record
    const trustRecord = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach", (q) => q.eq("coachId", coachId))
      .first();

    if (!trustRecord) {
      return {
        currentLevel: 0,
        preferredLevel: undefined,
        insightConfidenceThreshold: 0.7,
        insightAutoApplyPreferences: undefined,
        insightPreviewModeStats: undefined,
      };
    }

    return {
      currentLevel: trustRecord.currentLevel,
      preferredLevel: trustRecord.preferredLevel,
      insightConfidenceThreshold: trustRecord.insightConfidenceThreshold,
      insightAutoApplyPreferences: trustRecord.insightAutoApplyPreferences,
      insightPreviewModeStats: trustRecord.insightPreviewModeStats,
    };
  },
});

/**
 * Check if parent summaries are enabled for a coach in an org.
 * Used by voice note processing to decide whether to generate summaries.
 * @internal
 */
export const isParentSummariesEnabled = internalQuery({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", args.coachId).eq("organizationId", args.organizationId)
      )
      .first();

    // Default to true if no record exists
    return prefs?.parentSummariesEnabled ?? true;
  },
});

/**
 * Check if sensitive insights (injury/behavior) should be skipped from parent summaries.
 * Used by voice note processing to decide whether to generate summaries for sensitive insights.
 * @internal
 */
export const shouldSkipSensitiveInsights = internalQuery({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", args.coachId).eq("organizationId", args.organizationId)
      )
      .first();

    // Default to false if no record exists (process all insights)
    return prefs?.skipSensitiveInsights ?? false;
  },
});

/**
 * Phase 4: Weekly cron job to adjust personalized thresholds
 * Runs every Sunday at 2 AM
 * Analyzes last 30 days of coach override patterns and adjusts confidence thresholds
 */
export const adjustPersonalizedThresholds = internalMutation({
  args: {},
  returns: v.object({
    processed: v.number(),
    adjusted: v.number(),
  }),
  handler: async (ctx) => {
    // Import the calculation function
    const { calculatePersonalizedThreshold } = await import(
      "../lib/autoApprovalDecision"
    );

    // Get all coach trust levels
    const allCoaches = await ctx.db.query("coachTrustLevels").collect();

    let processed = 0;
    let adjusted = 0;

    for (const coach of allCoaches) {
      processed += 1;

      // Get override patterns for this coach (last 30 days or all time)
      // Note: We could call the query via internal API but for simplicity,
      // we'll duplicate the aggregation logic here since it's a cron job
      const summaries = await ctx.db
        .query("coachParentSummaries")
        .withIndex("by_coach", (q) => q.eq("coachId", coach.coachId))
        .collect();

      // Count overrides by type
      const byType = {
        coach_approved_low_confidence: 0,
        coach_rejected_high_confidence: 0,
        coach_edited: 0,
        coach_revoked_auto: 0,
      };

      let totalOverrides = 0;
      for (const summary of summaries) {
        if (summary.overrideType) {
          byType[summary.overrideType] += 1;
          totalOverrides += 1;
        }
      }

      const overrideHistory = {
        totalOverrides,
        byType,
        avgConfidenceWhenRejected: null, // Not needed for threshold calculation
      };

      // Calculate personalized threshold (requires minimum 20 overrides)
      const newThreshold = calculatePersonalizedThreshold(
        overrideHistory,
        coach.confidenceThreshold ?? 0.7,
        20 // Minimum 20 override decisions required
      );

      // Update if threshold changed
      if (newThreshold !== null) {
        await ctx.db.patch(coach._id, {
          personalizedThreshold: newThreshold,
          updatedAt: Date.now(),
        });
        adjusted += 1;
      }
    }

    return {
      processed,
      adjusted,
    };
  },
});

/**
 * Phase 7.3 (US-012): Daily cron job to adjust insight confidence thresholds
 * Runs daily at 2 AM UTC
 * Analyzes last 30 days of undo patterns and adjusts insightConfidenceThreshold
 *
 * Logic:
 * - Get all coaches with auto-apply enabled (insightAutoApplyPreferences set)
 * - For each coach, get recent auto-applied insights (last 30 days)
 * - Calculate undo rate (undone insights / total insights)
 * - Adjust threshold based on undo rate:
 *   - < 3% undo rate (high accuracy) → lower threshold by 0.05 (more auto-apply)
 *   - > 10% undo rate (low accuracy) → raise threshold by 0.05 (fewer auto-apply)
 * - Thresholds bounded: min 0.6, max 0.9
 * - Requires minimum 10 insights for statistical significance
 */
export const adjustInsightThresholds = internalMutation({
  args: {},
  returns: v.object({
    processed: v.number(),
    adjusted: v.number(),
  }),
  handler: async (ctx) => {
    // Get all coaches with trust levels
    const allCoaches = await ctx.db.query("coachTrustLevels").collect();

    let processed = 0;
    let adjusted = 0;

    // 30 days ago timestamp
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    for (const coach of allCoaches) {
      // Skip coaches without auto-apply preferences
      if (!coach.insightAutoApplyPreferences) {
        continue;
      }

      processed += 1;

      // Get recent auto-applied insights for this coach (last 30 days)
      // Use by_coach_org_applied index but we need all orgs, so we'll query by coach
      // and filter by appliedAt
      const recentAudits = await ctx.db
        .query("autoAppliedInsights")
        .withIndex("by_coach_org", (q) => q.eq("coachId", coach.coachId))
        .filter((q) => q.gte(q.field("appliedAt"), thirtyDaysAgo))
        .collect();

      // Need at least 10 auto-applied insights for meaningful data
      if (recentAudits.length < 10) {
        continue;
      }

      // Calculate undo rate
      const undoCount = recentAudits.filter(
        (a) => a.undoneAt !== undefined
      ).length;
      const undoRate = undoCount / recentAudits.length;

      // Get current threshold (default 0.7)
      const currentThreshold = coach.insightConfidenceThreshold ?? 0.7;

      // Adjust threshold based on undo rate
      let newThreshold = currentThreshold;

      if (undoRate < 0.03) {
        // Less than 3% undo rate = high trust, lower threshold
        newThreshold = Math.max(0.6, currentThreshold - 0.05);
      } else if (undoRate > 0.1) {
        // More than 10% undo rate = low trust, raise threshold
        newThreshold = Math.min(0.9, currentThreshold + 0.05);
      }

      // Update if threshold changed
      if (newThreshold !== currentThreshold) {
        await ctx.db.patch(coach._id, {
          insightConfidenceThreshold: newThreshold,
          updatedAt: Date.now(),
        });

        adjusted += 1;

        console.log(
          `Coach ${coach.coachId} threshold adjusted: ${currentThreshold} → ${newThreshold} (undo rate: ${Math.round(undoRate * 100)}%)`
        );
      }
    }

    return {
      processed,
      adjusted,
    };
  },
});

/**
 * Phase 7.3 (US-012): Get AI accuracy metrics for a specific coach
 * Shows how often coach needs to correct AI-generated insights
 */
export const getAIAccuracyByCoach = query({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
    timeWindowDays: v.optional(v.number()), // Default 30 days
  },
  returns: v.object({
    totalInsights: v.number(),
    manuallyCorrected: v.number(),
    aiGotItRight: v.number(),
    accuracy: v.number(), // Percentage (0-100)
    correctionBreakdown: v.object({
      playerAssigned: v.number(),
      teamClassified: v.number(),
      todoClassified: v.number(),
      contentEdited: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const timeWindow = args.timeWindowDays ?? 30;
    const startTime = Date.now() - timeWindow * 24 * 60 * 60 * 1000;

    const insights = await ctx.db
      .query("voiceNoteInsights")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", args.coachId).eq("organizationId", args.organizationId)
      )
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .collect();

    const corrected = insights.filter((i) => i.wasManuallyCorrected === true);

    const totalInsights = insights.length;
    const manuallyCorrected = corrected.length;
    const aiGotItRight = totalInsights - manuallyCorrected;
    const accuracy =
      totalInsights > 0 ? (aiGotItRight / totalInsights) * 100 : 0;

    // Breakdown by correction type
    const correctionBreakdown = {
      playerAssigned: corrected.filter(
        (i) => i.correctionType === "player_assigned"
      ).length,
      teamClassified: corrected.filter(
        (i) => i.correctionType === "team_classified"
      ).length,
      todoClassified: corrected.filter(
        (i) => i.correctionType === "todo_classified"
      ).length,
      contentEdited: corrected.filter(
        (i) => i.correctionType === "content_edited"
      ).length,
    };

    return {
      totalInsights,
      manuallyCorrected,
      aiGotItRight,
      accuracy,
      correctionBreakdown,
    };
  },
});

/**
 * Phase 7.3 (US-012): Get platform-wide AI accuracy metrics
 * Shows aggregate AI performance across all coaches and organizations
 * Used by platform staff AI configuration page
 */
export const getPlatformAIAccuracy = query({
  args: {
    timeWindowDays: v.optional(v.number()), // Default 30 days
  },
  returns: v.object({
    totalInsights: v.number(),
    manuallyCorrected: v.number(),
    aiGotItRight: v.number(),
    accuracy: v.number(), // Percentage (0-100)
    correctionBreakdown: v.object({
      playerAssigned: v.number(),
      teamClassified: v.number(),
      todoClassified: v.number(),
      contentEdited: v.number(),
    }),
    byCoach: v.array(
      v.object({
        coachId: v.string(),
        coachName: v.string(),
        organizationId: v.string(),
        organizationName: v.string(),
        sports: v.array(v.string()), // Sports this coach has insights for
        totalInsights: v.number(),
        manuallyCorrected: v.number(),
        accuracy: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const timeWindow = args.timeWindowDays ?? 30;
    const startTime = Date.now() - timeWindow * 24 * 60 * 60 * 1000;

    // Get all insights in time window
    const allInsights = await ctx.db
      .query("voiceNoteInsights")
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .collect();

    const corrected = allInsights.filter(
      (i) => i.wasManuallyCorrected === true
    );

    const totalInsights = allInsights.length;
    const manuallyCorrected = corrected.length;
    const aiGotItRight = totalInsights - manuallyCorrected;
    const accuracy =
      totalInsights > 0 ? (aiGotItRight / totalInsights) * 100 : 0;

    // Breakdown by correction type
    const correctionBreakdown = {
      playerAssigned: corrected.filter(
        (i) => i.correctionType === "player_assigned"
      ).length,
      teamClassified: corrected.filter(
        (i) => i.correctionType === "team_classified"
      ).length,
      todoClassified: corrected.filter(
        (i) => i.correctionType === "todo_classified"
      ).length,
      contentEdited: corrected.filter(
        (i) => i.correctionType === "content_edited"
      ).length,
    };

    // Group by coach for per-coach breakdown
    const byCoachMap = new Map<
      string,
      {
        coachId: string;
        organizationId: string;
        totalInsights: number;
        manuallyCorrected: number;
        accuracy: number;
        sports: Set<string>;
      }
    >();

    for (const insight of allInsights) {
      const key = `${insight.coachId}_${insight.organizationId}`;
      const existing = byCoachMap.get(key) || {
        coachId: insight.coachId,
        organizationId: insight.organizationId,
        totalInsights: 0,
        manuallyCorrected: 0,
        accuracy: 0,
        sports: new Set<string>(),
      };

      existing.totalInsights += 1;
      if (insight.wasManuallyCorrected) {
        existing.manuallyCorrected += 1;
      }

      // Get sport from player enrollment if available
      const playerId = insight.playerIdentityId;
      if (playerId !== undefined) {
        // Get sport passports for this player in this organization
        const passports = await ctx.db
          .query("sportPassports")
          .withIndex("by_player_and_org", (q) =>
            q
              .eq("playerIdentityId", playerId)
              .eq("organizationId", insight.organizationId)
          )
          .collect();

        for (const passport of passports) {
          existing.sports.add(passport.sportCode);
        }
      }

      byCoachMap.set(key, existing);
    }

    // Enrich with coach and organization names by querying Better Auth tables directly
    const byCoachWithNames = await Promise.all(
      Array.from(byCoachMap.values()).map(async (coach) => {
        let coachName = "Unknown Coach";
        let organizationName = "Unknown Organization";

        try {
          // Fetch user using Better Auth adapter
          const user = await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: "user",
              where: [{ field: "_id", value: coach.coachId, operator: "eq" }],
            }
          );
          if (user) {
            const userRecord = user as any;
            // Try firstName/lastName first, fall back to name field, then email
            const fullName =
              userRecord.firstName && userRecord.lastName
                ? `${userRecord.firstName} ${userRecord.lastName}`.trim()
                : userRecord.name || userRecord.email || "Unknown Coach";
            coachName = fullName;
          }
        } catch (error) {
          console.error(
            `[getPlatformAIAccuracy] Failed to fetch user ${coach.coachId}:`,
            error
          );
        }

        try {
          // Fetch organization using Better Auth adapter
          const org = await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: "organization",
              where: [
                {
                  field: "_id",
                  value: coach.organizationId,
                  operator: "eq",
                },
              ],
            }
          );
          if (org) {
            organizationName = (org as any).name || "Unknown Organization";
          }
        } catch (error) {
          console.error(
            `[getPlatformAIAccuracy] Failed to fetch org ${coach.organizationId}:`,
            error
          );
        }

        return {
          coachId: coach.coachId,
          coachName,
          organizationId: coach.organizationId,
          organizationName,
          sports: Array.from(coach.sports).sort(),
          totalInsights: coach.totalInsights,
          manuallyCorrected: coach.manuallyCorrected,
          accuracy:
            coach.totalInsights > 0
              ? ((coach.totalInsights - coach.manuallyCorrected) /
                  coach.totalInsights) *
                100
              : 0,
        };
      })
    );

    // Sort by accuracy (lowest first - coaches who need help)
    byCoachWithNames.sort((a, b) => a.accuracy - b.accuracy);

    return {
      totalInsights,
      manuallyCorrected,
      aiGotItRight,
      accuracy,
      correctionBreakdown,
      byCoach: byCoachWithNames,
    };
  },
});
