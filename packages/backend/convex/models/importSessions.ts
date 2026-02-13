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
  undone: [],
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
 * Get usage stats for a batch of templates.
 * Returns usage count and last used date per template.
 */
export const getTemplateUsageStats = query({
  args: {
    templateIds: v.array(v.id("importTemplates")),
    organizationId: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      templateId: v.id("importTemplates"),
      usageCount: v.number(),
      lastUsedAt: v.union(v.number(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    if (args.templateIds.length === 0) {
      return [];
    }

    // Single fetch: get all sessions for this org, then group by templateId
    const orgId = args.organizationId;
    const sessions = orgId
      ? await ctx.db
          .query("importSessions")
          .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
          .collect()
      : // Fallback: fetch by each templateId (for platform-wide stats)
        await Promise.all(
          args.templateIds.map((tid) =>
            ctx.db
              .query("importSessions")
              .withIndex("by_templateId", (q) => q.eq("templateId", tid))
              .collect()
          )
        ).then((results) => results.flat());

    // Build a lookup: templateId -> { count, lastUsedAt }
    const templateIdSet = new Set(args.templateIds.map((id) => id.toString()));
    const statsMap = new Map<
      string,
      { usageCount: number; lastUsedAt: number | null }
    >();

    for (const session of sessions) {
      if (!session.templateId) {
        continue;
      }
      const tidStr = session.templateId.toString();
      if (!templateIdSet.has(tidStr)) {
        continue;
      }

      const existing = statsMap.get(tidStr);
      if (existing) {
        existing.usageCount += 1;
        if (
          existing.lastUsedAt === null ||
          session.startedAt > existing.lastUsedAt
        ) {
          existing.lastUsedAt = session.startedAt;
        }
      } else {
        statsMap.set(tidStr, {
          usageCount: 1,
          lastUsedAt: session.startedAt,
        });
      }
    }

    return args.templateIds.map((templateId) => {
      const stats = statsMap.get(templateId.toString());
      return {
        templateId,
        usageCount: stats?.usageCount ?? 0,
        lastUsedAt: stats?.lastUsedAt ?? null,
      };
    });
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
 * Uses by_org_and_status index. Defaults to 50 results max.
 */
export const listSessionsByOrg = query({
  args: {
    organizationId: v.string(),
    status: v.optional(statusValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(sessionReturnValidator),
  handler: async (ctx, args) => {
    const maxResults = args.limit ?? 50;

    if (args.status) {
      const status = args.status;
      const sessions = await ctx.db
        .query("importSessions")
        .withIndex("by_org_and_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", status)
        )
        .collect();
      return sessions
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, maxResults);
    }

    const sessions = await ctx.db
      .query("importSessions")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    // Sort by startedAt desc in memory since we can't sort by non-index fields
    return sessions
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, maxResults);
  },
});
