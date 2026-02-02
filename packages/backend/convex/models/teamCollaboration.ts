import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
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
    teamId: v.string(), // Better Auth team ID
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
    teamId: v.string(), // Better Auth team ID
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
          where: [{ field: "_id", value: userId as any, operator: "eq" }],
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

    // Get insight details for activity feed
    const insight = await ctx.db.get(args.insightId);
    if (!insight) {
      return commentId;
    }

    // Get actor name using Better Auth adapter
    const actor = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: args.userId as any, operator: "eq" }],
    });

    const actorName = actor
      ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() ||
        "Unknown User"
      : "Unknown User";

    // Create activity feed entry (US-P9-018)
    if (insight.teamId) {
      const commentPreview = args.content.substring(0, 100);
      const summary = `${actorName} commented on ${insight.playerName || "a player"}'s ${insight.category} insight`;

      await ctx.db.insert("teamActivityFeed", {
        organizationId: args.organizationId,
        teamId: insight.teamId,
        actorId: args.userId,
        actorName,
        actionType: "comment_added",
        entityType: "comment",
        entityId: commentId,
        summary,
        priority,
        metadata: {
          playerName: insight.playerName,
          insightTitle: insight.title,
          commentPreview,
        },
      });
    }

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
        userName: v.string(),
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

    // Batch fetch user names (avoid N+1 queries)
    const uniqueUserIds = [...new Set(reactions.map((r) => r.userId))];
    const usersData = await Promise.all(
      uniqueUserIds.map((userId) =>
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "_id", value: userId, operator: "eq" }],
        })
      )
    );

    // Create Map for O(1) lookup
    const userMap = new Map();
    for (const user of usersData) {
      if (user) {
        const displayName =
          user.name ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          "Unknown User";
        userMap.set(user._id, displayName);
      }
    }

    return {
      ...counts,
      userReactions: reactions.map((r) => ({
        userId: r.userId,
        userName: userMap.get(r.userId) || "Unknown User",
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
 * Get coaches for @mention autocomplete
 * Returns coaches with their name, avatar, and functional role
 */
export const getCoachesForMentions = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      userId: v.string(),
      name: v.string(),
      avatar: v.optional(v.string()),
      role: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // Get all members for this organization
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    // Filter to members with Coach functional role
    const coachMembers = membersResult.data.filter((member: any) =>
      member.functionalRoles?.includes("Coach")
    );

    // Enrich with user data using Better Auth adapter
    const uniqueUserIds = [
      ...new Set(coachMembers.map((m: any) => m.userId as string)),
    ];

    const usersData = await Promise.all(
      uniqueUserIds.map((userId) =>
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "_id", value: userId as any, operator: "eq" }],
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

    // Build coach list
    return coachMembers.map((member: any) => {
      const user = userMap.get(member.userId);
      return {
        userId: member.userId,
        name: user
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
            "Unknown User"
          : "Unknown User",
        avatar: user?.image || undefined,
        role: member.activeFunctionalRole || "Coach",
      };
    });
  },
});

/**
 * Get smart coach mentions with contextual ranking
 * Ranks coaches based on insight context (category, player, team)
 */
export const getSmartCoachMentions = query({
  args: {
    organizationId: v.string(),
    insightCategory: v.optional(v.string()),
    playerIdentityId: v.optional(v.id("playerIdentities")),
    teamId: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      userId: v.string(),
      name: v.string(),
      avatar: v.optional(v.string()),
      role: v.optional(v.string()),
      relevanceScore: v.number(), // For sorting: higher = more relevant
    })
  ),
  handler: async (ctx, args) => {
    // Get all coach members for this organization
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    const coachMembers = membersResult.data.filter((member: any) =>
      member.functionalRoles?.includes("Coach")
    );

    // Enrich with user data using Better Auth adapter
    const uniqueUserIds = [
      ...new Set(coachMembers.map((m: any) => m.userId as string)),
    ];

    const usersData = await Promise.all(
      uniqueUserIds.map((userId) =>
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "_id", value: userId as any, operator: "eq" }],
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

    // Get team coach assignments if teamId provided
    // Note: coachAssignments.teams is an array, so we need to filter in-memory
    let teamCoachIds: Set<string> = new Set();
    if (args.teamId) {
      const allAssignments = await ctx.db
        .query("coachAssignments")
        .withIndex("by_organizationId", (q: any) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();
      const teamAssignments = allAssignments.filter((a: any) =>
        a.teams.includes(args.teamId)
      );
      teamCoachIds = new Set(teamAssignments.map((a: any) => a.userId));
    }

    // Get coaches who recently observed this player (if playerIdentityId provided)
    // Use voiceNoteInsights table which has proper indexes
    let coachesWithPlayerObservations: Set<string> = new Set();
    if (args.playerIdentityId) {
      const playerInsights = await ctx.db
        .query("voiceNoteInsights")
        .withIndex("by_player_status", (q: any) =>
          q.eq("playerIdentityId", args.playerIdentityId)
        )
        .collect();
      coachesWithPlayerObservations = new Set(
        playerInsights.map((insight: any) => insight.coachId)
      );
    }

    // Build coach list with relevance scores
    const coaches = coachMembers.map((member: any) => {
      const user = userMap.get(member.userId);
      let relevanceScore = 0;

      // Base score: alphabetical (small weight)
      const name = user
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          "Unknown User"
        : "Unknown User";
      relevanceScore = 1000 - name.toLowerCase().charCodeAt(0);

      // Context match: injury category → medical/first-aid role
      if (
        (args.insightCategory === "injury" ||
          args.insightCategory === "medical") &&
        (member.activeFunctionalRole?.toLowerCase().includes("medical") ||
          member.activeFunctionalRole?.toLowerCase().includes("first-aid"))
      ) {
        relevanceScore += 10_000; // High priority
      }

      // Context match: player mentioned → coaches who observed this player
      if (
        args.playerIdentityId &&
        coachesWithPlayerObservations.has(member.userId)
      ) {
        relevanceScore += 5000; // Medium-high priority
      }

      // Context match: team observation → coaches assigned to this team
      if (args.teamId && teamCoachIds.has(member.userId)) {
        relevanceScore += 3000; // Medium priority
      }

      return {
        userId: member.userId,
        name,
        avatar: user?.image || undefined,
        role: member.activeFunctionalRole || "Coach",
        relevanceScore,
      };
    });

    // Sort by relevance score descending (most relevant first)
    return coaches.sort(
      (a: { relevanceScore: number }, b: { relevanceScore: number }) =>
        b.relevanceScore - a.relevanceScore
    );
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
    paginationOpts: v.optional(
      v.object({
        cursor: v.union(v.string(), v.null()),
        numItems: v.number(),
      })
    ),
  },
  returns: v.union(
    // Paginated response (when paginationOpts provided)
    v.object({
      page: v.array(
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
            v.literal("injury_logged"),
            v.literal("decision_created"),
            v.literal("vote_cast"),
            v.literal("decision_finalized"),
            v.literal("task_created"),
            v.literal("task_completed"),
            v.literal("task_assigned")
          ),
          entityType: v.union(
            v.literal("voice_note"),
            v.literal("insight"),
            v.literal("comment"),
            v.literal("skill_assessment"),
            v.literal("goal"),
            v.literal("injury"),
            v.literal("decision"),
            v.literal("task")
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
      continueCursor: v.union(v.string(), v.null()),
      isDone: v.boolean(),
    }),
    // Simple array response (backward compatible)
    v.array(
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
          v.literal("injury_logged"),
          v.literal("decision_created"),
          v.literal("vote_cast"),
          v.literal("decision_finalized"),
          v.literal("task_created"),
          v.literal("task_completed"),
          v.literal("task_assigned")
        ),
        entityType: v.union(
          v.literal("voice_note"),
          v.literal("insight"),
          v.literal("comment"),
          v.literal("skill_assessment"),
          v.literal("goal"),
          v.literal("injury"),
          v.literal("decision"),
          v.literal("task")
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
    )
  ),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 50, 100); // Default 50, max 100

    // Map filterType to actionTypes
    type ActionType =
      | "voice_note_added"
      | "insight_applied"
      | "comment_added"
      | "player_assessed"
      | "goal_created"
      | "injury_logged"
      | "decision_created"
      | "vote_cast"
      | "decision_finalized"
      | "task_created"
      | "task_completed"
      | "task_assigned";

    const typeMapping: Record<string, ActionType[]> = {
      insights: ["voice_note_added", "insight_applied"],
      comments: ["comment_added"],
      reactions: [], // Reactions are not actionType, they're tracked differently
      sessions: [], // Sessions not implemented yet
      votes: [], // Votes not implemented yet
    };

    type EntityType =
      | "voice_note"
      | "insight"
      | "comment"
      | "skill_assessment"
      | "goal"
      | "injury"
      | "decision"
      | "task";

    type ActivityDoc = {
      _id: Id<"teamActivityFeed">;
      _creationTime: number;
      organizationId: string;
      teamId: string;
      actorId: string;
      actorName: string;
      actionType: ActionType;
      entityType: EntityType;
      entityId: string;
      summary: string;
      priority: "critical" | "important" | "normal";
      metadata?: {
        playerName?: string;
        insightTitle?: string;
        commentPreview?: string;
      };
    };

    // Check if we should use pagination (only for "all" filter)
    const usePagination =
      args.paginationOpts && (!args.filterType || args.filterType === "all");

    let activities: ActivityDoc[];
    let paginationResult: {
      page: ActivityDoc[];
      continueCursor: string | null;
      isDone: boolean;
    } | null = null;

    // Use index-based filtering instead of .filter()
    if (!args.filterType || args.filterType === "all") {
      if (usePagination && args.paginationOpts) {
        // Use cursor-based pagination for "all" filter
        const result = await ctx.db
          .query("teamActivityFeed")
          .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
          .order("desc")
          .paginate(args.paginationOpts);

        activities = result.page;
        paginationResult = {
          page: result.page,
          continueCursor: result.continueCursor,
          isDone: result.isDone,
        };
      } else {
        // Fetch all activities for the team (backward compatible)
        activities = await ctx.db
          .query("teamActivityFeed")
          .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
          .order("desc")
          .take(limit);
      }
    } else {
      // Get actionTypes for this filter
      const actionTypes = typeMapping[args.filterType] || [];

      if (actionTypes.length === 0) {
        // No activities for this filter type (sessions, votes, reactions not implemented)
        activities = [];
      } else if (actionTypes.length === 1) {
        // Single actionType - use index directly
        activities = await ctx.db
          .query("teamActivityFeed")
          .withIndex("by_team_and_actionType", (q) =>
            q.eq("teamId", args.teamId).eq("actionType", actionTypes[0])
          )
          .order("desc")
          .take(limit);
      } else {
        // Multiple actionTypes (e.g., insights = voice_note_added + insight_applied)
        // Fetch for each actionType, then merge and sort
        const activitySets = await Promise.all(
          actionTypes.map((actionType) =>
            ctx.db
              .query("teamActivityFeed")
              .withIndex("by_team_and_actionType", (q) =>
                q.eq("teamId", args.teamId).eq("actionType", actionType)
              )
              .order("desc")
              .take(limit)
              .then((results) => results)
          )
        );

        // Merge all results
        const merged = activitySets.flat();

        // Sort by _creationTime descending and take limit
        activities = merged
          .sort((a, b) => b._creationTime - a._creationTime)
          .slice(0, limit);
      }
    }

    // Enrich with user avatar using Better Auth adapter
    // Use batch fetch pattern to avoid N+1 queries
    const uniqueActorIds = [...new Set(activities.map((a) => a.actorId))];

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
    const enrichedActivities = activities.map((activity) => {
      const user = userMap.get(activity.actorId);
      const actorAvatar: string | undefined =
        typeof user?.image === "string" ? user.image : undefined;
      return {
        _id: activity._id,
        actorId: activity.actorId,
        actorName: activity.actorName,
        actorAvatar,
        actionType: activity.actionType,
        entityType: activity.entityType,
        entityId: activity.entityId,
        summary: activity.summary,
        priority: activity.priority,
        metadata: activity.metadata,
        _creationTime: activity._creationTime,
      };
    });

    // Return paginated object or simple array
    if (paginationResult) {
      return {
        page: enrichedActivities,
        continueCursor: paginationResult.continueCursor,
        isDone: paginationResult.isDone,
      };
    }
    return enrichedActivities;
  },
});

