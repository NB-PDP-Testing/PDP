import type { Doc as BetterAuthDoc } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { customTeamTableSchema } from "../betterAuth/schema";

/**
 * Team management functions that work with Better Auth's team table.
 * Uses Better Auth component adapter to interact with teams.
 */

/**
 * Get all teams for an organization
 */
export const getTeamsByOrganization = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      ...customTeamTableSchema,
      _creationTime: v.number(),
      _id: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
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
    });
    return result.page as BetterAuthDoc<"team">[];
  },
});

/**
 * Create a new team
 */
export const createTeam = mutation({
  args: {
    name: v.string(),
    organizationId: v.string(),
    sport: v.optional(v.string()),
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
    season: v.optional(v.string()),
    description: v.optional(v.string()),
    trainingSchedule: v.optional(v.string()),
    homeVenue: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const result = await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "team",
        data: {
          name: args.name,
          organizationId: args.organizationId,
          createdAt: now,
          updatedAt: now,
          sport: args.sport,
          ageGroup: args.ageGroup,
          gender: args.gender,
          season: args.season,
          description: args.description,
          trainingSchedule: args.trainingSchedule,
          homeVenue: args.homeVenue,
          isActive: args.isActive ?? true,
        },
      },
    });
    return result._id;
  },
});

/**
 * Update a team
 * Also updates coach assignments when team name changes to keep them in sync
 */
export const updateTeam = mutation({
  args: {
    teamId: v.string(),
    name: v.optional(v.string()),
    sport: v.optional(v.string()),
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
    season: v.optional(v.string()),
    description: v.optional(v.string()),
    trainingSchedule: v.optional(v.string()),
    homeVenue: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { teamId, name: newName, ...otherUpdates } = args;

    // Get the current team to check if name is changing
    let oldName: string | undefined;
    let organizationId: string | undefined;

    if (newName) {
      const teamResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "team",
          paginationOpts: { cursor: null, numItems: 1 },
          where: [{ field: "_id", value: teamId, operator: "eq" }],
        }
      );
      const team = teamResult.page[0] as BetterAuthDoc<"team"> | undefined;
      if (team && team.name !== newName) {
        oldName = team.name;
        organizationId = team.organizationId;
      }
    }

    // Build updates object
    const filteredUpdates = Object.fromEntries(
      Object.entries({ name: newName, ...otherUpdates }).filter(
        ([_, val]) => val !== undefined
      )
    );

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "team",
          where: [{ field: "_id", value: teamId, operator: "eq" }],
          update: {
            ...filteredUpdates,
            updatedAt: Date.now(),
          },
        },
      });
    }

    // If name changed, update all coach assignments that reference the old name
    if (oldName && newName && organizationId) {
      const coachAssignments = await ctx.db
        .query("coachAssignments")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", organizationId)
        )
        .collect();

      for (const assignment of coachAssignments) {
        if (assignment.teams.includes(oldName)) {
          // Replace old name with new name in teams array
          const updatedTeams = assignment.teams.map((t: string) =>
            t === oldName ? newName : t
          );
          await ctx.db.patch(assignment._id, {
            teams: updatedTeams,
            updatedAt: Date.now(),
          });
        }
      }
    }

    return null;
  },
});

/**
 * Update team coach notes
 * Appends a new timestamped note to the team's coachNotes field
 */
export const updateTeamNotes = mutation({
  args: {
    teamId: v.string(),
    note: v.string(),
    appendMode: v.optional(v.boolean()), // true = append to existing, false = replace
  },
  returns: v.object({
    success: v.boolean(),
    teamName: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Get current team to access existing notes
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "team",
      paginationOpts: { cursor: null, numItems: 1 },
      where: [{ field: "_id", value: args.teamId, operator: "eq" }],
    });

    const team = result.page[0] as BetterAuthDoc<"team"> | undefined;
    if (!team) {
      return { success: false };
    }

    let newNotes: string;
    if (args.appendMode !== false) {
      // Append mode (default): add timestamp and append to existing
      const timestamp = new Date().toLocaleDateString();
      const newNote = `[${timestamp}] ${args.note.trim()}`;
      const existingNotes = team.coachNotes || "";
      newNotes = existingNotes ? `${existingNotes}\n\n${newNote}` : newNote;
    } else {
      // Replace mode: just set the note directly
      newNotes = args.note;
    }

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "team",
        where: [{ field: "_id", value: args.teamId, operator: "eq" }],
        update: {
          coachNotes: newNotes,
          updatedAt: Date.now(),
        },
      },
    });

    return { success: true, teamName: team.name };
  },
});

