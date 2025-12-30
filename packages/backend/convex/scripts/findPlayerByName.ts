/**
 * Find player by name and show their team memberships
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

export const findPlayerByName = internalQuery({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    organizationId: v.string(),
  },
  returns: v.object({
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
    teamMemberships: v.array(
      v.object({
        _id: v.string(),
        teamId: v.string(),
        status: v.string(),
        joinedDate: v.union(v.string(), v.null()),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Find player by name
    const player = await ctx.db
      .query("playerIdentities")
      .filter((q) =>
        q.and(
          q.eq(q.field("firstName"), args.firstName),
          q.eq(q.field("lastName"), args.lastName)
        )
      )
      .first();

    if (!player) {
      return {
        player: null,
        enrollment: null,
        sportPassports: [],
        teamMemberships: [],
      };
    }

    // Get enrollment
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", player._id)
          .eq("organizationId", args.organizationId)
      )
      .first();

    // Phase 3: Get sport passports
    // Sport is now stored in sportPassports, not enrollment
    const sportPassports = enrollment
      ? await ctx.db
          .query("sportPassports")
          .withIndex("by_player_and_org", (q) =>
            q
              .eq("playerIdentityId", player._id)
              .eq("organizationId", enrollment.organizationId)
          )
          .collect()
      : [];

    // Get team memberships
    const teamMemberships = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", player._id)
      )
      .collect();

    return {
      player: {
        _id: player._id,
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth ?? null,
      },
      enrollment: enrollment
        ? {
            _id: enrollment._id,
            ageGroup: enrollment.ageGroup ?? null,
            status: enrollment.status,
          }
        : null,
      sportPassports: sportPassports.map((p) => ({
        _id: p._id,
        sportCode: p.sportCode,
        status: p.status,
      })),
      teamMemberships: teamMemberships.map((m) => ({
        _id: m._id,
        teamId: m.teamId,
        status: m.status,
        joinedDate: m.joinedDate ?? null,
      })),
    };
  },
});
