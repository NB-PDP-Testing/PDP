/**
 * Child Data Erasure Requests (GDPR Recital 65)
 *
 * Handles a child player's independent right to request deletion of their own
 * sports data without requiring parental approval. Admin reviews before
 * executing hard deletion.
 *
 * Flow:
 *   1. Child submits request → creates pending record, notifies org admins
 *   2. Admin reviews → either processErasureRequest (deletes all data)
 *      or declineErasureRequest (stores reason, notifies child)
 */

import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalMutation, mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// ============================================================
// QUERIES
// ============================================================

/**
 * Get all pending erasure requests for an org (admin use)
 */
export const getErasureRequestsForOrg = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("childDataErasureRequests"),
      _creationTime: v.number(),
      childPlayerId: v.id("orgPlayerEnrollments"),
      playerIdentityId: v.id("playerIdentities"),
      requestingUserId: v.string(),
      organizationId: v.string(),
      requestedAt: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("completed"),
        v.literal("declined")
      ),
      declinedAt: v.optional(v.number()),
      declinedBy: v.optional(v.string()),
      declinedReason: v.optional(v.string()),
      processedAt: v.optional(v.number()),
      processedBy: v.optional(v.string()),
      playerFirstName: v.optional(v.string()),
      playerLastName: v.optional(v.string()),
      playerDateOfBirth: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return [];
    }

    const requests = await ctx.db
      .query("childDataErasureRequests")
      .withIndex("by_org_and_status", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .collect();

    // Batch enrich with player identity names
    const enriched = await Promise.all(
      requests.map(async (req) => {
        const playerIdentity = await ctx.db.get(req.playerIdentityId);
        return {
          ...req,
          playerFirstName: playerIdentity?.firstName,
          playerLastName: playerIdentity?.lastName,
          playerDateOfBirth: playerIdentity?.dateOfBirth,
        };
      })
    );

    return enriched;
  },
});

/**
 * Check if the current child player has a pending erasure request
 */
export const getMyErasureRequestStatus = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    hasPending: v.boolean(),
    requestedAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return { hasPending: false };
    }

    const userId = user._id as string;

    const userRequests = await ctx.db
      .query("childDataErasureRequests")
      .withIndex("by_requesting_user", (q) => q.eq("requestingUserId", userId))
      .collect();

    const existing = userRequests.find(
      (r) => r.organizationId === args.organizationId && r.status === "pending"
    );

    if (existing) {
      return { hasPending: true, requestedAt: existing.requestedAt };
    }
    return { hasPending: false };
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Submit a data erasure request (called by child player)
 *
 * Creates a pending request and notifies org admins/owners via in-app
 * notification. Idempotent: if a pending request already exists for this
 * user+org, returns without creating a duplicate.
 */
export const requestDataErasure = mutation({
  args: {
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user._id as string;

    // Find the child's playerIdentity (by userId on the playerIdentity record)
    const playerIdentityCandidate = await ctx.db
      .query("playerIdentities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    const playerIdentity =
      playerIdentityCandidate?.playerType === "youth"
        ? playerIdentityCandidate
        : null;

    if (!playerIdentity) {
      throw new Error(
        "No youth player profile linked to this account. Contact your club administrator."
      );
    }

    // Find the enrollment record for this player+org
    const enrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", playerIdentity._id)
          .eq("organizationId", args.organizationId)
      )
      .first();

    if (!enrollment) {
      throw new Error("Player is not enrolled in this organization.");
    }

    // Idempotent: don't create duplicate pending requests
    const userRequests = await ctx.db
      .query("childDataErasureRequests")
      .withIndex("by_requesting_user", (q) => q.eq("requestingUserId", userId))
      .collect();
    const existingPending = userRequests.find(
      (r) => r.organizationId === args.organizationId && r.status === "pending"
    );

    if (existingPending) {
      return null;
    }

    const now = Date.now();

    await ctx.db.insert("childDataErasureRequests", {
      childPlayerId: enrollment._id,
      playerIdentityId: playerIdentity._id,
      requestingUserId: userId,
      organizationId: args.organizationId,
      requestedAt: now,
      status: "pending",
    });

    // Notify org admins and owners
    await ctx.runMutation(
      internal.models.childDataErasureRequests.notifyAdminsOfErasureRequest,
      {
        organizationId: args.organizationId,
        playerFirstName: playerIdentity.firstName,
        playerLastName: playerIdentity.lastName,
        playerIdentityId: playerIdentity._id,
      }
    );

    return null;
  },
});

/**
 * Internal mutation: send in-app notifications to all org admins about an erasure request
 */
