/**
 * Compare the two Irish Dancing sports (hyphen vs underscore)
 * Run with: npx convex run migrations/compareIrishDancing:run --prod
 */

import { query } from "../_generated/server";

export const run = query({
  args: {},
  handler: async (ctx) => {
    const hyphenCategories = await ctx.db
      .query("skillCategories")
      .filter((q) => q.eq(q.field("sportCode"), "irish-dancing"))
      .collect();
    const underscoreCategories = await ctx.db
      .query("skillCategories")
      .filter((q) => q.eq(q.field("sportCode"), "irish_dancing"))
      .collect();

    const hyphenSkills = await ctx.db
      .query("skillDefinitions")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", "irish-dancing"))
      .collect();
    const underscoreSkills = await ctx.db
      .query("skillDefinitions")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", "irish_dancing"))
      .collect();

    const hyphenBenchmarks = await ctx.db
      .query("skillBenchmarks")
      .filter((q) => q.eq(q.field("sportCode"), "irish-dancing"))
      .collect();
    const underscoreBenchmarks = await ctx.db
      .query("skillBenchmarks")
      .filter((q) => q.eq(q.field("sportCode"), "irish_dancing"))
      .collect();

    return {
      "irish-dancing (hyphen)": {
        categories: hyphenCategories.length,
        categoryNames: hyphenCategories.map((c) => c.name),
        skills: hyphenSkills.length,
        skillNames: hyphenSkills.slice(0, 10).map((s) => s.name),
        benchmarks: hyphenBenchmarks.length,
      },
      "irish_dancing (underscore - NEW)": {
        categories: underscoreCategories.length,
        categoryNames: underscoreCategories.map((c) => c.name),
        skills: underscoreSkills.length,
        skillNames: underscoreSkills.slice(0, 10).map((s) => s.name),
        benchmarks: underscoreBenchmarks.length,
      },
    };
  },
});
