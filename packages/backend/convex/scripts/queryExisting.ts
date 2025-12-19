import { query } from "../_generated/server";
import { v } from "convex/values";

// Query to get overview of existing data
export const getDataOverview = query({
  args: {},
  returns: v.object({
    playerIdentitiesCount: v.number(),
    guardianIdentitiesCount: v.number(),
    enrollmentsCount: v.number(),
    sportPassportsCount: v.number(),
    teamPlayerIdentitiesCount: v.number(),
    samplePlayers: v.array(v.object({
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
    })),
  }),
  handler: async (ctx) => {
    const playerIdentities = await ctx.db.query("playerIdentities").collect();
    const guardianIdentities = await ctx.db.query("guardianIdentities").collect();
    const enrollments = await ctx.db.query("orgPlayerEnrollments").collect();
    const sportPassports = await ctx.db.query("sportPassports").collect();
    const teamPlayerIdentities = await ctx.db.query("teamPlayerIdentities").collect();

    // Get first 5 players as sample
    const samplePlayers = playerIdentities.slice(0, 5).map(p => ({
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth,
    }));

    return {
      playerIdentitiesCount: playerIdentities.length,
      guardianIdentitiesCount: guardianIdentities.length,
      enrollmentsCount: enrollments.length,
      sportPassportsCount: sportPassports.length,
      teamPlayerIdentitiesCount: teamPlayerIdentities.length,
      samplePlayers,
    };
  },
});
