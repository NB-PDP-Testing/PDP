import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";
import { findGuardianMatches } from "../lib/matching/guardianMatcher";

// ============================================================
// IMPORT SESSIONS LIFECYCLE
// ============================================================
// Manages import session creation, status transitions,
// player selections, benchmark settings, and statistics.
// ============================================================

const statusValidator = v.union(
  v.literal("uploading"),
  v.literal("mapping"),
  v.literal("selecting"),
  v.literal("reviewing"),
  v.literal("importing"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled"),
  v.literal("undone")
);

const sourceInfoValidator = v.object({
  type: v.union(v.literal("file"), v.literal("paste"), v.literal("api")),
  fileName: v.optional(v.string()),
  fileSize: v.optional(v.number()),
  rowCount: v.number(),
  columnCount: v.number(),
});

const playerSelectionValidator = v.object({
  rowIndex: v.number(),
  selected: v.boolean(),
  reason: v.optional(v.string()),
});

const benchmarkSettingsValidator = v.object({
  applyBenchmarks: v.boolean(),
  strategy: v.string(),
  customTemplateId: v.optional(v.id("benchmarkTemplates")),
  passportStatuses: v.array(v.string()),
});

const statsValidator = v.object({
  totalRows: v.number(),
  selectedRows: v.number(),
  validRows: v.number(),
  errorRows: v.number(),
  duplicateRows: v.number(),
  playersCreated: v.number(),
  playersUpdated: v.number(),
  playersSkipped: v.number(),
  guardiansCreated: v.number(),
  guardiansLinked: v.number(),
  teamsCreated: v.number(),
  passportsCreated: v.number(),
  benchmarksApplied: v.number(),
});

const errorValidator = v.object({
  rowNumber: v.number(),
  field: v.string(),
  error: v.string(),
  value: v.optional(v.string()),
  resolved: v.boolean(),
});

const duplicateValidator = v.object({
  rowNumber: v.number(),
  existingPlayerId: v.id("playerIdentities"),
  resolution: v.union(
    v.literal("skip"),
    v.literal("merge"),
    v.literal("replace")
  ),
  // Phase 3.1: Confidence scoring for guardian matches
  guardianConfidence: v.optional(
    v.object({
      score: v.number(), // 0-100 confidence score
      level: v.union(v.literal("high"), v.literal("medium"), v.literal("low")), // Confidence level
      matchReasons: v.array(v.string()), // Reasons for the match (email, phone, address, etc.)
    })
  ),
});

const sessionReturnValidator = v.object({
  _id: v.id("importSessions"),
  _creationTime: v.number(),
  organizationId: v.string(),
  templateId: v.optional(v.id("importTemplates")),
  initiatedBy: v.string(),
  status: statusValidator,
  sourceInfo: sourceInfoValidator,
  mappings: v.record(v.string(), v.string()),
  playerSelections: v.array(playerSelectionValidator),
  benchmarkSettings: v.optional(benchmarkSettingsValidator),
  stats: statsValidator,
  errors: v.array(errorValidator),
  duplicates: v.array(duplicateValidator),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  undoneAt: v.optional(v.number()),
  undoneBy: v.optional(v.string()),
  undoReason: v.optional(v.string()),
});

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  uploading: ["mapping", "cancelled"],
  mapping: ["selecting", "cancelled"],
  selecting: ["reviewing", "cancelled"],
  reviewing: ["importing", "cancelled"],
  importing: ["completed", "failed"],
  completed: ["undone"],
  failed: [],
  cancelled: [],
};

/**
 * Create a new import session
 */
export const createImportSession = mutation({
  args: {
    organizationId: v.string(),
    templateId: v.optional(v.id("importTemplates")),
    initiatedBy: v.string(),
    sourceInfo: sourceInfoValidator,
  },
  returns: v.id("importSessions"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("importSessions", {
      organizationId: args.organizationId,
      templateId: args.templateId,
      initiatedBy: args.initiatedBy,
      status: "uploading",
      sourceInfo: args.sourceInfo,
      mappings: {},
      playerSelections: [],
      stats: {
        totalRows: args.sourceInfo.rowCount,
        selectedRows: 0,
        validRows: 0,
        errorRows: 0,
        duplicateRows: 0,
        playersCreated: 0,
        playersUpdated: 0,
        playersSkipped: 0,
        guardiansCreated: 0,
        guardiansLinked: 0,
        teamsCreated: 0,
        passportsCreated: 0,
        benchmarksApplied: 0,
      },
      errors: [],
      duplicates: [],
      startedAt: now,
    });
    return id;
  },
});

