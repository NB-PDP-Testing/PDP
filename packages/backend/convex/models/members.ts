import type { Member } from "better-auth/plugins";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";

/**
 * Organization member management functions
 * These functions query the Better Auth member table to get organization members with their roles
 */

/**
 * Get all members for an organization with their user details
 */
export const getMembersByOrganization = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all members for the organization
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
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    const members = membersResult.page;

    // Fetch user details for each member
    const membersWithUsers = await Promise.all(
      members.map(async (member: Member) => {
        const userResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [
              {
                field: "_id",
                value: member.userId,
                operator: "eq",
              },
            ],
          }
        );
        return {
          ...member,
          user: userResult,
        };
      })
    );

    return membersWithUsers;
  },
});

/**
 * Get members count by role for an organization
 */
export const getMemberCountsByRole = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    total: v.number(),
    owner: v.number(),
    admin: v.number(),
    member: v.number(),
    coach: v.number(),
    parent: v.number(),
  }),
  handler: async (ctx, args) => {
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
            value: args.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    const members = membersResult.page;
    const counts = {
      total: members.length,
      owner: 0,
      admin: 0,
      member: 0,
      coach: 0,
      parent: 0,
    };

    for (const member of members) {
      const role = member.role.toLowerCase();
      if (role === "owner") {
        counts.owner += 1;
      } else if (role === "admin") {
        counts.admin += 1;
      } else if (role === "coach") {
        counts.coach += 1;
      } else if (role === "parent") {
        counts.parent += 1;
      } else if (role === "member") {
        counts.member += 1;
      }
    }

    return counts;
  },
});

/**
 * Get members by specific role
 */
export const getMembersByRole = query({
  args: {
    organizationId: v.string(),
    role: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
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
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "role",
            value: args.role,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    const members = membersResult.page;

    // Fetch user details for each member
    const membersWithUsers = await Promise.all(
      members.map(async (member: Member) => {
        const userResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [
              {
                field: "_id",
                value: member.userId,
                operator: "eq",
              },
            ],
          }
        );
        return {
          ...member,
          user: userResult,
        };
      })
    );

    return membersWithUsers;
  },
});

/**
 * Update a member's functional roles (coach, parent, admin capabilities)
 * This is separate from their Better Auth org role (owner/admin/member)
 */
export const updateMemberFunctionalRoles = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    functionalRoles: v.array(
      v.union(v.literal("coach"), v.literal("parent"), v.literal("admin"))
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find the member record
    const memberResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "userId",
            value: args.userId,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!memberResult) {
      throw new Error("Member not found");
    }

    // Update functional roles using the adapter
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: memberResult._id, operator: "eq" }],
        update: {
          functionalRoles: args.functionalRoles,
        },
      },
    });

    return null;
  },
});

/**
 * Get members with their coach assignments and player links
 * This provides all data needed for the user management dashboard
 */
export const getMembersWithDetails = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all members with user details
    const members = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "member",
      paginationOpts: {
        cursor: null,
        numItems: 1000,
      },
      where: [
        {
          field: "organizationId",
          value: args.organizationId,
          operator: "eq",
        },
      ],
    });

    // Fetch additional details for each member
    const membersWithDetails = await Promise.all(
      members.page.map(async (member: Member) => {
        // Get user details
        const userResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [
              {
                field: "_id",
                value: member.userId,
                operator: "eq",
              },
            ],
          }
        );

        // Get functional roles (default to empty array if not set)
        const functionalRoles = (member as any).functionalRoles || [];

        // Get coach assignments if they have coach functional role
        let coachAssignments = null;
        if (functionalRoles.includes("coach")) {
          coachAssignments = await ctx.db
            .query("coachAssignments")
            .withIndex("by_user_and_org", (q) =>
              q
                .eq("userId", member.userId)
                .eq("organizationId", args.organizationId)
            )
            .first();
        }

        // Get linked players if they have parent functional role
        let linkedPlayers: any[] = [];
        if (functionalRoles.includes("parent") && userResult?.email) {
          const userEmail = userResult.email.toLowerCase().trim();
          linkedPlayers = await ctx.db
            .query("players")
            .withIndex("by_organizationId", (q) =>
              q.eq("organizationId", args.organizationId)
            )
            .filter((q) => {
              // Check if user email matches any parent email in the player record
              return q.or(
                q.eq(q.field("parentEmail"), userEmail),
                q.eq(q.field("inferredParentEmail"), userEmail)
              );
            })
            .take(50);
        }

        return {
          ...member,
          functionalRoles,
          user: userResult,
          coachAssignments,
          linkedPlayers,
        };
      })
    );

    return membersWithDetails;
  },
});

