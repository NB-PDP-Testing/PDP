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

    const member = memberResult as any;
    const hasAdminAccess =
      member &&
      (member.role === "admin" ||
        member.role === "owner" ||
        member.functionalRoles?.includes("admin"));

    if (!hasAdminAccess) {
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

    if (
      !memberResult ||
      (memberResult.role !== "admin" && memberResult.role !== "owner")
    ) {
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
    if (functionalRoles.includes("parent") && args.linkedPlayerIds?.length) {
      const normalizedEmail = request.userEmail.toLowerCase().trim();

      // Get all players from the organization to find matches
      const allPlayers = await ctx.db
        .query("players")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", request.organizationId)
        )
        .collect();
      const playerMap = new Map(allPlayers.map((p) => [p._id.toString(), p]));

      // Link each player to the parent
      let linked = 0;
      for (const playerId of args.linkedPlayerIds) {
        const player = playerMap.get(playerId);
        if (player && !player.parentEmail) {
          await ctx.db.patch(player._id, {
            parentEmail: normalizedEmail,
          });
          linked += 1;
        }
      }
      console.log(
        `[approveJoinRequest] Linked ${linked} players to parent ${request.userEmail}`
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

    if (
      !memberResult ||
      (memberResult.role !== "admin" && memberResult.role !== "owner")
    ) {
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
