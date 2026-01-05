import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// ============================================================
// PLATFORM-WIDE FLOW QUERIES
// ============================================================

/**
 * Get active flows for the current user (platform-wide only)
 * Evaluates trigger conditions and returns applicable flows
 */
export const getActiveFlowsForUser = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    // Get all active platform-scoped flows
    const allFlows = await ctx.db
      .query("flows")
      .withIndex("by_scope", (q) => q.eq("scope", "platform"))
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    // Filter flows based on trigger conditions and target audience
    const applicableFlows = [];

    for (const flow of allFlows) {
      // Check if within date range
      const now = Date.now();
      if (flow.startDate && now < flow.startDate) continue;
      if (flow.endDate && now > flow.endDate) continue;

      // Check if user has already completed/dismissed this flow
      const progress = await ctx.db
        .query("userFlowProgress")
        .withIndex("by_user_and_flow", (q) =>
          q.eq("userId", user._id).eq("flowId", flow._id)
        )
        .first();

      if (
        progress?.status === "completed" ||
        progress?.status === "dismissed"
      ) {
        continue;
      }

      applicableFlows.push({
        ...flow,
        progress: progress || null,
      });
    }

    // Sort by priority (blocking > high > medium > low)
    const priorityOrder = { blocking: 0, high: 1, medium: 2, low: 3 };
    applicableFlows.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    return applicableFlows;
  },
});

/**
 * Get flows for user's current organization
 * Called when user is viewing a specific organization
 */
export const getOrganizationFlows = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    // Get organization-scoped flows
    const orgFlows = await ctx.db
      .query("flows")
      .withIndex("by_organization_and_active", (q) =>
        q.eq("organizationId", args.organizationId).eq("active", true)
      )
      .collect();

    // Filter based on user's role in the organization
    const userMembership = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "userId",
            value: user._id,
            operator: "eq",
          },
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    if (!userMembership) return [];

    // Filter flows based on targetAudience
    const applicableFlows = [];

    for (const flow of orgFlows) {
      // Check date range
      const now = Date.now();
      if (flow.startDate && now < flow.startDate) continue;
      if (flow.endDate && now > flow.endDate) continue;

      // Check target audience
      if (flow.targetAudience === "all_members") {
        applicableFlows.push(flow);
        continue;
      }

      if (flow.targetAudience === "admins") {
        if (
          userMembership.role === "admin" ||
          userMembership.role === "owner"
        ) {
          applicableFlows.push(flow);
        }
        continue;
      }

      if (flow.targetAudience === "coaches") {
        // Check if user is a coach in this org
        const isCoach = await checkIfUserIsCoach(
          ctx,
          user._id,
          args.organizationId
        );
        if (isCoach) {
          applicableFlows.push(flow);
        }
        continue;
      }

      if (flow.targetAudience === "parents") {
        // Check if user is a parent/guardian in this org
        const isParent = await checkIfUserIsParent(
          ctx,
          user._id,
          args.organizationId
        );
        if (isParent) {
          applicableFlows.push(flow);
        }
        continue;
      }

      if (flow.targetAudience === "specific_teams" && flow.targetTeamIds) {
        // Check if user is member of any target teams
        const userTeams = await getUserTeams(
          ctx,
          user._id,
          args.organizationId
        );
        const hasMatchingTeam = flow.targetTeamIds.some((teamId) =>
          userTeams.includes(teamId)
        );
        if (hasMatchingTeam) {
          applicableFlows.push(flow);
        }
      }
    }

    // Filter out flows user has already completed/dismissed
    const applicableFlowsWithProgress = [];
    for (const flow of applicableFlows) {
      const progress = await ctx.db
        .query("userFlowProgress")
        .withIndex("by_user_and_flow", (q) =>
          q.eq("userId", user._id).eq("flowId", flow._id)
        )
        .first();

      if (
        progress?.status === "completed" ||
        progress?.status === "dismissed"
      ) {
        continue;
      }

      applicableFlowsWithProgress.push({
        ...flow,
        progress: progress || null,
      });
    }

    // Sort by priority
    const priorityOrder = { blocking: 0, high: 1, medium: 2, low: 3 };
    applicableFlowsWithProgress.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    return applicableFlowsWithProgress;
  },
});

