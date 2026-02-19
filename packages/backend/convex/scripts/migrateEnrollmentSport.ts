// @ts-nocheck
/**
 * Migration Script: Add sport field to orgPlayerEnrollments
 *
 * This script backfills the new sport field in orgPlayerEnrollments by:
 * 1. Getting the player's primary sport passport
 * 2. Setting enrollment.sport = passport.sportCode
 * 3. For dual-sport players, creating additional enrollments per sport
 *
 * Run with dry run first:
 *   npx convex run scripts/migrateEnrollmentSport:migrateEnrollmentSport '{"dryRun": true}'
 *
 * Then run for real:
 *   npx convex run scripts/migrateEnrollmentSport:migrateEnrollmentSport '{"dryRun": false}'
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const migrateEnrollmentSport = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    processed: v.number(),
    updated: v.number(),
    duplicated: v.number(),
    skipped: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    let processed = 0;
    let updated = 0;
    let duplicated = 0;
    let skipped = 0;
    const errors: string[] = [];

    console.log(
      `[Migration] Starting enrollment sport migration (dryRun=${dryRun})`
    );

    // Get all enrollments
    const enrollments = await ctx.db.query("orgPlayerEnrollments").collect();

    console.log(`[Migration] Found ${enrollments.length} total enrollments`);

    for (const enrollment of enrollments) {
      processed++;

      // Skip if already has sport
      if (enrollment.sport) {
        skipped++;
        console.log(
          `[Migration] Skipping enrollment ${enrollment._id} - already has sport: ${enrollment.sport}`
        );
        continue;
      }

      try {
        // Get all active sport passports for this player in this org
        const passports = await ctx.db
          .query("sportPassports")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", enrollment.playerIdentityId)
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("organizationId"), enrollment.organizationId),
              q.eq(q.field("status"), "active")
            )
          )
          .collect();

        if (passports.length === 0) {
          errors.push(
            `No sport passport for player ${enrollment.playerIdentityId} in enrollment ${enrollment._id}`
          );
          continue;
        }

        // Update enrollment with first sport
        const primarySport = passports[0].sportCode;
        console.log(
          `[Migration] ${dryRun ? "[DRY RUN]" : ""} Setting enrollment ${enrollment._id} sport to ${primarySport}`
        );

        if (!dryRun) {
          await ctx.db.patch(enrollment._id, {
            sport: primarySport,
            updatedAt: Date.now(),
          });
        }
        updated++;

        // For dual-sport players, create additional enrollments
        if (passports.length > 1) {
          for (let i = 1; i < passports.length; i++) {
            const otherSport = passports[i].sportCode;

            console.log(
              `[Migration] ${dryRun ? "[DRY RUN]" : ""} Creating duplicate enrollment for sport ${otherSport}`
            );

            if (!dryRun) {
              // Check if enrollment for this sport already exists
              const existing = await ctx.db
                .query("orgPlayerEnrollments")
                .withIndex("by_player_org_sport", (q) =>
                  q
                    .eq("playerIdentityId", enrollment.playerIdentityId)
                    .eq("organizationId", enrollment.organizationId)
                    .eq("sport", otherSport)
                )
                .first();

              if (existing) {
                console.log(
                  `[Migration] Enrollment for ${otherSport} already exists, skipping duplicate creation`
                );
                continue;
              }

              await ctx.db.insert("orgPlayerEnrollments", {
                playerIdentityId: enrollment.playerIdentityId,
                organizationId: enrollment.organizationId,
                clubMembershipNumber: enrollment.clubMembershipNumber,
                ageGroup: enrollment.ageGroup,
                season: enrollment.season,
                sport: otherSport,
                status: enrollment.status,
                reviewStatus: enrollment.reviewStatus,
                lastReviewDate: enrollment.lastReviewDate,
                nextReviewDue: enrollment.nextReviewDue,
                attendance: enrollment.attendance,
                coachNotes: enrollment.coachNotes,
                adminNotes: enrollment.adminNotes,
                enrolledAt: enrollment.enrolledAt,
                updatedAt: Date.now(),
              });
            }
            duplicated++;
          }
        }
      } catch (error) {
        const errorMsg = `Error processing enrollment ${enrollment._id}: ${error}`;
        errors.push(errorMsg);
        console.error(`[Migration] ${errorMsg}`);
      }
    }

    const summary = {
      processed,
      updated,
      duplicated,
      skipped,
      errors,
    };

    console.log("[Migration] Complete:", summary);

    return summary;
  },
});
