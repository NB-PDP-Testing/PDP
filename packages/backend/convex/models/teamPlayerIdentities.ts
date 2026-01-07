import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import type { Doc as BetterAuthDoc } from "../betterAuth/_generated/dataModel";

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
 * By default, only returns active players. Pass status to override.
 */
export const getPlayersForTeam = query({
  args: {
    teamId: v.string(),
    status: v.optional(teamMemberStatusValidator),
    includeAll: v.optional(v.boolean()), // Set true to include all statuses
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    let members = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Filter by status - default to 'active' unless includeAll is true
    if (args.includeAll) {
      // Return all players regardless of status
      if (args.status) {
        members = members.filter((m) => m.status === args.status);
      }
    } else if (args.status) {
      // Filter by specific status
      members = members.filter((m) => m.status === args.status);
    } else {
      // Default: only active players
      members = members.filter((m) => m.status === "active");
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
 * Add a player to a team with sport-specific age eligibility validation
 */
export const addPlayerToTeam = mutation({
  args: {
    teamId: v.string(),
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    role: v.optional(v.string()),
    season: v.optional(v.string()),
    bypassValidation: v.optional(v.boolean()), // Internal use only
  },
  returns: v.object({
    success: v.boolean(),
    teamPlayerIdentityId: v.optional(v.id("teamPlayerIdentities")),
    warning: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Verify player exists
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      return {
        success: false,
        error: "Player identity not found",
      };
    }

    // Get player's enrollment (age group + sport)
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!enrollment) {
      return {
        success: false,
        error: "Player enrollment not found in this organization",
      };
    }

    // Get team details from Better Auth
    const teamResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "team",
        paginationOpts: { cursor: null, numItems: 1 },
        where: [{ field: "_id", value: args.teamId, operator: "eq" }],
      }
    );
    const team = teamResult.page[0] as BetterAuthDoc<"team"> | undefined;

    if (!team) {
      return {
        success: false,
        error: "Team not found",
      };
    }

    // Sport-specific age eligibility validation (unless bypassed)
    if (!args.bypassValidation) {
      const playerAgeGroup = enrollment.ageGroup || "";
      const teamAgeGroup = team.ageGroup || "";
      const teamSport = team.sport || "";

      // Phase 3: Check if player has sport passport for team's sport
      // Sport is now stored in sportPassports, not enrollment
      const playerPassport = await ctx.db
        .query("sportPassports")
        .withIndex("by_player_and_org", (q) =>
          q
            .eq("playerIdentityId", args.playerIdentityId)
            .eq("organizationId", args.organizationId)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("sportCode"), teamSport),
            q.eq(q.field("status"), "active")
          )
        )
        .first();

      // FIX: If no sport passport exists, create one automatically
      let playerSport = teamSport;
      if (playerPassport) {
        // Sport is valid - use sportCode from passport for subsequent validations
        playerSport = playerPassport.sportCode;
      } else {
        // Auto-create sport passport for this player
        const now = Date.now();
        await ctx.db.insert("sportPassports", {
          playerIdentityId: args.playerIdentityId,
          organizationId: args.organizationId,
          sportCode: teamSport,
          status: "active",
          createdAt: now,
          updatedAt: now,
          assessmentCount: 0,
        });
        console.log(
          `[addPlayerToTeam] Auto-created sport passport for player ${args.playerIdentityId} in sport ${teamSport}`
        );
      }

      // Get team enforcement settings
      const enforcementSettings = await ctx.db
        .query("teamEligibilitySettings")
        .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      const enforcementLevel =
        enforcementSettings?.enforcementLevel || "strict";

      // Get sport eligibility rules
      const sportRules = await ctx.db
        .query("sportAgeGroupEligibilityRules")
        .withIndex("by_sport", (q) => q.eq("sportCode", playerSport))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      // Check eligibility
      const DEFAULT_AGE_GROUP_ORDER = [
        "u6",
        "u7",
        "u8",
        "u9",
        "u10",
        "u11",
        "u12",
        "u13",
        "u14",
        "u15",
        "u16",
        "u17",
        "u18",
        "minor",
        "adult",
        "senior",
      ];

      let isEligible = false;
      let eligibilityReason = "";

      // Check if core team (always eligible) - matches both age AND sport
      const isCoreTeam =
        teamAgeGroup.toLowerCase() === playerAgeGroup.toLowerCase() &&
        teamSport === playerSport;

      if (isCoreTeam) {
        isEligible = true;
        eligibilityReason = "Core team (matches enrollment age group)";
      } else {
        // Check sport-specific rule
        const specificRule = sportRules.find(
          (rule) =>
            rule.fromAgeGroupCode.toLowerCase() ===
              playerAgeGroup.toLowerCase() &&
            rule.toAgeGroupCode.toLowerCase() === teamAgeGroup.toLowerCase()
        );

        if (specificRule) {
          isEligible = specificRule.isAllowed;
          eligibilityReason = specificRule.description || "";
        } else {
          // Fall back to default age hierarchy
          const playerRank = DEFAULT_AGE_GROUP_ORDER.indexOf(
            playerAgeGroup.toLowerCase()
          );
          const teamRank = DEFAULT_AGE_GROUP_ORDER.indexOf(
            teamAgeGroup.toLowerCase()
          );

          if (playerRank !== -1 && teamRank !== -1 && teamRank >= playerRank) {
            isEligible = true;
            eligibilityReason =
              "Meets age requirements (same or higher age group)";
          } else {
            isEligible = false;
            eligibilityReason =
              "Playing in younger age group requires admin approval";
          }
        }
      }

      // Check for active override if not eligible
      if (!isEligible) {
        const now = Date.now();
        const override = await ctx.db
          .query("ageGroupEligibilityOverrides")
          .withIndex("by_player_and_team", (q) =>
            q
              .eq("playerIdentityId", args.playerIdentityId)
              .eq("teamId", args.teamId)
          )
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();

        // Check if override is active and not expired
        const hasActiveOverride =
          override && (!override.expiresAt || override.expiresAt > now);

        if (hasActiveOverride) {
          isEligible = true;
          eligibilityReason = `Admin override active: ${override.reason}`;
        }
      }

      // Apply enforcement level
      if (!isEligible) {
        if (enforcementLevel === "flexible") {
          // Allow but log warning
          eligibilityReason = `FLEXIBLE MODE: ${eligibilityReason}`;
        } else if (enforcementLevel === "warning") {
          // Allow but return warning
          // Continue to add player but flag the warning
        } else {
          // Strict mode - block assignment
          return {
            success: false,
            error: `Age eligibility requirement not met: ${eligibilityReason}. Admin override required.`,
          };
        }
      }
    }

    // Check if already exists
    const existing = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_team_and_player", (q) =>
        q
          .eq("teamId", args.teamId)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    const now = Date.now();
    let teamPlayerIdentityId: Id<"teamPlayerIdentities">;

    if (existing) {
      // If inactive/transferred, reactivate
      if (existing.status !== "active") {
        await ctx.db.patch(existing._id, {
          status: "active",
          role: args.role,
          season: args.season,
          joinedDate: new Date().toISOString().split("T")[0],
          leftDate: undefined,
          updatedAt: now,
        });
        teamPlayerIdentityId = existing._id;
      } else {
        return {
          success: false,
          error: "Player is already on this team",
        };
      }
    } else {
      // Create new membership
      teamPlayerIdentityId = await ctx.db.insert("teamPlayerIdentities", {
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
    }

    return {
      success: true,
      teamPlayerIdentityId,
    };
  },
});

/**
 * Remove a player from a team (soft delete - marks as inactive)
 * Only admins can remove players from their core team
 */
export const removePlayerFromTeam = mutation({
  args: {
    teamId: v.string(),
    playerIdentityId: v.id("playerIdentities"),
    userEmail: v.string(), // For permission check
    organizationId: v.string(),
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

    // Check if this is the core team
    // 1. Get player's enrollment age group
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (enrollment) {
      // 2. Get team details from Better Auth
      const teamResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "team",
          paginationOpts: { cursor: null, numItems: 1 },
          where: [{ field: "_id", value: args.teamId, operator: "eq" }],
        }
      );
      const team = teamResult.page[0] as BetterAuthDoc<"team"> | undefined;

      if (team) {
        // 3. Phase 3: Check if core team using sportPassports
        // Get player's sport passports for this org
        const sportPassports = await ctx.db
          .query("sportPassports")
          .withIndex("by_player_and_org", (q) =>
            q
              .eq("playerIdentityId", args.playerIdentityId)
              .eq("organizationId", args.organizationId)
          )
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();

        const playerSportCodes = sportPassports.map((p) => p.sportCode);
        const teamSport = team.sport || "";

        // Core team: age group matches AND player has sportPassport for team's sport
        const isCoreTeam =
          team.ageGroup?.toLowerCase() === enrollment.ageGroup?.toLowerCase() &&
          playerSportCodes.includes(teamSport);

        if (isCoreTeam) {
          // Get user from Better Auth
          const userResult = await ctx.runQuery(
            components.betterAuth.adapter.findMany,
            {
              model: "user",
              paginationOpts: { cursor: null, numItems: 1 },
              where: [
                { field: "email", value: args.userEmail, operator: "eq" },
              ],
            }
          );
          const user = userResult.page[0] as BetterAuthDoc<"user"> | undefined;

          if (!user) {
            throw new Error("User not found");
          }

          // Get member record from Better Auth
          const memberResult = await ctx.runQuery(
            components.betterAuth.adapter.findMany,
            {
              model: "member",
              paginationOpts: { cursor: null, numItems: 1 },
              where: [
                { field: "userId", value: user._id, operator: "eq" },
                {
                  field: "organizationId",
                  value: args.organizationId,
                  operator: "eq",
                },
              ],
            }
          );
          const memberRecord = memberResult.page[0] as
            | BetterAuthDoc<"member">
            | undefined;

          const functionalRoles = (memberRecord as any)?.functionalRoles || [];
          const isAdmin = functionalRoles.includes("admin");

          if (!isAdmin) {
            throw new Error(
              "Only admins can remove players from their core team. Contact an administrator if you need to make this change."
            );
          }
        }
      }
    }

    // Proceed with soft delete
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
        skipped += 1;
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
        added += 1;
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
        added += 1;
      }
    }

    return { added, skipped };
  },
});

