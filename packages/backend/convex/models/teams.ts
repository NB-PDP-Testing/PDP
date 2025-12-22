import type { Doc as BetterAuthDoc } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { v } from "convex/values";
import { components } from "../_generated/api";
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
        v.literal("Male"), v.literal("Female"), v.literal("Mixed"),
        v.literal("Boys"), v.literal("Girls")
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
        v.literal("Male"), v.literal("Female"), v.literal("Mixed"),
        v.literal("Boys"), v.literal("Girls")
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
      const teamResult = await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "team",
        paginationOpts: { cursor: null, numItems: 1 },
        where: [{ field: "_id", value: teamId, operator: "eq" }],
      });
      const team = teamResult.page[0] as BetterAuthDoc<"team"> | undefined;
      if (team && team.name !== newName) {
        oldName = team.name;
        organizationId = team.organizationId;
      }
    }
    
    // Build updates object
    const filteredUpdates = Object.fromEntries(
      Object.entries({ name: newName, ...otherUpdates }).filter(([_, val]) => val !== undefined)
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
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organizationId))
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
      _id: v.id("teamPlayers"),
      _creationTime: v.number(),
      teamId: v.string(),
      playerId: v.id("players"),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get all teams for this organization
    const teams = await ctx.runQuery(components.betterAuth.adapter.findMany, {
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

    const teamIds = teams.page.map((t: BetterAuthDoc<"team">) => t._id);

    // Get all team-player links for these teams
    const allLinks = await Promise.all(
      teamIds.map(async (teamId: string) => {
        const links = await ctx.db
          .query("teamPlayers")
          .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
          .collect();
        return links;
      })
    );

    return allLinks.flat();
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
      "Boys": "Male",
      "Girls": "Female",
    };

    // Get teams to migrate
    const where = args.organizationId
      ? [{ field: "organizationId", value: args.organizationId, operator: "eq" as const }]
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
      if (!team.gender) continue;

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
        teamsUpdated++;
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
    const validTeamNames = new Set(teams.map(t => t.name));
    
    // Get all coach assignments for this organization
    const coachAssignments = await ctx.db
      .query("coachAssignments")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    
    let assignmentsUpdated = 0;
    const teamsRemoved: string[] = [];
    
    for (const assignment of coachAssignments) {
      // Filter to only valid team names
      const validTeams = assignment.teams.filter((teamName: string) => 
        validTeamNames.has(teamName)
      );
      
      // Check if any teams were removed
      const removedTeams = assignment.teams.filter((teamName: string) => 
        !validTeamNames.has(teamName)
      );
      
      if (removedTeams.length > 0) {
        // Update the assignment with only valid teams
        await ctx.db.patch(assignment._id, {
          teams: validTeams,
          updatedAt: Date.now(),
        });
        assignmentsUpdated++;
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
      "Hurling": "hurling",
      "Camogie": "camogie",
      "Ladies Football": "ladies_football",
      "Handball": "handball",
      "Rounders": "rounders",
      "Soccer": "soccer",
      "Rugby": "rugby",
      "Basketball": "basketball",
      "GAA Gaelic Football": "gaa_football", // Alternative name
    };

    // Get teams to migrate
    const where = args.organizationId
      ? [{ field: "organizationId", value: args.organizationId, operator: "eq" as const }]
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
      if (!team.sport) continue;

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
        teamsUpdated++;
      }
    }

    return {
      teamsUpdated,
      updates,
    };
  },
});
