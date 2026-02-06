/**
 * WhatsApp Review Links - Coach Quick Review Microsite Backend
 *
 * Phase 2: US-VN-007
 *
 * ONE active link per coach, reused across multiple voice notes.
 * 48h expiry. Code-based auth (no session).
 *
 * See ADR-VN2-001 (capability URL auth), ADR-VN2-002 (rolling links),
 * ADR-VN2-003 (public queries with code validation).
 */

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

// 48 hours in milliseconds
const LINK_EXPIRY_MS = 48 * 60 * 60 * 1000;

// Max voice note IDs per link before creating a new link
const MAX_VOICE_NOTES_PER_LINK = 50;

// Max access log entries to keep per link
const MAX_ACCESS_LOG_ENTRIES = 100;

// Charset for code generation (excludes ambiguous: 0, O, I, l)
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789";
const CODE_LENGTH = 8;

/**
 * Generate a random review code (8 chars, unambiguous charset).
 */
function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

/**
 * Shared validation helper for review code.
 * Every public query/mutation calls this before returning data.
 */
async function validateReviewCode(
  // biome-ignore lint/suspicious/noExplicitAny: Accepts both QueryCtx and MutationCtx
  ctx: any,
  code: string
): Promise<{
  link: Doc<"whatsappReviewLinks">;
  isExpired: boolean;
} | null> {
  const link = await ctx.db
    .query("whatsappReviewLinks")
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic index query builder type
    .withIndex("by_code", (q: any) => q.eq("code", code))
    .unique();

  if (!link) {
    return null;
  }

  const isExpired = link.status !== "active" || Date.now() > link.expiresAt;
  return { link, isExpired };
}

// ============================================================
// INTERNAL MUTATIONS (called from WhatsApp pipeline)
// ============================================================

/**
 * Generate or reuse an active review link for a coach.
 *
 * Reuses existing active link if found (appends voiceNoteId).
 * Creates new link with fresh 8-char code if no active link exists.
 */
