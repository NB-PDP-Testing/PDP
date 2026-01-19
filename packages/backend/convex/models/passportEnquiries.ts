import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

/**
 * Create a new passport enquiry from a coach to an organization
 */
export const createPassportEnquiry = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    targetOrgId: v.string(),
    subject: v.string(),
    message: v.string(),
    contactPreference: v.union(v.literal("email"), v.literal("phone")),
  },
  returns: v.id("passportEnquiries"),
  handler: async (ctx, args) => {
    // Get authenticated user via Better Auth
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get user's current organization from their profile
    const sourceOrgId = user.currentOrgId;
    if (!sourceOrgId) {
      throw new Error("No active organization");
    }

    // Get source organization name
    const sourceOrgName = await ctx
      .runQuery(components.betterAuth.adapter.findOne, {
        model: "organization",
        where: [{ field: "_id", value: sourceOrgId, operator: "eq" }],
      })
      .then((org) => org?.name as string);

    if (!sourceOrgName) {
      throw new Error("Source organization not found");
    }

    // Get target organization name
    const targetOrgName = await ctx
      .runQuery(components.betterAuth.adapter.findOne, {
        model: "organization",
        where: [{ field: "_id", value: args.targetOrgId, operator: "eq" }],
      })
      .then((org) => org?.name as string);

    if (!targetOrgName) {
      throw new Error("Target organization not found");
    }

    // Get player identity details
    const playerIdentity = await ctx.db.get(args.playerIdentityId);
    if (!playerIdentity) {
      throw new Error("Player not found");
    }

    const playerName = `${playerIdentity.firstName} ${playerIdentity.lastName}`;
    const sourceUserName = user.name || user.email;

    // Create enquiry
    const enquiryId = await ctx.db.insert("passportEnquiries", {
      playerIdentityId: args.playerIdentityId,
      playerName,
      sourceOrgId,
      sourceOrgName,
      sourceUserId: user._id,
      sourceUserName,
      sourceUserEmail: user.email,
      targetOrgId: args.targetOrgId,
      targetOrgName,
      subject: args.subject,
      message: args.message,
      contactPreference: args.contactPreference,
      status: "open",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return enquiryId;
  },
});

/**
 * Get all enquiries for a target organization
 */
export const getEnquiriesForOrg = query({
  args: {
    organizationId: v.string(),
    status: v.optional(
      v.union(v.literal("open"), v.literal("processing"), v.literal("closed"))
    ),
  },
  returns: v.array(
    v.object({
      _id: v.id("passportEnquiries"),
      _creationTime: v.number(),
      playerIdentityId: v.id("playerIdentities"),
      playerName: v.string(),
      sourceOrgId: v.string(),
      sourceOrgName: v.string(),
      sourceUserId: v.string(),
      sourceUserName: v.string(),
      sourceUserEmail: v.string(),
      targetOrgId: v.string(),
      targetOrgName: v.string(),
      subject: v.string(),
      message: v.string(),
      contactPreference: v.union(v.literal("email"), v.literal("phone")),
      status: v.union(
        v.literal("open"),
        v.literal("processing"),
        v.literal("closed")
      ),
      closedAt: v.optional(v.number()),
      closedBy: v.optional(v.string()),
      closedByName: v.optional(v.string()),
      resolution: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get authenticated user via Better Auth
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Build query based on status filter
    let enquiries;
    if (args.status) {
      const status = args.status; // Type narrowing
      enquiries = await ctx.db
        .query("passportEnquiries")
        .withIndex("by_target_org_and_status", (q) =>
          q.eq("targetOrgId", args.organizationId).eq("status", status)
        )
        .order("desc")
        .collect();
    } else {
      enquiries = await ctx.db
        .query("passportEnquiries")
        .withIndex("by_target_org", (q) =>
          q.eq("targetOrgId", args.organizationId)
        )
        .order("desc")
        .collect();
    }

    return enquiries;
  },
});

/**
 * Update enquiry status (mark as processing or closed)
 */
export const updateEnquiryStatus = mutation({
  args: {
    enquiryId: v.id("passportEnquiries"),
    status: v.union(
      v.literal("open"),
      v.literal("processing"),
      v.literal("closed")
    ),
    resolution: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get authenticated user via Better Auth
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get existing enquiry
    const enquiry = await ctx.db.get(args.enquiryId);
    if (!enquiry) {
      throw new Error("Enquiry not found");
    }

    // Verify user is admin of target organization
    if (user.currentOrgId !== enquiry.targetOrgId) {
      throw new Error("Not authorized to update this enquiry");
    }

    // Validate closed status has resolution
    if (args.status === "closed" && !args.resolution?.trim()) {
      throw new Error("Resolution comment is required when closing an enquiry");
    }

    // Build update object
    const updateData: {
      status: "open" | "processing" | "closed";
      updatedAt: number;
      closedAt?: number;
      closedBy?: string;
      closedByName?: string;
      resolution?: string;
    } = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.status === "closed") {
      updateData.closedAt = Date.now();
      updateData.closedBy = user._id;
      updateData.closedByName = user.name || user.email;
      updateData.resolution = args.resolution;
    }

    await ctx.db.patch(args.enquiryId, updateData);

    return null;
  },
});

/**
 * Get count of open enquiries for an organization
 */
export const getEnquiryCount = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    // Get authenticated user via Better Auth
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return 0;
    }

    const openEnquiries = await ctx.db
      .query("passportEnquiries")
      .withIndex("by_target_org_and_status", (q) =>
        q.eq("targetOrgId", args.organizationId).eq("status", "open")
      )
      .collect();

    return openEnquiries.length;
  },
});

/**
 * Get enquiries sent by a specific user (for coach view)
 */
export const getEnquiriesByUser = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("passportEnquiries"),
      _creationTime: v.number(),
      playerIdentityId: v.id("playerIdentities"),
      playerName: v.string(),
      sourceOrgId: v.string(),
      sourceOrgName: v.string(),
      sourceUserId: v.string(),
      sourceUserName: v.string(),
      sourceUserEmail: v.string(),
      targetOrgId: v.string(),
      targetOrgName: v.string(),
      subject: v.string(),
      message: v.string(),
      contactPreference: v.union(v.literal("email"), v.literal("phone")),
      status: v.union(
        v.literal("open"),
        v.literal("processing"),
        v.literal("closed")
      ),
      closedAt: v.optional(v.number()),
      closedBy: v.optional(v.string()),
      closedByName: v.optional(v.string()),
      resolution: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get authenticated user via Better Auth
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const enquiries = await ctx.db
      .query("passportEnquiries")
      .withIndex("by_source_org", (q) => q.eq("sourceOrgId", args.userId))
      .order("desc")
      .collect();

    return enquiries;
  },
});
