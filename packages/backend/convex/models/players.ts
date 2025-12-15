import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalQuery, mutation, query } from "../_generated/server";

/**
 * Player management functions
 * Players are sports club members (children/athletes) and are separate from
 * Better Auth users. They link to teams via the teamPlayers junction table.
 */

/**
 * Get complete player passport data with all related information
 * Used for the player passport/profile page
 */
export const getPlayerPassport = query({
  args: {
    playerId: v.id("players"),
    organizationId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Get player data
    const player = await ctx.db.get(args.playerId);
    if (!player || player.organizationId !== args.organizationId) {
      return null;
    }

    // Get all teams this player is on via teamPlayers junction table
    const teamLinks = await ctx.db
      .query("teamPlayers")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();

    // Fetch team details from Better Auth
    const teams = [];
    for (const link of teamLinks) {
      const teamResult = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "team",
          where: [{ field: "_id", value: link.teamId, operator: "eq" }],
        }
      );
      if (teamResult) {
        teams.push(teamResult);
      }
    }

    // Get coach assignments for these teams
    const coachAssignments = await ctx.db
      .query("coachAssignments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Find coaches for player's teams
    const teamIds = teamLinks.map((link) => link.teamId);
    const relevantCoaches = coachAssignments.filter((ca) =>
      ca.teams.some((teamId) => teamIds.includes(teamId))
    );

    return {
      ...player,
      teams,
      coaches: relevantCoaches,
      teamCount: teams.length,
    };
  },
});

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
      .order("desc")
      .take(3000);
    return players;
  },
});

/**
 * Get all players for a team (via teamPlayers junction table)
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
 * Get players for a coach based on their team assignments
 * Returns all players from teams assigned to the coach
 */
