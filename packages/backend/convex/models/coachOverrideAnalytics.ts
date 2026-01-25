import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Phase 4: Coach Override Analytics
 * Analyze patterns in coach override decisions to improve AI personalization
 */

/**
 * Get override patterns for a specific coach or organization
 * Platform admins can use this to understand AI performance and coach preferences
 */
export const getCoachOverridePatterns = query({
  args: {
    coachId: v.optional(v.string()), // For per-coach analytics
    organizationId: v.optional(v.string()), // For per-org analytics (Better Auth organization ID)
  },
  returns: v.object({
    totalOverrides: v.number(),
    byType: v.object({
      coach_approved_low_confidence: v.number(),
      coach_rejected_high_confidence: v.number(),
      coach_edited: v.number(),
      coach_revoked_auto: v.number(),
    }),
    avgConfidenceWhenRejected: v.union(v.number(), v.null()), // null if no rejections
    commonFeedbackReasons: v.object({
      wasInaccurate: v.number(),
      wasTooSensitive: v.number(),
      timingWasWrong: v.number(),
      hasOtherReason: v.number(),
    }),
    overrideRateByCategory: v.object({
      normal: v.object({
        total: v.number(),
        overridden: v.number(),
        rate: v.number(),
      }),
      injury: v.object({
        total: v.number(),
        overridden: v.number(),
        rate: v.number(),
      }),
      behavior: v.object({
        total: v.number(),
        overridden: v.number(),
        rate: v.number(),
      }),
    }),
  }),
  handler: async (ctx, args) => {
    // Require at least one filter parameter
    if (!(args.coachId || args.organizationId)) {
      throw new Error(
        "Must provide either coachId or organizationId for analytics"
      );
    }

    // Query summaries based on provided filters
    const summaries =
      args.coachId && args.organizationId
        ? // Both provided - use coach_org_status index
          await ctx.db
            .query("coachParentSummaries")
            .withIndex("by_coach_org_status", (q) =>
              q
                .eq("coachId", args.coachId)
                .eq("organizationId", args.organizationId)
            )
            .collect()
        : args.coachId
          ? // Coach only - use by_coach index
            await ctx.db
              .query("coachParentSummaries")
              .withIndex("by_coach", (q) => q.eq("coachId", args.coachId))
              .collect()
          : // Organization only - use by_org_status index (organizationId guaranteed by validation above)
            await ctx.db
              .query("coachParentSummaries")
              .withIndex("by_org_status", (q) =>
                q.eq("organizationId", args.organizationId ?? "")
              )
              .collect();

    // Initialize counters
    const byType = {
      coach_approved_low_confidence: 0,
      coach_rejected_high_confidence: 0,
      coach_edited: 0,
      coach_revoked_auto: 0,
    };

    const feedbackReasons = {
      wasInaccurate: 0,
      wasTooSensitive: 0,
      timingWasWrong: 0,
      hasOtherReason: 0,
    };

    const categoryStats = {
      normal: { total: 0, overridden: 0 },
      injury: { total: 0, overridden: 0 },
      behavior: { total: 0, overridden: 0 },
    };

    let rejectedConfidenceSum = 0;
    let rejectedCount = 0;

    // Process each summary
    for (const summary of summaries) {
      // Count by category (all summaries)
      const category = summary.sensitivityCategory;
      categoryStats[category].total += 1;

      // Check if this summary has an override
      if (summary.overrideType) {
        // Count by override type
        byType[summary.overrideType] += 1;

        // Mark as overridden for category stats
        categoryStats[category].overridden += 1;

        // Track confidence score for rejected high confidence
        if (summary.overrideType === "coach_rejected_high_confidence") {
          rejectedConfidenceSum += summary.publicSummary.confidenceScore;
          rejectedCount += 1;
        }

        // Count feedback reasons (if provided)
        if (summary.overrideFeedback) {
          if (summary.overrideFeedback.wasInaccurate) {
            feedbackReasons.wasInaccurate += 1;
          }
          if (summary.overrideFeedback.wasTooSensitive) {
            feedbackReasons.wasTooSensitive += 1;
          }
          if (summary.overrideFeedback.timingWasWrong) {
            feedbackReasons.timingWasWrong += 1;
          }
          if (summary.overrideFeedback.otherReason) {
            feedbackReasons.hasOtherReason += 1;
          }
        }
      }
    }

    // Calculate total overrides
    const totalOverrides = Object.values(byType).reduce(
      (sum, count) => sum + count,
      0
    );

    // Calculate average confidence when rejected
    const avgConfidenceWhenRejected =
      rejectedCount > 0 ? rejectedConfidenceSum / rejectedCount : null;

    // Calculate override rates by category
    const overrideRateByCategory = {
      normal: {
        total: categoryStats.normal.total,
        overridden: categoryStats.normal.overridden,
        rate:
          categoryStats.normal.total > 0
            ? categoryStats.normal.overridden / categoryStats.normal.total
            : 0,
      },
      injury: {
        total: categoryStats.injury.total,
        overridden: categoryStats.injury.overridden,
        rate:
          categoryStats.injury.total > 0
            ? categoryStats.injury.overridden / categoryStats.injury.total
            : 0,
      },
      behavior: {
        total: categoryStats.behavior.total,
        overridden: categoryStats.behavior.overridden,
        rate:
          categoryStats.behavior.total > 0
            ? categoryStats.behavior.overridden / categoryStats.behavior.total
            : 0,
      },
    };

    return {
      totalOverrides,
      byType,
      avgConfidenceWhenRejected,
      commonFeedbackReasons: feedbackReasons,
      overrideRateByCategory,
    };
  },
});
