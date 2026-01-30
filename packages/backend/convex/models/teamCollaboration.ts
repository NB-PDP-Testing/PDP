import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";

// ============================================================
// TEAM COLLABORATION QUERIES & MUTATIONS
// Phase 9 Week 1 - Collaboration Foundations
// ============================================================

/**
 * Get team presence for real-time "who's online" indicators
 * Shows coaches currently viewing the team hub
 */
export const getTeamPresence = query({
  args: {
    teamId: v.id("team"),
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      userId: v.string(),
      userName: v.string(),
      userAvatar: v.optional(v.string()),
      status: v.union(
        v.literal("active"),
        v.literal("idle"),
        v.literal("away")
      ),
      currentView: v.optional(v.string()),
      lastActive: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;
    const FIFTEEN_MINUTES = 15 * 60 * 1000;

    // Get all presence records for this team
    const presenceRecords = await ctx.db
      .query("teamHubPresence")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Filter out stale records (>15 minutes old) and enrich with user data
    const activePresence = [];

    for (const record of presenceRecords) {
      const timeSinceActive = now - record.lastActive;

      // Skip users who haven't been active in 15+ minutes
      if (timeSinceActive >= FIFTEEN_MINUTES) {
        continue;
      }

      // Use Better Auth adapter to get user details
      const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "_id", value: record.userId, operator: "eq" }],
      });

      if (!user) {
        continue;
      }

      // Calculate status based on time since last activity
      let status: "active" | "idle" | "away";
      if (timeSinceActive < FIVE_MINUTES) {
        status = "active";
      } else if (timeSinceActive < FIFTEEN_MINUTES) {
        status = "idle";
      } else {
        status = "away";
      }

      activePresence.push({
        userId: record.userId,
        userName:
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          "Unknown User",
        userAvatar: user.image || undefined,
        status,
        currentView: record.currentView,
        lastActive: record.lastActive,
      });
    }

    return activePresence;
  },
});

/**
 * Update presence when user is active on team hub
 * Auto-calculates status based on lastActive timestamp
 */
export const updatePresence = mutation({
  args: {
    userId: v.string(),
    organizationId: v.string(),
    teamId: v.id("team"),
    currentView: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if presence record exists for this user/team
    const existing = await ctx.db
      .query("teamHubPresence")
      .withIndex("by_user_and_team", (q) =>
        q.eq("userId", args.userId).eq("teamId", args.teamId)
      )
      .first();

    if (existing) {
      // Update existing presence
      await ctx.db.patch(existing._id, {
        currentView: args.currentView,
        lastActive: now,
      });
    } else {
      // Create new presence record
      await ctx.db.insert("teamHubPresence", {
        userId: args.userId,
        organizationId: args.organizationId,
        teamId: args.teamId,
        currentView: args.currentView,
        lastActive: now,
      });
    }

    return null;
  },
});

/**
 * Get comments for a voice note insight
 * Returns comments in chronological order (oldest first)
 */
export const getInsightComments = query({
  args: {
    insightId: v.id("voiceNoteInsights"),
  },
  returns: v.array(
    v.object({
      _id: v.id("insightComments"),
      content: v.string(),
      userId: v.string(),
      userName: v.string(),
      userAvatar: v.optional(v.string()),
      priority: v.union(
        v.literal("critical"),
        v.literal("important"),
        v.literal("normal")
      ),
      parentCommentId: v.optional(v.id("insightComments")),
      _creationTime: v.number(),
    })
  ),
  handler: (_ctx, _args) => {
    // TODO: Implement in US-P9-005
    return [];
  },
});

/**
 * Add a comment to a voice note insight
 * Supports threading via parentCommentId
 * Auto-detects priority from content keywords
 */
export const addComment = mutation({
  args: {
    insightId: v.id("voiceNoteInsights"),
    content: v.string(),
    parentCommentId: v.optional(v.id("insightComments")),
  },
  returns: v.id("insightComments"),
  handler: (_ctx, _args) => {
    // TODO: Implement in US-P9-005
    throw new Error("Not implemented yet");
  },
});

/**
 * Get reactions for a voice note insight
 * Aggregates like, helpful, flag counts
 */
export const getReactions = query({
  args: {
    insightId: v.id("voiceNoteInsights"),
  },
  returns: v.object({
    like: v.number(),
    helpful: v.number(),
    flag: v.number(),
    userReactions: v.array(
      v.object({
        userId: v.string(),
        type: v.union(
          v.literal("like"),
          v.literal("helpful"),
          v.literal("flag")
        ),
      })
    ),
  }),
  handler: (_ctx, _args) => {
    // TODO: Implement in US-P9-006
    return {
      like: 0,
      helpful: 0,
      flag: 0,
      userReactions: [],
    };
  },
});

/**
 * Toggle reaction on a voice note insight
 * If reaction exists, removes it. If not, adds it.
 * Prevents duplicate reactions
 */
export const toggleReaction = mutation({
  args: {
    insightId: v.id("voiceNoteInsights"),
    type: v.union(v.literal("like"), v.literal("helpful"), v.literal("flag")),
  },
  returns: v.object({
    action: v.union(v.literal("added"), v.literal("removed")),
  }),
  handler: (_ctx, _args) => {
    // TODO: Implement in US-P9-006
    return { action: "added" as const };
  },
});