/**
 * Get team by ID with coach notes
 */
export const getTeamById = query({
  args: {
    teamId: v.string(),
  },
  returns: v.union(
    v.object({
      ...customTeamTableSchema,
      _creationTime: v.number(),
      _id: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "team",
      paginationOpts: { cursor: null, numItems: 1 },
      where: [{ field: "_id", value: args.teamId, operator: "eq" }],
    });

    const team = result.page[0] as BetterAuthDoc<"team"> | undefined;
    return team || null;
  },
});

/**
 * Delete a team
 */
export const deleteTeam = mutation({
  args: {
    teamId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "team",
        where: [{ field: "_id", value: args.teamId, operator: "eq" }],
      },
    });
    return null;
  },
});

/**
 * Get all team-player links for an organization (via teams)
 */
export const getTeamPlayerLinks = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("teamPlayerIdentities"),
      _creationTime: v.number(),
      teamId: v.string(),
      playerIdentityId: v.id("playerIdentities"),
      organizationId: v.string(),
      role: v.optional(v.string()),
      status: v.union(
        v.literal("active"),
        v.literal("inactive"),
        v.literal("transferred")
      ),
      season: v.optional(v.string()),
      joinedDate: v.optional(v.string()),
      leftDate: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Query the new teamPlayerIdentities table directly by organizationId
    // Only return active players
    const links = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    return links;
  },
});

/**
 * Debug query to check team sport data
 */
export const debugTeamSports = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
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
    });

    const teams = result.page as BetterAuthDoc<"team">[];
    return teams.map((team) => ({
      _id: team._id,
      name: team.name,
      sport: team.sport,
      sportType: typeof team.sport,
      hasSport: team.sport !== undefined && team.sport !== null,
    }));
  },
});

/**
 * Migration: Convert old gender values (Boys/Girls/Mixed) to new values (male/female/mixed)
 * Run this after deploying the schema that accepts both old and new values
 */
export const migrateTeamGenderValues = mutation({
  args: {
    organizationId: v.optional(v.string()),
  },
  returns: v.object({
    teamsUpdated: v.number(),
    updates: v.array(
      v.object({
        teamId: v.string(),
        teamName: v.string(),
        oldGender: v.string(),
        newGender: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Old to new gender mapping (Boys/Girls to Male/Female)
    const genderMapping: Record<string, "Male" | "Female" | "Mixed"> = {
      Boys: "Male",
      Girls: "Female",
    };

    // Get teams to migrate
    const where = args.organizationId
      ? [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq" as const,
          },
        ]
      : [];

    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "team",
      paginationOpts: {
        cursor: null,
        numItems: 1000,
      },
      where,
    });

    const teams = result.page as BetterAuthDoc<"team">[];
    const updates = [];
    let teamsUpdated = 0;

    for (const team of teams) {
      if (!team.gender) {
        continue;
      }

      // Check if gender is an old value
      const newGender = genderMapping[team.gender];
      if (newGender) {
        // Update the team
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "team",
            where: [{ field: "_id", value: team._id, operator: "eq" }],
            update: { gender: newGender, updatedAt: Date.now() },
          },
        });

        updates.push({
          teamId: team._id,
          teamName: team.name,
          oldGender: team.gender,
          newGender,
        });
        teamsUpdated += 1;
      }
    }

    return {
      teamsUpdated,
      updates,
    };
  },
});

/**
 * Migration: Clean up coach assignments with stale team names
 * Removes team names from coach assignments that no longer exist as teams
 */
export const cleanupStaleCoachTeamAssignments = mutation({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    assignmentsUpdated: v.number(),
    teamsRemoved: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    // Get all current teams for this organization
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
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
    });

    const teams = result.page as BetterAuthDoc<"team">[];
    const validTeamNames = new Set(teams.map((t) => t.name));

    // Get all coach assignments for this organization
    const coachAssignments = await ctx.db
      .query("coachAssignments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    let assignmentsUpdated = 0;
    const teamsRemoved: string[] = [];

    for (const assignment of coachAssignments) {
      // Filter to only valid team names
      const validTeams = assignment.teams.filter((teamName: string) =>
        validTeamNames.has(teamName)
      );

      // Check if any teams were removed
      const removedTeams = assignment.teams.filter(
        (teamName: string) => !validTeamNames.has(teamName)
      );

      if (removedTeams.length > 0) {
        // Update the assignment with only valid teams
        await ctx.db.patch(assignment._id, {
          teams: validTeams,
          updatedAt: Date.now(),
        });
        assignmentsUpdated += 1;
        teamsRemoved.push(...removedTeams);
      }
    }

    return {
      assignmentsUpdated,
      teamsRemoved: [...new Set(teamsRemoved)], // Unique team names
    };
  },
});