/**
 * Update session status with transition validation
 */
export const updateSessionStatus = mutation({
  args: {
    sessionId: v.id("importSessions"),
    status: statusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Import session not found");
    }

    const allowedTransitions = VALID_TRANSITIONS[session.status] ?? [];
    if (!allowedTransitions.includes(args.status)) {
      throw new Error(
        `Invalid status transition: ${session.status} -> ${args.status}`
      );
    }

    const patch: Record<string, unknown> = { status: args.status };
    if (args.status === "completed" || args.status === "failed") {
      patch.completedAt = Date.now();
    }

    await ctx.db.patch(args.sessionId, patch);
    return null;
  },
});

/**
 * Update column mappings for a session
 */
export const updateSessionMappings = mutation({
  args: {
    sessionId: v.id("importSessions"),
    mappings: v.record(v.string(), v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Import session not found");
    }
    await ctx.db.patch(args.sessionId, { mappings: args.mappings });
    return null;
  },
});

/**
 * Update player selections for a session
 */
export const updatePlayerSelections = mutation({
  args: {
    sessionId: v.id("importSessions"),
    selections: v.array(playerSelectionValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Import session not found");
    }
    await ctx.db.patch(args.sessionId, {
      playerSelections: args.selections,
    });
    return null;
  },
});

/**
 * Set benchmark configuration for a session
 */
export const setBenchmarkSettings = mutation({
  args: {
    sessionId: v.id("importSessions"),
    settings: benchmarkSettingsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Import session not found");
    }
    await ctx.db.patch(args.sessionId, {
      benchmarkSettings: args.settings,
    });
    return null;
  },
});

/**
 * Record final import statistics
 */
export const recordSessionStats = mutation({
  args: {
    sessionId: v.id("importSessions"),
    stats: statsValidator,
    errors: v.optional(v.array(errorValidator)),
    duplicates: v.optional(v.array(duplicateValidator)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Import session not found");
    }

    const patch: Record<string, unknown> = { stats: args.stats };
    if (args.errors !== undefined) {
      patch.errors = args.errors;
    }
    if (args.duplicates !== undefined) {
      patch.duplicates = args.duplicates;
    }

    await ctx.db.patch(args.sessionId, patch);
    return null;
  },
});

/**
 * Get a single session by ID
 */
export const getSession = query({
  args: {
    sessionId: v.id("importSessions"),
  },
  returns: v.union(sessionReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    return session ?? null;
  },
});

/**
 * List sessions by organization, ordered by startedAt desc.
 * Uses by_org_and_status index.
 */
