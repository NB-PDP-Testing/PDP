import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/authHelpers";

// PlayerARC brand defaults — used when no config row exists yet
const PLAYERARC_DEFAULTS = {
  primaryColor: "#22c55e", // PlayerARC green
  secondaryColor: "#1E3A5F", // PlayerARC navy
  tertiaryColor: "#f59e0b", // PlayerARC amber
};

const HEX_COLOR_REGEX = /^#[0-9A-F]{6}$/i;

/**
 * Get the platform branding config.
 * Returns the stored config or PlayerARC defaults if none exists.
 * Public query — every authenticated user can read it (needed for theme rendering).
 */
export const getPlatformBranding = query({
  args: {},
  returns: v.object({
    primaryColor: v.string(),
    secondaryColor: v.string(),
    tertiaryColor: v.string(),
  }),
  handler: async (ctx) => {
    const config = await ctx.db.query("platformBrandingConfig").first();
    if (!config) {
      return PLAYERARC_DEFAULTS;
    }
    return {
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      tertiaryColor: config.tertiaryColor,
    };
  },
});

/**
 * Update the platform branding config.
 * Platform staff only — enforced via isPlatformStaff check.
 */
export const updatePlatformBranding = mutation({
  args: {
    primaryColor: v.string(),
    secondaryColor: v.string(),
    tertiaryColor: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Validate all three colors are well-formed hex codes
    for (const [key, value] of Object.entries(args)) {
      if (!HEX_COLOR_REGEX.test(value)) {
        throw new Error(
          `Invalid color for ${key}: "${value}". Must be a valid hex code e.g. #22C55E`
        );
      }
    }

    const existing = await ctx.db.query("platformBrandingConfig").first();
    const payload = {
      primaryColor: args.primaryColor.toUpperCase(),
      secondaryColor: args.secondaryColor.toUpperCase(),
      tertiaryColor: args.tertiaryColor.toUpperCase(),
      updatedAt: Date.now(),
      updatedBy: userId,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("platformBrandingConfig", payload);
    }

    return null;
  },
});
