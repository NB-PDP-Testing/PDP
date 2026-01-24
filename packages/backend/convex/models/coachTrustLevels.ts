import { v } from "convex/values";
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
  parentSummariesEnabled: v.optional(v.boolean()),
  skipSensitiveInsights: v.optional(v.boolean()),
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
      };
    }

    return {
      currentLevel: trustRecord.currentLevel,
      preferredLevel: trustRecord.preferredLevel,
      totalApprovals: trustRecord.totalApprovals,
      totalSuppressed: trustRecord.totalSuppressed,
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
