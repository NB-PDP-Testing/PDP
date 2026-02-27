import { v } from "convex/values";
import { internalQuery, mutation, query } from "../_generated/server";

import { requireAuth, requireAuthAndOrg } from "../lib/authHelpers";
import {
  ALIAS_TO_CANONICAL,
  calculateMatchScore,
  normalizeForMatching,
} from "../lib/stringMatching";

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
  address2: v.optional(v.string()),
  town: v.optional(v.string()),
  county: v.optional(v.string()),
  postcode: v.optional(v.string()),
  country: v.optional(v.string()),
  verificationStatus: verificationStatusValidator,
  claimedAt: v.optional(v.number()),
  claimInvitedBy: v.optional(v.string()),
  playerWelcomedAt: v.optional(v.number()),
  importSessionId: v.optional(v.id("importSessions")),
  externalIds: v.optional(v.record(v.string(), v.string())),
  federationIds: v.optional(
    v.object({
      fai: v.optional(v.string()),
      irfu: v.optional(v.string()),
      gaa: v.optional(v.string()),
      other: v.optional(v.string()),
    })
  ),
  lastSyncedAt: v.optional(v.number()),
  lastSyncedData: v.optional(v.any()),
  isActive: v.optional(v.boolean()),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdFrom: v.optional(v.string()),
  normalizedFirstName: v.optional(v.string()),
  normalizedLastName: v.optional(v.string()),
  mergedInto: v.optional(v.id("playerIdentities")),
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
 * Get a player identity by ID (alias for getPlayerById)
 */
