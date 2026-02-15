import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Create a new sync history entry at the start of a sync
 */
export const createSyncHistoryEntry = mutation({
  args: {
    connectorId: v.id("federationConnectors"),
    organizationId: v.string(),
    syncType: v.union(
      v.literal("scheduled"),
      v.literal("manual"),
      v.literal("webhook")
    ),
    importSessionId: v.optional(v.id("importSessions")),
  },
  returns: v.id("syncHistory"),
  handler: async (ctx, args) => {
    const historyId = await ctx.db.insert("syncHistory", {
      connectorId: args.connectorId,
      organizationId: args.organizationId,
      syncType: args.syncType,
      startedAt: Date.now(),
      status: "completed", // Will be updated
      stats: {
        playersProcessed: 0,
        playersCreated: 0,
        playersUpdated: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        errors: 0,
      },
      conflictDetails: [],
      importSessionId: args.importSessionId,
    });

    console.log(
      `[Sync History] Created history entry ${historyId} for org ${args.organizationId}`
    );

    return historyId;
  },
});

/**
 * Update sync history entry with final results
 */
export const updateSyncHistoryEntry = mutation({
  args: {
    historyId: v.id("syncHistory"),
    status: v.union(v.literal("completed"), v.literal("failed")),
    stats: v.object({
      playersProcessed: v.number(),
      playersCreated: v.number(),
      playersUpdated: v.number(),
      conflictsDetected: v.number(),
      conflictsResolved: v.number(),
      errors: v.number(),
    }),
    conflictDetails: v.array(
      v.object({
        playerId: v.string(),
        playerName: v.string(),
        conflicts: v.array(
          v.object({
            field: v.string(),
            federationValue: v.optional(v.string()),
            localValue: v.optional(v.string()),
            resolvedValue: v.optional(v.string()),
            strategy: v.string(),
          })
        ),
      })
    ),
    errors: v.optional(
      v.array(
        v.object({
          playerId: v.optional(v.string()),
          playerName: v.optional(v.string()),
          error: v.string(),
          timestamp: v.number(),
        })
      )
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.historyId, {
      completedAt: Date.now(),
      status: args.status,
      stats: args.stats,
      conflictDetails: args.conflictDetails,
      errors: args.errors,
    });

    console.log(
      `[Sync History] Updated history entry ${args.historyId} - status: ${args.status}, conflicts: ${args.conflictDetails.length}`
    );
  },
});

/**
 * Get paginated sync history for an organization
 */
export const getSyncHistory = query({
  args: {
    organizationId: v.string(),
    connectorId: v.optional(v.id("federationConnectors")),
    limit: v.optional(v.number()), // Default 50
    cursor: v.optional(v.number()), // Timestamp cursor for pagination
  },
  returns: v.object({
    entries: v.array(
      v.object({
        _id: v.id("syncHistory"),
        _creationTime: v.number(),
        connectorId: v.id("federationConnectors"),
        organizationId: v.string(),
        syncType: v.union(
          v.literal("scheduled"),
          v.literal("manual"),
          v.literal("webhook")
        ),
        startedAt: v.number(),
        completedAt: v.optional(v.number()),
        status: v.union(v.literal("completed"), v.literal("failed")),
        stats: v.object({
          playersProcessed: v.number(),
          playersCreated: v.number(),
          playersUpdated: v.number(),
          conflictsDetected: v.number(),
          conflictsResolved: v.number(),
          errors: v.number(),
        }),
        conflictCount: v.number(), // Number of players with conflicts
      })
    ),
    hasMore: v.boolean(),
    nextCursor: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const cursor = args.cursor ?? Date.now() + 1000; // Start from now if no cursor

    // Query history sorted by startedAt descending (most recent first)
    const historyQuery = ctx.db
      .query("syncHistory")
      .withIndex("by_org_and_startedAt", (q) =>
        q.eq("organizationId", args.organizationId).lt("startedAt", cursor)
      )
      .order("desc");

    // Fetch limit + 1 to determine if there are more results
    const results = await historyQuery.take(limit + 1);

    // Filter by connector if specified
    let filteredResults = results;
    if (args.connectorId) {
      filteredResults = results.filter(
        (entry) => entry.connectorId === args.connectorId
      );
    }

    const hasMore = filteredResults.length > limit;
    const entries = hasMore ? filteredResults.slice(0, limit) : filteredResults;

    const nextCursor =
      hasMore && entries.length > 0 ? entries.at(-1)?.startedAt : undefined;

    // Map to response format (exclude full conflict details for list view)
    const formattedEntries = entries.map((entry) => ({
      _id: entry._id,
      _creationTime: entry._creationTime,
      connectorId: entry.connectorId,
      organizationId: entry.organizationId,
      syncType: entry.syncType,
      startedAt: entry.startedAt,
      completedAt: entry.completedAt,
      status: entry.status,
      stats: entry.stats,
      conflictCount: entry.conflictDetails.length,
    }));

    return {
      entries: formattedEntries,
      hasMore,
      nextCursor,
    };
  },
});

/**
 * Get full sync history details including all conflict information
 */
export const getSyncHistoryDetails = query({
  args: {
    historyId: v.id("syncHistory"),
  },
  returns: v.union(
    v.object({
      _id: v.id("syncHistory"),
      _creationTime: v.number(),
      connectorId: v.id("federationConnectors"),
      organizationId: v.string(),
      syncType: v.union(
        v.literal("scheduled"),
        v.literal("manual"),
        v.literal("webhook")
      ),
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      status: v.union(v.literal("completed"), v.literal("failed")),
      stats: v.object({
        playersProcessed: v.number(),
        playersCreated: v.number(),
        playersUpdated: v.number(),
        conflictsDetected: v.number(),
        conflictsResolved: v.number(),
        errors: v.number(),
      }),
      conflictDetails: v.array(
        v.object({
          playerId: v.string(),
          playerName: v.string(),
          conflicts: v.array(
            v.object({
              field: v.string(),
              federationValue: v.optional(v.string()),
              localValue: v.optional(v.string()),
              resolvedValue: v.optional(v.string()),
              strategy: v.string(),
            })
          ),
        })
      ),
      errors: v.optional(
        v.array(
          v.object({
            playerId: v.optional(v.string()),
            playerName: v.optional(v.string()),
            error: v.string(),
            timestamp: v.number(),
          })
        )
      ),
      importSessionId: v.optional(v.id("importSessions")),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const history = await ctx.db.get(args.historyId);
    if (!history) {
      return null;
    }

    return history;
  },
});

/**
 * Export sync history as JSON
 * Returns full history data for download
 */
export const exportSyncHistoryJSON = query({
  args: {
    organizationId: v.string(),
    connectorId: v.optional(v.id("federationConnectors")),
    startDate: v.optional(v.number()), // Filter by date range
    endDate: v.optional(v.number()),
  },
  returns: v.array(v.any()), // Full history entries
  handler: async (ctx, args) => {
    const historyQuery = ctx.db
      .query("syncHistory")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      );

    const results = await historyQuery.collect();

    // Filter by connector if specified
    let filteredResults = results;
    if (args.connectorId) {
      filteredResults = results.filter(
        (entry) => entry.connectorId === args.connectorId
      );
    }

    // Filter by date range if specified
    if (args.startDate || args.endDate) {
      filteredResults = filteredResults.filter((entry) => {
        const withinStart = args.startDate
          ? entry.startedAt >= args.startDate
          : true;
        const withinEnd = args.endDate ? entry.startedAt <= args.endDate : true;
        return withinStart && withinEnd;
      });
    }

    return filteredResults;
  },
});
