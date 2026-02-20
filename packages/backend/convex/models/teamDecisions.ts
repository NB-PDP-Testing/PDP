import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";

/**
 * Team Decisions Backend
 * Democratic voting system with weighted votes for team decision-making
 */

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new team decision
 */
export const createDecision = mutation({
  args: {
    organizationId: v.string(),
    teamId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    options: v.array(
      v.object({
        label: v.string(),
        description: v.optional(v.string()),
      })
    ),
    votingType: v.union(v.literal("simple"), v.literal("weighted")),
    deadline: v.optional(v.number()),
  },
  returns: v.id("teamDecisions"),
  handler: async (ctx, args) => {
    // 1. Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get actor info for activity feed
    const actor = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: identity.subject, operator: "eq" }],
    });

    const actorName = actor
      ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() ||
        "Unknown User"
      : "Unknown User";

    // 2. Generate option IDs
    const optionsWithIds = args.options.map((opt, idx) => ({
      id: `opt_${Date.now()}_${idx}`,
      label: opt.label,
      description: opt.description,
    }));

    // 3. Insert decision
    const decisionId = await ctx.db.insert("teamDecisions", {
      organizationId: args.organizationId,
      teamId: args.teamId,
      createdBy: identity.subject,
      title: args.title,
      description: args.description,
      options: optionsWithIds,
      votingType: args.votingType,
      status: "open",
      deadline: args.deadline,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 4. Create activity feed entry
    await ctx.db.insert("teamActivityFeed", {
      teamId: args.teamId,
      organizationId: args.organizationId,
      actorId: identity.subject,
      actorName,
      actionType: "decision_created",
      entityType: "decision",
      entityId: decisionId,
      summary: `created decision: ${args.title}`,
      priority: "normal",
    });

    return decisionId;
  },
});

/**
 * Cast or update a vote on a decision
 */
export const castVote = mutation({
  args: {
    decisionId: v.id("teamDecisions"),
    optionId: v.string(),
    comment: v.optional(v.string()),
  },
  returns: v.id("decisionVotes"),
  handler: async (ctx, args) => {
    // 1. Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // 2. Get decision
    const decision = await ctx.db.get(args.decisionId);
    if (!decision) {
      throw new Error("Decision not found");
    }
    if (decision.status !== "open") {
      throw new Error("Voting is closed");
    }

    // Get actor info for activity feed
    const actor = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: identity.subject, operator: "eq" }],
    });

    const actorName = actor
      ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() ||
        "Unknown User"
      : "Unknown User";

    // 3. Calculate vote weight
    // Get user's role in organization
    const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "member",
      where: [
        { field: "userId", value: identity.subject, operator: "eq" },
        {
          field: "organizationId",
          value: decision.organizationId,
          operator: "eq",
        },
      ],
    });

    let weight = 1.0; // Default: normal coach
    if (member) {
      if (member.role === "owner" || member.role === "admin") {
        weight = 2.0; // Head coach / leadership
      } else if (member.activeFunctionalRole === "coach") {
        weight = 1.0; // Regular coach
      } else {
        weight = 0.5; // Other roles
      }
    }

    // 4. Check if user already voted
    const existingVote = await ctx.db
      .query("decisionVotes")
      .withIndex("by_decision_and_user", (q) =>
        q.eq("decisionId", args.decisionId).eq("userId", identity.subject)
      )
      .first();

    // 5. Upsert vote
    let voteId: Id<"decisionVotes">;
    if (existingVote) {
      // Update existing vote
      await ctx.db.patch(existingVote._id, {
        optionId: args.optionId,
        weight,
        comment: args.comment,
        votedAt: Date.now(),
      });
      voteId = existingVote._id;
    } else {
      // Insert new vote
      voteId = await ctx.db.insert("decisionVotes", {
        decisionId: args.decisionId,
        userId: identity.subject,
        optionId: args.optionId,
        weight,
        comment: args.comment,
        votedAt: Date.now(),
      });
    }

    // 6. Create activity feed entry
    await ctx.db.insert("teamActivityFeed", {
      teamId: decision.teamId,
      organizationId: decision.organizationId,
      actorId: identity.subject,
      actorName,
      actionType: "vote_cast",
      entityType: "decision",
      entityId: args.decisionId,
      summary: `voted on: ${decision.title}`,
      priority: "normal",
    });

    return voteId;
  },
});

