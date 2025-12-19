import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

const teamMemberStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("transferred")
);

const teamMemberValidator = v.object({
  _id: v.id("teamPlayerIdentities"),
  _creationTime: v.number(),
  teamId: v.string(),
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  role: v.optional(v.string()),
  status: teamMemberStatusValidator,
  season: v.optional(v.string()),
  joinedDate: v.optional(v.string()),
  leftDate: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get all players for a team
 */
export const getPlayersForTeam = query({
  args: {
    teamId: v.string(),
    status: v.optional(teamMemberStatusValidator),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    let members = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    if (args.status) {
      members = members.filter((m) => m.status === args.status);
    }

    // Enrich with player details
    const results = [];
    for (const member of members) {
      const player = await ctx.db.get(member.playerIdentityId);
      if (player) {
        // Get enrollment for ageGroup
        const enrollment = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_player_and_org", (q) =>
            q
              .eq("playerIdentityId", player._id)
              .eq("organizationId", member.organizationId)
          )
          .first();

        results.push({
          _id: player._id, // Use player identity ID for compatibility
          name: `${player.firstName} ${player.lastName}`,
          firstName: player.firstName,
          lastName: player.lastName,
          dateOfBirth: player.dateOfBirth,
          gender: player.gender,
          ageGroup: enrollment?.ageGroup || "",
          playerIdentityId: player._id,
        });
      }
    }

    return results;
  },
});

/**
 * Get all teams for a player identity
 */
export const getTeamsForPlayer = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    status: v.optional(teamMemberStatusValidator),
  },
  returns: v.array(teamMemberValidator),
  handler: async (ctx, args) => {
    let members = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    if (args.status) {
      members = members.filter((m) => m.status === args.status);
    }

    return members;
  },
});

/**
 * Get team IDs for a player identity (lightweight)
 */
export const getTeamIdsForPlayer = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    let members = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    if (args.activeOnly) {
      members = members.filter((m) => m.status === "active");
    }

    return members.map((m) => m.teamId);
  },
});

/**
 * Check if a player is on a specific team
 */
export const isPlayerOnTeam = query({
  args: {
    teamId: v.string(),
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_team_and_player", (q) =>
        q
          .eq("teamId", args.teamId)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    return member !== null && member.status === "active";
  },
});

/**
 * Get all team members for an organization
 */
export const getTeamMembersForOrg = query({
  args: {
    organizationId: v.string(),
    status: v.optional(teamMemberStatusValidator),
  },
  returns: v.array(teamMemberValidator),
  handler: async (ctx, args) => {
    let members = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    if (args.status) {
      members = members.filter((m) => m.status === args.status);
    }

    return members;
  },
});

/**
 * Get member record by team and player
 */