export const getPlayerIdentity = query({
  args: { identityId: v.id("playerIdentities") },
  returns: v.union(playerIdentityValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.identityId),
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
 * Search players by name (uses search index for efficient partial matching)
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
    const firstName = args.firstName?.trim();
    const lastName = args.lastName?.trim();

    // If both names provided, use exact composite index
    if (firstName && lastName) {
      return await ctx.db
        .query("playerIdentities")
        .withIndex("by_name_dob", (q) =>
          q.eq("firstName", firstName).eq("lastName", lastName)
        )
        .take(limit);
    }

    // If firstName provided, use search index for partial matching
    if (firstName) {
      return await ctx.db
        .query("playerIdentities")
        .withSearchIndex("search_name", (q) => q.search("firstName", firstName))
        .take(limit);
    }

    // If only lastName provided, use by_name index for exact lastName prefix match
    if (lastName) {
      return await ctx.db
        .query("playerIdentities")
        .withIndex("by_lastName", (q) => q.eq("lastName", lastName))
        .take(limit);
    }

    // No search terms — return empty
    return [];
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
    federationIds: v.optional(
      v.object({
        fai: v.optional(v.string()),
        irfu: v.optional(v.string()),
        gaa: v.optional(v.string()),
        other: v.optional(v.string()),
      })
    ),
  },
  returns: v.id("playerIdentities"),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const now = Date.now();

    // Determine player type based on age if not specified
    const playerType = args.playerType ?? determinePlayerType(args.dateOfBirth);

    // Normalize email if provided
    const email = args.email?.toLowerCase().trim();

    const trimmedFirst = args.firstName.trim();
    const trimmedLast = args.lastName.trim();

    return await ctx.db.insert("playerIdentities", {
      firstName: trimmedFirst,
      lastName: trimmedLast,
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
      normalizedFirstName: normalizeForMatching(trimmedFirst),
      normalizedLastName: normalizeForMatching(trimmedLast),
      verificationStatus: args.verificationStatus ?? "unverified",
      createdAt: now,
      updatedAt: now,
      createdFrom: args.createdFrom ?? "manual",
      federationIds: args.federationIds,
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
    lastSyncedAt: v.optional(v.number()),
    lastSyncedData: v.optional(v.any()),
    federationIds: v.optional(
      v.object({
        fai: v.optional(v.string()),
        irfu: v.optional(v.string()),
        gaa: v.optional(v.string()),
        other: v.optional(v.string()),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Auth: require authenticated user
    await requireAuth(ctx);

    const existing = await ctx.db.get(args.playerIdentityId);
    if (!existing) {
      throw new Error("Player identity not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.firstName !== undefined) {
      const trimmed = args.firstName.trim();
      updates.firstName = trimmed;
      updates.normalizedFirstName = normalizeForMatching(trimmed);
    }
    if (args.lastName !== undefined) {
      const trimmed = args.lastName.trim();
      updates.lastName = trimmed;
      updates.normalizedLastName = normalizeForMatching(trimmed);
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
    if (args.lastSyncedAt !== undefined) {
      updates.lastSyncedAt = args.lastSyncedAt;
    }
    if (args.lastSyncedData !== undefined) {
      updates.lastSyncedData = args.lastSyncedData;
    }
    if (args.federationIds !== undefined) {
      updates.federationIds = args.federationIds;
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
    const trimmedFirst = args.firstName.trim();
    const trimmedLast = args.lastName.trim();
    const normFirst = normalizeForMatching(trimmedFirst);
    const normLast = normalizeForMatching(trimmedLast);

    // Tier 1: Exact match on by_name_dob (fast path, existing behaviour)
    const exactMatch = await ctx.db
      .query("playerIdentities")
      .withIndex("by_name_dob", (q) =>
        q
          .eq("firstName", trimmedFirst)
          .eq("lastName", trimmedLast)
          .eq("dateOfBirth", args.dateOfBirth)
      )
      .first();

    if (exactMatch) {
      return { playerIdentityId: exactMatch._id, wasCreated: false };
    }

    // Tier 2: Normalized match on by_normalized_name_dob
    const normalizedMatch = await ctx.db
      .query("playerIdentities")
      .withIndex("by_normalized_name_dob", (q) =>
        q
          .eq("normalizedLastName", normLast)
          .eq("normalizedFirstName", normFirst)
          .eq("dateOfBirth", args.dateOfBirth)
      )
      .first();

    if (normalizedMatch && normalizedMatch.mergedInto === undefined) {
      return { playerIdentityId: normalizedMatch._id, wasCreated: false };
    }

    // Tier 3: Irish alias match — resolve firstName through ALIAS_TO_CANONICAL
    const canonical = ALIAS_TO_CANONICAL.get(normFirst);
    if (canonical && canonical !== normFirst) {
      const aliasMatch = await ctx.db
        .query("playerIdentities")
        .withIndex("by_normalized_name_dob", (q) =>
          q
            .eq("normalizedLastName", normLast)
            .eq("normalizedFirstName", canonical)
            .eq("dateOfBirth", args.dateOfBirth)
        )
        .first();

      if (aliasMatch && aliasMatch.mergedInto === undefined) {
        return { playerIdentityId: aliasMatch._id, wasCreated: false };
      }
    }

    // No match found — create new player
    const now = Date.now();
    const playerType = args.playerType ?? determinePlayerType(args.dateOfBirth);

    const playerIdentityId = await ctx.db.insert("playerIdentities", {
      firstName: trimmedFirst,
      lastName: trimmedLast,
      dateOfBirth: args.dateOfBirth,
      gender: args.gender,
      playerType,
      address: args.address?.trim(),
      town: args.town?.trim(),
      postcode: args.postcode?.trim(),
      country: args.country?.trim(),
      normalizedFirstName: normFirst,
      normalizedLastName: normLast,
      verificationStatus: "unverified",
      createdAt: now,
      updatedAt: now,
      createdFrom: args.createdFrom ?? "import",
    });

    return { playerIdentityId, wasCreated: true };
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
    const trimmedFirst = args.firstName.trim();
    const trimmedLast = args.lastName.trim();

    // Tier 1: Exact name + DOB match
    const nameAndDobMatches = await ctx.db
      .query("playerIdentities")
      .withIndex("by_name_dob", (q) =>
        q
          .eq("firstName", trimmedFirst)
          .eq("lastName", trimmedLast)
          .eq("dateOfBirth", args.dateOfBirth)
      )
      .collect();

    // Tier 2: Normalized name + DOB match (catches case/accent differences)
    const normFirst = normalizeForMatching(trimmedFirst);
    const normLast = normalizeForMatching(trimmedLast);
    const seenIds = new Set(nameAndDobMatches.map((p) => p._id.toString()));

    const normalizedMatches = await ctx.db
      .query("playerIdentities")
      .withIndex("by_normalized_name_dob", (q) =>
        q
          .eq("normalizedLastName", normLast)
          .eq("normalizedFirstName", normFirst)
          .eq("dateOfBirth", args.dateOfBirth)
      )
      .collect();

    for (const p of normalizedMatches) {
      if (!seenIds.has(p._id.toString()) && p.mergedInto === undefined) {
        nameAndDobMatches.push(p);
        seenIds.add(p._id.toString());
      }
    }

    // Tier 3: Irish alias match (e.g. "Sean" ↔ "Séan" ↔ "Shawn")
    const canonical = ALIAS_TO_CANONICAL.get(normFirst);
    if (canonical && canonical !== normFirst) {
      const aliasMatches = await ctx.db
        .query("playerIdentities")
        .withIndex("by_normalized_name_dob", (q) =>
          q
            .eq("normalizedLastName", normLast)
            .eq("normalizedFirstName", canonical)
            .eq("dateOfBirth", args.dateOfBirth)
        )
        .collect();

      for (const p of aliasMatches) {
        if (!seenIds.has(p._id.toString()) && p.mergedInto === undefined) {
          nameAndDobMatches.push(p);
          seenIds.add(p._id.toString());
        }
      }
    }

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
      message = `A player named "${trimmedFirst} ${trimmedLast}" with the same date of birth and gender already exists. Would you like to continue anyway?`;
    } else if (partialMatches.length > 0) {
      message = `Found ${partialMatches.length} player(s) named "${trimmedFirst} ${trimmedLast}" with the same date of birth but different gender. This may be a different person.`;
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

// ============================================================
// DEDUPLICATION QUERIES & MUTATIONS
// ============================================================

const matchResultValidator = v.object({
  _id: v.id("playerIdentities"),
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.string(),
  gender: genderValidator,
  matchScore: v.number(),
  matchType: v.string(),
  confidence: v.string(),
});

/**
 * Find potential matches for a player being created.
 * Uses exact, normalized, Irish alias, and fuzzy matching.
 */
export const findPotentialMatches = query({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    gender: v.optional(genderValidator),
  },
  returns: v.array(matchResultValidator),
  handler: async (ctx, args) => {
    const trimmedFirst = args.firstName.trim();
    const trimmedLast = args.lastName.trim();
    if (!(trimmedFirst && trimmedLast && args.dateOfBirth)) {
      return [];
    }

    const normFirst = normalizeForMatching(trimmedFirst);
    const normLast = normalizeForMatching(trimmedLast);
    const seen = new Set<string>();
    const results: Array<{
      _id: typeof args extends { _id: infer T } ? T : any;
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      gender: "male" | "female" | "other";
      matchScore: number;
      matchType: string;
      confidence: string;
    }> = [];

    const addResult = (
      player: {
        _id: any;
        firstName: string;
        lastName: string;
        dateOfBirth: string;
        gender: "male" | "female" | "other";
        mergedInto?: any;
      },
      score: number,
      matchType: string
    ) => {
      const id = player._id.toString();
      if (seen.has(id) || player.mergedInto) {
        return;
      }
      seen.add(id);
      results.push({
        _id: player._id,
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth,
        gender: player.gender,
        matchScore: Math.round(score * 100) / 100,
        matchType,
        confidence: score >= 0.9 ? "high" : score >= 0.7 ? "medium" : "low",
      });
    };

    // 1. Exact match on by_name_dob
    const exactMatches = await ctx.db
      .query("playerIdentities")
      .withIndex("by_name_dob", (q) =>
        q
          .eq("firstName", trimmedFirst)
          .eq("lastName", trimmedLast)
          .eq("dateOfBirth", args.dateOfBirth)
      )
      .collect();
    for (const m of exactMatches) {
      addResult(m, 1.0, "exact");
    }

    // 2. Normalized match on by_normalized_name_dob
    const normalizedMatches = await ctx.db
      .query("playerIdentities")
      .withIndex("by_normalized_name_dob", (q) =>
        q
          .eq("normalizedLastName", normLast)
          .eq("normalizedFirstName", normFirst)
          .eq("dateOfBirth", args.dateOfBirth)
      )
      .collect();
    for (const m of normalizedMatches) {
      addResult(m, 0.95, "normalized");
    }

    // 3. Irish alias match
    const canonical = ALIAS_TO_CANONICAL.get(normFirst);
    if (canonical && canonical !== normFirst) {
      const aliasMatches = await ctx.db
        .query("playerIdentities")
        .withIndex("by_normalized_name_dob", (q) =>
          q
            .eq("normalizedLastName", normLast)
            .eq("normalizedFirstName", canonical)
            .eq("dateOfBirth", args.dateOfBirth)
        )
        .collect();
      for (const m of aliasMatches) {
        addResult(m, 0.9, "irish_alias");
      }
    }
    // Also check if the candidate's normalized name resolves to same canonical
    const candidatesForAlias = await ctx.db
      .query("playerIdentities")
      .withIndex("by_normalized_name_dob", (q) =>
        q.eq("normalizedLastName", normLast)
      )
      .collect();
    for (const m of candidatesForAlias) {
      if (m.dateOfBirth !== args.dateOfBirth) {
        continue;
      }
      const candidateCanonical = ALIAS_TO_CANONICAL.get(
        m.normalizedFirstName ?? ""
      );
      const inputCanonical = ALIAS_TO_CANONICAL.get(normFirst);
      if (
        candidateCanonical &&
        inputCanonical &&
        candidateCanonical === inputCanonical
      ) {
        addResult(m, 0.9, "irish_alias");
      }
    }

    // 4. Fuzzy: query by_lastName candidates with same DOB, score with calculateMatchScore
    const lastNameCandidates = await ctx.db
      .query("playerIdentities")
      .withIndex("by_lastName", (q) => q.eq("lastName", trimmedLast))
      .take(100);
    for (const m of lastNameCandidates) {
      if (m.dateOfBirth !== args.dateOfBirth) {
        continue;
      }
      const score = calculateMatchScore(
        `${trimmedFirst} ${trimmedLast}`,
        m.firstName,
        m.lastName
      );
      if (score >= 0.5) {
        addResult(m, score, "fuzzy");
      }
    }

    // Also try normalized lastName for fuzzy
    const normLastNameCandidates = await ctx.db
      .query("playerIdentities")
      .withIndex("by_normalized_name_dob", (q) =>
        q.eq("normalizedLastName", normLast)
      )
      .take(100);
    for (const m of normLastNameCandidates) {
      if (m.dateOfBirth !== args.dateOfBirth) {
        continue;
      }
      const score = calculateMatchScore(
        `${trimmedFirst} ${trimmedLast}`,
        m.firstName,
        m.lastName
      );
      if (score >= 0.5) {
        addResult(m, score, "fuzzy");
      }
    }

    // Sort by matchScore desc
    results.sort((a, b) => b.matchScore - a.matchScore);
    return results.slice(0, 20);
  },
});

const duplicateGroupValidator = v.object({
  players: v.array(
    v.object({
      _id: v.id("playerIdentities"),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      gender: genderValidator,
      enrollmentId: v.optional(v.id("orgPlayerEnrollments")),
      ageGroup: v.optional(v.string()),
    })
  ),
  confidence: v.string(),
  matchType: v.string(),
  matchScore: v.number(),
});

/**
 * Find potential duplicate player identities within an organization.
 * Groups players with similar names and close DOBs.
 */
export const findPotentialDuplicatesForOrg = query({
  args: { organizationId: v.string() },
  returns: v.object({
    totalGroups: v.number(),
    groups: v.array(duplicateGroupValidator),
  }),
  handler: async (ctx, args) => {
    const { role } = await requireAuthAndOrg(ctx, args.organizationId);
    if (role !== "admin" && role !== "owner") {
      throw new Error("Only admins/owners can view duplicate detection");
    }

    // Fetch active enrollments
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    if (enrollments.length === 0) {
      return { totalGroups: 0, groups: [] };
    }

    // Batch fetch player identities
    const playerIds = [...new Set(enrollments.map((e) => e.playerIdentityId))];
    const playerMap = new Map<string, any>();
    const enrollmentMap = new Map<string, any>();

    for (const id of playerIds) {
      const player = await ctx.db.get(id);
      if (player && !player.mergedInto) {
        playerMap.set(id.toString(), player);
      }
    }
    for (const e of enrollments) {
      enrollmentMap.set(e.playerIdentityId.toString(), e);
    }

    // Group by normalizedLastName
    const lastNameGroups = new Map<string, any[]>();
    for (const [, player] of playerMap) {
      const normLast =
        player.normalizedLastName ?? normalizeForMatching(player.lastName);
      const existing = lastNameGroups.get(normLast) ?? [];
      existing.push(player);
      lastNameGroups.set(normLast, existing);
    }

    // Pairwise compare within each group
    const duplicateGroups: Array<{
      players: any[];
      confidence: string;
      matchType: string;
      matchScore: number;
    }> = [];

    for (const [, group] of lastNameGroups) {
      if (group.length < 2) {
        continue;
      }

      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];

          // Check DOB proximity (within 365 days)
          const dobA = new Date(a.dateOfBirth).getTime();
          const dobB = new Date(b.dateOfBirth).getTime();
          const daysDiff = Math.abs(dobA - dobB) / (1000 * 60 * 60 * 24);
          if (daysDiff > 365) {
            continue;
          }

          const score = calculateMatchScore(
            `${a.firstName} ${a.lastName}`,
            b.firstName,
            b.lastName
          );
          if (score < 0.7) {
            continue;
          }

          const enrollA = enrollmentMap.get(a._id.toString());
          const enrollB = enrollmentMap.get(b._id.toString());

          duplicateGroups.push({
            players: [
              {
                _id: a._id,
                firstName: a.firstName,
                lastName: a.lastName,
                dateOfBirth: a.dateOfBirth,
                gender: a.gender,
                enrollmentId: enrollA?._id,
                ageGroup: enrollA?.ageGroup,
              },
              {
                _id: b._id,
                firstName: b.firstName,
                lastName: b.lastName,
                dateOfBirth: b.dateOfBirth,
                gender: b.gender,
                enrollmentId: enrollB?._id,
                ageGroup: enrollB?.ageGroup,
              },
            ],
            confidence: score >= 0.9 ? "high" : score >= 0.7 ? "medium" : "low",
            matchType:
              daysDiff === 0 && score >= 0.95
                ? "exact"
                : score >= 0.9
                  ? "normalized"
                  : "fuzzy",
            matchScore: Math.round(score * 100) / 100,
          });
        }
      }
    }

    // Sort by confidence desc
    duplicateGroups.sort((a, b) => b.matchScore - a.matchScore);
    const limited = duplicateGroups.slice(0, 50);

    return { totalGroups: limited.length, groups: limited };
  },
});

const mergeConflictValidator = v.object({
  table: v.string(),
  issue: v.string(),
  resolution: v.string(),
});

/**
 * Preview what would happen if two player identities were merged.
 */
export const getMergePreview = query({
  args: {
    keepId: v.id("playerIdentities"),
    removeId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.object({
    keepPlayer: v.object({
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      gender: genderValidator,
    }),
    removePlayer: v.object({
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      gender: genderValidator,
    }),
    affectedRecords: v.array(
      v.object({ table: v.string(), count: v.number() })
    ),
    conflicts: v.array(mergeConflictValidator),
    canMerge: v.boolean(),
    blockingReason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { role } = await requireAuthAndOrg(ctx, args.organizationId);
    if (role !== "admin" && role !== "owner") {
      throw new Error("Only admins and owners can preview merges");
    }

    const keepPlayer = await ctx.db.get(args.keepId);
    const removePlayer = await ctx.db.get(args.removeId);
    if (!(keepPlayer && removePlayer)) {
      throw new Error("Player identity not found");
    }

    const conflicts: Array<{
      table: string;
      issue: string;
      resolution: string;
    }> = [];
    const affectedRecords: Array<{ table: string; count: number }> = [];

    // Check playerAccountLinks — block if both linked to different users
    const keepLinks = await ctx.db
      .query("playerAccountLinks")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.keepId)
      )
      .collect();
    const removeLinks = await ctx.db
      .query("playerAccountLinks")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.removeId)
      )
      .collect();
    if (removeLinks.length > 0) {
      affectedRecords.push({
        table: "playerAccountLinks",
        count: removeLinks.length,
      });
    }

    const keepUserIds = new Set(keepLinks.map((l) => l.userId));
    const removeUserIds = removeLinks.map((l) => l.userId);
    const conflictingUsers = removeUserIds.filter(
      (uid) => !keepUserIds.has(uid)
    );

    if (conflictingUsers.length > 0) {
      return {
        keepPlayer: {
          firstName: keepPlayer.firstName,
          lastName: keepPlayer.lastName,
          dateOfBirth: keepPlayer.dateOfBirth,
          gender: keepPlayer.gender,
        },
        removePlayer: {
          firstName: removePlayer.firstName,
          lastName: removePlayer.lastName,
          dateOfBirth: removePlayer.dateOfBirth,
          gender: removePlayer.gender,
        },
        affectedRecords,
        conflicts: [
          {
            table: "playerAccountLinks",
            issue: "Both identities linked to different user accounts",
            resolution: "Cannot auto-merge",
          },
        ],
        canMerge: false,
        blockingReason:
          "Both identities are linked to different user accounts. Manual resolution required.",
      };
    }

    // Count records for each relevant table
    const countForTable = (table: string, records: any[]) => {
      if (records.length > 0) {
        affectedRecords.push({ table, count: records.length });
      }
    };

    countForTable(
      "orgPlayerEnrollments",
      await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", args.removeId)
        )
        .collect()
    );
    countForTable(
      "guardianPlayerLinks",
      await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_player", (q) => q.eq("playerIdentityId", args.removeId))
        .collect()
    );
    countForTable(
      "sportPassports",
      await ctx.db
        .query("sportPassports")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", args.removeId)
        )
        .collect()
    );
    countForTable(
      "skillAssessments",
      await ctx.db
        .query("skillAssessments")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", args.removeId)
        )
        .collect()
    );
    countForTable(
      "teamPlayerIdentities",
      await ctx.db
        .query("teamPlayerIdentities")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", args.removeId)
        )
        .collect()
    );
    countForTable(
      "passportGoals",
      await ctx.db
        .query("passportGoals")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", args.removeId)
        )
        .collect()
    );
    countForTable(
      "playerInjuries",
      await ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", args.removeId)
        )
        .collect()
    );
    countForTable(
      "playerGraduations",
      await ctx.db
        .query("playerGraduations")
        .withIndex("by_player", (q) => q.eq("playerIdentityId", args.removeId))
        .collect()
    );

    // Check for enrollment conflicts (same org)
    const keepEnrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.keepId)
      )
      .collect();
    const removeEnrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.removeId)
      )
      .collect();
    const keepOrgIds = new Set(keepEnrollments.map((e) => e.organizationId));
    for (const e of removeEnrollments) {
      if (keepOrgIds.has(e.organizationId)) {
        conflicts.push({
          table: "orgPlayerEnrollments",
          issue: "Both enrolled in same org",
          resolution: "Will deactivate duplicate enrollment",
        });
      }
    }

    // Check guardian link conflicts (same guardian)
    const keepGuardians = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", args.keepId))
      .collect();
    const removeGuardians = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", args.removeId))
      .collect();
    const keepGuardianIds = new Set(
      keepGuardians.map((g) => g.guardianIdentityId.toString())
    );
    for (const g of removeGuardians) {
      if (keepGuardianIds.has(g.guardianIdentityId.toString())) {
        conflicts.push({
          table: "guardianPlayerLinks",
          issue: "Same guardian linked to both",
          resolution: "Will delete duplicate link",
        });
      }
    }

    // Check team conflicts (same team)
    const keepTeams = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.keepId)
      )
      .collect();
    const removeTeams = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.removeId)
      )
      .collect();
    const keepTeamIds = new Set(keepTeams.map((t) => t.teamId));
    for (const t of removeTeams) {
      if (keepTeamIds.has(t.teamId)) {
        conflicts.push({
          table: "teamPlayerIdentities",
          issue: "Same team assignment",
          resolution: "Will delete duplicate assignment",
        });
      }
    }

    return {
      keepPlayer: {
        firstName: keepPlayer.firstName,
        lastName: keepPlayer.lastName,
        dateOfBirth: keepPlayer.dateOfBirth,
        gender: keepPlayer.gender,
      },
      removePlayer: {
        firstName: removePlayer.firstName,
        lastName: removePlayer.lastName,
        dateOfBirth: removePlayer.dateOfBirth,
        gender: removePlayer.gender,
      },
      affectedRecords,
      conflicts,
      canMerge: true,
    };
  },
});

