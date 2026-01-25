import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

const goalCategoryValidator = v.union(
  v.literal("technical"),
  v.literal("tactical"),
  v.literal("physical"),
  v.literal("mental"),
  v.literal("social")
);

const goalPriorityValidator = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low")
);

const goalStatusValidator = v.union(
  v.literal("not_started"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("on_hold"),
  v.literal("cancelled")
);

const milestoneValidator = v.object({
  id: v.string(),
  description: v.string(),
  completed: v.boolean(),
  completedDate: v.optional(v.string()),
});

const goalValidator = v.object({
  _id: v.id("passportGoals"),
  _creationTime: v.number(),
  passportId: v.id("sportPassports"),
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  title: v.string(),
  description: v.string(),
  category: goalCategoryValidator,
  priority: goalPriorityValidator,
  status: goalStatusValidator,
  progress: v.number(),
  targetDate: v.optional(v.string()),
  completedDate: v.optional(v.string()),
  linkedSkills: v.optional(v.array(v.string())),
  milestones: v.optional(v.array(milestoneValidator)),
  parentActions: v.optional(v.array(v.string())),
  parentCanView: v.boolean(),
  // Cross-org sharing control (Passport Sharing Feature)
  isShareable: v.optional(v.boolean()),
  markedShareableAt: v.optional(v.number()),
  markedShareableBy: v.optional(v.string()),
  coachNotes: v.optional(v.string()),
  playerNotes: v.optional(v.string()),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get goal by ID
 */
export const getGoalById = query({
  args: { goalId: v.id("passportGoals") },
  returns: v.union(goalValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.goalId),
});

/**
 * Get all goals for a passport
 */
export const getGoalsForPassport = query({
  args: {
    passportId: v.id("sportPassports"),
    status: v.optional(goalStatusValidator),
    category: v.optional(goalCategoryValidator),
  },
  returns: v.array(goalValidator),
  handler: async (ctx, args) => {
    const { passportId, status, category } = args;
    if (status !== undefined) {
      return await ctx.db
        .query("passportGoals")
        .withIndex("by_status", (q) =>
          q.eq("passportId", passportId).eq("status", status)
        )
        .collect();
    }
    if (category !== undefined) {
      return await ctx.db
        .query("passportGoals")
        .withIndex("by_category", (q) =>
          q.eq("passportId", passportId).eq("category", category)
        )
        .collect();
    }
    return await ctx.db
      .query("passportGoals")
      .withIndex("by_passportId", (q) => q.eq("passportId", passportId))
      .collect();
  },
});

/**
 * Get all goals for a player (across all passports)
 */
export const getGoalsForPlayer = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    status: v.optional(goalStatusValidator),
  },
  returns: v.array(goalValidator),
  handler: async (ctx, args) => {
    let goals = await ctx.db
      .query("passportGoals")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    if (args.status) {
      goals = goals.filter((g) => g.status === args.status);
    }

    return goals;
  },
});

/**
 * Get all goals for an organization
 */
export const getGoalsForOrg = query({
  args: {
    organizationId: v.string(),
    status: v.optional(goalStatusValidator),
    category: v.optional(goalCategoryValidator),
  },
  returns: v.array(goalValidator),
  handler: async (ctx, args) => {
    let goals = await ctx.db
      .query("passportGoals")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    if (args.status) {
      goals = goals.filter((g) => g.status === args.status);
    }
    if (args.category) {
      goals = goals.filter((g) => g.category === args.category);
    }

    return goals;
  },
});

/**
 * Get active goals for a passport (not completed/cancelled)
 */
