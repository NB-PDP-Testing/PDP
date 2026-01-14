/**
 * Age Group Utilities
 *
 * Provides sport-specific age group hierarchy and eligibility validation logic.
 * Supports different sports having different age group rules.
 */

import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/**
 * Default age group ordering (can be overridden per sport)
 * Lower index = younger age group
 */
export const DEFAULT_AGE_GROUP_ORDER = [
  "u6",
  "u7",
  "u8",
  "u9",
  "u10",
  "u11",
  "u12",
  "u13",
  "u14",
  "u15",
  "u16",
  "u17",
  "u18",
  "minor",
  "adult",
  "senior",
] as const;

export type AgeGroup = (typeof DEFAULT_AGE_GROUP_ORDER)[number];

/**
 * Sport-specific eligibility rule from database
 */
export type SportAgeGroupEligibilityRule = {
  sportCode: string;
  fromAgeGroupCode: string;
  toAgeGroupCode: string;
  isAllowed: boolean;
  requiresApproval: boolean;
};

/**
 * Result of eligibility check
 */
export type EligibilityResult = {
  allowed: boolean;
  requiresOverride: boolean;
  reason?: string;
};

/**
 * Get numeric rank for age group comparison
 * Lower rank = younger age group
 *
 * @param ageGroup - Age group code (e.g., "u12", "senior")
 * @param sportAgeGroupOrder - Optional sport-specific ordering
 * @returns Numeric rank (-1 if not found)
 */
export function getAgeGroupRank(
  ageGroup: string,
  sportAgeGroupOrder?: string[]
): number {
  const order = sportAgeGroupOrder || DEFAULT_AGE_GROUP_ORDER;
  const normalizedAgeGroup = ageGroup.toLowerCase();
  return order.indexOf(normalizedAgeGroup as AgeGroup);
}

/**
 * Validate if player can join team based on sport-specific rules
 *
 * Default rule: Players can only join teams at same age or higher (no playing down)
 * Sport-specific rules can override this default behavior.
 *
 * @param playerAgeGroup - Player's age group code
 * @param teamAgeGroup - Team's age group code
 * @param sportCode - Sport code
 * @param sportEligibilityRules - Sport-specific rules (optional)
 * @returns Eligibility result with allowed status and reason
 */
export function canPlayerJoinTeam(
  playerAgeGroup: string,
  teamAgeGroup: string,
  sportCode: string,
  sportEligibilityRules?: SportAgeGroupEligibilityRule[]
): EligibilityResult {
  // Normalize codes for comparison
  const normalizedPlayerAge = playerAgeGroup.toLowerCase();
  const normalizedTeamAge = teamAgeGroup.toLowerCase();

  // Same age group is always allowed
  if (normalizedPlayerAge === normalizedTeamAge) {
    return {
      allowed: true,
      requiresOverride: false,
      reason: "Player is in the correct age group for this team",
    };
  }

  // Check if sport has specific eligibility rules
  if (sportEligibilityRules && sportEligibilityRules.length > 0) {
    const rule = sportEligibilityRules.find(
      (r) =>
        r.fromAgeGroupCode.toLowerCase() === normalizedPlayerAge &&
        r.toAgeGroupCode.toLowerCase() === normalizedTeamAge
    );

    if (rule) {
      if (!rule.isAllowed) {
        return {
          allowed: false,
          requiresOverride: false,
          reason: `${sportCode} rules do not allow ${playerAgeGroup} players to join ${teamAgeGroup} teams`,
        };
      }

      if (rule.requiresApproval) {
        return {
          allowed: true,
          requiresOverride: true,
          reason: `${sportCode} requires admin approval for ${playerAgeGroup} players to join ${teamAgeGroup} teams`,
        };
      }

      return {
        allowed: true,
        requiresOverride: false,
        reason: `${sportCode} allows ${playerAgeGroup} players to join ${teamAgeGroup} teams`,
      };
    }
  }

  // Default behavior: Use age group ranking
  // Players can only play at their age level or higher (no playing down)
  const playerRank = getAgeGroupRank(normalizedPlayerAge);
  const teamRank = getAgeGroupRank(normalizedTeamAge);

  if (playerRank === -1 || teamRank === -1) {
    return {
      allowed: false,
      requiresOverride: false,
      reason: `Invalid age group: ${playerRank === -1 ? playerAgeGroup : teamAgeGroup}`,
    };
  }

  if (teamRank >= playerRank) {
    // Team is same age or older - allowed (may need approval for significant jumps)
    const ageGapIntroduction = teamRank - playerRank;
    if (ageGapIntroduction > 2) {
      return {
        allowed: true,
        requiresOverride: true,
        reason: `${playerAgeGroup} player joining ${teamAgeGroup} team (${ageGapIntroduction} age groups up) requires admin approval`,
      };
    }

    return {
      allowed: true,
      requiresOverride: false,
      reason: `${playerAgeGroup} players can play up to ${teamAgeGroup}`,
    };
  }
  // Team is younger - not allowed
  return {
    allowed: false,
    requiresOverride: false,
    reason: `${playerAgeGroup} players cannot play down to ${teamAgeGroup} teams`,
  };
}