/**
 * Migration: Convert sport NAMES to sport CODES
 * This fixes teams that have "GAA Football" instead of "gaa_football"
 */
export const migrateSportNamesToCodes = mutation({
  args: {
    organizationId: v.optional(v.string()),
  },
  returns: v.object({
    teamsUpdated: v.number(),
    updates: v.array(
      v.object({
        teamId: v.string(),
        teamName: v.string(),
        oldSport: v.string(),
        newSport: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Sport name to code mapping
    const sportNameToCode: Record<string, string> = {
      "GAA Football": "gaa_football",
      Hurling: "hurling",
      Camogie: "camogie",
      "Ladies Football": "ladies_football",
      Handball: "handball",
      Rounders: "rounders",
      Soccer: "soccer",
      Rugby: "rugby",
      Basketball: "basketball",
      "GAA Gaelic Football": "gaa_football", // Alternative name
    };

    // Get teams to migrate
    const where = args.organizationId
      ? [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq" as const,
          },
        ]
      : [];

    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "team",
      paginationOpts: {
        cursor: null,
        numItems: 1000,
      },
      where,
    });

    const teams = result.page as BetterAuthDoc<"team">[];
    const updates = [];
    let teamsUpdated = 0;

    for (const team of teams) {
      if (!team.sport) {
        continue;
      }

      // Check if sport is a NAME (not a code)
      const sportCode = sportNameToCode[team.sport];
      if (sportCode && sportCode !== team.sport) {
        // Update the team
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "team",
            where: [{ field: "_id", value: team._id, operator: "eq" }],
            update: { sport: sportCode },
          },
        });

        updates.push({
          teamId: team._id,
          teamName: team.name,
          oldSport: team.sport,
          newSport: sportCode,
        });
        teamsUpdated += 1;
      }
    }

    return {
      teamsUpdated,
      updates,
    };
  },
});

/**
 * ============================================================
 * TEAM ELIGIBILITY ENFORCEMENT SETTINGS
 * Manage how strictly age group eligibility is enforced per team
 * ============================================================
 */

/**
 * Get team eligibility settings
 *
 * Returns enforcement settings for a team, or null if using defaults.
 */
export const getTeamEligibilitySettings = query({
  args: {
    teamId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("teamEligibilitySettings"),
      teamId: v.string(),
      organizationId: v.string(),
      enforcementLevel: v.union(
        v.literal("strict"),
        v.literal("warning"),
        v.literal("flexible")
      ),
      requireOverrideReason: v.boolean(),
      notifyOnOverride: v.optional(v.array(v.string())),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("teamEligibilitySettings")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return settings;
  },
});

/**
 * Get eligibility settings for all teams in an organization
 *
 * Admin only. Useful for bulk configuration UI.
 */
export const getOrganizationEligibilitySettings = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("teamEligibilitySettings"),
      teamId: v.string(),
      organizationId: v.string(),
      enforcementLevel: v.union(
        v.literal("strict"),
        v.literal("warning"),
        v.literal("flexible")
      ),
      requireOverrideReason: v.boolean(),
      notifyOnOverride: v.optional(v.array(v.string())),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // TODO: Verify user is admin (will add in Phase 4 with auth context)

    const settings = await ctx.db
      .query("teamEligibilitySettings")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return settings;
  },
});

/**
 * Update team enforcement level
 *
 * Admin only. Sets how strictly age eligibility is enforced for a team.
 */
