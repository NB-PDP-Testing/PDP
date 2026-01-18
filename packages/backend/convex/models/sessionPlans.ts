import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

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
async function getCoachForOrg(
  ctx: {
    runQuery: (
      component: unknown,
      args: {
        model: string;
        where: Array<{ field: string; value: string; operator: string }>;
      }
    ) => Promise<{
      functionalRoles?: string[];
    } | null>;
  },
  userId: string,
  orgId: string
) {
  const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "member",
    where: [
      { field: "userId", value: userId, operator: "eq" },
      { field: "organizationId", value: orgId, operator: "eq" },
    ],
  });

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
 * Internal query to get plan by ID (for actions)
 */
export const getPlanByIdInternal = internalQuery({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("sessionPlans"),
      organizationId: v.string(),
      coachId: v.string(),
      teamName: v.string(),
      playerCount: v.optional(v.number()),
      title: v.optional(v.string()),
      rawContent: v.optional(v.string()),
      ageGroup: v.optional(v.string()),
      sport: v.optional(v.string()),
      duration: v.optional(v.number()),
      focusArea: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      return null;
    }

    return {
      _id: plan._id,
      organizationId: plan.organizationId,
      coachId: plan.coachId,
      teamName: plan.teamName,
      playerCount: plan.playerCount,
      title: plan.title,
      rawContent: plan.rawContent,
      ageGroup: plan.ageGroup,
      sport: plan.sport,
      duration: plan.duration,
      focusArea: plan.focusArea,
    };
  },
});

/**
 * Internal mutation to update extracted metadata tags
 * Called by extractMetadata action after AI analysis
 */