export const listSessionsByOrg = query({
  args: {
    organizationId: v.string(),
    status: v.optional(statusValidator),
  },
  returns: v.array(sessionReturnValidator),
  handler: async (ctx, args) => {
    if (args.status) {
      const status = args.status;
      const sessions = await ctx.db
        .query("importSessions")
        .withIndex("by_org_and_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .collect();
      return sessions;
    }

    const sessions = await ctx.db
      .query("importSessions")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    // Sort by startedAt desc in memory since we can't sort by non-index fields
    return sessions.sort((a, b) => b.startedAt - a.startedAt);
  },
});

/**
 * Check if an import session can be undone.
 * Returns eligibility status, reasons for ineligibility, expiration time, and impact stats.
 */
export const checkUndoEligibility = query({
  args: {
    sessionId: v.id("importSessions"),
  },
  returns: v.object({
    eligible: v.boolean(),
    reasons: v.array(v.string()),
    expiresAt: v.union(v.number(), v.null()),
    stats: v.object({
      playerCount: v.number(),
      guardianCount: v.number(),
      enrollmentCount: v.number(),
      passportCount: v.number(),
      assessmentCount: v.number(),
      guardianLinkCount: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return {
        eligible: false,
        reasons: ["Session not found"],
        expiresAt: null,
        stats: {
          playerCount: 0,
          guardianCount: 0,
          enrollmentCount: 0,
          passportCount: 0,
          assessmentCount: 0,
          guardianLinkCount: 0,
        },
      };
    }

    const reasons: string[] = [];

    // Check 1: Session status must be 'completed'
    if (session.status !== "completed") {
      reasons.push(`Session status is '${session.status}', not 'completed'`);
    }

    // Check 2: 24-hour window
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const completedAt = session.completedAt ?? session.startedAt;
    const expiresAt = completedAt + TWENTY_FOUR_HOURS_MS;
    const isExpired = now > expiresAt;

    if (isExpired) {
      reasons.push(
        "24-hour undo window has expired (undo only available within 24 hours of import completion)"
      );
    }

    // Count records across all 6 tables using by_importSessionId index
    const playerIdentities = await ctx.db
      .query("playerIdentities")
      .withIndex("by_importSessionId", (q) =>
        q.eq("importSessionId", args.sessionId)
      )
      .collect();

    const guardianIdentities = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_importSessionId", (q) =>
        q.eq("importSessionId", args.sessionId)
      )
      .collect();

    const guardianPlayerLinks = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_importSessionId", (q) =>
        q.eq("importSessionId", args.sessionId)
      )
      .collect();

    const orgPlayerEnrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_importSessionId", (q) =>
        q.eq("importSessionId", args.sessionId)
      )
      .collect();

    const sportPassports = await ctx.db
      .query("sportPassports")
      .withIndex("by_importSessionId", (q) =>
        q.eq("importSessionId", args.sessionId)
      )
      .collect();

    const skillAssessments = await ctx.db
      .query("skillAssessments")
      .withIndex("by_importSessionId", (q) =>
        q.eq("importSessionId", args.sessionId)
      )
      .collect();

    // Check 3: Are there any assessments on imported players that were NOT created by this import?
    // Get all player IDs from this import
    const importedPlayerIds = new Set(playerIdentities.map((p) => p._id));

    // Query all assessments for these players
    const allAssessmentsForPlayers = await Promise.all(
      Array.from(importedPlayerIds).map(async (playerIdentityId) =>
        ctx.db
          .query("skillAssessments")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", playerIdentityId)
          )
          .collect()
      )
    );

    // Flatten and check if any assessments are NOT from this import
    const nonImportAssessments = allAssessmentsForPlayers
      .flat()
      .filter((a) => a.importSessionId !== args.sessionId);

    if (nonImportAssessments.length > 0) {
      reasons.push(
        "Players have assessments created after import (cannot undo if players have been assessed)"
      );
    }

    const stats = {
      playerCount: playerIdentities.length,
      guardianCount: guardianIdentities.length,
      enrollmentCount: orgPlayerEnrollments.length,
      passportCount: sportPassports.length,
      assessmentCount: skillAssessments.length,
      guardianLinkCount: guardianPlayerLinks.length,
    };

    return {
      eligible: reasons.length === 0,
      reasons,
      expiresAt: isExpired ? null : expiresAt,
      stats,
    };
  },
});

/**
 * Undo a completed import by deleting all records created during that import session.
 * HARD DELETE - permanently removes records from all 6 import tables.
 */
