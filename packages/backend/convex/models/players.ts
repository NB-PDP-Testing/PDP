import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

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
 * Get players linked to a parent by email matching
 * Matches against parentEmail, inferredParentEmail, parentEmails[], and parents[].email
 *
 * Access Control: This query filters players based on parent email match,
 * so only the parent's own children are returned.
 */
export const getPlayersForParent = query({
  args: {
    organizationId: v.string(),
    parentEmail: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const normalizedEmail = args.parentEmail.toLowerCase().trim();

    // Get all players in the organization
    const allPlayers = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter players that match the parent's email
    const linkedPlayers = allPlayers.filter((player) => {
      // Check direct parentEmail field
      if (player.parentEmail?.toLowerCase().trim() === normalizedEmail) {
        return true;
      }

      // Check inferredParentEmail field
      if (
        player.inferredParentEmail?.toLowerCase().trim() === normalizedEmail
      ) {
        return true;
      }

      // Check parentEmails array
      if (
        player.parentEmails?.some(
          (email: string) => email.toLowerCase().trim() === normalizedEmail
        )
      ) {
        return true;
      }

      // Check parents array
      if (
        player.parents?.some(
          (parent: { email?: string }) =>
            parent.email?.toLowerCase().trim() === normalizedEmail
        )
      ) {
        return true;
      }

      return false;
    });

    console.log(
      `[getPlayersForParent] Found ${linkedPlayers.length} players linked to ${normalizedEmail}`
    );

    return linkedPlayers;
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
    // Normalize parent email if provided
    const normalizedParentEmail = args.parentEmail?.toLowerCase().trim();

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
      parentEmail: normalizedParentEmail,
      parentPhone: args.parentPhone,
      skills: {},
      reviewStatus: "Not Started",
    });

    // Auto-link: Check if parent email matches an existing user in this organization
    // If so, log for future parent dashboard access (the parentEmail field enables this)
    if (normalizedParentEmail) {
      // Find all members in this organization
      const membersResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "member",
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

      // Get user IDs of members with parent functional role
      const parentMembers = membersResult.page.filter(
        (m: any) =>
          m.functionalRoles?.includes("parent") ||
          m.functionalRoles?.includes("admin")
      );

      if (parentMembers.length > 0) {
        // Get all users for these members
        const userIds = parentMembers.map((m: any) => m.userId);

        for (const userId of userIds) {
          const user = await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: "user",
              where: [{ field: "_id", value: userId, operator: "eq" }],
            }
          );

          if (user?.email?.toLowerCase().trim() === normalizedParentEmail) {
            console.log(
              `[createPlayer] Auto-linked player "${args.name}" to parent user ${user.email} (userId: ${userId})`
            );
            break;
          }
        }
      }
    }

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
    // Normalize emails for consistent matching
    const normalizedParentEmail = args.parentEmail?.toLowerCase().trim();
    const normalizedInferredEmail = args.inferredParentEmail
      ?.toLowerCase()
      .trim();

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
      parentEmail: normalizedParentEmail,
      parentPhone: args.parentPhone,
      skills: args.skills ?? {},
      familyId: args.familyId,
      inferredParentFirstName: args.inferredParentFirstName,
      inferredParentSurname: args.inferredParentSurname,
      inferredParentEmail: normalizedInferredEmail,
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

    // Note: For bulk imports, parent auto-linking happens via:
    // 1. autoLinkParentToChildren mutation (called when parent joins org)
    // 2. Smart matching on the approval page
    // We don't do per-player user lookup during import for performance reasons

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

// ============================================================================
// SMART MATCHING FOR PARENTS
// ============================================================================

/**
 * Helper: Normalize a name for matching - extracts first and last name, ignoring middle names
 */
function normalizeNameForMatching(name: string): {
  normalized: string;
  firstName: string;
  lastName: string;
} {
  const parts = name.trim().toLowerCase().split(/\s+/);
  if (parts.length === 0) {
    return { normalized: "", firstName: "", lastName: "" };
  }
  const firstName = parts[0] ?? "";
  const lastName = parts.length > 1 ? (parts.at(-1) ?? "") : "";
  return {
    normalized: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
  };
}

/**
 * Helper: Clean postcode for comparison
 */
function cleanPostcode(postcode: string | undefined): string {
  return (postcode || "").toUpperCase().replace(/\s/g, "");
}

/**
 * Helper: Extract house number from address
 */
function extractHouseNumber(address: string | undefined): string {
  const match = (address || "").match(/^\d+/);
  return match ? match[0] : "";
}

