/**
 * Player Graduation Scheduled Jobs (Onboarding Phase 7)
 *
 * These internal mutations are called by cron jobs to manage player graduation:
 * - Detect players who have turned 18 and create graduation records
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

// 18 years in milliseconds (accounting for leap years with 365.25)
const EIGHTEEN_YEARS_MS = 18 * 365.25 * 24 * 60 * 60 * 1000;

/**
 * Detect players who have turned 18 and create graduation records
 *
 * This job runs daily at 6 AM UTC to:
 * 1. Find players with dateOfBirth <= 18 years ago
 * 2. Check they don't already have userId set (not yet claimed)
 * 3. Check no graduation record exists
 * 4. Create a pending graduation record for guardians to see
 */
export const detectPlayerGraduations = internalMutation({
  args: {},
  returns: v.object({ created: v.number(), skipped: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    const eighteenYearsAgo = now - EIGHTEEN_YEARS_MS;

    // Convert to ISO date string for comparison with dateOfBirth field
    const cutoffDate = new Date(eighteenYearsAgo).toISOString().split("T")[0];

    // Get all youth players - we need to filter in memory since dateOfBirth is a string
    // In production, you might want to paginate this
    const allYouthPlayers = await ctx.db
      .query("playerIdentities")
      .withIndex("by_playerType", (q) => q.eq("playerType", "youth"))
      .collect();

    // Filter to players who are 18+ and not yet claimed
    const eligiblePlayers = allYouthPlayers.filter((player) => {
      // Compare ISO date strings (works because YYYY-MM-DD format is lexicographically sortable)
      return (
        player.dateOfBirth <= cutoffDate && // 18 or older
        !player.userId // Not yet claimed
      );
    });

    let created = 0;
    let skipped = 0;

    for (const player of eligiblePlayers) {
      // Check if graduation record already exists
      const existing = await ctx.db
        .query("playerGraduations")
        .withIndex("by_player", (q) => q.eq("playerIdentityId", player._id))
        .first();

      if (existing) {
        skipped += 1;
        continue;
      }

      // Get organization ID from the player's enrollment
      const enrollment = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", player._id)
        )
        .first();

      if (!enrollment) {
        // Player has no enrollment, skip
        skipped += 1;
        continue;
      }

      // Calculate when they turned 18
      const dob = new Date(player.dateOfBirth).getTime();
      const turnedEighteenAt = dob + EIGHTEEN_YEARS_MS;

      // Create graduation record
      await ctx.db.insert("playerGraduations", {
        playerIdentityId: player._id,
        organizationId: enrollment.organizationId,
        dateOfBirth: dob,
        turnedEighteenAt,
        status: "pending",
      });

      created += 1;
    }

    console.log(
      `[graduations] Created ${created} graduation records, skipped ${skipped}`
    );

    return { created, skipped };
  },
});
