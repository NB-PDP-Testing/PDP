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

import type { Doc as BetterAuthDoc } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { v } from "convex/values";
// biome-ignore lint: Convex internal API import required for scheduler
import { components, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { findSimilarPlayersLogic } from "../lib/playerMatching";

// 48 hours in milliseconds
const LINK_EXPIRY_MS = 48 * 60 * 60 * 1000;

// Max voice note IDs per link before creating a new link
const MAX_VOICE_NOTES_PER_LINK = 50;

// Text correction patterns
const WHITESPACE_PATTERN = /\s+/;
const REGEX_SPECIAL_CHARS_PATTERN = /[.*+?^${}()|[\]\\]/g;

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
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(REGEX_SPECIAL_CHARS_PATTERN, "\\$&");
}

/**
 * Correct player name in text using pattern matching
 * Handles full names, first names, possessives, and case variations
 *
 * Ported from desktop voiceNotes.ts for consistency
 */
function correctPlayerNameInText(
  text: string,
  wrongName: string | undefined,
  correctFirstName: string,
  correctLastName: string
): { corrected: string; wasModified: boolean } {
  if (!(wrongName && text)) {
    return { corrected: text, wasModified: false };
  }

  const correctFullName = `${correctFirstName} ${correctLastName}`;
  let corrected = text;
  let wasModified = false;

  // Build variations of the wrong name to search for
  const wrongParts = wrongName.split(WHITESPACE_PATTERN);
  const wrongFirstName = wrongParts[0] || "";

  // Create search patterns (case insensitive)
  const patterns: Array<{ search: RegExp; replacement: string }> = [];

  // Full name patterns
  if (wrongName.length > 1) {
    // "Claudia Barlow" -> "Clodagh Barlow"
    patterns.push({
      search: new RegExp(escapeRegex(wrongName), "gi"),
      replacement: correctFullName,
    });
  }

  // First name only patterns (most common for voice transcription errors)
  if (wrongFirstName.length > 1) {
    // "Claudia's" -> "Clodagh's" (possessive)
    patterns.push({
      search: new RegExp(`${escapeRegex(wrongFirstName)}'s\\b`, "gi"),
      replacement: `${correctFirstName}'s`,
    });
    // "Claudia" -> "Clodagh" (standalone, word boundary)
    patterns.push({
      search: new RegExp(`\\b${escapeRegex(wrongFirstName)}\\b`, "gi"),
      replacement: correctFirstName,
    });
  }

  // Apply patterns in order (most specific first)
  for (const pattern of patterns) {
    if (pattern.search.test(corrected)) {
      corrected = corrected.replace(pattern.search, pattern.replacement);
      wasModified = true;
    }
  }

  return { corrected, wasModified };
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
      recentlyReviewed: v.array(
        v.object({
          insightId: v.string(),
          voiceNoteId: v.id("voiceNotes"),
          playerName: v.optional(v.string()),
          teamName: v.optional(v.string()),
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
      }))
      .sort(
        (a, b) =>
          new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
      );

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
      }))
      .sort(
        (a, b) =>
          new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
      );

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
      }))
      .sort(
        (a, b) =>
          new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
      );

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
      }))
      .sort(
        (a, b) =>
          new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
      );

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
      }))
      .sort(
        (a, b) =>
          new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
      );

    const autoApplied = allInsights
      .filter((i) => i.status === "auto_applied")
      .map((i) => ({
        insightId: i.id,
        voiceNoteId: i.voiceNoteId,
        playerName: i.playerName,
        title: i.title,
        description: i.description,
        category: i.category,
        status: i.status,
        noteDate: i.noteDate,
      }))
      .sort(
        (a, b) =>
          new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
      );

    // Manually reviewed items (applied or dismissed by the coach)
    const recentlyReviewed = allInsights
      .filter(
        (i) =>
          (i.status === "applied" || i.status === "dismissed") &&
          !i.clearedFromReview
      )
      .map((i) => ({
        insightId: i.id,
        voiceNoteId: i.voiceNoteId,
        playerName: i.playerName,
        teamName: i.teamName,
        title: i.title,
        description: i.description,
        category: i.category,
        status: i.status,
        noteDate: i.noteDate,
      }))
      .sort(
        (a, b) =>
          new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
      );

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
      recentlyReviewed,
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

    const { link, note } = scope;
    const updatedInsights = note.insights.map((ins) => {
      if (ins.id === args.insightId) {
        return {
          ...ins,
          title: args.title ?? ins.title,
          description: args.description ?? ins.description,
          category: args.category ?? ins.category,
        };
      }
      return ins;
    });

    await ctx.db.patch(note._id, { insights: updatedInsights });

    // Log analytics event
    const insight = note.insights.find((i) => i.id === args.insightId);
    await ctx.scheduler.runAfter(
      0,
      internal.models.reviewAnalytics.logReviewEvent,
      {
        linkCode: args.code,
        coachUserId: link.coachUserId,
        organizationId: link.organizationId,
        eventType: "edit",
        insightId: args.insightId,
        voiceNoteId: args.voiceNoteId,
        category: insight?.category,
        confidenceScore: insight?.confidence,
      }
    );

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

    // Log analytics event
    await ctx.scheduler.runAfter(
      0,
      internal.models.reviewAnalytics.logReviewEvent,
      {
        linkCode: args.code,
        coachUserId: scope.link.coachUserId,
        organizationId: scope.link.organizationId,
        eventType: "apply",
        insightId: args.insightId,
        voiceNoteId: args.voiceNoteId,
        category: insight.category,
        confidenceScore: insight.confidence,
      }
    );

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

    // Log analytics event
    await ctx.scheduler.runAfter(
      0,
      internal.models.reviewAnalytics.logReviewEvent,
      {
        linkCode: args.code,
        coachUserId: scope.link.coachUserId,
        organizationId: scope.link.organizationId,
        eventType: "dismiss",
        insightId: args.insightId,
        voiceNoteId: args.voiceNoteId,
        category: insight.category,
        confidenceScore: insight.confidence,
      }
    );

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
      const noteKey = String(item.voiceNoteId);
      const existing = byNote.get(noteKey) || [];
      existing.push(item.insightId);
      byNote.set(noteKey, existing);
    }

    // Batch fetch all notes at once, then process
    const noteIds = [...byNote.keys()];
    const notes = await Promise.all(
      link.voiceNoteIds
        .filter((id) => noteIds.includes(String(id)))
        .map((id) => ctx.db.get(id))
    );
    const noteMap = new Map(
      notes
        .filter((n): n is NonNullable<typeof n> => n !== null)
        .map((n) => [String(n._id), n])
    );

    const now = Date.now();
    for (const [noteId, insightIds] of byNote) {
      const note = noteMap.get(noteId);
      if (!note) {
        failCount += insightIds.length;
        continue;
      }

      const pendingIds = new Set(
        note.insights
          .filter((i) => insightIds.includes(i.id) && i.status === "pending")
          .map((i) => i.id)
      );

      if (pendingIds.size === 0) {
        failCount += insightIds.length;
        continue;
      }

      const updatedInsights = note.insights.map((i) => {
        if (pendingIds.has(i.id)) {
          return {
            ...i,
            status: "applied" as const,
            appliedAt: now,
            appliedDate: new Date().toISOString(),
          };
        }
        return i;
      });

      successCount += pendingIds.size;
      failCount += insightIds.length - pendingIds.size;
      await ctx.db.patch(note._id, { insights: updatedInsights });
    }

    // Log batch analytics event
    if (successCount > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.models.reviewAnalytics.logReviewEvent,
        {
          linkCode: args.code,
          coachUserId: link.coachUserId,
          organizationId: link.organizationId,
          eventType: "batch_apply",
          metadata: { count: successCount },
        }
      );
    }

    return { successCount, failCount };
  },
});

