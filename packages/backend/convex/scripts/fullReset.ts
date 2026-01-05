import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../_generated/server";

/**
 * ⚠️ NUCLEAR OPTION: Delete EVERYTHING including users, orgs, and sessions
 * This completely resets the database to a fresh state
 * 
 * Usage:
 * npx convex run scripts/fullReset:fullReset '{"confirmNuclearDelete": true}'
 */
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
      throw new Error("Set confirmNuclearDelete: true to proceed with FULL database reset");
    }

    console.log("☢️  FULL DATABASE RESET - Deleting EVERYTHING...");

    const deleted = {
      users: 0,
      sessions: 0,
      accounts: 0,
      organizations: 0,
      members: 0,
      invitations: 0,
      teams: 0,
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

    // Voice notes
    console.log("Deleting voice notes...");
    const voiceNotes = await ctx.db.query("voiceNotes").collect();
    for (const record of voiceNotes) {
      if (record.audioStorageId) {
        try {
          await ctx.storage.delete(record.audioStorageId);
        } catch (e) {
          console.log("Storage delete failed:", e);
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
    const teamPlayerIdentities = await ctx.db.query("teamPlayerIdentities").collect();
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
    const guardianPlayerLinks = await ctx.db.query("guardianPlayerLinks").collect();
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
    const guardianIdentities = await ctx.db.query("guardianIdentities").collect();
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
    // 3. Delete Better Auth managed tables
    // ===============================

    // Teams (via Better Auth adapter)
    console.log("Deleting teams...");
    const teamsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "team",
        paginationOpts: { cursor: null, numItems: 10_000 },
        where: [],
      }
    );
    for (const team of teamsResult.page || []) {
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "team",
          where: [{ field: "_id", value: team._id as string, operator: "eq" }],
        },
      });
      deleted.teams++;
    }

    // Invitations (via Better Auth adapter)
    console.log("Deleting invitations...");
    const invitationsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "invitation",
        paginationOpts: { cursor: null, numItems: 10_000 },
        where: [],
      }
    );
    for (const invitation of invitationsResult.page || []) {
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "invitation",
          where: [{ field: "_id", value: invitation._id as string, operator: "eq" }],
        },
      });
      deleted.invitations++;
    }

    // Members (via Better Auth adapter)
    console.log("Deleting members...");
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: { cursor: null, numItems: 10_000 },
        where: [],
      }
    );
    for (const member of membersResult.page || []) {
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "member",
          where: [{ field: "_id", value: member._id as string, operator: "eq" }],
        },
      });
      deleted.members++;
    }

    // Organizations (via Better Auth adapter)
    console.log("Deleting organizations...");
    const orgsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "organization",
        paginationOpts: { cursor: null, numItems: 10_000 },
        where: [],
      }
    );
    for (const org of orgsResult.page || []) {
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "organization",
          where: [{ field: "_id", value: org._id as string, operator: "eq" }],
        },
      });
      deleted.organizations++;
    }

    // Sessions (via Better Auth adapter)
    console.log("Deleting sessions...");
    const sessionsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "session",
        paginationOpts: { cursor: null, numItems: 10_000 },
        where: [],
      }
    );
    for (const session of sessionsResult.page || []) {
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "session",
          where: [{ field: "_id", value: session._id as string, operator: "eq" }],
        },
      });
      deleted.sessions++;
    }

    // Accounts (via Better Auth adapter)
    console.log("Deleting accounts...");
    const accountsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "account",
        paginationOpts: { cursor: null, numItems: 10_000 },
        where: [],
      }
    );
    for (const account of accountsResult.page || []) {
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "account",
          where: [{ field: "_id", value: account._id as string, operator: "eq" }],
        },
      });
      deleted.accounts++;
    }

    // Users (via Better Auth adapter) - LAST because everything references users
    console.log("Deleting users...");
    const usersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "user",
        paginationOpts: { cursor: null, numItems: 10_000 },
        where: [],
      }
    );
    for (const user of usersResult.page || []) {
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "user",
          where: [{ field: "_id", value: user._id as string, operator: "eq" }],
        },
      });
      deleted.users++;
    }

    console.log("☢️  FULL DATABASE RESET COMPLETE!");
    console.log("📊 Deleted:", deleted);

    return { deleted };
  },
});
