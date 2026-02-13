import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

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
