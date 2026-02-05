import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

/**
 * Organization join request management functions
 */

/**
 * Create a join request for an organization
 *
 * Architecture Note:
 * - requestedRole is the Better Auth hierarchy role (auto-inferred from functional roles)
 *   - If "admin" in functional roles → requestedRole = "admin"
 *   - Otherwise → requestedRole = "member"
 * - requestedFunctionalRoles contains the functional capabilities (coach, parent, admin)
 * - See: docs/COMPREHENSIVE_AUTH_PLAN.md for architecture details
 */
export const createJoinRequest = mutation({
  args: {
    organizationId: v.string(),
    // Better Auth hierarchy role - auto-inferred from functional roles
    requestedRole: v.union(
      v.literal("member"),
      v.literal("admin"),
      v.literal("coach"), // Deprecated, kept for backwards compatibility
      v.literal("parent") // Deprecated, kept for backwards compatibility
    ),
    // Functional roles (capabilities) - includes admin, coach, parent, player
    requestedFunctionalRoles: v.optional(
      v.array(
        v.union(
          v.literal("coach"),
          v.literal("parent"),
          v.literal("admin"),
          v.literal("player")
        )
      )
    ),
    message: v.optional(v.string()),

    // Parent-specific fields for smart matching
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    // JSON string of [{name, age, team?}] - children info for matching
    children: v.optional(v.string()),

    // Coach-specific fields
    coachSport: v.optional(v.string()),
    coachGender: v.optional(v.string()),
    coachTeams: v.optional(v.string()),
    coachAgeGroups: v.optional(v.string()),
  },
  returns: v.id("orgJoinRequests"),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check if user already has a pending request for this org
    const existingRequest = await ctx.db
      .query("orgJoinRequests")
      .withIndex("by_userId_and_organizationId", (q) =>
        q.eq("userId", user._id).eq("organizationId", args.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingRequest) {
      throw new Error(
        "You already have a pending request for this organization"
      );
    }

    // Check if user is already a member
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

    if (memberResult) {
      throw new Error("You are already a member of this organization");
    }

    // Get organization details
    const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [
        {
          field: "_id",
          value: args.organizationId,
          operator: "eq",
        },
      ],
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    // Handle backwards compatibility:
    // If old-style requestedRole is "coach" or "parent", convert to functional roles
    let functionalRoles = args.requestedFunctionalRoles || [];
    if (args.requestedRole === "coach" && !functionalRoles.includes("coach")) {
      functionalRoles = [...functionalRoles, "coach"];
    }
    if (
      args.requestedRole === "parent" &&
      !functionalRoles.includes("parent")
    ) {
      functionalRoles = [...functionalRoles, "parent"];
    }

    // Auto-infer Better Auth hierarchy role from functional roles:
    // - If "admin" in functional roles → requestedRole = "admin"
    // - Otherwise → requestedRole = "member"
    const betterAuthRole: "member" | "admin" =
      functionalRoles.includes("admin") || args.requestedRole === "admin"
        ? "admin"
        : "member";

    // Create the join request
    return await ctx.db.insert("orgJoinRequests", {
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      organizationId: args.organizationId,
      organizationName: org.name,
      requestedRole: betterAuthRole, // Auto-inferred from functional roles
      requestedFunctionalRoles: functionalRoles, // Store functional roles separately
      status: "pending",
      message: args.message,
      requestedAt: Date.now(),

      // Parent-specific fields for smart matching
      phone: args.phone,
      address: args.address,
      children: args.children,

      // Coach-specific fields
      coachSport: args.coachSport,
      coachGender: args.coachGender,
      coachTeams: args.coachTeams,
      coachAgeGroups: args.coachAgeGroups,
    });
  },
});

/**
 * Get all pending join requests for an organization
 * Limited to 100 most recent pending requests to reduce bandwidth usage
 */
export const getPendingRequestsForOrg = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check if user is admin or owner of the organization
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

    // Check Better Auth role OR functional admin role
    const betterAuthRole = memberResult?.role;
    const functionalRoles = (memberResult as any)?.functionalRoles || [];
    const hasAdminAccess =
      betterAuthRole === "admin" ||
      betterAuthRole === "owner" ||
      functionalRoles.includes("admin");

    if (!(memberResult && hasAdminAccess)) {
      throw new Error("You must be an admin or owner to view join requests");
    }

    return await ctx.db
      .query("orgJoinRequests")
      .withIndex("by_organizationId_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "pending")
      )
      .order("desc")
      .take(1000);
  },
});

/**
 * Get all join requests for the current user
 * Limited to 50 most recent requests to reduce bandwidth usage
 */
export const getUserJoinRequests = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return [];
    }

    return await ctx.db
      .query("orgJoinRequests")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});

