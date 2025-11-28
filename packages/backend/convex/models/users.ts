import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

/**
 * User management functions that work with Better Auth's user table.
 * For standard user operations, use authClient.organization methods on the client.
 * For organization membership approvals, see orgJoinRequests.ts
 */

/**
 * Update the user's current organization
 * This tracks which org they're currently viewing
 */
export const updateCurrentOrg = mutation({
  args: {
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: user._id, operator: "eq" }],
        update: {
          currentOrgId: args.organizationId,
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
