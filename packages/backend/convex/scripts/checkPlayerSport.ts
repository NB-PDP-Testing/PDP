/**
 * Quick helper to check if a player has a sportPassport for a specific sport
 * Useful for debugging team assignment errors
 *
 * Usage:
 *   npx convex run scripts/checkPlayerSport:checkPlayerSport '{
 *     "playerName": "Clodagh Barlow",
 *     "organizationId": "your-org-id",
 *     "sportCode": "GAA Football"
 *   }'
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

export const checkPlayerSport = internalQuery({
  args: {
    playerName: v.string(),
    organizationId: v.string(),
    sportCode: v.optional(v.string()),
  },
  returns: v.object({
    found: v.boolean(),
    player: v.union(
      v.null(),
      v.object({
        _id: v.string(),
        firstName: v.string(),
        lastName: v.string(),
        dateOfBirth: v.union(v.string(), v.null()),
      })
    ),
    enrollment: v.union(
      v.null(),
      v.object({
        _id: v.string(),
        ageGroup: v.union(v.string(), v.null()),
        status: v.string(),
      })
    ),
    sportPassports: v.array(
      v.object({
        _id: v.string(),
        sportCode: v.string(),
        status: v.string(),
      })
    ),
    hasRequestedSport: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Search for player by name
    const nameParts = args.playerName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");

    console.log(
      `[CheckPlayerSport] Searching for: ${firstName} ${lastName} in org ${args.organizationId}`
    );

    const allPlayers = await ctx.db.query("playerIdentities").collect();

    const player = allPlayers.find(
      (p) =>
        p.firstName.toLowerCase() === firstName.toLowerCase() &&
        p.lastName.toLowerCase() === lastName.toLowerCase()
    );

    if (!player) {
      return {
        found: false,
        player: null,
        enrollment: null,
        sportPassports: [],
        hasRequestedSport: false,
        message: `Player "${args.playerName}" not found in database`,
      };
    }

    console.log(`[CheckPlayerSport] Found player: ${player._id}`);

    // Get enrollment
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", player._id)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!enrollment) {
      return {
        found: true,
        player: {
          _id: player._id,
          firstName: player.firstName,
          lastName: player.lastName,
          dateOfBirth: player.dateOfBirth ?? null,
        },
        enrollment: null,
        sportPassports: [],
        hasRequestedSport: false,
        message: `Player found but has no enrollment in organization ${args.organizationId}`,
      };
    }

    console.log(`[CheckPlayerSport] Found enrollment: ${enrollment._id}`);

    // Get all sport passports for this player in this org
    const sportPassports = await ctx.db
      .query("sportPassports")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", player._id)
          .eq("organizationId", args.organizationId)
      )
      .collect();

    console.log(
      `[CheckPlayerSport] Found ${sportPassports.length} sport passports`
    );

    const activeSportPassports = sportPassports.filter(
      (p) => p.status === "active"
    );
    const hasRequestedSport = args.sportCode
      ? activeSportPassports.some((p) => p.sportCode === args.sportCode)
      : false;

    let message = `Player: ${player.firstName} ${player.lastName}\n`;
    message += `Enrollment: ${enrollment.ageGroup || "No age group"} (${enrollment.status})\n`;
    message += `Active Sports: ${activeSportPassports.map((p) => p.sportCode).join(", ") || "NONE"}\n`;

    if (args.sportCode) {
      message += `\nCan join ${args.sportCode} team? ${hasRequestedSport ? "✅ YES" : "❌ NO - needs sport passport"}`;
    }

    if (activeSportPassports.length === 0) {
      message +=
        "\n\n⚠️ WARNING: Player has no active sport passports! They cannot join any teams.";
      message +=
        "\n\nTo fix: Create a sport passport for this player using the enrollment wizard or manually.";
    }

    return {
      found: true,
      player: {
        _id: player._id,
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth ?? null,
      },
      enrollment: {
        _id: enrollment._id,
        ageGroup: enrollment.ageGroup ?? null,
        status: enrollment.status,
      },
      sportPassports: sportPassports.map((p) => ({
        _id: p._id,
        sportCode: p.sportCode,
        status: p.status,
      })),
      hasRequestedSport,
      message,
    };
  },
});
