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
      v.union(v.literal("Boys"), v.literal("Girls"), v.literal("Mixed"))
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
 */
export const updateTeam = mutation({
  args: {
    teamId: v.string(),
    name: v.optional(v.string()),
    sport: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    gender: v.optional(
      v.union(v.literal("Boys"), v.literal("Girls"), v.literal("Mixed"))
    ),
    season: v.optional(v.string()),
    description: v.optional(v.string()),
    trainingSchedule: v.optional(v.string()),
    homeVenue: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { teamId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, val]) => val !== undefined)
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
    return null;
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
      teamIds.map(async (teamId) => {
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
