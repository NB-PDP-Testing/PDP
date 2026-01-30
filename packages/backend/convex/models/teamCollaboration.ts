import { v } from "convex/values";
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
  handler: (_ctx, _args) => {
    // TODO: Implement in US-P9-003
    return [];
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
  handler: (_ctx, _args) => {
    // TODO: Implement in US-P9-003
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
