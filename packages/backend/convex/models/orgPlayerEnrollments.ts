import type { Doc as BetterAuthDoc } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  query,
} from "../_generated/server";
import { requireAuthAndOrg } from "../lib/authHelpers";
import { findSimilarPlayersLogic } from "../lib/playerMatching";
import { calculateMatchScore } from "../lib/stringMatching";

// Admin/owner roles that can perform destructive operations
const ADMIN_ROLES = ["admin", "owner"];

// Whitespace split regex for name parsing (module-level for performance)
const WHITESPACE_REGEX = /\s+/;

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
  ageGroup: v.optional(v.string()),
  season: v.optional(v.string()),
  sport: v.optional(v.string()), // DEPRECATED: kept for backwards compatibility
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
  importSessionId: v.optional(v.id("importSessions")),
  lastSyncedAt: v.optional(v.number()),
  syncSource: v.optional(v.string()),
  enrolledAt: v.number(),
  updatedAt: v.number(),
});

// Player identity validator (for joined queries)
const _playerIdentityValidator = v.object({
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
  normalizedFirstName: v.optional(v.string()),
  normalizedLastName: v.optional(v.string()),
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
    const status = args.status;
    if (status) {
      return await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_org_and_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
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
 * List enrollments by organization (alias for getEnrollmentsForOrg)
 */
export const listEnrollmentsByOrganization = query({
  args: {
    organizationId: v.string(),
    status: v.optional(enrollmentStatusValidator),
  },
  returns: v.array(enrollmentValidator),
  handler: async (ctx, args) => {
    const status = args.status;
    if (status) {
      return await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_org_and_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
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
    // Use the appropriate index based on whether status is provided
    const { status } = args;
    const allEnrollments = status
      ? await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_org_and_status", (q) =>
            q.eq("organizationId", args.organizationId).eq("status", status)
          )
          .collect()
      : await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_organizationId", (q) =>
            q.eq("organizationId", args.organizationId)
          )
          .collect();

    // Filter by age group if provided (in-memory — no compound index with status+ageGroup)
    const enrollments = args.ageGroup
      ? allEnrollments.filter(
          (e) => e.ageGroup?.toLowerCase() === args.ageGroup?.toLowerCase()
        )
      : allEnrollments;

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

/**
 * Get all unlinked enrollments for an organization
 * Returns enrollments where the linked playerIdentity has no userId
 */
export const getUnlinkedEnrollmentsForOrg = query({
  args: { organizationId: v.string() },
  returns: v.array(
    v.object({
      enrollmentId: v.id("orgPlayerEnrollments"),
      playerIdentityId: v.id("playerIdentities"),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      ageGroup: v.optional(v.string()),
      season: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // 1. Fetch all enrollments by index (no .filter())
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    if (enrollments.length === 0) {
      return [];
    }

    // 2. Batch fetch all playerIdentities
    const identityIds = [
      ...new Set(enrollments.map((e) => e.playerIdentityId)),
    ];
    const identities = await Promise.all(
      identityIds.map((id) => ctx.db.get(id))
    );
    const identityMap = new Map(
      identities
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((p) => [p._id, p])
    );

    // 3. Return only those where userId is absent
    const unlinked = [];
    for (const e of enrollments) {
      const identity = identityMap.get(e.playerIdentityId);
      if (!identity || identity.userId) {
        continue;
      }
      unlinked.push({
        enrollmentId: e._id,
        playerIdentityId: e.playerIdentityId,
        firstName: identity.firstName,
        lastName: identity.lastName,
        dateOfBirth: identity.dateOfBirth,
        ageGroup: e.ageGroup,
        season: e.season,
      });
    }
    return unlinked;
  },
});

/**
 * Find unlinked player records that best match a Better Auth user's name/email.
 * Used in the admin UI to auto-suggest which unclaimed player belongs to a user.
 * Reuses the existing calculateMatchScore (Levenshtein + Irish name aliases).
 */
export const findMatchingUnlinkedPlayers = query({
  args: {
    organizationId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      enrollmentId: v.id("orgPlayerEnrollments"),
      playerIdentityId: v.id("playerIdentities"),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      ageGroup: v.optional(v.string()),
      matchScore: v.number(),
      confidence: v.union(
        v.literal("high"),
        v.literal("medium"),
        v.literal("low")
      ),
      matchReasons: v.array(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    if (!args.name.trim()) {
      return [];
    }

    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    if (enrollments.length === 0) {
      return [];
    }

    const identityIds = [
      ...new Set(enrollments.map((e) => e.playerIdentityId)),
    ];
    const identities = await Promise.all(
      identityIds.map((id) => ctx.db.get(id))
    );
    const identityMap = new Map(
      identities
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((p) => [p._id, p])
    );

    const results = [];

    for (const enrollment of enrollments) {
      const identity = identityMap.get(enrollment.playerIdentityId);
      if (!identity || identity.userId) {
        continue; // Skip already-claimed
      }

      let score = calculateMatchScore(
        args.name,
        identity.firstName,
        identity.lastName
      );
      const reasons: string[] = [];

      if (score >= 0.85) {
        reasons.push("Strong name match");
      } else if (score >= 0.65) {
        reasons.push("Partial name match");
      }

      // Email boost: exact match adds 0.35 and is surfaced as a reason
      if (
        args.email &&
        identity.email &&
        identity.email.toLowerCase() === args.email.toLowerCase()
      ) {
        score = Math.min(1, score + 0.35);
        reasons.push("Email matches");
      }

      if (score < 0.5) {
        continue;
      }

      const confidence: "high" | "medium" | "low" =
        score >= 0.85 ? "high" : score >= 0.65 ? "medium" : "low";

      results.push({
        enrollmentId: enrollment._id,
        playerIdentityId: identity._id,
        firstName: identity.firstName,
        lastName: identity.lastName,
        dateOfBirth: identity.dateOfBirth,
        ageGroup: enrollment.ageGroup,
        matchScore: Math.round(score * 100) / 100,
        confidence,
        matchReasons: reasons,
      });
    }

    results.sort((a, b) => b.matchScore - a.matchScore);
    return results.slice(0, 5);
  },
});

// ============================================================
// HELPERS
// ============================================================

/**
 * Cascade cleanup when a player is removed from an org.
 * Archives passports, revokes share consents, declines pending requests,
 * and disables access grants for the given org.
 * Preserves: injuries, emergency contacts, guardians, assessments, messages.
 */
async function cascadeCleanupForOrg(
  ctx: MutationCtx,
  playerIdentityId: Id<"playerIdentities">,
  organizationId: string
) {
  // 1. Archive active sport passports for this org
  const activePassports = await ctx.db
    .query("sportPassports")
    .withIndex("by_player_org_status", (q) =>
      q
        .eq("playerIdentityId", playerIdentityId)
        .eq("organizationId", organizationId)
        .eq("status", "active")
    )
    .collect();

  for (const passport of activePassports) {
    await ctx.db.patch(passport._id, {
      status: "archived" as const,
      updatedAt: Date.now(),
    });
  }

  // 2. Revoke active share consents where this org is the receiver
  const activeConsents = await ctx.db
    .query("passportShareConsents")
    .withIndex("by_player_and_status", (q) =>
      q.eq("playerIdentityId", playerIdentityId).eq("status", "active")
    )
    .collect();

  for (const consent of activeConsents) {
    if (consent.receivingOrgId === organizationId) {
      await ctx.db.patch(consent._id, {
        status: "revoked" as const,
        revokedAt: Date.now(),
      });
    }
  }

  // 3. Decline pending share requests from this org
  const pendingRequests = await ctx.db
    .query("passportShareRequests")
    .withIndex("by_player_and_status", (q) =>
      q.eq("playerIdentityId", playerIdentityId).eq("status", "pending")
    )
    .collect();

  for (const request of pendingRequests) {
    if (request.requestingOrgId === organizationId) {
      await ctx.db.patch(request._id, {
        status: "declined" as const,
        respondedAt: Date.now(),
      });
    }
  }

  // 4. Disable access grants for this org
  const accessGrants = await ctx.db
    .query("playerAccessGrants")
    .withIndex("by_player_and_org", (q) =>
      q
        .eq("playerIdentityId", playerIdentityId)
        .eq("organizationId", organizationId)
    )
    .collect();

  for (const grant of accessGrants) {
    if (grant.isEnabled) {
      await ctx.db.patch(grant._id, {
        isEnabled: false,
        updatedAt: Date.now(),
      });
    }
  }
}

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
    ageGroup: v.optional(v.string()),
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
    // Auth: verify caller is a member of the target organization
    await requireAuthAndOrg(ctx, args.organizationId);

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
      // If previously unenrolled (inactive), reactivate instead of throwing
      if (existing.status === "inactive") {
        await ctx.db.patch(existing._id, {
          status: args.status ?? "active",
          ageGroup: args.ageGroup,
          season: args.season,
          sport: args.sportCode,
          clubMembershipNumber: args.clubMembershipNumber,
          updatedAt: Date.now(),
        });

        // Check for existing sport passport (org-scoped to avoid cross-org dedup)
        let passportId = null;
        if (args.sportCode) {
          const orgPassports = await ctx.db
            .query("sportPassports")
            .withIndex("by_player_org_status", (q) =>
              q
                .eq("playerIdentityId", args.playerIdentityId)
                .eq("organizationId", args.organizationId)
            )
            .collect();
          const existingPassport =
            orgPassports.find((p) => p.sportCode === args.sportCode) ?? null;
          passportId = existingPassport?._id ?? null;
        }

        return { enrollmentId: existing._id, passportId };
      }
      // Already actively enrolled — return existing enrollment (idempotent)
      return { enrollmentId: existing._id, passportId: null };
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

    // Auto-create sport passport if sportCode provided (org-scoped dedup)
    let passportId = null;
    const sportCode = args.sportCode;
    if (sportCode) {
      // Check if passport already exists for this player/sport IN THIS ORG
      const orgPassports = await ctx.db
        .query("sportPassports")
        .withIndex("by_player_org_status", (q) =>
          q
            .eq("playerIdentityId", args.playerIdentityId)
            .eq("organizationId", args.organizationId)
        )
        .collect();
      const existingPassport =
        orgPassports.find((p) => p.sportCode === sportCode) ?? null;

      if (existingPassport) {
        passportId = existingPassport._id;
      } else {
        // Create new passport
        passportId = await ctx.db.insert("sportPassports", {
          playerIdentityId: args.playerIdentityId,
          sportCode,
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
    confirmed: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.enrollmentId);
    if (!existing) {
      throw new Error("Enrollment not found");
    }

    // Auth: verify caller is a member of this enrollment's organization
    const { userId } = await requireAuthAndOrg(ctx, existing.organizationId);

    // Admin own-record guard: require explicit confirmation when modifying own player record
    if (!args.confirmed) {
      const playerIdentity = await ctx.db.get(existing.playerIdentityId);
      if (playerIdentity?.userId === userId) {
        throw new Error("Self-modification requires explicit confirmation");
      }
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
    await requireAuthAndOrg(ctx, existing.organizationId);

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
    confirmed: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.enrollmentId);
    if (!existing) {
      throw new Error("Enrollment not found");
    }
    const { userId } = await requireAuthAndOrg(ctx, existing.organizationId);

    // Admin own-record guard: require explicit confirmation when modifying own player record
    if (!args.confirmed) {
      const playerIdentity = await ctx.db.get(existing.playerIdentityId);
      if (playerIdentity?.userId === userId) {
        throw new Error("Self-modification requires explicit confirmation");
      }
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
    await requireAuthAndOrg(ctx, args.organizationId);

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
    const enrollSportCode = args.sportCode;
    if (enrollSportCode) {
      const existingPassport = await ctx.db
        .query("sportPassports")
        .withIndex("by_player_and_sport", (q) =>
          q
            .eq("playerIdentityId", args.playerIdentityId)
            .eq("sportCode", enrollSportCode)
        )
        .first();

      if (existingPassport) {
        passportId = existingPassport._id;
      } else {
        passportId = await ctx.db.insert("sportPassports", {
          playerIdentityId: args.playerIdentityId,
          sportCode: enrollSportCode,
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

    if (!enrollment) {
      throw new Error("Failed to create or find enrollment");
    }

    return {
      enrollmentId: enrollment._id as Id<"orgPlayerEnrollments">,
      wasCreated,
      passportId: passportId as Id<"sportPassports"> | null,
      passportWasCreated,
    };
  },
});

/**
 * Create a playerIdentity (adult, self_verified), an orgPlayerEnrollment,
 * and link the userId — all in one atomic mutation.
 * Use when an admin assigns the "player" functional role to an active member
 * who has no existing player record.
 */
export const createPlayerIdentityAndEnrollment = mutation({
  args: {
    userId: v.string(),
    email: v.optional(v.string()),
    organizationId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    // Optional team IDs — ageGroup/season/sport are derived from the team
    teamIds: v.optional(v.array(v.string())),
  },
  returns: v.object({
    playerIdentityId: v.id("playerIdentities"),
    enrollmentId: v.id("orgPlayerEnrollments"),
    passportId: v.union(v.id("sportPassports"), v.null()),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Guard: userId already linked to a playerIdentity
    const existing = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) {
      throw new Error("This user is already linked to a player identity");
    }

    // 1. Fetch team data upfront (batch) so we can derive ageGroup/season/sport
    const teams =
      args.teamIds && args.teamIds.length > 0
        ? await Promise.all(
            args.teamIds.map((teamId) =>
              ctx.runQuery(components.betterAuth.adapter.findOne, {
                model: "team",
                where: [{ field: "_id", value: teamId, operator: "eq" }],
              })
            )
          )
        : [];
    const validTeams = teams.filter(Boolean) as Array<{
      _id: string;
      ageGroup?: string;
      season?: string;
      sport?: string;
    }>;

    // Derive from first team that has the value (or leave undefined)
    const firstTeamWithAgeGroup = validTeams.find((t) => t.ageGroup);
    const firstTeamWithSeason = validTeams.find((t) => t.season);
    const firstTeamWithSport = validTeams.find((t) => t.sport);

    // 2. Create the playerIdentity
    const playerIdentityId = await ctx.db.insert("playerIdentities", {
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      dateOfBirth: args.dateOfBirth,
      gender: "other",
      playerType: "adult",
      userId: args.userId,
      email: args.email?.toLowerCase().trim(),
      verificationStatus: "self_verified",
      createdAt: now,
      updatedAt: now,
      createdFrom: "manual",
    });

    // 3. Create the org enrollment (ageGroup/season optional — from team if available)
    const enrollmentId = await ctx.db.insert("orgPlayerEnrollments", {
      playerIdentityId,
      organizationId: args.organizationId,
      ageGroup: firstTeamWithAgeGroup?.ageGroup,
      season: firstTeamWithSeason?.season,
      status: "active",
      enrolledAt: now,
      updatedAt: now,
    });

    // 4. Assign to each selected team
    for (const team of validTeams) {
      // Skip if already on this team
      const existingLink = await ctx.db
        .query("teamPlayerIdentities")
        .withIndex("by_team_and_player", (q) =>
          q.eq("teamId", team._id).eq("playerIdentityId", playerIdentityId)
        )
        .first();
      if (!existingLink) {
        await ctx.db.insert("teamPlayerIdentities", {
          teamId: team._id,
          playerIdentityId,
          organizationId: args.organizationId,
          status: "active",
          season: team.season,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 5. Optionally create a sport passport if any team has a sport
    let passportId: Id<"sportPassports"> | null = null;
    if (firstTeamWithSport?.sport) {
      const existingPassport = await ctx.db
        .query("sportPassports")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerIdentityId)
        )
        .first();

      if (existingPassport) {
        passportId = existingPassport._id;
      } else {
        passportId = await ctx.db.insert("sportPassports", {
          playerIdentityId,
          sportCode: firstTeamWithSport.sport,
          organizationId: args.organizationId,
          currentSeason: firstTeamWithSeason?.season,
          status: "active",
          assessmentCount: 0,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { playerIdentityId, enrollmentId, passportId };
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

    // Auth: require admin/owner role for hard delete
    const { role } = await requireAuthAndOrg(ctx, existing.organizationId);
    if (!ADMIN_ROLES.includes(role)) {
      throw new Error("Only admin or owner can permanently delete enrollments");
    }

    // Remove team assignments for this player in this org
    const teamAssignments = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", existing.playerIdentityId)
      )
      .collect();

    for (const assignment of teamAssignments) {
      if (assignment.organizationId === existing.organizationId) {
        await ctx.db.delete(assignment._id);
      }
    }

    // Cascade: archive passports, revoke shares, decline requests, disable grants
    await cascadeCleanupForOrg(
      ctx,
      existing.playerIdentityId,
      existing.organizationId
    );

    await ctx.db.delete(args.enrollmentId);
    return null;
  },
});

/**
 * Unenroll a player from an organization (soft delete - sets status to inactive)
 * The player identity remains in the system and can be re-enrolled later.
 * Also removes any team assignments for this player.
 */
export const unenrollPlayer = mutation({
  args: { enrollmentId: v.id("orgPlayerEnrollments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.enrollmentId);
    if (!existing) {
      throw new Error("Enrollment not found");
    }

    // Auth: verify caller is a member of this enrollment's organization
    await requireAuthAndOrg(ctx, existing.organizationId);

    // Option 1: Soft delete (set status to inactive)
    // This preserves history and allows re-enrollment
    await ctx.db.patch(args.enrollmentId, {
      status: "inactive",
      updatedAt: Date.now(),
    });

    // Also remove any team assignments for this player in THIS org only
    // Query by playerIdentityId and filter to matching org to avoid cross-org damage
    const teamAssignments = await ctx.db
      .query("teamPlayerIdentities")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", existing.playerIdentityId)
      )
      .collect();

    // Only deactivate assignments belonging to the same org as the enrollment
    for (const assignment of teamAssignments) {
      if (
        assignment.organizationId === existing.organizationId &&
        assignment.status === "active"
      ) {
        await ctx.db.patch(assignment._id, {
          status: "inactive",
          updatedAt: Date.now(),
        });
      }
    }

    // Cascade: archive passports, revoke shares, decline requests, disable grants
    await cascadeCleanupForOrg(
      ctx,
      existing.playerIdentityId,
      existing.organizationId
    );

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
      ageGroup: v.optional(v.string()),
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
      if (!player) {
        continue;
      }

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
 * Internal query to get players for a coach's assigned teams (used by AI actions)
 * This ensures voice note insights only match against players the coach actually works with
 */
export const getPlayersForCoachTeamsInternal = internalQuery({
  args: {
    organizationId: v.string(),
    coachUserId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("playerIdentities"),
      playerIdentityId: v.id("playerIdentities"),
      firstName: v.string(),
      lastName: v.string(),
      name: v.string(),
      ageGroup: v.optional(v.string()),
      sport: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    // 1. Get coach's assigned teams
    const coachAssignment = await ctx.db
      .query("coachAssignments")
      .withIndex("by_user_and_org", (q) =>
        q
          .eq("userId", args.coachUserId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!coachAssignment || coachAssignment.teams.length === 0) {
      console.log(
        `[getPlayersForCoachTeamsInternal] No teams assigned for coach ${args.coachUserId} in org ${args.organizationId}`
      );
      // Fallback to all org players if no specific team assignments
      const enrollments = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_org_and_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", "active")
        )
        .collect();

      const results = [];
      for (const enrollment of enrollments) {
        const player = await ctx.db.get(enrollment.playerIdentityId);
        if (!player) {
          continue;
        }

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
    }

    // 2. Get all players on coach's assigned teams
    // IMPORTANT: coachAssignment.teams can contain either team IDs or team NAMES (legacy)
    // We need to resolve team names to team IDs using Better Auth adapter
    const allTeamsResult = await ctx.runQuery(
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

    const allTeams = allTeamsResult.page as any[];
    const teamByIdMap = new Map(
      allTeams.map((team) => [String(team._id), team])
    );
    const teamByNameMap = new Map(allTeams.map((team) => [team.name, team]));

    // Map assignment teams (could be IDs or names) to team IDs
    const teamIds: string[] = [];
    for (const teamValue of coachAssignment.teams) {
      // Try to find by ID first (new format), then by name (old format)
      const team = teamByIdMap.get(teamValue) || teamByNameMap.get(teamValue);
      if (team) {
        teamIds.push(String(team._id));
      } else {
        console.warn(
          `[getPlayersForCoachTeamsInternal] Team "${teamValue}" not found in org ${args.organizationId}`
        );
      }
    }

    const playerIdentityIds = new Set<Id<"playerIdentities">>();
    for (const teamId of teamIds) {
      const teamMembers = await ctx.db
        .query("teamPlayerIdentities")
        .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      for (const member of teamMembers) {
        playerIdentityIds.add(member.playerIdentityId);
      }
    }

    console.log(
      `[getPlayersForCoachTeamsInternal] Coach ${args.coachUserId} has ${coachAssignment.teams.length} team names (${teamIds.length} IDs resolved) with ${playerIdentityIds.size} unique players`
    );

    // 3. Get player details and enrollment info
    const results = [];
    for (const playerId of playerIdentityIds) {
      const player = await ctx.db.get(playerId);
      if (!player) {
        continue;
      }

      // Get enrollment for ageGroup
      const enrollment = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_player_and_org", (q) =>
          q
            .eq("playerIdentityId", playerId)
            .eq("organizationId", args.organizationId)
        )
        .first();

      if (!enrollment || enrollment.status !== "active") {
        continue;
      }

      // Get sport from passport
      const passport = await ctx.db
        .query("sportPassports")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
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
 * Public query to get players for a coach's assigned teams
 * Returns the same format as getPlayersForOrg for UI compatibility
 */
export const getPlayersForCoachTeams = query({
  args: {
    organizationId: v.string(),
    coachUserId: v.string(),
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
    // 1. Get coach's assigned teams
    const coachAssignment = await ctx.db
      .query("coachAssignments")
      .withIndex("by_user_and_org", (q) =>
        q
          .eq("userId", args.coachUserId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    // If no specific team assignments, fallback to all org players
    if (!coachAssignment || coachAssignment.teams.length === 0) {
      const enrollmentsQuery = ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_org_and_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", "active")
        );

      const enrollments = await enrollmentsQuery.collect();
      const results = [];

      for (const enrollment of enrollments) {
        const player = await ctx.db.get(enrollment.playerIdentityId);
        if (player) {
          const passports = await ctx.db
            .query("sportPassports")
            .withIndex("by_playerIdentityId", (q) =>
              q.eq("playerIdentityId", enrollment.playerIdentityId)
            )
            .collect();

          const activePassport = passports.find((p) => p.status === "active");

          results.push({
            _id: player._id,
            name: `${player.firstName} ${player.lastName}`,
            firstName: player.firstName,
            lastName: player.lastName,
            dateOfBirth: player.dateOfBirth,
            gender: player.gender,
            ageGroup: enrollment.ageGroup,
            season: enrollment.season,
            sportCode: activePassport?.sportCode,
            playerIdentityId: player._id,
            enrollmentId: enrollment._id,
            organizationId: enrollment.organizationId,
            enrollment,
            player,
          });
        }
      }
      return results;
    }

    // 2. Get all players on coach's assigned teams
    // First, resolve team values to actual IDs (supports both old name-based and new ID-based assignments)
    const allTeamsResult = await ctx.runQuery(
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

    const allTeams = allTeamsResult.page as BetterAuthDoc<"team">[];

    // Create maps for both ID and name lookups
    const teamByIdMap = new Map(
      allTeams.map((team) => [String(team._id), team])
    );
    const teamByNameMap = new Map(allTeams.map((team) => [team.name, team]));

    // Resolve team values to actual IDs
    const resolvedTeamIds: string[] = [];
    for (const teamValue of coachAssignment.teams) {
      // Try to find by ID first (new format), then by name (old format)
      const team = teamByIdMap.get(teamValue) || teamByNameMap.get(teamValue);
      if (team) {
        resolvedTeamIds.push(String(team._id));
      }
    }

    const playerIdentityIds = new Set<Id<"playerIdentities">>();
    for (const teamId of resolvedTeamIds) {
      const teamMembers = await ctx.db
        .query("teamPlayerIdentities")
        .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      for (const member of teamMembers) {
        playerIdentityIds.add(member.playerIdentityId);
      }
    }

    // 3. Get player details and enrollment info
    const results = [];
    for (const playerId of playerIdentityIds) {
      const player = await ctx.db.get(playerId);
      if (!player) {
        continue;
      }

      // Get enrollment for ageGroup
      const enrollment = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_player_and_org", (q) =>
          q
            .eq("playerIdentityId", playerId)
            .eq("organizationId", args.organizationId)
        )
        .first();

      if (!enrollment || enrollment.status !== "active") {
        continue;
      }

      // Get sport from passport
      const passports = await ctx.db
        .query("sportPassports")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
        )
        .collect();

      const activePassport = passports.find((p) => p.status === "active");

      results.push({
        _id: player._id,
        name: `${player.firstName} ${player.lastName}`,
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth,
        gender: player.gender,
        ageGroup: enrollment.ageGroup,
        season: enrollment.season,
        sportCode: activePassport?.sportCode,
        playerIdentityId: player._id,
        enrollmentId: enrollment._id,
        organizationId: enrollment.organizationId,
        enrollment,
        player,
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
  handler: async (ctx, _args) => {
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
      if (!enrollment.nextReviewDue) {
        continue;
      }

      const nextDue = enrollment.nextReviewDue;
      let newStatus: string | null = null;

      // Check if overdue (due date is in the past)
      if (nextDue < todayStr && enrollment.reviewStatus !== "Overdue") {
        newStatus = "Overdue";
        overdue += 1;
      }
      // Check if due soon (within next 7 days)
      else if (
        nextDue >= todayStr &&
        nextDue <= dueSoonStr &&
        enrollment.reviewStatus !== "Due Soon"
      ) {
        newStatus = "Due Soon";
        dueSoon += 1;
      }

      // Update if status needs to change
      if (newStatus) {
        await ctx.db.patch(enrollment._id, {
          reviewStatus: newStatus,
          updatedAt: Date.now(),
        });
        updated += 1;
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
    await requireAuthAndOrg(ctx, args.organizationId);

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

// ============================================================
// BULK QUERIES FOR PARENT DASHBOARD (US-PERF-014)
// ============================================================

// Validators for bulk child data return type
const bulkPassportValidator = v.object({
  _id: v.id("sportPassports"),
  _creationTime: v.number(),
  playerIdentityId: v.id("playerIdentities"),
  sportCode: v.string(),
  organizationId: v.string(),
  status: v.union(
    v.literal("active"),
    v.literal("inactive"),
    v.literal("archived")
  ),
  primaryPosition: v.optional(v.string()),
  secondaryPositions: v.optional(v.array(v.string())),
  coachPreferredPosition: v.optional(v.string()),
  leastPreferredPosition: v.optional(v.string()),
  dominantSide: v.optional(
    v.union(v.literal("left"), v.literal("right"), v.literal("both"))
  ),
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

const bulkInjuryValidator = v.object({
  _id: v.id("playerInjuries"),
  _creationTime: v.number(),
  playerIdentityId: v.id("playerIdentities"),
  injuryType: v.string(),
  bodyPart: v.string(),
  side: v.optional(
    v.union(v.literal("left"), v.literal("right"), v.literal("both"))
  ),
  dateOccurred: v.string(),
  dateReported: v.string(),
  severity: v.union(
    v.literal("minor"),
    v.literal("moderate"),
    v.literal("severe"),
    v.literal("long_term")
  ),
  status: v.union(
    v.literal("active"),
    v.literal("recovering"),
    v.literal("cleared"),
    v.literal("healed")
  ),
  description: v.string(),
  mechanism: v.optional(v.string()),
  treatment: v.optional(v.string()),
  medicalProvider: v.optional(v.string()),
  medicalNotes: v.optional(v.string()),
  expectedReturn: v.optional(v.string()),
  actualReturn: v.optional(v.string()),
  daysOut: v.optional(v.number()),
  returnToPlayProtocol: v.optional(
    v.array(
      v.object({
        id: v.string(),
        step: v.number(),
        description: v.string(),
        completed: v.boolean(),
        completedDate: v.optional(v.string()),
        clearedBy: v.optional(v.string()),
      })
    )
  ),
  occurredDuring: v.optional(
    v.union(
      v.literal("training"),
      v.literal("match"),
      v.literal("other_sport"),
      v.literal("non_sport"),
      v.literal("unknown")
    )
  ),
  occurredAtOrgId: v.optional(v.string()),
  sportCode: v.optional(v.string()),
  isVisibleToAllOrgs: v.boolean(),
  restrictedToOrgIds: v.optional(v.array(v.string())),
  reportedBy: v.optional(v.string()),
  reportedByRole: v.optional(
    v.union(
      v.literal("guardian"),
      v.literal("player"),
      v.literal("coach"),
      v.literal("admin")
    )
  ),
  estimatedRecoveryDays: v.optional(v.number()),
  recoveryPlanNotes: v.optional(v.string()),
  milestones: v.optional(
    v.array(
      v.object({
        id: v.string(),
        description: v.string(),
        targetDate: v.optional(v.string()),
        completedDate: v.optional(v.string()),
        completedBy: v.optional(v.string()),
        notes: v.optional(v.string()),
        order: v.number(),
      })
    )
  ),
  medicalClearanceRequired: v.optional(v.boolean()),
  medicalClearanceReceived: v.optional(v.boolean()),
  medicalClearanceDate: v.optional(v.string()),
  source: v.optional(v.union(v.literal("manual"), v.literal("voice_note"))),
  voiceNoteId: v.optional(v.id("voiceNotes")),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const bulkGoalValidator = v.object({
  _id: v.id("passportGoals"),
  _creationTime: v.number(),
  passportId: v.id("sportPassports"),
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  title: v.string(),
  description: v.string(),
  category: v.union(
    v.literal("technical"),
    v.literal("tactical"),
    v.literal("physical"),
    v.literal("mental"),
    v.literal("social")
  ),
  priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  status: v.union(
    v.literal("not_started"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("on_hold"),
    v.literal("cancelled")
  ),
  progress: v.number(),
  targetDate: v.optional(v.string()),
  completedDate: v.optional(v.string()),
  linkedSkills: v.optional(v.array(v.string())),
  milestones: v.optional(
    v.array(
      v.object({
        id: v.string(),
        description: v.string(),
        completed: v.boolean(),
        completedDate: v.optional(v.string()),
      })
    )
  ),
  parentActions: v.optional(v.array(v.string())),
  parentCanView: v.boolean(),
  isShareable: v.optional(v.boolean()),
  markedShareableAt: v.optional(v.number()),
  markedShareableBy: v.optional(v.string()),
  coachNotes: v.optional(v.string()),
  playerNotes: v.optional(v.string()),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const bulkMedicalProfileValidator = v.object({
  _id: v.id("medicalProfiles"),
  _creationTime: v.number(),
  playerId: v.optional(v.id("players")),
  playerIdentityId: v.optional(v.string()),
  bloodType: v.optional(v.string()),
  allergies: v.array(v.string()),
  medications: v.array(v.string()),
  conditions: v.array(v.string()),
  doctorName: v.optional(v.string()),
  doctorPhone: v.optional(v.string()),
  emergencyContact1Name: v.string(),
  emergencyContact1Phone: v.string(),
  emergencyContact2Name: v.optional(v.string()),
  emergencyContact2Phone: v.optional(v.string()),
  lastMedicalCheck: v.optional(v.string()),
  insuranceCovered: v.boolean(),
  notes: v.optional(v.string()),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
});

const bulkChildDataValidator = v.object({
  passports: v.array(bulkPassportValidator),
  injuries: v.array(bulkInjuryValidator),
  goals: v.array(bulkGoalValidator),
  medicalProfile: v.union(bulkMedicalProfileValidator, v.null()),
});

/**
 * Get bulk child data for parent dashboard (US-PERF-014)
 * Fetches passports, injuries, goals, and medical profiles for multiple children in one call.
 * This eliminates 5 useQuery calls per child in the ChildCard component.
 *
 * Performance: 4 batch queries total instead of 5 * N queries (where N = number of children)
 */
export const getBulkChildData = query({
  args: {
    playerIdentityIds: v.array(v.id("playerIdentities")),
    organizationId: v.string(),
  },
  returns: v.record(v.string(), bulkChildDataValidator),
  handler: async (ctx, args) => {
    const { playerIdentityIds, organizationId } = args;

    if (playerIdentityIds.length === 0) {
      return {};
    }

    // 1. Batch fetch all passports for all children
    // We can't query by array of IDs in Convex, so we fetch per child (but in parallel)
    const passportPromises = playerIdentityIds.map((playerId) =>
      ctx.db
        .query("sportPassports")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
        )
        .collect()
    );

    // 2. Batch fetch all injuries for all children
    const injuryPromises = playerIdentityIds.map((playerId) =>
      ctx.db
        .query("playerInjuries")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
        )
        .collect()
    );

    // 3. Batch fetch all goals for all children
    const goalPromises = playerIdentityIds.map((playerId) =>
      ctx.db
        .query("passportGoals")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
        )
        .collect()
    );

    // 4. Get player identities for medical profile lookup (need names)
    const identityPromises = playerIdentityIds.map((playerId) =>
      ctx.db.get(playerId)
    );

    // Execute all queries in parallel
    const [passportResults, injuryResults, goalResults, identityResults] =
      await Promise.all([
        Promise.all(passportPromises),
        Promise.all(injuryPromises),
        Promise.all(goalPromises),
        Promise.all(identityPromises),
      ]);

    // 5. Build medical profile lookups - need to find legacy players by name
    // Collect all names for batch lookup
    const identitiesWithNames: Array<{
      playerId: Id<"playerIdentities">;
      fullName: string;
    }> = [];
    for (let i = 0; i < playerIdentityIds.length; i++) {
      const identity = identityResults[i];
      if (identity) {
        identitiesWithNames.push({
          playerId: playerIdentityIds[i],
          fullName: `${identity.firstName} ${identity.lastName}`,
        });
      }
    }

    // Fetch legacy players for this org (single query)
    const legacyPlayers = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .collect();

    // Create name to legacy player map
    const nameToLegacyPlayer = new Map<string, (typeof legacyPlayers)[0]>();
    for (const player of legacyPlayers) {
      nameToLegacyPlayer.set(player.name, player);
    }

    // Collect legacy player IDs that match our children
    const legacyPlayerIdsToFetch: Array<{
      playerId: Id<"playerIdentities">;
      legacyPlayerId: Id<"players">;
    }> = [];
    for (const { playerId, fullName } of identitiesWithNames) {
      const legacyPlayer = nameToLegacyPlayer.get(fullName);
      if (legacyPlayer) {
        legacyPlayerIdsToFetch.push({
          playerId,
          legacyPlayerId: legacyPlayer._id,
        });
      }
    }

    // Batch fetch medical profiles
    const medicalProfilePromises = legacyPlayerIdsToFetch.map(
      ({ legacyPlayerId }) =>
        ctx.db
          .query("medicalProfiles")
          .withIndex("by_playerId", (q) => q.eq("playerId", legacyPlayerId))
          .first()
    );
    const medicalProfileResults = await Promise.all(medicalProfilePromises);

    // Create playerIdentityId -> medical profile map
    const playerToMedicalProfile = new Map<
      string,
      (typeof medicalProfileResults)[0]
    >();
    for (let i = 0; i < legacyPlayerIdsToFetch.length; i++) {
      const { playerId } = legacyPlayerIdsToFetch[i];
      const profile = medicalProfileResults[i];
      if (profile) {
        playerToMedicalProfile.set(playerId as string, profile);
      }
    }

    // Build result map: playerIdentityId -> { passports, injuries, goals, medicalProfile }
    const result: Record<
      string,
      {
        passports: (typeof passportResults)[0];
        injuries: (typeof injuryResults)[0];
        goals: (typeof goalResults)[0];
        medicalProfile: (typeof medicalProfileResults)[0] | null;
      }
    > = {};

    for (let i = 0; i < playerIdentityIds.length; i++) {
      const playerId = playerIdentityIds[i] as string;
      result[playerId] = {
        passports: passportResults[i],
        injuries: injuryResults[i],
        goals: goalResults[i],
        medicalProfile: playerToMedicalProfile.get(playerId) ?? null,
      };
    }

    return result;
  },
});

// ============================================================
// FUZZY PLAYER MATCHING (US-VN-006)
// Logic extracted to convex/lib/playerMatching.ts (shared with review microsite)
// ============================================================

/**
 * Find players whose names are similar to a search term.
 * Uses Levenshtein-based matching from stringMatching.ts (US-VN-005).
 *
 * Used by the WhatsApp voice note pipeline to resolve spoken player names.
 * Logic lives in lib/playerMatching.ts so the public review wrapper can reuse it.
 */
export const findSimilarPlayers = internalQuery({
  args: {
    organizationId: v.string(),
    coachUserId: v.string(),
    searchName: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      playerId: v.id("playerIdentities"),
      firstName: v.string(),
      lastName: v.string(),
      fullName: v.string(),
      similarity: v.number(),
      ageGroup: v.string(),
      sport: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, args) => findSimilarPlayersLogic(ctx, args),
});

// ============================================================
// PHASE 6: SELF-REGISTRATION AS PLAYER (US-P6-003)
// ============================================================

/**
 * Self-register as a player for an existing org member.
 * Creates a pending playerIdentity + enrollment for admin review.
 * Uses player matching to flag potential youth profile merges.
 */
export const selfRegisterAsPlayer = mutation({
  args: {
    organizationId: v.string(),
    dateOfBirth: v.string(),
    teamId: v.optional(v.string()),
  },
  returns: v.object({
    enrollmentId: v.id("orgPlayerEnrollments"),
    playerIdentityId: v.id("playerIdentities"),
    matchConfidence: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
      v.literal("none")
    ),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthAndOrg(ctx, args.organizationId);

    // Look up user record from Better Auth to get name/email
    const userRecord = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [{ field: "_id", value: userId, operator: "eq" }],
      }
    );
    if (!userRecord) {
      throw new Error("User record not found");
    }
    const user = userRecord as { name: string; email?: string };

    // Parse first/last name from display name
    const nameParts = (user.name ?? "").trim().split(WHITESPACE_REGEX);
    const firstName = nameParts[0] ?? "Unknown";
    const lastName = nameParts.slice(1).join(" ") || firstName;

    // Guard: user already linked to a playerIdentity
    const existingIdentity = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existingIdentity) {
      // Check if already enrolled (pending or active)
      const existingEnrollment = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_player_and_org", (q) =>
          q
            .eq("playerIdentityId", existingIdentity._id)
            .eq("organizationId", args.organizationId)
        )
        .first();
      if (existingEnrollment) {
        throw new Error(
          "You already have a player registration for this organization"
        );
      }
    }

    // Run player matching to detect potential youth profile
    type MatchResult = {
      confidence: "high" | "medium" | "low" | "none";
      match: {
        _id: Id<"playerIdentities">;
        firstName: string;
        lastName: string;
      } | null;
      matchScore: number;
      matchedFields: string[];
      warningFlag?: string;
    };
    const matchResult: MatchResult = await ctx.runQuery(
      internal.models.playerMatching.findBestPlayerMatchInternal,
      {
        organizationId: args.organizationId,
        firstName,
        lastName,
        dateOfBirth: args.dateOfBirth,
        email: user.email,
      }
    );

    // Encode match info in adminNotes for admin review
    const adminNotes = JSON.stringify({
      type: "self_registration",
      requestedByUserId: userId,
      matchFound:
        matchResult.confidence === "high" && matchResult.match !== null,
      matchConfidence: matchResult.confidence,
      matchedPlayerId: matchResult.match?._id ?? null,
      matchedPlayerName: matchResult.match
        ? `${matchResult.match.firstName} ${matchResult.match.lastName}`
        : null,
      matchedFields: matchResult.matchedFields,
    });

    const now = Date.now();

    // Create playerIdentity linked to user
    const playerIdentityId = await ctx.db.insert("playerIdentities", {
      firstName,
      lastName,
      dateOfBirth: args.dateOfBirth,
      gender: "other",
      playerType: "adult",
      userId,
      email: user.email?.toLowerCase().trim(),
      verificationStatus: "self_verified",
      createdAt: now,
      updatedAt: now,
      createdFrom: "self_registration",
    });

    // Create pending enrollment
    const enrollmentId = await ctx.db.insert("orgPlayerEnrollments", {
      playerIdentityId,
      organizationId: args.organizationId,
      status: "pending",
      syncSource: "self_registration",
      adminNotes,
      enrolledAt: now,
      updatedAt: now,
    });

    // Assign to team if provided
    if (args.teamId) {
      const existingLink = await ctx.db
        .query("teamPlayerIdentities")
        .withIndex("by_team_and_player", (q) =>
          q
            .eq("teamId", args.teamId as string)
            .eq("playerIdentityId", playerIdentityId)
        )
        .first();
      if (!existingLink) {
        await ctx.db.insert("teamPlayerIdentities", {
          teamId: args.teamId,
          playerIdentityId,
          organizationId: args.organizationId,
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return {
      enrollmentId,
      playerIdentityId,
      matchConfidence: matchResult.confidence,
    };
  },
});

/**
 * Get pending self-registration requests for admin review.
 * Returns enrollments with syncSource="self_registration" and status="pending".
 */
export const getPendingSelfRegistrations = query({
  args: { organizationId: v.string() },
  returns: v.array(
    v.object({
      enrollmentId: v.id("orgPlayerEnrollments"),
      playerIdentityId: v.id("playerIdentities"),
      name: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.string(),
      email: v.optional(v.string()),
      userId: v.optional(v.string()),
      enrolledAt: v.number(),
      matchFound: v.boolean(),
      matchConfidence: v.string(),
      matchedPlayerName: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    await requireAuthAndOrg(ctx, args.organizationId);

    const pending = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    const selfRegistrations = pending.filter(
      (e) => e.syncSource === "self_registration"
    );

    const results = [];
    for (const enrollment of selfRegistrations) {
      const player = await ctx.db.get(enrollment.playerIdentityId);
      if (!player) {
        continue;
      }
      let matchFound = false;
      let matchConfidence = "none";
      let matchedPlayerName: string | null = null;
      if (enrollment.adminNotes) {
        try {
          const notes = JSON.parse(enrollment.adminNotes);
          matchFound = notes.matchFound ?? false;
          matchConfidence = notes.matchConfidence ?? "none";
          matchedPlayerName = notes.matchedPlayerName ?? null;
        } catch {
          // adminNotes not parseable — treat as no match
        }
      }
      results.push({
        enrollmentId: enrollment._id,
        playerIdentityId: player._id,
        name: `${player.firstName} ${player.lastName}`,
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth,
        email: player.email,
        userId: player.userId,
        enrolledAt: enrollment.enrolledAt,
        matchFound,
        matchConfidence,
        matchedPlayerName,
      });
    }
    return results;
  },
});

/**
 * Approve a pending self-registration: activate enrollment + grant player role.
 * Called by admin from the pending registrations UI.
 */
export const approvePlayerSelfRegistration = mutation({
  args: {
    enrollmentId: v.id("orgPlayerEnrollments"),
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuthAndOrg(ctx, args.organizationId);

    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment) {
      throw new Error("Enrollment not found");
    }
    if (enrollment.organizationId !== args.organizationId) {
      throw new Error("Enrollment does not belong to this organization");
    }
    if (enrollment.status !== "pending") {
      throw new Error("Enrollment is not in pending state");
    }

    const player = await ctx.db.get(enrollment.playerIdentityId);
    if (!player) {
      throw new Error("Player identity not found");
    }
    if (!player.userId) {
      throw new Error("Player identity has no linked userId");
    }

    const now = Date.now();

    // Activate the enrollment
    await ctx.db.patch(args.enrollmentId, {
      status: "active",
      updatedAt: now,
    });

    // Grant player functional role
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "userId", value: player.userId, operator: "eq" },
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (memberResult) {
      const currentRoles: ("coach" | "parent" | "admin" | "player")[] =
        (memberResult as any).functionalRoles ?? [];
      if (!currentRoles.includes("player")) {
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "member",
            where: [{ field: "_id", value: memberResult._id, operator: "eq" }],
            update: { functionalRoles: [...currentRoles, "player"] },
          },
        });
      }
    }

    // Look up org name for notification
    const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
    });
    const orgName = (org as any)?.name ?? "the organization";

    // Notify user
    await ctx.runMutation(internal.models.notifications.createNotification, {
      userId: player.userId,
      organizationId: args.organizationId,
      type: "player_role_approved",
      title: "Player Role Approved",
      message: `Your player registration for ${orgName} has been approved. You can now access the Player portal.`,
      link: `/orgs/${args.organizationId}/player`,
      targetRole: "player",
    });

    return null;
  },
});