/**
 * Batch dismiss insights from review microsite (US-RMS-003).
 * Dismisses multiple insights at once with optimistic UI support.
 */
export const batchDismissInsightsFromReview = mutation({
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
      const noteKey = String(item.voiceNoteId);
      const existing = byNote.get(noteKey) || [];
      existing.push(item.insightId);
      byNote.set(noteKey, existing);
    }

    // Batch fetch all notes at once, then process
    const noteIds = [...byNote.keys()];
    const notes = await Promise.all(
      link.voiceNoteIds
        .filter((id) => noteIds.includes(String(id)))
        .map((id) => ctx.db.get(id))
    );
    const noteMap = new Map(
      notes
        .filter((n): n is NonNullable<typeof n> => n !== null)
        .map((n) => [String(n._id), n])
    );

    const now = Date.now();
    for (const [noteId, insightIds] of byNote) {
      const note = noteMap.get(noteId);
      if (!note) {
        failCount += insightIds.length;
        continue;
      }

      const pendingIds = new Set(
        note.insights
          .filter((i) => insightIds.includes(i.id) && i.status === "pending")
          .map((i) => i.id)
      );

      if (pendingIds.size === 0) {
        failCount += insightIds.length;
        continue;
      }

      const updatedInsights = note.insights.map((i) => {
        if (pendingIds.has(i.id)) {
          return {
            ...i,
            status: "dismissed" as const,
            dismissedAt: now,
            dismissedDate: new Date().toISOString(),
          };
        }
        return i;
      });

      successCount += pendingIds.size;
      failCount += insightIds.length - pendingIds.size;
      await ctx.db.patch(note._id, { insights: updatedInsights });
    }

    // Log batch analytics event
    if (successCount > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.models.reviewAnalytics.logReviewEvent,
        {
          linkCode: args.code,
          coachUserId: link.coachUserId,
          organizationId: link.organizationId,
          eventType: "batch_dismiss",
          metadata: { count: successCount },
        }
      );
    }

    return { successCount, failCount };
  },
});

