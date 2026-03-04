/**
 * Migration: Auto-verify existing OAuth users' email addresses
 *
 * WHY: Issue #567 adds email verification. Existing OAuth users (Google/Microsoft)
 * have already proven email ownership through the OAuth flow. Without this migration,
 * they would see the "verify your email" banner on next login.
 *
 * WHAT: Iterates all users in batches via the Better Auth adapter. For each
 * unverified user, checks the account table for linked OAuth accounts.
 * If found, sets emailVerified = true via the adapter.
 *
 * SAFETY: Non-destructive — only sets emailVerified to true, never false.
 * Idempotent — safe to run multiple times.
 *
 * RUN: npx convex run migrations/verifyExistingUsers:verifyExistingOAuthUsers
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../_generated/server";

export const verifyExistingOAuthUsers = mutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    processed: v.number(),
    verified: v.number(),
    hasMore: v.boolean(),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;

    // Query users via Better Auth adapter (not ctx.db — "user" is a component table)
    const results = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { cursor: args.cursor ?? null, numItems: batchSize },
      where: [],
    });

    let verified = 0;

    for (const user of results.page) {
      const userRecord = user as {
        _id: string;
        email?: string;
        emailVerified?: boolean;
        userId?: string;
      };

      // Skip already-verified users
      if (userRecord.emailVerified) {
        continue;
      }

      // Check for OAuth accounts linked to this user
      const accounts = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "account",
          where: [
            {
              field: "userId",
              value: userRecord.userId ?? userRecord._id,
              operator: "eq",
            },
          ],
          paginationOpts: { cursor: null, numItems: 10 },
        }
      );

      const hasOAuth = accounts.page?.some(
        (acc: { providerId?: string }) =>
          acc.providerId === "google" || acc.providerId === "microsoft"
      );

      if (hasOAuth) {
        // Update via adapter (component table)
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "user",
            where: [{ field: "_id", value: userRecord._id, operator: "eq" }],
            update: { emailVerified: true, emailVerifiedAt: Date.now() },
          },
        });
        verified += 1;
        console.log("[migration] Auto-verified OAuth user:", userRecord.email);
      }
    }

    const hasMore = !results.isDone;

    console.log(
      `[migration] Batch complete: processed=${results.page.length}, verified=${verified}, hasMore=${hasMore}`
    );

    return {
      processed: results.page.length,
      verified,
      hasMore,
      nextCursor: hasMore ? results.continueCursor : undefined,
    };
  },
});