export const getPlayersForCoach = query({
  args: {
    userId: v.string(),
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get coach assignments
    const coachAssignment = await ctx.db
      .query("coachAssignments")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .first();

    if (!coachAssignment || coachAssignment.teams.length === 0) {
      console.log(
        `[getPlayersForCoach] No coach assignment found for userId: ${args.userId}, orgId: ${args.organizationId}`
      );
      return [];
    }

    console.log(
      "[getPlayersForCoach] Coach assignment found with teams:",
      coachAssignment.teams
    );

    // Get all teams for this organization to match team names
    const teamsResult = await ctx.runQuery(
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

    const teams = teamsResult.page as any[];

    console.log(
      `[getPlayersForCoach] Found ${teams.length} teams in organization`
    );

    // Match team names OR team IDs to team IDs
    // coachAssignments.teams might contain either team names or team IDs
    // Normalize team names for comparison (trim whitespace, case-insensitive)
    const normalizedCoachTeams = coachAssignment.teams.map((t: string) =>
      t.trim()
    );
    const assignedTeamIds = teams
      .filter((team: any) => {
        // Check if coachAssignment.teams contains either the team name or team ID
        // Normalize team name for comparison
        const normalizedTeamName = team.name?.trim() || "";
        const matches =
          normalizedCoachTeams.includes(normalizedTeamName) ||
          normalizedCoachTeams.includes(team._id) ||
          coachAssignment.teams.includes(team.name) ||
          coachAssignment.teams.includes(team._id);
        if (matches) {
          console.log(
            `[getPlayersForCoach] Matched team: ${team.name} (${team._id})`
          );
        }
        return matches;
      })
      .map((team: any) => team._id);

    console.log(
      `[getPlayersForCoach] Found ${assignedTeamIds.length} assigned team IDs:`,
      assignedTeamIds
    );

    if (assignedTeamIds.length === 0) {
      console.log(
        "[getPlayersForCoach] No teams matched from coachAssignment.teams:",
        coachAssignment.teams
      );
      return [];
    }

    // Get all team-player links for assigned teams
    const allLinks = await Promise.all(
      assignedTeamIds.map(async (teamId: string) => {
        const links = await ctx.db
          .query("teamPlayers")
          .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
          .collect();
        console.log(
          `[getPlayersForCoach] Found ${links.length} player links for team ${teamId}`
        );
        return links;
      })
    );

    const flatLinks = allLinks.flat();
    console.log(
      `[getPlayersForCoach] Total player links found: ${flatLinks.length}`
    );

    const playerIds = new Set(
      flatLinks.map((link) => link.playerId.toString())
    );

    console.log(
      `[getPlayersForCoach] Unique player IDs: ${playerIds.size}`,
      Array.from(playerIds)
    );

    // Fetch all unique player records
    const players = await Promise.all(
      Array.from(playerIds).map(async (playerIdStr) => {
        const playerId = playerIdStr as Id<"players">;
        const player = await ctx.db.get(playerId);
        return player;
      })
    );

    const filteredPlayers = players.filter(
      (p) => p !== null && p.organizationId === args.organizationId
    );

    console.log(
      `[getPlayersForCoach] Returning ${filteredPlayers.length} players`
    );

    return filteredPlayers;
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
 * Bulk import players - optimized for large imports (e.g., GAA membership)
 * Creates multiple players and team assignments in a single efficient operation
 * Returns player IDs for all successfully created players
 */
export const bulkImportPlayers = mutation({
  args: {
    players: v.array(
      v.object({
        name: v.string(),
        ageGroup: v.string(),
        sport: v.string(),
        gender: v.string(),
        organizationId: v.string(),
        season: v.string(),
        teamId: v.string(), // For team assignment
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
        familyId: v.optional(v.string()),
        inferredParentFirstName: v.optional(v.string()),
        inferredParentSurname: v.optional(v.string()),
        inferredParentEmail: v.optional(v.string()),
        inferredParentPhone: v.optional(v.string()),
        inferredFromSource: v.optional(v.string()),
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
      })
    ),
  },
  returns: v.object({
    created: v.number(),
    playerIds: v.array(v.id("players")),
  }),
  handler: async (ctx, args) => {
    const playerIds: Id<"players">[] = [];
    const teamAssignments: Array<{ playerId: Id<"players">; teamId: string }> =
      [];

    console.log(`🚀 Bulk import starting: ${args.players.length} players`);

    // Create all players
    for (const playerData of args.players) {
      const playerId = await ctx.db.insert("players", {
        name: playerData.name,
        ageGroup: playerData.ageGroup,
        sport: playerData.sport,
        gender: playerData.gender,
        organizationId: playerData.organizationId,
        season: playerData.season,
        completionDate: playerData.completionDate,
        dateOfBirth: playerData.dateOfBirth,
        address: playerData.address,
        town: playerData.town,
        postcode: playerData.postcode,
        parentFirstName: playerData.parentFirstName,
        parentSurname: playerData.parentSurname,
        parentEmail: playerData.parentEmail,
        parentPhone: playerData.parentPhone,
        skills: playerData.skills ?? {},
        familyId: playerData.familyId,
        inferredParentFirstName: playerData.inferredParentFirstName,
        inferredParentSurname: playerData.inferredParentSurname,
        inferredParentEmail: playerData.inferredParentEmail,
        inferredParentPhone: playerData.inferredParentPhone,
        inferredFromSource: playerData.inferredFromSource,
        createdFrom: playerData.createdFrom,
        coachNotes: playerData.coachNotes,
        reviewedWith: playerData.reviewedWith,
        attendance: playerData.attendance,
        positions: playerData.positions,
        fitness: playerData.fitness,
        injuryNotes: playerData.injuryNotes,
        otherInterests: playerData.otherInterests,
        communications: playerData.communications,
        actions: playerData.actions,
        parentNotes: playerData.parentNotes,
        playerNotes: playerData.playerNotes,
        reviewStatus: "Not Started",
      });

      playerIds.push(playerId);
      teamAssignments.push({ playerId, teamId: playerData.teamId });
    }

    console.log(`✅ Created ${playerIds.length} players`);
    console.log(`🔗 Creating ${teamAssignments.length} team assignments...`);

    // Create all team assignments
    for (const assignment of teamAssignments) {
      // Check if already exists
      const existing = await ctx.db
        .query("teamPlayers")
        .withIndex("by_teamId", (q) => q.eq("teamId", assignment.teamId))
        .collect();

      const alreadyLinked = existing.find(
        (link) => link.playerId === assignment.playerId
      );

      if (!alreadyLinked) {
        await ctx.db.insert("teamPlayers", {
          teamId: assignment.teamId,
          playerId: assignment.playerId,
          createdAt: Date.now(),
        });
      }
    }

    console.log(
      `✅ Bulk import complete: ${playerIds.length} players with team assignments`
    );

    return {
      created: playerIds.length,
      playerIds,
    };
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

/**
 * Link players to a parent by updating player parent email fields
 * This is used in user management when assigning children to a parent user
 */
export const linkPlayersToParent = mutation({
  args: {
    playerIds: v.array(v.id("players")),
    parentEmail: v.string(),
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalizedEmail = args.parentEmail.toLowerCase().trim();

    // Update each player to link to this parent
    for (const playerId of args.playerIds) {
      const player = await ctx.db.get(playerId);
      if (!player) {
        continue;
      }

      // Verify player belongs to the same organization
      if (player.organizationId !== args.organizationId) {
        throw new Error(
          `Player ${player.name} does not belong to this organization`
        );
      }

      // Update parent email if not already set
      if (!player.parentEmail) {
        await ctx.db.patch(playerId, {
          parentEmail: normalizedEmail,
        });
      }
    }

    return null;
  },
});

/**
 * Unlink players from a parent
 */
export const unlinkPlayersFromParent = mutation({
  args: {
    playerIds: v.array(v.id("players")),
    parentEmail: v.string(),
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalizedEmail = args.parentEmail.toLowerCase().trim();

    // Remove parent email from each player
    for (const playerId of args.playerIds) {
      const player = await ctx.db.get(playerId);
      if (!player) {
        continue;
      }

      // Verify player belongs to the same organization
      if (player.organizationId !== args.organizationId) {
        continue;
      }

      // Remove parent email if it matches
      if (
        player.parentEmail?.toLowerCase().trim() === normalizedEmail ||
        player.inferredParentEmail?.toLowerCase().trim() === normalizedEmail
      ) {
        await ctx.db.patch(playerId, {
          parentEmail: undefined,
        });
      }
    }

    return null;
  },
});

/**
 * Auto-link a parent to their children based on email matching
 * This is called by the afterAddMember hook when a parent joins an organization
 *
 * Matches parent email against:
 * - player.parentEmail
 * - player.inferredParentEmail
 * - player.parentEmails array
 * - player.parents[].email array
 */
export const autoLinkParentToChildren = mutation({
  args: {
    parentEmail: v.string(),
    organizationId: v.string(),
  },
  returns: v.object({
    linked: v.number(),
    playerNames: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const normalizedEmail = args.parentEmail.toLowerCase().trim();

    // Find all players in this organization that might be linked to this parent
    const allPlayers = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    let linked = 0;
    const playerNames: string[] = [];

    for (const player of allPlayers) {
      let isMatch = false;

      // Check direct parentEmail field
      if (player.parentEmail?.toLowerCase().trim() === normalizedEmail) {
        isMatch = true;
      }

      // Check inferredParentEmail field
      if (
        player.inferredParentEmail?.toLowerCase().trim() === normalizedEmail
      ) {
        isMatch = true;
      }

      // Check parentEmails array
      if (
        player.parentEmails?.some(
          (email: string) => email.toLowerCase().trim() === normalizedEmail
        )
      ) {
        isMatch = true;
      }

      // Check parents array
      if (
        player.parents?.some(
          (parent: { email?: string }) =>
            parent.email?.toLowerCase().trim() === normalizedEmail
        )
      ) {
        isMatch = true;
      }

      if (isMatch) {
        // Update player to ensure parentEmail is set (if not already)
        if (!player.parentEmail) {
          await ctx.db.patch(player._id, {
            parentEmail: normalizedEmail,
          });
        }
        linked++;
        playerNames.push(player.name);
      }
    }

    if (linked > 0) {
      console.log(
        `[autoLinkParentToChildren] Linked ${linked} players to parent ${normalizedEmail}: ${playerNames.join(", ")}`
      );
    }

    return { linked, playerNames };
  },
});
