// @ts-nocheck
/**
 * UAT Test Data Cleanup Scripts
 *
 * These functions clean up test data created during UAT tests.
 * They are designed to be safe - they do NOT delete users or organizations.
 *
 * IMPORTANT: This removes UAT-specific test data only.
 * Users and organizations are preserved.
 */

import { mutation, query } from "../_generated/server";

/**
 * Markers for identifying UAT-created test data
 * Data with these markers will be cleaned up
 */
const UAT_MARKERS = {
  // Players with these names are test data
  testPlayerLastNames: ["TestPlayer", "UATPlayer"],
  // Teams with UAT in the name are test data
  testTeamNamePatterns: ["UAT", "Test Team UAT"],
};

/**
 * Clean up UAT-specific test data
 * This DOES NOT delete:
 * - Users (needed for future test runs)
 * - Organizations (needed for future test runs)
 * - Role assignments (preserved for users)
 *
 * This DOES delete:
 * - Players marked as UAT test data
 * - Teams marked as UAT test data
 * - Invitations that are pending (cleanup)
 */
export const cleanupUATTestData = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🧹 Starting UAT Test Data Cleanup...\n");

    const results = {
      players: { checked: 0, deleted: 0 },
      teams: { checked: 0, deleted: 0 },
      invitations: { checked: 0, deleted: 0 },
    };

    try {
      // Step 1: Clean up UAT test players
      console.log("👶 Step 1: Cleaning up UAT test players...");
      const allPlayers = await (ctx.db as any).query("players").collect();
      results.players.checked = allPlayers.length;

      for (const player of allPlayers) {
        const lastName = player.lastName || "";
        const isTestPlayer = UAT_MARKERS.testPlayerLastNames.some((marker) =>
          lastName.includes(marker)
        );

        if (isTestPlayer) {
          console.log(
            `  🗑️ Deleting test player: ${player.firstName} ${player.lastName}`
          );
          await ctx.db.delete(player._id);
          results.players.deleted++;
        }
      }
      console.log(
        `  ✓ Deleted ${results.players.deleted}/${results.players.checked} players\n`
      );

      // Step 2: Clean up UAT test teams
      console.log("⚽ Step 2: Cleaning up UAT test teams...");
      const allTeams = await (ctx.db as any).query("teams").collect();
      results.teams.checked = allTeams.length;

      for (const team of allTeams) {
        const teamName = team.name || "";
        const isTestTeam = UAT_MARKERS.testTeamNamePatterns.some((marker) =>
          teamName.includes(marker)
        );

        if (isTestTeam) {
          console.log(`  🗑️ Deleting test team: ${team.name}`);
          await ctx.db.delete(team._id);
          results.teams.deleted++;
        }
      }
      console.log(
        `  ✓ Deleted ${results.teams.deleted}/${results.teams.checked} teams\n`
      );

      // Step 3: Clean up pending invitations (optional)
      console.log("📧 Step 3: Cleaning up stale invitations...");
      try {
        const invitations = await (ctx.db as any)
          .query("invitations")
          .filter((q: any) => q.eq(q.field("status"), "pending"))
          .collect();
        results.invitations.checked = invitations.length;

        // Only delete invitations older than 24 hours (stale)
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        for (const invitation of invitations) {
          const createdAt = invitation._creationTime || 0;
          if (createdAt < oneDayAgo) {
            console.log(`  🗑️ Deleting stale invitation: ${invitation.email}`);
            await ctx.db.delete(invitation._id);
            results.invitations.deleted++;
          }
        }
        console.log(
          `  ✓ Deleted ${results.invitations.deleted}/${results.invitations.checked} stale invitations\n`
        );
      } catch {
        console.log("  ⏭️ Invitations table not found or not accessible\n");
      }

      // Summary
      console.log("📊 UAT Cleanup Summary:");
      console.log(`  Players deleted: ${results.players.deleted}`);
      console.log(`  Teams deleted: ${results.teams.deleted}`);
      console.log(`  Invitations deleted: ${results.invitations.deleted}`);
      console.log("\n✅ UAT Test Data Cleanup Complete!");
      console.log("\nPreserved:");
      console.log("  - All user accounts");
      console.log("  - All organizations");
      console.log("  - All role assignments");
      console.log("  - Non-test players and teams\n");

      return {
        success: true,
        results,
      };
    } catch (error) {
      console.error("❌ UAT Cleanup Error:", error);
      return {
        success: false,
        error: String(error),
        results,
      };
    }
  },
});

/**
 * Preview what would be cleaned up (dry run)
 */
export const previewCleanup = query({
  args: {},
  handler: async (ctx) => {
    const preview = {
      playersToDelete: [] as { id: string; name: string }[],
      teamsToDelete: [] as { id: string; name: string }[],
      invitationsToDelete: [] as { id: string; email: string }[],
    };

    // Check players
    const allPlayers = await (ctx.db as any).query("players").collect();
    for (const player of allPlayers) {
      const lastName = player.lastName || "";
      const isTestPlayer = UAT_MARKERS.testPlayerLastNames.some((marker) =>
        lastName.includes(marker)
      );
      if (isTestPlayer) {
        preview.playersToDelete.push({
          id: player._id,
          name: `${player.firstName} ${player.lastName}`,
        });
      }
    }

    // Check teams
    const allTeams = await (ctx.db as any).query("teams").collect();
    for (const team of allTeams) {
      const teamName = team.name || "";
      const isTestTeam = UAT_MARKERS.testTeamNamePatterns.some((marker) =>
        teamName.includes(marker)
      );
      if (isTestTeam) {
        preview.teamsToDelete.push({
          id: team._id,
          name: team.name,
        });
      }
    }

    // Check stale invitations
    try {
      const invitations = await (ctx.db as any)
        .query("invitations")
        .filter((q: any) => q.eq(q.field("status"), "pending"))
        .collect();

      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      for (const invitation of invitations) {
        const createdAt = invitation._creationTime || 0;
        if (createdAt < oneDayAgo) {
          preview.invitationsToDelete.push({
            id: invitation._id,
            email: invitation.email,
          });
        }
      }
    } catch {
      // Invitations table may not exist
    }

    return preview;
  },
});
