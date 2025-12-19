import { query } from "../_generated/server";
import { v } from "convex/values";

export const getOrgFromEnrollments = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const enrollments = await ctx.db.query("orgPlayerEnrollments").take(5);
    const teams = await ctx.db.query("teams").take(5);

    return {
      enrollments: enrollments.map(e => ({
        orgId: e.organizationId,
        ageGroup: e.ageGroup,
        season: e.season,
      })),
      teams: teams.map(t => ({
        orgId: t.organizationId,
        name: t.name,
        sport: t.sport,
        ageGroup: t.ageGroup,
      })),
    };
  },
});
