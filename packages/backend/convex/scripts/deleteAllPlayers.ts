/**
 * Script to hard-delete all players from the system for testing purposes.
 *
 * Run with:
 *   cd packages/backend
 *   npx convex run scripts/deleteAllPlayers
 *
 * WARNING: This permanently deletes all player data!
 */
import { internalMutation } from "../_generated/server";

export const deleteAllPlayers = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("⚠️  Deleting all players from the system...");

    // 1. Delete all team player assignments
    const teamPlayerIdentities = await ctx.db
      .query("teamPlayerIdentities")
      .collect();
    console.log(
      `Deleting ${teamPlayerIdentities.length} team player assignments...`
    );
    for (const tpi of teamPlayerIdentities) {
      await ctx.db.delete(tpi._id);
    }

    // 2. Delete all org player enrollments
    const enrollments = await ctx.db.query("orgPlayerEnrollments").collect();
    console.log(`Deleting ${enrollments.length} org enrollments...`);
    for (const enrollment of enrollments) {
      await ctx.db.delete(enrollment._id);
    }

    // 3. Delete all sport passports
    const passports = await ctx.db.query("sportPassports").collect();
    console.log(`Deleting ${passports.length} sport passports...`);
    for (const passport of passports) {
      await ctx.db.delete(passport._id);
    }

    // 4. Delete all player identities
    const players = await ctx.db.query("playerIdentities").collect();
    console.log(`Deleting ${players.length} player identities...`);
    for (const player of players) {
      await ctx.db.delete(player._id);
    }

    console.log("✅ All players deleted successfully!");

    return {
      deleted: {
        teamPlayerIdentities: teamPlayerIdentities.length,
        enrollments: enrollments.length,
        passports: passports.length,
        players: players.length,
      },
    };
  },
});
