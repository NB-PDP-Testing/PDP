import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../_generated/server";

/**
 * ⚠️ DANGER: This script deletes ALL data from the database
 * Use only in development environment!
 */
export const clearAllDevData = mutation({
  args: {
    confirmDelete: v.boolean(),
    selections: v.optional(
      v.object({
        playerIdentities: v.optional(v.boolean()),
        guardianIdentities: v.optional(v.boolean()),
        guardianPlayerLinks: v.optional(v.boolean()),
        orgPlayerEnrollments: v.optional(v.boolean()),
        teamPlayerIdentities: v.optional(v.boolean()),
        sportPassports: v.optional(v.boolean()),
        coachAssignments: v.optional(v.boolean()),
        skillAssessments: v.optional(v.boolean()),
        teams: v.optional(v.boolean()),
        membersRoles: v.optional(v.boolean()),
        sports: v.optional(v.boolean()),
        referenceData: v.optional(v.boolean()),
      })
    ),
  },
  returns: v.object({
    deleted: v.object({
      playerIdentities: v.number(),
      guardianIdentities: v.number(),
      guardianPlayerLinks: v.number(),
      orgPlayerEnrollments: v.number(),
      teamPlayerIdentities: v.number(),
      sportPassports: v.number(),
      coachAssignments: v.number(),
      skillAssessments: v.number(),
      teams: v.number(),
      membersRolesCleared: v.number(),
      sports: v.number(),
      referenceData: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    if (!args.confirmDelete) {
      throw new Error("Set confirmDelete: true to proceed with data deletion");
    }

    // Helper to check if a category should be deleted (defaults to true)
    type DeletionCategory =
      | "playerIdentities"
      | "guardianIdentities"
      | "guardianPlayerLinks"
      | "orgPlayerEnrollments"
      | "teamPlayerIdentities"
      | "sportPassports"
      | "coachAssignments"
      | "skillAssessments"
      | "teams"
      | "membersRoles"
      | "sports"
      | "referenceData";

    const shouldDelete = (category: DeletionCategory) =>
      args.selections?.[category] !== false;

    console.log("⚠️  Starting dev data cleanup...");

    const deleted = {
      playerIdentities: 0,
      guardianIdentities: 0,
      guardianPlayerLinks: 0,
      orgPlayerEnrollments: 0,
      teamPlayerIdentities: 0,
      sportPassports: 0,
      coachAssignments: 0,
      skillAssessments: 0,
      teams: 0,
      membersRolesCleared: 0,
      sports: 0,
      referenceData: 0,
    };

    // Delete in correct order to respect relationships

    // 1. Delete team-player assignments
    if (shouldDelete("teamPlayerIdentities")) {
      console.log("Deleting team player identities...");
      const teamPlayerIdentities = await ctx.db
        .query("teamPlayerIdentities")
        .collect();
      for (const record of teamPlayerIdentities) {
        await ctx.db.delete(record._id);
        deleted.teamPlayerIdentities++;
      }
    }

    // 2. Delete sport passports
    if (shouldDelete("sportPassports")) {
      console.log("Deleting sport passports...");
      const sportPassports = await ctx.db.query("sportPassports").collect();
      for (const record of sportPassports) {
        await ctx.db.delete(record._id);
        deleted.sportPassports++;
      }
    }

    // 3. Delete org enrollments
    if (shouldDelete("orgPlayerEnrollments")) {
      console.log("Deleting org player enrollments...");
      const enrollments = await ctx.db.query("orgPlayerEnrollments").collect();
      for (const record of enrollments) {
        await ctx.db.delete(record._id);
        deleted.orgPlayerEnrollments++;
      }
    }

    // 4. Delete guardian-player links
    if (shouldDelete("guardianPlayerLinks")) {
      console.log("Deleting guardian-player links...");
      const guardianPlayerLinks = await ctx.db
        .query("guardianPlayerLinks")
        .collect();
      for (const record of guardianPlayerLinks) {
        await ctx.db.delete(record._id);
        deleted.guardianPlayerLinks++;
      }
    }

    // 5. Delete player identities
    if (shouldDelete("playerIdentities")) {
      console.log("Deleting player identities...");
      const playerIdentities = await ctx.db.query("playerIdentities").collect();
      for (const record of playerIdentities) {
        await ctx.db.delete(record._id);
        deleted.playerIdentities++;
      }
    }

    // 6. Delete guardian identities
    if (shouldDelete("guardianIdentities")) {
      console.log("Deleting guardian identities...");
      const guardianIdentities = await ctx.db
        .query("guardianIdentities")
        .collect();
      for (const record of guardianIdentities) {
        await ctx.db.delete(record._id);
        deleted.guardianIdentities++;
      }
    }

    // 7. Delete skill assessments
    if (shouldDelete("skillAssessments")) {
      console.log("Deleting skill assessments...");
      const skillAssessments = await ctx.db.query("skillAssessments").collect();
      for (const record of skillAssessments) {
        await ctx.db.delete(record._id);
        deleted.skillAssessments++;
      }
    }

    // 8. Delete coach assignments
    if (shouldDelete("coachAssignments")) {
      console.log("Deleting coach assignments...");
      const coachAssignments = await ctx.db.query("coachAssignments").collect();
      for (const record of coachAssignments) {
        await ctx.db.delete(record._id);
        deleted.coachAssignments++;
      }
    }

    // 9. Delete teams (managed by Better Auth)
    if (shouldDelete("teams")) {
      console.log("Deleting teams...");
      const allTeamsResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "team",
          paginationOpts: { cursor: null, numItems: 10_000 },
          where: [],
        }
      );
      for (const team of allTeamsResult.page || []) {
        await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
          input: {
            model: "team",
            where: [
              { field: "_id", value: team._id as string, operator: "eq" },
            ],
          },
        });
        deleted.teams++;
      }
    }

    // 10. Clear functional roles from members (keeps users and orgs, removes coach/parent/admin roles)
    if (shouldDelete("membersRoles")) {
      console.log("Clearing functional roles from members...");
      const allMembersResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "member",
          paginationOpts: { cursor: null, numItems: 10_000 },
          where: [],
        }
      );
      for (const member of allMembersResult.page || []) {
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "member",
            where: [
              { field: "_id", value: member._id as string, operator: "eq" },
            ],
            update: {
              functionalRoles: [],
              activeFunctionalRole: undefined,
            },
          },
        });
        deleted.membersRolesCleared++;
      }
    }

    // 11. Delete sports reference data
    if (shouldDelete("sports")) {
      console.log("Deleting sports...");
      const sports = await ctx.db.query("sports").collect();
      for (const record of sports) {
        await ctx.db.delete(record._id);
        deleted.sports++;
      }
    }

    // 12. Delete other reference data (table no longer exists in schema)
    // if (shouldDelete("referenceData")) {
    //   console.log("Deleting reference data...");
    //   const referenceData = await ctx.db.query("referenceData").collect();
    //   for (const record of referenceData) {
    //     await ctx.db.delete(record._id);
    //     deleted.referenceData++;
    //   }
    // }

    console.log("✅ Dev data cleanup complete!");
    console.log("Deleted:", deleted);

    return { deleted };
  },
});

