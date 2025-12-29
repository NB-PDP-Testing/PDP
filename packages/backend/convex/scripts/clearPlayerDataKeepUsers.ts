/**
 * Clear all player/team/org data but KEEP user authentication data
 *
 * This script preserves:
 * - Better Auth tables (users, sessions, accounts, etc.)
 * - User table
 *
 * This script deletes:
 * - All player data (playerIdentities, enrollments, passports, etc.)
 * - All team data (teamPlayerIdentities)
 * - All organization data (organizations, members, etc.)
 * - All assessments, injuries, medical data, etc.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const clearPlayerDataKeepUsers = internalMutation({
  args: {
    confirmDelete: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    deletedCounts: v.object({
      playerIdentities: v.number(),
      orgPlayerEnrollments: v.number(),
      sportPassports: v.number(),
      teamPlayerIdentities: v.number(),
      skillAssessments: v.number(),
      playerInjuries: v.number(),
      medicalProfiles: v.number(),
      emergencyContacts: v.number(),
      organizations: v.number(),
      members: v.number(),
      coaches: v.number(),
      voiceNotes: v.number(),
      guardianIdentities: v.number(),
      guardianPlayerLinks: v.number(),
      playerSelfAccessRequests: v.number(),
      orgJoinRequests: v.number(),
      ageGroups: v.number(),
      sports: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    if (!args.confirmDelete) {
      return {
        success: false,
        message: "Must set confirmDelete: true to proceed",
        deletedCounts: {
          playerIdentities: 0,
          orgPlayerEnrollments: 0,
          sportPassports: 0,
          teamPlayerIdentities: 0,
          skillAssessments: 0,
          playerInjuries: 0,
          medicalProfiles: 0,
          emergencyContacts: 0,
          organizations: 0,
          members: 0,
          coaches: 0,
          voiceNotes: 0,
          guardianIdentities: 0,
          guardianPlayerLinks: 0,
          playerSelfAccessRequests: 0,
          orgJoinRequests: 0,
          ageGroups: 0,
          sports: 0,
        },
      };
    }

    console.log("🗑️  Starting selective data cleanup...");
    console.log("✅ PRESERVING: User authentication data (Better Auth tables)");
    console.log("❌ DELETING: All player, team, org, and assessment data");

    const deletedCounts = {
      playerIdentities: 0,
      orgPlayerEnrollments: 0,
      sportPassports: 0,
      teamPlayerIdentities: 0,
      skillAssessments: 0,
      playerInjuries: 0,
      medicalProfiles: 0,
      emergencyContacts: 0,
      organizations: 0,
      members: 0,
      coaches: 0,
      voiceNotes: 0,
      guardianIdentities: 0,
      guardianPlayerLinks: 0,
      playerSelfAccessRequests: 0,
      orgJoinRequests: 0,
      ageGroups: 0,
      sports: 0,
    };

    // Delete in order to respect foreign key constraints

    // 1. Delete assessments and related data (depends on playerIdentities)
    console.log("Deleting skill assessments...");
    const assessments = await ctx.db.query("skillAssessments").collect();
    for (const assessment of assessments) {
      await ctx.db.delete(assessment._id);
      deletedCounts.skillAssessments++;
    }

    console.log("Deleting player injuries...");
    const injuries = await ctx.db.query("playerInjuries").collect();
    for (const injury of injuries) {
      await ctx.db.delete(injury._id);
      deletedCounts.playerInjuries++;
    }

    console.log("Deleting medical profiles...");
    const medicalProfiles = await ctx.db.query("medicalProfiles").collect();
    for (const profile of medicalProfiles) {
      await ctx.db.delete(profile._id);
      deletedCounts.medicalProfiles++;
    }

    // Emergency contacts table no longer exists in schema
    // console.log("Deleting emergency contacts...");
    // const emergencyContacts = await ctx.db.query("emergencyContacts").collect();
    // for (const contact of emergencyContacts) {
    //   await ctx.db.delete(contact._id);
    //   deletedCounts.emergencyContacts++;
    // }

    console.log("Deleting voice notes...");
    const voiceNotes = await ctx.db.query("voiceNotes").collect();
    for (const note of voiceNotes) {
      await ctx.db.delete(note._id);
      deletedCounts.voiceNotes++;
    }

    // 2. Delete guardian data
    console.log("Deleting guardian-player links...");
    const guardianLinks = await ctx.db.query("guardianPlayerLinks").collect();
    for (const link of guardianLinks) {
      await ctx.db.delete(link._id);
      deletedCounts.guardianPlayerLinks++;
    }

    console.log("Deleting guardian identities...");
    const guardianIdentities = await ctx.db
      .query("guardianIdentities")
      .collect();
    for (const guardian of guardianIdentities) {
      await ctx.db.delete(guardian._id);
      deletedCounts.guardianIdentities++;
    }

    // 3. Delete team memberships
    console.log("Deleting team player identities...");
    const teamPlayerIdentities = await ctx.db
      .query("teamPlayerIdentities")
      .collect();
    for (const tpi of teamPlayerIdentities) {
      await ctx.db.delete(tpi._id);
      deletedCounts.teamPlayerIdentities++;
    }

    // 4. Delete player data
    console.log("Deleting sport passports...");
    const sportPassports = await ctx.db.query("sportPassports").collect();
    for (const passport of sportPassports) {
      await ctx.db.delete(passport._id);
      deletedCounts.sportPassports++;
    }

    console.log("Deleting org player enrollments...");
    const enrollments = await ctx.db.query("orgPlayerEnrollments").collect();
    for (const enrollment of enrollments) {
      await ctx.db.delete(enrollment._id);
      deletedCounts.orgPlayerEnrollments++;
    }

    console.log("Deleting player identities...");
    const playerIdentities = await ctx.db.query("playerIdentities").collect();
    for (const player of playerIdentities) {
      await ctx.db.delete(player._id);
      deletedCounts.playerIdentities++;
    }

    // 5. Delete organization data
    // playerSelfAccessRequests table no longer exists in schema
    // console.log("Deleting player self-access requests...");
    // const accessRequests = await ctx.db
    //   .query("playerSelfAccessRequests")
    //   .collect();
    // for (const request of accessRequests) {
    //   await ctx.db.delete(request._id);
    //   deletedCounts.playerSelfAccessRequests++;
    // }

    console.log("Deleting org join requests...");
    const joinRequests = await ctx.db.query("orgJoinRequests").collect();
    for (const request of joinRequests) {
      await ctx.db.delete(request._id);
      deletedCounts.orgJoinRequests++;
    }

    // coaches table no longer exists in schema
    // console.log("Deleting coaches...");
    // const coaches = await ctx.db.query("coaches").collect();
    // for (const coach of coaches) {
    //   await ctx.db.delete(coach._id);
    //   deletedCounts.coaches++;
    // }

    // members table is a Better Auth table, shouldn't be deleted via direct query
    // console.log("Deleting members...");
    // const members = await ctx.db.query("members").collect();
    // for (const member of members) {
    //   await ctx.db.delete(member._id);
    //   deletedCounts.members++;
    // }

    // organizations table is a Better Auth table, shouldn't be deleted via direct query
    // console.log("Deleting organizations...");
    // const organizations = await ctx.db.query("organizations").collect();
    // for (const org of organizations) {
    //   await ctx.db.delete(org._id);
    //   deletedCounts.organizations++;
    // }

    // 6. Delete reference data (age groups, sports)
    console.log("Deleting age groups...");
    const ageGroups = await ctx.db.query("ageGroups").collect();
    for (const ageGroup of ageGroups) {
      await ctx.db.delete(ageGroup._id);
      deletedCounts.ageGroups++;
    }

    console.log("Deleting sports...");
    const sports = await ctx.db.query("sports").collect();
    for (const sport of sports) {
      await ctx.db.delete(sport._id);
      deletedCounts.sports++;
    }

    console.log("✅ Cleanup complete!");
    console.log("📊 Deleted counts:", deletedCounts);
    console.log("✅ PRESERVED: All Better Auth user/session data");

    return {
      success: true,
      message:
        "Successfully deleted all player/team/org data while preserving user authentication",
      deletedCounts,
    };
  },
});