/**
 * Batch clear reviewed insights from the review microsite (Bug #479).
 * Sets clearedFromReview: true on already-reviewed insights so they
 * no longer appear in the "Recently Reviewed" section. Does NOT change
 * the insight status — all applied data remains intact.
 */
export const batchClearReviewedInsights = mutation({
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
      const noteKey = String(item.voiceNoteId);
      const existing = byNote.get(noteKey) || [];
      existing.push(item.insightId);
      byNote.set(noteKey, existing);
    }

    // Batch fetch all notes at once
    const noteIds = [...byNote.keys()];
    const notes = await Promise.all(
      link.voiceNoteIds
        .filter((id) => noteIds.includes(String(id)))
        .map((id) => ctx.db.get(id))
    );
    const noteMap = new Map(
      notes
        .filter((n): n is NonNullable<typeof n> => n !== null)
        .map((n) => [String(n._id), n])
    );

    for (const [noteId, insightIds] of byNote) {
      const note = noteMap.get(noteId);
      if (!note) {
        failCount += insightIds.length;
        continue;
      }

      const reviewedIds = new Set(
        note.insights
          .filter(
            (i) =>
              insightIds.includes(i.id) &&
              (i.status === "applied" || i.status === "dismissed")
          )
          .map((i) => i.id)
      );

      if (reviewedIds.size === 0) {
        failCount += insightIds.length;
        continue;
      }

      const updatedInsights = note.insights.map((i) => {
        if (reviewedIds.has(i.id)) {
          return { ...i, clearedFromReview: true };
        }
        return i;
      });

      successCount += reviewedIds.size;
      failCount += insightIds.length - reviewedIds.size;
      await ctx.db.patch(note._id, { insights: updatedInsights });
    }

    if (successCount > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.models.reviewAnalytics.logReviewEvent,
        {
          linkCode: args.code,
          coachUserId: link.coachUserId,
          organizationId: link.organizationId,
          eventType: "batch_clear",
          metadata: { count: successCount },
        }
      );
    }

    return { successCount, failCount };
  },
});

// ============================================================
// PUBLIC MUTATIONS — Domain actions from review (US-VN-009)
// ============================================================

/**
 * Create a coach task from a todo insight in the review microsite.
 * Inserts into coachTasks table and marks insight as applied.
 */
export const addTodoFromReview = mutation({
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

    const { link, note } = scope;
    const insight = note.insights.find((i) => i.id === args.insightId);
    if (!insight) {
      return { success: false as const, reason: "insight_not_found" };
    }
    if (insight.status !== "pending") {
      return { success: false as const, reason: "already_actioned" };
    }

    const now = Date.now();

    // Create coachTask record
    await ctx.db.insert("coachTasks", {
      text: insight.description
        ? `${insight.title} — ${insight.description}`
        : insight.title,
      completed: false,
      organizationId: link.organizationId,
      assignedToUserId: link.coachUserId,
      createdByUserId: link.coachUserId,
      source: "voice_note",
      voiceNoteId: args.voiceNoteId,
      insightId: args.insightId,
      playerName: insight.playerName,
      createdAt: now,
    });

    // Mark insight as applied
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
      message: `Task created: ${insight.title}`,
    };
  },
});