export const undoImport = mutation({
  args: {
    sessionId: v.id("importSessions"),
    reason: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    rollbackStats: v.object({
      playersRemoved: v.number(),
      guardiansRemoved: v.number(),
      guardianLinksRemoved: v.number(),
      enrollmentsRemoved: v.number(),
      passportsRemoved: v.number(),
      assessmentsRemoved: v.number(),
    }),
    ineligibilityReasons: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    // Step 1: Auth check - verify user is admin or owner
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return {
        success: false,
        rollbackStats: {
          playersRemoved: 0,
          guardiansRemoved: 0,
          guardianLinksRemoved: 0,
          enrollmentsRemoved: 0,
          passportsRemoved: 0,
          assessmentsRemoved: 0,
        },
        ineligibilityReasons: ["Session not found"],
      };
    }

    // Check if user is admin or owner of the organization
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "userId",
            value: user._id,
            operator: "eq",
          },
          {
            field: "organizationId",
            value: session.organizationId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    // Check Better Auth role OR functional admin role
    const betterAuthRole = memberResult?.role;
    const functionalRoles = (memberResult as any)?.functionalRoles || [];
    const hasAdminAccess =
      betterAuthRole === "admin" ||
      betterAuthRole === "owner" ||
      functionalRoles.includes("admin");

    if (!(memberResult && hasAdminAccess)) {
      throw new Error("You must be an admin or owner to undo imports");
    }

    // Step 2: Run eligibility checks (same logic as checkUndoEligibility)
    const reasons: string[] = [];

    // Check 1: Session status must be 'completed'
    if (session.status !== "completed") {
      reasons.push(`Session status is '${session.status}', not 'completed'`);
    }

    // Check 2: 24-hour window
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const completedAt = session.completedAt ?? session.startedAt;
    const expiresAt = completedAt + TWENTY_FOUR_HOURS_MS;
    const isExpired = now > expiresAt;

    if (isExpired) {
      reasons.push(
        "24-hour undo window has expired (undo only available within 24 hours of import completion)"
      );
    }

    // Step 3: Query each table by importSessionId index and collect all record IDs
    const playerIdentities = await ctx.db
      .query("playerIdentities")
      .withIndex("by_importSessionId", (q) =>
        q.eq("importSessionId", args.sessionId)
      )
      .collect();

    const guardianIdentities = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_importSessionId", (q) =>
        q.eq("importSessionId", args.sessionId)
      )
      .collect();

    const guardianPlayerLinks = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_importSessionId", (q) =>
        q.eq("importSessionId", args.sessionId)
      )
      .collect();

    const orgPlayerEnrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_importSessionId", (q) =>
        q.eq("importSessionId", args.sessionId)
      )
      .collect();

    const sportPassports = await ctx.db
      .query("sportPassports")
      .withIndex("by_importSessionId", (q) =>
        q.eq("importSessionId", args.sessionId)
      )
      .collect();

    const skillAssessments = await ctx.db
      .query("skillAssessments")
      .withIndex("by_importSessionId", (q) =>
        q.eq("importSessionId", args.sessionId)
      )
      .collect();

    // Check 3: Are there any assessments on imported players that were NOT created by this import?
    const importedPlayerIds = new Set(playerIdentities.map((p) => p._id));

    const allAssessmentsForPlayers = await Promise.all(
      Array.from(importedPlayerIds).map(async (playerIdentityId) =>
        ctx.db
          .query("skillAssessments")
          .withIndex("by_playerIdentityId", (q) =>
            q.eq("playerIdentityId", playerIdentityId)
          )
          .collect()
      )
    );

    const nonImportAssessments = allAssessmentsForPlayers
      .flat()
      .filter((a) => a.importSessionId !== args.sessionId);

    if (nonImportAssessments.length > 0) {
      reasons.push(
        "Players have assessments created after import (cannot undo if players have been assessed)"
      );
    }

    // If ineligible, return early with reasons
    if (reasons.length > 0) {
      return {
        success: false,
        rollbackStats: {
          playersRemoved: 0,
          guardiansRemoved: 0,
          guardianLinksRemoved: 0,
          enrollmentsRemoved: 0,
          passportsRemoved: 0,
          assessmentsRemoved: 0,
        },
        ineligibilityReasons: reasons,
      };
    }

    // Step 4: Delete all records - order matters to avoid foreign key issues
    // Delete leaf records first (assessments, passports), then middle (enrollments, links), then root (guardians, players)

    // Delete assessments first
    for (const assessment of skillAssessments) {
      await ctx.db.delete(assessment._id);
    }

    // Delete passports
    for (const passport of sportPassports) {
      await ctx.db.delete(passport._id);
    }

    // Delete enrollments
    for (const enrollment of orgPlayerEnrollments) {
      await ctx.db.delete(enrollment._id);
    }

    // Delete guardian-player links
    for (const link of guardianPlayerLinks) {
      await ctx.db.delete(link._id);
    }

    // Delete guardians
    for (const guardian of guardianIdentities) {
      await ctx.db.delete(guardian._id);
    }

    // Delete players last
    for (const player of playerIdentities) {
      await ctx.db.delete(player._id);
    }

    // Step 5: Patch importSessions to mark as undone
    await ctx.db.patch(args.sessionId, {
      status: "undone",
      undoneAt: now,
      undoneBy: user._id,
      undoReason: args.reason,
    });

    // Step 6: Return success with rollback stats
    return {
      success: true,
      rollbackStats: {
        playersRemoved: playerIdentities.length,
        guardiansRemoved: guardianIdentities.length,
        guardianLinksRemoved: guardianPlayerLinks.length,
        enrollmentsRemoved: orgPlayerEnrollments.length,
        passportsRemoved: sportPassports.length,
        assessmentsRemoved: skillAssessments.length,
      },
      ineligibilityReasons: [],
    };
  },
});

// ============================================================
// PHASE 3.1: DUPLICATE GUARDIAN DETECTION FOR REVIEW STEP
// ============================================================