/**
 * Get pending join requests for the current user
 * Limited to 50 most recent pending requests to reduce bandwidth usage
 */
export const getUserPendingRequests = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return [];
    }

    return await ctx.db
      .query("orgJoinRequests")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("desc")
      .take(50);
  },
});

/**
 * Approve a join request
 *
 * Architecture Note:
 * - Creates member with Better Auth role "member" (hierarchy)
 * - Sets functionalRoles array based on requested functional roles
 * - Can optionally configure role-specific data:
 *   - For coaches: teams to assign
 *   - For parents: players to link
 * - See: docs/COMPREHENSIVE_AUTH_PLAN.md
 */
export const approveJoinRequest = mutation({
  args: {
    requestId: v.id("orgJoinRequests"),
    // Optional role configuration
    coachTeams: v.optional(v.array(v.string())), // Team names/IDs for coaches
    linkedPlayerIds: v.optional(v.array(v.string())), // Player IDs for parents
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Join request not found");
    }

    if (request.status !== "pending") {
      throw new Error("This request has already been processed");
    }

    // Check if user is admin or owner of the organization
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
            value: request.organizationId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    // Check Better Auth role OR functional admin role
    const callerRole = memberResult?.role;
    const callerFunctionalRoles = (memberResult as any)?.functionalRoles || [];
    const hasAdminAccess =
      callerRole === "admin" ||
      callerRole === "owner" ||
      callerFunctionalRoles.includes("admin");

    if (!(memberResult && hasAdminAccess)) {
      throw new Error("You must be an admin or owner to approve join requests");
    }

    // Determine functional roles to assign
    // Use requestedFunctionalRoles if available, otherwise infer from legacy requestedRole
    let functionalRoles: ("coach" | "parent" | "admin" | "player")[] =
      (request.requestedFunctionalRoles as (
        | "coach"
        | "parent"
        | "admin"
        | "player"
      )[]) || [];
    if (functionalRoles.length === 0) {
      // Legacy support: convert old-style requestedRole to functional roles
      if (request.requestedRole === "coach") {
        functionalRoles = ["coach"];
      } else if (request.requestedRole === "parent") {
        functionalRoles = ["parent"];
      } else if (request.requestedRole === "admin") {
        functionalRoles = ["admin"];
      }
    }

    // Determine Better Auth hierarchy role from requested role
    // If user requested admin, they get admin role; otherwise member
    const betterAuthRole: "member" | "admin" =
      request.requestedRole === "admin" ? "admin" : "member";

    // Add user to organization
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "member",
        data: {
          userId: request.userId,
          organizationId: request.organizationId,
          role: betterAuthRole, // Auto-inferred from request
          functionalRoles, // Functional roles (capabilities)
          createdAt: Date.now(),
        },
      },
    });

    // Create coach assignment if coach role and teams provided
    if (functionalRoles.includes("coach") && args.coachTeams?.length) {
      // Check if coach assignment already exists
      const existingAssignment = await ctx.db
        .query("coachAssignments")
        .withIndex("by_user_and_org", (q) =>
          q
            .eq("userId", request.userId)
            .eq("organizationId", request.organizationId)
        )
        .first();

      if (existingAssignment) {
        // Merge teams
        const mergedTeams = [
          ...new Set([...existingAssignment.teams, ...args.coachTeams]),
        ];
        await ctx.db.patch(existingAssignment._id, {
          teams: mergedTeams,
          updatedAt: Date.now(),
        });
      } else {
        // Create new assignment
        await ctx.db.insert("coachAssignments", {
          userId: request.userId,
          organizationId: request.organizationId,
          teams: args.coachTeams,
          ageGroups: [], // Will be populated based on teams later
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      console.log(
        `[approveJoinRequest] Created coach assignment with teams: ${args.coachTeams.join(", ")}`
      );
    }

    // Link parent to players if parent role and player IDs provided
    // Phase 0.8: Create proper guardianIdentity and guardianPlayerLinks
    if (functionalRoles.includes("parent") && args.linkedPlayerIds?.length) {
      const normalizedEmail = request.userEmail.toLowerCase().trim();

      // Get user details for guardian identity
      const requestUser = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "user",
          where: [{ field: "_id", value: request.userId, operator: "eq" }],
        }
      );

      // Parse user name into first/last
      const userName =
        (requestUser as { name?: string })?.name || request.userName || "";
      const nameParts = userName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Find existing guardian identity for this user, or create one
      let guardianIdentityId: string;
      const existingGuardian = await ctx.db
        .query("guardianIdentities")
        .withIndex("by_userId", (q) => q.eq("userId", request.userId))
        .first();

      if (existingGuardian) {
        guardianIdentityId = existingGuardian._id;
      } else {
        // Also check by email for unclaimed guardian identities
        const emailGuardian = await ctx.db
          .query("guardianIdentities")
          .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
          .first();

        if (emailGuardian && !emailGuardian.userId) {
          // Claim existing unclaimed guardian identity
          await ctx.db.patch(emailGuardian._id, {
            userId: request.userId,
            updatedAt: Date.now(),
          });
          guardianIdentityId = emailGuardian._id;
        } else {
          // Create new guardian identity
          guardianIdentityId = await ctx.db.insert("guardianIdentities", {
            firstName,
            lastName,
            email: normalizedEmail,
            phone: request.phone || (requestUser as { phone?: string })?.phone,
            address:
              request.address || (requestUser as { address?: string })?.address,
            userId: request.userId,
            verificationStatus: "unverified",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdFrom: "registration",
          });
        }
      }

      // Create guardianPlayerLinks for each selected player
      let linked = 0;
      for (const playerId of args.linkedPlayerIds) {
        // Verify the player identity exists
        const playerIdentity = await ctx.db.get(playerId as any);
        if (!playerIdentity) {
          console.warn(
            `[approveJoinRequest] Player identity not found: ${playerId}`
          );
          continue;
        }

        // Check if link already exists
        const existingLink = await ctx.db
          .query("guardianPlayerLinks")
          .withIndex("by_guardian_and_player", (q) =>
            q
              .eq("guardianIdentityId", guardianIdentityId as any)
              .eq("playerIdentityId", playerId as any)
          )
          .first();

        if (existingLink) {
          console.log(
            `[approveJoinRequest] Link already exists for player: ${playerId}`
          );
          continue;
        }

        // Create the guardian-player link
        await ctx.db.insert("guardianPlayerLinks", {
          guardianIdentityId: guardianIdentityId as any,
          playerIdentityId: playerId as any,
          relationship: "guardian",
          isPrimary: linked === 0, // First linked player is primary
          hasParentalResponsibility: true,
          canCollectFromTraining: true,
          consentedToSharing: false,
          status: "active",
          acknowledgedByParentAt: Date.now(), // Admin approved = parent confirmed
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        linked += 1;
      }
      console.log(
        `[approveJoinRequest] Created ${linked} guardianPlayerLinks for parent ${request.userEmail}`
      );
    }

    // Copy phone and address from join request to user profile
    // This ensures the profile completion step shows pre-filled values
    if (request.phone || request.address) {
      const updateData: Record<string, unknown> = {
        updatedAt: Date.now(),
      };

      // Only copy if the join request has these values
      if (request.phone) {
        updateData.phone = request.phone;
      }
      if (request.address) {
        updateData.address = request.address;
      }

      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "user",
          where: [{ field: "_id", value: request.userId, operator: "eq" }],
          update: updateData,
        },
      });

      console.log(
        `[approveJoinRequest] Copied contact info to user profile: phone=${!!request.phone}, address=${!!request.address}`
      );
    }

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "approved",
      reviewedAt: Date.now(),
      reviewedBy: user._id,
      reviewerName: user.name,
    });

    return null;
  },
});

