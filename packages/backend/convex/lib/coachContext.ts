/**
 * Shared coach context gathering for AI processing.
 * Extracts roster, teams, and coaches for a given coach in an org.
 *
 * Used by:
 * - v2 claimsExtraction.ts (Phase 4)
 * - v1 buildInsights can optionally refactor to use this (future)
 *
 * IMPORTANT: This is an internalQuery because it's called from
 * internalActions via ctx.runQuery.
 */

import { v } from "convex/values";
import { api, components, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalQuery } from "../_generated/server";

// ── Type definitions ──────────────────────────────────────────

type PlayerInfo = {
  playerIdentityId: Id<"playerIdentities">;
  firstName: string;
  lastName: string;
  fullName: string;
  ageGroup: string;
  sport: string;
};

type TeamInfo = {
  id: string;
  name: string;
  ageGroup?: string;
  sport?: string;
};

type CoachInfo = {
  id: string;
  name: string;
};

// ── gatherCoachContext (internalQuery) ─────────────────────────

export const gatherCoachContext = internalQuery({
  args: {
    organizationId: v.string(),
    coachUserId: v.string(),
  },
  returns: v.object({
    players: v.array(
      v.object({
        playerIdentityId: v.id("playerIdentities"),
        firstName: v.string(),
        lastName: v.string(),
        fullName: v.string(),
        ageGroup: v.string(),
        sport: v.string(),
      })
    ),
    teams: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        ageGroup: v.optional(v.string()),
        sport: v.optional(v.string()),
      })
    ),
    coaches: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
      })
    ),
    recordingCoachName: v.string(),
    rosterJson: v.string(),
    teamsJson: v.string(),
    coachesJson: v.string(),
  }),
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Coach context gathering requires multiple conditional branches for roster/team/coach resolution
  handler: async (ctx, args) => {
    // 1. Fetch players scoped to coach's assigned teams
    const rawPlayers = await ctx.runQuery(
      internal.models.orgPlayerEnrollments.getPlayersForCoachTeamsInternal,
      {
        organizationId: args.organizationId,
        coachUserId: args.coachUserId,
      }
    );

    // 2. Fetch coach's team assignments
    const coachTeams = await ctx.runQuery(
      api.models.coaches.getCoachAssignments,
      {
        userId: args.coachUserId,
        organizationId: args.organizationId,
      }
    );

    // 3. Resolve team details from Better Auth adapter
    const teamsList: TeamInfo[] = [];
    // biome-ignore lint/suspicious/noExplicitAny: Better Auth component returns untyped
    if (coachTeams && (coachTeams as any).teams?.length > 0) {
      const allTeamsResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "team",
          paginationOpts: { cursor: null, numItems: 1000 },
          where: [
            {
              field: "organizationId",
              value: args.organizationId,
              operator: "eq",
            },
          ],
        }
      );
      // biome-ignore lint/suspicious/noExplicitAny: Better Auth team type
      const allTeams = allTeamsResult.page as any[];
      const teamByNameMap = new Map(allTeams.map((t) => [t.name, t]));

      // biome-ignore lint/suspicious/noExplicitAny: Better Auth coach teams are string names
      for (const teamValue of (coachTeams as any).teams) {
        const team = teamByNameMap.get(teamValue);
        if (team) {
          teamsList.push({
            id: String(team._id),
            name: team.name,
            ageGroup: team.ageGroup,
            sport: team.sport,
          });
        }
      }
    }

    // 4. Get recording coach name
    let recordingCoachName = "Unknown";
    const recordingCoachUser = await ctx.runQuery(
      components.betterAuth.userFunctions.getUserByStringId,
      { userId: args.coachUserId }
    );

    if (recordingCoachUser) {
      // biome-ignore lint/suspicious/noExplicitAny: Better Auth user type
      const u = recordingCoachUser as any;
      recordingCoachName =
        `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
        u.name ||
        u.email ||
        "Unknown";
    }

    // 5. Build coaches roster (recording coach first)
    const coachesRoster: CoachInfo[] = [];
    coachesRoster.push({
      id: args.coachUserId,
      name: recordingCoachName,
    });

    // Add fellow coaches on same teams
    if (teamsList.length > 0) {
      const fellowCoaches = await ctx.runQuery(
        api.models.coaches.getFellowCoachesForTeams,
        {
          userId: args.coachUserId,
          organizationId: args.organizationId,
        }
      );

      for (const coach of fellowCoaches) {
        if (!coachesRoster.some((c) => c.id === coach.userId)) {
          coachesRoster.push({
            id: coach.userId,
            name: coach.userName,
          });
        }
      }
    }

    // 6. Deduplicate players by playerIdentityId
    const uniquePlayers: PlayerInfo[] = Array.from(
      new Map(
        // biome-ignore lint/suspicious/noExplicitAny: Player type from getPlayersForCoachTeamsInternal
        rawPlayers.map((player: any) => [player.playerIdentityId, player])
      ).values()
      // biome-ignore lint/suspicious/noExplicitAny: Untyped map values from deduplication
    ).map((player: any) => ({
      playerIdentityId: player.playerIdentityId as Id<"playerIdentities">,
      firstName: player.firstName as string,
      lastName: player.lastName as string,
      fullName: `${player.firstName} ${player.lastName}`,
      ageGroup: (player.ageGroup as string) || "Unknown",
      sport: (player.sport as string) || "Unknown",
    }));

    // 7. Format as JSON strings for AI prompt
    const rosterJson = uniquePlayers.length
      ? JSON.stringify(
          uniquePlayers.map((p) => ({
            id: p.playerIdentityId,
            firstName: p.firstName,
            lastName: p.lastName,
            fullName: p.fullName,
            ageGroup: p.ageGroup,
            sport: p.sport,
          })),
          null,
          2
        )
      : "[]";

    const teamsJson = teamsList.length
      ? JSON.stringify(teamsList, null, 2)
      : "[]";

    const coachesJson = coachesRoster.length
      ? JSON.stringify(coachesRoster, null, 2)
      : "[]";

    return {
      players: uniquePlayers,
      teams: teamsList,
      coaches: coachesRoster,
      recordingCoachName,
      rosterJson,
      teamsJson,
      coachesJson,
    };
  },
});
