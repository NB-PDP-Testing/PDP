/**
 * Shared player matching logic for fuzzy name search.
 *
 * Extracted from orgPlayerEnrollments.findSimilarPlayers (internalQuery)
 * so that both the internal query AND the public review microsite wrapper
 * can call the same logic without duplicating code.
 *
 * See ADR-VN2-004 for rationale.
 */

import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { calculateMatchScore } from "./stringMatching";

const SIMILARITY_THRESHOLD = 0.5;
const DEFAULT_MATCH_LIMIT = 5;
const TEAM_CONTEXT_BONUS = 0.1;

export type SimilarPlayerResult = {
  playerId: Id<"playerIdentities">;
  firstName: string;
  lastName: string;
  fullName: string;
  similarity: number;
  ageGroup: string;
  sport: string | null;
};

/**
 * Find players whose names fuzzy-match a search string.
 *
 * Uses Levenshtein-based scoring with team context bonus.
 * Callable from both internal queries and public review queries.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Team context resolution requires multiple conditional branches
export async function findSimilarPlayersLogic(
  ctx: QueryCtx,
  args: {
    organizationId: string;
    coachUserId: string;
    searchName: string;
    limit?: number;
  }
): Promise<SimilarPlayerResult[]> {
  const maxResults = args.limit ?? DEFAULT_MATCH_LIMIT;

  // 1. Resolve coach's assigned teams to get their player set
  let coachTeamPlayerIds: Set<Id<"playerIdentities">> | null = null;

  const coachAssignment = await ctx.db
    .query("coachAssignments")
    .withIndex("by_user_and_org", (q) =>
      q.eq("userId", args.coachUserId).eq("organizationId", args.organizationId)
    )
    .first();

  if (coachAssignment && coachAssignment.teams.length > 0) {
    // Get all teams for the org to resolve names/IDs
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

    // biome-ignore lint/suspicious/noExplicitAny: Better Auth component returns untyped page array
    const allTeams = allTeamsResult.page as any[];
    const teamByIdMap = new Map(
      // biome-ignore lint/suspicious/noExplicitAny: Better Auth team type
      allTeams.map((team: any) => [String(team._id), team])
    );
    const teamByNameMap = new Map(
      // biome-ignore lint/suspicious/noExplicitAny: Better Auth team type
      allTeams.map((team: any) => [team.name, team])
    );

    const teamIds: string[] = [];
    for (const teamValue of coachAssignment.teams) {
      const team = teamByIdMap.get(teamValue) || teamByNameMap.get(teamValue);
      if (team) {
        teamIds.push(String(team._id));
      }
    }

    // Get players on coach's teams
    coachTeamPlayerIds = new Set<Id<"playerIdentities">>();
    for (const teamId of teamIds) {
      const teamMembers = await ctx.db
        .query("teamPlayerIdentities")
        .withIndex("by_teamId_and_status", (q) =>
          q.eq("teamId", teamId).eq("status", "active")
        )
        .collect();

      for (const member of teamMembers) {
        coachTeamPlayerIds.add(member.playerIdentityId);
      }
    }
  }

  // 2. Get active players for the organization
  const enrollments = await ctx.db
    .query("orgPlayerEnrollments")
    .withIndex("by_org_and_status", (q) =>
      q.eq("organizationId", args.organizationId).eq("status", "active")
    )
    .collect();

  // 3. Batch fetch player identities
  const uniquePlayerIds = [
    ...new Set(enrollments.map((e) => e.playerIdentityId)),
  ];
  const playerDocs = await Promise.all(
    uniquePlayerIds.map((id) => ctx.db.get(id))
  );
  const playerMap = new Map<
    Id<"playerIdentities">,
    { firstName: string; lastName: string }
  >();
  for (const doc of playerDocs) {
    if (doc) {
      playerMap.set(doc._id, {
        firstName: doc.firstName,
        lastName: doc.lastName,
      });
    }
  }

  // 4. Score each player with team context bonus
  const scored: SimilarPlayerResult[] = [];

  for (const enrollment of enrollments) {
    const player = playerMap.get(enrollment.playerIdentityId);
    if (!player) {
      continue;
    }

    const baseSimilarity = calculateMatchScore(
      args.searchName,
      player.firstName,
      player.lastName
    );

    // Apply team context bonus if player is on coach's team
    let similarity = baseSimilarity;
    if (coachTeamPlayerIds?.has(enrollment.playerIdentityId)) {
      similarity = Math.min(1, baseSimilarity + TEAM_CONTEXT_BONUS);
    }

    if (similarity >= SIMILARITY_THRESHOLD) {
      scored.push({
        playerId: enrollment.playerIdentityId,
        firstName: player.firstName,
        lastName: player.lastName,
        fullName: `${player.firstName} ${player.lastName}`,
        similarity,
        ageGroup: enrollment.ageGroup,
        sport: enrollment.sport ?? null,
      });
    }
  }

  // Sort by similarity descending, take top N
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, maxResults);
}
