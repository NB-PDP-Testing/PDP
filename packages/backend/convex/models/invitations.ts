import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";

// ============================================================
// PHASE 3: INVITATION MANAGEMENT QUERIES
// These support the admin invitation management dashboard
// ============================================================

/**
 * Get invitation statistics for an organization
 * Returns counts for active, expiring soon, expired, and pending requests
 */
export const getInvitationStats = query({
  args: { organizationId: v.string() },
  returns: v.object({
    active: v.number(),
    expiringSoon: v.number(),
    expired: v.number(),
    requests: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const in48Hours = now + 48 * 60 * 60 * 1000;

    // Get all invitations for this org (paginated)
    const allInvitationsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "invitation",
        paginationOpts: { cursor: null, numItems: 1000 },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );
    const allInvitations = allInvitationsResult?.page || [];

    // Count by status
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;

    for (const invitation of allInvitations) {
      if (
        invitation.status === "accepted" ||
        invitation.status === "cancelled"
      ) {
        continue;
      }

      if (invitation.expiresAt < now) {
        expired += 1;
      } else if (invitation.expiresAt <= in48Hours) {
        expiringSoon += 1;
      } else {
        active += 1;
      }
    }

    // Count pending requests
    const pendingRequests = await ctx.db
      .query("invitationRequests")
      .withIndex("by_organization_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .collect();

    return {
      active,
      expiringSoon,
      expired,
      requests: pendingRequests.length,
    };
  },
});

/**
 * Get invitations by status category
 * Supports filtering by: active, expiring_soon, expired
 */
export const getInvitationsByStatus = query({
  args: {
    organizationId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("expiring_soon"),
      v.literal("expired")
    ),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const now = Date.now();
    const in48Hours = now + 48 * 60 * 60 * 1000;

    // Get all invitations for this org (paginated)
    const allInvitationsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "invitation",
        paginationOpts: { cursor: null, numItems: 1000 },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );
    const allInvitations = allInvitationsResult?.page || [];

    // Filter by status category
    const filtered = allInvitations.filter(
      (invitation: { status?: string; expiresAt: number }) => {
        // Skip accepted/cancelled invitations
        if (
          invitation.status === "accepted" ||
          invitation.status === "cancelled"
        ) {
          return false;
        }

        if (args.status === "expired") {
          return invitation.expiresAt < now;
        }
        if (args.status === "expiring_soon") {
          return (
            invitation.expiresAt >= now && invitation.expiresAt <= in48Hours
          );
        }
        // active
        return invitation.expiresAt > in48Hours;
      }
    );

    // Sort by expiration (soonest first for expiring_soon, most recently expired first for expired)
    filtered.sort((a: { expiresAt: number }, b: { expiresAt: number }) => {
      if (args.status === "expired") {
        return b.expiresAt - a.expiresAt; // Most recently expired first
      }
      return a.expiresAt - b.expiresAt; // Soonest to expire first
    });

    return filtered;
  },
});

/**
 * Get pending invitation requests for an organization
 */
