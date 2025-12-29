import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

/**
 * Quick diagnostic to check a specific user's roles
 */
export const checkNeilsRoles = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const email = "neil.barlow@gmail.com";

    // Find user by email
    const userResult = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [
          {
            field: "email",
            value: email,
            operator: "eq",
          },
        ],
      }
    );

    if (!userResult) {
      return { error: "User not found" };
    }

    // Find member record
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
            value: userResult._id,
            operator: "eq",
            connector: "AND",
          },
        ],
      }
    );

    if (!memberResult) {
      return { error: "Member not found in this organization" };
    }

    // Check for coach assignment
    const coachAssignment = await ctx.db
      .query("coachAssignments")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", userResult._id).eq("organizationId", args.organizationId)
      )
      .first();

    return {
      email: userResult.email,
      userId: userResult._id,
      betterAuthRole: memberResult.role,
      functionalRoles: (memberResult as any).functionalRoles || [],
      activeFunctionalRole: (memberResult as any).activeFunctionalRole || null,
      hasCoachAssignment: !!coachAssignment,
      coachAssignment: coachAssignment
        ? {
            teams: coachAssignment.teams,
            ageGroups: coachAssignment.ageGroups,
            sport: coachAssignment.sport,
          }
        : null,
    };
  },
});
