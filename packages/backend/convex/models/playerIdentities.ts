import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

const genderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("other")
);

const playerTypeValidator = v.union(v.literal("youth"), v.literal("adult"));

const verificationStatusValidator = v.union(
  v.literal("unverified"),
  v.literal("guardian_verified"),
  v.literal("self_verified"),
  v.literal("document_verified")
);

// Player identity validator for return types
const playerIdentityValidator = v.object({
  _id: v.id("playerIdentities"),
  _creationTime: v.number(),
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.string(),
  gender: genderValidator,
  playerType: playerTypeValidator,
  userId: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  town: v.optional(v.string()),
  postcode: v.optional(v.string()),
  country: v.optional(v.string()),
  verificationStatus: verificationStatusValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  createdFrom: v.optional(v.string()),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get a player identity by ID
 */
export const getPlayerById = query({
  args: { playerIdentityId: v.id("playerIdentities") },
  returns: v.union(playerIdentityValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.playerIdentityId),
});

/**
 * Find a player by name and date of birth
 */
export const findPlayerByNameAndDob = query({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
  },
  returns: v.union(playerIdentityValidator, v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("playerIdentities")
      .withIndex("by_name_dob", (q) =>
        q
          .eq("firstName", args.firstName.trim())
          .eq("lastName", args.lastName.trim())
          .eq("dateOfBirth", args.dateOfBirth)
      )
      .first(),
});

/**
 * Find a player identity by Better Auth user ID (for adult players)
 */
export const findPlayerByUserId = query({
  args: { userId: v.string() },
  returns: v.union(playerIdentityValidator, v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first(),
});

/**
 * Find a player identity by email (for adult players)
 */
export const findPlayerByEmail = query({
  args: { email: v.string() },
  returns: v.union(playerIdentityValidator, v.null()),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();
    return await ctx.db
      .query("playerIdentities")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();
  },
});

/**
 * Get player identity for the current logged-in user (adult players)
 */
export const getPlayerForCurrentUser = query({
  args: {},
  returns: v.union(playerIdentityValidator, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userId = identity.subject;
    return await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

/**
 * Search players by name (partial match)
 */
export const searchPlayersByName = query({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(playerIdentityValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // If we have both names, use the composite index
    if (args.firstName && args.lastName) {
      // Note: This won't work as partial match, just exact
      // For partial matching, we'd need a search index
      const firstName = args.firstName.trim();
      const lastName = args.lastName.trim();
      const players = await ctx.db
        .query("playerIdentities")
        .withIndex("by_name_dob", (q) =>
          q.eq("firstName", firstName).eq("lastName", lastName)
        )
        .take(limit);
      return players;
    }

    // Otherwise, scan and filter (not ideal for large datasets)
    const all = await ctx.db.query("playerIdentities").take(limit * 10);

    let filtered = all;

    if (args.firstName) {
      const fn = args.firstName.toLowerCase().trim();
      filtered = filtered.filter((p) => p.firstName.toLowerCase().includes(fn));
    }

    if (args.lastName) {
      const ln = args.lastName.toLowerCase().trim();
      filtered = filtered.filter((p) => p.lastName.toLowerCase().includes(ln));
    }

    return filtered.slice(0, limit);
  },
});

/**
 * Get team players with available cross-org passports
 * Returns players on coach's teams who have enrollments/passports at other organizations
 */
export const getTeamPlayersWithCrossOrgPassports = query({
  args: {
    userId: v.string(),
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("playerIdentities"),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      ageGroup: v.optional(v.string()),
      primarySportCode: v.optional(v.string()),
      teamNames: v.array(v.string()),
      otherOrgEnrollments: v.array(
        v.object({
          organizationId: v.string(),
          sportCode: v.optional(v.string()),
          ageGroup: v.optional(v.string()),
          isDiscoverable: v.boolean(),
          hasExistingRequest: v.boolean(),
          hasActiveShare: v.boolean(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    // Get coach assignments for this user
    const coachAssignments = await ctx.db
      .query("coachAssignments")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.userId).eq("organizationId", args.organizationId)
      )
      .collect();

    if (coachAssignments.length === 0) {
      return [];
    }

    // Flatten all team IDs from coach assignments (teams is an array)
    const teamIds = coachAssignments.flatMap((ca) => ca.teams);

    // Get all team-player links for these teams
    const teamPlayerLinks = await ctx.db
      .query("teamPlayerIdentities")
      .collect();

    const relevantLinks = teamPlayerLinks.filter((link) =>
      teamIds.includes(link.teamId)
    );

    const playerIdentityIds = [
      ...new Set(relevantLinks.map((link) => link.playerIdentityId)),
    ];

    // Process each player
    const enrichedPlayers = await Promise.all(
      playerIdentityIds.map(async (playerIdentityId) => {
        const player = await ctx.db.get(playerIdentityId);
        if (!player) {
          return null;
        }

        // Get all enrollments for this player
        const allEnrollments = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", playerIdentityId)
          )
          .collect();

        // Filter to get current org enrollment and other org enrollments
        const currentOrgEnrollment = allEnrollments.find(
          (e) => e.organizationId === args.organizationId
        );
        const otherOrgEnrollments = allEnrollments.filter(
          (e) => e.organizationId !== args.organizationId
        );

        // Skip if no enrollments in other orgs
        if (otherOrgEnrollments.length === 0) {
          return null;
        }

        // Get team names for this player in current org
        const playerTeamLinks = relevantLinks.filter(
          (link) => link.playerIdentityId === playerIdentityId
        );
        const teamNamesSet = new Set<string>();
        // Team IDs are Better Auth team IDs (strings), not Convex IDs
        // For now, just use the team ID strings - we'd need Better Auth client to fetch names
        for (const link of playerTeamLinks) {
          teamNamesSet.add(link.teamId);
        }

        // Get sport passports
        const sportPassports = await ctx.db
          .query("sportPassports")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", playerIdentityId)
          )
          .collect();

        const activeSport = sportPassports.find((p) => p.status === "active");
        const primarySportCode =
          activeSport?.sportCode || sportPassports[0]?.sportCode;

        // Check guardian discovery settings
        const guardianLinks = await ctx.db
          .query("guardianPlayerLinks")
          .withIndex("by_player", (q) =>
            q.eq("playerIdentityId", playerIdentityId)
          )
          .collect();

        let isDiscoverable = false;
        for (const link of guardianLinks) {
          const guardian = await ctx.db.get(link.guardianIdentityId);
          if (guardian?.allowGlobalPassportDiscovery === true) {
            isDiscoverable = true;
            break;
          }
        }

        // Check existing requests and shares for each other org
        const enrichedOtherOrgs = await Promise.all(
          otherOrgEnrollments.map(async (enrollment) => {
            // Get sport code from passport for this enrollment
            const enrollmentPassport = sportPassports.find(
              (p) => p.sportCode === enrollment.sport
            );

            // Check for existing request from current org to this player
            const allRequests = await ctx.db
              .query("passportShareRequests")
              .withIndex("by_player", (q) =>
                q.eq("playerIdentityId", playerIdentityId)
              )
              .collect();

            const existingRequest = allRequests.find(
              (r) =>
                r.requestingOrgId === args.organizationId &&
                r.status === "pending"
            );

            // Check for active share from other org to current org
            const now = Date.now();
            const allShares = await ctx.db
              .query("passportShareConsents")
              .withIndex("by_player_and_status", (q) =>
                q
                  .eq("playerIdentityId", playerIdentityId)
                  .eq("status", "active")
              )
              .collect();

            const activeShare = allShares.find(
              (s) =>
                s.receivingOrgId === args.organizationId &&
                s.coachAcceptanceStatus === "accepted" &&
                s.expiresAt > now
            );

            return {
              organizationId: enrollment.organizationId,
              sportCode: enrollmentPassport?.sportCode,
              ageGroup: enrollment.ageGroup,
              isDiscoverable,
              hasExistingRequest: !!existingRequest,
              hasActiveShare: !!activeShare,
            };
          })
        );

        return {
          _id: player._id,
          firstName: player.firstName,
          lastName: player.lastName,
          dateOfBirth: player.dateOfBirth,
          ageGroup: currentOrgEnrollment?.ageGroup,
          primarySportCode,
          teamNames: Array.from(teamNamesSet),
          otherOrgEnrollments: enrichedOtherOrgs,
        };
      })
    );

    // Filter out nulls
    return enrichedPlayers.filter((p) => p !== null);
  },
});

/**
 * Search for discoverable players across organizations
 * Returns players whose guardians have enabled global passport discovery
 * Excludes players from the requesting organization
 */
export const searchDiscoverablePlayers = query({
  args: {
    searchTerm: v.string(),
    requestingOrgId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("playerIdentities"),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      gender: genderValidator,
      ageGroup: v.optional(v.string()),
      primarySportCode: v.optional(v.string()),
      enrollmentCount: v.number(),
      organizationIds: v.array(v.string()),
      hasActivePassport: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const searchTerm = args.searchTerm.toLowerCase().trim();

    // Search for players by name (partial match)
    const allPlayers = await ctx.db.query("playerIdentities").take(limit * 10);

    const matchingPlayers = allPlayers.filter((player) => {
      const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
      return (
        fullName.includes(searchTerm) ||
        player.firstName.toLowerCase().includes(searchTerm) ||
        player.lastName.toLowerCase().includes(searchTerm)
      );
    });

    // Enrich with enrollment and guardian data
    const enrichedPlayers = await Promise.all(
      matchingPlayers.map(async (player) => {
        // Get all enrollments for this player
        const enrollments = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", player._id)
          )
          .collect();

        // Filter out enrollments from requesting org
        const otherOrgEnrollments = enrollments.filter(
          (e) => e.organizationId !== args.requestingOrgId
        );

        // Skip if no enrollments in other orgs
        if (otherOrgEnrollments.length === 0) {
          return null;
        }

        // Get guardian links
        const guardianLinks = await ctx.db
          .query("guardianPlayerLinks")
          .withIndex("by_player", (q) => q.eq("playerIdentityId", player._id))
          .collect();

        // Check if any guardian has enabled global discovery
        let hasDiscoveryEnabled = false;
        for (const link of guardianLinks) {
          const guardian = await ctx.db.get(link.guardianIdentityId);
          if (guardian?.allowGlobalPassportDiscovery === true) {
            hasDiscoveryEnabled = true;
            break;
          }
        }

        // Skip if no guardian has enabled discovery
        if (!hasDiscoveryEnabled) {
          return null;
        }

        // Get sport passports
        const sportPassports = await ctx.db
          .query("sportPassports")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", player._id)
          )
          .collect();

        const activeSport = sportPassports.find((p) => p.status === "active");
        const primarySportCode =
          activeSport?.sportCode || sportPassports[0]?.sportCode;

        // Get organization IDs
        const organizationIds = otherOrgEnrollments.map(
          (e) => e.organizationId
        );

        // Get primary enrollment for age group
        const primaryEnrollment =
          otherOrgEnrollments.find((e) => e.status === "active") ||
          otherOrgEnrollments[0];

        return {
          _id: player._id,
          firstName: player.firstName,
          lastName: player.lastName,
          dateOfBirth: player.dateOfBirth,
          gender: player.gender,
          ageGroup: primaryEnrollment?.ageGroup,
          primarySportCode,
          enrollmentCount: otherOrgEnrollments.length,
          organizationIds,
          hasActivePassport: sportPassports.some((p) => p.status === "active"),
        };
      })
    );

    // Filter out nulls and take limit
    return enrichedPlayers.filter((p) => p !== null).slice(0, limit);
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Create a new player identity
 */
export const createPlayerIdentity = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    gender: genderValidator,
    playerType: v.optional(playerTypeValidator),
    userId: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),
    verificationStatus: v.optional(verificationStatusValidator),
    createdFrom: v.optional(v.string()),
  },
  returns: v.id("playerIdentities"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Determine player type based on age if not specified
    const playerType = args.playerType ?? determinePlayerType(args.dateOfBirth);

    // Normalize email if provided
    const email = args.email?.toLowerCase().trim();

    return await ctx.db.insert("playerIdentities", {
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      dateOfBirth: args.dateOfBirth,
      gender: args.gender,
      playerType,
      userId: args.userId,
      email,
      phone: args.phone?.trim(),
      address: args.address?.trim(),
      town: args.town?.trim(),
      postcode: args.postcode?.trim(),
      country: args.country?.trim(),
      verificationStatus: args.verificationStatus ?? "unverified",
      createdAt: now,
      updatedAt: now,
      createdFrom: args.createdFrom ?? "manual",
    });
  },
});

/**
 * Update an existing player identity
 */
export const updatePlayerIdentity = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(genderValidator),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),
    verificationStatus: v.optional(verificationStatusValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.playerIdentityId);
    if (!existing) {
      throw new Error("Player identity not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.firstName !== undefined) {
      updates.firstName = args.firstName.trim();
    }
    if (args.lastName !== undefined) {
      updates.lastName = args.lastName.trim();
    }
    if (args.dateOfBirth !== undefined) {
      updates.dateOfBirth = args.dateOfBirth;
    }
    if (args.gender !== undefined) {
      updates.gender = args.gender;
    }
    if (args.email !== undefined) {
      updates.email = args.email.toLowerCase().trim();
    }
    if (args.phone !== undefined) {
      updates.phone = args.phone.trim();
    }
    if (args.address !== undefined) {
      updates.address = args.address.trim();
    }
    if (args.town !== undefined) {
      updates.town = args.town.trim();
    }
    if (args.postcode !== undefined) {
      updates.postcode = args.postcode.trim();
    }
    if (args.country !== undefined) {
      updates.country = args.country.trim();
    }
    if (args.verificationStatus !== undefined) {
      updates.verificationStatus = args.verificationStatus;
    }

    await ctx.db.patch(args.playerIdentityId, updates);
    return null;
  },
});

