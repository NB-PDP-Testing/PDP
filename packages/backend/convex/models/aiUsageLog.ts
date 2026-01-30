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
import { components } from "../_generated/api";
import type { QueryCtx } from "../_generated/server";
import { internalMutation, query } from "../_generated/server";

/**
 * Helper: Determine if we should use daily aggregates for this query
 * Logic: Use aggregates if date range > 7 days for 10-100x speedup
 */
function shouldUseDailyAggregates(
  startDate: number | undefined,
  endDate: number | undefined
): boolean {
  if (!(startDate && endDate)) {
    return false; // No date range = use raw logs for real-time data
  }

  const rangeInDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
  return rangeInDays > 7;
}

/**
 * Helper: Get org usage from daily aggregates (Phase 6.4 - US-023)
 * Much faster than raw logs for large date ranges (10-100x speedup)
 * Trade-off: Data may be up to 24h stale (yesterday's data)
 */
async function getOrgUsageFromAggregates(
  ctx: QueryCtx,
  organizationId: string,
  startDate: number,
  endDate: number
) {
  // Convert timestamps to date strings (YYYY-MM-DD)
  const startDateStr = new Date(startDate).toISOString().split("T")[0];
  const endDateStr = new Date(endDate).toISOString().split("T")[0];

  // Fetch aggregates for this org in the date range
  const aggregates = await ctx.db
    .query("aiUsageDailyAggregates")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .collect();

  // Filter by date range
  const filteredAggregates = aggregates.filter(
    (agg) => agg.date >= startDateStr && agg.date <= endDateStr
  );

  // If no aggregates found, fall back to empty response
  // (Aggregates may not exist yet if cron hasn't run or no usage that day)
  if (filteredAggregates.length === 0) {
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

  // Aggregate the aggregates
  const totalCost = filteredAggregates.reduce(
    (sum, agg) => sum + agg.totalCost,
    0
  );
  const totalInputTokens = filteredAggregates.reduce(
    (sum, agg) => sum + agg.totalInputTokens,
    0
  );
  const totalCachedTokens = filteredAggregates.reduce(
    (sum, agg) => sum + agg.totalCachedTokens,
    0
  );
  const totalOutputTokens = filteredAggregates.reduce(
    (sum, agg) => sum + agg.totalOutputTokens,
    0
  );
  const callCount = filteredAggregates.reduce(
    (sum, agg) => sum + agg.totalCalls,
    0
  );

  // Weighted average of cache hit rates
  const totalCalls = callCount;
  const averageCacheHitRate =
    totalCalls > 0
      ? filteredAggregates.reduce(
          (sum, agg) => sum + agg.avgCacheHitRate * agg.totalCalls,
          0
        ) / totalCalls
      : 0;

  // Note: Daily aggregates don't include operation/coach/player breakdowns
  // For those, would need to query raw logs or create more detailed aggregates
  // For now, return empty arrays (dashboard can show totals without breakdowns)
  return {
    totalCost,
    totalInputTokens,
    totalCachedTokens,
    totalOutputTokens,
    averageCacheHitRate,
    callCount,
    byOperation: [],
    topCoaches: [],
    topPlayers: [],
  };
}

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
    organizationId: v.string(), // Better Auth organization ID
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
        organizationId: v.string(), // Better Auth organization ID
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

    // Build organization breakdown with real organization names
    const byOrganizationWithNames = await Promise.all(
      Array.from(orgMap.entries()).map(async ([organizationId, stats]) => {
        let organizationName = organizationId; // Fallback to ID

        try {
          // Fetch organization name using Better Auth adapter
          const org = await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: "organization",
              where: [{ field: "_id", value: organizationId }],
            }
          );
          if (org) {
            organizationName = (org as any).name || organizationId;
          }
        } catch (error) {
          console.error(`Failed to fetch org ${organizationId}:`, error);
        }

        return {
          organizationId: organizationId as any,
          organizationName,
          cost: stats.cost,
          callCount: stats.callCount,
          averageCacheHitRate:
            stats.cacheHitRates.reduce((sum, rate) => sum + rate, 0) /
            stats.cacheHitRates.length,
        };
      })
    );

    const byOrganization = byOrganizationWithNames
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
    organizationId: v.string(), // Better Auth organization ID
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
    // Performance optimization (Phase 6.4 - US-023):
    // For date ranges > 7 days, use pre-aggregated daily stats instead of raw logs
    // This provides 10-100x speedup for large date ranges at the cost of up to 24h stale data
    const useDailyAggregates = shouldUseDailyAggregates(
      args.startDate,
      args.endDate
    );

    if (useDailyAggregates && args.startDate && args.endDate) {
      // Use aggregated data for faster queries
      return getOrgUsageFromAggregates(
        ctx,
        args.organizationId,
        args.startDate,
        args.endDate
      );
    }

    // Fall back to raw logs for real-time data (< 7 days or no date range)
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

