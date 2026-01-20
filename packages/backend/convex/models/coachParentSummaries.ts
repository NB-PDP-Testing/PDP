import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalMutation, mutation } from "../_generated/server";
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