/**
 * Reject a join request
 */
export const rejectJoinRequest = mutation({
  args: {
    requestId: v.id("orgJoinRequests"),
    rejectionReason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Join request not found");
    }

    if (request.status !== "pending") {
      throw new Error("This request has already been processed");
    }

    // Check if user is admin or owner of the organization
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
            value: request.organizationId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    // Check Better Auth role OR functional admin role
    const betterAuthRole = memberResult?.role;
    const adminFunctionalRoles = (memberResult as any)?.functionalRoles || [];
    const hasAdminAccess =
      betterAuthRole === "admin" ||
      betterAuthRole === "owner" ||
      adminFunctionalRoles.includes("admin");

    if (!(memberResult && hasAdminAccess)) {
      throw new Error("You must be an admin or owner to reject join requests");
    }

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "rejected",
      rejectionReason: args.rejectionReason,
      reviewedAt: Date.now(),
      reviewedBy: user._id,
      reviewerName: user.name,
    });

    return null;
  },
});

/**
 * Cancel a join request (by the requester)
 */
export const cancelJoinRequest = mutation({
  args: {
    requestId: v.id("orgJoinRequests"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Join request not found");
    }

    if (request.userId !== user._id) {
      throw new Error("You can only cancel your own requests");
    }

    if (request.status !== "pending") {
      throw new Error("You can only cancel pending requests");
    }

    await ctx.db.delete(args.requestId);
    return null;
  },
});

/**
 * Get all organizations (for join page)
 */
export const getAllOrganizations = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "organization",
      paginationOpts: {
        cursor: null,
        numItems: 1000,
      },
    });
    return result.page;
  },
});
