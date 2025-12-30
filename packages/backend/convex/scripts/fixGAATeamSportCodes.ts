/**
 * Fix GAA Teams - Update sport field from "GAA Football" to "gaa_football"
 *
 * This fixes teams that were created with the display name instead of the sport code.
 * After running this, players with sportPassport "gaa_football" will be able to join teams.
 *
 * Usage:
 *   # Dry run first to see what will change
 *   npx convex run scripts/fixGAATeamSportCodes:fixGAATeams '{"dryRun": true}'
 *
 *   # Execute the fix
 *   npx convex run scripts/fixGAATeamSportCodes:fixGAATeams '{"dryRun": false}'
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import type { Doc as BetterAuthDoc } from "../betterAuth/_generated/dataModel";

export const fixGAATeams = internalMutation({
  args: {
    dryRun: v.boolean(),
  },
  returns: v.object({
    totalTeams: v.number(),
    teamsWithDisplayName: v.number(),
    teamsUpdated: v.number(),
    errors: v.number(),
    errorDetails: v.array(v.string()),
    updatedTeams: v.array(
      v.object({
        _id: v.string(),
        name: v.string(),
        oldSport: v.string(),
        newSport: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const errorDetails: string[] = [];
    const updatedTeams: Array<{
      _id: string;
      name: string;
      oldSport: string;
      newSport: string;
    }> = [];

    console.log(
      `[FixGAATeams] Starting ${args.dryRun ? "DRY RUN" : "LIVE RUN"}`
    );

    // Get all teams from Better Auth
    const teamsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "team",
        paginationOpts: { cursor: null, numItems: 1000 },
        where: [],
      }
    );

    const allTeams = teamsResult.page as BetterAuthDoc<"team">[];
    console.log(`[FixGAATeams] Found ${allTeams.length} total teams`);

    // Find teams with "GAA Football" (display name)
    const gaaTeams = allTeams.filter((t) => t.sport === "GAA Football");
    console.log(
      `[FixGAATeams] Found ${gaaTeams.length} teams with "GAA Football" display name`
    );

    if (args.dryRun) {
      console.log("[FixGAATeams] DRY RUN - Teams that would be updated:");
      gaaTeams.forEach((team) => {
        console.log(
          `  - ${team.name} (ID: ${team._id}): "${team.sport}" → "gaa_football"`
        );
        updatedTeams.push({
          _id: team._id,
          name: team.name,
          oldSport: team.sport || "",
          newSport: "gaa_football",
        });
      });

      return {
        totalTeams: allTeams.length,
        teamsWithDisplayName: gaaTeams.length,
        teamsUpdated: 0,
        errors: 0,
        errorDetails: [],
        updatedTeams,
      };
    }

    // Execute updates
    let updated = 0;
    let errors = 0;

    for (const team of gaaTeams) {
      try {
        console.log(`[FixGAATeams] Updating team: ${team.name} (${team._id})`);

        // Update via Better Auth adapter
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "team",
            where: [{ field: "_id", value: team._id, operator: "eq" }],
            update: { sport: "gaa_football" },
          },
        });

        updatedTeams.push({
          _id: team._id,
          name: team.name,
          oldSport: team.sport || "",
          newSport: "gaa_football",
        });

        updated++;
        console.log(`[FixGAATeams] ✅ Updated: ${team.name}`);
      } catch (error) {
        const errorMsg = `Failed to update team ${team._id} (${team.name}): ${error}`;
        console.error(`[FixGAATeams] ❌ ${errorMsg}`);
        errorDetails.push(errorMsg);
        errors++;
      }
    }

    console.log(`[FixGAATeams] COMPLETE: Updated ${updated} teams`);
    if (errors > 0) {
      console.error(`[FixGAATeams] Errors: ${errors}`);
      errorDetails.forEach((err) => console.error(`  - ${err}`));
    }

    return {
      totalTeams: allTeams.length,
      teamsWithDisplayName: gaaTeams.length,
      teamsUpdated: updated,
      errors,
      errorDetails,
      updatedTeams,
    };
  },
});
