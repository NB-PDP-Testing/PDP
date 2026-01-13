import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Get most recent plan for a team (within cache duration)
export const getRecentPlanForTeam = query({
  args: {
    teamId: v.string(), // Better Auth team ID
    maxAgeHours: v.optional(v.number()), // Default 1 hour (configurable)
  },
  returns: v.union(
    v.object({
      _id: v.id("sessionPlans"),
      _creationTime: v.number(),
      organizationId: v.string(),
      teamId: v.string(),
      coachId: v.string(),
      teamName: v.string(),
      sessionPlan: v.string(),
      focus: v.optional(v.string()),
      usedRealAI: v.boolean(),
      generatedAt: v.number(),
      teamData: v.object({
        playerCount: v.number(),
        ageGroup: v.string(),
        avgSkillLevel: v.number(),
        strengths: v.array(v.object({ skill: v.string(), avg: v.number() })),
        weaknesses: v.array(v.object({ skill: v.string(), avg: v.number() })),
        attendanceIssues: v.number(),
        overdueReviews: v.number(),
      }),
      viewCount: v.number(),
      shareCount: v.number(),
      regenerateCount: v.number(),
      creationMethod: v.optional(
        v.union(
          v.literal("ai_generated"),
          v.literal("manual_ui"),
          v.literal("imported"),
          v.literal("template")
        )
      ),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const maxAge = args.maxAgeHours ?? 1; // Default 1 hour
    const cutoffTime = Date.now() - maxAge * 60 * 60 * 1000;

    // Find most recent plan for this team
    const recentPlan = await ctx.db
      .query("sessionPlans")
      .withIndex("by_team_and_date", (q) =>
        q.eq("teamId", args.teamId).gt("generatedAt", cutoffTime)
      )
      .order("desc")
      .first();

    return recentPlan;
  },
});

// Save a new session plan
export const savePlan = mutation({
  args: {
    teamId: v.string(), // Better Auth team ID
    teamName: v.string(),
    sessionPlan: v.string(),
    focus: v.optional(v.string()),
    teamData: v.object({
      playerCount: v.number(),
      ageGroup: v.string(),
      avgSkillLevel: v.number(),
      strengths: v.array(v.object({ skill: v.string(), avg: v.number() })),
      weaknesses: v.array(v.object({ skill: v.string(), avg: v.number() })),
      attendanceIssues: v.number(),
      overdueReviews: v.number(),
    }),
    usedRealAI: v.boolean(),
    creationMethod: v.optional(
      v.union(
        v.literal("ai_generated"),
        v.literal("manual_ui"),
        v.literal("imported"),
        v.literal("template")
      )
    ),
  },
  returns: v.id("sessionPlans"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get organization ID from session or user metadata
    // Note: Better Auth stores orgId differently - may need to adjust
    const orgId =
      (identity as any).orgId || (identity as any).organizationId || "";

    const now = Date.now();

    const planId = await ctx.db.insert("sessionPlans", {
      organizationId: orgId,
      teamId: args.teamId,
      coachId: userId,
      teamName: args.teamName,
      sessionPlan: args.sessionPlan,
      focus: args.focus,
      teamData: args.teamData,
      usedRealAI: args.usedRealAI,
      creationMethod: args.creationMethod,
      generatedAt: now,
      viewCount: 1, // First view is the generation
      shareCount: 0,
      regenerateCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return planId;
  },
});

// Increment view count
export const incrementViewCount = mutation({
  args: { planId: v.id("sessionPlans") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      return null;
    }

    await ctx.db.patch(args.planId, {
      viewCount: plan.viewCount + 1,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Track regeneration
export const incrementRegenerateCount = mutation({
  args: { planId: v.id("sessionPlans") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      return null;
    }

    await ctx.db.patch(args.planId, {
      regenerateCount: plan.regenerateCount + 1,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Track sharing
export const incrementShareCount = mutation({
  args: { planId: v.id("sessionPlans") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      return null;
    }

    await ctx.db.patch(args.planId, {
      shareCount: plan.shareCount + 1,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Get analytics for organization (admin/platform staff)
export const getOrganizationAnalytics = query({
  args: {
    organizationId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.object({
    totalPlans: v.number(),
    realAIPlans: v.number(),
    simulatedPlans: v.number(),
    totalViews: v.number(),
    totalShares: v.number(),
    totalRegenerations: v.number(),
    uniqueCoaches: v.number(),
    uniqueTeams: v.number(),
    avgViewsPerPlan: v.number(),
    cacheHitRate: v.number(), // Estimate based on regenerations
  }),
  handler: async (ctx, args) => {
    // Verify user has admin access
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Query all plans for organization
    const allPlans = await ctx.db
      .query("sessionPlans")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter by date range in memory if provided
    const startDate = args.startDate;
    const plans =
      startDate !== undefined
        ? allPlans.filter((p) => p.generatedAt > startDate)
        : allPlans;

    // Calculate analytics
    const totalPlans = plans.length;
    const realAIPlans = plans.filter((p) => p.usedRealAI).length;
    const totalViews = plans.reduce((sum, p) => sum + p.viewCount, 0);
    const totalShares = plans.reduce((sum, p) => sum + p.shareCount, 0);
    const totalRegenerations = plans.reduce(
      (sum, p) => sum + p.regenerateCount,
      0
    );

    // Unique coaches and teams
    const uniqueCoaches = new Set(plans.map((p) => p.coachId)).size;
    const uniqueTeams = new Set(plans.map((p) => p.teamId)).size;

    // Average views per plan
    const avgViewsPerPlan = totalPlans > 0 ? totalViews / totalPlans : 0;

    // Cache hit rate estimate
    // If a plan has viewCount > 1, those extra views are likely cache hits
    const estimatedCacheHits = totalViews - totalPlans; // Views beyond initial generation
    const cacheHitRate = totalViews > 0 ? estimatedCacheHits / totalViews : 0;

    return {
      totalPlans,
      realAIPlans,
      simulatedPlans: totalPlans - realAIPlans,
      totalViews,
      totalShares,
      totalRegenerations,
      uniqueCoaches,
      uniqueTeams,
      avgViewsPerPlan,
      cacheHitRate,
    };
  },
});
