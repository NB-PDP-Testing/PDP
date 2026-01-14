import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../_generated/server";

/**
 * ⚠️ NUCLEAR OPTION: Delete EVERYTHING including users, orgs, and sessions
 * This completely resets the database to a fresh state
 *
 * OPTIMIZED VERSION: Uses batch deleteMany instead of individual deleteOne
 * to avoid timeout issues with large session tables.
 *
 * Usage:
 * npx convex run scripts/fullResetOptimized:fullReset '{"confirmNuclearDelete": true}'
 */

const BATCH_SIZE = 500; // Process this many records at a time

export const fullReset = mutation({
  args: {
    confirmNuclearDelete: v.boolean(),
  },
  returns: v.object({
    deleted: v.object({
      users: v.number(),
      sessions: v.number(),
      accounts: v.number(),
      organizations: v.number(),
      members: v.number(),
      invitations: v.number(),
      teams: v.number(),
      teamMembers: v.number(),
      verifications: v.number(),
      playerIdentities: v.number(),
      guardianIdentities: v.number(),
      guardianPlayerLinks: v.number(),
      orgPlayerEnrollments: v.number(),
      teamPlayerIdentities: v.number(),
      sportPassports: v.number(),
      coachAssignments: v.number(),
      skillAssessments: v.number(),
      voiceNotes: v.number(),
      medicalProfiles: v.number(),
      playerInjuries: v.number(),
      orgJoinRequests: v.number(),
      passportGoals: v.number(),
      sports: v.number(),
      skillCategories: v.number(),
      skillDefinitions: v.number(),
      skillBenchmarks: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    if (!args.confirmNuclearDelete) {
      throw new Error(
        "Set confirmNuclearDelete: true to proceed with FULL database reset"
      );
    }

    console.log("☢️  FULL DATABASE RESET (OPTIMIZED) - Deleting EVERYTHING...");

    const deleted = {
      users: 0,
      sessions: 0,
      accounts: 0,
      organizations: 0,
      members: 0,
      invitations: 0,
      teams: 0,
      teamMembers: 0,
      verifications: 0,
      playerIdentities: 0,
      guardianIdentities: 0,
      guardianPlayerLinks: 0,
      orgPlayerEnrollments: 0,
      teamPlayerIdentities: 0,
      sportPassports: 0,
      coachAssignments: 0,
      skillAssessments: 0,
      voiceNotes: 0,
      medicalProfiles: 0,
      playerInjuries: 0,
      orgJoinRequests: 0,
      passportGoals: 0,
      sports: 0,
      skillCategories: 0,
      skillDefinitions: 0,
      skillBenchmarks: 0,
    };

    // ===============================
    // 1. Delete application data first (respects foreign key relationships)
    // ===============================

    // Voice notes (includes storage cleanup)
    console.log("Deleting voice notes...");
    const voiceNotes = await ctx.db.query("voiceNotes").collect();
    for (const record of voiceNotes) {
      if (record.audioStorageId) {
        try {
          await ctx.storage.delete(record.audioStorageId);
        } catch (_e) {
          // Storage may already be deleted
        }
      }
      await ctx.db.delete(record._id);
      deleted.voiceNotes++;
    }

    // Skill assessments
    console.log("Deleting skill assessments...");
    const skillAssessments = await ctx.db.query("skillAssessments").collect();
    for (const record of skillAssessments) {
      await ctx.db.delete(record._id);
      deleted.skillAssessments++;
    }

    // Passport goals
    console.log("Deleting passport goals...");
    const passportGoals = await ctx.db.query("passportGoals").collect();
    for (const record of passportGoals) {
      await ctx.db.delete(record._id);
      deleted.passportGoals++;
    }

    // Player injuries
    console.log("Deleting player injuries...");
    const playerInjuries = await ctx.db.query("playerInjuries").collect();
    for (const record of playerInjuries) {
      await ctx.db.delete(record._id);
      deleted.playerInjuries++;
    }

    // Medical profiles
    console.log("Deleting medical profiles...");
    const medicalProfiles = await ctx.db.query("medicalProfiles").collect();
    for (const record of medicalProfiles) {
      await ctx.db.delete(record._id);
      deleted.medicalProfiles++;
    }

    // Team player identities
    console.log("Deleting team player identities...");
    const teamPlayerIdentities = await ctx.db
      .query("teamPlayerIdentities")
      .collect();
    for (const record of teamPlayerIdentities) {
      await ctx.db.delete(record._id);
      deleted.teamPlayerIdentities++;
    }

    // Sport passports
    console.log("Deleting sport passports...");
    const sportPassports = await ctx.db.query("sportPassports").collect();
    for (const record of sportPassports) {
      await ctx.db.delete(record._id);
      deleted.sportPassports++;
    }

    // Org player enrollments
    console.log("Deleting org player enrollments...");
    const enrollments = await ctx.db.query("orgPlayerEnrollments").collect();
    for (const record of enrollments) {
      await ctx.db.delete(record._id);
      deleted.orgPlayerEnrollments++;
    }

    // Guardian-player links
    console.log("Deleting guardian-player links...");
    const guardianPlayerLinks = await ctx.db
      .query("guardianPlayerLinks")
      .collect();
    for (const record of guardianPlayerLinks) {
      await ctx.db.delete(record._id);
      deleted.guardianPlayerLinks++;
    }

    // Player identities
    console.log("Deleting player identities...");
    const playerIdentities = await ctx.db.query("playerIdentities").collect();
    for (const record of playerIdentities) {
      await ctx.db.delete(record._id);
      deleted.playerIdentities++;
    }

    // Guardian identities
    console.log("Deleting guardian identities...");
    const guardianIdentities = await ctx.db
      .query("guardianIdentities")
      .collect();
    for (const record of guardianIdentities) {
      await ctx.db.delete(record._id);
      deleted.guardianIdentities++;
    }

    // Coach assignments
    console.log("Deleting coach assignments...");
    const coachAssignments = await ctx.db.query("coachAssignments").collect();
    for (const record of coachAssignments) {
      await ctx.db.delete(record._id);
      deleted.coachAssignments++;
    }

    // Org join requests
    console.log("Deleting org join requests...");
    const orgJoinRequests = await ctx.db.query("orgJoinRequests").collect();
    for (const record of orgJoinRequests) {
      await ctx.db.delete(record._id);
      deleted.orgJoinRequests++;
    }

    // ===============================
    // 2. Delete reference data
    // ===============================

    // Skill benchmarks
    console.log("Deleting skill benchmarks...");
    const skillBenchmarks = await ctx.db.query("skillBenchmarks").collect();
    for (const record of skillBenchmarks) {
      await ctx.db.delete(record._id);
      deleted.skillBenchmarks++;
    }

    // Skill definitions
    console.log("Deleting skill definitions...");
    const skillDefinitions = await ctx.db.query("skillDefinitions").collect();
    for (const record of skillDefinitions) {
      await ctx.db.delete(record._id);
      deleted.skillDefinitions++;
    }

    // Skill categories
    console.log("Deleting skill categories...");
    const skillCategories = await ctx.db.query("skillCategories").collect();
    for (const record of skillCategories) {
      await ctx.db.delete(record._id);
      deleted.skillCategories++;
    }

    // Sports
    console.log("Deleting sports...");
    const sports = await ctx.db.query("sports").collect();
    for (const record of sports) {
      await ctx.db.delete(record._id);
      deleted.sports++;
    }

    // ===============================
    // 3. Delete Better Auth managed tables (OPTIMIZED with batch deleteMany)
    // ===============================

    // Helper function to batch delete Better Auth tables
    async function batchDeleteBetterAuthTable(
      model:
        | "team"
        | "teamMember"
        | "invitation"
        | "member"
        | "organization"
        | "session"
        | "account"
        | "user"
        | "verification"
    ): Promise<number> {
      let totalDeleted = 0;
      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore) {
        const result = await ctx.runMutation(
          components.betterAuth.adapter.deleteMany,
          {
            input: {
              model,
              where: [], // Delete all records
            },
            paginationOpts: {
              cursor,
              numItems: BATCH_SIZE,
            },
          }
        );

        // Count deleted records
        if (result && typeof result === "object" && "deletedCount" in result) {
          totalDeleted += result.deletedCount as number;
        } else if (result && typeof result === "object" && "page" in result) {
          totalDeleted += (result.page as unknown[])?.length || 0;
        }

        // Check if there are more records
        if (
          result &&
          typeof result === "object" &&
          "continueCursor" in result
        ) {
          cursor = result.continueCursor as string | null;
          hasMore = !!cursor && cursor !== "";
        } else {
          hasMore = false;
        }
      }

      return totalDeleted;
    }

    // Teams
    console.log("Deleting teams (batch)...");
    deleted.teams = await batchDeleteBetterAuthTable("team");

    // Team Members
    console.log("Deleting team members (batch)...");
    deleted.teamMembers = await batchDeleteBetterAuthTable("teamMember");

    // Invitations
    console.log("Deleting invitations (batch)...");
    deleted.invitations = await batchDeleteBetterAuthTable("invitation");

    // Members
    console.log("Deleting members (batch)...");
    deleted.members = await batchDeleteBetterAuthTable("member");

    // Organizations
    console.log("Deleting organizations (batch)...");
    deleted.organizations = await batchDeleteBetterAuthTable("organization");

    // SESSIONS - This was causing the timeout, now uses batch delete
    console.log("Deleting sessions (batch)...");
    deleted.sessions = await batchDeleteBetterAuthTable("session");

    // Accounts
    console.log("Deleting accounts (batch)...");
    deleted.accounts = await batchDeleteBetterAuthTable("account");

    // Verifications
    console.log("Deleting verifications (batch)...");
    deleted.verifications = await batchDeleteBetterAuthTable("verification");

    // Users - LAST because everything references users
    console.log("Deleting users (batch)...");
    deleted.users = await batchDeleteBetterAuthTable("user");

    console.log("☢️  FULL DATABASE RESET COMPLETE!");
    console.log("📊 Deleted:", deleted);

    return { deleted };
  },
});
