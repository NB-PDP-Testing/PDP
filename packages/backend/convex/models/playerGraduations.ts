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
import { components, internal } from "../_generated/api";
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

    // Fetch the graduation record and check status in code (no combined index)
    const graduation = await ctx.db
      .query("playerGraduations")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (
      !graduation ||
      (graduation.status !== "pending" &&
        graduation.status !== "invitation_sent")
    ) {
      return { success: false, error: "No actionable graduation record found" };
    }

    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    // Invalidate all previous unused tokens for this player before issuing a new one
    const existingTokens = await ctx.db
      .query("playerClaimTokens")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();
    for (const t of existingTokens) {
      if (!t.usedAt) {
        await ctx.db.patch(t._id, { usedAt: now });
      }
    }

    // Generate a new secure token
    const token = crypto.randomUUID();

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

    // Get player name and organization name for the email
    const player = await ctx.db.get(args.playerIdentityId);
    let organizationName = "Your Organization";
    if (graduation.organizationId) {
      const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "organization",
        where: [
          { field: "_id", value: graduation.organizationId, operator: "eq" },
        ],
      });
      organizationName =
        (org as { name?: string } | null)?.name || "Your Organization";
    }

    // Send email via action (scheduled immediately)
    await ctx.scheduler.runAfter(
      0,
      internal.actions.graduations.sendGraduationInvitationEmailAction,
      {
        email: args.playerEmail.toLowerCase().trim(),
        playerFirstName: player?.firstName ?? "Player",
        organizationName,
        claimToken: token,
      }
    );

    console.log(
      `[graduations] Invitation scheduled for player ${args.playerIdentityId} to ${args.playerEmail}`
    );

    return { success: true, token };
  },
});

/**
 * Send a graduation invitation from an admin — bypasses guardian check.
 *
 * Admins can send directly to the player without being linked as a guardian.
 * Otherwise identical to sendGraduationInvite: invalidates old tokens,
 * creates a new 30-day token, and fires the invitation email.
 */
export const sendAdminGraduationInvite = mutation({
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

    // Fetch the graduation record and check status in code
    const graduation = await ctx.db
      .query("playerGraduations")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (
      !graduation ||
      (graduation.status !== "pending" &&
        graduation.status !== "invitation_sent")
    ) {
      return { success: false, error: "No actionable graduation record found" };
    }

    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    // Invalidate all previous unused tokens
    const existingTokens = await ctx.db
      .query("playerClaimTokens")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();
    for (const t of existingTokens) {
      if (!t.usedAt) {
        await ctx.db.patch(t._id, { usedAt: now });
      }
    }

    const token = crypto.randomUUID();

    await ctx.db.insert("playerClaimTokens", {
      playerIdentityId: args.playerIdentityId,
      token,
      email: args.playerEmail.toLowerCase().trim(),
      createdAt: now,
      expiresAt: now + thirtyDaysMs,
    });

    await ctx.db.patch(graduation._id, {
      status: "invitation_sent",
      invitationSentAt: now,
      invitationSentBy: userId,
    });

    const player = await ctx.db.get(args.playerIdentityId);
    let organizationName = "Your Organization";
    if (graduation.organizationId) {
      const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "organization",
        where: [
          { field: "_id", value: graduation.organizationId, operator: "eq" },
        ],
      });
      organizationName =
        (org as { name?: string } | null)?.name || "Your Organization";
    }

    await ctx.scheduler.runAfter(
      0,
      internal.actions.graduations.sendGraduationInvitationEmailAction,
      {
        email: args.playerEmail.toLowerCase().trim(),
        playerFirstName: player?.firstName ?? "Player",
        organizationName,
        claimToken: token,
      }
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
    organizationId: v.optional(v.string()),
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
      organizationId: enrollment?.organizationId,
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

    // TODO: Phase 7 — revoke parent's wellness view access on graduation to adult account.
    // When parentChildAuthorizations table exists, set includeWellnessAccess = false here.
    // See: packages/backend/convex/models/playerHealthChecks.ts getChildWellnessForParent

    // Update graduation record if exists
    if (graduation) {
      await ctx.db.patch(graduation._id, {
        status: "claimed",
        claimedAt: now,
      });
    }

    // Atomically mark the verification PIN as used (if one exists)
    // This prevents replay attacks and confirms PIN was verified before claiming
    const activePin = await ctx.db
      .query("verificationPins")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", claimToken.playerIdentityId)
      )
      .filter((q) => q.eq(q.field("usedAt"), undefined))
      .first();

    if (!activePin || activePin.expiresAt < now) {
      return {
        success: false,
        error:
          "Identity verification required. Please complete PIN verification first.",
      };
    }

    // Mark the PIN as used atomically
    await ctx.db.patch(activePin._id, { usedAt: now });

    // Mark the token as used
    await ctx.db.patch(claimToken._id, {
      usedAt: now,
    });

    // Get enrollment to find org admins to notify
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", claimToken.playerIdentityId)
      )
      .first();

    if (enrollment) {
      // Send age_transition_claimed notification to org admins
      const orgId = enrollment.organizationId;
      const orgMembersResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "member",
          paginationOpts: { cursor: null, numItems: 100 },
          where: [{ field: "organizationId", value: orgId, operator: "eq" }],
        }
      );
      const orgMembers = orgMembersResult.page;

      for (const member of orgMembers as Array<{
        userId: string;
        role: string;
      }>) {
        if (member.role === "admin" || member.role === "owner") {
          await ctx.runMutation(
            internal.models.notifications.createNotification,
            {
              userId: member.userId,
              organizationId: orgId,
              type: "age_transition_claimed",
              title: `${player.firstName} ${player.lastName} Claimed Their Account`,
              message: `${player.firstName} ${player.lastName} has successfully claimed their PlayerARC account and is now an adult player.`,
              relatedPlayerId: claimToken.playerIdentityId,
            }
          );
        }
      }
    }

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