/**
 * Get unread notifications for notification center
 * Returns activities from user's teams that haven't been read
 */
export const getUnreadNotifications = query({
  args: {
    userId: v.string(),
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    unreadCount: v.number(),
    notifications: v.array(
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
          v.literal("injury_logged"),
          v.literal("decision_created"),
          v.literal("vote_cast"),
          v.literal("decision_finalized"),
          v.literal("task_created"),
          v.literal("task_completed"),
          v.literal("task_assigned")
        ),
        entityType: v.union(
          v.literal("voice_note"),
          v.literal("insight"),
          v.literal("comment"),
          v.literal("skill_assessment"),
          v.literal("goal"),
          v.literal("injury"),
          v.literal("decision"),
          v.literal("task")
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
  }),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 50, 100); // Default 50, max 100

    // Get all activities for this organization (simplified - could be scoped to user's teams)
    const allActivities = await ctx.db
      .query("teamActivityFeed")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(limit);

    // Filter out user's own activities
    const othersActivities = allActivities.filter(
      (a) => a.actorId !== args.userId
    );

    // Get read statuses for these activities
    const readStatuses = await ctx.db
      .query("activityReadStatus")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Create set of read activity IDs for fast lookup
    const readActivityIds = new Set(
      readStatuses.map((status) => status.activityId)
    );

    // Filter to only unread activities
    const unreadActivities = othersActivities.filter(
      (activity) => !readActivityIds.has(activity._id)
    );

    // Enrich with user avatars using Better Auth adapter
    const uniqueActorIds = [...new Set(unreadActivities.map((a) => a.actorId))];

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
    const enrichedNotifications = unreadActivities.map((activity) => {
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

    return {
      unreadCount: enrichedNotifications.length,
      notifications: enrichedNotifications,
    };
  },
});

/**
 * Mark an activity as read in the notification center
 */
export const markActivityAsRead = mutation({
  args: {
    activityId: v.id("teamActivityFeed"),
    userId: v.string(),
    organizationId: v.string(),
  },
  returns: v.id("activityReadStatus"),
  handler: async (ctx, args) => {
    // Check if already marked as read
    const existing = await ctx.db
      .query("activityReadStatus")
      .withIndex("by_user_and_activity", (q) =>
        q.eq("userId", args.userId).eq("activityId", args.activityId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Mark as read
    const readStatusId = await ctx.db.insert("activityReadStatus", {
      userId: args.userId,
      activityId: args.activityId,
      organizationId: args.organizationId,
      readAt: Date.now(),
    });

    return readStatusId;
  },
});
