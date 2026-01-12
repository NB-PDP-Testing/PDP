import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../_generated/server";

export const setUserCurrentOrg = mutation({
  args: {
    userId: v.string(),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    // Use Better Auth adapter to update user
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: args.userId, operator: "eq" }],
        update: {
          currentOrgId: args.organizationId,
        },
      },
    });
    return { success: true, userId: args.userId, orgId: args.organizationId };
  },
});
