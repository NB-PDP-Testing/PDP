/**
 * Validate Team Assignments
 *
 * Audits existing team assignments to identify eligibility violations.
 * Can auto-grant overrides for legacy data to preserve existing assignments.
 *
 * This script helps migrate existing data to the new eligibility system by:
 * 1. Finding players not on their core team
 * 2. Finding players on teams with sport mismatches
 * 3. Finding players on teams with age eligibility violations
 * 4. Optionally granting permanent overrides for existing violations
 *
 * Usage:
 * - Run with autoFix=false (default) to audit without making changes
 * - Run with autoFix=true to grant overrides for existing violations
 * - Recommended: Run without autoFix first to review violations
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";
import type { Doc as BetterAuthDoc } from "../betterAuth/_generated/dataModel";
import { canPlayerJoinTeam } from "../lib/ageGroupUtils";

/**
 * Violation record for reporting
 */
interface Violation {
  playerName: string;
  playerIdentityId: string;
  playerAgeGroup: string;
  playerSport: string;
  teamName: string;
  teamId: string;
  teamAgeGroup: string;
  teamSport: string;
  violationType: "sport_mismatch" | "age_ineligible" | "missing_core_team";
  reason: string;
  autoFixed: boolean;
}

/**
 * Query to validate team assignments for an organization
 *
 * Read-only query that identifies violations without making changes.
 * Use this to audit before running the mutation with autoFix.
 */
export const auditTeamAssignments = internalQuery({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    totalPlayers: v.number(),
    totalAssignments: v.number(),
    violations: v.array(
      v.object({
        playerName: v.string(),
        playerIdentityId: v.string(),
        playerAgeGroup: v.string(),
        playerSport: v.string(),
        teamName: v.string(),
        teamId: v.string(),
        teamAgeGroup: v.string(),
        teamSport: v.string(),
        violationType: v.union(
          v.literal("sport_mismatch"),
          v.literal("age_ineligible"),
          v.literal("missing_core_team")
        ),
        reason: v.string(),
      })
    ),
    coreTeamMissing: v.array(
      v.object({
        playerName: v.string(),
        playerIdentityId: v.string(),
        playerAgeGroup: v.string(),
        playerSport: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const violations: Violation[] = [];
    const coreTeamMissing: Array<{
      playerName: string;
      playerIdentityId: string;
      playerAgeGroup: string;
      playerSport: string;
    }> = [];
    let totalAssignments = 0;

    // 1. Get all player enrollments in the organization
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // 2. Get all teams in organization from Better Auth
    const teamsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "team",
        paginationOpts: { cursor: null, numItems: 10_000 },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );
    const allTeams = teamsResult.page as BetterAuthDoc<"team">[];

    // Create a map of team IDs to team data (using string keys for Better Auth IDs)
    const teamMap = new Map<string, BetterAuthDoc<"team">>(
      allTeams.map((team) => [team._id as string, team])
    );

    // 3. For each enrolled player, validate their team assignments
    for (const enrollment of enrollments) {
      if (!(enrollment.ageGroup && enrollment.sport)) {
        continue; // Skip players without age group or sport
      }

      const playerAgeGroup = enrollment.ageGroup;
      const playerSport = enrollment.sport;
      const playerIdentityId = enrollment.playerIdentityId;

      // Get player name
      const playerIdentity = await ctx.db.get(playerIdentityId);
      if (!playerIdentity) continue;
      const playerName = `${playerIdentity.firstName} ${playerIdentity.lastName}`;

      // Get all team memberships for this player
      const teamMemberships = await ctx.db
        .query("teamPlayerIdentities")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerIdentityId)
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      totalAssignments += teamMemberships.length;

      // Check if player is on their core team
      let hasCoreTeam = false;
      const coreTeam = allTeams.find(
        (team) =>
          team.ageGroup?.toLowerCase() === playerAgeGroup.toLowerCase() &&
          team.sport === playerSport
      );

      if (coreTeam) {
        const isOnCoreTeam = teamMemberships.some(
          (tm) => tm.teamId === coreTeam._id
        );
        if (isOnCoreTeam) {
          hasCoreTeam = true;
        }
      }

      if (!hasCoreTeam && coreTeam) {
        // Player has a core team but isn't on it
        coreTeamMissing.push({
          playerName,
          playerIdentityId,
          playerAgeGroup,
          playerSport,
        });
      }

      // Validate each team membership
      for (const membership of teamMemberships) {
        const team = teamMap.get(membership.teamId);
        if (!team) continue;

        const teamAgeGroup = team.ageGroup || "";
        const teamSport = team.sport || "";

        // Check 1: Sport match
        if (teamSport !== playerSport) {
          violations.push({
            playerName,
            playerIdentityId,
            playerAgeGroup,
            playerSport,
            teamName: team.name || "Unknown Team",
            teamId: team._id,
            teamAgeGroup,
            teamSport,
            violationType: "sport_mismatch",
            reason: `Player enrolled in ${playerSport} but assigned to ${teamSport} team`,
            autoFixed: false,
          });
          continue; // Skip age check if sport doesn't match
        }

        // Check 2: Age eligibility (using same logic as addPlayerToTeam)
        // Get sport eligibility rules
        const sportRules = await ctx.db
          .query("sportAgeGroupEligibilityRules")
          .withIndex("by_sport", (q) => q.eq("sportCode", playerSport))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        const eligibilityResult = canPlayerJoinTeam(
          playerAgeGroup,
          teamAgeGroup,
          playerSport,
          sportRules
        );

        if (!eligibilityResult.allowed) {
          violations.push({
            playerName,
            playerIdentityId,
            playerAgeGroup,
            playerSport,
            teamName: team.name || "Unknown Team",
            teamId: team._id,
            teamAgeGroup,
            teamSport,
            violationType: "age_ineligible",
            reason:
              eligibilityResult.reason ||
              `Player (${playerAgeGroup}) not eligible for team (${teamAgeGroup})`,
            autoFixed: false,
          });
        } else if (eligibilityResult.requiresOverride) {
          // Check if override already exists
          const existingOverride = await ctx.db
            .query("ageGroupEligibilityOverrides")
            .withIndex("by_player_and_team", (q) =>
              q.eq("playerIdentityId", playerIdentityId).eq("teamId", team._id)
            )
            .filter((q) => q.eq(q.field("isActive"), true))
            .first();

          if (!existingOverride) {
            violations.push({
              playerName,
              playerIdentityId,
              playerAgeGroup,
              playerSport,
              teamName: team.name || "Unknown Team",
              teamId: team._id,
              teamAgeGroup,
              teamSport,
              violationType: "age_ineligible",
              reason:
                eligibilityResult.reason ||
                `Player (${playerAgeGroup}) requires override for team (${teamAgeGroup})`,
              autoFixed: false,
            });
          }
        }
      }
    }

    return {
      totalPlayers: enrollments.length,
      totalAssignments,
      violations: violations.map((v) => ({
        playerName: v.playerName,
        playerIdentityId: v.playerIdentityId,
        playerAgeGroup: v.playerAgeGroup,
        playerSport: v.playerSport,
        teamName: v.teamName,
        teamId: v.teamId,
        teamAgeGroup: v.teamAgeGroup,
        teamSport: v.teamSport,
        violationType: v.violationType,
        reason: v.reason,
      })),
      coreTeamMissing,
    };
  },
});