export const getMemberRecord = query({
  args: {
    teamId: v.string(),
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.union(teamMemberValidator, v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_team_and_player", (q) =>
        q
          .eq("teamId", args.teamId)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first(),
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Add a player to a team
 */
export const addPlayerToTeam = mutation({
  args: {
    teamId: v.string(),
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    role: v.optional(v.string()),
    season: v.optional(v.string()),
  },
  returns: v.id("teamPlayerIdentities"),
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_team_and_player", (q) =>
        q
          .eq("teamId", args.teamId)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (existing) {
      // If inactive/transferred, reactivate
      if (existing.status !== "active") {
        await ctx.db.patch(existing._id, {
          status: "active",
          role: args.role,
          season: args.season,
          joinedDate: new Date().toISOString().split("T")[0],
          leftDate: undefined,
          updatedAt: Date.now(),
        });
        return existing._id;
      }
      throw new Error("Player is already on this team");
    }

    // Verify player exists
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      throw new Error("Player identity not found");
    }

    const now = Date.now();

    return await ctx.db.insert("teamPlayerIdentities", {
      teamId: args.teamId,
      playerIdentityId: args.playerIdentityId,
      organizationId: args.organizationId,
      role: args.role,
      status: "active",
      season: args.season,
      joinedDate: new Date().toISOString().split("T")[0],
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Remove a player from a team (soft delete - marks as inactive)
 */
export const removePlayerFromTeam = mutation({
  args: {
    teamId: v.string(),
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_team_and_player", (q) =>
        q
          .eq("teamId", args.teamId)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!member) {
      throw new Error("Player is not on this team");
    }

    await ctx.db.patch(member._id, {
      status: "inactive",
      leftDate: new Date().toISOString().split("T")[0],
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Transfer a player to another team
 */
export const transferPlayer = mutation({
  args: {
    fromTeamId: v.string(),
    toTeamId: v.string(),
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    role: v.optional(v.string()),
    season: v.optional(v.string()),
  },
  returns: v.id("teamPlayerIdentities"),
  handler: async (ctx, args) => {
    // Mark old membership as transferred
    const oldMember = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_team_and_player", (q) =>
        q
          .eq("teamId", args.fromTeamId)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (oldMember) {
      await ctx.db.patch(oldMember._id, {
        status: "transferred",
        leftDate: new Date().toISOString().split("T")[0],
        updatedAt: Date.now(),
      });
    }

    // Create new membership
    const now = Date.now();

    // Check if already exists on target team
    const existing = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_team_and_player", (q) =>
        q
          .eq("teamId", args.toTeamId)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "active",
        role: args.role,
        season: args.season,
        joinedDate: new Date().toISOString().split("T")[0],
        leftDate: undefined,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("teamPlayerIdentities", {
      teamId: args.toTeamId,
      playerIdentityId: args.playerIdentityId,
      organizationId: args.organizationId,
      role: args.role,
      status: "active",
      season: args.season,
      joinedDate: new Date().toISOString().split("T")[0],
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update team member role
 */
export const updateMemberRole = mutation({
  args: {
    teamId: v.string(),
    playerIdentityId: v.id("playerIdentities"),
    role: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_team_and_player", (q) =>
        q
          .eq("teamId", args.teamId)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    if (!member) {
      throw new Error("Player is not on this team");
    }

    await ctx.db.patch(member._id, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Bulk add players to a team
 */
export const bulkAddPlayersToTeam = mutation({
  args: {
    teamId: v.string(),
    playerIdentityIds: v.array(v.id("playerIdentities")),
    organizationId: v.string(),
    season: v.optional(v.string()),
  },
  returns: v.object({
    added: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    let added = 0;
    let skipped = 0;
    const now = Date.now();

    for (const playerIdentityId of args.playerIdentityIds) {
      // Check if already exists
      const existing = await ctx.db
        .query("teamPlayerIdentities")
        .withIndex("by_team_and_player", (q) =>
          q.eq("teamId", args.teamId).eq("playerIdentityId", playerIdentityId)
        )
        .first();

      if (existing && existing.status === "active") {
        skipped++;
        continue;
      }

      if (existing) {
        // Reactivate
        await ctx.db.patch(existing._id, {
          status: "active",
          season: args.season,
          joinedDate: new Date().toISOString().split("T")[0],
          leftDate: undefined,
          updatedAt: now,
        });
        added++;
      } else {
        // Create new
        await ctx.db.insert("teamPlayerIdentities", {
          teamId: args.teamId,
          playerIdentityId,
          organizationId: args.organizationId,
          status: "active",
          season: args.season,
          joinedDate: new Date().toISOString().split("T")[0],
          createdAt: now,
          updatedAt: now,
        });
        added++;
      }
    }

    return { added, skipped };
  },
});

/**
 * Get player count for a team
 */
export const getPlayerCountForTeam = query({
  args: {
    teamId: v.string(),
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let members = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    if (args.activeOnly) {
      members = members.filter((m) => m.status === "active");
    }

    return members.length;
  },
});