/**
 * Get all pending invitations for an organization
 * Returns invitations with inviter user details
 */
export const getPendingInvitations = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    // Get all pending invitations for the organization
    const invitationsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "invitation",
        paginationOpts: {
          cursor: null,
          numItems: 1000,
        },
        where: [
          {
            field: "organizationId",
            value: args.organizationId,
            operator: "eq",
          },
          {
            field: "status",
            value: "pending",
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    const invitations = invitationsResult.page;

    // Fetch inviter details for each invitation
    const invitationsWithInviter = await Promise.all(
      invitations.map(async (invitation: any) => {
        const inviterResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [
              {
                field: "_id",
                value: invitation.inviterId,
                operator: "eq",
              },
            ],
          }
        );

        // Check if invitation is expired
        const now = Date.now();
        const isExpired = invitation.expiresAt < now;

        return {
          ...invitation,
          inviter: inviterResult,
          isExpired,
        };
      })
    );

    return invitationsWithInviter;
  },
});

/**
 * Cancel a pending invitation
 */
export const cancelInvitation = mutation({
  args: {
    invitationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find the invitation
    const invitationResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "invitation",
        where: [
          {
            field: "_id",
            value: args.invitationId,
            operator: "eq",
          },
        ],
      }
    );

    if (!invitationResult) {
      throw new Error("Invitation not found");
    }

    if (invitationResult.status !== "pending") {
      throw new Error("Only pending invitations can be cancelled");
    }

    // Update invitation status to cancelled
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "invitation",
        where: [{ field: "_id", value: args.invitationId, operator: "eq" }],
        update: {
          status: "cancelled",
        },
      },
    });

    return null;
  },
});

/**
 * Resend an invitation email
 * This schedules an action to resend the email
 */
export const resendInvitation = mutation({
  args: {
    invitationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find the invitation
    const invitationResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "invitation",
        where: [
          {
            field: "_id",
            value: args.invitationId,
            operator: "eq",
          },
        ],
      }
    );

    if (!invitationResult) {
      throw new Error("Invitation not found");
    }

    if (invitationResult.status !== "pending") {
      throw new Error("Only pending invitations can be resent");
    }

    // Check if invitation is expired
    const now = Date.now();
    if (invitationResult.expiresAt < now) {
      throw new Error(
        "Cannot resend expired invitation. Please send a new invitation."
      );
    }

    // Get organization details
    const orgResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "organization",
        where: [
          {
            field: "_id",
            value: invitationResult.organizationId,
            operator: "eq",
          },
        ],
      }
    );

    // Get inviter details
    const inviterResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "_id",
            value: invitationResult.inviterId,
            operator: "eq",
          },
        ],
      }
    );

    // Schedule action to resend email
    const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
    const inviteLink = `${siteUrl}/orgs/accept-invitation/${args.invitationId}`;

    // Schedule the action to resend email
    const actionRef = (internal.actions as any).invitations
      ?.resendInvitationEmail;

    if (actionRef) {
      await ctx.scheduler.runAfter(0, actionRef, {
        email: invitationResult.email,
        invitedByUsername: inviterResult?.name || "Someone",
        invitedByEmail: inviterResult?.email || "",
        organizationName: orgResult?.name || "Organization",
        inviteLink,
        role: invitationResult.role || undefined,
      });
    } else {
      console.warn(
        "⚠️ resendInvitationEmail action not found. Email will not be sent."
      );
    }

    return null;
  },
});
