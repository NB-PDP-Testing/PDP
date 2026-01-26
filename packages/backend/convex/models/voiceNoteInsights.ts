import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// ============================================================
// VALIDATORS
// ============================================================

const insightValidator = v.object({
  _id: v.id("voiceNoteInsights"),
  _creationTime: v.number(),
  voiceNoteId: v.id("voiceNotes"),
  insightId: v.string(),
  title: v.string(),
  description: v.string(),
  category: v.string(),
  recommendedUpdate: v.optional(v.string()),
  playerIdentityId: v.optional(v.id("playerIdentities")),
  playerName: v.optional(v.string()),
  teamId: v.optional(v.string()),
  teamName: v.optional(v.string()),
  assigneeUserId: v.optional(v.string()),
  assigneeName: v.optional(v.string()),
  confidenceScore: v.number(),
  wouldAutoApply: v.boolean(),
  status: v.union(
    v.literal("pending"),
    v.literal("applied"),
    v.literal("dismissed"),
    v.literal("auto_applied")
  ),
  appliedAt: v.optional(v.number()),
  appliedBy: v.optional(v.string()),
  dismissedAt: v.optional(v.number()),
  dismissedBy: v.optional(v.string()),
  organizationId: v.string(),
  coachId: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// ============================================================
// PUBLIC QUERIES
// ============================================================

/**
 * Get pending insights for coach with wouldAutoApply calculation
 * Phase 7.1: Shows which insights AI would auto-apply at current trust level
 */
export const getPendingInsights = query({
  args: {
    organizationId: v.string(),
    coachId: v.optional(v.string()), // Optional: defaults to authenticated user
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("applied"),
        v.literal("dismissed"),
        v.literal("auto_applied")
      )
    ), // Optional: defaults to "pending"
  },
  returns: v.array(insightValidator),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get userId with fallback to _id
    const userId = user.userId || user._id;
    const coachId = args.coachId || userId;

    // Get coach trust level for wouldAutoApply calculation
    const trustLevel = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach", (q) => q.eq("coachId", coachId))
      .first();

    // Calculate effective trust level and threshold
    // effectiveLevel is the LOWER of currentLevel and preferredLevel
    // This ensures coaches can't bypass safety by having high currentLevel if they prefer lower
    const effectiveLevel = trustLevel
      ? Math.min(
          trustLevel.currentLevel,
          trustLevel.preferredLevel ?? trustLevel.currentLevel
        )
      : 0;
    const threshold = trustLevel?.insightConfidenceThreshold ?? 0.7;

    // Query insights by coach and org with status filter
    const status = args.status || "pending";
    const insights = await ctx.db
      .query("voiceNoteInsights")
      .withIndex("by_coach_org_status", (q) =>
        q
          .eq("coachId", coachId)
          .eq("organizationId", args.organizationId)
          .eq("status", status)
      )
      .collect();

    // Calculate wouldAutoApply for each insight
    const insightsWithPrediction = insights.map((insight) => {
      // Calculate if this insight would auto-apply at current trust level
      // Level 0/1: Never auto-apply (always false)
      // Level 2+: Auto-apply if NOT injury/medical AND confidence >= threshold
      // Injury/medical categories: NEVER auto-apply (safety guardrail)
      const wouldAutoApply =
        insight.category !== "injury" &&
        insight.category !== "medical" &&
        effectiveLevel >= 2 &&
        insight.confidenceScore >= threshold;

      return {
        ...insight,
        wouldAutoApply,
      };
    });

    return insightsWithPrediction;
  },
});

// ============================================================
// PUBLIC MUTATIONS
// ============================================================

/**
 * Apply an insight (Phase 7.1: Track preview mode statistics)
 */