export const updateTeamEligibilitySettings = mutation({
  args: {
    teamId: v.string(),
    organizationId: v.string(),
    enforcementLevel: v.union(
      v.literal("strict"),
      v.literal("warning"),
      v.literal("flexible")
    ),
    requireOverrideReason: v.boolean(),
    notifyOnOverride: v.optional(v.array(v.string())),
  },
  returns: v.id("teamEligibilitySettings"),
  handler: async (ctx, args) => {
    // TODO: Verify user is admin (will add in Phase 4 with auth context)

    const now = Date.now();

    // Check if settings already exist
    const existing = await ctx.db
      .query("teamEligibilitySettings")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (existing) {
      // Update existing settings
      await ctx.db.patch(existing._id, {
        enforcementLevel: args.enforcementLevel,
        requireOverrideReason: args.requireOverrideReason,
        notifyOnOverride: args.notifyOnOverride,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new settings
    const settingsId = await ctx.db.insert("teamEligibilitySettings", {
      teamId: args.teamId,
      organizationId: args.organizationId,
      enforcementLevel: args.enforcementLevel,
      requireOverrideReason: args.requireOverrideReason,
      notifyOnOverride: args.notifyOnOverride,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return settingsId;
  },
});

/**
 * Reset team to default enforcement settings
 *
 * Admin only. Removes custom enforcement settings, reverting to org defaults.
 */
export const resetTeamEligibilitySettings = mutation({
  args: {
    teamId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // TODO: Verify user is admin (will add in Phase 4 with auth context)

    const existing = await ctx.db
      .query("teamEligibilitySettings")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Get team overview statistics for Overview Dashboard
 * Returns: total players, active injuries count, attendance %, upcoming events count
 */
export const getTeamOverviewStats = query({
  args: {
    teamId: v.string(),
    organizationId: v.string(),
  },
  returns: v.object({
    totalPlayers: v.number(),
    activeInjuries: v.number(),
    attendancePercent: v.union(v.number(), v.null()), // null if no data
    upcomingEventsCount: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get total active players on team
    const teamMembers = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    const activePlayers = teamMembers.filter((m) => m.status === "active");
    const totalPlayers = activePlayers.length;

    // Get active injuries count from health summary
    // Reuse existing query logic for consistency
    const playerIds = activePlayers.map((m) => m.playerIdentityId);
    let activeInjuriesCount = 0;

    if (playerIds.length > 0) {
      const uniquePlayerIds = [...new Set(playerIds)];

      for (const playerId of uniquePlayerIds) {
        const injuries = await ctx.db
          .query("playerInjuries")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", playerId)
          )
          .collect();

        // Count active/recovering injuries visible to this org
        const activeInjuries = injuries.filter((injury) => {
          if (injury.status === "healed" || injury.status === "cleared") {
            return false;
          }
          if (injury.isVisibleToAllOrgs) {
            return true;
          }
          if (injury.restrictedToOrgIds?.includes(args.organizationId)) {
            return true;
          }
          if (injury.occurredAtOrgId === args.organizationId) {
            return true;
          }
          return false;
        });

        activeInjuriesCount += activeInjuries.length;
      }
    }

    // Attendance: placeholder for future implementation
    // TODO: Implement actual attendance tracking in future phase
    const attendancePercent = null;

    // Upcoming events: placeholder for future implementation
    // TODO: Implement scheduled sessions/games in future phase
    const upcomingEventsCount = 0;

    return {
      totalPlayers,
      activeInjuries: activeInjuriesCount,
      attendancePercent,
      upcomingEventsCount,
    };
  },
});

/**
 * Get upcoming events for team (sessions, games, practices)
 * Returns next 3 scheduled events with details
 */
export const getUpcomingEvents = query({
  args: {
    teamId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      eventId: v.string(),
      title: v.string(),
      date: v.string(), // ISO date string
      time: v.optional(v.string()),
      location: v.optional(v.string()),
      type: v.union(
        v.literal("training"),
        v.literal("game"),
        v.literal("meeting"),
        v.literal("other")
      ),
    })
  ),
  handler: (_ctx, _args) => {
    // TODO: Implement scheduled events in future phase
    // For now, return empty array as events scheduling is not yet implemented
    // This prevents the Overview Dashboard from breaking

    // Future implementation will:
    // 1. Query scheduledSessions table (when it exists)
    // 2. Filter by teamId and future dates
    // 3. Sort by date ascending
    // 4. Take first N events based on limit

    return [];
  },
});

/**
 * Get team players with health status for Players Tab
 * Returns player data with health badges (healthy/recovering/injured)
 * Uses batch fetch pattern to avoid N+1 queries
 */
export const getTeamPlayersWithHealth = query({
  args: {
    teamId: v.string(),
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      playerId: v.id("playerIdentities"),
      fullName: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      jerseyNumber: v.union(v.string(), v.null()),
      position: v.union(v.string(), v.null()),
      healthStatus: v.union(
        v.literal("healthy"),
        v.literal("recovering"),
        v.literal("injured")
      ),
      isPlayingUp: v.boolean(),
      photoUrl: v.union(v.string(), v.null()),
      ageGroup: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    // Step 1: Get all active players on the team
    const teamMembers = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    const activeMembers = teamMembers.filter((m) => m.status === "active");

    if (activeMembers.length === 0) {
      return [];
    }

    // Step 2: Batch fetch player identities (avoid N+1)
    const uniquePlayerIds = [
      ...new Set(activeMembers.map((m) => m.playerIdentityId)),
    ];
    const playerResults = await Promise.all(
      uniquePlayerIds.map((id) => ctx.db.get(id))
    );

    const playerMap = new Map();
    for (const player of playerResults) {
      if (player) {
        playerMap.set(player._id, player);
      }
    }

    // Step 3: Batch fetch enrollments for ageGroup and jerseyNumber
    const enrollmentResults = await Promise.all(
      uniquePlayerIds.map((playerId) =>
        ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_player_and_org", (q) =>
            q
              .eq("playerIdentityId", playerId)
              .eq("organizationId", args.organizationId)
          )
          .first()
      )
    );

    const enrollmentMap = new Map();
    for (const enrollment of enrollmentResults) {
      if (enrollment) {
        enrollmentMap.set(enrollment.playerIdentityId, enrollment);
      }
    }

    // Step 4: Batch fetch injuries for health status
    const injuryResults = await Promise.all(
      uniquePlayerIds.map((playerId) =>
        ctx.db
          .query("playerInjuries")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", playerId)
          )
          .collect()
      )
    );

    const injuryMap = new Map();
    for (let i = 0; i < uniquePlayerIds.length; i += 1) {
      const playerId = uniquePlayerIds[i];
      const injuries = injuryResults[i];

      // Filter to active/recovering injuries visible to this org
      const visibleInjuries = injuries.filter((injury) => {
        if (injury.status === "healed" || injury.status === "cleared") {
          return false;
        }
        if (injury.isVisibleToAllOrgs) {
          return true;
        }
        if (injury.restrictedToOrgIds?.includes(args.organizationId)) {
          return true;
        }
        if (injury.occurredAtOrgId === args.organizationId) {
          return true;
        }
        return false;
      });

      injuryMap.set(playerId, visibleInjuries);
    }

    // Step 5: Get team data to determine playing up status
    const teamResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "team",
        where: [
          {
            field: "_id",
            value: args.teamId,
            operator: "eq",
          },
        ],
      }
    );

    const team = teamResult as BetterAuthDoc<"team"> | null;

    // Step 6: Build result array
    const results = [];
    for (const member of activeMembers) {
      const player = playerMap.get(member.playerIdentityId);
      const enrollment = enrollmentMap.get(member.playerIdentityId);

      if (!player) {
        continue;
      }

      const injuries = injuryMap.get(member.playerIdentityId) || [];

      // Calculate health status
      let healthStatus: "healthy" | "recovering" | "injured" = "healthy";

      if (injuries.length > 0) {
        // Check for severe or recent injuries (within 7 days)
        const hasSevereOrRecentInjury = injuries.some(
          (injury: Doc<"playerInjuries">) => {
            if (injury.severity === "severe") {
              return true;
            }
            const daysSince = Math.floor(
              (Date.now() - new Date(injury.dateOccurred).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return daysSince < 7;
          }
        );

        if (hasSevereOrRecentInjury) {
          healthStatus = "injured";
        } else if (
          injuries.some(
            (injury: Doc<"playerInjuries">) => injury.status === "recovering"
          )
        ) {
          healthStatus = "recovering";
        }
      }

      // Determine if playing up
      const isPlayingUp = Boolean(
        team?.ageGroup &&
          enrollment?.ageGroup &&
          enrollment.ageGroup !== team.ageGroup
      );

      results.push({
        playerId: player._id,
        fullName: `${player.firstName} ${player.lastName}`,
        firstName: player.firstName,
        lastName: player.lastName,
        jerseyNumber: enrollment?.clubMembershipNumber || null,
        position: member.role || null,
        healthStatus,
        isPlayingUp,
        photoUrl: null, // TODO: Add photo support in future phase
        ageGroup: enrollment?.ageGroup || "",
      });
    }

    return results;
  },
});
