import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Get all coach assignments for an organization
 */
export const getCoachAssignmentsByOrganization = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("coachAssignments"),
      _creationTime: v.number(),
      userId: v.string(),
      organizationId: v.string(),
      teams: v.array(v.string()),
      ageGroups: v.array(v.string()),
      sport: v.optional(v.string()),
      roles: v.optional(v.array(v.string())),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("coachAssignments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    return assignments;
  },
});

/**
 * Get assignments for a specific coach
 */
export const getCoachAssignments = query({
  args: {
    userId: v.string(),
    organizationId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("coachAssignments"),
      _creationTime: v.number(),
      userId: v.string(),
      organizationId: v.string(),
      teams: v.array(v.string()),
      ageGroups: v.array(v.string()),
      sport: v.optional(v.string()),
      roles: v.optional(v.array(v.string())),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query("coachAssignments")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();
    return assignment || null;
  },
});

/**
 * Update coach assignments (teams, age groups, sport, roles)
 * Creates a new assignment if one doesn't exist
 */
export const updateCoachAssignments = mutation({
  args: {
    userId: v.string(),
    organizationId: v.string(),
    teams: v.array(v.string()),
    ageGroups: v.array(v.string()),
    sport: v.optional(v.string()),
    roles: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("coachAssignments")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    if (existing) {
      // Update existing assignment
      await ctx.db.patch(existing._id, {
        teams: args.teams,
        ageGroups: args.ageGroups,
        sport: args.sport,
        roles: args.roles,
        updatedAt: Date.now(),
      });
    } else {
      // Create new assignment
      await ctx.db.insert("coachAssignments", {
        userId: args.userId,
        organizationId: args.organizationId,
        teams: args.teams,
        ageGroups: args.ageGroups,
        sport: args.sport,
        roles: args.roles,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});