/**
 * Update player's teams (bulk operation)
 * Syncs a player's team memberships to match the provided teamIds list
 */
export const updatePlayerTeams = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    teamIds: v.array(v.string()), // Complete list of teams player should be on
    userEmail: v.string(),
    season: v.optional(v.string()),
  },
  returns: v.object({
    added: v.array(v.string()),
    removed: v.array(v.string()),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const added: string[] = [];
    const removed: string[] = [];
    const errors: string[] = [];

    // 1. Get current active teams
    const currentMemberships = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    const currentTeamIds = new Set(currentMemberships.map((m) => m.teamId));
    const targetTeamIds = new Set(args.teamIds);

    // 2. Compute diff
    const toAdd = args.teamIds.filter((id) => !currentTeamIds.has(id));
    const toRemove = Array.from(currentTeamIds).filter(
      (id) => !targetTeamIds.has(id)
    );

    // 3. Add new teams (inline the add logic to avoid circular mutation calls)
    const now = Date.now();
    for (const teamId of toAdd) {
      try {
        // Get team details from Better Auth
        const teamResult = await ctx.runQuery(
          components.betterAuth.adapter.findMany,
          {
            model: "team",
            paginationOpts: { cursor: null, numItems: 1 },
            where: [{ field: "_id", value: teamId, operator: "eq" }],
          }
        );
        const team = teamResult.page[0] as BetterAuthDoc<"team"> | undefined;

        if (!team) {
          errors.push(`Team ${teamId} not found`);
          continue;
        }

        // Check if already exists (might be inactive)
        const existing = await ctx.db
          .query("teamPlayerIdentities")
          .withIndex("by_team_and_player", (q) =>
            q.eq("teamId", teamId).eq("playerIdentityId", args.playerIdentityId)
          )
          .first();

        if (existing && existing.status === "active") {
          // Already active, skip
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
        } else {
          // Create new membership
          await ctx.db.insert("teamPlayerIdentities", {
            teamId,
            playerIdentityId: args.playerIdentityId,
            organizationId: args.organizationId,
            status: "active",
            season: args.season,
            joinedDate: new Date().toISOString().split("T")[0],
            createdAt: now,
            updatedAt: now,
          });
        }

        added.push(team.name);
      } catch (error) {
        errors.push(
          `Failed to add to team ${teamId}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    // 4. Remove from teams (inline the remove logic with permission check)
    for (const teamId of toRemove) {
      try {
        // Get team details from Better Auth
        const teamResult = await ctx.runQuery(
          components.betterAuth.adapter.findMany,
          {
            model: "team",
            paginationOpts: { cursor: null, numItems: 1 },
            where: [{ field: "_id", value: teamId, operator: "eq" }],
          }
        );
        const team = teamResult.page[0] as BetterAuthDoc<"team"> | undefined;

        if (!team) {
          errors.push(`Team ${teamId} not found`);
          continue;
        }

        // Get membership record
        const member = await ctx.db
          .query("teamPlayerIdentities")
          .withIndex("by_team_and_player", (q) =>
            q.eq("teamId", teamId).eq("playerIdentityId", args.playerIdentityId)
          )
          .first();

        if (!member) {
          continue; // Not on team, skip
        }

        // Check if this is the core team before removing
        const enrollment = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_player_and_org", (q) =>
            q
              .eq("playerIdentityId", args.playerIdentityId)
              .eq("organizationId", args.organizationId)
          )
          .first();

        if (enrollment) {
          // Phase 3: Check if core team using sportPassports
          const sportPassports = await ctx.db
            .query("sportPassports")
            .withIndex("by_player_and_org", (q) =>
              q
                .eq("playerIdentityId", args.playerIdentityId)
                .eq("organizationId", args.organizationId)
            )
            .filter((q) => q.eq(q.field("status"), "active"))
            .collect();

          const playerSportCodes = sportPassports.map((p) => p.sportCode);
          const teamSport = team.sport || "";

          const isCoreTeam =
            team.ageGroup?.toLowerCase() ===
              enrollment.ageGroup?.toLowerCase() &&
            playerSportCodes.includes(teamSport);

          if (isCoreTeam) {
            // Check user permissions using Better Auth
            const userResult = await ctx.runQuery(
              components.betterAuth.adapter.findMany,
              {
                model: "user",
                paginationOpts: { cursor: null, numItems: 1 },
                where: [
                  { field: "email", value: args.userEmail, operator: "eq" },
                ],
              }
            );
            const user = userResult.page[0] as
              | BetterAuthDoc<"user">
              | undefined;

            if (!user) {
              errors.push(
                `${team.name}: Cannot verify user permissions (user not found)`
              );
              continue;
            }

            const memberResult = await ctx.runQuery(
              components.betterAuth.adapter.findMany,
              {
                model: "member",
                paginationOpts: { cursor: null, numItems: 1 },
                where: [
                  { field: "userId", value: user._id, operator: "eq" },
                  {
                    field: "organizationId",
                    value: args.organizationId,
                    operator: "eq",
                  },
                ],
              }
            );
            const memberRecord = memberResult.page[0] as
              | BetterAuthDoc<"member">
              | undefined;

            const functionalRoles = memberRecord?.functionalRoles || [];
            const isAdmin = functionalRoles.includes("admin");

            if (!isAdmin) {
              errors.push(
                `${team.name}: Only admins can remove players from their core team`
              );
              continue;
            }
          }
        }

        // Proceed with soft delete
        await ctx.db.patch(member._id, {
          status: "inactive",
          leftDate: new Date().toISOString().split("T")[0],
          updatedAt: now,
        });

        removed.push(team.name);
      } catch (error) {
        errors.push(
          `Failed to remove from team ${teamId}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    return { added, removed, errors };
  },
});

/**
 * Get player count for a team
 * By default, only counts active players
 */
export const getPlayerCountForTeam = query({
  args: {
    teamId: v.string(),
    activeOnly: v.optional(v.boolean()), // Defaults to true
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Default to active only (unless explicitly set to false)
    const countActiveOnly = args.activeOnly !== false;

    if (countActiveOnly) {
      return members.filter((m) => m.status === "active").length;
    }

    return members.length;
  },
});

/**
 * Get core team for a player
 * Core team = team where team.ageGroup === enrollment.ageGroup
 */
export const getCoreTeamForPlayer = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      teamId: v.string(),
      teamName: v.string(),
      ageGroup: v.string(),
      sportCode: v.string(),
      isActive: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    // 1. Get player's enrollment to find their age group
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!enrollment?.ageGroup) {
      return null;
    }

    // Phase 3: Get all active sport passports for this player in this org
    // Sport is now stored in sportPassports, not enrollment
    const sportPassports = await ctx.db
      .query("sportPassports")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (sportPassports.length === 0) {
      return null; // No active sports
    }

    // 2. Get all teams in org from Better Auth
    const teamsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "team",
        paginationOpts: { cursor: null, numItems: 1000 },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );
    const allTeams = teamsResult.page as BetterAuthDoc<"team">[];

    // Find core team matching enrollment age group AND any of player's sports
    // Priority: Return first matching sport (usually there's only one)
    const coreTeam = allTeams.find((team) => {
      const matchesAgeGroup =
        team.ageGroup?.toLowerCase() === enrollment.ageGroup?.toLowerCase();
      const matchesSport = sportPassports.some(
        (passport) => passport.sportCode === team.sport
      );
      return matchesAgeGroup && matchesSport;
    });

    if (!coreTeam) {
      return null;
    }

    // 3. Check if player is actually on that team (active)
    const membership = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_team_and_player", (q) =>
        q
          .eq("teamId", coreTeam._id)
          .eq("playerIdentityId", args.playerIdentityId)
      )
      .first();

    const isActive = membership?.status === "active";

    // 4. Return team details
    return {
      teamId: coreTeam._id,
      teamName: coreTeam.name,
      ageGroup: coreTeam.ageGroup || "",
      sportCode: coreTeam.sport || "",
      isActive,
    };
  },
});

