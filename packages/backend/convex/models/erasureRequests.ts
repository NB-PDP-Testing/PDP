/**
 * Adult Erasure Requests — GDPR Article 17
 *
 * Handles adult players' right-to-erasure requests.
 * Unlike child erasure (childDataErasureRequests.ts), these are self-initiated
 * by the adult player and require per-category admin review.
 *
 * IMPORTANT: This table is the Article 5(2) accountability record.
 * It must NEVER be deleted by the retention cron or future erasure processing.
 */

import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { authComponent } from "../auth";
import { requireAuthAndOrg } from "../lib/authHelpers";

// ============================================================
// SHARED VALIDATORS
// ============================================================

const categoryDecisionValidator = v.object({
  category: v.string(),
  decision: v.union(v.literal("approved"), v.literal("rejected")),
  grounds: v.optional(v.string()),
  erasedAt: v.optional(v.number()),
});

const erasureRequestValidator = v.object({
  _id: v.id("erasureRequests"),
  _creationTime: v.number(),
  playerId: v.id("orgPlayerEnrollments"),
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  requestedByUserId: v.string(),
  submittedAt: v.number(),
  deadline: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("in_review"),
    v.literal("completed"),
    v.literal("rejected")
  ),
  playerGrounds: v.optional(v.string()),
  categoryDecisions: v.optional(v.array(categoryDecisionValidator)),
  adminUserId: v.optional(v.string()),
  processedAt: v.optional(v.number()),
  adminResponseNote: v.optional(v.string()),
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Get the most recent erasure request for the current user in an org.
 * Used by the player settings page to show current request status.
 */
export const getMyErasureRequestStatus = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.union(erasureRequestValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const playerIdentity = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();

    if (!playerIdentity) {
      return null;
    }

    const requests = await ctx.db
      .query("erasureRequests")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", playerIdentity._id)
      )
      .order("desc")
      .collect();

    return (
      requests.find((r) => r.organizationId === args.organizationId) ?? null
    );
  },
});

/**
 * List all erasure requests for an org, ordered by deadline (soonest first).
 * Used by the admin data rights dashboard.
 */
export const listErasureRequestsForOrg = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(erasureRequestValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("erasureRequests")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("asc")
      .collect();
  },
});

/**
 * List only pending/in_review erasure requests (soonest deadline first).
 * Used by admin to prioritise work.
 */
export const listPendingErasureRequests = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(erasureRequestValidator),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const pending = await ctx.db
      .query("erasureRequests")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    const inReview = await ctx.db
      .query("erasureRequests")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "in_review")
      )
      .collect();

    return [...pending, ...inReview].sort((a, b) => a.deadline - b.deadline);
  },
});

/**
 * Get a single erasure request by ID (public query).
 */
export const getErasureRequestById = query({
  args: {
    requestId: v.id("erasureRequests"),
  },
  returns: v.union(erasureRequestValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.requestId),
});

/**
 * Get a single erasure request by ID (internal — for use in actions).
 */
export const getErasureRequestByIdInternal = internalQuery({
  args: {
    requestId: v.id("erasureRequests"),
  },
  returns: v.union(erasureRequestValidator, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.requestId),
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Submit a new erasure request (player-initiated, adult only).
 * Looks up the player's enrollment in the org internally.
 * Returns error if an active request already exists for this player+org.
 */
export const submitErasureRequest = mutation({
  args: {
    organizationId: v.string(),
    playerGrounds: v.optional(v.string()),
  },
  returns: v.id("erasureRequests"),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Authentication required");
    }

    // Find the player identity for this user (adults have userId set)
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject ?? user._id;

    const playerIdentityRecord = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!playerIdentityRecord) {
      throw new Error(
        "No player profile linked to this account. Contact your club administrator."
      );
    }

    // Find the enrollment record for this player+org
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", playerIdentityRecord._id)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!enrollment) {
      throw new Error("Player is not enrolled in this organisation.");
    }

    // Check for existing active request
    const existingRequests = await ctx.db
      .query("erasureRequests")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", playerIdentityRecord._id)
      )
      .collect();

    const activeRequest = existingRequests.find(
      (r) =>
        r.organizationId === args.organizationId &&
        (r.status === "pending" || r.status === "in_review")
    );

    if (activeRequest) {
      throw new Error(
        "An active erasure request already exists for this player. Please wait for the current request to be processed."
      );
    }

    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000; // 2592000000 ms

    const requestId = await ctx.db.insert("erasureRequests", {
      playerId: enrollment._id,
      playerIdentityId: playerIdentityRecord._id,
      organizationId: args.organizationId,
      requestedByUserId: user._id,
      submittedAt: now,
      deadline: now + thirtyDaysMs,
      status: "pending",
      playerGrounds: args.playerGrounds,
    });

    return requestId;
  },
});

/**
 * Update the status of an erasure request (admin-initiated).
 * Called when admin sets status to 'in_review', 'completed', or 'rejected'.
 */
export const updateErasureRequestStatus = mutation({
  args: {
    requestId: v.id("erasureRequests"),
    organizationId: v.string(),
    status: v.union(
      v.literal("in_review"),
      v.literal("completed"),
      v.literal("rejected")
    ),
    adminUserId: v.string(),
    categoryDecisions: v.optional(v.array(categoryDecisionValidator)),
    adminResponseNote: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { role } = await requireAuthAndOrg(ctx, args.organizationId);
    if (role !== "admin" && role !== "owner") {
      throw new Error(
        "Only admins or owners can update erasure request status"
      );
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Erasure request not found");
    }

    await ctx.db.patch(args.requestId, {
      status: args.status,
      adminUserId: args.adminUserId,
      categoryDecisions: args.categoryDecisions ?? request.categoryDecisions,
      adminResponseNote: args.adminResponseNote ?? request.adminResponseNote,
      processedAt:
        args.status === "completed" || args.status === "rejected"
          ? Date.now()
          : request.processedAt,
    });

    return null;
  },
});

/**
 * Mark the erasure request as completed (called by the execution action).
 * Internal — not callable directly by admin UI (use updateErasureRequestStatus).
 */
export const completeErasureRequest = internalMutation({
  args: {
    requestId: v.id("erasureRequests"),
    processedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return null;
    }

    await ctx.db.patch(args.requestId, {
      status: "completed",
      processedAt: args.processedAt,
    });

    return null;
  },
});

/**
 * Mark a single data category as erased within an erasure request.
 * Called by the erasure execution action after processing each category.
 */
export const markCategoryErased = internalMutation({
  args: {
    requestId: v.id("erasureRequests"),
    category: v.string(),
    erasedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Erasure request not found");
    }

    const decisions = request.categoryDecisions ?? [];
    const updated = decisions.map((d) =>
      d.category === args.category ? { ...d, erasedAt: args.erasedAt } : d
    );

    await ctx.db.patch(args.requestId, {
      categoryDecisions: updated,
    });

    return null;
  },
});
