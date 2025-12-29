import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Diagnostic query to check if data exists in old vs new identity tables
 */
export const checkTeamPlayerData = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    // Legacy table counts
    legacyTeamPlayersCount: v.number(),

    // New identity table counts
    teamPlayerIdentitiesCount: v.number(),
    activeTeamPlayerIdentitiesCount: v.number(),

    // Sample data
    sampleLegacyTeamPlayers: v.array(v.any()),
    sampleTeamPlayerIdentities: v.array(v.any()),

    needsMigration: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Check legacy teamPlayers table
    const legacyPlayers = await ctx.db.query("teamPlayers").collect();
    const legacyCount = legacyPlayers.length;

    // Check new teamPlayerIdentities table
    const newPlayerLinks = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activePlayerLinks = newPlayerLinks.filter(
      (link) => link.status === "active"
    );

    return {
      legacyTeamPlayersCount: legacyCount,
      teamPlayerIdentitiesCount: newPlayerLinks.length,
      activeTeamPlayerIdentitiesCount: activePlayerLinks.length,
      sampleLegacyTeamPlayers: legacyPlayers.slice(0, 3),
      sampleTeamPlayerIdentities: newPlayerLinks.slice(0, 3),
      needsMigration: legacyCount > 0 && newPlayerLinks.length === 0,
    };
  },
});