/**
 * Mutation to validate and optionally fix team assignments
 *
 * When autoFix=true, this will grant permanent overrides for existing violations.
 * This preserves legacy data while enforcing rules going forward.
 */
export const validateAndFixTeamAssignments = internalMutation({
  args: {
    organizationId: v.string(),
    autoFix: v.optional(v.boolean()), // If true, grant overrides for violations
    grantedByEmail: v.optional(v.string()), // Email of admin granting overrides
  },
  returns: v.object({
    success: v.boolean(),
    totalPlayers: v.number(),
    totalAssignments: v.number(),
    violations: v.array(
      v.object({
        playerName: v.string(),
        playerIdentityId: v.string(),
        playerAgeGroup: v.string(),
        playerSport: v.string(),
        teamName: v.string(),
        teamId: v.string(),
        teamAgeGroup: v.string(),
        teamSport: v.string(),
        violationType: v.union(
          v.literal("sport_mismatch"),
          v.literal("age_ineligible"),
          v.literal("missing_core_team")
        ),
        reason: v.string(),
        autoFixed: v.boolean(),
      })
    ),
    coreTeamMissing: v.array(
      v.object({
        playerName: v.string(),
        playerIdentityId: v.string(),
        playerAgeGroup: v.string(),
        playerSport: v.string(),
      })
    ),
    overridesGranted: v.number(),
  }),
  handler: async (ctx, args) => {
    const autoFix = args.autoFix;
    const grantedBy = args.grantedByEmail || "system@migration";
    const violations: Violation[] = [];
    const coreTeamMissing: Array<{
      playerName: string;
      playerIdentityId: string;
      playerAgeGroup: string;
      playerSport: string;
    }> = [];
    let totalAssignments = 0;
    let overridesGranted = 0;

    // 1. Get all player enrollments in the organization
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // 2. Get all teams in organization from Better Auth
    const teamsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "team",
        paginationOpts: { cursor: null, numItems: 10_000 },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );
    const allTeams = teamsResult.page as BetterAuthDoc<"team">[];

    // Create a map of team IDs to team data (using string keys for Better Auth IDs)
    const teamMap = new Map<string, BetterAuthDoc<"team">>(
      allTeams.map((team) => [team._id as string, team])
    );

    // 3. For each enrolled player, validate their team assignments
    for (const enrollment of enrollments) {
      if (!(enrollment.ageGroup && enrollment.sport)) {
        continue;
      }

      const playerAgeGroup = enrollment.ageGroup;
      const playerSport = enrollment.sport;
      const playerIdentityId = enrollment.playerIdentityId;

      // Get player name
      const playerIdentity = await ctx.db.get(playerIdentityId);
      if (!playerIdentity) continue;
      const playerName = `${playerIdentity.firstName} ${playerIdentity.lastName}`;

      // Get all team memberships for this player
      const teamMemberships = await ctx.db
        .query("teamPlayerIdentities")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerIdentityId)
        )
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      totalAssignments += teamMemberships.length;

      // Check if player is on their core team
      let hasCoreTeam = false;
      const coreTeam = allTeams.find(
        (team) =>
          team.ageGroup?.toLowerCase() === playerAgeGroup.toLowerCase() &&
          team.sport === playerSport
      );

      if (coreTeam) {
        const isOnCoreTeam = teamMemberships.some(
          (tm) => tm.teamId === coreTeam._id
        );
        if (isOnCoreTeam) {
          hasCoreTeam = true;
        }
      }

      if (!hasCoreTeam && coreTeam) {
        coreTeamMissing.push({
          playerName,
          playerIdentityId,
          playerAgeGroup,
          playerSport,
        });
      }

      // Validate each team membership
      for (const membership of teamMemberships) {
        const team = teamMap.get(membership.teamId);
        if (!team) continue;

        const teamAgeGroup = team.ageGroup || "";
        const teamSport = team.sport || "";

        // Check 1: Sport match
        if (teamSport !== playerSport) {
          const violation: Violation = {
            playerName,
            playerIdentityId,
            playerAgeGroup,
            playerSport,
            teamName: team.name || "Unknown Team",
            teamId: team._id,
            teamAgeGroup,
            teamSport,
            violationType: "sport_mismatch",
            reason: `Player enrolled in ${playerSport} but assigned to ${teamSport} team`,
            autoFixed: false,
          };

          // Grant override if autoFix is enabled
          if (autoFix) {
            // Check if override already exists
            const existingOverride = await ctx.db
              .query("ageGroupEligibilityOverrides")
              .withIndex("by_player_and_team", (q) =>
                q
                  .eq("playerIdentityId", playerIdentityId)
                  .eq("teamId", team._id)
              )
              .filter((q) => q.eq(q.field("isActive"), true))
              .first();

            if (!existingOverride) {
              await ctx.db.insert("ageGroupEligibilityOverrides", {
                playerIdentityId,
                teamId: team._id,
                organizationId: args.organizationId,
                reason:
                  "Legacy data migration - pre-existing sport mismatch assignment",
                grantedBy,
                grantedAt: Date.now(),
                expiresAt: undefined, // Permanent
                isActive: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
              violation.autoFixed = true;
              overridesGranted++;
            }
          }

          violations.push(violation);
          continue;
        }

        // Check 2: Age eligibility
        const sportRules = await ctx.db
          .query("sportAgeGroupEligibilityRules")
          .withIndex("by_sport", (q) => q.eq("sportCode", playerSport))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        const eligibilityResult = canPlayerJoinTeam(
          playerAgeGroup,
          teamAgeGroup,
          playerSport,
          sportRules
        );

        if (!eligibilityResult.allowed || eligibilityResult.requiresOverride) {
          // Check if override already exists
          const existingOverride = await ctx.db
            .query("ageGroupEligibilityOverrides")
            .withIndex("by_player_and_team", (q) =>
              q.eq("playerIdentityId", playerIdentityId).eq("teamId", team._id)
            )
            .filter((q) => q.eq(q.field("isActive"), true))
            .first();

          const violation: Violation = {
            playerName,
            playerIdentityId,
            playerAgeGroup,
            playerSport,
            teamName: team.name || "Unknown Team",
            teamId: team._id,
            teamAgeGroup,
            teamSport,
            violationType: "age_ineligible",
            reason:
              eligibilityResult.reason ||
              `Player (${playerAgeGroup}) requires override for team (${teamAgeGroup})`,
            autoFixed: false,
          };

          if (!existingOverride) {
            // Grant override if autoFix is enabled
            if (autoFix) {
              await ctx.db.insert("ageGroupEligibilityOverrides", {
                playerIdentityId,
                teamId: team._id,
                organizationId: args.organizationId,
                reason:
                  "Legacy data migration - pre-existing age eligibility violation",
                grantedBy,
                grantedAt: Date.now(),
                expiresAt: undefined, // Permanent
                isActive: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
              violation.autoFixed = true;
              overridesGranted++;
            }

            violations.push(violation);
          }
        }
      }
    }

    return {
      success: true,
      totalPlayers: enrollments.length,
      totalAssignments,
      violations: violations.map((v) => ({
        playerName: v.playerName,
        playerIdentityId: v.playerIdentityId,
        playerAgeGroup: v.playerAgeGroup,
        playerSport: v.playerSport,
        teamName: v.teamName,
        teamId: v.teamId,
        teamAgeGroup: v.teamAgeGroup,
        teamSport: v.teamSport,
        violationType: v.violationType,
        reason: v.reason,
        autoFixed: v.autoFixed,
      })),
      coreTeamMissing,
      overridesGranted,
    };
  },
});
