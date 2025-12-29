import type { Doc as BetterAuthDoc } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { v } from "convex/values";
import { components } from "../_generated/api";
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
            v.union(
              v.literal("Male"),
              v.literal("Female"),
              v.literal("Mixed"),
              v.literal("Boys"),
              v.literal("Girls")
            )
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

    // Create maps for both ID and name lookups (supports both old name-based and new ID-based assignments)
    const teamByIdMap = new Map(
      allTeams.map((team) => [String(team._id), team])
    );
    const teamByNameMap = new Map(allTeams.map((team) => [team.name, team]));

    // Map assignment teams (could be IDs or names) to team details
    const teams = assignment.teams.map((teamValue) => {
      // Try to find by ID first (new format), then by name (old format)
      const team = teamByIdMap.get(teamValue) || teamByNameMap.get(teamValue);
      return {
        teamId: team?._id ?? teamValue,
        teamName: team?.name ?? teamValue, // Use actual name if found
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
    teams: v.array(v.string()), // Should be team IDs
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

/**
 * Migration: Convert coach assignments from team NAMES to team IDs
 * This fixes the issue where team renames break coach dashboards
 */
export const migrateCoachAssignmentsToTeamIds = mutation({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    assignmentsUpdated: v.number(),
    conversions: v.array(
      v.object({
        userId: v.string(),
        teamName: v.string(),
        teamId: v.string(),
      })
    ),
    warnings: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    // Get all teams for this organization
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

    // Create maps for both name->id and id->id lookups
    const teamNameToId = new Map(allTeams.map((t) => [t.name, t._id]));
    const teamIdSet = new Set(allTeams.map((t) => String(t._id)));

    // Get all coach assignments for this organization
    const coachAssignments = await ctx.db
      .query("coachAssignments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    let assignmentsUpdated = 0;
    const conversions: { userId: string; teamName: string; teamId: string }[] =
      [];
    const warnings: string[] = [];

    for (const assignment of coachAssignments) {
      let needsUpdate = false;
      const updatedTeams: string[] = [];

      for (const teamValue of assignment.teams) {
        // Check if already an ID
        if (teamIdSet.has(teamValue)) {
          updatedTeams.push(teamValue);
          continue;
        }

        // Try to convert name to ID
        const teamId = teamNameToId.get(teamValue);
        if (teamId) {
          updatedTeams.push(teamId);
          conversions.push({
            userId: assignment.userId,
            teamName: teamValue,
            teamId,
          });
          needsUpdate = true;
        } else {
          // Unknown team name - skip it
          warnings.push(
            `User ${assignment.userId}: Unknown team "${teamValue}" - removed`
          );
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await ctx.db.patch(assignment._id, {
          teams: updatedTeams,
          updatedAt: Date.now(),
        });
        assignmentsUpdated++;
      }
    }

    return {
      assignmentsUpdated,
      conversions,
      warnings,
    };
  },
});
