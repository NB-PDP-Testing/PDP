import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";

/**
 * Demo request management functions
 */

/**
 * Create a demo request
 */
export const createDemoRequest = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    organization: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  returns: v.id("demoAsks"),
  handler: async (ctx, args) => {
    const requestedAt = Date.now();

    // Insert the demo request
    const requestId = await ctx.db.insert("demoAsks", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      organization: args.organization,
      message: args.message,
      status: "pending",
      requestedAt,
    });

    // Schedule email notification (non-blocking)
    await ctx.scheduler.runAfter(
      0,
      internal.actions.sendDemoRequestNotification.sendNotification,
      {
        name: args.name,
        email: args.email,
        phone: args.phone,
        organization: args.organization,
        message: args.message,
        requestedAt,
      }
    );

    return requestId;
  },
});

/**
 * Get all demo requests (for admin/staff use)
 */
export const getAllDemoRequests = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) =>
    await ctx.db.query("demoAsks").order("desc").take(1000),
});

/**
 * Get demo requests by status
 */
export const getDemoRequestsByStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("contacted"),
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("dismissed")
    ),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("demoAsks")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .take(1000),
});

/**
 * Update demo request status
 */
export const updateDemoRequestStatus = mutation({
  args: {
    requestId: v.id("demoAsks"),
    status: v.union(
      v.literal("pending"),
      v.literal("contacted"),
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("dismissed")
    ),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const update: {
      status: typeof args.status;
      contactedAt?: number;
      notes?: string;
    } = {
      status: args.status,
    };

    if (args.status === "contacted" || args.status === "scheduled") {
      update.contactedAt = Date.now();
    }

    if (args.notes) {
      update.notes = args.notes;
    }

    await ctx.db.patch(args.requestId, update);
    return null;
  },
});