/**
 * Find or create a player identity (upsert pattern)
 * Used primarily for imports
 */
export const findOrCreatePlayer = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    gender: genderValidator,
    playerType: v.optional(playerTypeValidator),
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),
    createdFrom: v.optional(v.string()),
  },
  returns: v.object({
    playerIdentityId: v.id("playerIdentities"),
    wasCreated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Try to find existing player by name + DOB
    const existing = await ctx.db
      .query("playerIdentities")
      .withIndex("by_name_dob", (q) =>
        q
          .eq("firstName", args.firstName.trim())
          .eq("lastName", args.lastName.trim())
          .eq("dateOfBirth", args.dateOfBirth)
      )
      .first();

    if (existing) {
      return {
        playerIdentityId: existing._id,
        wasCreated: false,
      };
    }

    // Create new player
    const now = Date.now();
    const playerType = args.playerType ?? determinePlayerType(args.dateOfBirth);

    const playerIdentityId = await ctx.db.insert("playerIdentities", {
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      dateOfBirth: args.dateOfBirth,
      gender: args.gender,
      playerType,
      address: args.address?.trim(),
      town: args.town?.trim(),
      postcode: args.postcode?.trim(),
      country: args.country?.trim(),
      verificationStatus: "unverified",
      createdAt: now,
      updatedAt: now,
      createdFrom: args.createdFrom ?? "import",
    });

    return {
      playerIdentityId,
      wasCreated: true,
    };
  },
});

