/**
 * AI Service Health Queries and Mutations (Phase 6.2)
 *
 * Manages the aiServiceHealth singleton table for circuit breaker pattern.
 * Tracks Anthropic API health and failure counts.
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
 * Get detailed AI service health status (PLATFORM STAFF ONLY)
 * Returns full health record with all metrics for admin dashboard
 * Returns null if no health record exists (healthy by default)
 */
export const getPlatformServiceHealth = query({
  args: {},
  returns: v.union(
    v.object({
      status: v.union(
        v.literal("healthy"),
        v.literal("degraded"),
        v.literal("down")
      ),
      circuitBreakerState: v.union(
        v.literal("closed"),
        v.literal("open"),
        v.literal("half_open")
      ),
      lastSuccessAt: v.number(),
      lastFailureAt: v.number(),
      recentFailureCount: v.number(),
      failureWindow: v.number(),
      lastCheckedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Check authorization
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser?.isPlatformStaff) {
      throw new Error("Unauthorized: Platform staff access required");
    }

    // Get the singleton health record
    const health = await ctx.db.query("aiServiceHealth").first();

    if (!health) {
      return null; // No health record = assume healthy
    }

    return {
      status: health.status,
      circuitBreakerState: health.circuitBreakerState,
      lastSuccessAt: health.lastSuccessAt,
      lastFailureAt: health.lastFailureAt,
      recentFailureCount: health.recentFailureCount,
      failureWindow: health.failureWindow,
      lastCheckedAt: health.lastCheckedAt,
    };
  },
});

/**
 * Force reset the circuit breaker to closed state (PLATFORM STAFF ONLY)
 * Used when admin manually verifies service is back online
 */
export const forceResetCircuitBreaker = mutation({
  args: {},
  returns: v.union(
    v.object({
      success: v.boolean(),
      message: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Check authorization
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser?.isPlatformStaff) {
      throw new Error("Unauthorized: Platform staff access required");
    }

    // Get the singleton health record
    const health = await ctx.db.query("aiServiceHealth").first();

    if (!health) {
      return {
        success: false,
        message: "No health record found - nothing to reset",
      };
    }

    // Reset to healthy state with closed circuit
    await ctx.db.patch(health._id, {
      status: "healthy",
      circuitBreakerState: "closed",
      recentFailureCount: 0,
      lastCheckedAt: Date.now(),
    });

    return {
      success: true,
      message: "Circuit breaker reset to closed state",
    };
  },
});

/**
 * Get the current AI service health status (PUBLIC)
 * Returns simplified status for UI display
 * Returns null if no health record exists (healthy by default)
 */
export const getAIServiceHealth = query({
  args: {},
  returns: v.union(
    v.object({
      status: v.union(
        v.literal("healthy"),
        v.literal("degraded"),
        v.literal("down")
      ),
      circuitBreakerState: v.union(
        v.literal("closed"),
        v.literal("open"),
        v.literal("half_open")
      ),
      lastCheckedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Since this is a singleton, we just get the first record
    const health = await ctx.db.query("aiServiceHealth").first();

    if (!health) {
      return null; // No health record = assume healthy
    }

    return {
      status: health.status,
      circuitBreakerState: health.circuitBreakerState,
      lastCheckedAt: health.lastCheckedAt,
    };
  },
});

/**
 * Get the current AI service health status (INTERNAL)
 * Returns full record with all fields
 * Returns null if no health record exists (first-time setup)
 */
export const getServiceHealth = internalQuery({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("aiServiceHealth"),
      _creationTime: v.number(),
      service: v.literal("anthropic"),
      status: v.union(
        v.literal("healthy"),
        v.literal("degraded"),
        v.literal("down")
      ),
      lastSuccessAt: v.number(),
      lastFailureAt: v.number(),
      recentFailureCount: v.number(),
      failureWindow: v.number(),
      circuitBreakerState: v.union(
        v.literal("closed"),
        v.literal("open"),
        v.literal("half_open")
      ),
      lastCheckedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Since this is a singleton, we just get the first record
    const health = await ctx.db.query("aiServiceHealth").first();
    return health;
  },
});

/**
 * Initialize or update the AI service health record
 * Used to record API call results and update circuit breaker state
 */
export const updateServiceHealth = internalMutation({
  args: {
    service: v.literal("anthropic"),
    status: v.union(
      v.literal("healthy"),
      v.literal("degraded"),
      v.literal("down")
    ),
    lastSuccessAt: v.number(),
    lastFailureAt: v.number(),
    recentFailureCount: v.number(),
    failureWindow: v.number(),
    circuitBreakerState: v.union(
      v.literal("closed"),
      v.literal("open"),
      v.literal("half_open")
    ),
    lastCheckedAt: v.number(),
  },
  returns: v.id("aiServiceHealth"),
  handler: async (ctx, args) => {
    // Check if a health record exists (singleton)
    const existing = await ctx.db.query("aiServiceHealth").first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        status: args.status,
        lastSuccessAt: args.lastSuccessAt,
        lastFailureAt: args.lastFailureAt,
        recentFailureCount: args.recentFailureCount,
        failureWindow: args.failureWindow,
        circuitBreakerState: args.circuitBreakerState,
        lastCheckedAt: args.lastCheckedAt,
      });
      return existing._id;
    }

    // Insert new record (first-time initialization)
    const id = await ctx.db.insert("aiServiceHealth", {
      service: args.service,
      status: args.status,
      lastSuccessAt: args.lastSuccessAt,
      lastFailureAt: args.lastFailureAt,
      recentFailureCount: args.recentFailureCount,
      failureWindow: args.failureWindow,
      circuitBreakerState: args.circuitBreakerState,
      lastCheckedAt: args.lastCheckedAt,
    });

    return id;
  },
});