export const applyInsight = mutation({
  args: {
    insightId: v.id("voiceNoteInsights"),
  },
  returns: v.id("voiceNoteInsights"),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get userId with fallback to _id
    const userId = user.userId || user._id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    // Get the insight
    const insight = await ctx.db.get(args.insightId);
    if (!insight) {
      throw new Error("Insight not found");
    }

    // Verify user is the coach for this insight
    if (insight.coachId !== userId) {
      throw new Error("Only the coach who created this insight can apply it");
    }

    // Track preview mode statistics (Phase 7.1)
    const trustLevel = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach", (q) => q.eq("coachId", insight.coachId))
      .first();

    if (
      trustLevel?.insightPreviewModeStats &&
      !trustLevel.insightPreviewModeStats.completedAt
    ) {
      // Calculate if this insight would have been auto-applied
      const effectiveLevel = Math.min(
        trustLevel.currentLevel,
        trustLevel.preferredLevel ?? trustLevel.currentLevel
      );
      const threshold = trustLevel.insightConfidenceThreshold ?? 0.7;
      const wouldAutoApply =
        insight.category !== "injury" &&
        insight.category !== "medical" &&
        effectiveLevel >= 2 &&
        insight.confidenceScore >= threshold;

      // Update preview mode stats
      const newInsights =
        trustLevel.insightPreviewModeStats.wouldAutoApplyInsights +
        (wouldAutoApply ? 1 : 0);
      const newApplied =
        trustLevel.insightPreviewModeStats.coachAppliedThose +
        (wouldAutoApply ? 1 : 0);
      const agreementRate = newInsights > 0 ? newApplied / newInsights : 0;

      await ctx.db.patch(trustLevel._id, {
        insightPreviewModeStats: {
          ...trustLevel.insightPreviewModeStats,
          wouldAutoApplyInsights: newInsights,
          coachAppliedThose: newApplied,
          agreementRate,
          completedAt: newInsights >= 20 ? Date.now() : undefined,
        },
      });
    }

    // Apply the insight
    await ctx.db.patch(args.insightId, {
      status: "applied",
      appliedAt: Date.now(),
      appliedBy: userId,
    });

    return args.insightId;
  },
});

/**
 * Dismiss an insight (Phase 7.1: Track preview mode statistics)
 */
export const dismissInsight = mutation({
  args: {
    insightId: v.id("voiceNoteInsights"),
  },
  returns: v.id("voiceNoteInsights"),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get userId with fallback to _id
    const userId = user.userId || user._id;
    if (!userId) {
      throw new Error("User ID not found");
    }

    // Get the insight
    const insight = await ctx.db.get(args.insightId);
    if (!insight) {
      throw new Error("Insight not found");
    }

    // Verify user is the coach for this insight
    if (insight.coachId !== userId) {
      throw new Error("Only the coach who created this insight can dismiss it");
    }

    // Track preview mode statistics (Phase 7.1)
    const trustLevel = await ctx.db
      .query("coachTrustLevels")
      .withIndex("by_coach", (q) => q.eq("coachId", insight.coachId))
      .first();

    if (
      trustLevel?.insightPreviewModeStats &&
      !trustLevel.insightPreviewModeStats.completedAt
    ) {
      // Calculate if this insight would have been auto-applied
      const effectiveLevel = Math.min(
        trustLevel.currentLevel,
        trustLevel.preferredLevel ?? trustLevel.currentLevel
      );
      const threshold = trustLevel.insightConfidenceThreshold ?? 0.7;
      const wouldAutoApply =
        insight.category !== "injury" &&
        insight.category !== "medical" &&
        effectiveLevel >= 2 &&
        insight.confidenceScore >= threshold;

      // Update preview mode stats - increment dismissed count
      const newInsights =
        trustLevel.insightPreviewModeStats.wouldAutoApplyInsights +
        (wouldAutoApply ? 1 : 0);
      const newDismissed =
        trustLevel.insightPreviewModeStats.coachDismissedThose +
        (wouldAutoApply ? 1 : 0);
      // Don't increment coachAppliedThose for dismissals
      const currentApplied =
        trustLevel.insightPreviewModeStats.coachAppliedThose;
      const agreementRate = newInsights > 0 ? currentApplied / newInsights : 0;

      await ctx.db.patch(trustLevel._id, {
        insightPreviewModeStats: {
          ...trustLevel.insightPreviewModeStats,
          wouldAutoApplyInsights: newInsights,
          coachDismissedThose: newDismissed,
          agreementRate,
          completedAt: newInsights >= 20 ? Date.now() : undefined,
        },
      });
    }

    // Dismiss the insight
    await ctx.db.patch(args.insightId, {
      status: "dismissed",
      dismissedAt: Date.now(),
      dismissedBy: userId,
    });

    return args.insightId;
  },
});
