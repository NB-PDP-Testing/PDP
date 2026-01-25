/**
 * Rate Limiting (Phase 6.1)
 * Prevents abuse and runaway loops by limiting AI API calls per hour/day
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Check rate limits before making AI calls
 *
 * USAGE: Call this BEFORE budget check in processVoiceNoteInsight action
 *
 * Checks both platform-wide and org-specific limits:
 * - Platform limits (scope='platform', scopeId='platform')
 * - Organization limits (scope='organization', scopeId=organizationId)
 *
 * Returns:
 * - allowed: true if within limits, false if rate limit exceeded
 * - reason: why check passed/failed
 * - resetAt: when the rate limit window resets
 * - remainingMessages: how many messages left in window (if applicable)
 */
export const checkRateLimit = internalQuery({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    allowed: v.boolean(),
    reason: v.optional(v.string()),
    resetAt: v.optional(v.number()),
    remainingMessages: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const { organizationId } = args;
    const now = Date.now();

    // Check platform-wide limits first
    const platformLimits = await ctx.db
      .query("rateLimits")
      .withIndex("by_scope_type", (q) =>
        q.eq("scope", "platform").eq("scopeId", "platform")
      )
      .collect();

    for (const limit of platformLimits) {
      // Skip expired windows
      if (limit.windowEnd <= now) {
        continue;
      }

      // Check message count limits
      if (
        (limit.limitType === "messages_per_hour" ||
          limit.limitType === "messages_per_day") &&
        limit.currentCount >= limit.limitValue
      ) {
        return {
          allowed: false,
          reason: `platform_${limit.limitType}_exceeded`,
          resetAt: limit.windowEnd,
          remainingMessages: 0,
        };
      }

      // Check cost limits
      if (
        (limit.limitType === "cost_per_hour" ||
          limit.limitType === "cost_per_day") &&
        limit.currentCost >= limit.limitValue
      ) {
        return {
          allowed: false,
          reason: `platform_${limit.limitType}_exceeded`,
          resetAt: limit.windowEnd,
        };
      }
    }

    // Check org-specific limits
    const orgLimits = await ctx.db
      .query("rateLimits")
      .withIndex("by_scope_type", (q) =>
        q.eq("scope", "organization").eq("scopeId", organizationId)
      )
      .collect();

    for (const limit of orgLimits) {
      // Skip expired windows
      if (limit.windowEnd <= now) {
        continue;
      }

      // Check message count limits
      if (
        (limit.limitType === "messages_per_hour" ||
          limit.limitType === "messages_per_day") &&
        limit.currentCount >= limit.limitValue
      ) {
        return {
          allowed: false,
          reason: `org_${limit.limitType}_exceeded`,
          resetAt: limit.windowEnd,
          remainingMessages: 0,
        };
      }

      // Check cost limits
      if (
        (limit.limitType === "cost_per_hour" ||
          limit.limitType === "cost_per_day") &&
        limit.currentCost >= limit.limitValue
      ) {
        return {
          allowed: false,
          reason: `org_${limit.limitType}_exceeded`,
          resetAt: limit.windowEnd,
        };
      }
    }

    // Calculate remaining messages (from most restrictive active limit)
    let remainingMessages: number | undefined;
    for (const limit of [...platformLimits, ...orgLimits]) {
      if (limit.windowEnd > now && limit.limitType.includes("messages_per_")) {
        const remaining = limit.limitValue - limit.currentCount;
        if (remainingMessages === undefined || remaining < remainingMessages) {
          remainingMessages = remaining;
        }
      }
    }

    // All limits OK
    return {
      allowed: true,
      reason: "within_limits",
      remainingMessages,
    };
  },
});

/**
 * Increment rate limit counters after successful AI call
 *
 * USAGE: Call this AFTER AI calls complete successfully
 *
 * Updates both platform and org-specific counters
 */
export const incrementRateLimit = internalMutation({
  args: {
    organizationId: v.string(),
    cost: v.number(), // Cost in USD
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organizationId, cost } = args;
    const now = Date.now();

    // Update platform limits
    const platformLimits = await ctx.db
      .query("rateLimits")
      .withIndex("by_scope_type", (q) =>
        q.eq("scope", "platform").eq("scopeId", "platform")
      )
      .collect();

    for (const limit of platformLimits) {
      // Skip expired windows
      if (limit.windowEnd <= now) {
        continue;
      }

      // Increment counters
      await ctx.db.patch(limit._id, {
        currentCount: limit.currentCount + 1,
        currentCost: limit.currentCost + cost,
      });
    }

    // Update org-specific limits
    const orgLimits = await ctx.db
      .query("rateLimits")
      .withIndex("by_scope_type", (q) =>
        q.eq("scope", "organization").eq("scopeId", organizationId)
      )
      .collect();

    for (const limit of orgLimits) {
      // Skip expired windows
      if (limit.windowEnd <= now) {
        continue;
      }

      // Increment counters
      await ctx.db.patch(limit._id, {
        currentCount: limit.currentCount + 1,
        currentCost: limit.currentCost + cost,
      });
    }

    return null;
  },
});

/**
 * Reset expired rate limit windows (US-010)
 *
 * USAGE: Called by cron job every hour
 *
 * For each rate limit where windowEnd <= now:
 * - Reset currentCount and currentCost to 0
 * - Set new windowStart and windowEnd based on limit type
 *   - hourly limits: windowEnd = now + 1 hour
 *   - daily limits: windowEnd = now + 24 hours
 */
export const resetRateLimitWindows = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    // Query all rate limits
    const limits = await ctx.db.query("rateLimits").collect();

    let resetCount = 0;

    for (const limit of limits) {
      // Reset if window has expired
      if (limit.windowEnd <= now) {
        // Calculate new window duration based on limit type
        let windowDuration: number;
        if (
          limit.limitType === "messages_per_hour" ||
          limit.limitType === "cost_per_hour"
        ) {
          windowDuration = ONE_HOUR_MS;
        } else {
          // messages_per_day or cost_per_day
          windowDuration = ONE_DAY_MS;
        }

        // Reset counters and set new window
        await ctx.db.patch(limit._id, {
          currentCount: 0,
          currentCost: 0,
          windowStart: now,
          windowEnd: now + windowDuration,
          lastResetAt: now,
        });

        resetCount += 1;
      }
    }

    if (resetCount > 0) {
      console.log(`✅ Reset ${resetCount} rate limit windows`);
    }

    return null;
  },
});
