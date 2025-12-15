import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// Regex for validating hex color format
const HEX_COLOR_REGEX = /^#[0-9A-F]{6}$/i;

// Social links type for organization
const socialLinksValidator = v.object({
  facebook: v.optional(v.union(v.null(), v.string())),
  twitter: v.optional(v.union(v.null(), v.string())),
  instagram: v.optional(v.union(v.null(), v.string())),
  linkedin: v.optional(v.union(v.null(), v.string())),
});

/**
 * Get organization by ID (reactive query for theme)
 * Returns organization data including colors and social links for real-time updates
 */
export const getOrganization = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.string(),
      name: v.string(),
      slug: v.string(),
      logo: v.optional(v.union(v.null(), v.string())),
      colors: v.optional(v.array(v.string())),
      website: v.optional(v.union(v.null(), v.string())),
      socialLinks: socialLinksValidator,
    })
  ),
  handler: async (ctx, args) => {
    // Use Better Auth adapter to get organization
    const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
    });

    if (!org) {
      return null;
    }

    return {
      _id: org._id as string,
      name: org.name as string,
      slug: org.slug as string,
      logo: org.logo as string | null | undefined,
      colors: org.colors as string[] | undefined,
      website: org.website as string | null | undefined,
      socialLinks: {
        facebook: org.socialFacebook as string | null | undefined,
        twitter: org.socialTwitter as string | null | undefined,
        instagram: org.socialInstagram as string | null | undefined,
        linkedin: org.socialLinkedin as string | null | undefined,
      },
    };
  },
});

/**
 * Get all organizations (platform staff only)
 * Returns all organizations in the system for platform-wide management
 */
export const getAllOrganizations = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.string(),
      name: v.string(),
      slug: v.string(),
      logo: v.optional(v.union(v.null(), v.string())),
      createdAt: v.number(),
      memberCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    // Verify current user is platform staff
    const currentUser = await authComponent.safeGetAuthUser(ctx);
    if (!currentUser?.isPlatformStaff) {
      throw new Error("Only platform staff can view all organizations");
    }

    // Get all organizations
    const orgsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "organization",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [],
      }
    );

    // Get member counts for each organization
    const orgsWithCounts = await Promise.all(
      orgsResult.page.map(async (org: Record<string, unknown>) => {
        // Get members for this org
        const membersResult = await ctx.runQuery(
          components.betterAuth.adapter.findMany,
          {
            model: "member",
            paginationOpts: {
              cursor: null,
              numItems: 1000,
            },
            where: [
              {
                field: "organizationId",
                value: org._id as string,
                operator: "eq",
              },
            ],
          }
        );

        return {
          _id: org._id as string,
          name: org.name as string,
          slug: org.slug as string,
          logo: org.logo as string | null | undefined,
          createdAt: org.createdAt as number,
          memberCount: membersResult.page.length,
        };
      })
    );

    return orgsWithCounts;
  },
});

/**
 * Update organization colors
 * This allows setting custom colors for an organization
 * Only organization owners and admins can update colors
 */
export const updateOrganizationColors = mutation({
  args: {
    organizationId: v.string(),
    // Accept strings or nulls from the client and sanitize below
    colors: v.array(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Validate colors array
    if (args.colors.length > 3) {
      throw new Error(
        "Maximum of 3 colors allowed (primary, secondary, tertiary)"
      );
    }

    // Validate hex color format
    // Frontend sends exactly 3-element array: ["#FF5733", "", "#00FF00"]
    // Empty strings preserve positions (0=primary, 1=secondary, 2=tertiary)
    const validatedColors: string[] = ["", "", ""]; // Dense array with 3 positions
    let hasAnyValidColor = false;

    // Ensure we process exactly 3 positions
    // Frontend should always send 3 elements, but handle edge cases
    const colorsToProcess =
      args.colors.length >= 3
        ? args.colors.slice(0, 3)
        : [...args.colors, ...new Array(3 - args.colors.length).fill("")];

    for (let i = 0; i < 3; i++) {
      const color = colorsToProcess[i];

      // Handle null/undefined - convert to empty string
      if (!color || color === null || color === undefined) {
        validatedColors[i] = "";
        continue;
      }

      const trimmedColor = color.trim();
      if (trimmedColor === "") {
        // Empty string - preserve position with empty string
        validatedColors[i] = "";
        continue;
      }

      if (!HEX_COLOR_REGEX.test(trimmedColor)) {
        const colorNames = ["Primary", "Secondary", "Tertiary"];
        throw new Error(
          `Invalid ${colorNames[i]} color format: ${color}. Must be a valid hex color (e.g., #FF5733)`
        );
      }

      validatedColors[i] = trimmedColor.toUpperCase();
      hasAnyValidColor = true;
    }

    if (!hasAnyValidColor) {
      throw new Error("At least one valid color is required");
    }

    // Save exactly 3-element dense array with empty strings preserving positions
    // Example: ["#FF5733", "", "#00FF00"] maintains that tertiary is at index 2
    // All elements are strings (never null or undefined)
    // Ensure no null/undefined values - convert any to empty strings
    const finalColorsToSave = validatedColors.map((c) => {
      if (c === null || c === undefined || typeof c !== "string") {
        return "";
      }
      return c;
    });

    console.log("updateOrganizationColors input", {
      orgId: args.organizationId,
      rawColors: args.colors,
      validatedColors,
      finalColorsToSave,
      userId: user._id,
    });

    // Check if user is owner or admin of this organization
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
      throw new Error("You are not a member of this organization");
    }

    const role = memberResult.role;
    if (role !== "owner" && role !== "admin") {
      throw new Error("Only organization owners and admins can update colors");
    }

    // Update the organization colors using Better Auth component adapter
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "organization",
        where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
        update: {
          colors: finalColorsToSave,
        },
      },
    });

    // Read back to confirm persisted value
    const updatedOrg = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "organization",
        where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
      }
    );
    console.log("updateOrganizationColors persisted", {
      orgId: args.organizationId,
      colors: updatedOrg?.colors,
    });

    return null;
  },
});

/**
 * Update organization social links and website
 * Only organization owners and admins can update these fields
 */
export const updateOrganizationSocialLinks = mutation({
  args: {
    organizationId: v.string(),
    website: v.optional(v.union(v.null(), v.string())),
    socialLinks: v.object({
      facebook: v.optional(v.union(v.null(), v.string())),
      twitter: v.optional(v.union(v.null(), v.string())),
      instagram: v.optional(v.union(v.null(), v.string())),
      linkedin: v.optional(v.union(v.null(), v.string())),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check if user is owner or admin of this organization
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
      throw new Error("You are not a member of this organization");
    }

    const role = memberResult.role;
    if (role !== "owner" && role !== "admin") {
      throw new Error(
        "Only organization owners and admins can update social links"
      );
    }

    // Prepare update object
    const update: Record<string, string | null> = {};

    if (args.website !== undefined) {
      update.website = args.website || null;
    }

    if (args.socialLinks.facebook !== undefined) {
      update.socialFacebook = args.socialLinks.facebook || null;
    }
    if (args.socialLinks.twitter !== undefined) {
      update.socialTwitter = args.socialLinks.twitter || null;
    }
    if (args.socialLinks.instagram !== undefined) {
      update.socialInstagram = args.socialLinks.instagram || null;
    }
    if (args.socialLinks.linkedin !== undefined) {
      update.socialLinkedin = args.socialLinks.linkedin || null;
    }

    // Update the organization using Better Auth component adapter
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "organization",
        where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
        update,
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