/**
 * Send a verification PIN to prove identity before claiming an account
 *
 * Generates a 6-digit PIN and sends it via:
 * - SMS (Twilio) if the player has a mobile number on their playerIdentity
 * - Email (Resend) to the claim email if no mobile number is available
 *
 * The PIN is stored in verificationPins table with 10-minute expiry.
 * Any previous unused PINs for this player are invalidated.
 *
 * @param playerIdentityId - The player identity to send PIN for
 * @param claimEmail - The email address (from the claim token) for email fallback
 */
export const sendClaimVerificationPin = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    claimEmail: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    channel: v.union(v.literal("sms"), v.literal("email")),
    maskedDestination: v.string(), // e.g. "+353 87 *** 4567" or "pl***@example.com"
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Get the player identity to check for mobile
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      return {
        success: false,
        channel: "email" as const,
        maskedDestination: "",
        error: "Player not found",
      };
    }

    // Generate a 6-digit PIN
    const pin = Math.floor(100_000 + Math.random() * 900_000).toString();
    const now = Date.now();
    const tenMinutesMs = 10 * 60 * 1000;

    // Determine channel: SMS if mobile available, email otherwise
    const mobileNumber = player.phone;
    const channel: "sms" | "email" = mobileNumber ? "sms" : "email";

    // Invalidate any existing unused PINs for this player
    const existingPins = await ctx.db
      .query("verificationPins")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    for (const existingPin of existingPins) {
      if (!existingPin.usedAt) {
        // Mark as used/expired
        await ctx.db.patch(existingPin._id, { usedAt: now });
      }
    }

    // Store the new PIN
    await ctx.db.insert("verificationPins", {
      playerIdentityId: args.playerIdentityId,
      pin,
      expiresAt: now + tenMinutesMs,
      attemptCount: 0,
      channel,
    });

    // Calculate masked destination
    let maskedDestination: string;
    if (channel === "sms" && mobileNumber) {
      // Mask mobile: show first 4 chars and last 4 chars
      const clean = mobileNumber.replace(/\s/g, "");
      if (clean.length > 8) {
        maskedDestination = `${clean.slice(0, 4)} *** ${clean.slice(-4)}`;
      } else {
        maskedDestination = `${clean.slice(0, 2)}*****${clean.slice(-2)}`;
      }
    } else {
      // Mask email: show first 2 chars + domain
      const emailParts = args.claimEmail.split("@");
      const localPart = emailParts[0] ?? "";
      const domain = emailParts[1] ?? "";
      maskedDestination = `${localPart.slice(0, 2)}***@${domain}`;
    }

    // Schedule the PIN send via action
    await ctx.scheduler.runAfter(
      0,
      internal.actions.graduations.sendVerificationPinAction,
      {
        channel,
        destination: channel === "sms" ? (mobileNumber ?? "") : args.claimEmail,
        pin,
        playerFirstName: player.firstName,
      }
    );

    return { success: true, channel, maskedDestination };
  },
});

