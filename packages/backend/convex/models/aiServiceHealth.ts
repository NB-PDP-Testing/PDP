/**
 * AI Service Health Queries and Mutations (Phase 6.2)
 *
 * Manages the aiServiceHealth singleton table for circuit breaker pattern.
 * Tracks Anthropic API health and failure counts.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";

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
