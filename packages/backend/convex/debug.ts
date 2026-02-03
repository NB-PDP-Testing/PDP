import { query } from "./_generated/server";

export const getGAAFootballSkills = query({
  args: {},
  handler: async (ctx) => {
    const skills = await ctx.db
      .query("skillDefinitions")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", "gaa_football"))
      .collect();

    return skills.map((s) => ({
      name: s.name,
      code: s.code,
      level1Descriptor: s.level1Descriptor ? "HAS" : "NULL",
      level5Descriptor: s.level5Descriptor ? "HAS" : "NULL",
    }));
  },
});

export const verifyGAABenchmarks = query({
  args: {},
  handler: async (ctx) => {
    // Get total count
    const allBenchmarks = await ctx.db
      .query("skillBenchmarks")
      .filter((q) => q.eq(q.field("sportCode"), "gaa_football"))
      .collect();

    // Get sample benchmark
    const sampleBenchmark = await ctx.db
      .query("skillBenchmarks")
      .withIndex("by_context", (q) =>
        q
          .eq("sportCode", "gaa_football")
          .eq("skillCode", "soloing")
          .eq("ageGroup", "U16")
          .eq("gender", "all")
          .eq("level", "competitive")
      )
      .first();

    return {
      totalCount: allBenchmarks.length,
      sampleBenchmark: sampleBenchmark
        ? {
            skillCode: sampleBenchmark.skillCode,
            ageGroup: sampleBenchmark.ageGroup,
            level: sampleBenchmark.level,
            expectedRating: sampleBenchmark.expectedRating,
            notes: sampleBenchmark.notes,
          }
        : null,
    };
  },
});

export const getRugbySkills = query({
  args: {},
  handler: async (ctx) => {
    // Get sport info
    const sport = await ctx.db
      .query("sports")
      .filter((q) => q.eq(q.field("code"), "rugby"))
      .first();

    // Get categories
    const categories = await ctx.db
      .query("skillCategories")
      .filter((q) => q.eq(q.field("sportCode"), "rugby"))
      .collect();

    // Get skills
    const skills = await ctx.db
      .query("skillDefinitions")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", "rugby"))
      .collect();

    // Get benchmarks count
    const benchmarks = await ctx.db
      .query("skillBenchmarks")
      .filter((q) => q.eq(q.field("sportCode"), "rugby"))
      .collect();

    return {
      sport: sport ? { code: sport.code, name: sport.name } : null,
      categoriesCount: categories.length,
      categories: categories.map((c) => ({
        name: c.name,
        code: c.code,
      })),
      skillsCount: skills.length,
      skills: skills.map((s) => ({
        name: s.name,
        code: s.code,
        categoryId: s.categoryId,
        hasDescriptors: s.level1Descriptor ? true : false,
      })),
      benchmarksCount: benchmarks.length,
    };
  },
});
