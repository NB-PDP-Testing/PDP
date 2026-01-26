import { v } from "convex/values";
import { query } from "../_generated/server";
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