export const generateReviewLink = internalMutation({
  args: {
    voiceNoteId: v.id("voiceNotes"),
    organizationId: v.string(),
    coachUserId: v.string(),
  },
  returns: v.object({
    code: v.string(),
    isReused: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check for existing active link for this coach
    const existingLink = await ctx.db
      .query("whatsappReviewLinks")
      .withIndex("by_coachUserId_and_status", (q) =>
        q.eq("coachUserId", args.coachUserId).eq("status", "active")
      )
      .first();

    if (
      existingLink &&
      existingLink.expiresAt > now &&
      existingLink.voiceNoteIds.length < MAX_VOICE_NOTES_PER_LINK
    ) {
      // Reuse existing link — append voiceNoteId if not already present
      const voiceNoteIds = existingLink.voiceNoteIds.includes(args.voiceNoteId)
        ? existingLink.voiceNoteIds
        : [...existingLink.voiceNoteIds, args.voiceNoteId];

      await ctx.db.patch(existingLink._id, {
        voiceNoteIds,
        lastNoteAddedAt: now,
      });

      return { code: existingLink.code, isReused: true };
    }

    // Create new link
    const code = generateCode();
    await ctx.db.insert("whatsappReviewLinks", {
      code,
      organizationId: args.organizationId,
      coachUserId: args.coachUserId,
      voiceNoteIds: [args.voiceNoteId],
      status: "active",
      createdAt: now,
      expiresAt: now + LINK_EXPIRY_MS,
      lastNoteAddedAt: now,
      accessCount: 0,
      accessLog: [],
    });

    return { code, isReused: false };
  },
});

// ============================================================
// PUBLIC QUERIES (called from microsite, code = auth)
// ============================================================

/**
 * Get review link data by code. Validates existence and expiry.
 */
export const getReviewLinkByCode = query({
  args: { code: v.string() },
  returns: v.union(
    v.object({
      found: v.literal(true),
      isExpired: v.boolean(),
      organizationId: v.string(),
      coachUserId: v.string(),
      voiceNoteCount: v.number(),
      createdAt: v.number(),
      expiresAt: v.number(),
    }),
    v.object({
      found: v.literal(false),
    })
  ),
  handler: async (ctx, args) => {
    const result = await validateReviewCode(ctx, args.code);
    if (!result) {
      return { found: false as const };
    }

    return {
      found: true as const,
      isExpired: result.isExpired,
      organizationId: result.link.organizationId,
      coachUserId: result.link.coachUserId,
      voiceNoteCount: result.link.voiceNoteIds.length,
      createdAt: result.link.createdAt,
      expiresAt: result.link.expiresAt,
    };
  },
});

/**
 * Get all pending items across all voice notes in a review link.
 * Aggregates insights by priority category.
 *
 * See ADR-VN2-004 for design rationale.
 */
export const getCoachPendingItems = query({
  args: { code: v.string() },
  returns: v.union(
    v.object({
      injuries: v.array(
        v.object({
          insightId: v.string(),
          voiceNoteId: v.id("voiceNotes"),
          playerName: v.optional(v.string()),
          playerIdentityId: v.optional(v.id("playerIdentities")),
          title: v.string(),
          description: v.string(),
          category: v.optional(v.string()),
          status: v.string(),
          noteDate: v.string(),
        })
      ),
      unmatched: v.array(
        v.object({
          insightId: v.string(),
          voiceNoteId: v.id("voiceNotes"),
          playerName: v.optional(v.string()),
          title: v.string(),
          description: v.string(),
          category: v.optional(v.string()),
          status: v.string(),
          noteDate: v.string(),
        })
      ),
      needsReview: v.array(
        v.object({
          insightId: v.string(),
          voiceNoteId: v.id("voiceNotes"),
          playerName: v.optional(v.string()),
          playerIdentityId: v.optional(v.id("playerIdentities")),
          title: v.string(),
          description: v.string(),
          category: v.optional(v.string()),
          status: v.string(),
          noteDate: v.string(),
        })
      ),
      todos: v.array(
        v.object({
          insightId: v.string(),
          voiceNoteId: v.id("voiceNotes"),
          title: v.string(),
          description: v.string(),
          category: v.optional(v.string()),
          status: v.string(),
          noteDate: v.string(),
          assigneeName: v.optional(v.string()),
        })
      ),
      teamNotes: v.array(
        v.object({
          insightId: v.string(),
          voiceNoteId: v.id("voiceNotes"),
          title: v.string(),
          description: v.string(),
          category: v.optional(v.string()),
          status: v.string(),
          noteDate: v.string(),
          teamName: v.optional(v.string()),
        })
      ),
      autoApplied: v.array(
        v.object({
          insightId: v.string(),
          voiceNoteId: v.id("voiceNotes"),
          playerName: v.optional(v.string()),
          title: v.string(),
          description: v.string(),
          category: v.optional(v.string()),
          status: v.string(),
          noteDate: v.string(),
        })
      ),
      totalCount: v.number(),
      reviewedCount: v.number(),
      voiceNoteCount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const result = await validateReviewCode(ctx, args.code);
    if (!result || result.isExpired) {
      return null;
    }

    const { link } = result;

    // Batch fetch all voice notes by ID (direct lookups, not N+1)
    const voiceNotes = await Promise.all(
      link.voiceNoteIds.map((id) => ctx.db.get(id))
    );
    const validNotes = voiceNotes.filter(Boolean) as NonNullable<
      (typeof voiceNotes)[number]
    >[];

    // Flatten all insights with source note context
    const allInsights = validNotes.flatMap((note) =>
      (note.insights ?? []).map((insight) => ({
        ...insight,
        voiceNoteId: note._id,
        noteDate: note.date,
      }))
    );

    // Categorize by type/status
    const injuries = allInsights
      .filter((i) => i.category === "injury" && i.status === "pending")
      .map((i) => ({
        insightId: i.id,
        voiceNoteId: i.voiceNoteId,
        playerName: i.playerName,
        playerIdentityId: i.playerIdentityId,
        title: i.title,
        description: i.description,
        category: i.category,
        status: i.status,
        noteDate: i.noteDate,
      }));

    const unmatched = allInsights
      .filter(
        (i) =>
          !i.playerIdentityId &&
          i.status === "pending" &&
          i.category !== "team_culture" &&
          i.category !== "todo"
      )
      .map((i) => ({
        insightId: i.id,
        voiceNoteId: i.voiceNoteId,
        playerName: i.playerName,
        title: i.title,
        description: i.description,
        category: i.category,
        status: i.status,
        noteDate: i.noteDate,
      }));

    const needsReview = allInsights
      .filter(
        (i) =>
          i.status === "pending" &&
          i.playerIdentityId &&
          i.category !== "injury" &&
          i.category !== "todo" &&
          i.category !== "team_culture"
      )
      .map((i) => ({
        insightId: i.id,
        voiceNoteId: i.voiceNoteId,
        playerName: i.playerName,
        playerIdentityId: i.playerIdentityId,
        title: i.title,
        description: i.description,
        category: i.category,
        status: i.status,
        noteDate: i.noteDate,
      }));

    const todos = allInsights
      .filter((i) => i.category === "todo" && i.status === "pending")
      .map((i) => ({
        insightId: i.id,
        voiceNoteId: i.voiceNoteId,
        title: i.title,
        description: i.description,
        category: i.category,
        status: i.status,
        noteDate: i.noteDate,
        assigneeName: i.assigneeName,
      }));

    const teamNotes = allInsights
      .filter((i) => i.category === "team_culture" && i.status === "pending")
      .map((i) => ({
        insightId: i.id,
        voiceNoteId: i.voiceNoteId,
        title: i.title,
        description: i.description,
        category: i.category,
        status: i.status,
        noteDate: i.noteDate,
        teamName: i.teamName,
      }));

    const autoApplied = allInsights
      .filter((i) => i.status === "auto_applied" || i.status === "applied")
      .map((i) => ({
        insightId: i.id,
        voiceNoteId: i.voiceNoteId,
        playerName: i.playerName,
        title: i.title,
        description: i.description,
        category: i.category,
        status: i.status,
        noteDate: i.noteDate,
      }));

    // Count actionable items (pending) vs reviewed (applied/dismissed/auto_applied)
    const actionable = allInsights.filter((i) => i.status === "pending").length;
    const reviewed = allInsights.filter(
      (i) =>
        i.status === "applied" ||
        i.status === "dismissed" ||
        i.status === "auto_applied"
    ).length;

    return {
      injuries,
      unmatched,
      needsReview,
      todos,
      teamNotes,
      autoApplied,
      totalCount: actionable + reviewed,
      reviewedCount: reviewed,
      voiceNoteCount: validNotes.length,
    };
  },
});

// ============================================================
// PUBLIC MUTATIONS (called from microsite, code = auth)
// ============================================================

/**
 * Mark a review link as accessed. Logs access details and device fingerprint.
 */
export const markLinkAccessed = mutation({
  args: {
    code: v.string(),
    deviceFingerprint: v.optional(v.string()),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      isNewDevice: v.boolean(),
    }),
    v.object({
      success: v.literal(false),
      reason: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const result = await validateReviewCode(ctx, args.code);
    if (!result) {
      return { success: false as const, reason: "invalid_code" };
    }
    if (result.isExpired) {
      return { success: false as const, reason: "expired" };
    }

    const { link } = result;
    const now = Date.now();

    // Check device fingerprint
    let isNewDevice = false;
    if (args.deviceFingerprint && link.deviceFingerprint) {
      isNewDevice = args.deviceFingerprint !== link.deviceFingerprint;
    }

    // Append to access log (cap at MAX_ACCESS_LOG_ENTRIES)
    const newLogEntry = {
      timestamp: now,
      ip: args.ip,
      userAgent: args.userAgent,
    };
    const accessLog = [...link.accessLog, newLogEntry].slice(
      -MAX_ACCESS_LOG_ENTRIES
    );

    await ctx.db.patch(link._id, {
      accessedAt: now,
      accessCount: link.accessCount + 1,
      accessLog,
      // Set device fingerprint on first access only
      ...(link.deviceFingerprint
        ? {}
        : { deviceFingerprint: args.deviceFingerprint }),
    });

    return { success: true as const, isNewDevice };
  },
});

// ============================================================
// PUBLIC MUTATIONS — Review actions (US-VN-009)
// ============================================================

/**
 * Helper: validate code + verify voiceNoteId belongs to link.
 */
async function validateReviewScope(
  // biome-ignore lint/suspicious/noExplicitAny: Accepts both QueryCtx and MutationCtx
  ctx: any,
  code: string,
  voiceNoteId: string
): Promise<{
  link: Doc<"whatsappReviewLinks">;
  note: Doc<"voiceNotes">;
} | null> {
  const result = await validateReviewCode(ctx, code);
  if (!result || result.isExpired) {
    return null;
  }

  const { link } = result;
  // Verify the voice note belongs to this link
  // biome-ignore lint/suspicious/noExplicitAny: voiceNoteId string must be cast to match Id type in array
  if (!link.voiceNoteIds.includes(voiceNoteId as any)) {
    return null;
  }

  const note = await ctx.db.get(voiceNoteId);
  if (!note) {
    return null;
  }

  return { link, note };
}

/**
 * Edit insight content (title, description, category) from the review microsite.
 * Coach can edit AI-generated insights before applying.
 */
export const editInsightFromReview = mutation({
  args: {
    code: v.string(),
    voiceNoteId: v.id("voiceNotes"),
    insightId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({ success: v.literal(false), reason: v.string() })
  ),
  handler: async (ctx, args) => {
    const scope = await validateReviewScope(ctx, args.code, args.voiceNoteId);
    if (!scope) {
      return { success: false as const, reason: "invalid_or_expired" };
    }

    const { note } = scope;
    const updatedInsights = note.insights.map((insight) => {
      if (insight.id === args.insightId) {
        return {
          ...insight,
          title: args.title ?? insight.title,
          description: args.description ?? insight.description,
          category: args.category ?? insight.category,
        };
      }
      return insight;
    });

    await ctx.db.patch(note._id, { insights: updatedInsights });
    return { success: true as const };
  },
});

/**
 * Apply a single insight from the review microsite.
 * Marks the embedded insight as "applied" with timestamp.
 */
export const applyInsightFromReview = mutation({
  args: {
    code: v.string(),
    voiceNoteId: v.id("voiceNotes"),
    insightId: v.string(),
  },
  returns: v.union(
    v.object({ success: v.literal(true), message: v.string() }),
    v.object({ success: v.literal(false), reason: v.string() })
  ),
  handler: async (ctx, args) => {
    const scope = await validateReviewScope(ctx, args.code, args.voiceNoteId);
    if (!scope) {
      return { success: false as const, reason: "invalid_or_expired" };
    }

    const { note } = scope;
    const insight = note.insights.find((i) => i.id === args.insightId);
    if (!insight) {
      return { success: false as const, reason: "insight_not_found" };
    }
    if (insight.status !== "pending") {
      return { success: false as const, reason: "already_actioned" };
    }

    const now = Date.now();
    const updatedInsights = note.insights.map((i) => {
      if (i.id === args.insightId) {
        return {
          ...i,
          status: "applied" as const,
          appliedAt: now,
          appliedDate: new Date().toISOString(),
        };
      }
      return i;
    });

    await ctx.db.patch(note._id, { insights: updatedInsights });
    return {
      success: true as const,
      message: `Applied: ${insight.title}`,
    };
  },
});

/**
 * Dismiss a single insight from the review microsite.
 */
export const dismissInsightFromReview = mutation({
  args: {
    code: v.string(),
    voiceNoteId: v.id("voiceNotes"),
    insightId: v.string(),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({ success: v.literal(false), reason: v.string() })
  ),
  handler: async (ctx, args) => {
    const scope = await validateReviewScope(ctx, args.code, args.voiceNoteId);
    if (!scope) {
      return { success: false as const, reason: "invalid_or_expired" };
    }

    const { note } = scope;
    const insight = note.insights.find((i) => i.id === args.insightId);
    if (!insight) {
      return { success: false as const, reason: "insight_not_found" };
    }
    if (insight.status !== "pending") {
      return { success: false as const, reason: "already_actioned" };
    }

    const now = Date.now();
    const updatedInsights = note.insights.map((i) => {
      if (i.id === args.insightId) {
        return {
          ...i,
          status: "dismissed" as const,
          dismissedAt: now,
        };
      }
      return i;
    });

    await ctx.db.patch(note._id, { insights: updatedInsights });
    return { success: true as const };
  },
});

/**
 * Batch apply all pending matched insights from the review microsite.
 * Applies all insights that have a playerIdentityId or are team-level.
 */
export const batchApplyInsightsFromReview = mutation({
  args: {
    code: v.string(),
    items: v.array(
      v.object({
        voiceNoteId: v.id("voiceNotes"),
        insightId: v.string(),
      })
    ),
  },
  returns: v.object({
    successCount: v.number(),
    failCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const result = await validateReviewCode(ctx, args.code);
    if (!result || result.isExpired) {
      return { successCount: 0, failCount: args.items.length };
    }

    const { link } = result;
    let successCount = 0;
    let failCount = 0;

    // Group by voiceNoteId to batch DB reads
    const byNote = new Map<string, string[]>();
    for (const item of args.items) {
      if (!link.voiceNoteIds.includes(item.voiceNoteId)) {
        failCount += 1;
        continue;
      }
      const existing = byNote.get(item.voiceNoteId as string) || [];
      existing.push(item.insightId);
      byNote.set(item.voiceNoteId as string, existing);
    }

    const now = Date.now();
    for (const [noteId, insightIds] of byNote) {
      // biome-ignore lint/suspicious/noExplicitAny: Map key is string but ctx.db.get expects Id type
      const note = await ctx.db.get(noteId as any);
      if (!note) {
        failCount += insightIds.length;
        continue;
      }

      // biome-ignore lint/suspicious/noExplicitAny: voiceNotes doc type not narrowed from generic get
      const updatedInsights = (note as any).insights.map(
        (i: { id: string; status: string }) => {
          if (insightIds.includes(i.id) && i.status === "pending") {
            successCount += 1;
            return {
              ...i,
              status: "applied" as const,
              appliedAt: now,
              appliedDate: new Date().toISOString(),
            };
          }
          return i;
        }
      );

      // Check if any were actually not applied (already actioned)
      const actualApplied = insightIds.filter((id) =>
        // biome-ignore lint/suspicious/noExplicitAny: voiceNotes doc type not narrowed
        (note as any).insights.find(
          (i: { id: string; status: string }) =>
            i.id === id && i.status === "pending"
        )
      );
      failCount += insightIds.length - actualApplied.length;

      // biome-ignore lint/suspicious/noExplicitAny: Generic doc type from Map-based lookup
      await ctx.db.patch(note._id as any, { insights: updatedInsights });
    }

    return { successCount, failCount };
  },
});

// ============================================================
// PUBLIC QUERIES — Unmatched player matching (US-VN-010)
// ============================================================

/**
 * Find similar players for an unmatched insight in the review microsite.
 * PUBLIC wrapper that validates code, then delegates to shared findSimilarPlayersLogic.
 */
export const findSimilarPlayersForReview = query({
  args: {
    code: v.string(),
    searchName: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.union(
    v.object({
      suggestions: v.array(
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const result = await validateReviewCode(ctx, args.code);
    if (!result || result.isExpired) {
      return null;
    }

    const { findSimilarPlayersLogic: matchLogic } = await import(
      "../lib/playerMatching"
    );

    const suggestions = await matchLogic(ctx, {
      organizationId: result.link.organizationId,
      coachUserId: result.link.coachUserId,
      searchName: args.searchName,
      limit: args.limit ?? 5,
    });

    return { suggestions };
  },
});

// ============================================================
// PUBLIC MUTATIONS — Unmatched player assignment (US-VN-010)
// ============================================================

/**
 * Assign a player to an unmatched insight from the review microsite.
 * Updates the insight's playerIdentityId and playerName.
 */
export const assignPlayerFromReview = mutation({
  args: {
    code: v.string(),
    voiceNoteId: v.id("voiceNotes"),
    insightId: v.string(),
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.union(
    v.object({ success: v.literal(true), playerName: v.string() }),
    v.object({ success: v.literal(false), reason: v.string() })
  ),
  handler: async (ctx, args) => {
    const scope = await validateReviewScope(ctx, args.code, args.voiceNoteId);
    if (!scope) {
      return { success: false as const, reason: "invalid_or_expired" };
    }

    const { note } = scope;
    const insight = note.insights.find((i) => i.id === args.insightId);
    if (!insight) {
      return { success: false as const, reason: "insight_not_found" };
    }

    // Verify the player exists
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      return { success: false as const, reason: "player_not_found" };
    }

    const playerName = `${player.firstName} ${player.lastName}`;

    const updatedInsights = note.insights.map((i) => {
      if (i.id === args.insightId) {
        return {
          ...i,
          playerIdentityId: args.playerIdentityId,
          playerName,
        };
      }
      return i;
    });

    await ctx.db.patch(note._id, { insights: updatedInsights });
    return { success: true as const, playerName };
  },
});

// ============================================================
// INTERNAL QUERIES — WhatsApp command handlers (US-VN-011)
// ============================================================

type PendingCounts = {
  pendingMatchedCount: number;
  pendingUnmatchedCount: number;
  pendingInjuryCount: number;
  pendingTodoCount: number;
  pendingTeamNoteCount: number;
  totalPendingCount: number;
};

// Category-to-count-key mapping for pending insight categorization
const CATEGORY_COUNT_KEY: Record<
  string,
  keyof Omit<PendingCounts, "totalPendingCount">
> = {
  injury: "pendingInjuryCount",
  todo: "pendingTodoCount",
  team_culture: "pendingTeamNoteCount",
};

/**
 * Classify a single pending insight into a count key.
 */
function classifyInsight(insight: {
  category?: string;
  playerIdentityId?: unknown;
}): keyof Omit<PendingCounts, "totalPendingCount"> {
  const mapped = CATEGORY_COUNT_KEY[insight.category ?? ""];
  if (mapped) {
    return mapped;
  }
  return insight.playerIdentityId
    ? "pendingMatchedCount"
    : "pendingUnmatchedCount";
}

/**
 * Count pending insights by category across voice notes.
 */
function countPendingInsights(
  notes: Array<{
    insights?: Array<{
      status: string;
      category?: string;
      playerIdentityId?: unknown;
    }>;
  }>
): PendingCounts {
  const counts: PendingCounts = {
    pendingMatchedCount: 0,
    pendingUnmatchedCount: 0,
    pendingInjuryCount: 0,
    pendingTodoCount: 0,
    pendingTeamNoteCount: 0,
    totalPendingCount: 0,
  };

  for (const note of notes) {
    for (const insight of note.insights ?? []) {
      if (insight.status === "pending") {
        const key = classifyInsight(insight);
        counts[key] += 1;
        counts.totalPendingCount += 1;
      }
    }
  }

  return counts;
}

/**
 * Get the active review link for a coach.
 * Returns the link data + pending item counts for WhatsApp quick-reply handlers.
 */
export const getActiveLinkForCoach = internalQuery({
  args: {
    coachUserId: v.string(),
    organizationId: v.string(),
  },
  returns: v.union(
    v.object({
      code: v.string(),
      expiresAt: v.number(),
      voiceNoteIds: v.array(v.id("voiceNotes")),
      pendingMatchedCount: v.number(),
      pendingUnmatchedCount: v.number(),
      pendingInjuryCount: v.number(),
      pendingTodoCount: v.number(),
      pendingTeamNoteCount: v.number(),
      totalPendingCount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("whatsappReviewLinks")
      .withIndex("by_coachUserId_and_status", (q) =>
        q.eq("coachUserId", args.coachUserId).eq("status", "active")
      )
      .first();

    if (!link || link.expiresAt < Date.now()) {
      return null;
    }

    // Batch fetch all voice notes
    const voiceNotes = await Promise.all(
      link.voiceNoteIds.map((id) => ctx.db.get(id))
    );
    const validNotes = voiceNotes.filter(Boolean) as NonNullable<
      (typeof voiceNotes)[number]
    >[];

    const counts = countPendingInsights(validNotes);

    return {
      code: link.code,
      expiresAt: link.expiresAt,
      voiceNoteIds: link.voiceNoteIds,
      ...counts,
    };
  },
});

/**
 * Batch-apply all pending matched insights across all voice notes in a coach's active link.
 * Used by the WhatsApp "OK" quick-reply handler.
 * Returns count of applied items and remaining pending count.
 */
export const batchApplyMatchedFromWhatsApp = internalMutation({
  args: {
    coachUserId: v.string(),
    organizationId: v.string(),
  },
  returns: v.object({
    appliedCount: v.number(),
    remainingPendingCount: v.number(),
    reviewCode: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("whatsappReviewLinks")
      .withIndex("by_coachUserId_and_status", (q) =>
        q.eq("coachUserId", args.coachUserId).eq("status", "active")
      )
      .first();

    if (!link || link.expiresAt < Date.now()) {
      return { appliedCount: 0, remainingPendingCount: 0 };
    }

    const now = Date.now();
    let appliedCount = 0;
    let remainingPendingCount = 0;

    // Batch fetch all voice notes
    const voiceNotes = await Promise.all(
      link.voiceNoteIds.map((id) => ctx.db.get(id))
    );

    for (const note of voiceNotes) {
      if (!note) {
        continue;
      }

      let modified = false;
      const updatedInsights = note.insights.map((insight) => {
        if (insight.status !== "pending") {
          return insight;
        }

        // Only auto-apply matched insights (not injuries, unmatched, todos, team notes)
        const isMatched =
          insight.playerIdentityId &&
          insight.category !== "injury" &&
          insight.category !== "todo" &&
          insight.category !== "team_culture";

        if (isMatched) {
          appliedCount += 1;
          modified = true;
          return {
            ...insight,
            status: "applied" as const,
            appliedAt: now,
            appliedDate: new Date().toISOString(),
          };
        }

        remainingPendingCount += 1;
        return insight;
      });

      if (modified) {
        await ctx.db.patch(note._id, { insights: updatedInsights });
      }
    }

    return {
      appliedCount,
      remainingPendingCount,
      reviewCode: remainingPendingCount > 0 ? link.code : undefined,
    };
  },
});
