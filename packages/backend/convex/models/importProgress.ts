import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";

// ============================================================
// IMPORT PROGRESS TRACKING
// ============================================================
// Real-time progress updates for active imports.
// The frontend polls getProgressTracker during imports.
// The mutation calls updateProgressTracker as it progresses.
// ============================================================

/**
 * Get current progress for an import session.
 * Frontend polls this every 500ms during active import.
 */
export const getProgressTracker = query({
  args: {
    sessionId: v.id("importSessions"),
  },
  returns: v.union(
    v.object({
      stats: v.object({
        playersCreated: v.number(),
        playersReused: v.number(),
        guardiansCreated: v.number(),
        guardiansLinked: v.number(),
        enrollmentsCreated: v.number(),
        passportsCreated: v.number(),
        benchmarksApplied: v.number(),
        totalPlayers: v.number(),
      }),
      currentOperation: v.optional(v.string()),
      phase: v.string(),
      percentage: v.number(),
      errors: v.array(
        v.object({
          rowNumber: v.number(),
          playerName: v.string(),
          error: v.string(),
          timestamp: v.number(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const tracker = await ctx.db
      .query("importProgressTrackers")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!tracker) {
      return null;
    }

    return {
      stats: tracker.stats,
      currentOperation: tracker.currentOperation,
      phase: tracker.phase,
      percentage: tracker.percentage,
      errors: tracker.errors,
    };
  },
});

/**
 * Initialize progress tracker when import starts.
 * Called at the beginning of batchImportPlayersWithIdentity.
 */
export const initializeProgressTracker = internalMutation({
  args: {
    sessionId: v.id("importSessions"),
    organizationId: v.string(),
    totalPlayers: v.number(),
  },
  returns: v.id("importProgressTrackers"),
  handler: async (ctx, args) => {
    // Delete any existing tracker for this session (in case of retry)
    const existing = await ctx.db
      .query("importProgressTrackers")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    // Create new tracker
    const trackerId = await ctx.db.insert("importProgressTrackers", {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      stats: {
        playersCreated: 0,
        playersReused: 0,
        guardiansCreated: 0,
        guardiansLinked: 0,
        enrollmentsCreated: 0,
        passportsCreated: 0,
        benchmarksApplied: 0,
        totalPlayers: args.totalPlayers,
      },
      currentOperation: "Starting import...",
      phase: "preparing",
      percentage: 0,
      errors: [],
      updatedAt: Date.now(),
    });

    return trackerId;
  },
});

/**
 * Update progress tracker with current stats.
 * Called periodically during import (every 10-20 records).
 */
export const updateProgressTracker = internalMutation({
  args: {
    sessionId: v.id("importSessions"),
    stats: v.object({
      playersCreated: v.number(),
      playersReused: v.number(),
      guardiansCreated: v.number(),
      guardiansLinked: v.number(),
      enrollmentsCreated: v.number(),
      passportsCreated: v.number(),
      benchmarksApplied: v.number(),
      totalPlayers: v.number(),
    }),
    currentOperation: v.optional(v.string()),
    phase: v.string(),
    percentage: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tracker = await ctx.db
      .query("importProgressTrackers")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!tracker) {
      // Tracker was deleted or never created - ignore update
      return null;
    }

    await ctx.db.patch(tracker._id, {
      stats: args.stats,
      currentOperation: args.currentOperation,
      phase: args.phase,
      percentage: args.percentage,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Add error to progress tracker.
 * Called when an import error occurs.
 */
export const addProgressError = internalMutation({
  args: {
    sessionId: v.id("importSessions"),
    rowNumber: v.number(),
    playerName: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tracker = await ctx.db
      .query("importProgressTrackers")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!tracker) {
      return null;
    }

    const newError = {
      rowNumber: args.rowNumber,
      playerName: args.playerName,
      error: args.error,
      timestamp: Date.now(),
    };

    await ctx.db.patch(tracker._id, {
      errors: [...tracker.errors, newError],
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Clean up progress tracker after import completes or fails.
 * Called at the end of batchImportPlayersWithIdentity.
 */
export const cleanupProgressTracker = mutation({
  args: {
    sessionId: v.id("importSessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tracker = await ctx.db
      .query("importProgressTrackers")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (tracker) {
      await ctx.db.delete(tracker._id);
    }

    return null;
  },
});
