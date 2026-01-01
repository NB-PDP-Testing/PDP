import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

const enrollmentStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("pending"),
  v.literal("suspended")
);

// Enrollment validator for return types
const enrollmentValidator = v.object({
  _id: v.id("orgPlayerEnrollments"),
  _creationTime: v.number(),
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  clubMembershipNumber: v.optional(v.string()),
  ageGroup: v.string(),
  season: v.string(),
  status: enrollmentStatusValidator,
  reviewStatus: v.optional(v.string()),
  lastReviewDate: v.optional(v.string()),
  nextReviewDue: v.optional(v.string()),
  attendance: v.optional(
    v.object({
      training: v.optional(v.number()),
      matches: v.optional(v.number()),
    })
  ),
  coachNotes: v.optional(v.string()),
  adminNotes: v.optional(v.string()),
  enrolledAt: v.number(),
  updatedAt: v.number(),
});

// Player identity validator (for joined queries)
const playerIdentityValidator = v.object({
  _id: v.id("playerIdentities"),
  _creationTime: v.number(),
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.string(),
  gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
  playerType: v.union(v.literal("youth"), v.literal("adult")),
  userId: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  town: v.optional(v.string()),
  postcode: v.optional(v.string()),
  country: v.optional(v.string()),
  verificationStatus: v.union(
    v.literal("unverified"),
    v.literal("guardian_verified"),
    v.literal("self_verified"),
    v.literal("document_verified")
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdFrom: v.optional(v.string()),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get enrollment by ID
 */
export const getEnrollmentById = query({
  args: { enrollmentId: v.id("orgPlayerEnrollments") },
  returns: v.union(enrollmentValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.enrollmentId),
});

/**
 * Get enrollment for a player in a specific org
 */
export const getEnrollment = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.union(enrollmentValidator, v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first(),
});

/**
 * Get all enrollments for a player (across all orgs)
 */
export const getEnrollmentsForPlayer = query({
  args: { playerIdentityId: v.id("playerIdentities") },
  returns: v.array(enrollmentValidator),
  handler: async (ctx, args) =>
    await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect(),
});

/**
 * Get all enrollments for an organization
 */
export const getEnrollmentsForOrg = query({
  args: {
    organizationId: v.string(),
    status: v.optional(enrollmentStatusValidator),
  },
  returns: v.array(enrollmentValidator),
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_org_and_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", args.status!)
        )
        .collect();
    }

    return await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
  },
});

/**
 * Get enrollments for an org filtered by age group
 */
export const getEnrollmentsByAgeGroup = query({
  args: {
    organizationId: v.string(),
    ageGroup: v.string(),
  },
  returns: v.array(enrollmentValidator),
  handler: async (ctx, args) =>
    await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_org_and_ageGroup", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("ageGroup", args.ageGroup)
      )
      .collect(),
});

/**
 * Get all players for an organization (with player identity details)
 */
export const getPlayersForOrg = query({
  args: {
    organizationId: v.string(),
    status: v.optional(enrollmentStatusValidator),
    ageGroup: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("playerIdentities"),
      name: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      gender: v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("other")
      ),
      ageGroup: v.optional(v.string()),
      season: v.optional(v.string()),
      sportCode: v.optional(v.string()),
      playerIdentityId: v.id("playerIdentities"),
      enrollmentId: v.id("orgPlayerEnrollments"),
      organizationId: v.string(),
      enrollment: v.any(),
      player: v.any(),
    })
  ),
  handler: async (ctx, args) => {
    const enrollmentsQuery = ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      );

    let enrollments = await enrollmentsQuery.collect();

    // Filter by status if provided
    if (args.status) {
      enrollments = enrollments.filter((e) => e.status === args.status);
    }

    // Filter by age group if provided
    if (args.ageGroup) {
      enrollments = enrollments.filter((e) => e.ageGroup === args.ageGroup);
    }

    const results = [];

    for (const enrollment of enrollments) {
      const player = await ctx.db.get(enrollment.playerIdentityId);
      if (player) {
        // Get primary sport passport for this player (first active one)
        const passports = await ctx.db
          .query("sportPassports")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", enrollment.playerIdentityId)
          )
          .collect();

        const activePassport = passports.find((p) => p.status === "active");
        const sportCode = activePassport?.sportCode;

        // Return flat format for UI compatibility
        results.push({
          _id: player._id, // Player identity ID (for UI compatibility)
          name: `${player.firstName} ${player.lastName}`,
          firstName: player.firstName,
          lastName: player.lastName,
          dateOfBirth: player.dateOfBirth,
          gender: player.gender,
          ageGroup: enrollment.ageGroup,
          season: enrollment.season,
          sportCode,
          playerIdentityId: player._id,
          enrollmentId: enrollment._id,
          organizationId: enrollment.organizationId,
          // Legacy nested format for backwards compatibility
          enrollment,
          player,
        });
      }
    }

    return results;
  },
});

