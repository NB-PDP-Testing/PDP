import type { Doc as BetterAuthDoc } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
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

    // Deduplicate teams array to prevent duplicate entries
    const uniqueTeams = [...new Set(args.teams)];

    // Track team changes for notifications
    const previousTeams = existing?.teams || [];
    const newlyAssignedTeams = uniqueTeams.filter(
      (t) => !previousTeams.includes(t)
    );
    const removedTeams = previousTeams.filter((t) => !uniqueTeams.includes(t));

    if (existing) {
      // Update existing assignment
      await ctx.db.patch(existing._id, {
        teams: uniqueTeams,
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
        teams: uniqueTeams,
        ageGroups: args.ageGroups,
        sport: args.sport,
        roles: args.roles,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Send notifications for team changes
    // Get team names for notification messages
    const allTeamIds = [...newlyAssignedTeams, ...removedTeams];
    if (allTeamIds.length > 0) {
      const teamResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "team",
          paginationOpts: { cursor: null, numItems: 100 },
          where: [],
        }
      );
      const allTeams = (teamResult?.page || []) as {
        _id: string;
        name: string;
      }[];
      const teamNameMap = new Map(allTeams.map((t) => [t._id, t.name]));

      // Send notifications for newly assigned teams
      for (const teamId of newlyAssignedTeams) {
        const teamName = teamNameMap.get(teamId) || "a team";
        await ctx.runMutation(
          internal.models.notifications.createNotification,
          {
            userId: args.userId,
            organizationId: args.organizationId,
            type: "team_assigned",
            title: "Team Assignment",
            message: `You have been assigned to ${teamName}`,
            link: `/orgs/${args.organizationId}/coach`,
          }
        );
      }

      // Send notifications for removed teams
      for (const teamId of removedTeams) {
        const teamName = teamNameMap.get(teamId) || "a team";
        await ctx.runMutation(
          internal.models.notifications.createNotification,
          {
            userId: args.userId,
            organizationId: args.organizationId,
            type: "team_removed",
            title: "Team Update",
            message: `You have been removed from ${teamName}`,
            link: `/orgs/${args.organizationId}/coach`,
          }
        );
      }
    }

    return null;
  },
});

/**
 * Get fellow coaches who share at least one team with the current coach
 * Useful for task assignment dropdown
 */
export const getFellowCoachesForTeams = query({
  args: {
    userId: v.string(),
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      userId: v.string(),
      userName: v.string(),
      email: v.optional(v.string()),
      teams: v.array(v.string()),
      sharedTeamCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // 1. Get current coach's teams
    const myAssignment = await ctx.db
      .query("coachAssignments")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!myAssignment || myAssignment.teams.length === 0) {
      return [];
    }

    const myTeamSet = new Set(myAssignment.teams);

    // 2. Get all coach assignments in this org
    const allAssignments = await ctx.db
      .query("coachAssignments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // 3. Filter to coaches with shared teams (excluding self)
    const fellowCoaches: {
      userId: string;
      teams: string[];
      sharedTeamCount: number;
    }[] = [];

    for (const assignment of allAssignments) {
      if (assignment.userId === args.userId) {
        continue;
      }

      const sharedTeams = assignment.teams.filter((t) => myTeamSet.has(t));
      if (sharedTeams.length > 0) {
        fellowCoaches.push({
          userId: assignment.userId,
          teams: assignment.teams,
          sharedTeamCount: sharedTeams.length,
        });
      }
    }

    // 4. Get user details from Better Auth
    const results = [];
    for (const coach of fellowCoaches) {
      const userResult = await ctx.runQuery(
        components.betterAuth.userFunctions.getUserByStringId,
        {
          userId: coach.userId,
        }
      );

      if (userResult) {
        const user = userResult as any;
        results.push({
          userId: coach.userId,
          userName: user.name || user.email || "Unknown",
          email: user.email,
          teams: coach.teams,
          sharedTeamCount: coach.sharedTeamCount,
        });
      }
    }

    // Sort by shared team count (most shared first)
    return results.sort((a, b) => b.sharedTeamCount - a.sharedTeamCount);
  },
});

