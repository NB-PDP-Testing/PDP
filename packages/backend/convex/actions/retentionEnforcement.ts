"use node";

/**
 * Erasure Execution Action — GDPR Article 17
 *
 * Executes the approved data categories of an erasure request.
 * Called by the admin after reviewing a request and approving specific categories.
 *
 * IMPORTANT:
 * - Uses the soft-delete pattern for all personal data (never ctx.db.delete())
 * - Processes in pages to avoid Convex execution time limits
 * - Is idempotent — safe to run multiple times (skips already-processed categories)
 * - Does NOT bypass the 30-day grace period after soft-delete
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

export const executeApprovedErasureCategories = internalAction({
  args: {
    requestId: v.id("erasureRequests"),
    approvedCategories: v.array(v.string()),
    organizationId: v.string(),
    playerIdentityId: v.id("playerIdentities"),
    playerId: v.id("orgPlayerEnrollments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const category of args.approvedCategories) {
      // Idempotency: skip if already erased
      const request = await ctx.runQuery(
        internal.models.erasureRequests.getErasureRequestByIdInternal,
        { requestId: args.requestId }
      );
      if (!request) {
        break;
      }

      const alreadyErased = request.categoryDecisions?.find(
        (d) => d.category === category && d.erasedAt !== undefined
      );
      if (alreadyErased) {
        continue;
      }

      if (category === "WELLNESS_DATA") {
        // Soft-delete all dailyPlayerHealthChecks for this player
        await ctx.runMutation(
          internal.models.retentionConfig.softDeleteAllWellnessForPlayer,
          {
            playerIdentityId: args.playerIdentityId,
            organizationId: args.organizationId,
          }
        );
        await ctx.runMutation(
          internal.models.erasureRequests.markCategoryErased,
          { requestId: args.requestId, category, erasedAt: now }
        );
      } else if (category === "PROFILE_DATA") {
        await ctx.runMutation(
          internal.models.adultPlayers.anonymisePlayerProfile,
          { playerId: args.playerId }
        );
        await ctx.runMutation(
          internal.models.erasureRequests.markCategoryErased,
          { requestId: args.requestId, category, erasedAt: now }
        );
      } else if (category === "COMMUNICATION_DATA") {
        // Soft-delete all whatsappWellnessSessions for this player
        await ctx.runMutation(
          internal.models.retentionConfig
            .softDeleteAllWellnessSessionsForPlayer,
          {
            playerIdentityId: args.playerIdentityId,
            organizationId: args.organizationId,
          }
        );
        await ctx.runMutation(
          internal.models.erasureRequests.markCategoryErased,
          { requestId: args.requestId, category, erasedAt: now }
        );
      } else if (category === "COACH_FEEDBACK") {
        // coachPlayerFeedback table does not yet exist — log and mark as processed
        console.warn(
          "[ERASURE] COACH_FEEDBACK: no coachPlayerFeedback table found. Marking as erased."
        );
        await ctx.runMutation(
          internal.models.erasureRequests.markCategoryErased,
          { requestId: args.requestId, category, erasedAt: now }
        );
      } else if (category === "ASSESSMENT_HISTORY") {
        // Assessment data is within orgPlayerEnrollments — covered by PROFILE_DATA anonymisation
        console.warn(
          "[ERASURE] ASSESSMENT_HISTORY: covered by PROFILE_DATA anonymisation."
        );
        await ctx.runMutation(
          internal.models.erasureRequests.markCategoryErased,
          { requestId: args.requestId, category, erasedAt: now }
        );
      } else {
        console.warn(`[ERASURE] Unknown category: ${category} — skipping.`);
      }
    }

    // Mark request as completed
    await ctx.runMutation(
      internal.models.erasureRequests.completeErasureRequest,
      {
        requestId: args.requestId,
        processedAt: now,
      }
    );

    return null;
  },
});
