/**
 * Review Analytics - Track coach actions on the /r/ review microsite
 *
 * US-VN-012a: Review Analytics & Coach Learning
 *
 * Logs every apply/dismiss/edit/snooze action for:
 * 1. Coach decision pattern analysis
 * 2. Auto-tuning trust thresholds
 * 3. Organization-level review stats
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Log a review analytics event.
 * Called internally from apply/dismiss/edit mutations.
 */
export const logReviewEvent = internalMutation({
  args: {
    linkCode: v.string(),
    coachUserId: v.string(),
    organizationId: v.string(),
    eventType: v.union(
      v.literal("apply"),
      v.literal("dismiss"),
      v.literal("edit"),
      v.literal("snooze"),
      v.literal("batch_apply"),
      v.literal("batch_dismiss")
    ),
    insightId: v.optional(v.string()),
    voiceNoteId: v.optional(v.id("voiceNotes")),
    category: v.optional(v.string()),
    confidenceScore: v.optional(v.number()),
    wasAutoApplyCandidate: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("reviewAnalyticsEvents", {
      ...args,
      timestamp: Date.now(),
    });
    return null;
  },
});

/**
 * Get coach decision patterns for threshold tuning.
 * Returns apply/dismiss/edit counts and agreement rate over last 30 days.
 */
export const getCoachDecisionPatterns = internalQuery({
  args: {
    coachUserId: v.string(),
  },
  returns: v.object({
    totalApply: v.number(),
    totalDismiss: v.number(),
    totalEdit: v.number(),
    totalDecisions: v.number(),
    agreementRate: v.number(),
    categoryBreakdown: v.any(),
  }),
  handler: async (ctx, args) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const events = await ctx.db
      .query("reviewAnalyticsEvents")
      .withIndex("by_coachUserId_and_timestamp", (q) =>
        q.eq("coachUserId", args.coachUserId).gte("timestamp", thirtyDaysAgo)
      )
      .collect();

    let totalApply = 0;
    let totalDismiss = 0;
    let totalEdit = 0;
    let autoApplyCandidatesApplied = 0;
    let autoApplyCandidatesTotal = 0;

    // Category-level override tracking
    const categoryStats = new Map<
      string,
      { applied: number; dismissed: number; edited: number }
    >();

    for (const event of events) {
      const cat = event.category ?? "unknown";
      const stats = categoryStats.get(cat) ?? {
        applied: 0,
        dismissed: 0,
        edited: 0,
      };

      if (event.eventType === "apply" || event.eventType === "batch_apply") {
        totalApply += 1;
        stats.applied += 1;
      } else if (
        event.eventType === "dismiss" ||
        event.eventType === "batch_dismiss"
      ) {
        totalDismiss += 1;
        stats.dismissed += 1;
      } else if (event.eventType === "edit") {
        totalEdit += 1;
        stats.edited += 1;
      }

      // Track agreement with auto-apply candidates
      if (event.wasAutoApplyCandidate) {
        autoApplyCandidatesTotal += 1;
        if (event.eventType === "apply" || event.eventType === "batch_apply") {
          autoApplyCandidatesApplied += 1;
        }
      }

      categoryStats.set(cat, stats);
    }

    const totalDecisions = totalApply + totalDismiss;
    const agreementRate =
      autoApplyCandidatesTotal > 0
        ? autoApplyCandidatesApplied / autoApplyCandidatesTotal
        : 1; // Default to 1 (full agreement) when no data

    // Convert Map to plain object for serialization
    const categoryBreakdown: Record<
      string,
      { applied: number; dismissed: number; edited: number }
    > = {};
    for (const [cat, stats] of categoryStats) {
      categoryBreakdown[cat] = stats;
    }

    return {
      totalApply,
      totalDismiss,
      totalEdit,
      totalDecisions,
      agreementRate,
      categoryBreakdown,
    };
  },
});

/**
 * Get organization-level review stats (aggregate).
 */
export const getOrganizationReviewStats = internalQuery({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    totalEvents: v.number(),
    totalApply: v.number(),
    totalDismiss: v.number(),
    totalEdit: v.number(),
    uniqueCoaches: v.number(),
  }),
  handler: async (ctx, args) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const events = await ctx.db
      .query("reviewAnalyticsEvents")
      .withIndex("by_organizationId_and_timestamp", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .gte("timestamp", thirtyDaysAgo)
      )
      .collect();

    let totalApply = 0;
    let totalDismiss = 0;
    let totalEdit = 0;
    const coaches = new Set<string>();

    for (const event of events) {
      coaches.add(event.coachUserId);
      if (event.eventType === "apply" || event.eventType === "batch_apply") {
        totalApply += 1;
      } else if (
        event.eventType === "dismiss" ||
        event.eventType === "batch_dismiss"
      ) {
        totalDismiss += 1;
      } else if (event.eventType === "edit") {
        totalEdit += 1;
      }
    }

    return {
      totalEvents: events.length,
      totalApply,
      totalDismiss,
      totalEdit,
      uniqueCoaches: coaches.size,
    };
  },
});