/**
 * Save a team observation from a team note insight in the review microsite.
 * Inserts into teamObservations table and marks insight as applied.
 */
export const saveTeamNoteFromReview = mutation({
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

    const { link, note } = scope;
    const insight = note.insights.find((i) => i.id === args.insightId);
    if (!insight) {
      return { success: false as const, reason: "insight_not_found" };
    }
    if (insight.status !== "pending") {
      return { success: false as const, reason: "already_actioned" };
    }

    const now = Date.now();
    const dateStr = new Date(note._creationTime).toISOString().split("T")[0];

    // Create teamObservation record
    await ctx.db.insert("teamObservations", {
      organizationId: link.organizationId,
      teamId: "unspecified",
      teamName: insight.teamName ?? "Team",
      source: "voice_note",
      coachId: link.coachUserId,
      coachName: "Coach",
      title: insight.title,
      description: insight.description,
      dateObserved: dateStr,
      createdAt: now,
    });

    // Mark insight as applied
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
      message: `Team note saved: ${insight.title}`,
    };
  },
});

/**
 * Batch create coach tasks from todo insights in the review microsite.
 */
export const batchAddTodosFromReview = mutation({
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

    // Group by voiceNoteId
    const byNote = new Map<string, string[]>();
    for (const item of args.items) {
      if (!link.voiceNoteIds.includes(item.voiceNoteId)) {
        failCount += 1;
        continue;
      }
      const noteKey = String(item.voiceNoteId);
      const existing = byNote.get(noteKey) || [];
      existing.push(item.insightId);
      byNote.set(noteKey, existing);
    }

    // Batch fetch all notes
    const noteIds = [...byNote.keys()];
    const notes = await Promise.all(
      link.voiceNoteIds
        .filter((id) => noteIds.includes(String(id)))
        .map((id) => ctx.db.get(id))
    );
    const noteMap = new Map(
      notes
        .filter((n): n is NonNullable<typeof n> => n !== null)
        .map((n) => [String(n._id), n])
    );

    const now = Date.now();
    for (const [noteId, insightIds] of byNote) {
      const note = noteMap.get(noteId);
      if (!note) {
        failCount += insightIds.length;
        continue;
      }

      const pendingInsights = note.insights.filter(
        (i) => insightIds.includes(i.id) && i.status === "pending"
      );
      if (pendingInsights.length === 0) {
        failCount += insightIds.length;
        continue;
      }

      // Create coachTask for each pending insight
      for (const insight of pendingInsights) {
        await ctx.db.insert("coachTasks", {
          text: insight.description
            ? `${insight.title} — ${insight.description}`
            : insight.title,
          completed: false,
          organizationId: link.organizationId,
          assignedToUserId: link.coachUserId,
          createdByUserId: link.coachUserId,
          source: "voice_note",
          voiceNoteId: note._id,
          insightId: insight.id,
          playerName: insight.playerName,
          createdAt: now,
        });
      }

      // Mark insights as applied
      const pendingIdSet = new Set(pendingInsights.map((i) => i.id));
      const updatedInsights = note.insights.map((i) => {
        if (pendingIdSet.has(i.id)) {
          return {
            ...i,
            status: "applied" as const,
            appliedAt: now,
            appliedDate: new Date().toISOString(),
          };
        }
        return i;
      });

      successCount += pendingInsights.length;
      failCount += insightIds.length - pendingInsights.length;
      await ctx.db.patch(note._id, { insights: updatedInsights });
    }

    return { successCount, failCount };
  },
});

/**
 * Batch save team observations from team note insights in the review microsite.
 */
