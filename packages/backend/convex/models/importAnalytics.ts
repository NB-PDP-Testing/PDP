/**
 * Import Analytics Queries
 *
 * Platform staff analytics for monitoring import performance, success rates,
 * and error patterns across all organizations.
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

// ============================================================
// Platform-Wide Analytics (Platform Staff Only)
// ============================================================

export const getPlatformImportAnalytics = query({
  args: {
    timeRange: v.union(
      v.literal("7days"),
      v.literal("30days"),
      v.literal("90days"),
      v.literal("all")
    ),
  },
  returns: v.object({
    totalImports: v.number(),
    successRate: v.number(), // Percentage 0-100
    averagePlayersPerImport: v.number(),
    totalPlayersImported: v.number(),
    commonErrors: v.array(
      v.object({
        errorMessage: v.string(),
        count: v.number(),
        percentage: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const { timeRange } = args;

    // Check if user is platform staff
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user from Better Auth
    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: identity.subject, operator: "eq" }],
    });

    if (!user?.isPlatformStaff) {
      throw new Error("Platform staff access required");
    }

    // Calculate date cutoff based on time range
    const now = Date.now();

    // Fetch sessions with index-based filtering based on time range
    const sessions =
      timeRange === "all"
        ? await ctx.db
            .query("importSessions")
            .withIndex("by_startedAt")
            .collect()
        : await (async () => {
            // Calculate cutoff and use index-based filtering
            const cutoffDate =
              timeRange === "7days"
                ? now - 7 * 24 * 60 * 60 * 1000
                : timeRange === "30days"
                  ? now - 30 * 24 * 60 * 60 * 1000
                  : now - 90 * 24 * 60 * 60 * 1000; // 90days

            // Use index-based filtering with .gte() for date range
            return await ctx.db
              .query("importSessions")
              .withIndex("by_startedAt", (q) => q.gte("startedAt", cutoffDate))
              .collect();
          })();

    // Calculate metrics
    const totalImports = sessions.length;
    const successfulImports = sessions.filter(
      (s) => s.status === "completed" && s.errors.length === 0
    ).length;
    const successRate =
      totalImports > 0 ? (successfulImports / totalImports) * 100 : 0;

    let totalPlayers = 0;
    const errorCounts = new Map<string, number>();

    for (const session of sessions) {
      totalPlayers += session.stats.playersCreated || 0;

      // Aggregate errors (errors are objects with 'error' field containing message)
      for (const errorObj of session.errors) {
        const errorMessage = errorObj.error;
        const count = errorCounts.get(errorMessage) || 0;
        errorCounts.set(errorMessage, count + 1);
      }
    }

    const averagePlayersPerImport =
      totalImports > 0 ? totalPlayers / totalImports : 0;

    // Get top 10 most common errors
    const commonErrors = Array.from(errorCounts.entries())
      .map(([errorMessage, count]) => ({
        errorMessage,
        count,
        percentage: sessions.length > 0 ? (count / sessions.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalImports,
      successRate,
      averagePlayersPerImport,
      totalPlayersImported: totalPlayers,
      commonErrors,
    };
  },
});

// ============================================================
// Organization-Level Import History (Org Admins + Platform Staff)
// ============================================================

export const getOrgImportHistory = query({
  args: {
    organizationId: v.string(), // Better Auth stores org IDs as strings, not Convex IDs
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  returns: v.object({
    imports: v.array(
      v.object({
        _id: v.id("importSessions"),
        _creationTime: v.number(),
        status: v.string(),
        templateUsed: v.union(v.string(), v.null()),
        playersImported: v.number(),
        guardiansCreated: v.number(),
        errors: v.array(v.string()),
        importedBy: v.union(
          v.object({
            _id: v.string(),
            name: v.union(v.string(), v.null()),
            email: v.string(),
          }),
          v.null()
        ),
      })
    ),
    totalCount: v.number(),
    successCount: v.number(),
    failureCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const { organizationId, limit = 20, offset = 0 } = args;

    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user
    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: identity.subject, operator: "eq" }],
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user has access (platform staff OR member of this org)
    if (!user.isPlatformStaff) {
      const membership = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "member",
          where: [{ field: "userId", value: user._id, operator: "eq" }],
        }
      );

      if (!membership || membership.organizationId !== organizationId) {
        throw new Error("Access denied");
      }
    }

    // Fetch import sessions for this organization
    const allSessions = await ctx.db
      .query("importSessions")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .collect();

    const totalCount = allSessions.length;
    const successCount = allSessions.filter((s) => {
      const unresolvedErrors = s.errors.filter((err) => !err.resolved);
      return s.status === "completed" && unresolvedErrors.length === 0;
    }).length;
    const failureCount = allSessions.filter((s) => {
      const unresolvedErrors = s.errors.filter((err) => !err.resolved);
      return s.status === "failed" || unresolvedErrors.length > 0;
    }).length;

    // Paginate
    const paginatedSessions = allSessions.slice(offset, offset + limit);

    // Batch fetch user data for initiatedBy field
    // Note: Better Auth adapter doesn't support batch queries, so we use Promise.all
    // This is acceptable here because:
    // 1. Limited to paginated results (typically max 20 users)
    // 2. Deduped to unique user IDs only
    // 3. Platform staff analytics query (low frequency)
    const userIds = [
      ...new Set(
        paginatedSessions
          .map((s) => s.initiatedBy)
          .filter((id): id is string => !!id)
      ),
    ];

    // Parallel fetch all unique users (N queries, but N is small due to pagination)
    const users = await Promise.all(
      userIds.map(async (userId) => {
        const userData = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [{ field: "_id", value: userId, operator: "eq" }],
          }
        );
        return userData;
      })
    );

    const userMap = new Map();
    for (const userData of users) {
      if (userData) {
        userMap.set(userData._id, userData);
      }
    }

    // Map sessions with user data
    const imports = paginatedSessions.map((session) => {
      // Only include unresolved errors for status determination
      const unresolvedErrors = session.errors.filter((err) => !err.resolved);

      return {
        _id: session._id,
        _creationTime: session._creationTime,
        status: session.status,
        templateUsed: session.templateId ? String(session.templateId) : null,
        playersImported: session.stats.playersCreated || 0,
        guardiansCreated: session.stats.guardiansCreated || 0,
        errors: unresolvedErrors.map((err) => err.error), // Only unresolved errors
        importedBy: session.initiatedBy
          ? (() => {
              const userData = userMap.get(session.initiatedBy);
              return userData
                ? {
                    _id: userData._id,
                    name: userData.name || null,
                    email: userData.email,
                  }
                : null;
            })()
          : null,
      };
    });

    return {
      imports,
      totalCount,
      successCount,
      failureCount,
    };
  },
});

// ============================================================
// Common Errors (Platform Staff Only)
// ============================================================

export const getCommonErrors = query({
  args: {},
  returns: v.object({
    errors: v.array(
      v.object({
        errorMessage: v.string(),
        occurrences: v.number(),
        affectedOrgs: v.number(),
        percentage: v.number(),
      })
    ),
    totalErrors: v.number(),
  }),
  handler: async (ctx) => {
    // Check if user is platform staff
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: identity.subject, operator: "eq" }],
    });

    if (!user?.isPlatformStaff) {
      throw new Error("Platform staff access required");
    }

    // Fetch all import sessions using index for efficient scanning
    const allSessions = await ctx.db
      .query("importSessions")
      .withIndex("by_startedAt")
      .collect();

    // Aggregate errors with org tracking
    const errorData = new Map<string, { count: number; orgIds: Set<string> }>();

    let totalErrorCount = 0;

    for (const session of allSessions) {
      for (const errorObj of session.errors) {
        totalErrorCount += 1;
        const errorMessage = errorObj.error;
        const existing = errorData.get(errorMessage);
        if (existing) {
          existing.count += 1;
          existing.orgIds.add(session.organizationId);
        } else {
          errorData.set(errorMessage, {
            count: 1,
            orgIds: new Set([session.organizationId]),
          });
        }
      }
    }

    // Convert to array and sort by occurrences
    const errors = Array.from(errorData.entries())
      .map(([errorMessage, data]) => ({
        errorMessage,
        occurrences: data.count,
        affectedOrgs: data.orgIds.size,
        percentage:
          totalErrorCount > 0 ? (data.count / totalErrorCount) * 100 : 0,
      }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 50); // Top 50 errors

    return {
      errors,
      totalErrors: totalErrorCount,
    };
  },
});
