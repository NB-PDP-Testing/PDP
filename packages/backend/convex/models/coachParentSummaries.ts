import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalMutation, mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get all guardians for a player
 * Returns array of guardian identities with their link details
 * @internal - Helper function for use within this module
 */
export async function getGuardiansForPlayer(
  ctx: QueryCtx | MutationCtx,
  playerIdentityId: Id<"playerIdentities">
) {
  // Get all guardian-player links for this player
  const links = await ctx.db
    .query("guardianPlayerLinks")
    .withIndex("by_player", (q) => q.eq("playerIdentityId", playerIdentityId))
    .collect();

  // Fetch full guardian identity for each link
  const guardians = await Promise.all(
    links.map(async (link) => {
      const guardian = await ctx.db.get(link.guardianIdentityId);
      return {
        link,
        guardian,
      };
    })
  );

  // Filter out any null guardians (should not happen, but be safe)
  return guardians.filter((g) => g.guardian !== null) as Array<{
    link: (typeof links)[0];
    guardian: NonNullable<Awaited<ReturnType<typeof ctx.db.get>>>;
  }>;
}

// ============================================================
// INTERNAL MUTATIONS
// ============================================================

/**
 * Create a parent summary record after AI generates it
 * @internal - Called by AI processing actions only
 */
export const createParentSummary = internalMutation({
  args: {
    voiceNoteId: v.id("voiceNotes"),
    insightId: v.string(),
    playerIdentityId: v.id("playerIdentities"),
    privateInsight: v.object({
      title: v.string(),
      description: v.string(),
      category: v.string(),
      sentiment: v.union(
        v.literal("positive"),
        v.literal("neutral"),
        v.literal("concern")
      ),
    }),
    publicSummary: v.object({
      content: v.string(),
      confidenceScore: v.number(),
      generatedAt: v.number(),
    }),
    sensitivityCategory: v.union(
      v.literal("normal"),
      v.literal("injury"),
      v.literal("behavior")
    ),
    sportId: v.id("sports"),
  },
  returns: v.id("coachParentSummaries"),
  handler: async (ctx, args) => {
    // Fetch the voice note to get coachId and orgId
    const voiceNote = await ctx.db.get(args.voiceNoteId);
    if (!voiceNote) {
      throw new Error("Voice note not found");
    }

    // Create the summary record
    const summaryId = await ctx.db.insert("coachParentSummaries", {
      voiceNoteId: args.voiceNoteId,
      insightId: args.insightId,
      coachId: voiceNote.coachId || "",
      playerIdentityId: args.playerIdentityId,
      organizationId: voiceNote.orgId,
      sportId: args.sportId,
      privateInsight: args.privateInsight,
      publicSummary: args.publicSummary,
      sensitivityCategory: args.sensitivityCategory,
      status: "pending_review",
      createdAt: Date.now(),
    });

    return summaryId;
  },
});

// ============================================================
// PUBLIC MUTATIONS
// ============================================================

/**
 * Approve a summary for delivery to parents
 * Only the coach who created the voice note can approve
 */
export const approveSummary = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Fetch the summary
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) {
      throw new Error("Summary not found");
    }

    // Verify user is the coach for this summary
    if (summary.coachId !== user.userId) {
      throw new Error("Only the coach can approve this summary");
    }

    // Update the summary status
    await ctx.db.patch(args.summaryId, {
      status: "approved",
      approvedAt: Date.now(),
      approvedBy: user.userId || "",
    });

    return null;
  },
});

/**
 * Suppress a summary so it never reaches parents
 * Only the coach who created the voice note can suppress
 */
export const suppressSummary = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Fetch the summary
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) {
      throw new Error("Summary not found");
    }

    // Verify user is the coach for this summary
    if (summary.coachId !== user.userId) {
      throw new Error("Only the coach can suppress this summary");
    }

    // Update the summary status
    await ctx.db.patch(args.summaryId, {
      status: "suppressed",
    });

    return null;
  },
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get pending summaries for a coach to review
 * Only returns summaries for voice notes created by this coach
 */
export const getCoachPendingSummaries = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Query summaries by coach with pending_review status
    const summaries = await ctx.db
      .query("coachParentSummaries")
      .withIndex("by_coach", (q) => q.eq("coachId", user.userId || ""))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("status"), "pending_review")
        )
      )
      .collect();

    // Fetch player info and sport info for each summary
    const summariesWithInfo = await Promise.all(
      summaries.map(async (summary) => {
        const player = await ctx.db.get(summary.playerIdentityId);
        const sport = await ctx.db.get(summary.sportId);
        return {
          ...summary,
          player,
          sport,
        };
      })
    );

    return summariesWithInfo;
  },
});