// ============================================================
// FLOW PROGRESS MUTATIONS
// ============================================================

/**
 * Start a flow for the current user
 */
export const startFlow = mutation({
  args: {
    flowId: v.id("flows"),
  },
  returns: v.id("userFlowProgress"),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Check if progress already exists
    const existing = await ctx.db
      .query("userFlowProgress")
      .withIndex("by_user_and_flow", (q) =>
        q.eq("userId", user._id).eq("flowId", args.flowId)
      )
      .first();

    if (existing) {
      // Update existing progress
      await ctx.db.patch(existing._id, {
        status: "in_progress",
        startedAt: existing.startedAt || Date.now(),
      });
      return existing._id;
    }

    // Create new progress
    return await ctx.db.insert("userFlowProgress", {
      userId: user._id,
      flowId: args.flowId,
      currentStepId: undefined,
      completedStepIds: [],
      status: "in_progress",
      startedAt: Date.now(),
      interactionCount: 0,
    });
  },
});

/**
 * Complete a step in a flow
 */
export const completeFlowStep = mutation({
  args: {
    flowId: v.id("flows"),
    stepId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const progress = await ctx.db
      .query("userFlowProgress")
      .withIndex("by_user_and_flow", (q) =>
        q.eq("userId", user._id).eq("flowId", args.flowId)
      )
      .first();

    if (!progress) throw new Error("Flow progress not found");

    // Add step to completed steps
    const completedStepIds = [...progress.completedStepIds, args.stepId];

    // Check if all steps are completed
    const flow = await ctx.db.get(args.flowId);
    if (!flow) throw new Error("Flow not found");

    const allStepsCompleted = flow.steps.every((step) =>
      completedStepIds.includes(step.id)
    );

    await ctx.db.patch(progress._id, {
      completedStepIds,
      currentStepId: undefined,
      status: allStepsCompleted ? "completed" : "in_progress",
      completedAt: allStepsCompleted ? Date.now() : undefined,
      interactionCount: progress.interactionCount + 1,
    });

    return null;
  },
});

/**
 * Dismiss a flow without completing it
 */
export const dismissFlow = mutation({
  args: {
    flowId: v.id("flows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const progress = await ctx.db
      .query("userFlowProgress")
      .withIndex("by_user_and_flow", (q) =>
        q.eq("userId", user._id).eq("flowId", args.flowId)
      )
      .first();

    if (!progress) throw new Error("Flow progress not found");

    await ctx.db.patch(progress._id, {
      status: "dismissed",
      dismissedAt: Date.now(),
    });

    return null;
  },
});

// ============================================================
// ORGANIZATION FLOW MANAGEMENT
// ============================================================

/**
 * Create a flow (organization-scoped)
 * Organization admins can create flows for their org members
 */
export const createOrganizationFlow = mutation({
  args: {
    organizationId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("announcement"),
      v.literal("action_required"),
      v.literal("system_alert")
    ),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    targetAudience: v.union(
      v.literal("all_members"),
      v.literal("coaches"),
      v.literal("parents"),
      v.literal("admins")
    ),
    targetTeamIds: v.optional(v.array(v.string())),
    steps: v.array(v.any()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.id("flows"),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Verify user is admin of this organization
    const membership = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "userId", value: user._id, operator: "eq" },
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    if (
      !membership ||
      (membership.role !== "admin" && membership.role !== "owner")
    ) {
      throw new Error("Only organization admins can create flows");
    }

    // Create the flow
    const flowId = await ctx.db.insert("flows", {
      name: args.name,
      description: args.description,
      type: args.type,
      priority: args.priority,
      scope: "organization",
      organizationId: args.organizationId,
      targetAudience: args.targetAudience,
      targetTeamIds: args.targetTeamIds,
      triggers: [
        { type: "organization_member", organizationId: args.organizationId },
      ],
      targetRoles: undefined,
      targetOrganizations: [args.organizationId],
      steps: args.steps,
      startDate: args.startDate,
      endDate: args.endDate,
      active: true,
      createdBy: user._id,
      createdByRole: "org_admin",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return flowId;
  },
});

/**
 * Update an organization flow
 */
export const updateOrganizationFlow = mutation({
  args: {
    flowId: v.id("flows"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),
    targetAudience: v.optional(
      v.union(
        v.literal("all_members"),
        v.literal("coaches"),
        v.literal("parents"),
        v.literal("admins")
      )
    ),
    steps: v.optional(v.array(v.any())),
    active: v.optional(v.boolean()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const flow = await ctx.db.get(args.flowId);
    if (!flow) throw new Error("Flow not found");

    // Verify user is admin of this organization
    if (flow.organizationId) {
      const membership = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "member",
          where: [
            { field: "userId", value: user._id, operator: "eq" },
            {
              field: "organizationId",
              value: flow.organizationId,
              operator: "eq",
            },
          ],
        }
      );

      if (
        !membership ||
        (membership.role !== "admin" && membership.role !== "owner")
      ) {
        throw new Error("Only organization admins can update flows");
      }
    }

    // Update the flow
    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.targetAudience !== undefined)
      updates.targetAudience = args.targetAudience;
    if (args.steps !== undefined) updates.steps = args.steps;
    if (args.active !== undefined) updates.active = args.active;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.endDate !== undefined) updates.endDate = args.endDate;

    await ctx.db.patch(args.flowId, updates);

    return null;
  },
});

