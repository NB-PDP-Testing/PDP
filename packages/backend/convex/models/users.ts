import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

/**
 * User management functions that work with Better Auth's user table.
 * These functions handle approval workflow and custom business logic.
 * For standard user operations, use authClient.organization methods on the client.
 */

/**
 * Get all users with pending approval status
 * Used for admin approval workflow
 */
export const getPendingUsers = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: {
        cursor: null,
        numItems: 1000,
      },
      where: [
        {
          field: "approvalStatus",
          value: "pending",
          operator: "eq",
        },
      ],
    });
    return result.page;
  },
});

/**
 * Get all approved users
 */
export const getApprovedUsers = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: {
        cursor: null,
        numItems: 1000,
      },
      where: [
        {
          field: "approvalStatus",
          value: "approved",
          operator: "eq",
        },
      ],
    });
    return result.page;
  },
});

/**
 * Get all rejected users
 */
export const getRejectedUsers = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: {
        cursor: null,
        numItems: 1000,
      },
      where: [
        {
          field: "approvalStatus",
          value: "rejected",
          operator: "eq",
        },
      ],
    });
    return result.page;
  },
});

/**
 * Approve a user
 * Updates the custom approvalStatus field in the Better Auth user table
 */
export const approveUser = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUser = await authComponent.getAuthUser(ctx);
    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: args.userId, operator: "eq" }],
        update: {
          approvalStatus: "approved",
          approvedBy: currentUser._id,
          approvedAt: Date.now(),
        },
      },
    });
    return null;
  },
});

/**
 * Reject a user
 * Updates the custom approvalStatus field in the Better Auth user table
 */
export const rejectUser = mutation({
  args: {
    userId: v.string(),
    rejectionReason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUser = await authComponent.getAuthUser(ctx);
    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: args.userId, operator: "eq" }],
        update: {
          approvalStatus: "rejected",
          rejectionReason: args.rejectionReason,
          approvedBy: currentUser._id,
          approvedAt: Date.now(),
        },
      },
    });
    return null;
  },
});

/**
 * Unreject a user (move back to pending)
 */
export const unrejectUser = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: args.userId, operator: "eq" }],
        update: {
          approvalStatus: "pending",
        },
      },
    });
    return null;
  },
});

/**
 * Get current authenticated user using Better Auth
 * Returns full user record with all custom fields (isPlatformStaff, etc)
 */
export const getCurrentUser = query({
  args: {},
  returns: v.union(v.any(), v.null()),
  handler: async (ctx) => {
    // Get the basic auth user from Better Auth
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    // Query the user table directly using Better Auth component adapter to get all custom fields
    const result = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [
        {
          field: "_id",
          value: authUser._id,
          operator: "eq",
        },
      ],
    });

    return result;
  },
});
