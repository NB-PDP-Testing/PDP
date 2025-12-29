import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../_generated/server";

/**
 * Direct mutation to fix Neil's functional roles
 * This bypasses the UI and directly updates the member record
 */
export const addCoachRoleToNeil = mutation({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    previousRoles: v.array(v.string()),
    newRoles: v.array(v.string()),
    message: v.string(),
  }),
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
      return {
        success: false,
        previousRoles: [],
        newRoles: [],
        message: "User not found",
      };
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
      return {
        success: false,
        previousRoles: [],
        newRoles: [],
        message: "Member not found in organization",
      };
    }

    const currentRoles: string[] = (memberResult as any).functionalRoles || [];

    // Add coach and admin if not already present
    const rolesToAdd = ["coach", "admin"];
    const newRoles = [...new Set([...currentRoles, ...rolesToAdd])] as (
      | "parent"
      | "coach"
      | "admin"
      | "player"
    )[];

    // Update the member record
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: memberResult._id, operator: "eq" }],
        update: {
          functionalRoles: newRoles,
        },
      },
    });

    console.log(
      `[fixNeilsRoles] Updated functional roles for ${email}: ${currentRoles.join(", ")} -> ${newRoles.join(", ")}`
    );

    return {
      success: true,
      previousRoles: currentRoles,
      newRoles,
      message: `Successfully added coach and admin roles. Previous: [${currentRoles.join(", ")}], New: [${newRoles.join(", ")}]`,
    };
  },
});
