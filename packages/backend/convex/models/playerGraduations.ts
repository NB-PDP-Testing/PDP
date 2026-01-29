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

/**
 * Get the status of a player claim token
 *
 * This query is used by the claim account page to validate the token
 * and display appropriate content.
 *
 * @param token - The claim token from the URL
 */
export const getPlayerClaimStatus = query({
  args: {
    token: v.string(),
  },
  returns: v.object({
    valid: v.boolean(),
    expired: v.boolean(),
    used: v.boolean(),
    playerName: v.optional(v.string()),
    organizationName: v.optional(v.string()),
    playerIdentityId: v.optional(v.id("playerIdentities")),
  }),
  handler: async (ctx, args) => {
    // Find the claim token
    const claimToken = await ctx.db
      .query("playerClaimTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!claimToken) {
      return {
        valid: false,
        expired: false,
        used: false,
      };
    }

    // Check if already used
    if (claimToken.usedAt) {
      return {
        valid: false,
        expired: false,
        used: true,
      };
    }

    // Check if expired
    const now = Date.now();
    if (claimToken.expiresAt < now) {
      return {
        valid: false,
        expired: true,
        used: false,
      };
    }

    // Token is valid - get player and organization info
    const player = await ctx.db.get(claimToken.playerIdentityId);
    if (!player) {
      return {
        valid: false,
        expired: false,
        used: false,
      };
    }

    // Get organization name from enrollment
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", claimToken.playerIdentityId)
      )
      .first();

    let organizationName = "Unknown Organization";
    if (enrollment) {
      const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "organization",
        where: [
          { field: "_id", value: enrollment.organizationId, operator: "eq" },
        ],
      });
      organizationName =
        (org as { name?: string } | null)?.name || "Unknown Organization";
    }

    return {
      valid: true,
      expired: false,
      used: false,
      playerName: `${player.firstName} ${player.lastName}`,
      organizationName,
      playerIdentityId: claimToken.playerIdentityId,
    };
  },
});

/**
 * Claim a player account using a valid token
 *
 * This mutation:
 * 1. Validates the token is valid and not expired/used
 * 2. Links the player identity to the user account
 * 3. Updates the graduation record to claimed
 * 4. Marks the token as used
 *
 * @param token - The claim token
 * @param userId - The authenticated user's ID
 */
export const claimPlayerAccount = mutation({
  args: {
    token: v.string(),
    userId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    playerIdentityId: v.optional(v.id("playerIdentities")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Not authenticated" };
    }

    // Find the claim token
    const claimToken = await ctx.db
      .query("playerClaimTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!claimToken) {
      return { success: false, error: "Invalid token" };
    }

    // Check if already used
    if (claimToken.usedAt) {
      return { success: false, error: "Token already used" };
    }

    // Check if expired
    const now = Date.now();
    if (claimToken.expiresAt < now) {
      return { success: false, error: "Token expired" };
    }

    // Get the player identity
    const player = await ctx.db.get(claimToken.playerIdentityId);
    if (!player) {
      return { success: false, error: "Player not found" };
    }

    // Check if player is already claimed by another user
    if (player.userId && player.userId !== args.userId) {
      return {
        success: false,
        error: "Player already claimed by another user",
      };
    }

    // Find the graduation record to get the inviting guardian
    const graduation = await ctx.db
      .query("playerGraduations")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", claimToken.playerIdentityId)
      )
      .first();

    // Update the player identity to link it to the user
    await ctx.db.patch(claimToken.playerIdentityId, {
      userId: args.userId,
      claimedAt: now,
      claimInvitedBy: graduation?.invitationSentBy,
      playerType: "adult", // Convert from youth to adult
      updatedAt: now,
    });

    // Update graduation record if exists
    if (graduation) {
      await ctx.db.patch(graduation._id, {
        status: "claimed",
        claimedAt: now,
      });
    }

    // Mark the token as used
    await ctx.db.patch(claimToken._id, {
      usedAt: now,
    });

    console.log(
      `[graduations] Player ${claimToken.playerIdentityId} claimed by user ${args.userId}`
    );

    return {
      success: true,
      playerIdentityId: claimToken.playerIdentityId,
    };
  },
});

/**
 * Get player dashboard data for a claimed player
 *
 * Returns the player's profile, teams, goals, and recent activity
 * for display on the player dashboard.
 *
 * @param organizationId - The organization ID to get dashboard data for
 */
export const getPlayerDashboard = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.union(
    v.object({
      found: v.literal(true),
      player: v.object({
        id: v.id("playerIdentities"),
        firstName: v.string(),
        lastName: v.string(),
        dateOfBirth: v.string(),
        gender: v.string(),
      }),
      enrollment: v.object({
        id: v.id("orgPlayerEnrollments"),
        ageGroup: v.string(),
        status: v.string(),
        clubMembershipNumber: v.optional(v.string()),
      }),
      teams: v.array(
        v.object({
          id: v.string(), // Team IDs are strings (Better Auth managed)
          name: v.string(),
          sport: v.optional(v.string()),
        })
      ),
      organizationName: v.string(),
    }),
    v.object({
      found: v.literal(false),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { found: false as const };
    }

    const userId = identity.subject;

    // Find the player identity for this user
    const player = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!player) {
      return { found: false as const };
    }

    // Get the enrollment for this org
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", player._id)
      )
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first();

    if (!enrollment) {
      return { found: false as const };
    }

    // Get organization name
    const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
    });
    const organizationName =
      (org as { name?: string } | null)?.name || "Unknown Organization";

    // Get team assignments
    const teamAssignments = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", player._id)
      )
      .collect();

    const teams: Array<{
      id: string;
      name: string;
      sport?: string;
    }> = [];

    for (const assignment of teamAssignments) {
      // Team is managed by Better Auth, so we need to use the adapter
      const team = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "team",
        where: [{ field: "_id", value: assignment.teamId, operator: "eq" }],
      });
      if (team) {
        const teamData = team as { _id: string; name?: string; sport?: string };
        teams.push({
          id: teamData._id,
          name: teamData.name || "Unknown Team",
          sport: teamData.sport,
        });
      }
    }

    return {
      found: true as const,
      player: {
        id: player._id,
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth,
        gender: player.gender,
      },
      enrollment: {
        id: enrollment._id,
        ageGroup: enrollment.ageGroup,
        status: enrollment.status,
        clubMembershipNumber: enrollment.clubMembershipNumber,
      },
      teams,
      organizationName,
    };
  },
});

/**
 * Check if the current user has a player dashboard in the given organization
 *
 * Used by the navigation to determine whether to show the "My Dashboard" link.
 *
 * @param organizationId - The organization ID to check
 */
export const hasPlayerDashboard = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const userId = identity.subject;

    // Find the player identity for this user
    const player = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!player) {
      return false;
    }

    // Check if there's an enrollment in this org
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", player._id)
      )
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first();

    return enrollment !== null;
  },
});
