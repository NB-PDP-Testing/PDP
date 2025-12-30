/**
 * Cleanup Script: Remove deprecated enrollment.sport field
 *
 * Phase 3 - Option 2 Implementation: Sport should only exist in sportPassports.
 * This script nulls out enrollment.sport to ensure single source of truth.
 *
 * IMPORTANT: Run this AFTER deploying the updated validation code that uses sportPassports.
 *
 * Usage:
 *   # Dry run first to see what would change
 *   npx convex run scripts/cleanupEnrollmentSport:cleanupEnrollmentSport '{"dryRun": true}' --prod
 *
 *   # Execute cleanup
 *   npx convex run scripts/cleanupEnrollmentSport:cleanupEnrollmentSport '{"dryRun": false}' --prod
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const cleanupEnrollmentSport = internalMutation({
  args: {
    dryRun: v.boolean(),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    totalEnrollments: v.number(),
    enrollmentsWithSport: v.number(),
    enrollmentsNulled: v.number(),
    errors: v.number(),
    errorDetails: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const _batchSize = args.batchSize ?? 100;
    const errorDetails: string[] = [];

    // Get all enrollments with sport field populated
    const allEnrollments = await ctx.db.query("orgPlayerEnrollments").collect();

    const enrollmentsWithSport = allEnrollments.filter((e) => e.sport);

    console.log(`[Cleanup] Found ${allEnrollments.length} total enrollments`);
    console.log(
      `[Cleanup] Found ${enrollmentsWithSport.length} enrollments with sport field`
    );

    if (args.dryRun) {
      console.log("[Cleanup] DRY RUN - No changes will be made");
      console.log("[Cleanup] Would null out sport field for:");
      for (const e of enrollmentsWithSport.slice(0, 10)) {
        console.log(
          `  - Enrollment ${e._id}: sport="${e.sport}", org=${e.organizationId}`
        );
      }
      if (enrollmentsWithSport.length > 10) {
        console.log(
          `  ... and ${enrollmentsWithSport.length - 10} more enrollments`
        );
      }

      return {
        totalEnrollments: allEnrollments.length,
        enrollmentsWithSport: enrollmentsWithSport.length,
        enrollmentsNulled: 0,
        errors: 0,
        errorDetails: [],
      };
    }

    // Process in batches
    let nulled = 0;
    let errors = 0;

    for (const enrollment of enrollmentsWithSport) {
      try {
        // Verify sport passport exists before removing enrollment.sport
        if (!enrollment.sport) {
          continue; // Skip if no sport field
        }

        const sportPassport = await ctx.db
          .query("sportPassports")
          .withIndex("by_player_and_org", (q) =>
            q
              .eq("playerIdentityId", enrollment.playerIdentityId)
              .eq("organizationId", enrollment.organizationId)
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("sportCode"), enrollment.sport),
              q.eq(q.field("status"), "active")
            )
          )
          .first();

        if (!sportPassport) {
          const error = `Enrollment ${enrollment._id} has sport ${enrollment.sport} but no matching active sport passport`;
          console.error(`[Cleanup] ${error}`);
          errorDetails.push(error);
          errors += 1;
          continue;
        }

        // Null out the deprecated sport field
        await ctx.db.patch(enrollment._id, {
          sport: undefined, // Remove the field
          updatedAt: Date.now(),
        });

        nulled += 1;

        if (nulled % 100 === 0) {
          console.log(
            `[Cleanup] Processed ${nulled}/${enrollmentsWithSport.length} enrollments`
          );
        }
      } catch (error) {
        const errorMsg = `Failed to process enrollment ${enrollment._id}: ${error}`;
        console.error(`[Cleanup] ${errorMsg}`);
        errorDetails.push(errorMsg);
        errors += 1;
      }
    }

    console.log(`[Cleanup] COMPLETE: Nulled ${nulled} enrollment sport fields`);
    console.log(`[Cleanup] Errors: ${errors}`);

    if (errors > 0) {
      console.error("[Cleanup] Error details:");
      for (const err of errorDetails) {
        console.error(`  - ${err}`);
      }
    }

    return {
      totalEnrollments: allEnrollments.length,
      enrollmentsWithSport: enrollmentsWithSport.length,
      enrollmentsNulled: nulled,
      errors,
      errorDetails,
    };
  },
});
