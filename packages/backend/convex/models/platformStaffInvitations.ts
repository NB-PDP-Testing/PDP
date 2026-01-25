/**
 * Platform Staff Invitations
 *
 * Manages invitations for granting platform staff access to users.
 * When a user registers or logs in with a pending invitation,
 * they are automatically granted platform staff status.
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";

const INVITATION_EXPIRY_DAYS = 7;

/**
 * Create a platform staff invitation
 *
 * Sends an invitation to an email address to become platform staff.
 * If the user already exists and is already platform staff, returns error.
 * If the user exists but is not platform staff, grants access immediately.
 * If the user doesn't exist, creates a pending invitation.
 */
export const createInvitation = mutation({
  args: {
    email: v.string(),
    invitedByUserId: v.string(),
    invitedByName: v.optional(v.string()),
    invitedByEmail: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    invitationId: v.optional(v.id("platformStaffInvitations")),
    grantedImmediately: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // Check if user already exists using Better Auth adapter
    const existingUser = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "email",
            value: normalizedEmail,
            operator: "eq",
          },
        ],
      }
    );

    if (existingUser) {
      // User exists - check if already platform staff
      if (existingUser.isPlatformStaff) {
        return {
          success: false,
          message: "This user is already a platform staff member",
        };
      }

      // Grant platform staff access immediately
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "user",
          where: [{ field: "_id", value: existingUser._id, operator: "eq" }],
          update: {
            isPlatformStaff: true,
          },
        },
      });

      return {
        success: true,
        message: `Platform staff access granted to ${existingUser.name || normalizedEmail}`,
        grantedImmediately: true,
      };
    }

    // Check for existing pending invitation
    const existingInvitation = await ctx.db
      .query("platformStaffInvitations")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", normalizedEmail).eq("status", "pending")
      )
      .first();

    if (existingInvitation) {
      // Check if expired
      if (existingInvitation.expiresAt < Date.now()) {
        // Mark as expired
        await ctx.db.patch(existingInvitation._id, {
          status: "expired",
        });
      } else {
        return {
          success: false,
          message: "A pending invitation already exists for this email",
        };
      }
    }

    // Create new invitation
    const now = Date.now();
    const expiresAt = now + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    const invitationId = await ctx.db.insert("platformStaffInvitations", {
      email: normalizedEmail,
      invitedBy: args.invitedByUserId,
      invitedByName: args.invitedByName,
      invitedByEmail: args.invitedByEmail,
      status: "pending",
      createdAt: now,
      expiresAt,
    });

    return {
      success: true,
      message: `Invitation sent to ${normalizedEmail}`,
      invitationId,
    };
  },
});

/**
 * Get all pending platform staff invitations
 */
export const getPendingInvitations = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("platformStaffInvitations"),
      _creationTime: v.number(),
      email: v.string(),
      invitedBy: v.string(),
      invitedByName: v.optional(v.string()),
      invitedByEmail: v.optional(v.string()),
      status: v.string(),
      createdAt: v.number(),
      expiresAt: v.number(),
      isExpired: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    const invitations = await ctx.db
      .query("platformStaffInvitations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const now = Date.now();

    return invitations.map((inv) => ({
      ...inv,
      isExpired: inv.expiresAt < now,
    }));
  },
});

/**
 * Cancel a platform staff invitation
 */
export const cancelInvitation = mutation({
  args: {
    invitationId: v.id("platformStaffInvitations"),
    cancelledBy: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);

    if (!invitation) {
      return {
        success: false,
        message: "Invitation not found",
      };
    }

    if (invitation.status !== "pending") {
      return {
        success: false,
        message: `Cannot cancel invitation with status: ${invitation.status}`,
      };
    }

    await ctx.db.patch(args.invitationId, {
      status: "cancelled",
      cancelledAt: Date.now(),
      cancelledBy: args.cancelledBy,
    });

    return {
      success: true,
      message: "Invitation cancelled",
    };
  },
});

/**
 * Check and process pending invitation for a user
 *
 * Called when a user logs in or registers.
 * If they have a pending invitation, grants platform staff access.
 */
export const processPendingInvitation = mutation({
  args: {
    email: v.string(),
    userId: v.string(),
  },
  returns: v.object({
    hadPendingInvitation: v.boolean(),
    grantedStaffAccess: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // Find pending invitation
    const invitation = await ctx.db
      .query("platformStaffInvitations")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", normalizedEmail).eq("status", "pending")
      )
      .first();

    if (!invitation) {
      return {
        hadPendingInvitation: false,
        grantedStaffAccess: false,
      };
    }

    // Check if expired
    if (invitation.expiresAt < Date.now()) {
      await ctx.db.patch(invitation._id, {
        status: "expired",
      });
      return {
        hadPendingInvitation: true,
        grantedStaffAccess: false,
      };
    }

    // Get the user using Better Auth adapter and grant staff access
    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [
        {
          field: "email",
          value: normalizedEmail,
          operator: "eq",
        },
      ],
    });

    if (user && !user.isPlatformStaff) {
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "user",
          where: [{ field: "_id", value: user._id, operator: "eq" }],
          update: {
            isPlatformStaff: true,
          },
        },
      });
    }

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      acceptedAt: Date.now(),
      acceptedByUserId: args.userId,
    });

    return {
      hadPendingInvitation: true,
      grantedStaffAccess: true,
    };
  },
});

/**
 * Resend a platform staff invitation (extend expiry)
 */
export const resendInvitation = mutation({
  args: {
    invitationId: v.id("platformStaffInvitations"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);

    if (!invitation) {
      return {
        success: false,
        message: "Invitation not found",
      };
    }

    if (invitation.status !== "pending") {
      return {
        success: false,
        message: `Cannot resend invitation with status: ${invitation.status}`,
      };
    }

    // Extend expiry
    const newExpiresAt =
      Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.invitationId, {
      expiresAt: newExpiresAt,
    });

    return {
      success: true,
      message: "Invitation resent with extended expiry",
    };
  },
});