/**
 * Check if a player is enrolled in an organization
 */
export const isPlayerEnrolled = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();
    return enrollment !== null;
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Enroll a player in an organization
 * Optionally auto-creates a sport passport if sportCode is provided
 */
export const enrollPlayer = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    ageGroup: v.string(),
    season: v.string(),
    clubMembershipNumber: v.optional(v.string()),
    status: v.optional(enrollmentStatusValidator),
    // Optional: auto-create a sport passport during enrollment
    sportCode: v.optional(v.string()),
  },
  returns: v.object({
    enrollmentId: v.id("orgPlayerEnrollments"),
    passportId: v.union(v.id("sportPassports"), v.null()),
  }),
  handler: async (ctx, args) => {
    // Verify player exists
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      throw new Error("Player identity not found");
    }

    // Check if already enrolled in this org
    const existing = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (existing) {
      throw new Error("Player is already enrolled in this organization");
    }

    const now = Date.now();

    // Create enrollment
    const enrollmentId = await ctx.db.insert("orgPlayerEnrollments", {
      playerIdentityId: args.playerIdentityId,
      organizationId: args.organizationId,
      clubMembershipNumber: args.clubMembershipNumber,
      ageGroup: args.ageGroup,
      season: args.season,
      sport: args.sportCode, // Set sport from sportCode (Phase 2)
      status: args.status ?? "active",
      enrolledAt: now,
      updatedAt: now,
    });

    // Auto-create sport passport if sportCode provided
    let passportId = null;
    if (args.sportCode) {
      // Check if passport already exists for this player/sport
      const existingPassport = await ctx.db
        .query("sportPassports")
        .withIndex("by_player_and_sport", (q) =>
          q
            .eq("playerIdentityId", args.playerIdentityId)
            .eq("sportCode", args.sportCode!)
        )
        .first();

      if (existingPassport) {
        passportId = existingPassport._id;
      } else {
        // Create new passport
        passportId = await ctx.db.insert("sportPassports", {
          playerIdentityId: args.playerIdentityId,
          sportCode: args.sportCode,
          organizationId: args.organizationId,
          status: "active",
          assessmentCount: 0,
          currentSeason: args.season,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { enrollmentId, passportId };
  },
});

/**
 * Update an enrollment
 */
export const updateEnrollment = mutation({
  args: {
    enrollmentId: v.id("orgPlayerEnrollments"),
    ageGroup: v.optional(v.string()),
    season: v.optional(v.string()),
    clubMembershipNumber: v.optional(v.string()),
    status: v.optional(enrollmentStatusValidator),
    reviewStatus: v.optional(v.string()),
    lastReviewDate: v.optional(v.string()),
    nextReviewDue: v.optional(v.string()),
    coachNotes: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.enrollmentId);
    if (!existing) {
      throw new Error("Enrollment not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.ageGroup !== undefined) {
      updates.ageGroup = args.ageGroup;
    }
    if (args.season !== undefined) {
      updates.season = args.season;
    }
    if (args.clubMembershipNumber !== undefined) {
      updates.clubMembershipNumber = args.clubMembershipNumber;
    }
    if (args.status !== undefined) {
      updates.status = args.status;
    }
    if (args.reviewStatus !== undefined) {
      updates.reviewStatus = args.reviewStatus;
    }
    if (args.lastReviewDate !== undefined) {
      updates.lastReviewDate = args.lastReviewDate;
    }
    if (args.nextReviewDue !== undefined) {
      updates.nextReviewDue = args.nextReviewDue;
    }
    if (args.coachNotes !== undefined) {
      updates.coachNotes = args.coachNotes;
    }
    if (args.adminNotes !== undefined) {
      updates.adminNotes = args.adminNotes;
    }

    await ctx.db.patch(args.enrollmentId, updates);
    return null;
  },
});

/**
 * Update attendance for an enrollment
 */
export const updateAttendance = mutation({
  args: {
    enrollmentId: v.id("orgPlayerEnrollments"),
    training: v.optional(v.number()),
    matches: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.enrollmentId);
    if (!existing) {
      throw new Error("Enrollment not found");
    }

    const currentAttendance = existing.attendance ?? {};
    const newAttendance = {
      training: args.training ?? currentAttendance.training,
      matches: args.matches ?? currentAttendance.matches,
    };

    await ctx.db.patch(args.enrollmentId, {
      attendance: newAttendance,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Change enrollment status
 */
export const changeEnrollmentStatus = mutation({
  args: {
    enrollmentId: v.id("orgPlayerEnrollments"),
    status: enrollmentStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.enrollmentId);
    if (!existing) {
      throw new Error("Enrollment not found");
    }

    await ctx.db.patch(args.enrollmentId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Find or create enrollment (upsert pattern)
 * Optionally auto-creates a sport passport if sportCode is provided
 */
export const findOrCreateEnrollment = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    ageGroup: v.string(),
    season: v.string(),
    clubMembershipNumber: v.optional(v.string()),
    // Optional: auto-create a sport passport
    sportCode: v.optional(v.string()),
  },
  returns: v.object({
    enrollmentId: v.id("orgPlayerEnrollments"),
    wasCreated: v.boolean(),
    passportId: v.union(v.id("sportPassports"), v.null()),
    passportWasCreated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    let wasCreated = false;
    let passportWasCreated = false;
    let passportId = null;

    // Check if already enrolled
    let enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!enrollment) {
      // Verify player exists
      const player = await ctx.db.get(args.playerIdentityId);
      if (!player) {
        throw new Error("Player identity not found");
      }

      const enrollmentId = await ctx.db.insert("orgPlayerEnrollments", {
        playerIdentityId: args.playerIdentityId,
        organizationId: args.organizationId,
        clubMembershipNumber: args.clubMembershipNumber,
        ageGroup: args.ageGroup,
        season: args.season,
        sport: args.sportCode, // Set sport from sportCode (Phase 2)
        status: "active",
        enrolledAt: now,
        updatedAt: now,
      });

      enrollment = await ctx.db.get(enrollmentId);
      wasCreated = true;
    }

    // Handle passport if sportCode provided
    if (args.sportCode) {
      const existingPassport = await ctx.db
        .query("sportPassports")
        .withIndex("by_player_and_sport", (q) =>
          q
            .eq("playerIdentityId", args.playerIdentityId)
            .eq("sportCode", args.sportCode!)
        )
        .first();

      if (existingPassport) {
        passportId = existingPassport._id;
      } else {
        passportId = await ctx.db.insert("sportPassports", {
          playerIdentityId: args.playerIdentityId,
          sportCode: args.sportCode,
          organizationId: args.organizationId,
          status: "active",
          assessmentCount: 0,
          currentSeason: args.season,
          createdAt: now,
          updatedAt: now,
        });
        passportWasCreated = true;
      }
    }

    return {
      enrollmentId: enrollment!._id,
      wasCreated,
      passportId,
      passportWasCreated,
    };
  },
});

/**
 * Delete an enrollment (hard delete)
 */
export const deleteEnrollment = mutation({
  args: { enrollmentId: v.id("orgPlayerEnrollments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.enrollmentId);
    if (!existing) {
      throw new Error("Enrollment not found");
    }

    await ctx.db.delete(args.enrollmentId);
    return null;
  },
});

/**
 * Internal query to get players for an org (used by AI actions)
 */
export const getPlayersForOrgInternal = internalQuery({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("playerIdentities"),
      playerIdentityId: v.id("playerIdentities"),
      firstName: v.string(),
      lastName: v.string(),
      name: v.string(),
      ageGroup: v.string(),
      sport: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();

    const results = [];

    for (const enrollment of enrollments) {
      const player = await ctx.db.get(enrollment.playerIdentityId);
      if (!player) continue;

      // Get sport from passport if available
      const passport = await ctx.db
        .query("sportPassports")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", enrollment.playerIdentityId)
        )
        .first();

      results.push({
        _id: player._id,
        playerIdentityId: player._id,
        firstName: player.firstName,
        lastName: player.lastName,
        name: `${player.firstName} ${player.lastName}`,
        ageGroup: enrollment.ageGroup,
        sport: passport?.sportCode ?? null,
      });
    }

    return results;
  },
});

/**
 * Internal mutation to update review statuses based on due dates
 * Called daily by cron job to mark reviews as overdue or due soon
 */
export const updateReviewStatuses = internalMutation({
  args: {},
  returns: v.object({
    updated: v.number(),
    overdue: v.number(),
    dueSoon: v.number(),
  }),
  handler: async (ctx, args) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Calculate "due soon" threshold (7 days from now)
    const dueSoonDate = new Date();
    dueSoonDate.setDate(dueSoonDate.getDate() + 7);
    const dueSoonStr = dueSoonDate.toISOString().split("T")[0];

    let updated = 0;
    let overdue = 0;
    let dueSoon = 0;

    // Get all active enrollments that have a next review due date
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const enrollment of enrollments) {
      if (!enrollment.nextReviewDue) continue;

      const nextDue = enrollment.nextReviewDue;
      let newStatus: string | null = null;

      // Check if overdue (due date is in the past)
      if (nextDue < todayStr && enrollment.reviewStatus !== "Overdue") {
        newStatus = "Overdue";
        overdue++;
      }
      // Check if due soon (within next 7 days)
      else if (
        nextDue >= todayStr &&
        nextDue <= dueSoonStr &&
        enrollment.reviewStatus !== "Due Soon"
      ) {
        newStatus = "Due Soon";
        dueSoon++;
      }

      // Update if status needs to change
      if (newStatus) {
        await ctx.db.patch(enrollment._id, {
          reviewStatus: newStatus,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    console.log(
      `Review status update complete: ${updated} updated (${overdue} overdue, ${dueSoon} due soon)`
    );

    return { updated, overdue, dueSoon };
  },
});

/**
 * Mark a player's review as complete
 * Sets review status to "Completed" and calculates next review due date
 */
export const markReviewComplete = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    reviewPeriodDays: v.optional(v.number()), // Default 90 days
  },
  returns: v.object({
    enrollmentId: v.id("orgPlayerEnrollments"),
    nextReviewDue: v.string(),
  }),
  handler: async (ctx, args) => {
    // Find the enrollment
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!enrollment) {
      throw new Error("Player enrollment not found in this organization");
    }

    // Calculate next review due date
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const reviewPeriod = args.reviewPeriodDays ?? 90;
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + reviewPeriod);
    const nextReviewDueStr = nextReviewDate.toISOString().split("T")[0];

    // Update enrollment
    await ctx.db.patch(enrollment._id, {
      reviewStatus: "Completed",
      lastReviewDate: todayStr,
      nextReviewDue: nextReviewDueStr,
      updatedAt: Date.now(),
    });

    return {
      enrollmentId: enrollment._id,
      nextReviewDue: nextReviewDueStr,
    };
  },
});
