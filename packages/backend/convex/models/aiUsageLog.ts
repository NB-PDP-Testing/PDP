/**
 * AI Usage Logging (Phase 5.3 - Cost Optimization)
 *
 * Tracks every AI API call for:
 * - Cost visibility and analytics
 * - Chargeback to organizations
 * - Identifying heavy users
 * - Cache effectiveness monitoring
 */

import { v } from "convex/values";
import { internalMutation, query } from "../_generated/server";

/**
 * Log AI API usage with token counts and costs
 * Called by actions after successful AI API calls
 *
 * IMPORTANT: This is an internal mutation - only callable from actions
 * Error handling: If logging fails, the action should log to console but not fail
 */
export const logUsage = internalMutation({
  args: {
    timestamp: v.number(),
    organizationId: v.id("organization"),
    coachId: v.string(),
    playerId: v.optional(v.id("orgPlayerEnrollments")),
    operation: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    cachedTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(),
    cacheHitRate: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    logId: v.optional(v.id("aiUsageLog")),
  }),
  handler: async (ctx, args) => {
    try {
      const logId = await ctx.db.insert("aiUsageLog", {
        timestamp: args.timestamp,
        organizationId: args.organizationId,
        coachId: args.coachId,
        playerId: args.playerId,
        operation: args.operation,
        model: args.model,
        inputTokens: args.inputTokens,
        cachedTokens: args.cachedTokens,
        outputTokens: args.outputTokens,
        cost: args.cost,
        cacheHitRate: args.cacheHitRate,
      });

      return {
        success: true,
        logId,
      };
    } catch (error) {
      console.error("❌ Failed to log AI usage:", error);
      return {
        success: false,
      };
    }
  },
});

/**
 * Get platform-wide AI usage analytics
 * Returns aggregated stats across ALL organizations
 *
 * Used by platform admins to:
 * - Monitor total platform costs
 * - Identify high-usage organizations
 * - Track overall cache effectiveness
 * - Support platform-level analytics
 */
