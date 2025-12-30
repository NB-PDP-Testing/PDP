import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

/**
 * Preview what will be deleted for an organization
 * Safe to run - does NOT delete anything
 */
export const previewOrgCleanup = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    organizationId: v.string(),
    counts: v.object({
      orgPlayerEnrollments: v.number(),
      teamPlayerIdentities: v.number(),
      sportPassports: v.number(),
      coachAssignments: v.number(),
      skillAssessments: v.number(),
      teams: v.number(),
    }),
    warning: v.string(),
  }),
  handler: async (ctx, args) => {
    console.log(`📊 Previewing cleanup for org: ${args.organizationId}`);

    // Fetch teams for this org
    const teamsResult = await ctx.runQuery(
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

    const teams = teamsResult.page || [];
    const teamIds = teams.map((t: { _id: string }) => t._id as string);

    // Count team-player assignments
    let teamPlayerCount = 0;
    for (const teamId of teamIds) {
      const assignments = await ctx.db
        .query("teamPlayerIdentities")
        .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
        .collect();
      teamPlayerCount += assignments.length;
    }

    // Count sport passports
    const sportPassports = await ctx.db
      .query("sportPassports")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Count enrollments
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Count coach assignments for this org
    const coachAssignments = await ctx.db
      .query("coachAssignments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const coachCount = coachAssignments.length;

    // Count skill assessments for this org
    const skillAssessments = await ctx.db
      .query("skillAssessments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const skillAssessmentCount = skillAssessments.length;

    const counts = {
      orgPlayerEnrollments: enrollments.length,
      teamPlayerIdentities: teamPlayerCount,
      sportPassports: sportPassports.length,
      coachAssignments: coachCount,
      skillAssessments: skillAssessmentCount,
      teams: teams.length,
    };

    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

    console.log("\n📊 PREVIEW RESULTS:");
    console.log("==================");
    console.log(`Organization: ${args.organizationId}`);
    console.log(`Teams: ${counts.teams}`);
    console.log(`Players enrolled: ${counts.orgPlayerEnrollments}`);
    console.log(`Team assignments: ${counts.teamPlayerIdentities}`);
    console.log(`Sport passports: ${counts.sportPassports}`);
    console.log(`Coach assignments: ${counts.coachAssignments}`);
    console.log(`Skill assessments: ${counts.skillAssessments}`);
    console.log("==================");
    console.log(`TOTAL RECORDS TO DELETE: ${totalRecords}`);

    return {
      organizationId: args.organizationId,
      counts,
      warning: `⚠️ This will delete ${totalRecords} total records. Make sure you have a backup!`,
    };
  },
});
