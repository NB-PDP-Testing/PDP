/**
 * Rate Limiting (Phase 6.1)
 * Prevents abuse and runaway loops by limiting AI API calls per hour/day
 */

import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { authComponent } from "../auth";

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

/**
 * Get platform-wide rate limits (US-019)
 *
 * USAGE: Platform staff only - view current platform limits in admin dashboard
 *
 * Returns all platform-wide rate limits with current usage and window info
 */
export const getPlatformRateLimits = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("rateLimits"),
      limitType: v.union(
        v.literal("messages_per_hour"),
        v.literal("messages_per_day"),
        v.literal("cost_per_hour"),
        v.literal("cost_per_day")
      ),
      limitValue: v.number(),
      currentCount: v.number(),
      currentCost: v.number(),
      windowStart: v.number(),
      windowEnd: v.number(),
      lastResetAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    // Verify current user is platform staff
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser?.isPlatformStaff) {
      throw new Error("Only platform staff can view rate limits");
    }

    // Get all platform limits
    const limits = await ctx.db
      .query("rateLimits")
      .withIndex("by_scope_type", (q) =>
        q.eq("scope", "platform").eq("scopeId", "platform")
      )
      .collect();

    return limits.map((limit) => ({
      _id: limit._id,
      limitType: limit.limitType,
      limitValue: limit.limitValue,
      currentCount: limit.currentCount,
      currentCost: limit.currentCost,
      windowStart: limit.windowStart,
      windowEnd: limit.windowEnd,
      lastResetAt: limit.lastResetAt,
    }));
  },
});

/**
 * Update platform-wide rate limit (US-019)
 *
 * USAGE: Platform staff only - update platform limit values
 *
 * Updates a rate limit's value. Current count/cost are NOT reset (they reset on window expiry).
 */
export const updatePlatformRateLimit = mutation({
  args: {
    limitId: v.id("rateLimits"),
    newLimitValue: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify current user is platform staff
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser?.isPlatformStaff) {
      throw new Error("Only platform staff can update rate limits");
    }

    // Verify the limit exists and is a platform limit
    const limit = await ctx.db.get(args.limitId);
    if (!limit) {
      throw new Error("Rate limit not found");
    }
    if (limit.scope !== "platform" || limit.scopeId !== "platform") {
      throw new Error(
        "Can only update platform-wide limits with this mutation"
      );
    }

    // Update the limit value
    await ctx.db.patch(args.limitId, {
      limitValue: args.newLimitValue,
    });

    console.log(
      `✅ Platform staff ${currentUser._id} updated ${limit.limitType} to ${args.newLimitValue}`
    );

    return null;
  },
});

/**
 * Get organization-specific rate limit overrides (US-019)
 *
 * USAGE: Platform staff only - view per-org rate limit overrides
 *
 * Returns all org-specific rate limits (overrides)
 */
export const getOrgRateLimits = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("rateLimits"),
      organizationId: v.string(),
      limitType: v.union(
        v.literal("messages_per_hour"),
        v.literal("messages_per_day"),
        v.literal("cost_per_hour"),
        v.literal("cost_per_day")
      ),
      limitValue: v.number(),
      currentCount: v.number(),
      currentCost: v.number(),
      windowStart: v.number(),
      windowEnd: v.number(),
      lastResetAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    // Verify current user is platform staff
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser?.isPlatformStaff) {
      throw new Error("Only platform staff can view rate limits");
    }

    // Get all org-specific limits
    const limits = await ctx.db
      .query("rateLimits")
      .withIndex("by_scope_type", (q) => q.eq("scope", "organization"))
      .collect();

    return limits.map((limit) => ({
      _id: limit._id,
      organizationId: limit.scopeId,
      limitType: limit.limitType,
      limitValue: limit.limitValue,
      currentCount: limit.currentCount,
      currentCost: limit.currentCost,
      windowStart: limit.windowStart,
      windowEnd: limit.windowEnd,
      lastResetAt: limit.lastResetAt,
    }));
  },
});

/**
 * Create organization-specific rate limit override (US-019)
 *
 * USAGE: Platform staff only - set per-org rate limits
 *
 * Creates a new rate limit for a specific organization
 */
export const createOrgRateLimit = mutation({
  args: {
    organizationId: v.string(),
    limitType: v.union(
      v.literal("messages_per_hour"),
      v.literal("messages_per_day"),
      v.literal("cost_per_hour"),
      v.literal("cost_per_day")
    ),
    limitValue: v.number(),
  },
  returns: v.id("rateLimits"),
  handler: async (ctx, args) => {
    // Verify current user is platform staff
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser?.isPlatformStaff) {
      throw new Error("Only platform staff can create rate limits");
    }

    // Check if org already has this limit type
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_scope_type", (q) =>
        q.eq("scope", "organization").eq("scopeId", args.organizationId)
      )
      .collect();

    const duplicate = existing.find((l) => l.limitType === args.limitType);
    if (duplicate) {
      throw new Error(
        `Organization already has a ${args.limitType} limit. Use update instead.`
      );
    }

    // Calculate window duration and end time
    const now = Date.now();
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    let windowDuration: number;
    if (
      args.limitType === "messages_per_hour" ||
      args.limitType === "cost_per_hour"
    ) {
      windowDuration = ONE_HOUR_MS;
    } else {
      windowDuration = ONE_DAY_MS;
    }

    // Create the new limit
    const limitId = await ctx.db.insert("rateLimits", {
      scope: "organization",
      scopeId: args.organizationId,
      limitType: args.limitType,
      limitValue: args.limitValue,
      currentCount: 0,
      currentCost: 0,
      windowStart: now,
      windowEnd: now + windowDuration,
      lastResetAt: now,
    });

    console.log(
      `✅ Platform staff ${currentUser._id} created ${args.limitType}=${args.limitValue} for org ${args.organizationId}`
    );

    return limitId;
  },
});

/**
 * Update organization-specific rate limit (US-019)
 *
 * USAGE: Platform staff only - update per-org rate limit values
 */
export const updateOrgRateLimit = mutation({
  args: {
    limitId: v.id("rateLimits"),
    newLimitValue: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify current user is platform staff
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser?.isPlatformStaff) {
      throw new Error("Only platform staff can update rate limits");
    }

    // Verify the limit exists and is an org limit
    const limit = await ctx.db.get(args.limitId);
    if (!limit) {
      throw new Error("Rate limit not found");
    }
    if (limit.scope !== "organization") {
      throw new Error("Can only update organization limits with this mutation");
    }

    // Update the limit value
    await ctx.db.patch(args.limitId, {
      limitValue: args.newLimitValue,
    });

    console.log(
      `✅ Platform staff ${currentUser._id} updated org ${limit.scopeId} ${limit.limitType} to ${args.newLimitValue}`
    );

    return null;
  },
});

/**
 * Delete organization-specific rate limit (US-019)
 *
 * USAGE: Platform staff only - remove per-org override
 */
export const deleteOrgRateLimit = mutation({
  args: {
    limitId: v.id("rateLimits"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify current user is platform staff
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser?.isPlatformStaff) {
      throw new Error("Only platform staff can delete rate limits");
    }

    // Verify the limit exists and is an org limit
    const limit = await ctx.db.get(args.limitId);
    if (!limit) {
      throw new Error("Rate limit not found");
    }
    if (limit.scope !== "organization") {
      throw new Error(
        "Can only delete organization limits (not platform limits)"
      );
    }

    // Delete the limit
    await ctx.db.delete(args.limitId);

    console.log(
      `✅ Platform staff ${currentUser._id} deleted org ${limit.scopeId} ${limit.limitType}`
    );

    return null;
  },
});
