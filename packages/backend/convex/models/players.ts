import { v } from "convex/values";
import { internalQuery, mutation, query } from "../_generated/server";

/**
 * Player management functions
 * Players are sports club members (children/athletes) and are separate from
 * Better Auth users. They link to teams via the teamPlayers junction table.
 */

/**
 * Get all players for an organization
 * Limited to 100 most recent players to reduce bandwidth usage
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
      .order("desc")
      .take(3000);
    return players;
  },
});

/**
 * Get all players for a team (via teamPlayers junction table)
 * Limited to 50 players per team to reduce bandwidth usage
 */
export const getPlayersByTeam = query({
  args: {
    teamId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get player IDs from junction table
    const teamPlayerLinks = await ctx.db
      .query("teamPlayers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .take(50);

    // Fetch actual player records
    const players = await Promise.all(
      teamPlayerLinks.map(async (link) => {
        const player = await ctx.db.get(link.playerId);
        return player;
      })
    );

    return players.filter((p) => p !== null);
  },
});

/**
 * Get all players (DEPRECATED - use getPlayersByOrganization instead)
 * Limited to 50 most recent players to reduce bandwidth usage
 * WARNING: This query should be replaced with organization-specific queries
 */
export const getAllPlayers = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const players = await ctx.db.query("players").order("desc").take(50);
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
 * Limited to 100 players to reduce bandwidth usage
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
      .order("desc")
      .take(1000);
    return players;
  },
});

/**
 * Get players by sport
 * Limited to 100 players to reduce bandwidth usage
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
      .order("desc")
      .take(1000);
    return players;
  },
});

/**
 * Create a new player (without team - use addPlayerToTeam separately)
 */
export const createPlayer = mutation({
  args: {
    name: v.string(),
    ageGroup: v.string(),
    sport: v.string(),
    gender: v.string(),
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
      skills: {},
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
    skills: v.optional(v.record(v.string(), v.number())),
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
 * Delete a player (and their team associations)
 */
export const deletePlayer = mutation({
  args: {
    playerId: v.id("players"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delete team associations first
    const teamLinks = await ctx.db
      .query("teamPlayers")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();

    for (const link of teamLinks) {
      await ctx.db.delete(link._id);
    }

    // Delete the player
    await ctx.db.delete(args.playerId);
    return null;
  },
});

/**
 * Add a player to a team (creates junction record)
 */
export const addPlayerToTeam = mutation({
  args: {
    playerId: v.id("players"),
    teamId: v.string(),
  },
  returns: v.id("teamPlayers"),
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("teamPlayers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    const alreadyLinked = existing.find(
      (link) => link.playerId === args.playerId
    );
    if (alreadyLinked) {
      return alreadyLinked._id;
    }

    // Create new link
    const linkId = await ctx.db.insert("teamPlayers", {
      teamId: args.teamId,
      playerId: args.playerId,
      createdAt: Date.now(),
    });
    return linkId;
  },
});

/**
 * Remove a player from a team
 */
export const removePlayerFromTeam = mutation({
  args: {
    playerId: v.id("players"),
    teamId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("teamPlayers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    const linkToDelete = links.find((link) => link.playerId === args.playerId);
    if (linkToDelete) {
      await ctx.db.delete(linkToDelete._id);
    }
    return null;
  },
});

/**
 * Get all teams for a player
 */
export const getTeamsForPlayer = query({
  args: {
    playerId: v.id("players"),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("teamPlayers")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();
    return links.map((link) => link.teamId);
  },
});

/**
 * Create a player with full import data (for bulk imports like GAA membership)
 * Supports skills, family info, and all optional fields
 * Returns player ID - use addPlayerToTeam separately for team associations
 */
export const createPlayerForImport = mutation({
  args: {
    name: v.string(),
    ageGroup: v.string(),
    sport: v.string(),
    gender: v.string(),
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
    // Skills as record (key-value pairs)
    skills: v.optional(v.record(v.string(), v.number())),
    // Family grouping
    familyId: v.optional(v.string()),
    // Inferred parent data from membership imports
    inferredParentFirstName: v.optional(v.string()),
    inferredParentSurname: v.optional(v.string()),
    inferredParentEmail: v.optional(v.string()),
    inferredParentPhone: v.optional(v.string()),
    inferredFromSource: v.optional(v.string()),
    // Additional fields
    createdFrom: v.optional(v.string()),
    coachNotes: v.optional(v.string()),
    reviewedWith: v.optional(
      v.object({
        coach: v.boolean(),
        parent: v.boolean(),
        player: v.boolean(),
        forum: v.boolean(),
      })
    ),
    attendance: v.optional(
      v.object({
        training: v.string(),
        matches: v.string(),
      })
    ),
    positions: v.optional(
      v.object({
        favourite: v.string(),
        leastFavourite: v.string(),
        coachesPref: v.string(),
        dominantSide: v.string(),
        goalkeeper: v.string(),
      })
    ),
    fitness: v.optional(
      v.object({
        pushPull: v.string(),
        core: v.string(),
        endurance: v.string(),
        speed: v.string(),
        broncoBeep: v.string(),
      })
    ),
    injuryNotes: v.optional(v.string()),
    otherInterests: v.optional(v.string()),
    communications: v.optional(v.string()),
    actions: v.optional(v.string()),
    parentNotes: v.optional(v.string()),
    playerNotes: v.optional(v.string()),
  },
  returns: v.id("players"),
  handler: async (ctx, args) => {
    const playerId = await ctx.db.insert("players", {
      name: args.name,
      ageGroup: args.ageGroup,
      sport: args.sport,
      gender: args.gender,
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
      skills: args.skills ?? {},
      familyId: args.familyId,
      inferredParentFirstName: args.inferredParentFirstName,
      inferredParentSurname: args.inferredParentSurname,
      inferredParentEmail: args.inferredParentEmail,
      inferredParentPhone: args.inferredParentPhone,
      inferredFromSource: args.inferredFromSource,
      createdFrom: args.createdFrom,
      coachNotes: args.coachNotes,
      reviewedWith: args.reviewedWith,
      attendance: args.attendance,
      positions: args.positions,
      fitness: args.fitness,
      injuryNotes: args.injuryNotes,
      otherInterests: args.otherInterests,
      communications: args.communications,
      actions: args.actions,
      parentNotes: args.parentNotes,
      playerNotes: args.playerNotes,
      reviewStatus: "Not Started",
    });
    return playerId;
  },
});

/**
 * Get player count by team (via junction table)
 */
export const getPlayerCountByTeam = query({
  args: {
    teamId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("teamPlayers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .take(200); // Max reasonable team size
    return links.length;
  },
});

/**
 * Internal query to get players by organization ID (for voice notes AI processing)
 * Limited to 100 most recent players to reduce bandwidth usage
 */
export const getPlayersByOrgId = internalQuery({
  args: {
    orgId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("players"),
      name: v.string(),
      ageGroup: v.string(),
      sport: v.string(),
      organizationId: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.orgId))
      .order("desc")
      .take(1000);

    return players.map((p) => ({
      _id: p._id,
      name: p.name,
      ageGroup: p.ageGroup,
      sport: p.sport,
      organizationId: p.organizationId,
    }));
  },
});