/**
 * Aggregate yesterday's AI usage into daily summary table
 * Called by cron job daily at 1 AM UTC (Phase 6.4 - US-023)
 *
 * Performance optimization: Pre-aggregating daily stats means dashboard queries
 * are O(30) instead of O(10,000) for 30-day views. Trade-off: slightly stale data
 * (up to 24h old) but 100x faster queries.
 *
 * IMPORTANT: This is an internal mutation - only callable from cron jobs
 */
export const aggregateDailyUsage = internalMutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    aggregatesCreated: v.number(),
    dateProcessed: v.string(),
  }),
  handler: async (ctx) => {
    // Calculate yesterday's date (UTC)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setUTCHours(23, 59, 59, 999);

    const yesterdayDateStr = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD
    const yesterdayStart = yesterday.getTime();
    const yesterdayEndTimestamp = yesterdayEnd.getTime();

    console.log(
      `📊 Aggregating AI usage for ${yesterdayDateStr} (${yesterdayStart} to ${yesterdayEndTimestamp})`
    );

    // Fetch all logs from yesterday using timestamp index
    const logs = await ctx.db
      .query("aiUsageLog")
      .withIndex("by_timestamp", (q) =>
        q
          .gte("timestamp", yesterdayStart)
          .lte("timestamp", yesterdayEndTimestamp)
      )
      .collect();

    console.log(`📊 Found ${logs.length} logs for ${yesterdayDateStr}`);

    // If no logs for yesterday, nothing to aggregate
    if (logs.length === 0) {
      console.log(
        `✅ No AI usage on ${yesterdayDateStr}, skipping aggregation (sparse table)`
      );
      return {
        success: true,
        aggregatesCreated: 0,
        dateProcessed: yesterdayDateStr,
      };
    }

    // Group by organization
    const orgMap = new Map<
      string,
      {
        totalCost: number;
        totalCalls: number;
        totalInputTokens: number;
        totalCachedTokens: number;
        totalOutputTokens: number;
        cacheHitRates: number[];
      }
    >();

    for (const log of logs) {
      const orgId = log.organizationId;
      const existing = orgMap.get(orgId);
      if (existing) {
        existing.totalCost += log.cost;
        existing.totalCalls += 1;
        existing.totalInputTokens += log.inputTokens;
        existing.totalCachedTokens += log.cachedTokens;
        existing.totalOutputTokens += log.outputTokens;
        existing.cacheHitRates.push(log.cacheHitRate);
      } else {
        orgMap.set(orgId, {
          totalCost: log.cost,
          totalCalls: 1,
          totalInputTokens: log.inputTokens,
          totalCachedTokens: log.cachedTokens,
          totalOutputTokens: log.outputTokens,
          cacheHitRates: [log.cacheHitRate],
        });
      }
    }

    // Insert aggregate records (idempotency: check for existing records first)
    let aggregatesCreated = 0;
    for (const [organizationId, stats] of orgMap.entries()) {
      // Check if aggregate already exists for this org/date (idempotency)
      const existing = await ctx.db
        .query("aiUsageDailyAggregates")
        .withIndex("by_org_date", (q) =>
          q.eq("organizationId", organizationId).eq("date", yesterdayDateStr)
        )
        .first();

      if (existing) {
        console.log(
          `⚠️  Aggregate already exists for org ${organizationId} on ${yesterdayDateStr}, skipping`
        );
        continue;
      }

      // Calculate average cache hit rate
      const avgCacheHitRate =
        stats.cacheHitRates.reduce((sum, rate) => sum + rate, 0) /
        stats.cacheHitRates.length;

      // Insert aggregate record
      await ctx.db.insert("aiUsageDailyAggregates", {
        date: yesterdayDateStr,
        organizationId,
        totalCost: stats.totalCost,
        totalCalls: stats.totalCalls,
        totalInputTokens: stats.totalInputTokens,
        totalCachedTokens: stats.totalCachedTokens,
        totalOutputTokens: stats.totalOutputTokens,
        avgCacheHitRate,
        createdAt: Date.now(),
      });

      aggregatesCreated += 1;
      console.log(
        `✅ Created aggregate for org ${organizationId}: ${stats.totalCalls} calls, $${stats.totalCost.toFixed(4)}`
      );
    }

    console.log(
      `✅ Aggregation complete: ${aggregatesCreated} aggregate records created for ${yesterdayDateStr}`
    );

    return {
      success: true,
      aggregatesCreated,
      dateProcessed: yesterdayDateStr,
    };
  },
});
