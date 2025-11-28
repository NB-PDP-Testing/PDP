import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

/**
 * Organization join request management functions
 */

/**
 * Create a join request for an organization
 */
export const createJoinRequest = mutation({
  args: {
    organizationId: v.string(),
    requestedRole: v.union(
      v.literal("member"),
      v.literal("coach"),
      v.literal("parent")
    ),
    message: v.optional(v.string()),
  },
  returns: v.id("orgJoinRequests"),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check if user already has a pending request for this org
    const existingRequest = await ctx.db
      .query("orgJoinRequests")
      .withIndex("by_userId_and_organizationId", (q) =>
        q.eq("userId", user._id).eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingRequest) {
      throw new Error(
        "You already have a pending request for this organization"
      );
    }

    // Check if user is already a member
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "userId",
            value: user._id,
            operator: "eq",
          },
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (memberResult) {
      throw new Error("You are already a member of this organization");
    }

    // Get organization details
    const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [
        {
          field: "_id",
          value: args.organizationId,
          operator: "eq",
        },
      ],
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    // Create the join request
    return await ctx.db.insert("orgJoinRequests", {
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      organizationId: args.organizationId,
      organizationName: org.name,
      requestedRole: args.requestedRole,
      status: "pending",
      message: args.message,
      requestedAt: Date.now(),
    });
  },
});

/**
 * Get all pending join requests for an organization
 */
export const getPendingRequestsForOrg = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check if user is admin or owner of the organization
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "userId",
            value: user._id,
            operator: "eq",
          },
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (
      !memberResult ||
      (memberResult.role !== "admin" && memberResult.role !== "owner")
    ) {
      throw new Error("You must be an admin or owner to view join requests");
    }

    return await ctx.db
      .query("orgJoinRequests")
      .withIndex("by_organizationId_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .order("desc")
      .collect();
  },
});

/**
 * Get all join requests for the current user
 */
export const getUserJoinRequests = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return [];
    }

    return await ctx.db
      .query("orgJoinRequests")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

/**
 * Get pending join requests for the current user
 */
export const getUserPendingRequests = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return [];
    }

    return await ctx.db
      .query("orgJoinRequests")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("desc")
      .collect();
  },
});

/**
 * Approve a join request
 */
export const approveJoinRequest = mutation({
  args: {
    requestId: v.id("orgJoinRequests"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Join request not found");
    }

    if (request.status !== "pending") {
      throw new Error("This request has already been processed");
    }

    // Check if user is admin or owner of the organization
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "userId",
            value: user._id,
            operator: "eq",
          },
          {
            field: "organizationId",
            value: request.organizationId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (
      !memberResult ||
      (memberResult.role !== "admin" && memberResult.role !== "owner")
    ) {
      throw new Error("You must be an admin or owner to approve join requests");
    }

    // Add user to organization with requested role
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "member",
        data: {
          userId: request.userId,
          organizationId: request.organizationId,
          role: request.requestedRole,
          createdAt: Date.now(),
        },
      },
    });

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "approved",
      reviewedAt: Date.now(),
      reviewedBy: user._id,
      reviewerName: user.name,
    });

    return null;
  },
});

/**
 * Reject a join request
 */
export const rejectJoinRequest = mutation({
  args: {
    requestId: v.id("orgJoinRequests"),
    rejectionReason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Join request not found");
    }

    if (request.status !== "pending") {
      throw new Error("This request has already been processed");
    }

    // Check if user is admin or owner of the organization
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "userId",
            value: user._id,
            operator: "eq",
          },
          {
            field: "organizationId",
            value: request.organizationId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (
      !memberResult ||
      (memberResult.role !== "admin" && memberResult.role !== "owner")
    ) {
      throw new Error("You must be an admin or owner to reject join requests");
    }

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "rejected",
      rejectionReason: args.rejectionReason,
      reviewedAt: Date.now(),
      reviewedBy: user._id,
      reviewerName: user.name,
    });

    return null;
  },
});

/**
 * Cancel a join request (by the requester)
 */
export const cancelJoinRequest = mutation({
  args: {
    requestId: v.id("orgJoinRequests"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Join request not found");
    }

    if (request.userId !== user._id) {
      throw new Error("You can only cancel your own requests");
    }

    if (request.status !== "pending") {
      throw new Error("You can only cancel pending requests");
    }

    await ctx.db.delete(args.requestId);
    return null;
  },
});

/**
 * Get all organizations (for join page)
 */
export const getAllOrganizations = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "organization",
      paginationOpts: {
        cursor: null,
        numItems: 1000,
      },
    });
    return result.page;
  },
});
