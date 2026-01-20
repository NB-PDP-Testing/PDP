import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Validator for task return object (shared across queries)
const taskReturnValidator = v.object({
  _id: v.id("coachTasks"),
  _creationTime: v.number(),
  text: v.string(),
  completed: v.boolean(),
  organizationId: v.string(),
  assignedToUserId: v.string(),
  assignedToName: v.optional(v.string()),
  createdByUserId: v.string(),
  coachEmail: v.optional(v.string()), // Legacy field
  priority: v.optional(
    v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
  ),
  dueDate: v.optional(v.number()),
  source: v.union(v.literal("manual"), v.literal("voice_note")),
  voiceNoteId: v.optional(v.id("voiceNotes")),
  insightId: v.optional(v.string()),
  playerIdentityId: v.optional(v.id("orgPlayerEnrollments")),
  playerName: v.optional(v.string()),
  teamId: v.optional(v.string()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
});

/**
 * Get all tasks assigned to a specific coach (by user ID)
 * Includes both personal tasks and team tasks assigned to them
 */
export const getTasksForUser = query({
  args: {
    userId: v.string(),
    organizationId: v.string(),
    includeCompleted: v.optional(v.boolean()),
  },
  returns: v.array(taskReturnValidator),
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("coachTasks")
      .withIndex("by_assigned_user_and_org", (q) =>
        q
          .eq("assignedToUserId", args.userId)
          .eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter completed if needed
    if (args.includeCompleted === false) {
      return tasks.filter((t) => !t.completed);
    }

    return tasks;
  },
});

/**
 * Get all tasks for a team (visible to all team members)
 */
export const getTasksForTeam = query({
  args: {
    teamId: v.string(),
    organizationId: v.string(),
    includeCompleted: v.optional(v.boolean()),
  },
  returns: v.array(taskReturnValidator),
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("coachTasks")
      .withIndex("by_team_and_org", (q) =>
        q.eq("teamId", args.teamId).eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter completed if needed
    if (args.includeCompleted === false) {
      return tasks.filter((t) => !t.completed);
    }

    return tasks;
  },
});

/**
 * Get all tasks for an organization (admin view)
 */
export const getTasksForOrg = query({
  args: {
    organizationId: v.string(),
    includeCompleted: v.optional(v.boolean()),
  },
  returns: v.array(taskReturnValidator),
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("coachTasks")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    if (args.includeCompleted === false) {
      return tasks.filter((t) => !t.completed);
    }

    return tasks;
  },
});

/**
 * Legacy query - get tasks by coach email (for backward compatibility)
 * @deprecated Use getTasksForUser instead
 */
export const getTasksForCoach = query({
  args: {
    coachEmail: v.string(),
    organizationId: v.string(),
  },
  returns: v.array(taskReturnValidator),
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
 * Create a new task (manual entry)
 */
export const createTask = mutation({
  args: {
    text: v.string(),
    organizationId: v.string(),
    assignedToUserId: v.string(),
    assignedToName: v.optional(v.string()),
    createdByUserId: v.string(),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    dueDate: v.optional(v.number()),
    playerIdentityId: v.optional(v.id("orgPlayerEnrollments")),
    playerName: v.optional(v.string()),
    teamId: v.optional(v.string()),
    // Legacy field for backward compatibility
    coachEmail: v.optional(v.string()),
  },
  returns: v.id("coachTasks"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const taskId = await ctx.db.insert("coachTasks", {
      text: args.text,
      completed: false,
      organizationId: args.organizationId,
      assignedToUserId: args.assignedToUserId,
      assignedToName: args.assignedToName,
      createdByUserId: args.createdByUserId,
      coachEmail: args.coachEmail,
      priority: args.priority,
      dueDate: args.dueDate,
      source: "manual",
      playerIdentityId: args.playerIdentityId,
      playerName: args.playerName,
      teamId: args.teamId,
      createdAt: now,
    });

    return taskId;
  },
});

/**
 * Create a task from a voice note insight
 * Called automatically when classifying an insight as TODO
 */
export const createTaskFromInsight = mutation({
  args: {
    text: v.string(),
    organizationId: v.string(),
    assignedToUserId: v.string(),
    assignedToName: v.optional(v.string()),
    createdByUserId: v.string(),
    voiceNoteId: v.id("voiceNotes"),
    insightId: v.string(),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    dueDate: v.optional(v.number()),
    playerIdentityId: v.optional(v.id("orgPlayerEnrollments")),
    playerName: v.optional(v.string()),
    teamId: v.optional(v.string()),
  },
  returns: v.id("coachTasks"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const taskId = await ctx.db.insert("coachTasks", {
      text: args.text,
      completed: false,
      organizationId: args.organizationId,
      assignedToUserId: args.assignedToUserId,
      assignedToName: args.assignedToName,
      createdByUserId: args.createdByUserId,
      source: "voice_note",
      voiceNoteId: args.voiceNoteId,
      insightId: args.insightId,
      priority: args.priority,
      dueDate: args.dueDate,
      playerIdentityId: args.playerIdentityId,
      playerName: args.playerName,
      teamId: args.teamId,
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
 * Update task text, priority, or due date
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

    const updates: Record<string, unknown> = {};
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

/**
 * Reassign a task to a different coach
 */
export const reassignTask = mutation({
  args: {
    taskId: v.id("coachTasks"),
    newAssigneeUserId: v.string(),
    newAssigneeName: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    await ctx.db.patch(args.taskId, {
      assignedToUserId: args.newAssigneeUserId,
      assignedToName: args.newAssigneeName,
    });

    return { success: true };
  },
});

/**
 * Get tasks linked to a specific voice note
 */
export const getTasksForVoiceNote = query({
  args: {
    voiceNoteId: v.id("voiceNotes"),
  },
  returns: v.array(taskReturnValidator),
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("coachTasks")
      .withIndex("by_voice_note", (q) => q.eq("voiceNoteId", args.voiceNoteId))
      .collect();

    return tasks;
  },
});
