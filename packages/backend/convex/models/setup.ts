/**
 * First User Setup Wizard
 *
 * Handles the 5-step setup wizard for the first user (Platform Staff)
 * on a fresh deployment:
 * 1. GDPR consent
 * 2. Welcome information
 * 3. Create organization
 * 4. Invite team members (optional)
 * 5. Complete setup
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// Valid setup steps
const SETUP_STEPS = [
  "gdpr",
  "welcome",
  "create-org",
  "create-team",
  "invite",
  "complete",
] as const;

type SetupStep = (typeof SETUP_STEPS)[number];

// ============ QUERIES ============

/**
 * Get the current user's setup progress
 * Returns step and completion status
 */
export const getSetupProgress = query({
  args: {},
  returns: v.union(
    v.object({
      step: v.string(),
      isComplete: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return null;
    }

    // If not platform staff, they don't have a setup wizard
    if (!user.isPlatformStaff) {
      return null;
    }

    return {
      step: user.setupStep ?? "gdpr",
      isComplete: user.setupComplete ?? false,
    };
  },
});

/**
 * Check if the current user should be redirected to setup
 * Returns true if user is platform staff and hasn't completed setup
 */
export const shouldRedirectToSetup = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return false;
    }

    // Only platform staff who haven't completed setup
    return user.isPlatformStaff === true && user.setupComplete !== true;
  },
});

/**
 * Get the organization created during setup (for completion page)
 */
export const getSetupOrganization = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.string(),
      name: v.string(),
      slug: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return null;
    }

    // Get organizations where user is owner
    const memberships = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: {
          cursor: null,
          numItems: 10,
        },
        where: [
          { field: "userId", value: user._id, operator: "eq" },
          { field: "role", value: "owner", operator: "eq" },
        ],
      }
    );

    if (!memberships.page || memberships.page.length === 0) {
      return null;
    }

    // Get the first organization they own
    const firstMembership = memberships.page[0] as { organizationId: string };
    const orgResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "organization",
        where: [
          {
            field: "_id",
            value: firstMembership.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    if (!orgResult) {
      return null;
    }

    return {
      _id: (orgResult as { _id: string })._id,
      name: (orgResult as { name: string }).name,
      slug: (orgResult as { slug: string }).slug,
    };
  },
});

// ============ MUTATIONS ============

/**
 * Update the user's current setup step
 * Validates that step is valid and user is platform staff
 */
export const updateSetupStep = mutation({
  args: {
    step: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Must be authenticated");
    }

    if (!user.isPlatformStaff) {
      throw new Error("Only platform staff can update setup progress");
    }

    // Validate step
    if (!SETUP_STEPS.includes(args.step as SetupStep)) {
      throw new Error(`Invalid setup step: ${args.step}`);
    }

    // Update the user's setup step
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: user._id, operator: "eq" }],
        update: {
          setupStep: args.step,
        },
      },
    });

    console.log(`[Setup] User ${user.email} moved to step: ${args.step}`);

    return null;
  },
});

/**
 * Mark setup as complete
 * Sets setupComplete to true and step to 'complete'
 */
export const completeSetup = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Must be authenticated");
    }

    if (!user.isPlatformStaff) {
      throw new Error("Only platform staff can complete setup");
    }

    // Mark setup as complete
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: user._id, operator: "eq" }],
        update: {
          setupComplete: true,
          setupStep: "complete",
        },
      },
    });

    console.log(`[Setup] User ${user.email} completed setup wizard`);

    return null;
  },
});

/**
 * Initialize setup for first user
 * Called after first user signs up - sets initial setup state
 * Returns whether initialization was performed
 */
export const initializeFirstUserSetup = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.object({
    initialized: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Get the user
    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: args.userId, operator: "eq" }],
    });

    if (!user) {
      throw new Error("User not found");
    }

    const typedUser = user as {
      _id: string;
      email: string;
      isPlatformStaff?: boolean;
      setupComplete?: boolean;
      setupStep?: string;
    };

    // Only initialize if user is platform staff and hasn't started setup
    if (!typedUser.isPlatformStaff) {
      return { initialized: false };
    }

    if (typedUser.setupStep !== undefined) {
      // Already initialized
      return { initialized: false };
    }

    // Initialize setup state
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: args.userId, operator: "eq" }],
        update: {
          setupComplete: false,
          setupStep: "gdpr",
        },
      },
    });

    console.log(`[Setup] Initialized setup for first user: ${typedUser.email}`);

    return { initialized: true };
  },
});
