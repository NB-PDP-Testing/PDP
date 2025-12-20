import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import type { Doc as BetterAuthDoc } from "@pdp/backend/convex/betterAuth/_generated/dataModel";

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
 * Get enriched coach assignments with team details
 * Returns team names and sport codes for easier UI rendering
 */
export const getCoachAssignmentsWithTeams = query({
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
      teamIds: v.array(v.string()),
      teams: v.array(
        v.object({
          teamId: v.string(),
          teamName: v.string(),
          sportCode: v.optional(v.string()),
          ageGroup: v.optional(v.string()),
          gender: v.optional(
            v.union(v.literal("Boys"), v.literal("Girls"), v.literal("Mixed"))
          ),
          isActive: v.optional(v.boolean()),
        })
      ),
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

    if (!assignment) {
      return null;
    }

    // Fetch all teams for this organization
    const allTeamsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "team",
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

    const allTeams = allTeamsResult.page as BetterAuthDoc<"team">[];

    // Create a map of team NAME to team details (teams are stored by name in assignments)
    const teamMap = new Map(
      allTeams.map((team) => [team.name, team])
    );

    // Map assignment team NAMES to team details
    const teams = assignment.teams.map((teamName) => {
      const team = teamMap.get(teamName);
      return {
        teamId: team?._id ?? teamName, // Use actual team ID if found, fallback to name
        teamName: teamName,
        sportCode: team?.sport,
        ageGroup: team?.ageGroup,
        gender: team?.gender,
        isActive: team?.isActive,
      };
    });

    return {
      ...assignment,
      teamIds: assignment.teams,
      teams,
    };
  },
});

/**
 * Debug query to check coach assignments and team data
 */
export const debugCoachData = query({
  args: {
    userId: v.string(),
    organizationId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Get coach assignment
    const assignment = await ctx.db
      .query("coachAssignments")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!assignment) {
      return {
        error: "No coach assignment found",
        userId: args.userId,
        organizationId: args.organizationId,
      };
    }

    // Get team details
    const allTeamsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "team",
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

    const allTeams = allTeamsResult.page as BetterAuthDoc<"team">[];

    // Get team memberships
    const teamMemberships = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return {
      assignment,
      allTeams: allTeams.map((t) => ({
        _id: t._id,
        name: t.name,
        sport: t.sport,
      })),
      assignedTeamIds: assignment.teams,
      teamMemberships: teamMemberships.map((tm) => ({
        teamId: tm.teamId,
        playerIdentityId: tm.playerIdentityId,
        status: tm.status,
      })),
      teamMembershipsInCoachTeams: teamMemberships.filter((tm) =>
        assignment.teams.includes(tm.teamId)
      ),
    };
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