export const getActiveGoalsForPassport = query({
  args: { passportId: v.id("sportPassports") },
  returns: v.array(goalValidator),
  handler: async (ctx, args) => {
    const goals = await ctx.db
      .query("passportGoals")
      .withIndex("by_passportId", (q) => q.eq("passportId", args.passportId))
      .collect();

    return goals.filter(
      (g) => g.status !== "completed" && g.status !== "cancelled"
    );
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Create a new goal
 */
export const createGoal = mutation({
  args: {
    passportId: v.id("sportPassports"),
    title: v.string(),
    description: v.string(),
    category: goalCategoryValidator,
    priority: goalPriorityValidator,
    targetDate: v.optional(v.string()),
    linkedSkills: v.optional(v.array(v.string())),
    parentActions: v.optional(v.array(v.string())),
    parentCanView: v.optional(v.boolean()),
    createdBy: v.optional(v.string()),
  },
  returns: v.id("passportGoals"),
  handler: async (ctx, args) => {
    // Get passport to get player and org info
    const passport = await ctx.db.get(args.passportId);
    if (!passport) {
      throw new Error("Passport not found");
    }

    const now = Date.now();

    return await ctx.db.insert("passportGoals", {
      passportId: args.passportId,
      playerIdentityId: passport.playerIdentityId,
      organizationId: passport.organizationId,
      title: args.title,
      description: args.description,
      category: args.category,
      priority: args.priority,
      status: "not_started",
      progress: 0,
      targetDate: args.targetDate,
      linkedSkills: args.linkedSkills,
      parentActions: args.parentActions,
      parentCanView: args.parentCanView ?? true,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a goal
 */
export const updateGoal = mutation({
  args: {
    goalId: v.id("passportGoals"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(goalCategoryValidator),
    priority: v.optional(goalPriorityValidator),
    status: v.optional(goalStatusValidator),
    progress: v.optional(v.number()),
    targetDate: v.optional(v.string()),
    linkedSkills: v.optional(v.array(v.string())),
    parentActions: v.optional(v.array(v.string())),
    parentCanView: v.optional(v.boolean()),
    coachNotes: v.optional(v.string()),
    playerNotes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.goalId);
    if (!existing) {
      throw new Error("Goal not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      updates.title = args.title;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }
    if (args.category !== undefined) {
      updates.category = args.category;
    }
    if (args.priority !== undefined) {
      updates.priority = args.priority;
    }
    if (args.status !== undefined) {
      updates.status = args.status;
      // Auto-set completed date when marking as completed
      if (args.status === "completed" && !existing.completedDate) {
        updates.completedDate = new Date().toISOString().split("T")[0];
      }
    }
    if (args.progress !== undefined) {
      updates.progress = args.progress;
    }
    if (args.targetDate !== undefined) {
      updates.targetDate = args.targetDate;
    }
    if (args.linkedSkills !== undefined) {
      updates.linkedSkills = args.linkedSkills;
    }
    if (args.parentActions !== undefined) {
      updates.parentActions = args.parentActions;
    }
    if (args.parentCanView !== undefined) {
      updates.parentCanView = args.parentCanView;
    }
    if (args.coachNotes !== undefined) {
      updates.coachNotes = args.coachNotes;
    }
    if (args.playerNotes !== undefined) {
      updates.playerNotes = args.playerNotes;
    }

    await ctx.db.patch(args.goalId, updates);
    return null;
  },
});

/**
 * Update goal progress
 */
export const updateGoalProgress = mutation({
  args: {
    goalId: v.id("passportGoals"),
    progress: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.goalId);
    if (!existing) {
      throw new Error("Goal not found");
    }

    const updates: Record<string, unknown> = {
      progress: Math.max(0, Math.min(100, args.progress)),
      updatedAt: Date.now(),
    };

    // Auto-complete if 100% progress
    if (args.progress >= 100 && existing.status !== "completed") {
      updates.status = "completed";
      updates.completedDate = new Date().toISOString().split("T")[0];
    }

    await ctx.db.patch(args.goalId, updates);
    return null;
  },
});

/**
 * Add a milestone to a goal
 */
export const addMilestone = mutation({
  args: {
    goalId: v.id("passportGoals"),
    description: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.goalId);
    if (!existing) {
      throw new Error("Goal not found");
    }

    const milestoneId = `ms_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newMilestone = {
      id: milestoneId,
      description: args.description,
      completed: false,
    };

    const milestones = [...(existing.milestones ?? []), newMilestone];

    await ctx.db.patch(args.goalId, {
      milestones,
      updatedAt: Date.now(),
    });

    return milestoneId;
  },
});

/**
 * Complete a milestone
 */
export const completeMilestone = mutation({
  args: {
    goalId: v.id("passportGoals"),
    milestoneId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.goalId);
    if (!existing) {
      throw new Error("Goal not found");
    }

    const milestones = (existing.milestones ?? []).map((m) =>
      m.id === args.milestoneId
        ? {
            ...m,
            completed: true,
            completedDate: new Date().toISOString().split("T")[0],
          }
        : m
    );

    // Calculate progress based on milestones
    const completedCount = milestones.filter((m) => m.completed).length;
    const progress =
      milestones.length > 0
        ? Math.round((completedCount / milestones.length) * 100)
        : 0;

    await ctx.db.patch(args.goalId, {
      milestones,
      progress,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Update linked skills for a goal
 */
export const updateLinkedSkills = mutation({
  args: {
    goalId: v.id("passportGoals"),
    linkedSkills: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.goalId);
    if (!existing) {
      throw new Error("Goal not found");
    }

    await ctx.db.patch(args.goalId, {
      linkedSkills: args.linkedSkills,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Delete a goal
 */
export const deleteGoal = mutation({
  args: { goalId: v.id("passportGoals") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.goalId);
    if (!existing) {
      throw new Error("Goal not found");
    }

    await ctx.db.delete(args.goalId);
    return null;
  },
});

/**
 * Delete a milestone from a goal
 */
export const deleteMilestone = mutation({
  args: {
    goalId: v.id("passportGoals"),
    milestoneId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.goalId);
    if (!existing) {
      throw new Error("Goal not found");
    }

    const milestones = (existing.milestones ?? []).filter(
      (m) => m.id !== args.milestoneId
    );

    // Recalculate progress based on remaining milestones
    const completedCount = milestones.filter((m) => m.completed).length;
    const progress =
      milestones.length > 0
        ? Math.round((completedCount / milestones.length) * 100)
        : 0;

    await ctx.db.patch(args.goalId, {
      milestones,
      progress,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Update a milestone description
 */
export const updateMilestone = mutation({
  args: {
    goalId: v.id("passportGoals"),
    milestoneId: v.string(),
    description: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.goalId);
    if (!existing) {
      throw new Error("Goal not found");
    }

    const milestones = (existing.milestones ?? []).map((m) =>
      m.id === args.milestoneId
        ? {
            ...m,
            description: args.description,
          }
        : m
    );

    await ctx.db.patch(args.goalId, {
      milestones,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Mark a completed milestone as incomplete
 */
export const uncompleteMilestone = mutation({
  args: {
    goalId: v.id("passportGoals"),
    milestoneId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.goalId);
    if (!existing) {
      throw new Error("Goal not found");
    }

    const milestones = (existing.milestones ?? []).map((m) =>
      m.id === args.milestoneId
        ? {
            ...m,
            completed: false,
            completedDate: undefined,
          }
        : m
    );

    // Recalculate progress based on milestones
    const completedCount = milestones.filter((m) => m.completed).length;
    const progress =
      milestones.length > 0
        ? Math.round((completedCount / milestones.length) * 100)
        : 0;

    await ctx.db.patch(args.goalId, {
      milestones,
      progress,
      updatedAt: Date.now(),
    });

    return null;
  },
});
