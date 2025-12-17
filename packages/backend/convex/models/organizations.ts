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

    // Execute comprehensive data cleanup
    const orgId = request.organizationId;

    // 1. Delete all players and related data for this org
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
      }

      // Delete development goals for this player
      const goals = await ctx.db
        .query("developmentGoals")
        .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
        .collect();
      for (const goal of goals) {
        await ctx.db.delete(goal._id);
      }

      // Delete medical profiles for this player
      const medicalProfiles = await ctx.db
        .query("medicalProfiles")
        .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
        .collect();
      for (const profile of medicalProfiles) {
        await ctx.db.delete(profile._id);
      }

      // Delete team-player associations
      const teamPlayers = await ctx.db
        .query("teamPlayers")
        .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
        .collect();
      for (const tp of teamPlayers) {
        await ctx.db.delete(tp._id);
      }

      // Delete the player
      await ctx.db.delete(player._id);
    }
    console.log(`[approveDeletionRequest] Deleted ${players.length} players`);

    // 2. Delete coach assignments
    const coachAssignments = await ctx.db
      .query("coachAssignments")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();
    for (const ca of coachAssignments) {
      await ctx.db.delete(ca._id);
    }
    console.log(
      `[approveDeletionRequest] Deleted ${coachAssignments.length} coach assignments`
    );

    // 3. Delete team goals
    const teamGoals = await ctx.db
      .query("teamGoals")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();
    for (const tg of teamGoals) {
      await ctx.db.delete(tg._id);
    }
    console.log(
      `[approveDeletionRequest] Deleted ${teamGoals.length} team goals`
    );

    // 4. Delete voice notes (and their audio storage)
    const voiceNotes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect();
    for (const vn of voiceNotes) {
      // Delete audio file from storage if exists
      if (vn.audioStorageId) {
        try {
          await ctx.storage.delete(vn.audioStorageId);
        } catch (e) {
          console.warn(
            `[approveDeletionRequest] Failed to delete audio file: ${vn.audioStorageId}`
          );
        }
      }
      await ctx.db.delete(vn._id);
    }
    console.log(
      `[approveDeletionRequest] Deleted ${voiceNotes.length} voice notes`
    );

    // 5. Delete join requests for this org
    const joinRequests = await ctx.db
      .query("orgJoinRequests")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();
    for (const jr of joinRequests) {
      await ctx.db.delete(jr._id);
    }
    console.log(
      `[approveDeletionRequest] Deleted ${joinRequests.length} join requests`
    );

    // 6. Delete approval actions audit trail
    const approvalActions = await ctx.db
      .query("approvalActions")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", orgId))
      .collect();
    for (const aa of approvalActions) {
      await ctx.db.delete(aa._id);
    }
    console.log(
      `[approveDeletionRequest] Deleted ${approvalActions.length} approval actions`
    );

    // 7. Delete the organization using Better Auth (cascades members, teams, invitations)
    await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "organization",
        where: [{ field: "_id", value: orgId, operator: "eq" }],
      },
    });
    console.log(`[approveDeletionRequest] Deleted organization ${orgId}`);

    // 8. Mark deletion request as completed
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