/**
 * Finalize a decision (head coach/admin only)
 */
export const finalizeDecision = mutation({
  args: {
    decisionId: v.id("teamDecisions"),
  },
  returns: v.id("teamDecisions"),
  handler: async (ctx, args) => {
    // 1. Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // 2. Get decision
    const decision = await ctx.db.get(args.decisionId);
    if (!decision) {
      throw new Error("Decision not found");
    }
    if (decision.status !== "open") {
      throw new Error("Decision already finalized");
    }

    // 3. Check if user is head coach/admin
    const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "member",
      where: [
        { field: "userId", value: identity.subject, operator: "eq" },
        {
          field: "organizationId",
          value: decision.organizationId,
          operator: "eq",
        },
      ],
    });

    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new Error("Only organization admins can finalize decisions");
    }

    // Get actor info for activity feed
    const actor = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: identity.subject, operator: "eq" }],
    });

    const actorName = actor
      ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() ||
        "Unknown User"
      : "Unknown User";

    // 4. Get all votes and calculate totals
    const votes = await ctx.db
      .query("decisionVotes")
      .withIndex("by_decision", (q) => q.eq("decisionId", args.decisionId))
      .collect();

    // 5. Calculate weighted totals per option
    const totals = new Map<string, number>();
    for (const vote of votes) {
      const current = totals.get(vote.optionId) || 0;
      totals.set(vote.optionId, current + vote.weight);
    }

    // 6. Find winning option
    let winningOption: string | undefined;
    let maxVotes = 0;
    for (const [optionId, total] of totals.entries()) {
      if (total > maxVotes) {
        maxVotes = total;
        winningOption = optionId;
      }
    }

    // 7. Update decision
    await ctx.db.patch(args.decisionId, {
      status: "finalized",
      finalizedAt: Date.now(),
      finalizedBy: identity.subject,
      winningOption,
      updatedAt: Date.now(),
    });

    // 8. Create activity feed entry
    await ctx.db.insert("teamActivityFeed", {
      teamId: decision.teamId,
      organizationId: decision.organizationId,
      actorId: identity.subject,
      actorName,
      actionType: "decision_finalized",
      entityType: "decision",
      entityId: args.decisionId,
      summary: `finalized decision: ${decision.title}`,
      priority: "important",
    });

    return args.decisionId;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get team decisions with vote counts and user names
 */