export const getPlatformUsage = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.object({
    // Overall platform statistics
    totalCost: v.number(),
    totalInputTokens: v.number(),
    totalCachedTokens: v.number(),
    totalOutputTokens: v.number(),
    averageCacheHitRate: v.number(),
    callCount: v.number(),

    // Breakdown by organization (top 10)
    byOrganization: v.array(
      v.object({
        organizationId: v.id("organization"),
        organizationName: v.string(),
        cost: v.number(),
        callCount: v.number(),
        averageCacheHitRate: v.number(),
      })
    ),

    // Daily cost breakdown (for chart)
    dailyCosts: v.array(
      v.object({
        date: v.string(), // ISO date string (YYYY-MM-DD)
        cost: v.number(),
        callCount: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Fetch ALL logs across all organizations
    const logs = await ctx.db.query("aiUsageLog").collect();

    // Filter by date range if provided
    const filteredLogs = logs.filter((log) => {
      if (args.startDate && log.timestamp < args.startDate) {
        return false;
      }
      if (args.endDate && log.timestamp > args.endDate) {
        return false;
      }
      return true;
    });

    // If no data, return empty structure
    if (filteredLogs.length === 0) {
      return {
        totalCost: 0,
        totalInputTokens: 0,
        totalCachedTokens: 0,
        totalOutputTokens: 0,
        averageCacheHitRate: 0,
        callCount: 0,
        byOrganization: [],
        dailyCosts: [],
      };
    }

    // Calculate overall statistics
    const totalCost = filteredLogs.reduce((sum, log) => sum + log.cost, 0);
    const totalInputTokens = filteredLogs.reduce(
      (sum, log) => sum + log.inputTokens,
      0
    );
    const totalCachedTokens = filteredLogs.reduce(
      (sum, log) => sum + log.cachedTokens,
      0
    );
    const totalOutputTokens = filteredLogs.reduce(
      (sum, log) => sum + log.outputTokens,
      0
    );
    const averageCacheHitRate =
      filteredLogs.reduce((sum, log) => sum + log.cacheHitRate, 0) /
      filteredLogs.length;
    const callCount = filteredLogs.length;

    // Group by organization
    const orgMap = new Map<
      string,
      {
        cost: number;
        callCount: number;
        cacheHitRates: number[];
      }
    >();

    for (const log of filteredLogs) {
      const orgId = log.organizationId;
      const existing = orgMap.get(orgId);
      if (existing) {
        existing.cost += log.cost;
        existing.callCount += 1;
        existing.cacheHitRates.push(log.cacheHitRate);
      } else {
        orgMap.set(orgId, {
          cost: log.cost,
          callCount: 1,
          cacheHitRates: [log.cacheHitRate],
        });
      }
    }

    // Build organization breakdown
    // Note: Better Auth organizations are in external component tables
    // For MVP, use organization ID as display name (platform admins will recognize)
    // TODO: Integrate with Better Auth adapter to fetch real organization names
    const byOrganization = Array.from(orgMap.entries())
      .map(([organizationId, stats]) => ({
        organizationId: organizationId as any, // Type assertion for Convex ID
        organizationName: organizationId, // Use ID for now
        cost: stats.cost,
        callCount: stats.callCount,
        averageCacheHitRate:
          stats.cacheHitRates.reduce((sum, rate) => sum + rate, 0) /
          stats.cacheHitRates.length,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10); // Top 10 organizations

    // Group by date for daily costs chart
    const dateMap = new Map<string, { cost: number; callCount: number }>();
    for (const log of filteredLogs) {
      const date = new Date(log.timestamp).toISOString().split("T")[0]; // YYYY-MM-DD
      const existing = dateMap.get(date);
      if (existing) {
        existing.cost += log.cost;
        existing.callCount += 1;
      } else {
        dateMap.set(date, {
          cost: log.cost,
          callCount: 1,
        });
      }
    }

    const dailyCosts = Array.from(dateMap.entries())
      .map(([date, stats]) => ({
        date,
        cost: stats.cost,
        callCount: stats.callCount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)); // Sort chronologically

    return {
      totalCost,
      totalInputTokens,
      totalCachedTokens,
      totalOutputTokens,
      averageCacheHitRate,
      callCount,
      byOrganization,
      dailyCosts,
    };
  },
});

/**
 * Get AI usage analytics for an organization
 * Returns aggregated stats, operation breakdown, and top users
 *
 * Used by org admins to:
 * - Monitor AI costs
 * - Identify heavy users
 * - Track cache effectiveness
 * - Support chargeback/billing
 */
export const getOrgUsage = query({
  args: {
    organizationId: v.id("organization"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.object({
    // Overall statistics
    totalCost: v.number(),
    totalInputTokens: v.number(),
    totalCachedTokens: v.number(),
    totalOutputTokens: v.number(),
    averageCacheHitRate: v.number(),
    callCount: v.number(),

    // Breakdown by operation type
    byOperation: v.array(
      v.object({
        operation: v.string(),
        cost: v.number(),
        callCount: v.number(),
        inputTokens: v.number(),
        cachedTokens: v.number(),
        outputTokens: v.number(),
        averageCacheHitRate: v.number(),
      })
    ),

    // Top 5 coaches by usage
    topCoaches: v.array(
      v.object({
        coachId: v.string(),
        cost: v.number(),
        callCount: v.number(),
      })
    ),

    // Top 5 players by usage (if applicable)
    topPlayers: v.array(
      v.object({
        playerId: v.id("orgPlayerEnrollments"),
        cost: v.number(),
        callCount: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Fetch all logs for organization using index
    const logs = await ctx.db
      .query("aiUsageLog")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter by date range if provided
    const filteredLogs = logs.filter((log) => {
      if (args.startDate && log.timestamp < args.startDate) {
        return false;
      }
      if (args.endDate && log.timestamp > args.endDate) {
        return false;
      }
      return true;
    });

    // If no data, return empty structure
    if (filteredLogs.length === 0) {
      return {
        totalCost: 0,
        totalInputTokens: 0,
        totalCachedTokens: 0,
        totalOutputTokens: 0,
        averageCacheHitRate: 0,
        callCount: 0,
        byOperation: [],
        topCoaches: [],
        topPlayers: [],
      };
    }

    // Calculate overall statistics
    const totalCost = filteredLogs.reduce((sum, log) => sum + log.cost, 0);
    const totalInputTokens = filteredLogs.reduce(
      (sum, log) => sum + log.inputTokens,
      0
    );
    const totalCachedTokens = filteredLogs.reduce(
      (sum, log) => sum + log.cachedTokens,
      0
    );
    const totalOutputTokens = filteredLogs.reduce(
      (sum, log) => sum + log.outputTokens,
      0
    );
    const averageCacheHitRate =
      filteredLogs.reduce((sum, log) => sum + log.cacheHitRate, 0) /
      filteredLogs.length;
    const callCount = filteredLogs.length;

    // Group by operation type
    const operationMap = new Map<
      string,
      {
        cost: number;
        callCount: number;
        inputTokens: number;
        cachedTokens: number;
        outputTokens: number;
        cacheHitRates: number[];
      }
    >();

    for (const log of filteredLogs) {
      const existing = operationMap.get(log.operation);
      if (existing) {
        existing.cost += log.cost;
        existing.callCount += 1;
        existing.inputTokens += log.inputTokens;
        existing.cachedTokens += log.cachedTokens;
        existing.outputTokens += log.outputTokens;
        existing.cacheHitRates.push(log.cacheHitRate);
      } else {
        operationMap.set(log.operation, {
          cost: log.cost,
          callCount: 1,
          inputTokens: log.inputTokens,
          cachedTokens: log.cachedTokens,
          outputTokens: log.outputTokens,
          cacheHitRates: [log.cacheHitRate],
        });
      }
    }

    const byOperation = Array.from(operationMap.entries()).map(
      ([operation, stats]) => ({
        operation,
        cost: stats.cost,
        callCount: stats.callCount,
        inputTokens: stats.inputTokens,
        cachedTokens: stats.cachedTokens,
        outputTokens: stats.outputTokens,
        averageCacheHitRate:
          stats.cacheHitRates.reduce((sum, rate) => sum + rate, 0) /
          stats.cacheHitRates.length,
      })
    );

    // Group by coach
    const coachMap = new Map<string, { cost: number; callCount: number }>();
    for (const log of filteredLogs) {
      const existing = coachMap.get(log.coachId);
      if (existing) {
        existing.cost += log.cost;
        existing.callCount += 1;
      } else {
        coachMap.set(log.coachId, {
          cost: log.cost,
          callCount: 1,
        });
      }
    }

    const topCoaches = Array.from(coachMap.entries())
      .map(([coachId, stats]) => ({
        coachId,
        cost: stats.cost,
        callCount: stats.callCount,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    // Group by player (only where playerId is present)
    const playerMap = new Map<string, { cost: number; callCount: number }>();
    for (const log of filteredLogs) {
      if (log.playerId) {
        const existing = playerMap.get(log.playerId);
        if (existing) {
          existing.cost += log.cost;
          existing.callCount += 1;
        } else {
          playerMap.set(log.playerId, {
            cost: log.cost,
            callCount: 1,
          });
        }
      }
    }

    const topPlayers = Array.from(playerMap.entries())
      .map(([playerId, stats]) => ({
        playerId: playerId as any, // Type assertion for Convex ID
        cost: stats.cost,
        callCount: stats.callCount,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    return {
      totalCost,
      totalInputTokens,
      totalCachedTokens,
      totalOutputTokens,
      averageCacheHitRate,
      callCount,
      byOperation,
      topCoaches,
      topPlayers,
    };
  },
});