/**
 * Check if player has an active, non-expired override for a specific team
 *
 * @param ctx - Query context
 * @param playerIdentityId - Player's identity ID
 * @param teamId - Team ID
 * @returns True if player has valid override
 */
export async function hasActiveOverride(
  ctx: QueryCtx,
  playerIdentityId: Id<"playerIdentities">,
  teamId: string
): Promise<boolean> {
  const now = Date.now();

  const override = await ctx.db
    .query("ageGroupEligibilityOverrides")
    .withIndex("by_player_and_team", (q) =>
      q.eq("playerIdentityId", playerIdentityId).eq("teamId", teamId)
    )
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();

  if (!override) {
    return false;
  }

  // Check if override has expired
  if (override.expiresAt && override.expiresAt < now) {
    return false;
  }

  return true;
}

/**
 * Get eligible teams for a player considering sport rules and overrides
 *
 * @param playerAgeGroup - Player's age group
 * @param sportCode - Sport code
 * @param teams - All available teams
 * @param sportRules - Sport-specific eligibility rules
 * @param activeOverrides - Player's active overrides
 * @returns Filtered array of eligible teams with eligibility status
 */
export function filterEligibleTeams<
  T extends { ageGroup: string; teamId?: string; _id?: string },
>(
  playerAgeGroup: string,
  sportCode: string,
  teams: T[],
  sportRules: SportAgeGroupEligibilityRule[],
  activeOverrides: Array<{ teamId: string }>
): Array<
  T & {
    eligibilityStatus:
      | "eligible"
      | "requiresOverride"
      | "hasOverride"
      | "ineligible";
    eligibilityReason?: string;
  }
> {
  return teams.map((team) => {
    const teamId = team.teamId || team._id || "";

    // Check if player has active override for this team
    const hasOverride = activeOverrides.some((o) => o.teamId === teamId);
    if (hasOverride) {
      return {
        ...team,
        eligibilityStatus: "hasOverride" as const,
        eligibilityReason: "Admin granted eligibility override",
      };
    }

    // Check eligibility rules
    const eligibility = canPlayerJoinTeam(
      playerAgeGroup,
      team.ageGroup,
      sportCode,
      sportRules
    );

    if (!eligibility.allowed) {
      return {
        ...team,
        eligibilityStatus: "ineligible" as const,
        eligibilityReason: eligibility.reason,
      };
    }

    if (eligibility.requiresOverride) {
      return {
        ...team,
        eligibilityStatus: "requiresOverride" as const,
        eligibilityReason: eligibility.reason,
      };
    }

    return {
      ...team,
      eligibilityStatus: "eligible" as const,
      eligibilityReason: eligibility.reason,
    };
  });
}

/**
 * Sort teams by age group order
 *
 * @param teams - Teams to sort
 * @param order - Age group ordering (optional, uses default)
 * @returns Sorted teams array
 */
export function sortTeamsByAgeGroup<T extends { ageGroup: string }>(
  teams: T[],
  order?: string[]
): T[] {
  return [...teams].sort((a, b) => {
    const rankA = getAgeGroupRank(a.ageGroup, order);
    const rankB = getAgeGroupRank(b.ageGroup, order);

    // Unknown age groups go to the end
    if (rankA === -1) {
      return 1;
    }
    if (rankB === -1) {
      return -1;
    }

    return rankA - rankB;
  });
}
