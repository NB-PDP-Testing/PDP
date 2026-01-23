/**
 * One-time migration to update coachName in existing teamObservations
 * Run with: npx convex run scripts/updateTeamObservationCoachNames:updateCoachNames
 */

import { components } from "../_generated/api";
import { internalMutation } from "../_generated/server";

export const updateCoachNames = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all team observations
    const observations = await ctx.db.query("teamObservations").collect();

    let updatedCount = 0;

    console.log(
      "Found observations:",
      observations.map((o) => ({
        id: o._id,
        orgId: o.organizationId,
        teamId: o.teamId,
        teamName: o.teamName,
        coachName: o.coachName,
        title: o.title,
      }))
    );

    for (const obs of observations) {
      // Skip if already has a real name (not "Coach")
      if (obs.coachName !== "Coach") {
        continue;
      }

      // Fetch coach details from Better Auth
      const coachUser = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "user",
          where: [{ field: "id", value: obs.coachId, operator: "eq" }],
        }
      );

      if (coachUser) {
        const coachName =
          `${(coachUser as any).firstName || ""} ${(coachUser as any).lastName || ""}`.trim() ||
          (coachUser as any).name ||
          "Coach";

        await ctx.db.patch(obs._id, { coachName });
        updatedCount += 1;
        console.log(`Updated observation ${obs._id}: "Coach" → "${coachName}"`);
      }
    }

    return {
      totalObservations: observations.length,
      updatedCount,
      message: `Updated ${updatedCount} observations with coach names`,
    };
  },
});
