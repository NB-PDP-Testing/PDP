/**
 * Migration: Backfill normalizedFirstName and normalizedLastName on playerIdentities.
 *
 * WHY: Issue #573 adds normalized name fields + index for deduplication.
 * Existing records need these fields populated to appear in the new index.
 *
 * WHAT: Iterates all playerIdentities in batches of 100 and writes
 * normalizedFirstName/normalizedLastName using the existing normalizeForMatching utility.
 *
 * SAFETY: Non-destructive — only adds new optional fields, never modifies existing data.
 * Idempotent — safe to run multiple times (overwrites with same values).
 *
 * RUN: npx convex run migrations/backfillNormalizedNames:backfillNormalizedNames
 */

import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { normalizeForMatching } from "../lib/stringMatching";

export const backfillNormalizedNames = mutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    processed: v.number(),
    updated: v.number(),
    hasMore: v.boolean(),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;

    const results = await ctx.db
      .query("playerIdentities")
      .paginate({ cursor: args.cursor ?? null, numItems: batchSize });

    let updated = 0;

    for (const player of results.page) {
      const normalizedFirst = normalizeForMatching(player.firstName);
      const normalizedLast = normalizeForMatching(player.lastName);

      // Only patch if values differ or are missing
      if (
        player.normalizedFirstName !== normalizedFirst ||
        player.normalizedLastName !== normalizedLast
      ) {
        await ctx.db.patch(player._id, {
          normalizedFirstName: normalizedFirst,
          normalizedLastName: normalizedLast,
        });
        updated += 1;
      }
    }

    const hasMore = !results.isDone;

    return {
      processed: results.page.length,
      updated,
      hasMore,
      nextCursor: hasMore ? results.continueCursor : undefined,
    };
  },
});
