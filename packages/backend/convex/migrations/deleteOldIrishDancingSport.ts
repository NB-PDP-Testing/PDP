/**
 * Delete old irish-dancing (hyphen) sport and all associated data
 * Part of Option 3B consolidation: keep only irish_dancing (underscore)
 * Run with: npx convex run migrations/deleteOldIrishDancingSport:run --prod
 */

import { internalMutation } from "../_generated/server";

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting cleanup of old irish-dancing (hyphen) sport...");

    // 1. Delete benchmarks (should be 0 but check anyway)
    const benchmarks = await ctx.db
      .query("skillBenchmarks")
      .filter((q) => q.eq(q.field("sportCode"), "irish-dancing"))
      .collect();

    for (const benchmark of benchmarks) {
      await ctx.db.delete(benchmark._id);
    }
    console.log(`Deleted ${benchmarks.length} benchmarks`);

    // 2. Delete skill definitions
    const skills = await ctx.db
      .query("skillDefinitions")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", "irish-dancing"))
      .collect();

    for (const skill of skills) {
      await ctx.db.delete(skill._id);
    }
    console.log(`Deleted ${skills.length} skill definitions`);

    // 3. Delete categories
    const categories = await ctx.db
      .query("skillCategories")
      .filter((q) => q.eq(q.field("sportCode"), "irish-dancing"))
      .collect();

    for (const category of categories) {
      await ctx.db.delete(category._id);
    }
    console.log(`Deleted ${categories.length} categories`);

    // 4. Delete the sport itself
    const sport = await ctx.db
      .query("sports")
      .filter((q) => q.eq(q.field("code"), "irish-dancing"))
      .first();

    if (sport) {
      await ctx.db.delete(sport._id);
      console.log("Deleted sport: irish-dancing");
    } else {
      console.log("Sport irish-dancing not found (already deleted?)");
    }

    console.log("\n✅ Cleanup complete!");
    console.log("Remaining: irish_dancing (underscore) with unified system");

    return {
      deleted: {
        sport: sport ? 1 : 0,
        categories: categories.length,
        skills: skills.length,
        benchmarks: benchmarks.length,
      },
    };
  },
});
