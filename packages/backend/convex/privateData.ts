import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

export const get = query({
  args: {},
  returns: v.object({
    message: v.string(),
    onboardingComplete: v.optional(v.boolean()),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return {
        message: "Not authenticated",
        onboardingComplete: undefined,
      };
    }

    // Get the user from the better-auth component
    const user = await authComponent.getAuthUser(ctx);

    return {
      message: "This is private",
      onboardingComplete: user?.onboardingComplete ?? false,
    };
  },
});

export const setOnboardingComplete = mutation({
  args: {
    onboardingComplete: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    // Get the current user from better-auth
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }

    // Update the user's onboardingComplete field via the component function
    await ctx.runMutation(
      components.betterAuth.userFunctions.updateOnboardingComplete,
      {
        userId: user._id,
        onboardingComplete: args.onboardingComplete,
      }
    );

    return null;
  },
});