/**
 * Link a player identity to a Better Auth user (for adult players)
 */
export const linkPlayerToUser = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    userId: v.string(),
    email: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.playerIdentityId);
    if (!existing) {
      throw new Error("Player identity not found");
    }

    // Check if this userId is already linked to another player
    const existingUserLink = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingUserLink && existingUserLink._id !== args.playerIdentityId) {
      throw new Error("This user is already linked to another player identity");
    }

    await ctx.db.patch(args.playerIdentityId, {
      userId: args.userId,
      email: args.email?.toLowerCase().trim(),
      verificationStatus:
        existing.verificationStatus === "unverified"
          ? "self_verified"
          : existing.verificationStatus,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

/**
 * Determine player type based on age
 * Adult = 18 years or older
 */
function determinePlayerType(dateOfBirth: string): "youth" | "adult" {
  const age = calculateAge(dateOfBirth);
  return age >= 18 ? "adult" : "youth";
}

/**
 * Determine age group from date of birth
 * Returns age group code (e.g., "u10", "u12", "senior")
 */
export function determineAgeGroup(dateOfBirth: string): string {
  const age = calculateAge(dateOfBirth);

  if (age >= 21) {
    return "senior";
  }
  if (age >= 19) {
    return "u21";
  }
  if (age >= 17) {
    return "u19";
  }
  if (age >= 16) {
    return "u18";
  }
  if (age >= 15) {
    return "u17";
  }
  if (age >= 14) {
    return "u16";
  }
  if (age >= 13) {
    return "u15";
  }
  if (age >= 12) {
    return "u14";
  }
  if (age >= 11) {
    return "u13";
  }
  if (age >= 10) {
    return "u12";
  }
  if (age >= 9) {
    return "u11";
  }
  if (age >= 8) {
    return "u10";
  }
  if (age >= 7) {
    return "u9";
  }
  if (age >= 6) {
    return "u8";
  }
  if (age >= 5) {
    return "u7";
  }
  return "u6";
}

/**
 * Check for potential duplicate players
 * Returns players that match on name + DOB + gender (exact match)
 * or name + DOB (partial match - might be same person, different gender)
 */
export const checkForDuplicatePlayer = query({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    gender: v.optional(genderValidator),
    organizationId: v.optional(v.string()),
  },
  returns: v.object({
    exactMatch: v.union(playerIdentityValidator, v.null()),
    partialMatches: v.array(playerIdentityValidator),
    isDuplicate: v.boolean(),
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const normalizedFirstName = args.firstName.trim();
    const normalizedLastName = args.lastName.trim();

    // Find all players with same name + DOB
    const nameAndDobMatches = await ctx.db
      .query("playerIdentities")
      .withIndex("by_name_dob", (q) =>
        q
          .eq("firstName", normalizedFirstName)
          .eq("lastName", normalizedLastName)
          .eq("dateOfBirth", args.dateOfBirth)
      )
      .collect();

    // Check for exact match (name + DOB + gender)
    let exactMatch = null;
    if (args.gender) {
      exactMatch =
        nameAndDobMatches.find((p) => p.gender === args.gender) || null;
    }

    // Partial matches are name + DOB but different gender
    const partialMatches = exactMatch
      ? nameAndDobMatches.filter((p) => p._id !== exactMatch?._id)
      : nameAndDobMatches;

    // Determine if this is a duplicate situation
    const isDuplicate = exactMatch !== null;

    // Generate helpful message
    let message: string | undefined;
    if (exactMatch) {
      message = `A player named "${normalizedFirstName} ${normalizedLastName}" with the same date of birth and gender already exists. Would you like to continue anyway?`;
    } else if (partialMatches.length > 0) {
      message = `Found ${partialMatches.length} player(s) named "${normalizedFirstName} ${normalizedLastName}" with the same date of birth but different gender. This may be a different person.`;
    }

    return {
      exactMatch,
      partialMatches,
      isDuplicate,
      message,
    };
  },
});

// Query to calculate age (for use in queries)
export const getPlayerAge = query({
  args: { playerIdentityId: v.id("playerIdentities") },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      return null;
    }
    return calculateAge(player.dateOfBirth);
  },
});

// Query to get player's age group
export const getPlayerAgeGroup = query({
  args: { playerIdentityId: v.id("playerIdentities") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      return null;
    }
    return determineAgeGroup(player.dateOfBirth);
  },
});