export const getTeamDecisions = query({
  args: {
    teamId: v.string(),
    status: v.optional(
      v.union(v.literal("open"), v.literal("closed"), v.literal("finalized"))
    ),
  },
  returns: v.array(
    v.object({
      _id: v.id("teamDecisions"),
      organizationId: v.string(),
      teamId: v.string(),
      createdBy: v.string(),
      createdByName: v.string(), // Enriched
      title: v.string(),
      description: v.optional(v.string()),
      options: v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          description: v.optional(v.string()),
          voteCount: v.number(), // Enriched
          votePoints: v.number(), // Enriched (weighted)
        })
      ),
      votingType: v.union(v.literal("simple"), v.literal("weighted")),
      status: v.union(
        v.literal("open"),
        v.literal("closed"),
        v.literal("finalized")
      ),
      deadline: v.optional(v.number()),
      finalizedAt: v.optional(v.number()),
      finalizedBy: v.optional(v.string()),
      finalizedByName: v.optional(v.string()), // Enriched
      winningOption: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      totalVotes: v.number(), // Enriched
    })
  ),
  handler: async (ctx, args) => {
    // 1. Get decisions
    const { teamId, status } = args;
    const decisions = status
      ? await ctx.db
          .query("teamDecisions")
          .withIndex("by_team_and_status", (q) =>
            q.eq("teamId", teamId).eq("status", status)
          )
          .collect()
      : await ctx.db
          .query("teamDecisions")
          .withIndex("by_team", (q) => q.eq("teamId", teamId))
          .collect();

    // 2. Get all votes for all decisions (batch)
    const decisionIds = decisions.map((d) => d._id);
    const allVotes = await Promise.all(
      decisionIds.map((decisionId) =>
        ctx.db
          .query("decisionVotes")
          .withIndex("by_decision", (q) => q.eq("decisionId", decisionId))
          .collect()
      )
    );

    // Map votes by decision ID
    const votesByDecision = new Map(
      decisionIds.map((id, idx) => [id, allVotes[idx] || []])
    );

    // 3. Get unique user IDs for enrichment (batch)
    const allUserIds = new Set<string>();
    for (const decision of decisions) {
      allUserIds.add(decision.createdBy);
      if (decision.finalizedBy) {
        allUserIds.add(decision.finalizedBy);
      }
    }

    const users = await Promise.all(
      Array.from(allUserIds).map((userId) =>
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "_id", value: userId, operator: "eq" }],
        })
      )
    );

    const userMap = new Map();
    for (const user of users) {
      if (user) {
        userMap.set(user._id, user.name || "Unknown");
      }
    }

    // 4. Enrich decisions with vote data and user names
    return decisions.map((decision) => {
      const votes = votesByDecision.get(decision._id) || [];

      // Calculate vote counts and points per option
      const optionStats = new Map<
        string,
        { voteCount: number; votePoints: number }
      >();

      for (const vote of votes) {
        const current = optionStats.get(vote.optionId) || {
          voteCount: 0,
          votePoints: 0,
        };
        optionStats.set(vote.optionId, {
          voteCount: current.voteCount + 1,
          votePoints: current.votePoints + vote.weight,
        });
      }

      const enrichedOptions = decision.options.map((option) => {
        const stats = optionStats.get(option.id) || {
          voteCount: 0,
          votePoints: 0,
        };
        return {
          ...option,
          voteCount: stats.voteCount,
          votePoints: stats.votePoints,
        };
      });

      return {
        ...decision,
        createdByName: userMap.get(decision.createdBy) || "Unknown",
        finalizedByName: decision.finalizedBy
          ? userMap.get(decision.finalizedBy) || "Unknown"
          : undefined,
        options: enrichedOptions,
        totalVotes: votes.length,
      };
    });
  },
});

/**
 * Get votes for a specific decision with user names
 */
export const getDecisionVotes = query({
  args: {
    decisionId: v.id("teamDecisions"),
  },
  returns: v.array(
    v.object({
      _id: v.id("decisionVotes"),
      decisionId: v.id("teamDecisions"),
      userId: v.string(),
      userName: v.string(), // Enriched
      optionId: v.string(),
      weight: v.number(),
      comment: v.optional(v.string()),
      votedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // 1. Get votes
    const votes = await ctx.db
      .query("decisionVotes")
      .withIndex("by_decision", (q) => q.eq("decisionId", args.decisionId))
      .collect();

    // 2. Get unique user IDs (batch)
    const userIds = [...new Set(votes.map((vote) => vote.userId))];

    // 3. Batch fetch user names
    const users = await Promise.all(
      userIds.map((userId) =>
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "_id", value: userId, operator: "eq" }],
        })
      )
    );

    const userMap = new Map();
    for (const user of users) {
      if (user) {
        userMap.set(user._id, user.name || "Unknown");
      }
    }

    // 4. Enrich votes with user names
    return votes.map((vote) => ({
      ...vote,
      userName: userMap.get(vote.userId) || "Unknown",
    }));
  },
});
