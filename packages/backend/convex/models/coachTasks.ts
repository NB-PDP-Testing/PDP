import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Get all tasks for a specific coach in an organization
 */
export const getTasksForCoach = query({
  args: {
    coachEmail: v.string(),
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("coachTasks"),
      _creationTime: v.number(),
      text: v.string(),
      completed: v.boolean(),
      coachEmail: v.string(),
      organizationId: v.string(),
      priority: v.optional(
        v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
      ),
      dueDate: v.optional(v.number()),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("coachTasks")
      .withIndex("by_coach_and_org", (q) =>
        q
          .eq("coachEmail", args.coachEmail)
          .eq("organizationId", args.organizationId)
      )
      .collect();

    return tasks;
  },
});

/**
 * Create a new task for a coach
 */
export const createTask = mutation({
  args: {
    text: v.string(),
    coachEmail: v.string(),
    organizationId: v.string(),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    dueDate: v.optional(v.number()),
  },
  returns: v.id("coachTasks"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const taskId = await ctx.db.insert("coachTasks", {
      text: args.text,
      completed: false,
      coachEmail: args.coachEmail,
      organizationId: args.organizationId,
      priority: args.priority,
      dueDate: args.dueDate,
      createdAt: now,
    });

    return taskId;
  },
});

/**
 * Toggle task completion status
 */
export const toggleTask = mutation({
  args: {
    taskId: v.id("coachTasks"),
    completed: v.boolean(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      completed: args.completed,
      completedAt: args.completed ? now : undefined,
    });

    return { success: true };
  },
});

/**
 * Delete a task
 */
export const deleteTask = mutation({
  args: {
    taskId: v.id("coachTasks"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    await ctx.db.delete(args.taskId);
    return { success: true };
  },
});

/**
 * Update task text or priority
 */
export const updateTask = mutation({
  args: {
    taskId: v.id("coachTasks"),
    text: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    dueDate: v.optional(v.number()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const updates: any = {};
    if (args.text !== undefined) {
      updates.text = args.text;
    }
    if (args.priority !== undefined) {
      updates.priority = args.priority;
    }
    if (args.dueDate !== undefined) {
      updates.dueDate = args.dueDate;
    }

    await ctx.db.patch(args.taskId, updates);
    return { success: true };
  },
});