export const batchSaveTeamNotesFromReview = mutation({
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

    // Group by voiceNoteId
    const byNote = new Map<string, string[]>();
    for (const item of args.items) {
      if (!link.voiceNoteIds.includes(item.voiceNoteId)) {
        failCount += 1;
        continue;
      }
      const noteKey = String(item.voiceNoteId);
      const existing = byNote.get(noteKey) || [];
      existing.push(item.insightId);
      byNote.set(noteKey, existing);
    }

    // Batch fetch all notes
    const noteIds = [...byNote.keys()];
    const notes = await Promise.all(
      link.voiceNoteIds
        .filter((id) => noteIds.includes(String(id)))
        .map((id) => ctx.db.get(id))
    );
    const noteMap = new Map(
      notes
        .filter((n): n is NonNullable<typeof n> => n !== null)
        .map((n) => [String(n._id), n])
    );

    const now = Date.now();
    for (const [noteId, insightIds] of byNote) {
      const note = noteMap.get(noteId);
      if (!note) {
        failCount += insightIds.length;
        continue;
      }

      const pendingInsights = note.insights.filter(
        (i) => insightIds.includes(i.id) && i.status === "pending"
      );
      if (pendingInsights.length === 0) {
        failCount += insightIds.length;
        continue;
      }

      const dateStr = new Date(note._creationTime).toISOString().split("T")[0];

      // Create teamObservation for each pending insight
      for (const insight of pendingInsights) {
        await ctx.db.insert("teamObservations", {
          organizationId: link.organizationId,
          teamId: "unspecified",
          teamName: insight.teamName ?? "Team",
          source: "voice_note",
          coachId: link.coachUserId,
          coachName: "Coach",
          title: insight.title,
          description: insight.description,
          dateObserved: dateStr,
          createdAt: now,
        });
      }

      // Mark insights as applied
      const pendingIdSet = new Set(pendingInsights.map((i) => i.id));
      const updatedInsights = note.insights.map((i) => {
        if (pendingIdSet.has(i.id)) {
          return {
            ...i,
            status: "applied" as const,
            appliedAt: now,
            appliedDate: new Date().toISOString(),
          };
        }
        return i;
      });

      successCount += pendingInsights.length;
      failCount += insightIds.length - pendingInsights.length;
      await ctx.db.patch(note._id, { insights: updatedInsights });
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

    const suggestions = await findSimilarPlayersLogic(ctx, {
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
// PUBLIC MUTATIONS — Snooze & Remind Later (US-VN-012c)
// ============================================================

const MAX_SNOOZE_COUNT = 3;
const MAX_SNOOZE_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours max
const MIN_SNOOZE_DELAY_MS = 60 * 1000; // 1 minute min

/**
 * Shared snooze logic used by both public and internal mutations.
 */
async function performSnooze(
  // biome-ignore lint/suspicious/noExplicitAny: Generic Convex mutation context
  ctx: any,
  link: Doc<"whatsappReviewLinks">,
  code: string,
  delayMs: number
): Promise<
  { success: true; snoozeCount: number } | { success: false; reason: string }
> {
  if (delayMs < MIN_SNOOZE_DELAY_MS || delayMs > MAX_SNOOZE_DELAY_MS) {
    return { success: false, reason: "invalid_delay" };
  }

  const currentSnoozeCount = link.snoozeCount ?? 0;
  if (currentSnoozeCount >= MAX_SNOOZE_COUNT) {
    return { success: false, reason: "max_snoozes_reached" };
  }

  const newSnoozeCount = currentSnoozeCount + 1;
  await ctx.db.patch(link._id, {
    snoozeRemindAt: Date.now() + delayMs,
    snoozeCount: newSnoozeCount,
  });

  // Log analytics event
  await ctx.scheduler.runAfter(
    0,
    internal.models.reviewAnalytics.logReviewEvent,
    {
      linkCode: code,
      coachUserId: link.coachUserId,
      organizationId: link.organizationId,
      eventType: "snooze",
      metadata: { delayMs, snoozeCount: newSnoozeCount },
    }
  );

  return { success: true, snoozeCount: newSnoozeCount };
}

/**
 * Snooze the review link — defer review with a timed WhatsApp reminder.
 * Code-authenticated (no session needed). Used by the /r/ microsite UI.
 */
export const snoozeReviewLink = mutation({
  args: {
    code: v.string(),
    delayMs: v.number(),
  },
  returns: v.union(
    v.object({ success: v.literal(true), snoozeCount: v.number() }),
    v.object({ success: v.literal(false), reason: v.string() })
  ),
  handler: async (ctx, args) => {
    const result = await validateReviewCode(ctx, args.code);
    if (!result) {
      return { success: false as const, reason: "invalid_code" };
    }
    if (result.isExpired) {
      return { success: false as const, reason: "expired" };
    }

    return performSnooze(ctx, result.link, args.code, args.delayMs);
  },
});

/**
 * Internal snooze mutation for server-to-server calls (e.g. WhatsApp command handler).
 * Bypasses public mutation boundary — code is validated internally.
 */
export const snoozeReviewLinkInternal = internalMutation({
  args: {
    code: v.string(),
    delayMs: v.number(),
  },
  returns: v.union(
    v.object({ success: v.literal(true), snoozeCount: v.number() }),
    v.object({ success: v.literal(false), reason: v.string() })
  ),
  handler: async (ctx, args) => {
    const result = await validateReviewCode(ctx, args.code);
    if (!result) {
      return { success: false as const, reason: "invalid_code" };
    }
    if (result.isExpired) {
      return { success: false as const, reason: "expired" };
    }

    return performSnooze(ctx, result.link, args.code, args.delayMs);
  },
});

/**
 * Get snooze info for a review link (for displaying in SnoozeBar UI).
 */
export const getSnoozeInfo = query({
  args: { code: v.string() },
  returns: v.union(
    v.object({
      snoozeCount: v.number(),
      maxSnoozes: v.number(),
      snoozeRemindAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const result = await validateReviewCode(ctx, args.code);
    if (!result || result.isExpired) {
      return null;
    }
    return {
      snoozeCount: result.link.snoozeCount ?? 0,
      maxSnoozes: MAX_SNOOZE_COUNT,
      snoozeRemindAt: result.link.snoozeRemindAt,
    };
  },
});

/**
 * Process snoozed review reminders.
 * Called by cron every 15 minutes.
 * Sends WhatsApp reminders for links whose snoozeRemindAt has passed.
 *
 * TODO(perf): Serial patches per link. Volume is low (only active links with
 * pending snoozeRemindAt), but if scale grows consider a composite index
 * by_status_and_snoozeRemindAt to avoid full table scan + JS filter.
 */
export const processSnoozedReminders = internalMutation({
  args: {},
  returns: v.object({ remindedCount: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    let remindedCount = 0;

    // Query active links that have a snooze reminder due
    const activeLinks = await ctx.db
      .query("whatsappReviewLinks")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    for (const link of activeLinks) {
      if (link.snoozeRemindAt && link.snoozeRemindAt <= now) {
        // Clear the snooze reminder
        await ctx.db.patch(link._id, { snoozeRemindAt: undefined });

        // Schedule WhatsApp reminder via the action
        await ctx.scheduler.runAfter(
          0,
          internal.actions.whatsapp.sendSnoozeReminder,
          {
            coachUserId: link.coachUserId,
            organizationId: link.organizationId,
            linkCode: link.code,
          }
        );

        remindedCount += 1;
      }
    }

    return { remindedCount };
  },
});

// ============================================================
// INTERNAL MUTATIONS — Link expiry & cleanup crons (US-VN-012)
// ============================================================

// 7 days past expiry before cleanup (deletion)
const CLEANUP_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Expire active links that have passed their expiresAt time.
 * Called by cron at 2:30 AM UTC daily.
 * Updates status from "active" → "expired".
 */
export const expireActiveLinks = internalMutation({
  args: {},
  returns: v.object({ expiredCount: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    let expiredCount = 0;

    // Query only active links via status index
    const activeLinks = await ctx.db
      .query("whatsappReviewLinks")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    for (const link of activeLinks) {
      if (link.expiresAt < now) {
        await ctx.db.patch(link._id, { status: "expired" });
        expiredCount += 1;
      }
    }

    return { expiredCount };
  },
});

/**
 * Delete expired links older than 7 days past expiry.
 * Called by cron at 3:15 AM UTC daily.
 * Permanent deletion of stale data.
 */
export const cleanupExpiredLinks = internalMutation({
  args: {},
  returns: v.object({ deletedCount: v.number() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - CLEANUP_GRACE_PERIOD_MS;
    let deletedCount = 0;

    // Query only expired links via status index
    const expiredLinks = await ctx.db
      .query("whatsappReviewLinks")
      .withIndex("by_status", (q) => q.eq("status", "expired"))
      .collect();

    for (const link of expiredLinks) {
      if (link.expiresAt < cutoff) {
        await ctx.db.delete(link._id);
        deletedCount += 1;
      }
    }

    return { deletedCount };
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

// ============================================================
// PUBLIC QUERIES — Entity Assignment (US-RMS-002)
// ============================================================

/**
 * Get coach's teams for entity reassignment in review microsite.
 * Returns teams the coach is assigned to for team selection dropdown.
 */
export const getCoachTeamsForReview = query({
  args: { code: v.string() },
  returns: v.union(
    v.array(
      v.object({
        teamId: v.string(),
        teamName: v.string(),
        sport: v.optional(v.string()),
        ageGroup: v.optional(v.string()),
      })
    ),
    v.null()
  ),
  handler: async (ctx, args) => {
    const result = await validateReviewCode(ctx, args.code);
    if (!result || result.isExpired) {
      return null;
    }

    const { link } = result;

    // Get coach's team assignments
    const assignment = await ctx.db
      .query("coachAssignments")
      .withIndex("by_user_and_org", (q) =>
        q
          .eq("userId", link.coachUserId)
          .eq("organizationId", link.organizationId)
      )
      .first();

    if (!assignment || assignment.teams.length === 0) {
      return [];
    }

    // Fetch all teams for this organization using Better Auth adapter
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
            value: link.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    const allTeams = allTeamsResult.page as BetterAuthDoc<"team">[];

    // Create lookup map by team ID
    const teamByIdMap = new Map(
      allTeams.map((team) => [String(team._id), team])
    );

    // Map assignment teams to team details
    const teams = assignment.teams
      .map((teamId) => {
        const team = teamByIdMap.get(teamId);
        if (!team) {
          return null;
        }
        return {
          teamId: String(team._id),
          teamName: team.name,
          sport: team.sport ?? undefined,
          ageGroup: team.ageGroup ?? undefined,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

    return teams;
  },
});

/**
 * Get coaches in the organization for todo assignment
 * Returns list of coaches who share at least one team with the current coach
 * Fetches from Better Auth members with "Coach" functional role
 */
export const getCoachesForReview = query({
  args: { code: v.string() },
  returns: v.union(
    v.array(
      v.object({
        userId: v.string(),
        name: v.string(),
        email: v.optional(v.string()),
      })
    ),
    v.null()
  ),
  handler: async (ctx, args) => {
    const result = await validateReviewCode(ctx, args.code);
    if (!result || result.isExpired) {
      return null;
    }

    const { link } = result;

    // Get current coach's team assignments
    const currentCoachAssignment = await ctx.db
      .query("coachAssignments")
      .withIndex("by_user_and_org", (q) =>
        q
          .eq("userId", link.coachUserId)
          .eq("organizationId", link.organizationId)
      )
      .first();

    if (!currentCoachAssignment || currentCoachAssignment.teams.length === 0) {
      // Current coach has no team assignments, return empty list
      return [];
    }

    const currentCoachTeams = new Set(currentCoachAssignment.teams);

    // Get all coach assignments in this organization
    const allCoachAssignments = await ctx.db
      .query("coachAssignments")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", link.organizationId)
      )
      .collect();

    // Filter to coaches who share at least one team with current coach
    const coachesWithSharedTeams = allCoachAssignments.filter((assignment) => {
      // Don't include the current coach
      if (assignment.userId === link.coachUserId) {
        return false;
      }
      // Check if they share any teams
      return assignment.teams.some((teamId) => currentCoachTeams.has(teamId));
    });

    if (coachesWithSharedTeams.length === 0) {
      return [];
    }

    // Get unique user IDs
    const uniqueUserIds = [
      ...new Set(coachesWithSharedTeams.map((a) => a.userId)),
    ];

    // Fetch user details from Better Auth
    const usersResult = await Promise.all(
      uniqueUserIds.map((userId) =>
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "_id", value: userId, operator: "eq" }],
        })
      )
    );

    // Map to coach list with names
    const coaches = usersResult
      .map((userResult) => {
        const user = userResult?.data as BetterAuthDoc<"user"> | undefined;
        if (!user) {
          return null;
        }
        return {
          userId: String(user._id),
          name: user.name || user.email || "Unknown",
          email: user.email ?? undefined,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    // Sort by name
    coaches.sort((a, b) => a.name.localeCompare(b.name));

    return coaches;
  },
});

// ============================================================
// PUBLIC MUTATIONS — Entity Reassignment (US-RMS-002)
// ============================================================

/**
 * Reassign insight entity type (player/team/todo) from the review microsite.
 * Allows coaches to fix AI miscategorizations or reassign to different entities.
 */
export const reassignInsightEntity = mutation({
  args: {
    code: v.string(),
    voiceNoteId: v.id("voiceNotes"),
    insightId: v.string(),
    entityType: v.union(
      v.literal("player"),
      v.literal("team"),
      v.literal("todo"),
      v.literal("uncategorized")
    ),
    playerIdentityId: v.optional(v.id("playerIdentities")),
    teamId: v.optional(v.string()),
    assigneeUserId: v.optional(v.string()),
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

    const { link, note } = scope;
    const insight = note.insights.find((i) => i.id === args.insightId);
    if (!insight) {
      return { success: false as const, reason: "insight_not_found" };
    }

    // Validate entity-specific requirements and fetch entity details
    let newPlayerName: string | undefined;
    let newPlayerFirstName: string | undefined;
    let newPlayerLastName: string | undefined;

    if (args.entityType === "player") {
      if (!args.playerIdentityId) {
        return { success: false as const, reason: "player_id_required" };
      }
      // Verify player exists and get name
      const player = await ctx.db.get(args.playerIdentityId);
      if (!player) {
        return { success: false as const, reason: "player_not_found" };
      }
      newPlayerName = `${player.firstName} ${player.lastName}`;
      newPlayerFirstName = player.firstName;
      newPlayerLastName = player.lastName;
    }

    if (args.entityType === "team") {
      if (!args.teamId) {
        return { success: false as const, reason: "team_id_required" };
      }
      // Verify team exists
      const team = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "team",
        where: [
          {
            field: "id",
            value: args.teamId,
            operator: "eq",
          },
        ],
      });
      if (!team) {
        return { success: false as const, reason: "team_not_found" };
      }
    }

    if (args.entityType === "todo" && !args.assigneeUserId) {
      return { success: false as const, reason: "assignee_required" };
    }

    // Update insight with new entity assignment and text correction
    const updatedInsights = note.insights.map((i) => {
      if (i.id === args.insightId) {
        // Base update: clear all entity-specific fields
        const updated: any = {
          ...i,
          playerIdentityId: undefined,
          playerName: undefined,
          teamId: undefined,
          teamName: undefined,
          assigneeUserId: undefined,
          assigneeName: undefined,
        };

        // Set entity-specific fields based on type
        if (
          args.entityType === "player" &&
          args.playerIdentityId &&
          newPlayerName
        ) {
          updated.playerIdentityId = args.playerIdentityId;
          updated.playerName = newPlayerName;

          // TEXT CORRECTION: Automatically fix player name in title and description
          if (newPlayerFirstName && newPlayerLastName) {
            const oldPlayerName = i.playerName; // Original AI-detected name

            // Correct title
            if (i.title) {
              const titleCorrection = correctPlayerNameInText(
                i.title,
                oldPlayerName,
                newPlayerFirstName,
                newPlayerLastName
              );
              if (titleCorrection.wasModified) {
                updated.title = titleCorrection.corrected;
              }
            }

            // Correct description
            if (i.description) {
              const descCorrection = correctPlayerNameInText(
                i.description,
                oldPlayerName,
                newPlayerFirstName,
                newPlayerLastName
              );
              if (descCorrection.wasModified) {
                updated.description = descCorrection.corrected;
              }
            }
          }
        } else if (args.entityType === "team" && args.teamId) {
          updated.teamId = args.teamId;
          updated.category = "team_culture";
        } else if (args.entityType === "todo" && args.assigneeUserId) {
          updated.assigneeUserId = args.assigneeUserId;
          updated.category = "todo";
        } else if (args.entityType === "uncategorized") {
          updated.category = undefined;
        }

        // Override category if explicitly provided
        if (args.category) {
          updated.category = args.category;
        }

        return updated;
      }
      return i;
    });

    await ctx.db.patch(note._id, { insights: updatedInsights });

    // Log analytics event
    await ctx.scheduler.runAfter(
      0,
      internal.models.reviewAnalytics.logReviewEvent,
      {
        linkCode: args.code,
        coachUserId: link.coachUserId,
        organizationId: link.organizationId,
        eventType: "reassign_entity",
        insightId: args.insightId,
        voiceNoteId: args.voiceNoteId,
        metadata: {
          fromType: insight.playerIdentityId
            ? "player"
            : insight.teamId
              ? "team"
              : insight.assigneeUserId
                ? "todo"
                : "uncategorized",
          toType: args.entityType,
        },
      }
    );

    return { success: true as const };
  },
});