/**
 * Merge two player identities: reassign all records from removeId to keepId.
 */
export const mergePlayerIdentities = mutation({
  args: {
    keepId: v.id("playerIdentities"),
    removeId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.object({
    recordsUpdated: v.number(),
    conflicts: v.array(mergeConflictValidator),
  }),
  handler: async (ctx, args) => {
    const { userId, role } = await requireAuthAndOrg(ctx, args.organizationId);
    if (role !== "admin" && role !== "owner") {
      throw new Error("Only admins and owners can merge player identities");
    }

    const keepPlayer = await ctx.db.get(args.keepId);
    const removePlayer = await ctx.db.get(args.removeId);
    if (!(keepPlayer && removePlayer)) {
      throw new Error("Player identity not found");
    }
    if (removePlayer.mergedInto) {
      throw new Error("This player has already been merged");
    }

    // Block if different user accounts linked
    const keepAccountLinks = await ctx.db
      .query("playerAccountLinks")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.keepId)
      )
      .collect();
    const removeAccountLinks = await ctx.db
      .query("playerAccountLinks")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.removeId)
      )
      .collect();
    const keepUserIds = new Set(keepAccountLinks.map((l) => l.userId));
    for (const link of removeAccountLinks) {
      if (!keepUserIds.has(link.userId)) {
        throw new Error(
          "Cannot merge: both identities linked to different user accounts"
        );
      }
    }

    let recordsUpdated = 0;
    const conflicts: Array<{
      table: string;
      issue: string;
      resolution: string;
    }> = [];

    // Pre-fetch keep player's existing records for conflict detection
    const keepEnrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.keepId)
      )
      .collect();
    const keepGuardians = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", args.keepId))
      .collect();
    const keepTeams = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.keepId)
      )
      .collect();
    const keepEnrollmentOrgs = new Set(
      keepEnrollments.map((e) => e.organizationId)
    );
    const keepGuardianIds = new Set(
      keepGuardians.map((g) => g.guardianIdentityId.toString())
    );
    const keepTeamIds = new Set(keepTeams.map((t) => t.teamId));

    // 1. orgPlayerEnrollments
    const removeEnrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.removeId)
      )
      .collect();
    for (const e of removeEnrollments) {
      if (keepEnrollmentOrgs.has(e.organizationId)) {
        await ctx.db.patch(e._id, {
          status: "inactive",
          updatedAt: Date.now(),
        });
        conflicts.push({
          table: "orgPlayerEnrollments",
          issue: "Duplicate enrollment in org",
          resolution: "Deactivated",
        });
      } else {
        await ctx.db.patch(e._id, {
          playerIdentityId: args.keepId,
          updatedAt: Date.now(),
        });
      }
      recordsUpdated += 1;
    }

    // 2. guardianPlayerLinks
    const removeGuardianLinks = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", args.removeId))
      .collect();
    for (const g of removeGuardianLinks) {
      if (keepGuardianIds.has(g.guardianIdentityId.toString())) {
        await ctx.db.delete(g._id);
        conflicts.push({
          table: "guardianPlayerLinks",
          issue: "Duplicate guardian link",
          resolution: "Deleted",
        });
      } else {
        await ctx.db.patch(g._id, { playerIdentityId: args.keepId });
      }
      recordsUpdated += 1;
    }

    // 3. sportPassports
    const removePassports = await ctx.db
      .query("sportPassports")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.removeId)
      )
      .collect();
    for (const p of removePassports) {
      await ctx.db.patch(p._id, { playerIdentityId: args.keepId });
      recordsUpdated += 1;
    }

    // 4. skillAssessments
    const removeAssessments = await ctx.db
      .query("skillAssessments")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.removeId)
      )
      .collect();
    for (const a of removeAssessments) {
      await ctx.db.patch(a._id, { playerIdentityId: args.keepId });
      recordsUpdated += 1;
    }

    // 5. teamPlayerIdentities
    const removeTeamLinks = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.removeId)
      )
      .collect();
    for (const t of removeTeamLinks) {
      if (keepTeamIds.has(t.teamId)) {
        await ctx.db.delete(t._id);
        conflicts.push({
          table: "teamPlayerIdentities",
          issue: "Duplicate team assignment",
          resolution: "Deleted",
        });
      } else {
        await ctx.db.patch(t._id, { playerIdentityId: args.keepId });
      }
      recordsUpdated += 1;
    }

    // 6. passportGoals
    const removeGoals = await ctx.db
      .query("passportGoals")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.removeId)
      )
      .collect();
    for (const g of removeGoals) {
      await ctx.db.patch(g._id, { playerIdentityId: args.keepId });
      recordsUpdated += 1;
    }

    // 7. playerInjuries
    const removeInjuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.removeId)
      )
      .collect();
    for (const i of removeInjuries) {
      await ctx.db.patch(i._id, { playerIdentityId: args.keepId });
      recordsUpdated += 1;
    }

    // 8. playerGraduations
    const removeGraduations = await ctx.db
      .query("playerGraduations")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", args.removeId))
      .collect();
    for (const g of removeGraduations) {
      await ctx.db.patch(g._id, { playerIdentityId: args.keepId });
      recordsUpdated += 1;
    }

    // 9. playerAccountLinks (delete duplicates, move others)
    for (const link of removeAccountLinks) {
      if (keepUserIds.has(link.userId)) {
        await ctx.db.delete(link._id);
        conflicts.push({
          table: "playerAccountLinks",
          issue: "Duplicate account link",
          resolution: "Deleted",
        });
      } else {
        await ctx.db.patch(link._id, { playerIdentityId: args.keepId });
      }
      recordsUpdated += 1;
    }

    // 10. playerAccessGrants
    const removeGrants = await ctx.db
      .query("playerAccessGrants")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", args.removeId))
      .collect();
    for (const g of removeGrants) {
      await ctx.db.patch(g._id, { playerIdentityId: args.keepId });
      recordsUpdated += 1;
    }

    // 11. playerAccessLogs
    const removeLogs = await ctx.db
      .query("playerAccessLogs")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", args.removeId))
      .collect();
    for (const l of removeLogs) {
      await ctx.db.patch(l._id, { playerIdentityId: args.keepId });
      recordsUpdated += 1;
    }

    // 12. passportShareConsents
    const removeConsents = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_player_and_status", (q) =>
        q.eq("playerIdentityId", args.removeId)
      )
      .collect();
    for (const c of removeConsents) {
      await ctx.db.patch(c._id, { playerIdentityId: args.keepId });
      recordsUpdated += 1;
    }

    // 13. passportShareRequests
    const removeRequests = await ctx.db
      .query("passportShareRequests")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", args.removeId))
      .collect();
    for (const r of removeRequests) {
      await ctx.db.patch(r._id, { playerIdentityId: args.keepId });
      recordsUpdated += 1;
    }

    // 14. playerEmergencyContacts
    const removeContacts = await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", args.removeId))
      .collect();
    for (const c of removeContacts) {
      await ctx.db.patch(c._id, { playerIdentityId: args.keepId });
      recordsUpdated += 1;
    }

    // Mark remove identity as merged
    await ctx.db.patch(args.removeId, {
      mergedInto: args.keepId,
      isActive: false,
      updatedAt: Date.now(),
    });

    // Insert audit record
    await ctx.db.insert("playerIdentityMerges", {
      keepId: args.keepId,
      removeId: args.removeId,
      organizationId: args.organizationId,
      mergedBy: userId,
      mergedAt: Date.now(),
      recordsUpdated,
      conflicts,
    });

    return { recordsUpdated, conflicts };
  },
});

