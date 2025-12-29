import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

export const getOrgFromEnrollments = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const enrollments = await ctx.db.query("orgPlayerEnrollments").take(5);

    // Get teams using Better Auth adapter
    const teamsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "team",
        paginationOpts: { cursor: null, numItems: 5 },
        where: [],
      }
    );

    return {
      enrollments: enrollments.map((e) => ({
        orgId: e.organizationId,
        ageGroup: e.ageGroup,
        season: e.season,
      })),
      teams: teamsResult.page.map((t: any) => ({
        orgId: t.organizationId,
        name: t.name,
        sport: t.sport,
        ageGroup: t.ageGroup,
      })),
    };
  },
});
