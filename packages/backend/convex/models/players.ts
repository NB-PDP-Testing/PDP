import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Player management functions
 * Players are sports club members (children/athletes) and are separate from
 * Better Auth users. They link to Better Auth teams via teamId (string).
 */

/**
 * Get all players for an organization
 */
export const getPlayersByOrganization = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    return players;
  },
});

/**
 * Get all players for a team
 */
export const getPlayersByTeam = query({
  args: {
    teamId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();
    return players;
  },
});

/**
 * Get all players
 */
export const getAllPlayers = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const players = await ctx.db.query("players").collect();
    return players;
  },
});

/**
 * Get a single player by ID
 */
export const getPlayerById = query({
  args: {
    playerId: v.id("players"),
  },
  returns: v.any(),
  handler: async (ctx, args) => await ctx.db.get(args.playerId),
});

/**
 * Search players by name
 */
export const searchPlayersByName = query({
  args: {
    searchTerm: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    if (!args.searchTerm.trim()) {
      return [];
    }
    const players = await ctx.db
      .query("players")
      .withSearchIndex("name_search", (q) => q.search("name", args.searchTerm))
      .take(50);
    return players;
  },
});

/**
 * Get players by age group
 */
export const getPlayersByAgeGroup = query({
  args: {
    ageGroup: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_ageGroup", (q) => q.eq("ageGroup", args.ageGroup))
      .collect();
    return players;
  },
});

/**
 * Get players by sport
 */
export const getPlayersBySport = query({
  args: {
    sport: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_sport", (q) => q.eq("sport", args.sport))
      .collect();
    return players;
  },
});

/**
 * Create a new player
 */
export const createPlayer = mutation({
  args: {
    name: v.string(),
    ageGroup: v.string(),
    sport: v.string(),
    gender: v.string(),
    teamId: v.string(),
    organizationId: v.string(),
    season: v.string(),
    completionDate: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    postcode: v.optional(v.string()),
    parentFirstName: v.optional(v.string()),
    parentSurname: v.optional(v.string()),
    parentEmail: v.optional(v.string()),
    parentPhone: v.optional(v.string()),
  },
  returns: v.id("players"),
  handler: async (ctx, args) => {
    const playerId = await ctx.db.insert("players", {
      name: args.name,
      ageGroup: args.ageGroup,
      sport: args.sport,
      gender: args.gender,
      teamId: args.teamId,
      organizationId: args.organizationId,
      season: args.season,
      completionDate: args.completionDate,
      dateOfBirth: args.dateOfBirth,
      address: args.address,
      town: args.town,
      postcode: args.postcode,
      parentFirstName: args.parentFirstName,
      parentSurname: args.parentSurname,
      parentEmail: args.parentEmail,
      parentPhone: args.parentPhone,
      reviewStatus: "Not Started",
    });
    return playerId;
  },
});

/**
 * Update a player
 */
export const updatePlayer = mutation({
  args: {
    playerId: v.id("players"),
    name: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    sport: v.optional(v.string()),
    gender: v.optional(v.string()),
    teamId: v.optional(v.string()),
    season: v.optional(v.string()),
    completionDate: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    postcode: v.optional(v.string()),
    parentFirstName: v.optional(v.string()),
    parentSurname: v.optional(v.string()),
    parentEmail: v.optional(v.string()),
    parentPhone: v.optional(v.string()),
    skills: v.optional(v.string()),
    injuryNotes: v.optional(v.string()),
    coachNotes: v.optional(v.string()),
    parentNotes: v.optional(v.string()),
    playerNotes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { playerId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, val]) => val !== undefined)
    );
    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(playerId, filteredUpdates);
    }
    return null;
  },
});

/**
 * Delete a player
 */
export const deletePlayer = mutation({
  args: {
    playerId: v.id("players"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.playerId);
    return null;
  },
});

/**
 * Get player count by team
 */
export const getPlayerCountByTeam = query({
  args: {
    teamId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();
    return players.length;
  },
});