/**
 * Get current teams for a player (IMMEDIATE FIX - Phase 1)
 * Returns actual team memberships from teamPlayerIdentities
 * This works like the coach page - doesn't require enrollment.sport
 * Use this for displaying which teams a player is currently on
 */
export const getCurrentTeamsForPlayer = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    status: v.optional(teamMemberStatusValidator),
  },
  returns: v.array(
    v.object({
      _id: v.id("teamPlayerIdentities"),
      teamId: v.string(),
      teamName: v.string(),
      ageGroup: v.string(),
      sportCode: v.string(),
      isCoreTeam: v.boolean(),
      isCurrentlyOn: v.boolean(),
      role: v.optional(v.string()),
      status: teamMemberStatusValidator,
      joinedDate: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // 1. Get team memberships (source of truth - like coach page!)
    let memberships = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    // Filter by status if provided (default: active only)
    if (args.status) {
      memberships = memberships.filter((m) => m.status === args.status);
    } else {
      memberships = memberships.filter((m) => m.status === "active");
    }

    // 2. Get enrollment for core team calculation
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    const enrollmentAgeGroup = enrollment?.ageGroup?.toLowerCase() || "";

    // Phase 3: Get player's sport passports
    // Sport is now stored in sportPassports, not enrollment
    const sportPassports = enrollment
      ? await ctx.db
          .query("sportPassports")
          .withIndex("by_player_and_org", (q) =>
            q
              .eq("playerIdentityId", args.playerIdentityId)
              .eq("organizationId", args.organizationId)
          )
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect()
      : [];

    const playerSportCodes = sportPassports.map((p) => p.sportCode);

    // 3. Enrich with team details from Better Auth
    const results = [];
    for (const member of memberships) {
      const teamResult = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "team",
          where: [{ field: "_id", value: member.teamId, operator: "eq" }],
        }
      );

      if (teamResult) {
        const team = teamResult as BetterAuthDoc<"team">;
        const teamAgeGroup = team.ageGroup?.toLowerCase() || "";
        const teamSport = team.sport || "";

        // Calculate core team: age group match AND sport match (Phase 3)
        const isCoreTeam =
          teamAgeGroup === enrollmentAgeGroup &&
          playerSportCodes.includes(teamSport);

        results.push({
          _id: member._id,
          teamId: member.teamId,
          teamName: team.name,
          ageGroup: team.ageGroup || "",
          sportCode: teamSport,
          isCoreTeam,
          isCurrentlyOn: true, // They are on this team (from teamPlayerIdentities)
          role: member.role,
          status: member.status,
          joinedDate: member.joinedDate,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
        });
      }
    }

    // Sort: core team first, then by team name
    results.sort((a, b) => {
      if (a.isCoreTeam && !b.isCoreTeam) {
        return -1;
      }
      if (!a.isCoreTeam && b.isCoreTeam) {
        return 1;
      }
      return a.teamName.localeCompare(b.teamName);
    });

    return results;
  },
});

