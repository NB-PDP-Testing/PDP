import { query } from "../_generated/server";
import { v } from "convex/values";

// Analyze what would happen on re-import
export const analyzeReimport = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    // Get all data
    const playerIdentities = await ctx.db.query("playerIdentities").collect();
    const guardianIdentities = await ctx.db.query("guardianIdentities").collect();
    const enrollments = await ctx.db.query("orgPlayerEnrollments").collect();
    const sportPassports = await ctx.db.query("sportPassports").collect();
    const teamPlayerIdentities = await ctx.db.query("teamPlayerIdentities").collect();
    const teams = await ctx.db.query("teams").collect();

    // Group teams by properties
    const teamsByAgeGroup = teams.reduce((acc, team) => {
      const key = `${team.ageGroup}-${team.gender}`;
      acc[key] = acc[key] || [];
      acc[key].push(team);
      return acc;
    }, {} as Record<string, typeof teams>);

    // Analyze guardian data
    const guardiansByEmail = guardianIdentities.reduce((acc, g) => {
      if (g.email) {
        acc[g.email.toLowerCase()] = g;
      }
      return acc;
    }, {} as Record<string, typeof guardianIdentities[0]>);

    // Group players by DOB for duplicate detection
    const playersByKey = playerIdentities.reduce((acc, p) => {
      const key = `${p.firstName.toLowerCase()}_${p.lastName.toLowerCase()}_${p.dateOfBirth}`;
      acc[key] = p;
      return acc;
    }, {} as Record<string, typeof playerIdentities[0]>);

    return {
      totals: {
        players: playerIdentities.length,
        guardians: guardianIdentities.length,
        enrollments: enrollments.length,
        passports: sportPassports.length,
        teamAssignments: teamPlayerIdentities.length,
        teams: teams.length,
      },
      teams: teams.map(t => ({
        name: t.name,
        sport: t.sport,
        ageGroup: t.ageGroup,
        gender: t.gender,
        season: t.season,
      })),
      teamsByAgeGroup: Object.entries(teamsByAgeGroup).map(([key, teams]) => ({
        key,
        count: teams.length,
        teams: teams.map(t => t.name),
      })),
      guardianEmails: Object.keys(guardiansByEmail),
      playerSample: playerIdentities.slice(0, 10).map(p => ({
        name: `${p.firstName} ${p.lastName}`,
        dob: p.dateOfBirth,
        gender: p.gender,
        type: p.playerType,
      })),
      enrollmentSample: enrollments.slice(0, 10).map(e => ({
        ageGroup: e.ageGroup,
        season: e.season,
        status: e.status,
      })),
    };
  },
});