/**
 * Verify a claim PIN for a player identity
 *
 * Checks if the provided PIN is valid and not expired.
 * Increments the attempt count and returns failure if wrong.
 * Does NOT mark the PIN as used — that happens atomically in claimPlayerAccount.
 *
 * @param playerIdentityId - The player identity
 * @param pin - The 6-digit PIN to verify
 */
export const verifyClaimPin = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    pin: v.string(),
  },
  returns: v.object({
    valid: v.boolean(),
    expired: v.boolean(),
    attemptsRemaining: v.number(),
    locked: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const maxAttempts = 3;

    // Find the most recent unused PIN for this player
    const pins = await ctx.db
      .query("verificationPins")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    // Find the most recent valid (not used) PIN
    const activePin = pins
      .filter((p) => !p.usedAt)
      .sort((a, b) => b.expiresAt - a.expiresAt)[0];

    if (!activePin) {
      return {
        valid: false,
        expired: false,
        attemptsRemaining: 0,
        locked: false,
        error: "No PIN found. Please request a new verification code.",
      };
    }

    // Check if expired
    if (activePin.expiresAt < now) {
      return {
        valid: false,
        expired: true,
        attemptsRemaining: 0,
        locked: false,
        error: "Code expired. Please request a new one.",
      };
    }

    // Check if locked (too many attempts)
    if (activePin.attemptCount >= maxAttempts) {
      return {
        valid: false,
        expired: false,
        attemptsRemaining: 0,
        locked: true,
        error:
          "Too many incorrect attempts. Please ask your guardian to resend the invite.",
      };
    }

    // Check the PIN
    if (activePin.pin !== args.pin) {
      // Increment attempt count
      const newAttemptCount = activePin.attemptCount + 1;
      await ctx.db.patch(activePin._id, { attemptCount: newAttemptCount });

      const attemptsRemaining = maxAttempts - newAttemptCount;
      const locked = attemptsRemaining <= 0;

      return {
        valid: false,
        expired: false,
        attemptsRemaining,
        locked,
        error: locked
          ? "Too many incorrect attempts. Please ask your guardian to resend the invite."
          : `Incorrect code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`,
      };
    }

    // PIN is correct — don't mark as used yet, that happens in claimPlayerAccount
    return {
      valid: true,
      expired: false,
      attemptsRemaining: maxAttempts - activePin.attemptCount,
      locked: false,
    };
  },
});

/**
 * Mark the player as welcomed after completing the onboarding welcome step.
 * This dismisses the player_claimed_account onboarding task.
 */
export const markPlayerWelcomed = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userId = identity.subject;

    const player = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!player) {
      return null;
    }

    await ctx.db.patch(player._id, {
      playerWelcomedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Get pending graduations for admin view
 * Returns graduations for a specific player (used by admin player profile page)
 */
export const getPlayerGraduationStatus = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.union(
    v.object({
      found: v.literal(true),
      graduationId: v.id("playerGraduations"),
      status: v.string(),
      invitationSentAt: v.optional(v.number()),
      claimedAt: v.optional(v.number()),
      dismissedAt: v.optional(v.number()),
    }),
    v.object({
      found: v.literal(false),
    })
  ),
  handler: async (ctx, args) => {
    const graduation = await ctx.db
      .query("playerGraduations")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!graduation) {
      return { found: false as const };
    }

    return {
      found: true as const,
      graduationId: graduation._id,
      status: graduation.status,
      invitationSentAt: graduation.invitationSentAt,
      claimedAt: graduation.claimedAt,
      dismissedAt: graduation.dismissedAt,
    };
  },
});
