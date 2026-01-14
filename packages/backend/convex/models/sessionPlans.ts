import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, mutation, query } from "../_generated/server";

/**
 * Session Plans - Complete Backend Implementation
 *
 * This file handles:
 * - Session plan generation and storage
 * - Visibility and sharing to club library
 * - Admin moderation
 * - Drill library effectiveness tracking
 * - Feedback and analytics
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify user has coach role in organization
 */
async function getCoachForOrg(ctx: any, userId: string, orgId: string) {
  const member = await ctx.db
    .query("member")
    .withIndex("by_userId_and_organizationId", (q: any) =>
      q.eq("userId", userId).eq("organizationId", orgId)
    )
    .first();

  if (!member) {
    throw new Error("User is not a member of this organization");
  }

  // Check if user has coach functional role
  const functionalRoles = member.functionalRoles || [];
  if (!functionalRoles.includes("coach")) {
    throw new Error("User does not have coach role in this organization");
  }

  return member;
}

/**
 * Normalize drill names for consistent matching
 */
function normalizeDrillName(name: string): string {
  return name.toLowerCase().trim();
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Generate and save a new session plan
 * Creates a draft plan and schedules AI generation
 */
export const generateAndSave = mutation({
  args: {
    organizationId: v.string(),
    teamId: v.optional(v.string()),
    teamName: v.string(),
    ageGroup: v.optional(v.string()),
    playerCount: v.number(),
    focusArea: v.optional(v.string()),
    duration: v.optional(v.number()),
  },
  returns: v.id("sessionPlans"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Verify coach role
    const _member = await getCoachForOrg(ctx, userId, args.organizationId);

    const now = Date.now();

    // Create draft plan
    const planId = await ctx.db.insert("sessionPlans", {
      organizationId: args.organizationId,
      coachId: userId,
      coachName:
        `${identity.given_name || ""} ${identity.family_name || ""}`.trim() ||
        identity.email ||
        "Unknown Coach",
      teamId: args.teamId,
      teamName: args.teamName,
      playerCount: args.playerCount,
      title: `Session Plan - ${args.teamName}`,
      rawContent: "", // Will be filled by AI
      focusArea: args.focusArea,
      duration: args.duration || 90,
      sections: [],
      sport: undefined,
      ageGroup: args.ageGroup,
      drills: [],
      isTemplate: false,
      isFeatured: false,
      timesUsed: 0,
      favorited: false,
      visibility: "private",
      status: "draft",
      usedInSession: false,
      feedbackSubmitted: false,
      feedbackUsedForTraining: false,
      createdAt: now,
      updatedAt: now,
    });

    // Schedule AI generation
    await ctx.scheduler.runAfter(
      0,
      internal.actions.sessionPlans.generatePlanContent,
      {
        planId,
      }
    );

    return planId;
  },
});

/**
 * Update plan content (called by AI action)
 * Internal mutation - not exposed to frontend
 */
export const updatePlanContent = internalMutation({
  args: {
    planId: v.id("sessionPlans"),
    title: v.string(),
    rawContent: v.string(),
    sections: v.array(
      v.object({
        id: v.string(),
        type: v.union(
          v.literal("warmup"),
          v.literal("technical"),
          v.literal("tactical"),
          v.literal("games"),
          v.literal("cooldown"),
          v.literal("custom")
        ),
        title: v.string(),
        duration: v.number(),
        order: v.number(),
        activities: v.array(
          v.object({
            id: v.string(),
            name: v.string(),
            description: v.string(),
            duration: v.optional(v.number()),
            order: v.number(),
            activityType: v.union(
              v.literal("drill"),
              v.literal("game"),
              v.literal("exercise"),
              v.literal("demonstration"),
              v.literal("discussion"),
              v.literal("rest")
            ),
          })
        ),
      })
    ),
    status: v.union(v.literal("saved"), v.literal("draft")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.planId, {
      title: args.title,
      rawContent: args.rawContent,
      sections: args.sections,
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update plan visibility (sharing to club library)
 */
export const updateVisibility = mutation({
  args: {
    planId: v.id("sessionPlans"),
    visibility: v.union(
      v.literal("private"),
      v.literal("club"),
      v.literal("platform")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Verify ownership
    if (plan.coachId !== identity.subject) {
      throw new Error("Not authorized to modify this plan");
    }

    const now = Date.now();
    const updates: any = {
      visibility: args.visibility,
      updatedAt: now,
    };

    // If sharing to club, record sharing metadata
    if (args.visibility === "club" && plan.visibility !== "club") {
      updates.sharedAt = now;
      updates.sharedBy = plan.coachName;
    }

    await ctx.db.patch(args.planId, updates);
  },
});

/**
 * Duplicate an existing plan
 */
export const duplicatePlan = mutation({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.id("sessionPlans"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const originalPlan = await ctx.db.get(args.planId);
    if (!originalPlan) {
      throw new Error("Plan not found");
    }

    // Verify access - either owner or plan is in club library
    if (
      originalPlan.coachId !== identity.subject &&
      originalPlan.visibility !== "club"
    ) {
      throw new Error("Not authorized to duplicate this plan");
    }

    const now = Date.now();

    // Create duplicate
    const newPlanId = await ctx.db.insert("sessionPlans", {
      ...originalPlan,
      coachId: identity.subject,
      coachName:
        `${identity.given_name || ""} ${identity.family_name || ""}`.trim() ||
        identity.email ||
        "Unknown Coach",
      title: `${originalPlan.title} (Copy)`,
      visibility: "private", // Duplicates are always private
      sharedAt: undefined,
      sharedBy: undefined,
      moderatedBy: undefined,
      moderatedAt: undefined,
      moderationNote: undefined,
      pinnedByAdmin: false,
      timesUsed: 0,
      lastUsedDate: undefined,
      usedInSession: false,
      usedDate: undefined,
      feedbackSubmitted: false,
      simplifiedFeedback: undefined,
      createdAt: now,
      updatedAt: now,
      archivedAt: undefined,
    });

    return newPlanId;
  },
});

/**
 * Mark plan as used in actual session
 */
export const markAsUsed = mutation({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Verify ownership
    if (plan.coachId !== identity.subject) {
      throw new Error("Not authorized to modify this plan");
    }

    const now = Date.now();

    await ctx.db.patch(args.planId, {
      usedInSession: true,
      usedDate: now,
      timesUsed: (plan.timesUsed || 0) + 1,
      lastUsedDate: now,
      updatedAt: now,
    });
  },
});

/**
 * Archive a plan with success/failed status
 */
export const archivePlan = mutation({
  args: {
    planId: v.id("sessionPlans"),
    success: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Verify ownership
    if (plan.coachId !== identity.subject) {
      throw new Error("Not authorized to modify this plan");
    }

    const now = Date.now();

    await ctx.db.patch(args.planId, {
      status: args.success ? "archived_success" : "archived_failed",
      archivedAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Soft delete a plan
 */
export const deletePlan = mutation({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Verify ownership
    if (plan.coachId !== identity.subject) {
      throw new Error("Not authorized to delete this plan");
    }

    await ctx.db.patch(args.planId, {
      status: "deleted",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Admin: Remove plan from club library
 */
export const removeFromClubLibrary = mutation({
  args: {
    planId: v.id("sessionPlans"),
    moderatorId: v.string(),
    moderatorName: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Verify admin role
    const member = await ctx.db
      .query("member")
      .withIndex("by_userId_and_organizationId", (q: any) =>
        q
          .eq("userId", identity.subject)
          .eq("organizationId", plan.organizationId)
      )
      .first();

    if (!member) {
      throw new Error("Not a member of this organization");
    }

    const isAdmin = member.role === "admin" || member.role === "owner";
    if (!isAdmin) {
      throw new Error("Not authorized - admin role required");
    }

    const now = Date.now();

    await ctx.db.patch(args.planId, {
      visibility: "private", // Revert to private
      moderatedBy: args.moderatorName,
      moderatedAt: now,
      moderationNote: args.reason,
      updatedAt: now,
    });
  },
});

/**
 * Admin: Pin/unpin a featured plan
 */
export const pinPlan = mutation({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Verify admin role
    const member = await ctx.db
      .query("member")
      .withIndex("by_userId_and_organizationId", (q: any) =>
        q
          .eq("userId", identity.subject)
          .eq("organizationId", plan.organizationId)
      )
      .first();

    if (!member) {
      throw new Error("Not a member of this organization");
    }

    const isAdmin = member.role === "admin" || member.role === "owner";
    if (!isAdmin) {
      throw new Error("Not authorized - admin role required");
    }

    await ctx.db.patch(args.planId, {
      pinnedByAdmin: true,
      updatedAt: Date.now(),
    });
  },
});

export const unpinPlan = mutation({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Verify admin role
    const member = await ctx.db
      .query("member")
      .withIndex("by_userId_and_organizationId", (q: any) =>
        q
          .eq("userId", identity.subject)
          .eq("organizationId", plan.organizationId)
      )
      .first();

    if (!member) {
      throw new Error("Not a member of this organization");
    }

    const isAdmin = member.role === "admin" || member.role === "owner";
    if (!isAdmin) {
      throw new Error("Not authorized - admin role required");
    }

    await ctx.db.patch(args.planId, {
      pinnedByAdmin: false,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Submit feedback on a session plan
 */
export const submitFeedback = mutation({
  args: {
    planId: v.id("sessionPlans"),
    sessionFeedback: v.union(v.literal("positive"), v.literal("negative")),
    drillFeedback: v.optional(
      v.array(
        v.object({
          drillId: v.string(),
          drillName: v.string(),
          feedback: v.union(v.literal("positive"), v.literal("negative")),
          negativeReason: v.optional(v.string()),
        })
      )
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Verify ownership
    if (plan.coachId !== identity.subject) {
      throw new Error("Not authorized to provide feedback on this plan");
    }

    const now = Date.now();

    // Update plan feedback
    await ctx.db.patch(args.planId, {
      feedbackSubmitted: true,
      simplifiedFeedback: {
        sessionFeedback: args.sessionFeedback,
        sessionFeedbackAt: now,
        drillFeedback: args.drillFeedback?.map((df) => ({
          ...df,
          feedbackAt: now,
        })),
        feedbackVariant: "one_click",
      },
      updatedAt: now,
    });

    // Update drill library effectiveness (if drill feedback provided)
    if (args.drillFeedback && args.drillFeedback.length > 0) {
      for (const drillFb of args.drillFeedback) {
        const normalizedName = normalizeDrillName(drillFb.drillName);

        // Find or create drill library entry
        const existingDrill = await ctx.db
          .query("drillLibrary")
          .withIndex("by_org_and_name", (q: any) =>
            q
              .eq("organizationId", plan.organizationId)
              .eq("normalizedName", normalizedName)
          )
          .first();

        if (existingDrill) {
          // Update existing drill
          const newPositiveCount =
            existingDrill.positiveCount +
            (drillFb.feedback === "positive" ? 1 : 0);
          const newNegativeCount =
            existingDrill.negativeCount +
            (drillFb.feedback === "negative" ? 1 : 0);
          const newTotalUses = existingDrill.totalUses + 1;
          const newSuccessRate =
            newTotalUses > 0 ? (newPositiveCount / newTotalUses) * 100 : 0;

          await ctx.db.patch(existingDrill._id, {
            totalUses: newTotalUses,
            positiveCount: newPositiveCount,
            negativeCount: newNegativeCount,
            successRate: newSuccessRate,
            updatedAt: now,
          });
        } else {
          // Create new drill library entry
          await ctx.db.insert("drillLibrary", {
            organizationId: plan.organizationId,
            name: drillFb.drillName,
            normalizedName,
            description: "", // Will be populated over time
            activityType: "drill",
            skillsFocused: [],
            equipment: [],
            totalUses: 1,
            positiveCount: drillFb.feedback === "positive" ? 1 : 0,
            negativeCount: drillFb.feedback === "negative" ? 1 : 0,
            successRate: drillFb.feedback === "positive" ? 100 : 0,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List coach's private plans
 */
export const listForCoach = query({
  args: {
    organizationId: v.string(),
    coachId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify requesting user is the coach
    if (identity.subject !== args.coachId) {
      throw new Error("Not authorized");
    }

    const plans = await ctx.db
      .query("sessionPlans")
      .withIndex("by_org_and_coach", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("coachId", args.coachId)
      )
      .filter((q: any) =>
        q.and(
          q.eq(q.field("visibility"), "private"),
          q.neq(q.field("status"), "deleted")
        )
      )
      .collect();

    // Sort by creation date descending
    return plans.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * List club library (organization-shared plans)
 */
export const listClubLibrary = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify user is member of organization
    const member = await ctx.db
      .query("member")
      .withIndex("by_userId_and_organizationId", (q: any) =>
        q
          .eq("userId", identity.subject)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!member) {
      throw new Error("Not a member of this organization");
    }

    const plans = await ctx.db
      .query("sessionPlans")
      .withIndex("by_org_and_visibility", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("visibility", "club")
      )
      .filter((q: any) => q.neq(q.field("status"), "deleted"))
      .collect();

    // Sort pinned first, then by shared date descending
    return plans.sort((a, b) => {
      if (a.pinnedByAdmin && !b.pinnedByAdmin) {
        return -1;
      }
      if (!a.pinnedByAdmin && b.pinnedByAdmin) {
        return 1;
      }
      return (b.sharedAt || 0) - (a.sharedAt || 0);
    });
  },
});

/**
 * List all plans for admin moderation
 */
export const listForAdmin = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify admin role
    const member = await ctx.db
      .query("member")
      .withIndex("by_userId_and_organizationId", (q: any) =>
        q
          .eq("userId", identity.subject)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!member) {
      throw new Error("Not a member of this organization");
    }

    const isAdmin = member.role === "admin" || member.role === "owner";
    if (!isAdmin) {
      throw new Error("Not authorized - admin role required");
    }

    const plans = await ctx.db
      .query("sessionPlans")
      .withIndex("by_org", (q: any) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Sort by creation date descending
    return plans.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get a specific plan by ID
 */
export const getPlanById = query({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      return null;
    }

    // Check access - must be owner or plan must be in club library
    if (plan.coachId !== identity.subject && plan.visibility !== "club") {
      // Check if user is admin
      const member = await ctx.db
        .query("member")
        .withIndex("by_userId_and_organizationId", (q: any) =>
          q
            .eq("userId", identity.subject)
            .eq("organizationId", plan.organizationId)
        )
        .first();

      const isAdmin =
        member && (member.role === "admin" || member.role === "owner");
      if (!isAdmin) {
        throw new Error("Not authorized to view this plan");
      }
    }

    return plan;
  },
});

/**
 * Get drill library with aggregated effectiveness data
 */
export const getDrillLibrary = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify user is member of organization
    const member = await ctx.db
      .query("member")
      .withIndex("by_userId_and_organizationId", (q: any) =>
        q
          .eq("userId", identity.subject)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!member) {
      throw new Error("Not a member of this organization");
    }

    const drills = await ctx.db
      .query("drillLibrary")
      .withIndex("by_org", (q: any) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Sort by success rate descending
    return drills.sort((a, b) => b.successRate - a.successRate);
  },
});

/**
 * Get organization-wide session plan statistics
 */
export const getStats = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    totalPlans: v.number(),
    usedPlans: v.number(),
    successfulPlans: v.number(),
    failedPlans: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify user is member of organization
    const member = await ctx.db
      .query("member")
      .withIndex("by_userId_and_organizationId", (q: any) =>
        q
          .eq("userId", identity.subject)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!member) {
      throw new Error("Not a member of this organization");
    }

    const allPlans = await ctx.db
      .query("sessionPlans")
      .withIndex("by_org", (q: any) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q: any) => q.neq(q.field("status"), "deleted"))
      .collect();

    return {
      totalPlans: allPlans.length,
      usedPlans: allPlans.filter((p) => p.usedInSession).length,
      successfulPlans: allPlans.filter((p) => p.status === "archived_success")
        .length,
      failedPlans: allPlans.filter((p) => p.status === "archived_failed")
        .length,
    };
  },
});
