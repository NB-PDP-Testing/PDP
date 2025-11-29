import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

/**
 * Update organization colors
 * This allows setting custom colors for an organization
 */
export const updateOrganizationColors = mutation({
  args: {
    organizationId: v.string(),
    colors: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Update the organization colors using Better Auth component adapter
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "organization",
        where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
        update: {
          colors: args.colors,
        },
      },
    });

    return null;
  },
});

/**
 * Get user's role in an organization
 * Used to check permissions before sensitive operations
 */
export const getUserOrgRole = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      role: v.string(),
      isOwner: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return null;
    }

    // Get the user's membership in this organization
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

    if (!memberResult) {
      return null;
    }

    return {
      role: memberResult.role || "member",
      isOwner: memberResult.role === "owner",
    };
  },
});

/**
 * Delete an organization (owner only)
 * This will cascade delete all related data
 */
export const deleteOrganization = mutation({
  args: {
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check if user is the owner of this organization
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

    if (!memberResult || memberResult.role !== "owner") {
      throw new Error("Only organization owners can delete the organization");
    }

    // Delete the organization using Better Auth component adapter
    // Note: This should cascade delete members, teams, etc. through Better Auth
    await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "organization",
        where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
      },
    });

    return null;
  },
});
