import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, mutation, query } from "../_generated/server";
import { authComponent } from "../auth";
import {
  calculateProgressToNextLevel,
  calculateTrustLevel,
} from "../lib/trustLevelCalculator";

/**
 * Coach Trust Levels for AI Summary Automation
 *
 * This system tracks coach reliability when reviewing AI-generated parent summaries.
 * As coaches consistently approve summaries, their trust level increases, enabling
 * higher levels of automation.
 *
 * Trust Levels:
 * - Level 0 (New): Manual review required for all summaries
 * - Level 1 (Learning): Quick review with AI suggestions (10+ approvals)
 * - Level 2 (Trusted): Auto-approve normal summaries, review sensitive (50+ approvals, <10% suppression)
 * - Level 3 (Expert): Full automation with coach opt-in (200+ approvals)
 *
 * Coaches can cap their automation level via preferredLevel setting.
 */

// ============================================================
// VALIDATORS
// ============================================================

const trustLevelValidator = v.object({
  _id: v.id("coachTrustLevels"),
  _creationTime: v.number(),
  coachId: v.string(),
  organizationId: v.string(),
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

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Helper function to get or create a trust level record.
 * Used by multiple mutations to avoid code duplication.
 */
async function getOrCreateTrustLevelHelper(
  ctx: { db: any },
  coachId: string,
  organizationId: string
): Promise<Doc<"coachTrustLevels">> {
  // Try to find existing record
  const existing = await ctx.db
    .query("coachTrustLevels")
    .withIndex("by_coach_org", (q: any) =>
      q.eq("coachId", coachId).eq("organizationId", organizationId)
    )
    .first();

  if (existing) {
    return existing;
  }

  // Create new record with default values
  const now = Date.now();
  const newId = await ctx.db.insert("coachTrustLevels", {
    coachId,
    organizationId,
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

// ============================================================
// INTERNAL MUTATIONS
// ============================================================

/**
 * US-005: Get or create a trust level record for a coach.
 * Internal mutation called by other mutations to ensure record exists.
 */
export const getOrCreateTrustLevel = internalMutation({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
  },
  returns: trustLevelValidator,
  handler: async (ctx, args) =>
    await getOrCreateTrustLevelHelper(ctx, args.coachId, args.organizationId),
});

/**
 * US-006-007: Update trust metrics after coach action.
 * Recalculates trust level and updates levelHistory if level changes.
 */
export const updateTrustMetrics = internalMutation({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
    action: v.union(
      v.literal("approved"),
      v.literal("suppressed"),
      v.literal("edited")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get or create trust record
    const trustRecord = await getOrCreateTrustLevelHelper(
      ctx,
      args.coachId,
      args.organizationId
    );

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
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * US-008: Set coach's preferred maximum trust level.
 * Coaches can cap their automation level if they want more control.
 */
export const setCoachPreferredLevel = mutation({
  args: {
    organizationId: v.string(),
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
    if (!user?.userId) {
      throw new Error("Not authenticated");
    }
    const coachId = user.userId;

    // Get or create trust record
    const trustRecord = await getOrCreateTrustLevelHelper(
      ctx,
      coachId,
      args.organizationId
    );

    const now = Date.now();
    const updates: Partial<typeof trustRecord> = {
      preferredLevel: args.preferredLevel,
      updatedAt: now,
    };

    // If current level exceeds new preferred level, downgrade
    if (trustRecord.currentLevel > args.preferredLevel) {
      updates.currentLevel = args.preferredLevel;
      updates.levelHistory = [
        ...trustRecord.levelHistory,
        {
          level: args.preferredLevel,
          changedAt: now,
          reason: `Coach opted down to level ${args.preferredLevel}`,
        },
      ];
    }

    await ctx.db.patch(trustRecord._id, updates);

    const updated = await ctx.db.get(trustRecord._id);
    if (!updated) {
      throw new Error("Failed to update trust level");
    }

    return updated;
  },
});

// ============================================================
// QUERIES
// ============================================================

/**
 * US-011: Get coach's current trust level with progress metrics.
 * Returns default values if no record exists yet.
 */
export const getCoachTrustLevel = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
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
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.userId) {
      // Return default values if not authenticated
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
    const coachId = user.userId;

    // Try to find existing trust record
    const trustRecord = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", coachId).eq("organizationId", args.organizationId)
      )
      .first();

    // Return default if no record exists
    if (!trustRecord) {
      return {
        currentLevel: 0,
        preferredLevel: undefined,
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
      totalApprovals: trustRecord.totalApprovals,
      totalSuppressed: trustRecord.totalSuppressed,
      consecutiveApprovals: trustRecord.consecutiveApprovals,
      progressToNextLevel,
    };
  },
});
