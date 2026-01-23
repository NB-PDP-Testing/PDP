/**
 * Debug script to check if coach user exists in Better Auth
 * Run with: npx convex run scripts/debugCoachUser:checkCoach
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

export const checkCoach = query({
  args: {
    coachId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`Checking for coach with ID: ${args.coachId}`);

    // Try findOne
    const user1 = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "id", value: args.coachId, operator: "eq" }],
    });

    console.log("Result from findOne:", user1);

    // Try findMany
    const users = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      where: [{ field: "id", value: args.coachId, operator: "eq" }],
    });

    console.log("Result from findMany:", users);

    return {
      findOne: user1,
      findMany: users,
      exists: !!user1,
    };
  },
});