/**
 * Delete an organization flow
 */
export const deleteOrganizationFlow = mutation({
  args: {
    flowId: v.id("flows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const flow = await ctx.db.get(args.flowId);
    if (!flow) throw new Error("Flow not found");

    // Verify user is admin of this organization
    if (flow.organizationId) {
      const membership = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "member",
          where: [
            { field: "userId", value: user._id, operator: "eq" },
            {
              field: "organizationId",
              value: flow.organizationId,
              operator: "eq",
            },
          ],
        }
      );

      if (
        !membership ||
        (membership.role !== "admin" && membership.role !== "owner")
      ) {
        throw new Error("Only organization admins can delete flows");
      }
    }

    await ctx.db.delete(args.flowId);

    return null;
  },
});

/**
 * Get all flows for organization (for admin management)
 */
export const getAllOrganizationFlows = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Verify user is admin of this organization
    const membership = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "userId", value: user._id, operator: "eq" },
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    if (
      !membership ||
      (membership.role !== "admin" && membership.role !== "owner")
    ) {
      throw new Error("Only organization admins can view all flows");
    }

    // Get all organization flows (including inactive)
    const flows = await ctx.db
      .query("flows")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return flows;
  },
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function checkIfUserIsCoach(
  ctx: any,
  userId: string,
  orgId: string
): Promise<boolean> {
  const assignments = await ctx.db
    .query("coachAssignments")
    .filter((q: any) =>
      q.and(
        q.eq(q.field("userId"), userId),
        q.eq(q.field("organizationId"), orgId)
      )
    )
    .first();

  return !!assignments;
}

async function checkIfUserIsParent(
  ctx: any,
  userId: string,
  orgId: string
): Promise<boolean> {
  const guardianIdentity = await ctx.db
    .query("guardianIdentities")
    .filter((q: any) =>
      q.and(
        q.eq(q.field("userId"), userId),
        q.eq(q.field("organizationId"), orgId)
      )
    )
    .first();

  return !!guardianIdentity;
}

async function getUserTeams(
  ctx: any,
  userId: string,
  orgId: string
): Promise<string[]> {
  // Check coach team assignments
  const coachAssignments = await ctx.db
    .query("coachAssignments")
    .filter((q: any) =>
      q.and(
        q.eq(q.field("userId"), userId),
        q.eq(q.field("organizationId"), orgId)
      )
    )
    .collect();

  const teamIds = coachAssignments.map((a: any) => a.teamId);

  return [...new Set(teamIds)];
}
