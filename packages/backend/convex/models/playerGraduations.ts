/**
 * Player Graduations - Queries and mutations for the 18th birthday graduation flow
 *
 * This module handles:
 * - Detecting players who have turned 18 (guardians need to be notified)
 * - Sending graduation invitations to players
 * - Dismissing graduation prompts
 * - Claiming player accounts
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";

/**
 * Get pending graduations for the current user (as guardian)
 *
 * This query finds all children of the current user's guardian identity
 * that have pending graduation records (turned 18 but not yet claimed).
 *
 * Returns an array of pending graduations with player details.
 */
export const getPendingGraduations = query({
  args: {},
  returns: v.array(
    v.object({
      graduationId: v.id("playerGraduations"),
      playerIdentityId: v.id("playerIdentities"),
      playerName: v.string(),
      dateOfBirth: v.string(), // ISO date format
      turnedEighteenAt: v.number(),
      organizationId: v.string(),
      organizationName: v.string(),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;

    // Find the guardian identity for this user
    const guardian = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!guardian) {
      return [];
    }

    // Get all active links for this guardian
    const links = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian", (q) => q.eq("guardianIdentityId", guardian._id))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), undefined) // Legacy links without status are treated as active
        )
      )
      .collect();

    if (links.length === 0) {
      return [];
    }

    // For each linked child, check if they have a pending graduation record
    const pendingGraduations: Array<{
      graduationId: Id<"playerGraduations">;
      playerIdentityId: Id<"playerIdentities">;
      playerName: string;
      dateOfBirth: string;
      turnedEighteenAt: number;
      organizationId: string;
      organizationName: string;
    }> = [];

    for (const link of links) {
      // Get the player identity
      const player = await ctx.db.get(link.playerIdentityId);
      if (!player) {
        continue;
      }

      // Check if there's a pending graduation record
      const graduation = await ctx.db
        .query("playerGraduations")
        .withIndex("by_player", (q) =>
          q.eq("playerIdentityId", link.playerIdentityId)
        )
        .filter((q) => q.eq(q.field("status"), "pending"))
        .first();

      if (!graduation) {
        continue;
      }

      // Get organization name from Better Auth
      const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "organization",
        where: [
          { field: "_id", value: graduation.organizationId, operator: "eq" },
        ],
      });
      const organizationName =
        (org as { name?: string } | null)?.name || "Unknown Organization";

      pendingGraduations.push({
        graduationId: graduation._id,
        playerIdentityId: player._id,
        playerName: `${player.firstName} ${player.lastName}`,
        dateOfBirth: player.dateOfBirth,
        turnedEighteenAt: graduation.turnedEighteenAt,
        organizationId: graduation.organizationId,
        organizationName,
      });
    }

    return pendingGraduations;
  },
});

/**
 * Send a graduation invitation to a player who has turned 18
 *
 * This mutation:
 * 1. Verifies the current user is a guardian of this player
 * 2. Verifies the graduation record exists and is pending
 * 3. Generates a secure claim token
 * 4. Creates a playerClaimTokens record
 * 5. Updates the graduation status to invitation_sent
 * 6. (TODO: Send email via action)
 *
 * @param playerIdentityId - The ID of the player identity
 * @param playerEmail - The email address to send the invitation to
 */
export const sendGraduationInvite = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    playerEmail: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    token: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = identity.subject;

    // Verify the current user is a guardian of this player
    const guardian = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!guardian) {
      return { success: false, error: "User is not a guardian" };
    }

    // Check if this guardian has a link to this player
    const link = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian_and_player", (q) =>
        q
          .eq("guardianIdentityId", guardian._id)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!link) {
      return { success: false, error: "Player is not linked to this guardian" };
    }

    // Verify the graduation record exists and is pending
    const graduation = await ctx.db
      .query("playerGraduations")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (!graduation) {
      return { success: false, error: "No pending graduation record found" };
    }

    // Generate a secure token (UUID-like string)
    const token = crypto.randomUUID();
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    // Create the claim token record
    await ctx.db.insert("playerClaimTokens", {
      playerIdentityId: args.playerIdentityId,
      token,
      email: args.playerEmail.toLowerCase().trim(),
      createdAt: now,
      expiresAt: now + thirtyDaysMs,
    });

    // Update the graduation record
    await ctx.db.patch(graduation._id, {
      status: "invitation_sent",
      invitationSentAt: now,
      invitationSentBy: userId,
    });

    // TODO: Send email via action (Phase 7 future enhancement)
    // For now, we just log the token for testing
    console.log(
      `[graduations] Invitation sent for player ${args.playerIdentityId} to ${args.playerEmail}. Token: ${token}`
    );

    return { success: true, token };
  },
});

/**
 * Dismiss a graduation prompt permanently
 *
 * This mutation marks the graduation record as dismissed, so the guardian
 * won't be prompted about this player again.
 *
 * @param playerIdentityId - The ID of the player identity
 */
export const dismissGraduationPrompt = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userId = identity.subject;

    // Verify the current user is a guardian of this player
    const guardian = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!guardian) {
      return null;
    }

    // Check if this guardian has a link to this player
    const link = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_guardian_and_player", (q) =>
        q
          .eq("guardianIdentityId", guardian._id)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!link) {
      return null;
    }

    // Find the graduation record
    const graduation = await ctx.db
      .query("playerGraduations")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!graduation) {
      return null;
    }

    // Update the graduation record as dismissed
    await ctx.db.patch(graduation._id, {
      status: "dismissed",
      dismissedAt: Date.now(),
      dismissedBy: userId,
    });

    return null;
  },
});