/**
 * Detect duplicate guardians BEFORE import to show on Review step
 * with confidence indicators.
 *
 * This query takes selected player data and checks for existing guardians
 * that match based on email, phone, name, and address signals.
 */
export const detectDuplicateGuardians = query({
  args: {
    organizationId: v.string(),
    players: v.array(
      v.object({
        rowIndex: v.number(),
        firstName: v.string(),
        lastName: v.string(),
        dateOfBirth: v.string(),
        parentEmail: v.optional(v.string()),
        parentPhone: v.optional(v.string()),
        parentFirstName: v.optional(v.string()),
        parentLastName: v.optional(v.string()),
        parentAddress: v.optional(v.string()),
      })
    ),
  },
  returns: v.array(
    v.object({
      rowNumber: v.number(),
      existingGuardianId: v.id("guardianIdentities"),
      guardianName: v.string(),
      guardianEmail: v.optional(v.string()),
      guardianPhone: v.optional(v.string()),
      confidence: v.object({
        score: v.number(),
        level: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
        matchReasons: v.array(v.string()),
        signalBreakdown: v.array(
          v.object({
            signal: v.string(),
            matched: v.boolean(),
            weight: v.number(),
            contribution: v.number(),
            explanation: v.string(),
          })
        ),
      }),
    })
  ),
  handler: async (ctx, args) => {
    const duplicates = [];

    // Check each player for existing guardian matches
    for (const player of args.players) {
      // Skip if no guardian info provided
      if (
        !(player.parentEmail || player.parentPhone || player.parentFirstName)
      ) {
        continue;
      }

      // Call guardian matcher to find existing guardians
      const matches = await findGuardianMatches(ctx, {
        email: player.parentEmail || "",
        firstName: player.parentFirstName || "",
        lastName: player.parentLastName || "",
        phone: player.parentPhone,
        address: player.parentAddress,
      });

      // If matches found, add to duplicates with confidence data
      for (const match of matches) {
        // Build signal breakdown for transparency
        const signalBreakdown = [];

        // Email signal (40%)
        const emailMatched = !!(
          player.parentEmail &&
          match.guardian.email &&
          player.parentEmail.toLowerCase().trim() ===
            match.guardian.email.toLowerCase().trim()
        );
        signalBreakdown.push({
          signal: "Email",
          matched: emailMatched,
          weight: 40,
          contribution: emailMatched ? 40 : 0,
          explanation: emailMatched
            ? "Email addresses match exactly"
            : "Email addresses do not match",
        });

        // Phone signal (30%)
        const phoneMatched = !!(
          player.parentPhone &&
          match.guardian.phone &&
          player.parentPhone.replace(/\D/g, "").slice(-10) ===
            match.guardian.phone.replace(/\D/g, "").slice(-10)
        );
        signalBreakdown.push({
          signal: "Phone",
          matched: phoneMatched,
          weight: 30,
          contribution: phoneMatched ? 30 : 0,
          explanation: phoneMatched
            ? "Phone numbers match"
            : "Phone numbers do not match",
        });

        // Name signal (20%)
        const nameMatched = !!(
          player.parentLastName &&
          match.guardian.lastName &&
          player.parentLastName.toLowerCase().trim() ===
            match.guardian.lastName.toLowerCase().trim()
        );
        signalBreakdown.push({
          signal: "Name",
          matched: nameMatched,
          weight: 20,
          contribution: nameMatched ? 20 : 0,
          explanation: nameMatched
            ? "Last names match exactly"
            : "Last names do not match",
        });

        // Address signal (10%)
        // Note: Address matching is complex, using matchReasons as proxy
        const addressMatched = match.matchReasons.some(
          (r) =>
            r.includes("address") ||
            r.includes("postcode") ||
            r.includes("town")
        );
        signalBreakdown.push({
          signal: "Address",
          matched: addressMatched,
          weight: 10,
          contribution: addressMatched ? 10 : 0,
          explanation: addressMatched
            ? "Address components match"
            : "Address does not match",
        });

        duplicates.push({
          rowNumber: player.rowIndex,
          existingGuardianId: match.guardianIdentityId,
          guardianName: `${match.guardian.firstName} ${match.guardian.lastName}`,
          guardianEmail: match.guardian.email,
          guardianPhone: match.guardian.phone,
          confidence: {
            score: match.score,
            level: match.confidence,
            matchReasons: match.matchReasons,
            signalBreakdown,
          },
        });
      }
    }

    return duplicates;
  },
});