/**
 * Clear data for a specific organization
 * Only deletes org-scoped data, keeps platform identities if used by other orgs
 */
export const clearOrgData = mutation({
  args: {
    organizationId: v.string(),
    confirmDelete: v.boolean(),
    selections: v.optional(
      v.object({
        orgPlayerEnrollments: v.optional(v.boolean()),
        teamPlayerIdentities: v.optional(v.boolean()),
        sportPassports: v.optional(v.boolean()),
        coachAssignments: v.optional(v.boolean()),
        skillAssessments: v.optional(v.boolean()),
        teams: v.optional(v.boolean()),
      })
    ),
  },
  returns: v.object({
    deleted: v.object({
      orgPlayerEnrollments: v.number(),
      teamPlayerIdentities: v.number(),
      sportPassports: v.number(),
      coachAssignments: v.number(),
      skillAssessments: v.number(),
      teams: v.number(),
      playerIdentitiesOrphaned: v.number(),
      guardianIdentitiesOrphaned: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    if (!args.confirmDelete) {
      throw new Error("Set confirmDelete: true to proceed with data deletion");
    }

    // Helper to check if a category should be deleted (defaults to true)
    type OrgDeletionCategory =
      | "orgPlayerEnrollments"
      | "teamPlayerIdentities"
      | "sportPassports"
      | "coachAssignments"
      | "skillAssessments"
      | "teams";

    const shouldDelete = (category: OrgDeletionCategory) =>
      args.selections?.[category] !== false;

    console.log(`⚠️  Clearing data for org: ${args.organizationId}`);

    const deleted = {
      orgPlayerEnrollments: 0,
      teamPlayerIdentities: 0,
      sportPassports: 0,
      coachAssignments: 0,
      skillAssessments: 0,
      teams: 0,
      playerIdentitiesOrphaned: 0,
      guardianIdentitiesOrphaned: 0,
    };

    // Fetch teams for this org (needed for multiple operations)
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

    // 1. Delete team-player assignments for this org's teams
    if (shouldDelete("teamPlayerIdentities")) {
      console.log("Deleting team player identities...");
      for (const team of teamsResult.page || []) {
        const teamPlayers = await ctx.db
          .query("teamPlayerIdentities")
          .withIndex("by_teamId", (q) => q.eq("teamId", team._id as string))
          .collect();

        for (const record of teamPlayers) {
          await ctx.db.delete(record._id);
          deleted.teamPlayerIdentities++;
        }
      }
    }

    // 2. Delete sport passports for this org
    if (shouldDelete("sportPassports")) {
      console.log("Deleting sport passports...");
      const sportPassports = await ctx.db
        .query("sportPassports")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();
      for (const record of sportPassports) {
        await ctx.db.delete(record._id);
        deleted.sportPassports++;
      }
    }

    // 3. Delete org enrollments
    let enrolledPlayerIds: any[] = [];
    if (shouldDelete("orgPlayerEnrollments")) {
      console.log("Deleting org player enrollments...");
      const enrollments = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();

      enrolledPlayerIds = enrollments.map((e) => e.playerIdentityId);

      for (const record of enrollments) {
        await ctx.db.delete(record._id);
        deleted.orgPlayerEnrollments++;
      }
    }

    // 4. Delete skill assessments for this org
    if (shouldDelete("skillAssessments")) {
      console.log("Deleting skill assessments...");
      const skillAssessments = await ctx.db
        .query("skillAssessments")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();
      for (const record of skillAssessments) {
        await ctx.db.delete(record._id);
        deleted.skillAssessments++;
      }
    }

    // 5. Delete coach assignments for this org
    if (shouldDelete("coachAssignments")) {
      console.log("Deleting coach assignments...");
      const allCoachAssignments = await ctx.db
        .query("coachAssignments")
        .collect();
      const coachAssignments = allCoachAssignments.filter(
        (ca) => ca.organizationId === args.organizationId
      );
      for (const record of coachAssignments) {
        await ctx.db.delete(record._id);
        deleted.coachAssignments++;
      }
    }

    // 6. Delete teams (managed by Better Auth)
    if (shouldDelete("teams")) {
      console.log("Deleting teams...");
      for (const team of teamsResult.page || []) {
        await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
          input: {
            model: "team",
            where: [
              { field: "_id", value: team._id as string, operator: "eq" },
            ],
          },
        });
        deleted.teams++;
      }
    }

    // 7. Check for orphaned player identities (no enrollments in any org)
    console.log("Checking for orphaned player identities...");
    for (const playerId of enrolledPlayerIds) {
      const remainingEnrollments = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
        )
        .collect();

      if (remainingEnrollments.length === 0) {
        // This player is not enrolled in any other org
        // Delete guardian-player links first
        const guardianLinks = await ctx.db
          .query("guardianPlayerLinks")
          .withIndex("by_player", (q) => q.eq("playerIdentityId", playerId))
          .collect();

        for (const link of guardianLinks) {
          await ctx.db.delete(link._id);
        }

        // Delete the player identity
        await ctx.db.delete(playerId);
        deleted.playerIdentitiesOrphaned++;
      }
    }

    // 8. Check for orphaned guardian identities (no linked players)
    console.log("Checking for orphaned guardian identities...");
    const allGuardians = await ctx.db.query("guardianIdentities").collect();
    for (const guardian of allGuardians) {
      const links = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", guardian._id)
        )
        .collect();

      if (links.length === 0) {
        await ctx.db.delete(guardian._id);
        deleted.guardianIdentitiesOrphaned++;
      }
    }

    console.log("✅ Org data cleanup complete!");
    console.log("Deleted:", deleted);

    return { deleted };
  },
});
