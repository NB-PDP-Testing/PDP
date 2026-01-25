/**
 * Default Platform Rate Limits (Phase 6.1 - US-011)
 *
 * This file defines conservative platform-wide rate limits that act as a safety net
 * to prevent catastrophic costs from bugs, abuse, or runaway loops.
 *
 * These limits should NEVER be hit in normal operation. They're failsafes.
 *
 * IMPORTANT: Adjust these values based on actual platform usage patterns after deployment.
 * Monitor aiUsageLog table to understand typical usage and set limits accordingly.
 *
 * Current values are intentionally conservative:
 * - messages_per_hour: 1000 (prevents runaway loops within 1 hour)
 * - messages_per_day: 10000 (reasonable max for moderate usage)
 * - cost_per_hour: $50 (catches expensive API abuse quickly)
 * - cost_per_day: $500 (daily cap to prevent budget disasters)
 *
 * Usage:
 * 1. Run this manually via Convex dashboard to insert defaults
 * 2. OR call from a migration script
 * 3. Only run once during initial setup
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * Insert default platform-wide rate limits
 *
 * USAGE: Run this mutation once during initial Phase 6.1 setup
 *
 * Creates 4 platform-wide rate limits:
 * 1. messages_per_hour: 1000
 * 2. messages_per_day: 10000
 * 3. cost_per_hour: $50
 * 4. cost_per_day: $500
 *
 * All limits start with:
 * - scope: 'platform'
 * - scopeId: 'platform'
 * - currentCount: 0
 * - currentCost: 0
 * - windowStart: now
 * - windowEnd: now + duration
 */
export const insertDefaultRateLimits = internalMutation({
  args: {},
  returns: v.object({
    inserted: v.number(),
    skipped: v.number(),
    message: v.string(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    // Check if platform limits already exist
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_scope_type", (q) =>
        q.eq("scope", "platform").eq("scopeId", "platform")
      )
      .collect();

    if (existing.length > 0) {
      return {
        inserted: 0,
        skipped: existing.length,
        message: `Skipped: ${existing.length} platform limits already exist`,
      };
    }

    // Define default limits
    const defaultLimits = [
      {
        limitType: "messages_per_hour" as const,
        limitValue: 1000,
        windowDuration: ONE_HOUR_MS,
      },
      {
        limitType: "messages_per_day" as const,
        limitValue: 10_000,
        windowDuration: ONE_DAY_MS,
      },
      {
        limitType: "cost_per_hour" as const,
        limitValue: 50, // $50
        windowDuration: ONE_HOUR_MS,
      },
      {
        limitType: "cost_per_day" as const,
        limitValue: 500, // $500
        windowDuration: ONE_DAY_MS,
      },
    ];

    // Insert each limit
    let inserted = 0;
    for (const limit of defaultLimits) {
      await ctx.db.insert("rateLimits", {
        scope: "platform",
        scopeId: "platform",
        limitType: limit.limitType,
        limitValue: limit.limitValue,
        currentCount: 0,
        currentCost: 0,
        windowStart: now,
        windowEnd: now + limit.windowDuration,
        lastResetAt: now,
      });
      inserted += 1;
    }

    console.log(`✅ Inserted ${inserted} default platform rate limits`);

    return {
      inserted,
      skipped: 0,
      message: `Successfully inserted ${inserted} default platform rate limits`,
    };
  },
});
