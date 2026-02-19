// @ts-nocheck
/**
 * List all users to see what IDs exist
 * Run with: npx convex run scripts/listUsers:list
 */

import { query } from "../_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Query Better Auth user table directly via component
    // Note: Better Auth tables are in the component, not in our schema
    const users = await ctx.db.query("user" as any).collect();

    console.log(`Found ${users.length} users:`);
    for (const user of users) {
      console.log(
        `- ID: ${user._id}, email: ${(user as any).email}, name: ${(user as any).name || `${(user as any).firstName} ${(user as any).lastName}`}`
      );
    }

    return users.map((u) => ({
      id: u._id,
      email: (u as any).email,
      name: (u as any).name,
      firstName: (u as any).firstName,
      lastName: (u as any).lastName,
    }));
  },
});
