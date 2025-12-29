/**
 * Debug Player Data
 *
 * Diagnostic query to help debug missing player fields (DOB, teams, etc.)
 * Use this to investigate why certain fields aren't displaying on player profiles.
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalQuery } from "../_generated/server";
import type { Doc as BetterAuthDoc } from "../betterAuth/_generated/dataModel";

export const debugPlayerProfile = internalQuery({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.object({
    playerIdentity: v.object({
      _id: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.union(v.string(), v.null()),
      gender: v.union(v.string(), v.null()),
      hasDOB: v.boolean(),
    }),
    enrollment: v.union(
      v.null(),
      v.object({
        _id: v.string(),
        ageGroup: v.union(v.string(), v.null()),
        sport: v.union(v.string(), v.null()),
        status: v.string(),
      })
    ),
    teamMemberships: v.array(
      v.object({
        _id: v.string(),
        teamId: v.string(),
        status: v.string(),
        joinedDate: v.union(v.string(), v.null()),
        isActive: v.boolean(),
      })
    ),
    activeTeamMemberships: v.array(
      v.object({
        _id: v.string(),
        teamId: v.string(),
        teamName: v.string(),
        teamExists: v.boolean(),
      })
    ),
    issues: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const issues: string[] = [];

    // 1. Check player identity
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      throw new Error("Player identity not found");
    }

    const hasDOB = !!player.dateOfBirth;
    if (!hasDOB) {
      issues.push("Player dateOfBirth is null/undefined");
    }

    // 2. Check enrollment
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!enrollment) {
      issues.push("No enrollment found for this organization");
    } else if (!enrollment.ageGroup) {
      issues.push("Enrollment missing ageGroup");
    } else if (!enrollment.sport) {
      issues.push("Enrollment missing sport");
    }

    // 3. Check all team memberships
    const teamMemberships = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    if (teamMemberships.length === 0) {
      issues.push("No team memberships found (player not on any teams)");
    }

    const activeCount = teamMemberships.filter(
      (m) => m.status === "active"
    ).length;
    if (teamMemberships.length > 0 && activeCount === 0) {
      issues.push(
        `Player has ${teamMemberships.length} team memberships but none are active`
      );
    }

    // 4. Check if teams exist in Better Auth
    const activeTeamMemberships = teamMemberships.filter(
      (m) => m.status === "active"
    );

    const teamDetails = await Promise.all(
      activeTeamMemberships.map(async (m) => {
        const teamResult = await ctx.runQuery(
          components.betterAuth.adapter.findMany,
          {
            model: "team",
            paginationOpts: { cursor: null, numItems: 1 },
            where: [{ field: "_id", value: m.teamId, operator: "eq" }],
          }
        );
        const team = teamResult.page[0] as BetterAuthDoc<"team"> | undefined;

        if (!team) {
          issues.push(
            `Team membership ${m._id} references team ${m.teamId} which doesn't exist in Better Auth`
          );
        }

        return {
          _id: m._id,
          teamId: m.teamId,
          teamName: team?.name || "NOT FOUND",
          teamExists: !!team,
        };
      })
    );

    return {
      playerIdentity: {
        _id: player._id,
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth ?? null,
        gender: player.gender ?? null,
        hasDOB,
      },
      enrollment: enrollment
        ? {
            _id: enrollment._id,
            ageGroup: enrollment.ageGroup ?? null,
            sport: enrollment.sport ?? null,
            status: enrollment.status,
          }
        : null,
      teamMemberships: teamMemberships.map((m) => ({
        _id: m._id,
        teamId: m.teamId,
        status: m.status,
        joinedDate: m.joinedDate ?? null,
        isActive: m.status === "active",
      })),
      activeTeamMemberships: teamDetails,
      issues,
    };
  },
});
