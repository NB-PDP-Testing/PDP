/**
 * Initial setup for Irish Dancing sport
 * Creates sport, categories, and skill definitions
 * Run with: npx convex run migrations/setupIrishDancing:run --prod
 */

import descriptorsData from "../../scripts/irish-dancing-level-descriptors-UPDATE.json";
import { internalMutation } from "../_generated/server";

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    console.log("Starting Irish Dancing setup...");

    // 1. Create sport if it doesn't exist
    const existingSport = await ctx.db
      .query("sports")
      .filter((q) => q.eq(q.field("code"), "irish_dancing"))
      .first();

    let sportId;
    if (existingSport) {
      sportId = existingSport._id;
      console.log("Sport already exists, skipping creation");
    } else {
      sportId = await ctx.db.insert("sports", {
        name: "Irish Dancing",
        code: "irish_dancing",
        description:
          "Traditional Irish solo and team dancing with CLRG competition structure",
        isActive: true,
        createdAt: now,
      });
      console.log(`Created sport: Irish Dancing (${sportId})`);
    }

    // 2. Create categories and skills from descriptors file
    const sport = descriptorsData.sports[0];
    let categoriesCreated = 0;
    let skillsCreated = 0;

    for (const category of sport.categories) {
      // Check if category exists
      const existingCategory = await ctx.db
        .query("skillCategories")
        .filter(
          (q) =>
            q.eq(q.field("sportCode"), "irish_dancing") &&
            q.eq(q.field("name"), category.name)
        )
        .first();

      let categoryId;
      if (existingCategory) {
        categoryId = existingCategory._id;
      } else {
        // Create category code from name
        const categoryCode = category.name
          .toLowerCase()
          .replace(/&/g, "and")
          .replace(/\s+/g, "_");

        categoryId = await ctx.db.insert("skillCategories", {
          sportCode: "irish_dancing",
          name: category.name,
          code: categoryCode,
          description: `${category.name} skills for Irish Dancing`,
          sortOrder: categoriesCreated,
          isActive: true,
          createdAt: now,
        });
        categoriesCreated++;
        console.log(`Created category: ${category.name}`);
      }

      // Create skills for this category
      let skillOrder = 0;
      for (const skill of category.skills) {
        // Create skill code from name
        const skillCode = skill.name
          .toLowerCase()
          .replace(/&/g, "and")
          .replace(/\//g, "_")
          .replace(/\s+/g, "_");

        // Check if skill exists
        const existingSkill = await ctx.db
          .query("skillDefinitions")
          .withIndex("by_sportCode_and_code", (q) =>
            q.eq("sportCode", "irish_dancing").eq("code", skillCode)
          )
          .first();

        if (!existingSkill) {
          await ctx.db.insert("skillDefinitions", {
            sportCode: "irish_dancing",
            categoryId,
            name: skill.name,
            code: skillCode,
            description: `${skill.name} assessment for Irish Dancing`,
            sortOrder: skillOrder,
            level1Descriptor: skill.level1Descriptor,
            level2Descriptor: skill.level2Descriptor,
            level3Descriptor: skill.level3Descriptor,
            level4Descriptor: skill.level4Descriptor,
            level5Descriptor: skill.level5Descriptor,
            isActive: true,
            createdAt: now,
          });
          skillsCreated++;
          skillOrder++;

          if (skillsCreated % 5 === 0) {
            console.log(`Progress: ${skillsCreated} skills created...`);
          }
        }
      }
    }

    console.log("\nSetup complete!");
    console.log(`Categories created: ${categoriesCreated}`);
    console.log(`Skills created: ${skillsCreated}`);

    return {
      categoriesCreated,
      skillsCreated,
    };
  },
});
