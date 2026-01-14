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
      supportedSports: v.optional(v.array(v.string())),
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
      supportedSports: org.supportedSports as string[] | undefined,
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
 * Update organization supported sports
 * Allows setting which sports the organization supports (multi-sport organizations)
 * Only organization owners and admins can update supported sports
 */
export const updateOrganizationSports = mutation({
  args: {
    organizationId: v.string(),
    supportedSports: v.array(v.string()), // Array of sport codes: ["gaa_football", "hurling", etc.]
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
        "Only organization owners and admins can update supported sports"
      );
    }

    // Validate sport codes exist in the sports table
    if (args.supportedSports.length > 0) {
      for (const sportCode of args.supportedSports) {
        const sport = await ctx.db
          .query("sports")
          .withIndex("by_code", (q) => q.eq("code", sportCode))
          .first();

        if (!sport) {
          throw new Error(
            `Invalid sport code: ${sportCode}. Please select from available sports.`
          );
        }
      }
    }

    // Update the organization using Better Auth component adapter
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "organization",
        where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
        update: {
          supportedSports: args.supportedSports,
        },
      },
    });

    console.log(
      `[updateOrganizationSports] Updated supported sports for org ${args.organizationId}:`,
      args.supportedSports
    );

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

// ============ ORGANIZATION DELETION REQUEST WORKFLOW ============

/**
 * Request organization deletion (owner only)
 * Creates a pending request that must be approved by platform staff
 */
export const requestOrganizationDeletion = mutation({
  args: {
    organizationId: v.string(),
    reason: v.string(),
  },
  returns: v.id("orgDeletionRequests"),
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
          { field: "userId", value: user._id, operator: "eq" },
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
      throw new Error(
        "Only organization owners can request organization deletion"
      );
    }

    // Check for existing pending request
    const existingRequest = await ctx.db
      .query("orgDeletionRequests")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "approved")
        )
      )
      .first();

    if (existingRequest) {
      throw new Error(
        "There is already a pending or approved deletion request for this organization"
      );
    }

    // Get organization details
    const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "_id", value: args.organizationId, operator: "eq" }],
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    // Get data summary for audit purposes
    const membersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: { cursor: null, numItems: 1000 },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    const players = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const teamsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "team",
        paginationOpts: { cursor: null, numItems: 1000 },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    // Count coaches and parents from members
    const members = membersResult.page || [];
    const coachCount = members.filter((m: any) =>
      m.functionalRoles?.includes("coach")
    ).length;
    const parentCount = members.filter((m: any) =>
      m.functionalRoles?.includes("parent")
    ).length;

    // Create deletion request
    const requestId = await ctx.db.insert("orgDeletionRequests", {
      organizationId: args.organizationId,
      organizationName: org.name as string,
      organizationLogo: org.logo as string | undefined,
      requestedBy: user._id,
      requestedByEmail: user.email,
      requestedByName: user.name || "Unknown",
      reason: args.reason,
      status: "pending",
      requestedAt: Date.now(),
      dataSummary: {
        memberCount: members.length,
        playerCount: players.length,
        teamCount: teamsResult.page?.length || 0,
        coachCount,
        parentCount,
      },
    });

    console.log(
      `[requestOrganizationDeletion] Deletion request created for org ${org.name} (${args.organizationId}) by ${user.email}`
    );

    return requestId;
  },
});

/**
 * Get deletion request status for an organization
 */
export const getDeletionRequest = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("orgDeletionRequests"),
      status: v.string(),
      reason: v.string(),
      requestedAt: v.number(),
      requestedByName: v.string(),
      rejectionReason: v.optional(v.string()),
      reviewedAt: v.optional(v.number()),
      reviewedByName: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("orgDeletionRequests")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    if (!request) {
      return null;
    }

    return {
      _id: request._id,
      status: request.status,
      reason: request.reason,
      requestedAt: request.requestedAt,
      requestedByName: request.requestedByName,
      rejectionReason: request.rejectionReason,
      reviewedAt: request.reviewedAt,
      reviewedByName: request.reviewedByName,
    };
  },
});

/**
 * Cancel a deletion request (owner only)
 */
export const cancelDeletionRequest = mutation({
  args: {
    requestId: v.id("orgDeletionRequests"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Deletion request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Only pending requests can be cancelled");
    }

    if (request.requestedBy !== user._id) {
      throw new Error("Only the requester can cancel the deletion request");
    }

    await ctx.db.patch(args.requestId, {
      status: "cancelled",
    });

    console.log(
      `[cancelDeletionRequest] Deletion request ${args.requestId} cancelled by ${user.email}`
    );

    return null;
  },
});

/**
 * Get all pending deletion requests (platform staff only)
 */