/**
 * Get eligible teams for a player with eligibility status
 * Returns all teams in org with eligibility information
 */
export const getEligibleTeamsForPlayer = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      teamId: v.string(),
      teamName: v.string(),
      ageGroup: v.string(),
      sportCode: v.string(),
      isCurrentlyOn: v.boolean(),
      isCoreTeam: v.boolean(),
      eligibilityStatus: v.union(
        v.literal("eligible"),
        v.literal("requiresOverride"),
        v.literal("hasOverride"),
        v.literal("ineligible")
      ),
      reason: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // 1. Get player's enrollment to find their age group
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!enrollment?.ageGroup) {
      return [];
    }

    const playerAgeGroup = enrollment.ageGroup;

    // Phase 3: Get all active sport passports
    // Sport is now stored in sportPassports, not enrollment
    const sportPassports = await ctx.db
      .query("sportPassports")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // FIX: Don't return empty array if no sport passports
    // Instead, show all teams but mark them as needing sport enrollment
    const playerSportCodes = sportPassports.map((p) => p.sportCode);
    const hasNoSportPassports = sportPassports.length === 0;

    // 2. Get all teams in org from Better Auth
    const teamsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "team",
        paginationOpts: { cursor: null, numItems: 1000 },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );
    const allTeams = teamsResult.page as BetterAuthDoc<"team">[];

    // 3. Get player's current teams
    const currentMemberships = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const currentTeamIds = new Set(currentMemberships.map((m) => m.teamId));

    // 4. Get sport-specific eligibility rules for ALL player's sports
    const sportRules = await ctx.db
      .query("sportAgeGroupEligibilityRules")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter to only rules relevant to player's sports
    const relevantSportRules = sportRules.filter((rule) =>
      playerSportCodes.includes(rule.sportCode)
    );

    // 5. Get active overrides for this player
    const now = Date.now();
    const overrides = await ctx.db
      .query("ageGroupEligibilityOverrides")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();

    // Filter out expired overrides
    const activeOverrides = overrides.filter(
      (o) => !o.expiresAt || o.expiresAt > now
    );
    const overrideTeamIds = new Set(activeOverrides.map((o) => o.teamId));

    // 6. Process each team
    const DEFAULT_AGE_GROUP_ORDER = [
      "u6",
      "u7",
      "u8",
      "u9",
      "u10",
      "u11",
      "u12",
      "u13",
      "u14",
      "u15",
      "u16",
      "u17",
      "u18",
      "minor",
      "adult",
      "senior",
    ];

    const results = [];
    for (const team of allTeams) {
      const teamAgeGroup = team.ageGroup || "";
      const teamSport = team.sport || "";

      // Determine if this is the core team (age group match AND sport match)
      const isCoreTeam =
        teamAgeGroup.toLowerCase() === playerAgeGroup.toLowerCase() &&
        playerSportCodes.includes(teamSport);

      // Check current membership
      const isCurrentlyOn = currentTeamIds.has(team._id);

      // Determine eligibility status
      let eligibilityStatus:
        | "eligible"
        | "requiresOverride"
        | "hasOverride"
        | "ineligible";
      let reason: string | undefined;

      // If has active override, mark as hasOverride
      if (overrideTeamIds.has(team._id)) {
        eligibilityStatus = "hasOverride";
        reason = "Admin override active";
      }
      // FIX: If player has no sport passports, use age-based eligibility only
      // This allows teams to show up and player can be added (sport passport created on demand)
      else if (hasNoSportPassports) {
        // No sport passports - determine eligibility by age group only
        const playerRank = DEFAULT_AGE_GROUP_ORDER.indexOf(
          playerAgeGroup.toLowerCase()
        );
        const teamRank = DEFAULT_AGE_GROUP_ORDER.indexOf(
          teamAgeGroup.toLowerCase()
        );

        // Mark as core team if age group matches (sport passport will be created on assignment)
        const isAgeGroupMatch =
          teamAgeGroup.toLowerCase() === playerAgeGroup.toLowerCase();

        if (isAgeGroupMatch) {
          eligibilityStatus = "eligible";
          reason =
            "Age group matches - sport passport will be created on assignment";
        } else if (
          playerRank !== -1 &&
          teamRank !== -1 &&
          teamRank >= playerRank
        ) {
          // Can play at same level or higher
          eligibilityStatus = "eligible";
          reason =
            "Meets age requirements - sport passport will be created on assignment";
        } else if (playerRank !== -1 && teamRank !== -1) {
          // Playing down requires override
          eligibilityStatus = "requiresOverride";
          reason = "Playing in younger age group requires admin approval";
        } else {
          eligibilityStatus = "ineligible";
          reason = "Age group not recognized";
        }
      }
      // Core team is always eligible
      else if (isCoreTeam) {
        eligibilityStatus = "eligible";
        reason = "Core team (matches enrollment age group)";
      }
      // Check if team sport matches ANY of player's sports
      else if (playerSportCodes.includes(teamSport)) {
        // Check if there's a specific rule for this age group combination
        const specificRule = relevantSportRules.find(
          (rule) =>
            rule.fromAgeGroupCode.toLowerCase() ===
              playerAgeGroup.toLowerCase() &&
            rule.toAgeGroupCode.toLowerCase() === teamAgeGroup.toLowerCase()
        );

        if (specificRule) {
          if (!specificRule.isAllowed) {
            eligibilityStatus = "ineligible";
            reason = specificRule.description || "Not allowed by sport rules";
          } else if (specificRule.requiresApproval) {
            eligibilityStatus = "requiresOverride";
            reason =
              specificRule.description ||
              "Requires admin approval per sport rules";
          } else {
            eligibilityStatus = "eligible";
            reason = specificRule.description || "Allowed by sport rules";
          }
        } else {
          // Fall back to default age hierarchy (can play same age or higher)
          const playerRank = DEFAULT_AGE_GROUP_ORDER.indexOf(
            playerAgeGroup.toLowerCase()
          );
          const teamRank = DEFAULT_AGE_GROUP_ORDER.indexOf(
            teamAgeGroup.toLowerCase()
          );

          if (playerRank === -1 || teamRank === -1) {
            eligibilityStatus = "ineligible";
            reason = "Age group not recognized";
          } else if (teamRank >= playerRank) {
            // Can play at same level or higher
            eligibilityStatus = "eligible";
            reason = "Meets age requirements (same or higher age group)";
          } else {
            // Playing down requires override
            eligibilityStatus = "requiresOverride";
            reason = "Playing in younger age group requires admin approval";
          }
        }
      } else {
        eligibilityStatus = "ineligible";
        reason = `Player not enrolled in ${teamSport}`;
      }

      results.push({
        teamId: team._id,
        teamName: team.name,
        ageGroup: teamAgeGroup,
        sportCode: teamSport,
        isCurrentlyOn,
        isCoreTeam,
        eligibilityStatus,
        reason,
      });
    }

    // 7. Sort results: core first, then eligible, requiresOverride, hasOverride, ineligible
    const statusOrder = {
      eligible: 1,
      requiresOverride: 2,
      hasOverride: 3,
      ineligible: 4,
    };

    results.sort((a, b) => {
      // Core team always first
      if (a.isCoreTeam && !b.isCoreTeam) {
        return -1;
      }
      if (!a.isCoreTeam && b.isCoreTeam) {
        return 1;
      }

      // Then by eligibility status
      return (
        statusOrder[a.eligibilityStatus] - statusOrder[b.eligibilityStatus]
      );
    });

    return results;
  },
});