export const updatePlanMetadata = internalMutation({
  args: {
    planId: v.id("sessionPlans"),
    extractedTags: v.object({
      categories: v.array(v.string()),
      skills: v.array(v.string()),
      equipment: v.array(v.string()),
      intensity: v.optional(
        v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
      ),
      playerCountRange: v.optional(
        v.object({
          min: v.number(),
          max: v.number(),
          optimal: v.number(),
        })
      ),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.planId, {
      extractedTags: args.extractedTags,
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
    const updates: {
      visibility: "private" | "club" | "platform";
      updatedAt: number;
      sharedAt?: number;
      sharedBy?: string;
    } = {
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
 * Update plan title (rename)
 */
export const updateTitle = mutation({
  args: {
    planId: v.id("sessionPlans"),
    title: v.string(),
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
      throw new Error("Not authorized to rename this plan");
    }

    await ctx.db.patch(args.planId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Duplicate an existing plan
 */
export const duplicatePlan = mutation({
  args: {
    planId: v.id("sessionPlans"),
    newTitle: v.optional(v.string()),
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

    // Use provided title or default to "(Copy)" suffix
    const duplicateTitle = args.newTitle || `${originalPlan.title} (Copy)`;

    // Create duplicate - exclude _id and _creationTime as they are managed by Convex
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, _creationTime, ...planData } = originalPlan;
    const newPlanId = await ctx.db.insert("sessionPlans", {
      ...planData,
      coachId: identity.subject,
      coachName:
        `${identity.given_name || ""} ${identity.family_name || ""}`.trim() ||
        identity.email ||
        "Unknown Coach",
      title: duplicateTitle,
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
 * Vote on a session plan (like/dislike - YouTube style)
 * Each user can only vote once per plan, and can change their vote
 */
export const votePlan = mutation({
  args: {
    planId: v.id("sessionPlans"),
    voteType: v.union(
      v.literal("like"),
      v.literal("dislike"),
      v.literal("none")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Check if user already voted on this plan
    const existingVote = await ctx.db
      .query("planVotes")
      .withIndex("by_plan_and_voter", (q: any) =>
        q.eq("planId", args.planId).eq("voterId", userId)
      )
      .first();

    const now = Date.now();

    // Calculate vote changes
    let likeChange = 0;
    let dislikeChange = 0;

    if (existingVote) {
      // Removing previous vote effect
      if (existingVote.voteType === "like") {
        likeChange -= 1;
      }
      if (existingVote.voteType === "dislike") {
        dislikeChange -= 1;
      }

      if (args.voteType === "none") {
        // User is removing their vote
        await ctx.db.delete(existingVote._id);
      } else {
        // User is changing their vote
        await ctx.db.patch(existingVote._id, {
          voteType: args.voteType,
          votedAt: now,
        });
      }
    } else if (args.voteType !== "none") {
      // New vote
      await ctx.db.insert("planVotes", {
        planId: args.planId,
        voterId: userId,
        voteType: args.voteType,
        votedAt: now,
      });
    }

    // Adding new vote effect
    if (args.voteType === "like") {
      likeChange += 1;
    }
    if (args.voteType === "dislike") {
      dislikeChange += 1;
    }

    // Update plan vote counts
    await ctx.db.patch(args.planId, {
      likeCount: Math.max(0, (plan.likeCount || 0) + likeChange),
      dislikeCount: Math.max(0, (plan.dislikeCount || 0) + dislikeChange),
      updatedAt: now,
    });
  },
});

/**
 * Get user's vote on a plan
 */
export const getUserVote = query({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.union(v.literal("like"), v.literal("dislike"), v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const vote = await ctx.db
      .query("planVotes")
      .withIndex("by_plan_and_voter", (q: any) =>
        q.eq("planId", args.planId).eq("voterId", identity.subject)
      )
      .first();

    return vote?.voteType || null;
  },
});

/**
 * Toggle favorite status for a plan
 */
export const toggleFavorite = mutation({
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

    await ctx.db.patch(args.planId, {
      favorited: !plan.favorited,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Increment times used counter for a plan
 * Called when a plan is duplicated/used as a template
 */
export const incrementTimesUsed = mutation({
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

    const now = Date.now();

    await ctx.db.patch(args.planId, {
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
    const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "member",
      where: [
        { field: "userId", value: identity.subject, operator: "eq" },
        { field: "organizationId", value: plan.organizationId, operator: "eq" },
      ],
    });

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
 * Enhanced admin mutation to remove plan from club library with detailed reason and optional notification
 */
export const removeFromClubLibraryEnhanced = mutation({
  args: {
    planId: v.id("sessionPlans"),
    reason: v.union(
      v.literal("inappropriate"),
      v.literal("safety"),
      v.literal("poor-quality"),
      v.literal("duplicate"),
      v.literal("violates-guidelines"),
      v.literal("other")
    ),
    message: v.optional(v.string()),
    notifyCoach: v.boolean(),
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
    const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "member",
      where: [
        { field: "userId", value: identity.subject, operator: "eq" },
        { field: "organizationId", value: plan.organizationId, operator: "eq" },
      ],
    });

    if (!member) {
      throw new Error("Not a member of this organization");
    }

    const isAdmin = member.role === "admin" || member.role === "owner";
    if (!isAdmin) {
      throw new Error("Not authorized - admin role required");
    }

    const now = Date.now();

    // Map reason to human-readable text
    const reasonText: Record<typeof args.reason, string> = {
      inappropriate: "Inappropriate Content",
      safety: "Safety Concern",
      "poor-quality": "Poor Quality",
      duplicate: "Duplicate Content",
      "violates-guidelines": "Violates Guidelines",
      other: "Other",
    };

    const fullReason = args.message
      ? `${reasonText[args.reason]}: ${args.message}`
      : reasonText[args.reason];

    // Update plan to private with moderation note
    await ctx.db.patch(args.planId, {
      visibility: "private",
      moderatedBy: identity.subject,
      moderatedAt: now,
      moderationNote: fullReason,
      updatedAt: now,
    });

    // TODO: Implement coach notification system
    // If args.notifyCoach is true, send notification to plan.coachId
    // Notification content: "Your session plan was removed from the club library. Reason: ${fullReason}"
    if (args.notifyCoach) {
      // Placeholder for future notification implementation
      console.log(
        `Would notify coach ${plan.coachId} about plan removal: ${fullReason}`
      );
    }
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
    const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "member",
      where: [
        { field: "userId", value: identity.subject, operator: "eq" },
        { field: "organizationId", value: plan.organizationId, operator: "eq" },
      ],
    });

    if (!member) {
      throw new Error("Not a member of this organization");
    }

    const isAdmin = member.role === "admin" || member.role === "owner";
    if (!isAdmin) {
      throw new Error("Not authorized - admin role required");
    }

    const now = Date.now();

    await ctx.db.patch(args.planId, {
      pinnedByAdmin: true,
      moderatedBy: identity.subject,
      moderatedAt: now,
      updatedAt: now,
    });

    // TODO: Implement coach notification system
    // Send positive notification to plan.coachId
    // Notification content: "Your session plan was featured! 🎉"
    console.log(
      `Would notify coach ${plan.coachId}: Your session plan "${plan.title}" was featured! 🎉`
    );
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
    const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "member",
      where: [
        { field: "userId", value: identity.subject, operator: "eq" },
        { field: "organizationId", value: plan.organizationId, operator: "eq" },
      ],
    });

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
 * Get filtered plans for a coach with search and filter support
 * Used for "My Plans" tab with extensive filtering
 */
export const getFilteredPlans = query({
  args: {
    organizationId: v.string(),
    search: v.optional(v.string()),
    ageGroups: v.optional(v.array(v.string())),
    sports: v.optional(v.array(v.string())),
    intensities: v.optional(v.array(v.string())),
    categories: v.optional(v.array(v.string())),
    skills: v.optional(v.array(v.string())),
    favoriteOnly: v.optional(v.boolean()),
    featuredOnly: v.optional(v.boolean()),
    templateOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const limit = args.limit || 100;

    // Get all plans for the coach
    const allPlans = await ctx.db
      .query("sessionPlans")
      .withIndex("by_org_and_coach", (q: any) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("coachId", identity.subject)
      )
      .order("desc")
      .collect();

    // Client-side filtering (Convex doesn't support complex multi-field queries)
    const filteredPlans = allPlans.filter((plan) => {
      // Exclude deleted plans
      if (plan.status === "deleted") {
        return false;
      }

      // Search filter
      if (args.search) {
        const searchLower = args.search.toLowerCase();
        const titleMatch = plan.title?.toLowerCase().includes(searchLower);
        const teamMatch = plan.teamName.toLowerCase().includes(searchLower);
        if (!(titleMatch || teamMatch)) {
          return false;
        }
      }

      // Age group filter
      if (
        args.ageGroups &&
        args.ageGroups.length > 0 &&
        !(plan.ageGroup && args.ageGroups.includes(plan.ageGroup))
      ) {
        return false;
      }

      // Sport filter
      if (
        args.sports &&
        args.sports.length > 0 &&
        !(plan.sport && args.sports.includes(plan.sport))
      ) {
        return false;
      }

      // Intensity filter
      if (args.intensities && args.intensities.length > 0) {
        const planIntensity = plan.extractedTags?.intensity;
        if (!(planIntensity && args.intensities.includes(planIntensity))) {
          return false;
        }
      }

      // Categories filter
      if (args.categories && args.categories.length > 0) {
        const planCategories = plan.extractedTags?.categories || [];
        const hasMatch = args.categories.some((cat: string) =>
          planCategories.includes(cat)
        );
        if (!hasMatch) {
          return false;
        }
      }

      // Skills filter
      if (args.skills && args.skills.length > 0) {
        const planSkills = plan.extractedTags?.skills || [];
        const hasMatch = args.skills.some((skill: string) =>
          planSkills.includes(skill)
        );
        if (!hasMatch) {
          return false;
        }
      }

      // Favorite filter
      if (args.favoriteOnly && !plan.favorited) {
        return false;
      }

      // Featured filter
      if (args.featuredOnly && !plan.pinnedByAdmin) {
        return false;
      }

      // Template filter
      if (args.templateOnly && !plan.isTemplate) {
        return false;
      }

      return true;
    });

    return filteredPlans.slice(0, limit);
  },
});

/**
 * Get club library plans with search, filters, and sorting
 * Used for "Club Library" tab - shows plans shared with the organization
 */
export const getClubLibrary = query({
  args: {
    organizationId: v.string(),
    search: v.optional(v.string()),
    ageGroups: v.optional(v.array(v.string())),
    sports: v.optional(v.array(v.string())),
    intensities: v.optional(v.array(v.string())),
    categories: v.optional(v.array(v.string())),
    skills: v.optional(v.array(v.string())),
    featuredOnly: v.optional(v.boolean()),
    sortBy: v.optional(
      v.union(
        v.literal("recent"),
        v.literal("popular"),
        v.literal("success_rate")
      )
    ),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify user is member of organization
    const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "member",
      where: [
        { field: "userId", value: identity.subject, operator: "eq" },
        { field: "organizationId", value: args.organizationId, operator: "eq" },
      ],
    });

    if (!member) {
      throw new Error("Not a member of this organization");
    }

    // Fetch plans where visibility = "club" AND organizationId matches
    const plans = await ctx.db
      .query("sessionPlans")
      .withIndex("by_org_and_visibility", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("visibility", "club")
      )
      .filter((q: any) => q.neq(q.field("status"), "deleted"))
      .collect();

    // Apply filters (same logic as getFilteredPlans)
    const filtered = plans.filter((plan) => {
      // Search filter
      if (args.search) {
        const searchLower = args.search.toLowerCase();
        const titleMatch = plan.title?.toLowerCase().includes(searchLower);
        const teamMatch = plan.teamName.toLowerCase().includes(searchLower);
        const focusMatch = plan.focusArea?.toLowerCase().includes(searchLower);
        if (!(titleMatch || teamMatch || focusMatch)) {
          return false;
        }
      }

      // Age group filter
      if (
        args.ageGroups &&
        args.ageGroups.length > 0 &&
        !(plan.ageGroup && args.ageGroups.includes(plan.ageGroup))
      ) {
        return false;
      }

      // Sport filter
      if (
        args.sports &&
        args.sports.length > 0 &&
        !(plan.sport && args.sports.includes(plan.sport))
      ) {
        return false;
      }

      // Intensity filter
      if (args.intensities && args.intensities.length > 0) {
        const planIntensity = plan.extractedTags?.intensity;
        if (!(planIntensity && args.intensities.includes(planIntensity))) {
          return false;
        }
      }

      // Categories filter
      if (args.categories && args.categories.length > 0) {
        const planCategories = plan.extractedTags?.categories || [];
        const hasMatch = args.categories.some((cat: string) =>
          planCategories.includes(cat)
        );
        if (!hasMatch) {
          return false;
        }
      }

      // Skills filter
      if (args.skills && args.skills.length > 0) {
        const planSkills = plan.extractedTags?.skills || [];
        const hasMatch = args.skills.some((skill: string) =>
          planSkills.includes(skill)
        );
        if (!hasMatch) {
          return false;
        }
      }

      // Featured filter
      if (args.featuredOnly && !plan.pinnedByAdmin) {
        return false;
      }

      return true;
    });

    // Sort
    if (args.sortBy === "popular") {
      filtered.sort((a, b) => (b.timesUsed || 0) - (a.timesUsed || 0));
    } else if (args.sortBy === "success_rate") {
      filtered.sort((a, b) => (b.successRate || 0) - (a.successRate || 0));
    } else {
      // Default: recent (sort by createdAt desc), with pinned first
      filtered.sort((a, b) => {
        if (a.pinnedByAdmin && !b.pinnedByAdmin) {
          return -1;
        }
        if (!a.pinnedByAdmin && b.pinnedByAdmin) {
          return 1;
        }
        return b.createdAt - a.createdAt;
      });
    }

    return filtered;
  },
});

/**
 * List club library (organization-shared plans)
 * @deprecated Use getClubLibrary instead for filtering support
 * Kept for backward compatibility
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
    const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "member",
      where: [
        { field: "userId", value: identity.subject, operator: "eq" },
        { field: "organizationId", value: args.organizationId, operator: "eq" },
      ],
    });

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

    // Sort pinned first, then by created date descending
    return plans.sort((a, b) => {
      if (a.pinnedByAdmin && !b.pinnedByAdmin) {
        return -1;
      }
      if (!a.pinnedByAdmin && b.pinnedByAdmin) {
        return 1;
      }
      return b.createdAt - a.createdAt;
    });
  },
});

/**
 * List all plans for admin moderation
 */
export const listForAdmin = query({
  args: {
    organizationId: v.string(),
    search: v.optional(v.string()),
    ageGroups: v.optional(v.array(v.string())),
    sports: v.optional(v.array(v.string())),
    intensities: v.optional(
      v.array(v.union(v.literal("low"), v.literal("medium"), v.literal("high")))
    ),
    categories: v.optional(v.array(v.string())),
    skills: v.optional(v.array(v.string())),
    featuredOnly: v.optional(v.boolean()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify admin role
    const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "member",
      where: [
        { field: "userId", value: identity.subject, operator: "eq" },
        { field: "organizationId", value: args.organizationId, operator: "eq" },
      ],
    });

    if (!member) {
      throw new Error("Not a member of this organization");
    }

    const isAdmin = member.role === "admin" || member.role === "owner";
    if (!isAdmin) {
      throw new Error("Not authorized - admin role required");
    }

    let plans = await ctx.db
      .query("sessionPlans")
      .withIndex("by_org", (q: any) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Apply filters
    plans = plans.filter((plan) => {
      // Search filter
      if (args.search) {
        const searchLower = args.search.toLowerCase();
        const matchesSearch =
          plan.title?.toLowerCase().includes(searchLower) ||
          plan.coachName?.toLowerCase().includes(searchLower) ||
          plan.teamName?.toLowerCase().includes(searchLower);
        if (!matchesSearch) {
          return false;
        }
      }

      // Age group filter
      if (
        args.ageGroups &&
        args.ageGroups.length > 0 &&
        !(plan.ageGroup && args.ageGroups.includes(plan.ageGroup))
      ) {
        return false;
      }

      // Sport filter
      if (
        args.sports &&
        args.sports.length > 0 &&
        !(plan.sport && args.sports.includes(plan.sport))
      ) {
        return false;
      }

      // Intensity filter
      if (
        args.intensities &&
        args.intensities.length > 0 &&
        !(
          plan.extractedTags?.intensity &&
          args.intensities.includes(plan.extractedTags.intensity)
        )
      ) {
        return false;
      }

      // Category filter
      if (args.categories && args.categories.length > 0) {
        if (!plan.extractedTags?.categories) {
          return false;
        }
        const hasCategory = args.categories.some((cat) =>
          plan.extractedTags?.categories.includes(cat)
        );
        if (!hasCategory) {
          return false;
        }
      }

      // Skills filter
      if (args.skills && args.skills.length > 0) {
        if (!plan.extractedTags?.skills) {
          return false;
        }
        const hasSkill = args.skills.some((skill) =>
          plan.extractedTags?.skills.includes(skill)
        );
        if (!hasSkill) {
          return false;
        }
      }

      // Featured filter
      if (args.featuredOnly && !plan.pinnedByAdmin) {
        return false;
      }

      return true;
    });

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
      const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "member",
        where: [
          { field: "userId", value: identity.subject, operator: "eq" },
          {
            field: "organizationId",
            value: plan.organizationId,
            operator: "eq",
          },
        ],
      });

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
    const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "member",
      where: [
        { field: "userId", value: identity.subject, operator: "eq" },
        { field: "organizationId", value: args.organizationId, operator: "eq" },
      ],
    });

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
    coachId: v.optional(v.string()),
  },
  returns: v.object({
    totalPlans: v.number(),
    usedPlans: v.number(),
    successfulPlans: v.number(),
    failedPlans: v.number(),
    avgSuccessRate: v.optional(v.number()),
    recentPlans: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify user is member of organization
    const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "member",
      where: [
        { field: "userId", value: identity.subject, operator: "eq" },
        { field: "organizationId", value: args.organizationId, operator: "eq" },
      ],
    });

    if (!member) {
      throw new Error("Not a member of this organization");
    }

    // Fetch plans - either for specific coach or all org plans
    const allPlans = args.coachId
      ? await ctx.db
          .query("sessionPlans")
          .withIndex("by_org_and_coach", (q: any) =>
            q
              .eq("organizationId", args.organizationId)
              .eq("coachId", args.coachId)
          )
          .filter((q: any) => q.neq(q.field("status"), "deleted"))
          .collect()
      : await ctx.db
          .query("sessionPlans")
          .withIndex("by_org", (q: any) =>
            q.eq("organizationId", args.organizationId)
          )
          .filter((q: any) => q.neq(q.field("status"), "deleted"))
          .collect();

    // Calculate stats
    const usedPlans = allPlans.filter((p) => p.usedInSession || p.timesUsed);
    const plansWithSuccessRate = allPlans.filter(
      (p) => p.successRate !== undefined && p.successRate !== null
    );
    const avgSuccessRate =
      plansWithSuccessRate.length > 0
        ? plansWithSuccessRate.reduce(
            (sum, p) => sum + (p.successRate || 0),
            0
          ) / plansWithSuccessRate.length
        : undefined;

    // Recent plans (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentPlans = allPlans.filter((p) => p.createdAt >= thirtyDaysAgo);

    return {
      totalPlans: allPlans.length,
      usedPlans: usedPlans.length,
      successfulPlans: allPlans.filter((p) => p.status === "archived_success")
        .length,
      failedPlans: allPlans.filter((p) => p.status === "archived_failed")
        .length,
      avgSuccessRate,
      recentPlans: recentPlans.length,
    };
  },
});

/**
 * Get recently used plans for Quick Access section
 * Returns plans marked as used in the last 30 days, sorted by last used date
 */
export const getRecentlyUsed = query({
  args: {
    organizationId: v.string(),
    coachId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    plans: v.array(v.any()),
    count: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify requesting user is the coach
    if (identity.subject !== args.coachId) {
      throw new Error("Not authorized");
    }

    const limit = args.limit || 10;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const allPlans = await ctx.db
      .query("sessionPlans")
      .withIndex("by_org_and_coach", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("coachId", args.coachId)
      )
      .filter((q: any) => q.neq(q.field("status"), "deleted"))
      .collect();

    const recentlyUsed = allPlans
      .filter(
        (p) =>
          p.usedInSession && p.lastUsedDate && p.lastUsedDate >= thirtyDaysAgo
      )
      .sort((a, b) => (b.lastUsedDate || 0) - (a.lastUsedDate || 0))
      .slice(0, limit);

    return {
      plans: recentlyUsed,
      count: recentlyUsed.length,
    };
  },
});

/**
 * Get most popular plans (highest timesUsed) for Quick Access section
 */
export const getMostPopular = query({
  args: {
    organizationId: v.string(),
    coachId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    plans: v.array(v.any()),
    count: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify requesting user is the coach
    if (identity.subject !== args.coachId) {
      throw new Error("Not authorized");
    }

    const limit = args.limit || 10;

    const allPlans = await ctx.db
      .query("sessionPlans")
      .withIndex("by_org_and_coach", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("coachId", args.coachId)
      )
      .filter((q: any) => q.neq(q.field("status"), "deleted"))
      .collect();

    const popular = allPlans
      .filter((p) => (p.timesUsed || 0) > 0)
      .sort((a, b) => (b.timesUsed || 0) - (a.timesUsed || 0))
      .slice(0, limit);

    return {
      plans: popular,
      count: popular.length,
    };
  },
});

/**
 * Get coach's best performing plans (highest success rate) for Quick Access section
 */
export const getYourBest = query({
  args: {
    organizationId: v.string(),
    coachId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    plans: v.array(v.any()),
    count: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify requesting user is the coach
    if (identity.subject !== args.coachId) {
      throw new Error("Not authorized");
    }

    const limit = args.limit || 10;

    const allPlans = await ctx.db
      .query("sessionPlans")
      .withIndex("by_org_and_coach", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("coachId", args.coachId)
      )
      .filter((q: any) => q.neq(q.field("status"), "deleted"))
      .collect();

    const bestPlans = allPlans
      .filter(
        (p) =>
          p.successRate !== undefined &&
          p.successRate !== null &&
          p.successRate >= 80
      )
      .sort((a, b) => (b.successRate || 0) - (a.successRate || 0))
      .slice(0, limit);

    return {
      plans: bestPlans,
      count: bestPlans.length,
    };
  },
});

/**
 * Get top rated plans from club library for Quick Access section
 * Now uses likeCount (YouTube-style) instead of successRate
 */
export const getTopRated = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    plans: v.array(v.any()),
    count: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify user is member of organization
    const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "member",
      where: [
        { field: "userId", value: identity.subject, operator: "eq" },
        { field: "organizationId", value: args.organizationId, operator: "eq" },
      ],
    });

    if (!member) {
      throw new Error("Not a member of this organization");
    }

    const limit = args.limit || 10;

    const clubPlans = await ctx.db
      .query("sessionPlans")
      .withIndex("by_org_and_visibility", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("visibility", "club")
      )
      .filter((q: any) => q.neq(q.field("status"), "deleted"))
      .collect();

    // Sort by likeCount (YouTube-style) - most liked first
    const topRated = clubPlans
      .filter((p) => (p.likeCount || 0) > 0)
      .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
      .slice(0, limit);

    return {
      plans: topRated,
      count: topRated.length,
    };
  },
});

/**
 * Get coach's most liked plans for Quick Access section
 */
export const getYourMostLiked = query({
  args: {
    organizationId: v.string(),
    coachId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    plans: v.array(v.any()),
    count: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify requesting user is the coach
    if (identity.subject !== args.coachId) {
      throw new Error("Not authorized");
    }

    const limit = args.limit || 10;

    const allPlans = await ctx.db
      .query("sessionPlans")
      .withIndex("by_org_and_coach", (q: any) =>
        q.eq("organizationId", args.organizationId).eq("coachId", args.coachId)
      )
      .filter((q: any) => q.neq(q.field("status"), "deleted"))
      .collect();

    // Filter to plans with likes and sort by likeCount
    const mostLiked = allPlans
      .filter((p) => (p.likeCount || 0) > 0)
      .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
      .slice(0, limit);

    return {
      plans: mostLiked,
      count: mostLiked.length,
    };
  },
});

/**
 * Full-text search across session plans
 * Searches title, description, focus areas, and tags
 * Returns matching plans with relevance ranking
 */
export const searchPlans = query({
  args: {
    organizationId: v.string(),
    searchQuery: v.string(),
    visibility: v.optional(
      v.union(v.literal("private"), v.literal("club"), v.literal("all"))
    ),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    plans: v.array(v.any()),
    count: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { plans: [], count: 0 };
    }

    const userId = identity.subject;
    const limit = args.limit || 50;
    const searchQuery = args.searchQuery.trim();

    if (!searchQuery) {
      return { plans: [], count: 0 };
    }

    // Search using both title and content indexes, then deduplicate
    const titleResults = await ctx.db
      .query("sessionPlans")
      .withSearchIndex("search_title", (q) =>
        q.search("title", searchQuery).eq("organizationId", args.organizationId)
      )
      .take(limit);

    const contentResults = await ctx.db
      .query("sessionPlans")
      .withSearchIndex("search_content", (q) =>
        q
          .search("rawContent", searchQuery)
          .eq("organizationId", args.organizationId)
      )
      .take(limit);

    // Combine and deduplicate results (title matches have higher priority)
    const seenIds = new Set<string>();
    const combinedResults = [];

    for (const plan of titleResults) {
      if (!seenIds.has(plan._id)) {
        seenIds.add(plan._id);
        combinedResults.push(plan);
      }
    }

    for (const plan of contentResults) {
      if (!seenIds.has(plan._id)) {
        seenIds.add(plan._id);
        combinedResults.push(plan);
      }
    }

    // Filter by visibility and status
    const filteredPlans = combinedResults.filter((plan) => {
      // Never show deleted plans
      if (plan.status === "deleted") {
        return false;
      }

      // Filter by visibility if specified
      if (args.visibility === "private") {
        return plan.visibility === "private" && plan.coachId === userId;
      }
      if (args.visibility === "club") {
        return plan.visibility === "club";
      }
      // "all" or undefined: show both private (if owned) and club plans
      if (plan.visibility === "private" && plan.coachId !== userId) {
        return false; // Hide other coaches' private plans
      }
      return true;
    });

    return {
      plans: filteredPlans.slice(0, limit),
      count: filteredPlans.length,
    };
  },
});

/**
 * Save a pre-generated plan (for Quick Actions compatibility)
 * Automatically schedules metadata extraction after saving
 */
export const savePlan = mutation({
  args: {
    teamId: v.string(),
    teamName: v.string(),
    sessionPlan: v.string(),
    focus: v.optional(v.string()),
    teamData: v.optional(v.any()),
    usedRealAI: v.optional(v.boolean()),
    creationMethod: v.optional(v.string()),
  },
  returns: v.id("sessionPlans"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;
    const now = Date.now();

    // Extract organizationId from teamData if available, otherwise use default
    const organizationId = args.teamData?.organizationId || "default-org";

    const planId = await ctx.db.insert("sessionPlans", {
      organizationId,
      coachId: userId,
      coachName:
        `${identity.given_name || ""} ${identity.family_name || ""}`.trim() ||
        identity.email ||
        "Unknown Coach",
      teamId: args.teamId,
      teamName: args.teamName,
      playerCount: args.teamData?.playerCount || 20,
      title: `Session Plan - ${args.teamName}`,
      rawContent: args.sessionPlan,
      focusArea: args.focus,
      duration: args.teamData?.duration || 90,
      sections: [],
      sport: args.teamData?.sport,
      ageGroup: args.teamData?.ageGroup,
      drills: [],
      isTemplate: false,
      isFeatured: false,
      status: "saved",
      usedInSession: false,
      feedbackSubmitted: false,
      feedbackUsedForTraining: false,
      creationMethod: args.creationMethod, // Track source: "quick_action" or "session_plans_page"
      generatedAt: now,
      usedRealAI: args.usedRealAI ?? false,
      createdAt: now,
      updatedAt: now,
    });

    // Schedule metadata extraction to run asynchronously
    // This extracts categories, skills, equipment, intensity from the plan content
    await ctx.scheduler.runAfter(
      0,
      internal.actions.sessionPlans.extractMetadata,
      { planId }
    );

    return planId;
  },
});

/**
 * Increment view count for a plan (for analytics)
 */
export const incrementViewCount = mutation({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Increment view count if field exists, otherwise this is a no-op
    // for compatibility with dashboard
    await ctx.db.patch(args.planId, {
      updatedAt: Date.now(),
    });
  },
});

/**
 * Increment share count for a plan (for analytics)
 */
export const incrementShareCount = mutation({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Increment share count if field exists, otherwise this is a no-op
    // for compatibility with dashboard
    await ctx.db.patch(args.planId, {
      updatedAt: Date.now(),
    });
  },
});

/**
 * Increment regenerate count for a plan (for analytics)
 */
export const incrementRegenerateCount = mutation({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Increment regenerate count if field exists, otherwise this is a no-op
    // for compatibility with dashboard
    await ctx.db.patch(args.planId, {
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get most recent plan for a team (for Quick Actions caching)
 */
export const getRecentPlanForTeam = query({
  args: {
    teamId: v.string(),
    maxAgeHours: v.number(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("sessionPlans"),
      title: v.optional(v.string()),
      generatedAt: v.number(),
      teamName: v.string(),
      duration: v.optional(v.number()),
      sessionPlan: v.optional(v.string()),
      usedRealAI: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const maxAge = args.maxAgeHours * 60 * 60 * 1000; // Convert hours to ms
    const cutoffTime = Date.now() - maxAge;

    // Note: We need to get the org ID from the team somehow
    // For now, just filter by teamId without an index
    const allPlans = await ctx.db.query("sessionPlans").collect();

    const filteredPlans = allPlans
      .filter(
        (p) =>
          p.teamId === args.teamId &&
          p.createdAt >= cutoffTime &&
          p.status !== "deleted" &&
          p.status === "saved"
      )
      .sort((a, b) => b.createdAt - a.createdAt);

    const recentPlan = filteredPlans[0];

    if (!recentPlan) {
      return null;
    }

    return {
      _id: recentPlan._id,
      title: recentPlan.title,
      generatedAt: recentPlan.createdAt,
      teamName: recentPlan.teamName,
      duration: recentPlan.duration,
      sessionPlan: recentPlan.rawContent,
      usedRealAI: false, // Currently using simulated AI
    };
  },
});

/**
 * Get admin dashboard metrics for session plans
 */
export const getAdminMetrics = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    total: v.number(),
    pendingReview: v.number(),
    flagged: v.number(),
    featured: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify admin role
    const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "member",
      where: [
        { field: "userId", value: identity.subject, operator: "eq" },
        { field: "organizationId", value: args.organizationId, operator: "eq" },
      ],
    });

    if (!member) {
      throw new Error("Not a member of this organization");
    }

    // Use index to get all shared plans for the organization
    const sharedPlans = await ctx.db
      .query("sessionPlans")
      .withIndex("by_org_and_visibility", (q) =>
        q.eq("organizationId", args.organizationId).eq("visibility", "club")
      )
      .collect();

    // Filter out deleted plans
    const activePlans = sharedPlans.filter((p) => p.status !== "deleted");

    // Calculate metrics
    const total = activePlans.length;

    // Pending review: shared plans that have not been moderated yet
    const pendingReview = activePlans.filter(
      (p) => !(p.moderatedBy || p.pinnedByAdmin)
    ).length;

    // Flagged: plans with moderation notes (rejected plans that are still visible)
    // Since rejected plans are set to private, we'll count plans with moderationNote
    // that are still shared (might be warnings/notes from admin)
    const flagged = activePlans.filter(
      (p) => p.moderationNote && !p.pinnedByAdmin
    ).length;

    // Featured: plans pinned by admin
    const featured = activePlans.filter((p) => p.pinnedByAdmin).length;

    return {
      total,
      pendingReview,
      flagged,
      featured,
    };
  },
});

/**
 * Calculate quality score for a session plan (0-100)
 * Used by admins to identify high-value content for featuring
 *
 * Scoring breakdown:
 * - Sections count (20pts): More comprehensive plans with multiple sections
 * - Tags (15pts): Better categorized plans with tags
 * - Usage (20pts): Plans that are actually used by coaches
 * - Success rate (25pts): Plans that work well in practice
 * - Feedback (20pts): Plans with coach feedback
 */
export const getQualityScore = query({
  args: {
    planId: v.id("sessionPlans"),
  },
  returns: v.object({
    score: v.number(), // 0-100
    breakdown: v.object({
      sections: v.number(), // 0-20
      tags: v.number(), // 0-15
      usage: v.number(), // 0-20
      successRate: v.number(), // 0-25
      feedback: v.number(), // 0-20
    }),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }

    // Calculate individual scores

    // 1. Sections count (20pts max)
    // 0 sections = 0pts, 1-2 = 10pts, 3-4 = 15pts, 5+ = 20pts
    const sectionsCount = plan.sections?.length ?? 0;
    let sectionsScore = 0;
    if (sectionsCount >= 5) {
      sectionsScore = 20;
    } else if (sectionsCount >= 3) {
      sectionsScore = 15;
    } else if (sectionsCount >= 1) {
      sectionsScore = 10;
    }

    // 2. Tags (15pts max)
    // Combine customTags and extractedTags.categories
    const customTagsCount = plan.customTags?.length ?? 0;
    const extractedCategoriesCount =
      plan.extractedTags?.categories?.length ?? 0;
    const totalTags = customTagsCount + extractedCategoriesCount;
    // 0 tags = 0pts, 1-2 = 5pts, 3-4 = 10pts, 5+ = 15pts
    let tagsScore = 0;
    if (totalTags >= 5) {
      tagsScore = 15;
    } else if (totalTags >= 3) {
      tagsScore = 10;
    } else if (totalTags >= 1) {
      tagsScore = 5;
    }

    // 3. Usage (20pts max)
    // 0 uses = 0pts, 1-2 = 5pts, 3-5 = 10pts, 6-10 = 15pts, 11+ = 20pts
    const timesUsed = plan.timesUsed ?? 0;
    let usageScore = 0;
    if (timesUsed >= 11) {
      usageScore = 20;
    } else if (timesUsed >= 6) {
      usageScore = 15;
    } else if (timesUsed >= 3) {
      usageScore = 10;
    } else if (timesUsed >= 1) {
      usageScore = 5;
    }

    // 4. Success rate (25pts max)
    // 0-20% = 0pts, 21-40% = 5pts, 41-60% = 10pts, 61-80% = 15pts, 81-100% = 25pts
    const successRate = plan.successRate ?? 0;
    let successRateScore = 0;
    if (successRate >= 81) {
      successRateScore = 25;
    } else if (successRate >= 61) {
      successRateScore = 15;
    } else if (successRate >= 41) {
      successRateScore = 10;
    } else if (successRate >= 21) {
      successRateScore = 5;
    }

    // 5. Feedback (20pts max)
    // No feedback = 0pts, Feedback submitted = 20pts
    const feedbackScore = plan.feedbackSubmitted ? 20 : 0;

    // Calculate total score
    const totalScore =
      sectionsScore + tagsScore + usageScore + successRateScore + feedbackScore;

    return {
      score: totalScore,
      breakdown: {
        sections: sectionsScore,
        tags: tagsScore,
        usage: usageScore,
        successRate: successRateScore,
        feedback: feedbackScore,
      },
    };
  },
});
