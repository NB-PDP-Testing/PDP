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
import { internalMutation, mutation, query } from "../_generated/server";

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
