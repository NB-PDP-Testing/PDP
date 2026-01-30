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
  handler: async (ctx, args) => {
    // Get all comments for this insight
    const comments = await ctx.db
      .query("insightComments")
      .withIndex("by_insight", (q) => q.eq("insightId", args.insightId))
      .collect();

    // Enrich with user data using Better Auth adapter
    // Use batch fetch pattern to avoid N+1 queries
    const uniqueUserIds = [...new Set(comments.map((c) => c.userId))];

    const usersData = await Promise.all(
      uniqueUserIds.map((userId) =>
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "_id", value: userId, operator: "eq" }],
        })
      )
    );

    // Create user lookup map
    const userMap = new Map();
    for (const user of usersData) {
      if (user) {
        userMap.set(user._id, user);
      }
    }

    // Enrich comments with user data
    const enrichedComments = comments.map((comment) => {
      const user = userMap.get(comment.userId);
      return {
        _id: comment._id,
        content: comment.content,
        userId: comment.userId,
        userName: user
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
            "Unknown User"
          : "Unknown User",
        userAvatar: user?.image || undefined,
        priority: comment.priority,
        parentCommentId: comment.parentCommentId,
        _creationTime: comment._creationTime,
      };
    });

    // Sort by creation time (oldest first)
    return enrichedComments.sort((a, b) => a._creationTime - b._creationTime);
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
    userId: v.string(),
    organizationId: v.string(),
  },
  returns: v.id("insightComments"),
  handler: async (ctx, args) => {
    // Auto-detect priority from content keywords
    const contentLower = args.content.toLowerCase();
    let priority: "critical" | "important" | "normal" = "normal";

    if (
      contentLower.includes("injury") ||
      contentLower.includes("urgent") ||
      contentLower.includes("emergency")
    ) {
      priority = "critical";
    } else if (
      contentLower.includes("important") ||
      contentLower.includes("concern") ||
      contentLower.includes("issue")
    ) {
      priority = "important";
    }

    // Insert comment
    const commentId = await ctx.db.insert("insightComments", {
      insightId: args.insightId,
      userId: args.userId,
      content: args.content,
      priority,
      parentCommentId: args.parentCommentId,
      organizationId: args.organizationId,
    });

    // TODO (US-P9-018): Create activity feed entry
    // This is a placeholder for future story
    // await createActivityFeedEntry(ctx, {
    //   organizationId: args.organizationId,
    //   actionType: "comment_added",
    //   entityId: commentId,
    //   ...
    // });

    return commentId;
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
  handler: async (ctx, args) => {
    // Get all reactions for this insight
    const reactions = await ctx.db
      .query("insightReactions")
      .withIndex("by_insight", (q) => q.eq("insightId", args.insightId))
      .collect();

    // Aggregate counts by type
    const counts = { like: 0, helpful: 0, flag: 0 };
    for (const reaction of reactions) {
      counts[reaction.type] += 1;
    }

    return {
      ...counts,
      userReactions: reactions.map((r) => ({
        userId: r.userId,
        type: r.type,
      })),
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
    userId: v.string(),
    organizationId: v.string(),
  },
  returns: v.object({
    action: v.union(v.literal("added"), v.literal("removed")),
  }),
  handler: async (ctx, args) => {
    // Check if reaction already exists (prevent duplicates)
    const existing = await ctx.db
      .query("insightReactions")
      .withIndex("by_insight_and_user", (q) =>
        q.eq("insightId", args.insightId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      // If same type, remove it (toggle off)
      if (existing.type === args.type) {
        await ctx.db.delete(existing._id);
        return { action: "removed" as const };
      }

      // If different type, update it (switch reaction)
      await ctx.db.patch(existing._id, {
        type: args.type,
      });
      return { action: "added" as const };
    }

    // No existing reaction, create new one
    await ctx.db.insert("insightReactions", {
      insightId: args.insightId,
      userId: args.userId,
      type: args.type,
      organizationId: args.organizationId,
    });

    return { action: "added" as const };
  },
});

/**
 * Get team activity feed with priority filtering
 * Returns chronological feed of team actions (newest first)
 */
export const getTeamActivityFeed = query({
  args: {
    teamId: v.string(),
    organizationId: v.string(),
    filterType: v.optional(
      v.union(
        v.literal("all"),
        v.literal("insights"),
        v.literal("comments"),
        v.literal("reactions"),
        v.literal("sessions"),
        v.literal("votes")
      )
    ),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("teamActivityFeed"),
      actorId: v.string(),
      actorName: v.string(),
      actorAvatar: v.optional(v.string()),
      actionType: v.union(
        v.literal("voice_note_added"),
        v.literal("insight_applied"),
        v.literal("comment_added"),
        v.literal("player_assessed"),
        v.literal("goal_created"),
        v.literal("injury_logged")
      ),
      entityType: v.union(
        v.literal("voice_note"),
        v.literal("insight"),
        v.literal("comment"),
        v.literal("skill_assessment"),
        v.literal("goal"),
        v.literal("injury")
      ),
      entityId: v.string(),
      summary: v.string(),
      priority: v.union(
        v.literal("critical"),
        v.literal("important"),
        v.literal("normal")
      ),
      metadata: v.optional(
        v.object({
          playerName: v.optional(v.string()),
          insightTitle: v.optional(v.string()),
          commentPreview: v.optional(v.string()),
        })
      ),
      _creationTime: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 50, 100); // Default 50, max 100

    // Get activity entries for this team
    const activities = await ctx.db
      .query("teamActivityFeed")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .take(limit);

    // Filter by type if specified
    const filteredActivities =
      args.filterType && args.filterType !== "all"
        ? activities.filter((activity) => {
            // Map filterType to actionType
            const typeMapping: Record<string, string[]> = {
              insights: ["voice_note_added", "insight_applied"],
              comments: ["comment_added"],
              reactions: [], // Reactions are not actionType, they're tracked differently
              sessions: [], // Sessions not implemented yet
              votes: [], // Votes not implemented yet
            };

            const allowedTypes = typeMapping[args.filterType || "all"] || [];
            return allowedTypes.includes(activity.actionType);
          })
        : activities;

    // Enrich with user avatar using Better Auth adapter
    // Use batch fetch pattern to avoid N+1 queries
    const uniqueActorIds = [
      ...new Set(filteredActivities.map((a) => a.actorId)),
    ];

    const usersData = await Promise.all(
      uniqueActorIds.map((actorId) =>
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "_id", value: actorId, operator: "eq" }],
        })
      )
    );

    // Create user lookup map
    const userMap = new Map();
    for (const user of usersData) {
      if (user) {
        userMap.set(user._id, user);
      }
    }

    // Enrich activities with user avatar
    return filteredActivities.map((activity) => {
      const user = userMap.get(activity.actorId);
      return {
        _id: activity._id,
        actorId: activity.actorId,
        actorName: activity.actorName,
        actorAvatar: user?.image || undefined,
        actionType: activity.actionType,
        entityType: activity.entityType,
        entityId: activity.entityId,
        summary: activity.summary,
        priority: activity.priority,
        metadata: activity.metadata,
        _creationTime: activity._creationTime,
      };
    });
  },
});