// ============================================================
// INTERNAL QUERIES (for actions)
// ============================================================

/**
 * Internal query to get player identity by ID
 * Used by actions that cannot access ctx.db directly
 */
export const getById = internalQuery({
  args: { id: v.id("playerIdentities") },
  returns: v.union(playerIdentityValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.id),
});

/**
 * Find player by external ID
 * Used by webhook processor to find player for deletion
 */
export const findByExternalId = query({
  args: {
    organizationId: v.string(),
    externalIdType: v.string(), // e.g., "foireann"
    externalIdValue: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("playerIdentities"),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      isActive: v.optional(v.boolean()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Get all enrollments for this organization
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // For each enrollment, check playerIdentity's externalIds
    for (const enrollment of enrollments) {
      const identity = await ctx.db.get(enrollment.playerIdentityId);
      if (!identity) {
        continue;
      }

      // Check if externalIds[externalIdType] matches
      const externalIds = identity.externalIds as
        | Record<string, string>
        | undefined;
      if (externalIds?.[args.externalIdType] === args.externalIdValue) {
        return {
          _id: identity._id,
          firstName: identity.firstName,
          lastName: identity.lastName,
          isActive: identity.isActive,
        };
      }
    }

    return null;
  },
});

/**
 * Mark player as inactive
 * Used by webhook processor when member deleted from federation
 */
export const markPlayerInactive = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      throw new Error(`Player not found: ${args.playerIdentityId}`);
    }

    console.log(
      `[Player Identity] Marking player ${args.playerIdentityId} as inactive: ${args.reason}`
    );

    await ctx.db.patch(args.playerIdentityId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return null;
  },
});
