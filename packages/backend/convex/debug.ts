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
        hasDescriptors: !!s.level1Descriptor,
      })),
      benchmarksCount: benchmarks.length,
    };
  },
});

export const getRugbySkillCodes = query({
  args: {},
  handler: async (ctx) => {
    const skills = await ctx.db
      .query("skillDefinitions")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", "rugby"))
      .collect();

    return skills.map((s) => ({
      name: s.name,
      code: s.code,
    }));
  },
});

export const verifyRugbyBenchmarks = query({
  args: {},
  handler: async (ctx) => {
    // Get total count
    const allBenchmarks = await ctx.db
      .query("skillBenchmarks")
      .filter((q) => q.eq(q.field("sportCode"), "rugby"))
      .collect();

    // Get sample benchmarks
    const sampleU10 = await ctx.db
      .query("skillBenchmarks")
      .withIndex("by_context", (q) =>
        q
          .eq("sportCode", "rugby")
          .eq("skillCode", "tackle_technique")
          .eq("ageGroup", "U10")
          .eq("gender", "all")
          .eq("level", "recreational")
      )
      .first();

    const sampleU16Elite = await ctx.db
      .query("skillBenchmarks")
      .withIndex("by_context", (q) =>
        q
          .eq("sportCode", "rugby")
          .eq("skillCode", "tackle_technique")
          .eq("ageGroup", "U16")
          .eq("gender", "male")
          .eq("level", "elite")
      )
      .first();

    // Count by gender
    const genderAll = allBenchmarks.filter((b) => b.gender === "all").length;
    const genderMale = allBenchmarks.filter((b) => b.gender === "male").length;
    const genderFemale = allBenchmarks.filter(
      (b) => b.gender === "female"
    ).length;

    return {
      totalCount: allBenchmarks.length,
      genderBreakdown: {
        all: genderAll,
        male: genderMale,
        female: genderFemale,
      },
      sampleU10: sampleU10
        ? {
            skillCode: sampleU10.skillCode,
            ageGroup: sampleU10.ageGroup,
            gender: sampleU10.gender,
            level: sampleU10.level,
            expectedRating: sampleU10.expectedRating,
            notes: sampleU10.notes,
          }
        : null,
      sampleU16Elite: sampleU16Elite
        ? {
            skillCode: sampleU16Elite.skillCode,
            ageGroup: sampleU16Elite.ageGroup,
            gender: sampleU16Elite.gender,
            level: sampleU16Elite.level,
            expectedRating: sampleU16Elite.expectedRating,
            notes: sampleU16Elite.notes,
          }
        : null,
    };
  },
});
