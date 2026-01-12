"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendOrganizationInvitation } from "../utils/email";

/**
 * Internal action to resend invitation email
 * This is called from the resendInvitation mutation
 */
export const resendInvitationEmail = internalAction({
  args: {
    email: v.string(),
    invitedByUsername: v.string(),
    invitedByEmail: v.string(),
    organizationName: v.string(),
    inviteLink: v.string(),
    functionalRoles: v.optional(v.array(v.string())),
    teams: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          sport: v.optional(v.string()),
          ageGroup: v.optional(v.string()),
        })
      )
    ),
    players: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          ageGroup: v.optional(v.string()),
        })
      )
    ),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    console.log("📧 Resending invitation email", {
      email: args.email,
      organizationName: args.organizationName,
      functionalRoles: args.functionalRoles,
      teamsCount: args.teams?.length || 0,
      playersCount: args.players?.length || 0,
    });

    // Debug: Log full team/player data to verify serialization
    if (args.teams && args.teams.length > 0) {
      console.log("📧 Teams data:", JSON.stringify(args.teams, null, 2));
    }
    if (args.players && args.players.length > 0) {
      console.log("📧 Players data:", JSON.stringify(args.players, null, 2));
    }

    try {
      await sendOrganizationInvitation({
        email: args.email,
        invitedByUsername: args.invitedByUsername,
        invitedByEmail: args.invitedByEmail,
        organizationName: args.organizationName,
        inviteLink: args.inviteLink,
        functionalRoles: args.functionalRoles,
        teams: args.teams,
        players: args.players,
      });
      console.log("✅ Invitation email resent successfully");
    } catch (error) {
      console.error("❌ Error resending invitation email:", error);
      throw error;
    }

    return null;
  },
});
