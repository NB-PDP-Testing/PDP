import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Comprehensive audit of all coach assignments to detect data corruption.
 *
 * Checks for:
 * - Valid Better Auth team IDs (format: jh7...)
 * - Team names stored instead of IDs
 * - Player IDs stored instead of team IDs
 * - Medical profile IDs stored instead of team IDs
 * - Other unknown corruption
 *
 * Returns detailed report of all issues found.
 */
export const auditAllCoachAssignments = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    // Get ALL coach assignments
    const allAssignments = await ctx.db.query("coachAssignments").collect();

    const report = {
      totalAssignments: allAssignments.length,
      corruptedAssignments: [] as any[],
      cleanAssignments: [] as string[],
      statistics: {
        validTeamIds: 0,
        teamNames: 0,
        playerIds: 0,
        medicalProfileIds: 0,
        otherCorruption: 0,
        emptyArrays: 0,
      },
    };

    for (const assignment of allAssignments) {
      const issues = [];

      if (assignment.teams.length === 0) {
        report.statistics.emptyArrays++;
        report.cleanAssignments.push(assignment._id);
        continue;
      }

      for (const teamValue of assignment.teams) {
        // Check if it's a Better Auth team ID (format check)
        if (teamValue.startsWith("jh7")) {
          // Potentially valid team ID
          report.statistics.validTeamIds++;
          continue;
        }

        // Check if it contains "players" table marker
        if (teamValue.includes("players")) {
          report.statistics.playerIds++;
          issues.push({
            type: "player_id",
            value: teamValue,
          });
          continue;
        }

        // Check if it contains "medicalProfiles" table marker (starts with js7)
        if (teamValue.startsWith("js7")) {
          report.statistics.medicalProfileIds++;
          issues.push({
            type: "medical_profile_id",
            value: teamValue,
          });
          continue;
        }

        // Check if it looks like a team name (contains spaces or is short)
        if (teamValue.includes(" ") || teamValue.length < 20) {
          report.statistics.teamNames++;
          issues.push({
            type: "team_name",
            value: teamValue,
          });
          continue;
        }

        // Unknown corruption
        report.statistics.otherCorruption++;
        issues.push({
          type: "unknown",
          value: teamValue,
        });
      }

      if (issues.length > 0) {
        report.corruptedAssignments.push({
          _id: assignment._id,
          userId: assignment.userId,
          organizationId: assignment.organizationId,
          teams: assignment.teams,
          issues,
        });
      } else {
        report.cleanAssignments.push(assignment._id);
      }
    }

    return report;
  },
});

/**
 * Audit coach assignments for a specific organization.
 * Useful for targeted investigation.
 */
export const auditCoachAssignmentsByOrg = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("coachAssignments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const issues = [];
    for (const assignment of assignments) {
      for (const teamValue of assignment.teams) {
        if (!teamValue.startsWith("jh7")) {
          issues.push({
            assignmentId: assignment._id,
            userId: assignment.userId,
            teamValue,
            type: teamValue.startsWith("js7")
              ? "medical_profile_id"
              : teamValue.includes("players")
                ? "player_id"
                : teamValue.includes(" ")
                  ? "team_name"
                  : "unknown",
          });
        }
      }
    }

    return {
      organizationId: args.organizationId,
      totalAssignments: assignments.length,
      issuesFound: issues.length,
      issues,
      assignments: assignments.map((a) => ({
        _id: a._id,
        userId: a.userId,
        teams: a.teams,
        ageGroups: a.ageGroups,
      })),
    };
  },
});