/**
 * Get all coaches assigned to a specific team
 * Useful for task assignment dropdowns, team management, etc.
 */
export const getCoachesForTeam = query({
  args: {
    teamId: v.string(),
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      userId: v.string(),
      name: v.string(),
      email: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // Get all coach assignments in this organization
    const allAssignments = await ctx.db
      .query("coachAssignments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter to coaches assigned to this specific team
    const teamCoaches = allAssignments.filter((assignment) =>
      assignment.teams.includes(args.teamId)
    );

    // Get user details from Better Auth using batch fetch pattern (same as teams.ts)
    const uniqueUserIds = [...new Set(teamCoaches.map((c) => c.userId))];

    const usersData = await Promise.all(
      uniqueUserIds.map((userId) =>
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [
            {
              field: "_id",
              value: userId,
              operator: "eq",
            },
          ],
        })
      )
    );

    // Create user lookup map
    const userMap = new Map<string, BetterAuthDoc<"user">>();
    for (const user of usersData) {
      if (user) {
        userMap.set(user._id, user);
      }
    }

    // Build results using Better Auth name field pattern
    const results = teamCoaches.map((coach) => {
      const user = userMap.get(coach.userId);
      const displayName = user
        ? user.name || user.email || "Unknown"
        : "Unknown";

      return {
        userId: coach.userId,
        name: displayName,
        email: user?.email,
      };
    });

    return results;
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
        assignmentsUpdated += 1;
      }
    }

    return {
      assignmentsUpdated,
      conversions,
      warnings,
    };
  },
});

/**
 * Get coach preferences for parent communications
 */
export const getCoachPreferences = query({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("coachOrgPreferences"),
      _creationTime: v.number(),
      coachId: v.string(),
      organizationId: v.string(),
      parentSummariesEnabled: v.optional(v.boolean()),
      aiInsightMatchingEnabled: v.optional(v.boolean()),
      autoApplyInsightsEnabled: v.optional(v.boolean()),
      skipSensitiveInsights: v.optional(v.boolean()),
      parentSummaryTone: v.optional(
        v.union(
          v.literal("warm"),
          v.literal("professional"),
          v.literal("brief")
        )
      ),
      trustGateOverride: v.optional(v.boolean()),
      overrideGrantedBy: v.optional(v.string()),
      overrideGrantedAt: v.optional(v.number()),
      overrideReason: v.optional(v.string()),
      overrideExpiresAt: v.optional(v.number()),
      aiControlRightsEnabled: v.optional(v.boolean()),
      grantedBy: v.optional(v.string()),
      grantedAt: v.optional(v.number()),
      grantNote: v.optional(v.string()),
      revokedBy: v.optional(v.string()),
      revokedAt: v.optional(v.number()),
      revokeReason: v.optional(v.string()),
      adminBlockedFromAI: v.optional(v.boolean()),
      blockedBy: v.optional(v.string()),
      blockedAt: v.optional(v.number()),
      blockReason: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", args.coachId).eq("organizationId", args.organizationId)
      )
      .first();

    return prefs || null;
  },
});

/**
 * Update coach preferences for parent communications
 */
export const updateCoachPreferences = mutation({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
    parentSummaryTone: v.optional(
      v.union(v.literal("warm"), v.literal("professional"), v.literal("brief"))
    ),
    parentSummariesEnabled: v.optional(v.boolean()),
    aiInsightMatchingEnabled: v.optional(v.boolean()),
    autoApplyInsightsEnabled: v.optional(v.boolean()),
    skipSensitiveInsights: v.optional(v.boolean()),
  },
  returns: v.id("coachOrgPreferences"),
  handler: async (ctx, args) => {
    const { coachId, organizationId, ...updates } = args;

    // Check if preferences already exist
    const existing = await ctx.db
      .query("coachOrgPreferences")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", coachId).eq("organizationId", organizationId)
      )
      .first();

    if (existing) {
      // Update existing preferences
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    // Create new preferences record
    const now = Date.now();
    const prefsId = await ctx.db.insert("coachOrgPreferences", {
      coachId,
      organizationId,
      ...updates,
      createdAt: now,
      updatedAt: now,
    });

    return prefsId;
  },
});
