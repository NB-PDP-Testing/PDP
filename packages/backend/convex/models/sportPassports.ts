import { v } from "convex/values";
import { components } from "../_generated/api";
import { internalQuery, mutation, query } from "../_generated/server";
import type { Doc as BetterAuthDoc } from "../betterAuth/_generated/dataModel";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

const passportStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("archived")
);

const dominantSideValidator = v.union(
  v.literal("left"),
  v.literal("right"),
  v.literal("both")
);

// Passport validator for return types
const passportValidator = v.object({
  _id: v.id("sportPassports"),
  _creationTime: v.number(),
  playerIdentityId: v.id("playerIdentities"),
  sportCode: v.string(),
  organizationId: v.string(),
  status: passportStatusValidator,
  primaryPosition: v.optional(v.string()),
  secondaryPositions: v.optional(v.array(v.string())),
  coachPreferredPosition: v.optional(v.string()),
  leastPreferredPosition: v.optional(v.string()),
  dominantSide: v.optional(dominantSideValidator),
  isGoalkeeper: v.optional(v.boolean()),
  currentOverallRating: v.optional(v.number()),
  currentTechnicalRating: v.optional(v.number()),
  currentTacticalRating: v.optional(v.number()),
  currentPhysicalRating: v.optional(v.number()),
  currentMentalRating: v.optional(v.number()),
  lastAssessmentDate: v.optional(v.string()),
  lastAssessmentType: v.optional(v.string()),
  assessmentCount: v.number(),
  nextReviewDue: v.optional(v.string()),
  coachNotes: v.optional(v.string()),
  parentNotes: v.optional(v.string()),
  playerNotes: v.optional(v.string()),
  currentSeason: v.optional(v.string()),
  seasonsPlayed: v.optional(v.array(v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get passport by ID
 */
export const getPassportById = query({
  args: { passportId: v.id("sportPassports") },
  returns: v.union(passportValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.passportId),
});

/**
 * Get all passports for a player
 */
export const getPassportsForPlayer = query({
  args: { playerIdentityId: v.id("playerIdentities") },
  returns: v.array(passportValidator),
  handler: async (ctx, args) =>
    await ctx.db
      .query("sportPassports")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect(),
});

/**
 * Get passport for a specific player and sport
 */
export const getPassportForPlayerAndSport = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    sportCode: v.string(),
  },
  returns: v.union(passportValidator, v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("sportPassports")
      .withIndex("by_player_and_sport", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("sportCode", args.sportCode)
      )
      .first(),
});

/**
 * Get all passports for an organization
 */
export const getPassportsForOrg = query({
  args: {
    organizationId: v.string(),
    sportCode: v.optional(v.string()),
    status: v.optional(passportStatusValidator),
  },
  returns: v.array(passportValidator),
  handler: async (ctx, args) => {
    let passports = [];

    if (args.sportCode) {
      const sportCode = args.sportCode;
      passports = await ctx.db
        .query("sportPassports")
        .withIndex("by_org_and_sport", (q) =>
          q.eq("organizationId", args.organizationId).eq("sportCode", sportCode)
        )
        .collect();
    } else {
      passports = await ctx.db
        .query("sportPassports")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();
    }

    if (args.status) {
      passports = passports.filter((p) => p.status === args.status);
    }

    return passports;
  },
});

/**
 * Get passports for organization with player details
 */
export const getPassportsWithPlayersForOrg = query({
  args: {
    organizationId: v.string(),
    sportCode: v.optional(v.string()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    let passports = [];

    if (args.sportCode) {
      const sportCode = args.sportCode;
      passports = await ctx.db
        .query("sportPassports")
        .withIndex("by_org_and_sport", (q) =>
          q.eq("organizationId", args.organizationId).eq("sportCode", sportCode)
        )
        .collect();
    } else {
      passports = await ctx.db
        .query("sportPassports")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();
    }

    const results: any[] = [];
    for (const passport of passports) {
      const player = await ctx.db.get(passport.playerIdentityId);
      if (player) {
        results.push({ passport, player });
      }
    }

    return results;
  },
});

/**
 * Get sport passports for multiple players in bulk
 * Optimized for parent dashboards with multiple children
 *
 * @param playerIdentityIds - Array of player identity IDs
 * @returns Array of {playerIdentityId, passports, primarySportCode} for each player
 */
export const getBulkPassportsForPlayers = query({
  args: {
    playerIdentityIds: v.array(v.id("playerIdentities")),
  },
  returns: v.array(
    v.object({
      playerIdentityId: v.id("playerIdentities"),
      passports: v.array(passportValidator),
      primarySportCode: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // Fetch passports for each player in parallel
    const results = await Promise.all(
      args.playerIdentityIds.map(async (playerIdentityId) => {
        const passports = await ctx.db
          .query("sportPassports")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", playerIdentityId)
          )
          .collect();

        // Find primary sport (first active passport, or just first passport)
        const activeSport = passports.find((p) => p.status === "active");
        const primarySportCode =
          activeSport?.sportCode || passports[0]?.sportCode;

        return {
          playerIdentityId,
          passports,
          primarySportCode,
        };
      })
    );

    return results;
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Create a sport passport for a player
 */
export const createPassport = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    sportCode: v.string(),
    organizationId: v.string(),
    status: v.optional(passportStatusValidator),
    primaryPosition: v.optional(v.string()),
    secondaryPositions: v.optional(v.array(v.string())),
    dominantSide: v.optional(dominantSideValidator),
    isGoalkeeper: v.optional(v.boolean()),
    currentSeason: v.optional(v.string()),
  },
  returns: v.id("sportPassports"),
  handler: async (ctx, args) => {
    // Verify player exists
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      throw new Error("Player identity not found");
    }

    // Check if passport already exists for this player/sport combo
    const existing = await ctx.db
      .query("sportPassports")
      .withIndex("by_player_and_sport", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("sportCode", args.sportCode)
      )
      .first();

    if (existing) {
      throw new Error("Player already has a passport for this sport");
    }

    const now = Date.now();

    return await ctx.db.insert("sportPassports", {
      playerIdentityId: args.playerIdentityId,
      sportCode: args.sportCode,
      organizationId: args.organizationId,
      status: args.status ?? "active",
      primaryPosition: args.primaryPosition,
      secondaryPositions: args.secondaryPositions,
      dominantSide: args.dominantSide,
      isGoalkeeper: args.isGoalkeeper,
      assessmentCount: 0,
      currentSeason: args.currentSeason,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update passport position preferences
 */
export const updatePositions = mutation({
  args: {
    passportId: v.id("sportPassports"),
    primaryPosition: v.optional(v.string()),
    secondaryPositions: v.optional(v.array(v.string())),
    coachPreferredPosition: v.optional(v.string()),
    leastPreferredPosition: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.passportId);
    if (!existing) {
      throw new Error("Passport not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.primaryPosition !== undefined) {
      updates.primaryPosition = args.primaryPosition;
    }
    if (args.secondaryPositions !== undefined) {
      updates.secondaryPositions = args.secondaryPositions;
    }
    if (args.coachPreferredPosition !== undefined) {
      updates.coachPreferredPosition = args.coachPreferredPosition;
    }
    if (args.leastPreferredPosition !== undefined) {
      updates.leastPreferredPosition = args.leastPreferredPosition;
    }

    await ctx.db.patch(args.passportId, updates);
    return null;
  },
});

/**
 * Update passport physical attributes
 */
export const updatePhysicalAttributes = mutation({
  args: {
    passportId: v.id("sportPassports"),
    dominantSide: v.optional(dominantSideValidator),
    isGoalkeeper: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.passportId);
    if (!existing) {
      throw new Error("Passport not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.dominantSide !== undefined) {
      updates.dominantSide = args.dominantSide;
    }
    if (args.isGoalkeeper !== undefined) {
      updates.isGoalkeeper = args.isGoalkeeper;
    }

    await ctx.db.patch(args.passportId, updates);
    return null;
  },
});

/**
 * Update passport notes
 */
export const updateNotes = mutation({
  args: {
    passportId: v.id("sportPassports"),
    coachNotes: v.optional(v.string()),
    parentNotes: v.optional(v.string()),
    playerNotes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.passportId);
    if (!existing) {
      throw new Error("Passport not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.coachNotes !== undefined) {
      updates.coachNotes = args.coachNotes;
    }
    if (args.parentNotes !== undefined) {
      updates.parentNotes = args.parentNotes;
    }
    if (args.playerNotes !== undefined) {
      updates.playerNotes = args.playerNotes;
    }

    await ctx.db.patch(args.passportId, updates);
    return null;
  },
});

/**
 * Update passport ratings (called after assessments)
 */
export const updateRatings = mutation({
  args: {
    passportId: v.id("sportPassports"),
    currentOverallRating: v.optional(v.number()),
    currentTechnicalRating: v.optional(v.number()),
    currentTacticalRating: v.optional(v.number()),
    currentPhysicalRating: v.optional(v.number()),
    currentMentalRating: v.optional(v.number()),
    lastAssessmentDate: v.optional(v.string()),
    lastAssessmentType: v.optional(v.string()),
    incrementAssessmentCount: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.passportId);
    if (!existing) {
      throw new Error("Passport not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.currentOverallRating !== undefined) {
      updates.currentOverallRating = args.currentOverallRating;
    }
    if (args.currentTechnicalRating !== undefined) {
      updates.currentTechnicalRating = args.currentTechnicalRating;
    }
    if (args.currentTacticalRating !== undefined) {
      updates.currentTacticalRating = args.currentTacticalRating;
    }
    if (args.currentPhysicalRating !== undefined) {
      updates.currentPhysicalRating = args.currentPhysicalRating;
    }
    if (args.currentMentalRating !== undefined) {
      updates.currentMentalRating = args.currentMentalRating;
    }
    if (args.lastAssessmentDate !== undefined) {
      updates.lastAssessmentDate = args.lastAssessmentDate;
    }
    if (args.lastAssessmentType !== undefined) {
      updates.lastAssessmentType = args.lastAssessmentType;
    }
    if (args.incrementAssessmentCount) {
      updates.assessmentCount = existing.assessmentCount + 1;
    }

    await ctx.db.patch(args.passportId, updates);
    return null;
  },
});

/**
 * Change passport status
 */
export const changeStatus = mutation({
  args: {
    passportId: v.id("sportPassports"),
    status: passportStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.passportId);
    if (!existing) {
      throw new Error("Passport not found");
    }

    await ctx.db.patch(args.passportId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Set next review due date
 */
export const setNextReviewDue = mutation({
  args: {
    passportId: v.id("sportPassports"),
    nextReviewDue: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.passportId);
    if (!existing) {
      throw new Error("Passport not found");
    }

    await ctx.db.patch(args.passportId, {
      nextReviewDue: args.nextReviewDue,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Find or create passport (upsert pattern)
 */
export const findOrCreatePassport = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    sportCode: v.string(),
    organizationId: v.string(),
    currentSeason: v.optional(v.string()),
  },
  returns: v.object({
    passportId: v.id("sportPassports"),
    wasCreated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Check if passport already exists
    const existing = await ctx.db
      .query("sportPassports")
      .withIndex("by_player_and_sport", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("sportCode", args.sportCode)
      )
      .first();

    if (existing) {
      return {
        passportId: existing._id,
        wasCreated: false,
      };
    }

    // Verify player exists
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      throw new Error("Player identity not found");
    }

    const now = Date.now();

    const passportId = await ctx.db.insert("sportPassports", {
      playerIdentityId: args.playerIdentityId,
      sportCode: args.sportCode,
      organizationId: args.organizationId,
      status: "active",
      assessmentCount: 0,
      currentSeason: args.currentSeason,
      createdAt: now,
      updatedAt: now,
    });

    return {
      passportId,
      wasCreated: true,
    };
  },
});

/**
 * Get full player passport view (for player page)
 * This combines player identity, enrollment, passport, assessments, guardians, and goals
 */
export const getFullPlayerPassportView = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    sportCode: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Get player identity
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      return null;
    }

    // Get enrollment for this org
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!enrollment) {
      return null;
    }

    // Get passports (all or specific sport)
    let passports = [];

    if (args.sportCode) {
      const sportCode = args.sportCode;
      const passport = await ctx.db
        .query("sportPassports")
        .withIndex("by_player_and_sport", (q) =>
          q
            .eq("playerIdentityId", args.playerIdentityId)
            .eq("sportCode", sportCode)
        )
        .first();
      passports = passport ? [passport] : [];
    } else {
      passports = await ctx.db
        .query("sportPassports")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", args.playerIdentityId)
        )
        .collect();
    }

    // Get primary passport (first active one)
    const primaryPassport = passports.find((p) => p.status === "active");

    // Get guardians/parents
    const guardianLinks = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    const guardians: Array<{
      id: any;
      firstName: string;
      surname: string;
      email: string;
      phone: string;
      relationship: string;
      isPrimary: boolean;
    }> = [];
    for (const link of guardianLinks) {
      const guardian = await ctx.db.get(link.guardianIdentityId);
      if (guardian) {
        guardians.push({
          id: guardian._id,
          firstName: guardian.firstName,
          surname: guardian.lastName,
          email: guardian.email ?? "",
          phone: guardian.phone ?? "",
          relationship: link.relationship,
          isPrimary: link.isPrimary,
        });
      }
    }

    // Get emergency contacts
    const emergencyContacts = await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    // Get team assignments
    const teamMemberships = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    // Filter to active memberships only
    const activeTeamMemberships = teamMemberships.filter(
      (m) => m.status === "active"
    );

    // Fetch actual team details from Better Auth for each membership
    const teamAssignmentsRaw = await Promise.all(
      activeTeamMemberships.map(async (m) => {
        // Skip if teamId is missing or invalid
        if (!m.teamId || typeof m.teamId !== "string" || m.teamId.length < 10) {
          console.warn(
            `[sportPassports] Skipping invalid teamId: ${m.teamId} for player ${args.playerIdentityId}`
          );
          return null;
        }

        try {
          // Fetch team details from Better Auth
          const teamResult = await ctx.runQuery(
            components.betterAuth.adapter.findMany,
            {
              model: "team",
              paginationOpts: { cursor: null, numItems: 1 },
              where: [{ field: "_id", value: m.teamId, operator: "eq" }],
            }
          );
          const team = teamResult.page[0] as BetterAuthDoc<"team"> | undefined;

          // Return team assignment with full team details
          return {
            teamId: m.teamId,
            name: team?.name ?? "Unknown Team",
            sport: team?.sport,
            ageGroup: team?.ageGroup,
            gender: team?.gender,
            season: m.season ?? team?.season,
            role: m.role,
            joinedDate: m.joinedDate,
            isActive: team?.isActive ?? true,
          };
        } catch (error) {
          console.warn(
            `[sportPassports] Error fetching team ${m.teamId}:`,
            error
          );
          // Return a fallback entry so the player still shows
          return {
            teamId: m.teamId,
            name: "Unknown Team",
            sport: undefined,
            ageGroup: undefined,
            gender: undefined,
            season: m.season,
            role: m.role,
            joinedDate: m.joinedDate,
            isActive: false,
          };
        }
      })
    );

    // Filter out null entries from invalid teamIds
    const teamAssignments = teamAssignmentsRaw.filter(
      (t): t is NonNullable<typeof t> => t !== null
    );

    // Get goals for primary passport
    const goals = primaryPassport
      ? await ctx.db
          .query("passportGoals")
          .withIndex("by_passportId", (q) =>
            q.eq("passportId", primaryPassport._id)
          )
          .collect()
      : [];

    // Get latest assessments from primary passport
    const assessmentsRaw = primaryPassport
      ? await ctx.db
          .query("skillAssessments")
          .withIndex("by_passportId", (q) =>
            q.eq("passportId", primaryPassport._id)
          )
          .order("desc")
          .take(100)
      : [];

    // Transform assessments into skills Record<string, number>
    // Take the most recent rating for each skill (since we ordered by desc, first occurrence wins)
    // Convert snake_case skill codes to camelCase for frontend compatibility
    const snakeToCamel = (str: string): string =>
      str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

    const skillsMap: Record<string, number> = {};
    for (const assessment of assessmentsRaw) {
      // Convert skill code from snake_case to camelCase for frontend
      const key = snakeToCamel(assessment.skillCode);
      if (!skillsMap[key]) {
        skillsMap[key] = assessment.rating;
      }
    }

    // Get sport name
    const sport = primaryPassport
      ? await ctx.db
          .query("sports")
          .withIndex("by_code", (q) => q.eq("code", primaryPassport.sportCode))
          .first()
      : null;

    // Build legacy-compatible player data structure
    return {
      _id: player._id,
      name: `${player.firstName} ${player.lastName}`,
      firstName: player.firstName,
      lastName: player.lastName,
      ageGroup: enrollment.ageGroup ?? "Unknown",
      sport: sport?.name ?? primaryPassport?.sportCode ?? "Unknown",
      sportCode: primaryPassport?.sportCode,
      gender: player.gender,
      playerType: player.playerType, // "youth" or "adult"
      season: enrollment.season ?? primaryPassport?.currentSeason ?? "2024-25",
      dateOfBirth: player.dateOfBirth,
      // Contact and address info
      email: player.email,
      phone: player.phone,
      address: player.address,
      town: player.town,
      postcode: player.postcode,
      country: player.country,
      // Position and fitness info
      preferredPosition: primaryPassport?.primaryPosition,
      secondaryPositions: primaryPassport?.secondaryPositions ?? [],
      coachPreferredPosition: primaryPassport?.coachPreferredPosition,
      leastPreferredPosition: primaryPassport?.leastPreferredPosition,
      dominantSide: primaryPassport?.dominantSide,
      isGoalkeeper: primaryPassport?.isGoalkeeper,
      // Ratings
      currentOverallRating: primaryPassport?.currentOverallRating,
      currentTechnicalRating: primaryPassport?.currentTechnicalRating,
      currentTacticalRating: primaryPassport?.currentTacticalRating,
      currentPhysicalRating: primaryPassport?.currentPhysicalRating,
      currentMentalRating: primaryPassport?.currentMentalRating,
      // Parents/guardians (legacy format)
      parents: guardians,
      emergencyContacts,
      // Teams - get from new identity system
      teams: teamAssignments,
      teamCount: teamAssignments.length,
      // Notes - coachNotes from enrollment (primary), other notes from passport
      coachNotes: enrollment?.coachNotes ?? primaryPassport?.coachNotes,
      parentNotes: primaryPassport?.parentNotes,
      playerNotes: primaryPassport?.playerNotes,
      // Goals (convert to legacy format)
      goals: goals.map((g) => ({
        id: g._id,
        type: g.category,
        title: g.title,
        description: g.description,
        status: g.status,
        priority: g.priority,
        progress: g.progress,
        targetDate: g.targetDate,
        completedDate: g.completedDate,
        milestones: g.milestones,
        linkedSkills: g.linkedSkills,
        parentCanView: g.parentCanView,
        coachNotes: g.coachNotes,
        playerNotes: g.playerNotes,
        createdAt: g.createdAt,
      })),
      // Skills/assessments (grouped by skill code)
      skills: skillsMap,
      assessmentCount: primaryPassport?.assessmentCount ?? 0,
      lastAssessmentDate: primaryPassport?.lastAssessmentDate,
      // Enrollment info
      enrollmentStatus: enrollment.status,
      clubMembershipNumber: enrollment.clubMembershipNumber,
      // Raw references for advanced features
      playerIdentityId: player._id,
      enrollmentId: enrollment._id,
      passportId: primaryPassport?._id,
      passports,
    };
  },
});

/**
 * Delete a passport (hard delete)
 */
export const deletePassport = mutation({
  args: { passportId: v.id("sportPassports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.passportId);
    if (!existing) {
      throw new Error("Passport not found");
    }

    await ctx.db.delete(args.passportId);
    return null;
  },
});

/**
 * Get all sport codes for a player in an organization
 * Phase 3: Helper query for UI to display player's sports from sportPassports
 */
export const getSportsForPlayer = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    // Use composite index to avoid .filter() (performance fix)
    const passports = await ctx.db
      .query("sportPassports")
      .withIndex("by_player_org_status", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
          .eq("status", "active")
      )
      .collect();

    return passports.map((p) => p.sportCode);
  },
});

// ============================================================
// INTERNAL QUERIES (for actions)
// ============================================================

/**
 * Get passport by player identity ID (for internal use by actions)
 * Returns the first active passport found for the player
 */
export const getByPlayerIdentityId = internalQuery({
  args: { playerIdentityId: v.id("playerIdentities") },
  returns: v.union(
    v.object({
      _id: v.id("sportPassports"),
      sportCode: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const passport = await ctx.db
      .query("sportPassports")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .first();
    if (!passport) {
      return null;
    }
    return {
      _id: passport._id,
      sportCode: passport.sportCode,
    };
  },
});