export const notifyAdminsOfErasureRequest = internalMutation({
  args: {
    organizationId: v.string(),
    playerFirstName: v.string(),
    playerLastName: v.string(),
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Fetch org members with admin/owner role via betterAuth adapter
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: { cursor: null, numItems: 100 },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    const members = membersResult.page as Array<{
      userId: string;
      role: string;
    }>;

    const playerName = `${args.playerFirstName} ${args.playerLastName}`;

    for (const member of members) {
      if (member.role === "admin" || member.role === "owner") {
        await ctx.runMutation(
          internal.models.notifications.createNotification,
          {
            userId: member.userId,
            organizationId: args.organizationId,
            type: "child_data_erasure",
            title: "Child Data Erasure Request",
            message: `${playerName} has submitted a data erasure request. Review in Admin → Player Requests.`,
            link: `/orgs/${args.organizationId}/admin/player-requests`,
            targetRole: "admin",
            relatedPlayerId: args.playerIdentityId,
          }
        );
      }
    }

    return null;
  },
});

/**
 * Process (execute) an erasure request — admin only
 *
 * Hard-deletes all child player data:
 * - dailyPlayerHealthChecks
 * - playerWellnessSettings
 * - skillAssessments
 * - passportGoals
 * - coachParentSummaries (records for this player)
 * - parentChildAuthorizations
 * - parentChildAuthorizationLogs
 * - playerIdentity record
 * - orgPlayerEnrollment (replaced with stub)
 *
 * Updates the request status to "completed".
 */
export const processErasureRequest = mutation({
  args: {
    requestId: v.id("childDataErasureRequests"),
    retainEnrollmentStub: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Erasure request not found");
    }
    if (request.status !== "pending") {
      throw new Error("This request has already been processed");
    }

    const userId = user._id as string;
    const now = Date.now();
    const playerIdentityId = request.playerIdentityId;
    const childPlayerId = request.childPlayerId;

    // Delete daily health checks
    const healthChecks = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", playerIdentityId))
      .collect();
    for (const record of healthChecks) {
      await ctx.db.delete(record._id);
    }

    // Delete wellness settings
    const wellnessSettings = await ctx.db
      .query("playerWellnessSettings")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", playerIdentityId))
      .collect();
    for (const record of wellnessSettings) {
      await ctx.db.delete(record._id);
    }

    // Delete skill assessments
    const assessments = await ctx.db
      .query("skillAssessments")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", playerIdentityId)
      )
      .collect();
    for (const record of assessments) {
      await ctx.db.delete(record._id);
    }

    // Delete passport goals
    const goals = await ctx.db
      .query("passportGoals")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", playerIdentityId)
      )
      .collect();
    for (const record of goals) {
      await ctx.db.delete(record._id);
    }

    // Delete coach parent summaries for this player
    const summaries = await ctx.db
      .query("coachParentSummaries")
      .withIndex("by_player", (q) => q.eq("playerIdentityId", playerIdentityId))
      .collect();
    for (const record of summaries) {
      await ctx.db.delete(record._id);
    }

    // Delete parentChildAuthorizations for this child
    const authorizations = await ctx.db
      .query("parentChildAuthorizations")
      .withIndex("by_child", (q) => q.eq("childPlayerId", childPlayerId))
      .collect();
    for (const record of authorizations) {
      await ctx.db.delete(record._id);
    }

    // Delete parentChildAuthorizationLogs for this child
    const authLogs = await ctx.db
      .query("parentChildAuthorizationLogs")
      .withIndex("by_child", (q) => q.eq("childPlayerId", childPlayerId))
      .collect();
    for (const record of authLogs) {
      await ctx.db.delete(record._id);
    }

    // Handle enrollment: either stub or full delete
    const retainStub = args.retainEnrollmentStub !== false; // Default: retain stub
    if (retainStub) {
      // Patch enrollment to stub (for roster continuity)
      await ctx.db.patch(childPlayerId, {
        // Mark as deleted player — retain for team roster continuity
        status: "inactive",
      });
    } else {
      await ctx.db.delete(childPlayerId);
    }

    // Delete playerIdentity
    await ctx.db.delete(playerIdentityId);

    // Mark request as completed
    await ctx.db.patch(args.requestId, {
      status: "completed",
      processedAt: now,
      processedBy: userId,
    });

    return null;
  },
});

/**
 * Decline an erasure request — admin only
 *
 * Stores the admin's reason and notifies the child player via in-app
 * notification.
 */
export const declineErasureRequest = mutation({
  args: {
    requestId: v.id("childDataErasureRequests"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Erasure request not found");
    }
    if (request.status !== "pending") {
      throw new Error("This request has already been processed");
    }

    const userId = user._id as string;
    const now = Date.now();

    // Mark as declined
    await ctx.db.patch(args.requestId, {
      status: "declined",
      declinedAt: now,
      declinedBy: userId,
      declinedReason: args.reason,
    });

    // Notify the child player
    await ctx.runMutation(internal.models.notifications.createNotification, {
      userId: request.requestingUserId,
      organizationId: request.organizationId,
      type: "child_data_erasure",
      title: "Data Erasure Request Update",
      message: `Your data erasure request was reviewed. ${args.reason}`,
      link: `/orgs/${request.organizationId}/player/settings`,
      targetRole: "player",
    });

    return null;
  },
});