/**
 * Get unread summary count for a parent
 * Counts summaries with status approved/delivered and no viewedAt
 */
export const getParentUnreadCount = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return 0;
    }

    // Find guardian identity for this user
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!guardianIdentity) {
      return 0;
    }

    // Get all linked players for this guardian
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian", (q) =>
        q.eq("guardianIdentityId", guardianIdentity._id)
      )
      .collect();

    if (links.length === 0) {
      return 0;
    }

    // Count unread summaries across all linked players
    let count = 0;
    for (const link of links) {
      const summaries = await ctx.db
        .query("coachParentSummaries")
        .withIndex("by_player", (q) =>
          q.eq("playerIdentityId", link.playerIdentityId)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("organizationId"), args.organizationId),
            q.or(
              q.eq(q.field("status"), "approved"),
              q.eq(q.field("status"), "delivered")
            ),
            q.eq(q.field("viewedAt"), undefined)
          )
        )
        .collect();

      count += summaries.length;
    }

    return count;
  },
});

/**
 * Get parent summaries grouped by child and sport
 * Returns summaries for all children linked to this parent
 */
export const getParentSummariesByChildAndSport = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    // Find guardian identity for this user
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!guardianIdentity) {
      return [];
    }

    // Get all linked players for this guardian
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian", (q) =>
        q.eq("guardianIdentityId", guardianIdentity._id)
      )
      .collect();

    // For each child, get summaries grouped by sport
    const childrenWithSummaries = await Promise.all(
      links.map(async (link) => {
        const player = await ctx.db.get(link.playerIdentityId);
        if (!player) {
          return null;
        }

        // Get all summaries for this player
        const playerSummaries = await ctx.db
          .query("coachParentSummaries")
          .withIndex("by_player", (q) =>
            q.eq("playerIdentityId", link.playerIdentityId)
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("organizationId"), args.organizationId),
              q.or(
                q.eq(q.field("status"), "approved"),
                q.eq(q.field("status"), "delivered"),
                q.eq(q.field("status"), "viewed")
              )
            )
          )
          .collect();

        // Group by sport
        const sportMap = new Map<string, typeof playerSummaries>();
        for (const summary of playerSummaries) {
          const sportId = summary.sportId;
          if (!sportMap.has(sportId)) {
            sportMap.set(sportId, []);
          }
          const sportSummaries = sportMap.get(sportId);
          if (sportSummaries) {
            sportSummaries.push(summary);
          }
        }

        // Convert to array with sport info
        const sportGroups = await Promise.all(
          Array.from(sportMap.entries()).map(
            async ([sportId, sportSummaries]) => {
              const sport = await ctx.db.get(sportId as Id<"sports">);
              const unreadCount = sportSummaries.filter(
                (s) => !s.viewedAt
              ).length;
              return {
                sport,
                summaries: sportSummaries,
                unreadCount,
              };
            }
          )
        );

        return {
          player,
          sportGroups,
        };
      })
    );

    // Filter out null entries
    return childrenWithSummaries.filter((c) => c !== null);
  },
});

/**
 * Mark a summary as viewed by a parent
 * Creates a view record and updates the summary status
 */
export const markSummaryViewed = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
    viewSource: v.union(
      v.literal("dashboard"),
      v.literal("notification_click"),
      v.literal("direct_link")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Fetch the summary
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) {
      throw new Error("Summary not found");
    }

    // Find guardian identity for this user
    const guardianIdentity = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!guardianIdentity) {
      throw new Error("Guardian identity not found");
    }

    // Verify guardian is linked to the summary's player
    const link = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian_and_player", (q) =>
        q
          .eq("guardianIdentityId", guardianIdentity._id)
          .eq("playerIdentityId", summary.playerIdentityId)
      )
      .first();

    if (!link) {
      throw new Error("Not authorized to view this summary");
    }

    // Update summary status and viewedAt
    await ctx.db.patch(args.summaryId, {
      status: "viewed",
      viewedAt: Date.now(),
    });

    // Insert parentSummaryViews record
    await ctx.db.insert("parentSummaryViews", {
      summaryId: args.summaryId,
      guardianIdentityId: guardianIdentity._id,
      viewedAt: Date.now(),
      viewSource: args.viewSource,
    });

    return null;
  },
});