export const getPendingInvitationRequests = query({
  args: { organizationId: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("invitationRequests")
      .withIndex("by_organization_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .order("desc")
      .collect();

    // Enrich with original invitation info
    const enriched = await Promise.all(
      requests.map(async (request) => {
        const invitation = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "invitation",
            where: [
              {
                field: "_id",
                value: request.originalInvitationId,
                operator: "eq",
              },
            ],
          }
        );

        return {
          ...request,
          originalInvitation: invitation
            ? {
                email: invitation.email,
                role: invitation.role,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Invitation Request Management Functions (Phase 1B)
 *
 * These functions handle the user self-service flow for expired invitations.
 * When a user clicks an expired invitation link, they can:
 * 1. See the invitation status and organization info
 * 2. Request a new invitation (max 3 times)
 * 3. Be automatically re-invited if the org has auto re-invite enabled
 */

/**
 * Check the status of an invitation
 *
 * Used by the accept-invitation page to determine what UI to show.
 * Returns invitation status, organization info, and request eligibility.
 */
export const checkInvitationStatus = query({
  args: {
    invitationId: v.string(),
  },
  returns: v.object({
    status: v.union(
      v.literal("valid"),
      v.literal("expired"),
      v.literal("accepted"),
      v.literal("not_found")
    ),
    invitation: v.optional(
      v.object({
        email: v.string(),
        role: v.union(v.string(), v.null()),
        createdAt: v.optional(v.number()),
        expiresAt: v.number(),
      })
    ),
    organization: v.optional(
      v.object({
        name: v.string(),
        adminContactEmail: v.optional(v.string()),
      })
    ),
    canRequestNew: v.boolean(),
    requestCount: v.number(),
    autoReInviteAvailable: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Get invitation from Better Auth table using the adapter pattern
    const invitationResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "invitation",
        where: [
          {
            field: "_id",
            value: args.invitationId,
            operator: "eq",
          },
        ],
      }
    );

    if (!invitationResult) {
      return {
        status: "not_found" as const,
        canRequestNew: false,
        requestCount: 0,
        autoReInviteAvailable: false,
      };
    }

    // Get organization info using the adapter pattern
    const orgResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "organization",
        where: [
          {
            field: "_id",
            value: invitationResult.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    // Count existing requests for this invitation
    const existingRequests = await ctx.db
      .query("invitationRequests")
      .withIndex("by_original_invitation", (q) =>
        q.eq("originalInvitationId", args.invitationId)
      )
      .collect();

    const requestCount = existingRequests.length;

    // Determine status
    const now = Date.now();
    let status: "valid" | "expired" | "accepted" | "not_found";

    if (invitationResult.status === "accepted") {
      status = "accepted";
    } else if (invitationResult.expiresAt < now) {
      status = "expired";
    } else {
      status = "valid";
    }

    // Can request new if expired and under 3 requests
    const canRequestNew = status === "expired" && requestCount < 3;

    // Check if auto re-invite is available
    // Available if: org has autoReInviteOnExpiration enabled AND
    // invitation's autoReInviteCount < org's maxAutoReInvitesPerInvitation (default 2)
    const orgSettings = orgResult as {
      autoReInviteOnExpiration?: boolean;
      maxAutoReInvitesPerInvitation?: number;
    } | null;
    const invitationSettings = invitationResult as {
      autoReInviteCount?: number;
    };
    const autoReInviteEnabled = orgSettings?.autoReInviteOnExpiration === true;
    const maxAutoReInvites = orgSettings?.maxAutoReInvitesPerInvitation ?? 2;
    const currentAutoReInviteCount = invitationSettings.autoReInviteCount ?? 0;
    const autoReInviteAvailable =
      status === "expired" &&
      autoReInviteEnabled &&
      currentAutoReInviteCount < maxAutoReInvites;

    return {
      status,
      invitation: {
        email: invitationResult.email,
        role: invitationResult.role ?? null,
        createdAt: undefined, // Better Auth invitations don't have createdAt
        expiresAt: invitationResult.expiresAt,
      },
      organization: orgResult
        ? {
            name: orgResult.name,
            adminContactEmail:
              (orgResult as { adminContactEmail?: string }).adminContactEmail ??
              undefined,
          }
        : undefined,
      canRequestNew,
      requestCount,
      autoReInviteAvailable,
    };
  },
});

/**
 * Create a request for a new invitation
 *
 * Called when a user clicks "Request New Invitation" on the expired invitation page.
 * Enforces rate limiting: max 3 requests per invitation, 60 second cooldown.
 */
export const createInvitationRequest = mutation({
  args: {
    originalInvitationId: v.string(),
    userEmail: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    requestNumber: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get invitation from Better Auth table using the adapter pattern
    const invitationResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "invitation",
        where: [
          {
            field: "_id",
            value: args.originalInvitationId,
            operator: "eq",
          },
        ],
      }
    );

    if (!invitationResult) {
      return {
        success: false,
        requestNumber: 0,
        message: "Invitation not found.",
      };
    }

    // Verify invitation is expired
    const now = Date.now();
    if (invitationResult.expiresAt > now) {
      return {
        success: false,
        requestNumber: 0,
        message: "This invitation is still valid.",
      };
    }

    // Verify email matches
    if (invitationResult.email.toLowerCase() !== args.userEmail.toLowerCase()) {
      return {
        success: false,
        requestNumber: 0,
        message: "Email does not match the invitation.",
      };
    }

    // Count existing requests for this invitation
    const existingRequests = await ctx.db
      .query("invitationRequests")
      .withIndex("by_original_invitation", (q) =>
        q.eq("originalInvitationId", args.originalInvitationId)
      )
      .collect();

    // Check if max requests reached
    if (existingRequests.length >= 3) {
      return {
        success: false,
        requestNumber: 3,
        message:
          "Maximum requests reached. Please contact the organization directly.",
      };
    }

    // Check rate limit - no request in last 60 seconds
    const recentRequest = existingRequests.find(
      (r) => r.requestedAt > now - 60_000
    );
    if (recentRequest) {
      return {
        success: false,
        requestNumber: existingRequests.length,
        message: "Please wait before requesting again.",
      };
    }

    // Create the request
    const requestNumber = existingRequests.length + 1;
    await ctx.db.insert("invitationRequests", {
      originalInvitationId: args.originalInvitationId,
      organizationId: invitationResult.organizationId,
      userEmail: args.userEmail,
      requestedAt: now,
      requestNumber,
      status: "pending",
    });

    return {
      success: true,
      requestNumber,
      message: "Request submitted.",
    };
  },
});

/**
 * Process auto re-invite for an expired invitation
 *
 * Called automatically when a user clicks an expired invitation link
 * and the organization has auto re-invite enabled.
 *
 * This creates a new invitation with the same details and sends it to the user.
 */
export const processAutoReInvite = mutation({
  args: {
    invitationId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    newInvitationId: v.optional(v.string()),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get invitation from Better Auth table
    const invitationResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "invitation",
        where: [
          {
            field: "_id",
            value: args.invitationId,
            operator: "eq",
          },
        ],
      }
    );

    if (!invitationResult) {
      return {
        success: false,
        message: "Invitation not found.",
      };
    }

    // Verify invitation is expired
    const now = Date.now();
    if (invitationResult.expiresAt > now) {
      return {
        success: false,
        message: "This invitation is still valid.",
      };
    }

    // Get organization to check auto re-invite settings
    const orgResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "organization",
        where: [
          {
            field: "_id",
            value: invitationResult.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    if (!orgResult) {
      return {
        success: false,
        message: "Organization not found.",
      };
    }

    // Check if auto re-invite is enabled
    const orgSettings = orgResult as {
      autoReInviteOnExpiration?: boolean;
      maxAutoReInvitesPerInvitation?: number;
      invitationExpirationDays?: number;
    };
    const invitationSettings = invitationResult as {
      autoReInviteCount?: number;
    };

    if (orgSettings.autoReInviteOnExpiration !== true) {
      return {
        success: false,
        message: "Auto re-invite is not enabled for this organization.",
      };
    }

    // Check if max auto re-invites exceeded
    const maxAutoReInvites = orgSettings.maxAutoReInvitesPerInvitation ?? 2;
    const currentCount = invitationSettings.autoReInviteCount ?? 0;

    if (currentCount >= maxAutoReInvites) {
      return {
        success: false,
        message: "Maximum auto re-invites reached.",
      };
    }

    // Calculate new expiration date
    const expirationDays = orgSettings.invitationExpirationDays ?? 7;
    const newExpiresAt = now + expirationDays * 24 * 60 * 60 * 1000;

    // Create new invitation with same details
    const newInvitationData = {
      organizationId: invitationResult.organizationId,
      email: invitationResult.email,
      role: invitationResult.role,
      teamId: invitationResult.teamId,
      status: "pending",
      expiresAt: newExpiresAt,
      inviterId: invitationResult.inviterId,
      metadata: (invitationResult as { metadata?: unknown }).metadata,
      autoReInviteCount: 0, // New invitation starts fresh
    };

    // Insert new invitation using adapter
    const newInvitation = await ctx.runMutation(
      components.betterAuth.adapter.create,
      {
        input: {
          model: "invitation",
          data: newInvitationData,
        },
      }
    );

    // Increment auto re-invite count on original invitation
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "invitation",
        where: [{ field: "_id", value: args.invitationId, operator: "eq" }],
        update: {
          autoReInviteCount: currentCount + 1,
        },
      },
    });

    // Note: Email sending would be handled by Better Auth's invitation system
    // or a separate action that calls the email service

    return {
      success: true,
      newInvitationId: newInvitation._id,
      message: "New invitation sent!",
    };
  },
});

// ============================================================
// PHASE 3: ADMIN BULK INVITATION MUTATIONS
// These support the admin invitation management dashboard
// ============================================================

/**
 * Resend a single invitation (admin action)
 * Creates a new invitation with same details but new expiration
 */
export const resendInvitation = mutation({
  args: { invitationId: v.string() },
  returns: v.object({
    success: v.boolean(),
    newInvitationId: v.optional(v.string()),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get original invitation
    const invitationResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "invitation",
        where: [{ field: "_id", value: args.invitationId, operator: "eq" }],
      }
    );

    if (!invitationResult) {
      return {
        success: false,
        message: "Invitation not found.",
      };
    }

    // Get organization settings for expiration days
    const orgResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "organization",
        where: [
          {
            field: "_id",
            value: invitationResult.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    const orgSettings = orgResult as {
      invitationExpirationDays?: number;
    } | null;
    const expirationDays = orgSettings?.invitationExpirationDays ?? 7;

    // Calculate new expiration date
    const now = Date.now();
    const newExpiresAt = now + expirationDays * 24 * 60 * 60 * 1000;

    // Create new invitation with same details
    const newInvitationData = {
      organizationId: invitationResult.organizationId,
      email: invitationResult.email,
      role: invitationResult.role,
      teamId: invitationResult.teamId,
      status: "pending",
      expiresAt: newExpiresAt,
      inviterId: invitationResult.inviterId,
      metadata: (invitationResult as { metadata?: unknown }).metadata,
      autoReInviteCount: 0,
    };

    // Insert new invitation
    const newInvitation = await ctx.runMutation(
      components.betterAuth.adapter.create,
      {
        input: {
          model: "invitation",
          data: newInvitationData,
        },
      }
    );

    // Mark original as resent (using cancelled status with metadata)
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "invitation",
        where: [{ field: "_id", value: args.invitationId, operator: "eq" }],
        update: {
          status: "cancelled",
        },
      },
    });

    return {
      success: true,
      newInvitationId: newInvitation._id,
      message: "Invitation resent successfully.",
    };
  },
});

/**
 * Cancel a single invitation
 */
export const cancelInvitation = mutation({
  args: { invitationId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "invitation",
        where: [{ field: "_id", value: args.invitationId, operator: "eq" }],
        update: {
          status: "cancelled",
        },
      },
    });

    return null;
  },
});