/**
 * Get teams for a player with core team flag
 * Enhanced version of getTeamsForPlayer that includes isCoreTeam flag
 */
export const getTeamsForPlayerWithCoreFlag = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    status: v.optional(teamMemberStatusValidator),
  },
  returns: v.array(
    v.object({
      _id: v.id("teamPlayerIdentities"),
      teamId: v.string(),
      teamName: v.string(),
      ageGroup: v.string(),
      sportCode: v.string(),
      isCoreTeam: v.boolean(),
      role: v.optional(v.string()),
      status: teamMemberStatusValidator,
      joinedDate: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // 1. Get player's teams (existing logic)
    let members = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    if (args.status) {
      members = members.filter((m) => m.status === args.status);
    }

    // 2. Get player's enrollment age group
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    const enrollmentAgeGroup = enrollment?.ageGroup?.toLowerCase() || "";

    // Phase 3: Get player's sport passports (for core team determination)
    const sportPassports = enrollment
      ? await ctx.db
          .query("sportPassports")
          .withIndex("by_player_and_org", (q) =>
            q
              .eq("playerIdentityId", args.playerIdentityId)
              .eq("organizationId", args.organizationId)
          )
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect()
      : [];

    const playerSportCodes = sportPassports.map((p) => p.sportCode);

    // 3. Enrich each team membership with team details and core flag
    const DEFAULT_AGE_GROUP_ORDER = [
      "u6",
      "u7",
      "u8",
      "u9",
      "u10",
      "u11",
      "u12",
      "u13",
      "u14",
      "u15",
      "u16",
      "u17",
      "u18",
      "minor",
      "adult",
      "senior",
    ];

    const results = [];
    for (const member of members) {
      const teamResult = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "team",
          paginationOpts: { cursor: null, numItems: 1 },
          where: [{ field: "_id", value: member.teamId, operator: "eq" }],
        }
      );
      const team = teamResult.page[0] as BetterAuthDoc<"team"> | undefined;

      if (!team) {
        continue;
      }

      const teamAgeGroup = team.ageGroup?.toLowerCase() || "";
      const teamSport = team.sport || "";

      // Phase 3: Check if this is the core team using sportPassports
      // Core team: age group matches AND player has sportPassport for team's sport
      const isCoreTeam =
        teamAgeGroup === enrollmentAgeGroup &&
        playerSportCodes.includes(teamSport);

      results.push({
        _id: member._id,
        teamId: member.teamId,
        teamName: team.name,
        ageGroup: team.ageGroup || "",
        sportCode: team.sport || "",
        isCoreTeam,
        role: member.role,
        status: member.status,
        joinedDate: member.joinedDate,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
      });
    }

    // 4. Sort: core first, then by age group order
    results.sort((a, b) => {
      // Core team first
      if (a.isCoreTeam && !b.isCoreTeam) {
        return -1;
      }
      if (!a.isCoreTeam && b.isCoreTeam) {
        return 1;
      }

      // Then by age group rank
      const aRank = DEFAULT_AGE_GROUP_ORDER.indexOf(a.ageGroup.toLowerCase());
      const bRank = DEFAULT_AGE_GROUP_ORDER.indexOf(b.ageGroup.toLowerCase());

      return aRank - bRank;
    });

    return results;
  },
});