export const getPendingDeletionRequests = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("orgDeletionRequests"),
      organizationId: v.string(),
      organizationName: v.string(),
      organizationLogo: v.optional(v.string()),
      requestedBy: v.string(),
      requestedByEmail: v.string(),
      requestedByName: v.string(),
      reason: v.string(),
      status: v.string(),
      requestedAt: v.number(),
      dataSummary: v.optional(
        v.object({
          memberCount: v.number(),
          playerCount: v.number(),
          teamCount: v.number(),
          coachCount: v.number(),
          parentCount: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.isPlatformStaff) {
      throw new Error("Only platform staff can view deletion requests");
    }

    const requests = await ctx.db
      .query("orgDeletionRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    return requests.map((r) => ({
      _id: r._id,
      organizationId: r.organizationId,
      organizationName: r.organizationName,
      organizationLogo: r.organizationLogo,
      requestedBy: r.requestedBy,
      requestedByEmail: r.requestedByEmail,
      requestedByName: r.requestedByName,
      reason: r.reason,
      status: r.status,
      requestedAt: r.requestedAt,
      dataSummary: r.dataSummary,
    }));
  },
});

/**
 * Approve a deletion request (platform staff only)
 * This executes the full deletion with data cleanup
 */
export const approveDeletionRequest = mutation({
  args: {
    requestId: v.id("orgDeletionRequests"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    if (!user.isPlatformStaff) {
      throw new Error("Only platform staff can approve deletion requests");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Deletion request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Only pending requests can be approved");
    }

    // Mark as approved first
    await ctx.db.patch(args.requestId, {
      status: "approved",
      reviewedAt: Date.now(),
      reviewedBy: user._id,
      reviewedByName: user.name || "Unknown",
      reviewedByEmail: user.email,
    });

    console.log(
      `[approveDeletionRequest] Request ${args.requestId} approved by ${user.email}, executing deletion...`
    );

    // Execute comprehensive data cleanup for identity system
    const orgId = request.organizationId;

    console.log(`⚠️  Clearing data for org: ${orgId}`);

    const deleted = {
      // Identity system tables
      orgPlayerEnrollments: 0,
      teamPlayerIdentities: 0,
      sportPassports: 0,
      playerIdentitiesOrphaned: 0,
      guardianIdentitiesOrphaned: 0,
      guardianPlayerLinks: 0,
      // Legacy tables
      players: 0,
      injuries: 0,
      developmentGoals: 0,
      medicalProfiles: 0,
      teamPlayers: 0,
      // Org-scoped tables
      coachAssignments: 0,
      teamGoals: 0,
      voiceNotes: 0,
      joinRequests: 0,
      approvalActions: 0,
    };

    // === IDENTITY SYSTEM CLEANUP ===

    // 1. Get all teams for this org (needed for junction table cleanup)
    const teams = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "team",
      paginationOpts: { cursor: null, numItems: 1000 },
      where: [{ field: "organizationId", value: orgId, operator: "eq" }],
    });

    // 2. Delete team-player assignments for this org's teams
    console.log("Deleting team player identities...");
    for (const team of teams.page || []) {
      const teamPlayers = await ctx.db
        .query("teamPlayerIdentities")
        .withIndex("by_teamId", (q) => q.eq("teamId", team._id as string))
        .collect();

      for (const record of teamPlayers) {
        await ctx.db.delete(record._id);
        deleted.teamPlayerIdentities++;
      }
    }

    // 3. Delete sport passports for this org
    console.log("Deleting sport passports...");
    const sportPassports = await ctx.db
      .query("sportPassports")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();
    for (const record of sportPassports) {
      await ctx.db.delete(record._id);
      deleted.sportPassports++;
    }

    // 4. Delete org enrollments and track player IDs
    console.log("Deleting org player enrollments...");
    const enrollments = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();

    const enrolledPlayerIds = enrollments.map((e) => e.playerIdentityId);

    for (const record of enrollments) {
      await ctx.db.delete(record._id);
      deleted.orgPlayerEnrollments++;
    }

    // 5. Check for orphaned player identities (no enrollments in any org)
    console.log("Checking for orphaned player identities...");
    for (const playerId of enrolledPlayerIds) {
      const remainingEnrollments = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_playerIdentityId", (q) =>
          q.eq("playerIdentityId", playerId)
        )
        .collect();

      if (remainingEnrollments.length === 0) {
        // This player is not enrolled in any other org
        // Delete guardian-player links first
        const guardianLinks = await ctx.db
          .query("guardianPlayerLinks")
          .withIndex("by_player", (q) => q.eq("playerIdentityId", playerId))
          .collect();

        for (const link of guardianLinks) {
          await ctx.db.delete(link._id);
          deleted.guardianPlayerLinks++;
        }

        // Delete the player identity
        await ctx.db.delete(playerId);
        deleted.playerIdentitiesOrphaned++;
      }
    }

    // 6. Check for orphaned guardian identities (no linked players)
    console.log("Checking for orphaned guardian identities...");
    const allGuardians = await ctx.db.query("guardianIdentities").collect();
    for (const guardian of allGuardians) {
      const links = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian", (q) =>
          q.eq("guardianIdentityId", guardian._id)
        )
        .collect();

      if (links.length === 0) {
        await ctx.db.delete(guardian._id);
        deleted.guardianIdentitiesOrphaned++;
      }
    }

    // === LEGACY TABLE CLEANUP ===

    // 7. Delete all legacy players and related data for this org
    console.log("Deleting legacy players and related data...");
    const players = await ctx.db
      .query("players")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();

    for (const player of players) {
      // Delete injuries for this player
      const injuries = await ctx.db
        .query("injuries")
        .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
        .collect();
      for (const injury of injuries) {
        await ctx.db.delete(injury._id);
        deleted.injuries++;
      }

      // Delete development goals for this player
      const goals = await ctx.db
        .query("developmentGoals")
        .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
        .collect();
      for (const goal of goals) {
        await ctx.db.delete(goal._id);
        deleted.developmentGoals++;
      }

      // Delete medical profiles for this player
      const medicalProfiles = await ctx.db
        .query("medicalProfiles")
        .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
        .collect();
      for (const profile of medicalProfiles) {
        await ctx.db.delete(profile._id);
        deleted.medicalProfiles++;
      }

      // Delete team-player associations
      const teamPlayers = await ctx.db
        .query("teamPlayers")
        .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
        .collect();
      for (const tp of teamPlayers) {
        await ctx.db.delete(tp._id);
        deleted.teamPlayers++;
      }

      // Delete the player
      await ctx.db.delete(player._id);
      deleted.players++;
    }

    // === ORG-SCOPED DATA CLEANUP ===

    // 8. Delete coach assignments
    console.log("Deleting coach assignments...");
    const coachAssignments = await ctx.db
      .query("coachAssignments")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();
    for (const ca of coachAssignments) {
      await ctx.db.delete(ca._id);
      deleted.coachAssignments++;
    }

    // 9. Delete team goals
    console.log("Deleting team goals...");
    const teamGoals = await ctx.db
      .query("teamGoals")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();
    for (const tg of teamGoals) {
      await ctx.db.delete(tg._id);
      deleted.teamGoals++;
    }

    // 10. Delete voice notes (and their audio storage)
    console.log("Deleting voice notes...");
    const voiceNotes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect();
    for (const vn of voiceNotes) {
      // Delete audio file from storage if exists
      if (vn.audioStorageId) {
        try {
          await ctx.storage.delete(vn.audioStorageId);
        } catch (_e) {
          console.warn(
            `[approveDeletionRequest] Failed to delete audio file: ${vn.audioStorageId}`
          );
        }
      }
      await ctx.db.delete(vn._id);
      deleted.voiceNotes++;
    }

    // 11. Delete join requests for this org
    console.log("Deleting join requests...");
    const joinRequests = await ctx.db
      .query("orgJoinRequests")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();
    for (const jr of joinRequests) {
      await ctx.db.delete(jr._id);
      deleted.joinRequests++;
    }

    // 12. Delete approval actions audit trail
    console.log("Deleting approval actions...");
    const approvalActions = await ctx.db
      .query("approvalActions")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();
    for (const aa of approvalActions) {
      await ctx.db.delete(aa._id);
      deleted.approvalActions++;
    }

    console.log("✅ Org data cleanup complete!");
    console.log("Deleted:", deleted);

    // 13. Delete the organization using Better Auth (cascades members, teams, invitations)
    await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "organization",
        where: [{ field: "_id", value: orgId, operator: "eq" }],
      },
    });
    console.log(`[approveDeletionRequest] Deleted organization ${orgId}`);

    // 14. Mark deletion request as completed
    await ctx.db.patch(args.requestId, {
      status: "completed",
      completedAt: Date.now(),
    });

    console.log(
      `[approveDeletionRequest] Organization ${request.organizationName} (${orgId}) fully deleted`
    );

    return null;
  },
});

/**
 * Reject a deletion request (platform staff only)
 */
export const rejectDeletionRequest = mutation({
  args: {
    requestId: v.id("orgDeletionRequests"),
    rejectionReason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    if (!user.isPlatformStaff) {
      throw new Error("Only platform staff can reject deletion requests");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Deletion request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Only pending requests can be rejected");
    }

    await ctx.db.patch(args.requestId, {
      status: "rejected",
      rejectionReason: args.rejectionReason,
      reviewedAt: Date.now(),
      reviewedBy: user._id,
      reviewedByName: user.name || "Unknown",
      reviewedByEmail: user.email,
    });

    console.log(
      `[rejectDeletionRequest] Request ${args.requestId} rejected by ${user.email}: ${args.rejectionReason}`
    );

    return null;
  },
});

/**
 * Delete an organization (DEPRECATED - use requestOrganizationDeletion)
 * Kept for backwards compatibility but now throws an error
 */
export const deleteOrganization = mutation({
  args: {
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async () => {
    throw new Error(
      "Direct organization deletion is no longer supported. Please use the deletion request workflow which requires platform staff approval."
    );
  },
});
