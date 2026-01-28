import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";

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