/**
 * Bulk resend multiple invitations
 * Returns success and failure counts
 */
export const bulkResendInvitations = mutation({
  args: { invitationIds: v.array(v.string()) },
  returns: v.object({
    success: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx, args) => {
    let success = 0;
    let failed = 0;

    for (const invitationId of args.invitationIds) {
      try {
        // Get original invitation
        const invitationResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "invitation",
            where: [{ field: "_id", value: invitationId, operator: "eq" }],
          }
        );

        if (!invitationResult) {
          failed += 1;
          continue;
        }

        // Get organization settings
        const orgResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "organization",
            where: [
              {
                field: "_id",
                value: invitationResult.organizationId,
                operator: "eq",
              },
            ],
          }
        );

        const orgSettings = orgResult as {
          invitationExpirationDays?: number;
        } | null;
        const expirationDays = orgSettings?.invitationExpirationDays ?? 7;
        const now = Date.now();
        const newExpiresAt = now + expirationDays * 24 * 60 * 60 * 1000;

        // Create new invitation
        const newInvitationData = {
          organizationId: invitationResult.organizationId,
          email: invitationResult.email,
          role: invitationResult.role,
          teamId: invitationResult.teamId,
          status: "pending",
          expiresAt: newExpiresAt,
          inviterId: invitationResult.inviterId,
          metadata: (invitationResult as { metadata?: unknown }).metadata,
          autoReInviteCount: 0,
        };

        await ctx.runMutation(components.betterAuth.adapter.create, {
          input: {
            model: "invitation",
            data: newInvitationData,
          },
        });

        // Mark original as cancelled
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "invitation",
            where: [{ field: "_id", value: invitationId, operator: "eq" }],
            update: {
              status: "cancelled",
            },
          },
        });

        success += 1;
      } catch (error) {
        console.error(`Failed to resend invitation ${invitationId}:`, error);
        failed += 1;
      }
    }

    return { success, failed };
  },
});

/**
 * Bulk cancel multiple invitations
 */
export const bulkCancelInvitations = mutation({
  args: { invitationIds: v.array(v.string()) },
  returns: v.object({
    success: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx, args) => {
    let success = 0;
    let failed = 0;

    for (const invitationId of args.invitationIds) {
      try {
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "invitation",
            where: [{ field: "_id", value: invitationId, operator: "eq" }],
            update: {
              status: "cancelled",
            },
          },
        });
        success += 1;
      } catch (error) {
        console.error(`Failed to cancel invitation ${invitationId}:`, error);
        failed += 1;
      }
    }

    return { success, failed };
  },
});