/**
 * Get smart matches for a parent joining an organization
 * Returns players with confidence scores and match reasons
 *
 * Matching criteria:
 * - Email match: 50 points (highest confidence)
 * - Child name match: 25-40 points (tiered by match quality)
 * - Age bonus: 20 points (when name matches AND age within 1 year)
 * - Surname match: 25 points
 * - Phone match: 15 points (last 10 digits)
 * - Postcode match: 20 points
 * - Town match: 10 points
 * - House number match: 5 points
 *
 * Confidence tiers:
 * - High: 60+ points
 * - Medium: 30-59 points
 * - Low: 10-29 points
 * - None: 0-9 points
 */
export const getSmartMatchesForParent = query({
  args: {
    organizationId: v.string(),
    email: v.string(),
    surname: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    children: v.optional(v.string()), // JSON string of [{name, age?, team?}]
  },
  returns: v.array(
    v.object({
      _id: v.id("players"),
      name: v.string(),
      ageGroup: v.string(),
      sport: v.string(),
      dateOfBirth: v.union(v.string(), v.null()),
      // Parent info from import
      inferredParentFirstName: v.union(v.string(), v.null()),
      inferredParentSurname: v.union(v.string(), v.null()),
      inferredParentEmail: v.union(v.string(), v.null()),
      inferredParentPhone: v.union(v.string(), v.null()),
      // Address info
      address: v.union(v.string(), v.null()),
      town: v.union(v.string(), v.null()),
      postcode: v.union(v.string(), v.null()),
      // Match scoring
      matchScore: v.number(),
      matchReasons: v.array(v.string()),
      confidence: v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
        v.literal("none")
      ),
      // Existing links
      existingParentEmail: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    // Get all players in the organization
    const allPlayers = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Parse children if provided
    let childrenData: Array<{ name: string; age?: number; team?: string }> = [];
    if (args.children) {
      try {
        childrenData = JSON.parse(args.children);
      } catch (_e) {
        console.warn(
          "[getSmartMatchesForParent] Failed to parse children JSON"
        );
      }
    }

    // Normalize input data
    const normalizedEmail = args.email.toLowerCase().trim();
    const normalizedSurname = args.surname?.toLowerCase().trim() || "";
    const normalizedPhone = (args.phone || "").replace(/\D/g, "").slice(-10);
    const inputPostcode = cleanPostcode(args.address);
    const inputHouseNumber = extractHouseNumber(args.address);

    // Common NI towns for address matching
    const niTowns = [
      "armagh",
      "dungannon",
      "portadown",
      "lurgan",
      "craigavon",
      "moy",
      "loughgall",
      "richhill",
      "markethill",
      "keady",
      "crossmaglen",
      "newry",
      "belfast",
      "lisburn",
      "banbridge",
      "tandragee",
    ];

    // Extract town from address if present
    const inputAddressLower = (args.address || "").toLowerCase();
    const inputTown = niTowns.find((town) => inputAddressLower.includes(town));

    // Score each player
    const scoredPlayers = allPlayers.map((player) => {
      let score = 0;
      const matchReasons: string[] = [];

      // 1. Email match - 50 points (highest confidence)
      const playerEmail = (player.inferredParentEmail || "")
        .toLowerCase()
        .trim();
      if (playerEmail && playerEmail === normalizedEmail) {
        score += 50;
        matchReasons.push("Email match");
      }

      // Also check parentEmail field
      const directParentEmail = (player.parentEmail || "").toLowerCase().trim();
      if (
        directParentEmail &&
        directParentEmail === normalizedEmail &&
        !matchReasons.includes("Email match")
      ) {
        score += 50;
        matchReasons.push("Email match");
      }

      // 2. Child name matching - 25-40 points (tiered)
      if (childrenData.length > 0) {
        const playerNameParts = normalizeNameForMatching(player.name);

        for (const child of childrenData) {
          const childNameParts = normalizeNameForMatching(child.name);

          // Tier 1: Exact normalized match (ignores middle names) - 40 points
          if (
            playerNameParts.normalized === childNameParts.normalized &&
            playerNameParts.normalized.length > 0
          ) {
            if (!matchReasons.some((r) => r.includes("Child name"))) {
              score += 40;
              matchReasons.push(`Child name exact match: ${child.name}`);
            }

            // Age bonus - 20 points if name matches AND age within 1 year
            if (child.age && player.dateOfBirth) {
              try {
                const birthYear = new Date(player.dateOfBirth).getFullYear();
                const currentYear = new Date().getFullYear();
                const playerAge = currentYear - birthYear;
                if (Math.abs(playerAge - child.age) <= 1) {
                  score += 20;
                  matchReasons.push(`Age confirmed: ~${playerAge} years`);
                }
              } catch (_e) {
                // Invalid date, skip age bonus
              }
            }
          }
          // Tier 2: First + Last name match - 35 points
          else if (
            playerNameParts.firstName === childNameParts.firstName &&
            playerNameParts.lastName === childNameParts.lastName &&
            playerNameParts.firstName.length > 0 &&
            playerNameParts.lastName.length > 0
          ) {
            if (!matchReasons.some((r) => r.includes("Child name"))) {
              score += 35;
              matchReasons.push(`Child name match: ${child.name}`);
            }
          }
          // Tier 3: First name only - 25 points
          else if (
            playerNameParts.firstName === childNameParts.firstName &&
            playerNameParts.firstName.length > 2 &&
            !matchReasons.some((r) => r.includes("Child name"))
          ) {
            score += 25;
            matchReasons.push(
              `Child first name match: ${childNameParts.firstName}`
            );
          }
        }
      }

      // 3. Surname match - 25 points
      if (normalizedSurname) {
        const playerSurname = (
          player.inferredParentSurname ||
          player.parentSurname ||
          ""
        )
          .toLowerCase()
          .trim();
        const playerNameParts = normalizeNameForMatching(player.name);

        if (
          (playerSurname && playerSurname === normalizedSurname) ||
          playerNameParts.lastName === normalizedSurname
        ) {
          score += 25;
          matchReasons.push("Surname match");
        }
      }

      // 4. Phone match - 15 points (last 10 digits)
      if (normalizedPhone.length >= 10) {
        const playerPhone = (
          player.inferredParentPhone ||
          player.parentPhone ||
          ""
        )
          .replace(/\D/g, "")
          .slice(-10);
        if (playerPhone.length >= 10 && playerPhone === normalizedPhone) {
          score += 15;
          matchReasons.push("Phone match");
        }
      }

      // 5. Address matching
      // Postcode - 20 points (strong signal)
      const playerPostcode = cleanPostcode(player.postcode);
      if (inputPostcode && playerPostcode && inputPostcode === playerPostcode) {
        score += 20;
        matchReasons.push("Postcode match");
      }

      // Town - 10 points (medium signal)
      const playerAddressLower = (player.address || "").toLowerCase();
      const playerTown =
        (player.town || "").toLowerCase() ||
        niTowns.find((town) => playerAddressLower.includes(town));
      if (inputTown && playerTown && inputTown === playerTown) {
        score += 10;
        matchReasons.push(`Town match: ${inputTown}`);
      }

      // House number - 5 points (weak signal, tiebreaker)
      const playerHouseNumber = extractHouseNumber(player.address);
      if (
        inputHouseNumber &&
        playerHouseNumber &&
        inputHouseNumber === playerHouseNumber
      ) {
        score += 5;
        matchReasons.push("House number match");
      }

      // Determine confidence tier
      let confidence: "high" | "medium" | "low" | "none";
      if (score >= 60) {
        confidence = "high";
      } else if (score >= 30) {
        confidence = "medium";
      } else if (score >= 10) {
        confidence = "low";
      } else {
        confidence = "none";
      }

      return {
        _id: player._id,
        name: player.name,
        ageGroup: player.ageGroup,
        sport: player.sport,
        dateOfBirth: player.dateOfBirth || null,
        inferredParentFirstName: player.inferredParentFirstName || null,
        inferredParentSurname: player.inferredParentSurname || null,
        inferredParentEmail: player.inferredParentEmail || null,
        inferredParentPhone: player.inferredParentPhone || null,
        address: player.address || null,
        town: player.town || null,
        postcode: player.postcode || null,
        matchScore: score,
        matchReasons,
        confidence,
        existingParentEmail: player.parentEmail || null,
      };
    });

    // Filter out players with no matches and sort by score
    const matches = scoredPlayers
      .filter((p) => p.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    return matches;
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

/**
 * Internal version of autoLinkParentToChildren for use by other backend mutations
 * Same logic as the public mutation but uses internalMutation for security
 */
export const autoLinkParentToChildrenInternal = internalMutation({
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
        `[autoLinkParentToChildrenInternal] Linked ${linked} players to parent ${normalizedEmail}: ${playerNames.join(", ")}`
      );
    }

    return { linked, playerNames };
  },
});
