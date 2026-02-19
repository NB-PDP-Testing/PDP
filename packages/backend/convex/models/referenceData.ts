// @ts-nocheck
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, mutation, query } from "../_generated/server";
import { getAgeGroupRank } from "../lib/ageGroupUtils";

// ============================================================
// ADMIN MUTATIONS - Sports
// ============================================================

/**
 * Create a new sport (platform admin only)
 */
export const createSport = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    governingBody: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.id("sports"),
  handler: async (ctx, args) => {
    // Check for duplicate code
    const existing = await ctx.db
      .query("sports")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (existing) {
      throw new Error(`Sport with code '${args.code}' already exists`);
    }

    return await ctx.db.insert("sports", {
      code: args.code,
      name: args.name,
      governingBody: args.governingBody,
      description: args.description,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

/**
 * Preview the impact of changing a sport code
 * Shows how many categories and skills would be affected
 */
export const previewSportCodeChange = query({
  args: {
    sportId: v.id("sports"),
    newCode: v.string(),
  },
  returns: v.object({
    categoriesAffected: v.number(),
    skillsAffected: v.number(),
    wouldConflict: v.boolean(),
    conflictingSportName: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const sport = await ctx.db.get(args.sportId);
    if (!sport) {
      throw new Error("Sport not found");
    }

    // Check if new code already exists in another sport
    const conflict = await ctx.db
      .query("sports")
      .withIndex("by_code", (q) => q.eq("code", args.newCode))
      .first();

    // Count affected categories
    const categories = await ctx.db
      .query("skillCategories")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", sport.code))
      .collect();

    // Count affected skills
    const skills = await ctx.db
      .query("skillDefinitions")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", sport.code))
      .collect();

    return {
      categoriesAffected: categories.length,
      skillsAffected: skills.length,
      wouldConflict: !!conflict && conflict._id !== args.sportId,
      conflictingSportName:
        conflict && conflict._id !== args.sportId ? conflict.name : undefined,
    };
  },
});

/**
 * Update an existing sport (platform admin only)
 * Supports changing the code with automatic cascade updates
 */
export const updateSport = mutation({
  args: {
    sportId: v.id("sports"),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    governingBody: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.sportId);
    if (!existing) {
      throw new Error("Sport not found");
    }

    // If code is changing, validate and cascade updates
    if (args.code !== undefined && args.code !== existing.code) {
      const newCode = args.code;
      // Check for conflicts with existing sports
      const conflict = await ctx.db
        .query("sports")
        .withIndex("by_code", (q) => q.eq("code", newCode))
        .first();

      if (conflict && conflict._id !== args.sportId) {
        throw new Error(
          `Sport code '${newCode}' is already used by sport '${conflict.name}'`
        );
      }

      // Cascade update to all skill categories
      const categories = await ctx.db
        .query("skillCategories")
        .withIndex("by_sportCode", (q) => q.eq("sportCode", existing.code))
        .collect();

      for (const category of categories) {
        await ctx.db.patch(category._id, { sportCode: newCode });
      }

      // Cascade update to all skill definitions
      const skills = await ctx.db
        .query("skillDefinitions")
        .withIndex("by_sportCode", (q) => q.eq("sportCode", existing.code))
        .collect();

      for (const skill of skills) {
        await ctx.db.patch(skill._id, { sportCode: newCode });
      }
    }

    // Update the sport itself
    const updates: Record<string, unknown> = {};
    if (args.code !== undefined) {
      updates.code = args.code;
    }
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.governingBody !== undefined) {
      updates.governingBody = args.governingBody;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }

    await ctx.db.patch(args.sportId, updates);
    return null;
  },
});

/**
 * Deactivate a sport (soft delete - platform admin only)
 */
export const deactivateSport = mutation({
  args: { sportId: v.id("sports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.sportId);
    if (!existing) {
      throw new Error("Sport not found");
    }

    await ctx.db.patch(args.sportId, { isActive: false });
    return null;
  },
});

/**
 * Preview the impact of deleting a sport
 * Shows how many categories and skills would be deleted
 */
export const previewSportDeletion = query({
  args: {
    sportId: v.id("sports"),
  },
  returns: v.object({
    categoriesCount: v.number(),
    skillsCount: v.number(),
    sportCode: v.string(),
    sportName: v.string(),
  }),
  handler: async (ctx, args) => {
    const sport = await ctx.db.get(args.sportId);
    if (!sport) {
      throw new Error("Sport not found");
    }

    // Count categories
    const categories = await ctx.db
      .query("skillCategories")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", sport.code))
      .collect();

    // Count skills
    const skills = await ctx.db
      .query("skillDefinitions")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", sport.code))
      .collect();

    return {
      categoriesCount: categories.length,
      skillsCount: skills.length,
      sportCode: sport.code,
      sportName: sport.name,
    };
  },
});

/**
 * Delete a sport and all associated categories and skills (platform admin only)
 * This is a hard delete - use with caution!
 */
export const deleteSport = mutation({
  args: {
    sportId: v.id("sports"),
  },
  returns: v.object({
    categoriesDeleted: v.number(),
    skillsDeleted: v.number(),
  }),
  handler: async (ctx, args) => {
    const sport = await ctx.db.get(args.sportId);
    if (!sport) {
      throw new Error("Sport not found");
    }

    // Delete all skill definitions for this sport
    const skills = await ctx.db
      .query("skillDefinitions")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", sport.code))
      .collect();

    for (const skill of skills) {
      await ctx.db.delete(skill._id);
    }

    // Delete all skill categories for this sport
    const categories = await ctx.db
      .query("skillCategories")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", sport.code))
      .collect();

    for (const category of categories) {
      await ctx.db.delete(category._id);
    }

    // Delete the sport itself
    await ctx.db.delete(args.sportId);

    return {
      categoriesDeleted: categories.length,
      skillsDeleted: skills.length,
    };
  },
});

/**
 * Reactivate a sport (platform admin only)
 */
export const reactivateSport = mutation({
  args: { sportId: v.id("sports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.sportId);
    if (!existing) {
      throw new Error("Sport not found");
    }

    await ctx.db.patch(args.sportId, { isActive: true });
    return null;
  },
});

// ============================================================
// ADMIN MUTATIONS - Skill Categories
// ============================================================

/**
 * Create a new skill category (platform admin only)
 */
export const createSkillCategory = mutation({
  args: {
    sportCode: v.string(),
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
  },
  returns: v.id("skillCategories"),
  handler: async (ctx, args) => {
    // Verify sport exists
    const sport = await ctx.db
      .query("sports")
      .withIndex("by_code", (q) => q.eq("code", args.sportCode))
      .first();

    if (!sport) {
      throw new Error(`Sport with code '${args.sportCode}' not found`);
    }

    // Check for duplicate category code within sport
    const existing = await ctx.db
      .query("skillCategories")
      .withIndex("by_sportCode_and_code", (q) =>
        q.eq("sportCode", args.sportCode).eq("code", args.code)
      )
      .first();

    if (existing) {
      throw new Error(
        `Category '${args.code}' already exists for sport '${args.sportCode}'`
      );
    }

    return await ctx.db.insert("skillCategories", {
      sportCode: args.sportCode,
      code: args.code,
      name: args.name,
      description: args.description,
      sortOrder: args.sortOrder,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update a skill category (platform admin only)
 */
export const updateSkillCategory = mutation({
  args: {
    categoryId: v.id("skillCategories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.categoryId);
    if (!existing) {
      throw new Error("Skill category not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }
    if (args.sortOrder !== undefined) {
      updates.sortOrder = args.sortOrder;
    }

    await ctx.db.patch(args.categoryId, updates);
    return null;
  },
});

/**
 * Deactivate a skill category (platform admin only)
 */
export const deactivateSkillCategory = mutation({
  args: { categoryId: v.id("skillCategories") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.categoryId);
    if (!existing) {
      throw new Error("Skill category not found");
    }

    await ctx.db.patch(args.categoryId, { isActive: false });
    return null;
  },
});

/**
 * Preview the impact of deleting a skill category
 * Shows how many skills would be deleted
 */
export const previewCategoryDeletion = query({
  args: {
    categoryId: v.id("skillCategories"),
  },
  returns: v.object({
    skillsCount: v.number(),
    categoryCode: v.string(),
    categoryName: v.string(),
  }),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Count skills in this category
    const skills = await ctx.db
      .query("skillDefinitions")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    return {
      skillsCount: skills.length,
      categoryCode: category.code,
      categoryName: category.name,
    };
  },
});

/**
 * Delete a skill category and all associated skills (platform admin only)
 * This is a hard delete - use with caution!
 */
export const deleteSkillCategory = mutation({
  args: {
    categoryId: v.id("skillCategories"),
  },
  returns: v.object({
    skillsDeleted: v.number(),
  }),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Delete all skills in this category
    const skills = await ctx.db
      .query("skillDefinitions")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    for (const skill of skills) {
      await ctx.db.delete(skill._id);
    }

    // Delete the category itself
    await ctx.db.delete(args.categoryId);

    return {
      skillsDeleted: skills.length,
    };
  },
});

// ============================================================
// ADMIN MUTATIONS - Skill Definitions
// ============================================================

/**
 * Create a new skill definition (platform admin only)
 */
export const createSkillDefinition = mutation({
  args: {
    categoryId: v.id("skillCategories"),
    code: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    level1Descriptor: v.optional(v.string()),
    level2Descriptor: v.optional(v.string()),
    level3Descriptor: v.optional(v.string()),
    level4Descriptor: v.optional(v.string()),
    level5Descriptor: v.optional(v.string()),
    ageGroupRelevance: v.optional(v.array(v.string())),
    sortOrder: v.number(),
  },
  returns: v.id("skillDefinitions"),
  handler: async (ctx, args) => {
    // Verify category exists and get sport code
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Skill category not found");
    }

    // Check for duplicate skill code within sport
    const existing = await ctx.db
      .query("skillDefinitions")
      .withIndex("by_sportCode_and_code", (q) =>
        q.eq("sportCode", category.sportCode).eq("code", args.code)
      )
      .first();

    if (existing) {
      throw new Error(
        `Skill '${args.code}' already exists for sport '${category.sportCode}'`
      );
    }

    return await ctx.db.insert("skillDefinitions", {
      categoryId: args.categoryId,
      sportCode: category.sportCode,
      code: args.code,
      name: args.name,
      description: args.description,
      level1Descriptor: args.level1Descriptor,
      level2Descriptor: args.level2Descriptor,
      level3Descriptor: args.level3Descriptor,
      level4Descriptor: args.level4Descriptor,
      level5Descriptor: args.level5Descriptor,
      ageGroupRelevance: args.ageGroupRelevance,
      sortOrder: args.sortOrder,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update a skill definition (platform admin only)
 */
export const updateSkillDefinition = mutation({
  args: {
    skillId: v.id("skillDefinitions"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    level1Descriptor: v.optional(v.string()),
    level2Descriptor: v.optional(v.string()),
    level3Descriptor: v.optional(v.string()),
    level4Descriptor: v.optional(v.string()),
    level5Descriptor: v.optional(v.string()),
    ageGroupRelevance: v.optional(v.array(v.string())),
    sortOrder: v.optional(v.number()),
    categoryId: v.optional(v.id("skillCategories")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.skillId);
    if (!existing) {
      throw new Error("Skill definition not found");
    }

    // If changing category, verify it exists and matches sport
    if (args.categoryId) {
      const newCategory = await ctx.db.get(args.categoryId);
      if (!newCategory) {
        throw new Error("Target category not found");
      }
      if (newCategory.sportCode !== existing.sportCode) {
        throw new Error("Cannot move skill to a category in a different sport");
      }
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }
    if (args.level1Descriptor !== undefined) {
      updates.level1Descriptor = args.level1Descriptor;
    }
    if (args.level2Descriptor !== undefined) {
      updates.level2Descriptor = args.level2Descriptor;
    }
    if (args.level3Descriptor !== undefined) {
      updates.level3Descriptor = args.level3Descriptor;
    }
    if (args.level4Descriptor !== undefined) {
      updates.level4Descriptor = args.level4Descriptor;
    }
    if (args.level5Descriptor !== undefined) {
      updates.level5Descriptor = args.level5Descriptor;
    }
    if (args.ageGroupRelevance !== undefined) {
      updates.ageGroupRelevance = args.ageGroupRelevance;
    }
    if (args.sortOrder !== undefined) {
      updates.sortOrder = args.sortOrder;
    }
    if (args.categoryId !== undefined) {
      updates.categoryId = args.categoryId;
    }

    await ctx.db.patch(args.skillId, updates);
    return null;
  },
});

/**
 * Deactivate a skill definition (platform admin only)
 */
export const deactivateSkillDefinition = mutation({
  args: { skillId: v.id("skillDefinitions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.skillId);
    if (!existing) {
      throw new Error("Skill definition not found");
    }

    await ctx.db.patch(args.skillId, { isActive: false });
    return null;
  },
});

/**
 * Delete a skill definition (platform admin only)
 * This is a hard delete - use with caution!
 */
export const deleteSkillDefinition = mutation({
  args: {
    skillId: v.id("skillDefinitions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const skill = await ctx.db.get(args.skillId);
    if (!skill) {
      throw new Error("Skill not found");
    }

    // Delete the skill
    await ctx.db.delete(args.skillId);

    return null;
  },
});

// ============================================================
// ADMIN MUTATIONS - Bulk Import
// ============================================================

/**
 * Import skills for a sport from JSON structure (platform admin only)
 * This allows importing skills from governing body standards
 */
export const importSkillsForSport = mutation({
  args: {
    sportCode: v.string(),
    categories: v.array(
      v.object({
        code: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        sortOrder: v.number(),
        skills: v.array(
          v.object({
            code: v.string(),
            name: v.string(),
            description: v.optional(v.string()),
            level1Descriptor: v.optional(v.string()),
            level2Descriptor: v.optional(v.string()),
            level3Descriptor: v.optional(v.string()),
            level4Descriptor: v.optional(v.string()),
            level5Descriptor: v.optional(v.string()),
            ageGroupRelevance: v.optional(v.array(v.string())),
            sortOrder: v.number(),
          })
        ),
      })
    ),
    replaceExisting: v.optional(v.boolean()),
  },
  returns: v.object({
    categoriesCreated: v.number(),
    categoriesUpdated: v.number(),
    skillsCreated: v.number(),
    skillsUpdated: v.number(),
  }),
  handler: async (ctx, args) => {
    // Verify sport exists
    const sport = await ctx.db
      .query("sports")
      .withIndex("by_code", (q) => q.eq("code", args.sportCode))
      .first();

    if (!sport) {
      throw new Error(`Sport with code '${args.sportCode}' not found`);
    }

    let categoriesCreated = 0;
    let categoriesUpdated = 0;
    let skillsCreated = 0;
    let skillsUpdated = 0;

    for (const categoryData of args.categories) {
      // Find or create category
      let categoryId: Id<"skillCategories">;
      const existingCategory = await ctx.db
        .query("skillCategories")
        .withIndex("by_sportCode_and_code", (q) =>
          q.eq("sportCode", args.sportCode).eq("code", categoryData.code)
        )
        .first();

      if (existingCategory) {
        categoryId = existingCategory._id;
        if (args.replaceExisting) {
          await ctx.db.patch(categoryId, {
            name: categoryData.name,
            description: categoryData.description,
            sortOrder: categoryData.sortOrder,
            isActive: true,
          });
          categoriesUpdated += 1;
        }
      } else {
        categoryId = await ctx.db.insert("skillCategories", {
          sportCode: args.sportCode,
          code: categoryData.code,
          name: categoryData.name,
          description: categoryData.description,
          sortOrder: categoryData.sortOrder,
          isActive: true,
          createdAt: Date.now(),
        });
        categoriesCreated += 1;
      }

      // Process skills in this category
      for (const skillData of categoryData.skills) {
        const existingSkill = await ctx.db
          .query("skillDefinitions")
          .withIndex("by_sportCode_and_code", (q) =>
            q.eq("sportCode", args.sportCode).eq("code", skillData.code)
          )
          .first();

        if (existingSkill) {
          if (args.replaceExisting) {
            await ctx.db.patch(existingSkill._id, {
              categoryId,
              name: skillData.name,
              description: skillData.description,
              level1Descriptor: skillData.level1Descriptor,
              level2Descriptor: skillData.level2Descriptor,
              level3Descriptor: skillData.level3Descriptor,
              level4Descriptor: skillData.level4Descriptor,
              level5Descriptor: skillData.level5Descriptor,
              ageGroupRelevance: skillData.ageGroupRelevance,
              sortOrder: skillData.sortOrder,
              isActive: true,
            });
            skillsUpdated += 1;
          }
        } else {
          await ctx.db.insert("skillDefinitions", {
            categoryId,
            sportCode: args.sportCode,
            code: skillData.code,
            name: skillData.name,
            description: skillData.description,
            level1Descriptor: skillData.level1Descriptor,
            level2Descriptor: skillData.level2Descriptor,
            level3Descriptor: skillData.level3Descriptor,
            level4Descriptor: skillData.level4Descriptor,
            level5Descriptor: skillData.level5Descriptor,
            ageGroupRelevance: skillData.ageGroupRelevance,
            sortOrder: skillData.sortOrder,
            isActive: true,
            createdAt: Date.now(),
          });
          skillsCreated += 1;
        }
      }
    }

    return {
      categoriesCreated,
      categoriesUpdated,
      skillsCreated,
      skillsUpdated,
    };
  },
});

/**
 * Bulk import complete skills data from export format
 * Imports multiple sports at once from the complete export structure
 */
export const bulkImportCompleteSkillsData = mutation({
  args: {
    sports: v.array(
      v.object({
        sportCode: v.string(),
        categories: v.array(
          v.object({
            code: v.string(),
            name: v.string(),
            description: v.optional(v.string()),
            sortOrder: v.number(),
            skills: v.array(
              v.object({
                code: v.string(),
                name: v.string(),
                description: v.optional(v.string()),
                level1Descriptor: v.optional(v.string()),
                level2Descriptor: v.optional(v.string()),
                level3Descriptor: v.optional(v.string()),
                level4Descriptor: v.optional(v.string()),
                level5Descriptor: v.optional(v.string()),
                ageGroupRelevance: v.optional(v.array(v.string())),
                sortOrder: v.number(),
              })
            ),
          })
        ),
      })
    ),
    replaceExisting: v.optional(v.boolean()),
  },
  returns: v.object({
    sportsProcessed: v.number(),
    categoriesCreated: v.number(),
    categoriesUpdated: v.number(),
    skillsCreated: v.number(),
    skillsUpdated: v.number(),
    errors: v.array(
      v.object({
        sportCode: v.string(),
        error: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    let sportsProcessed = 0;
    let totalCategoriesCreated = 0;
    let totalCategoriesUpdated = 0;
    let totalSkillsCreated = 0;
    let totalSkillsUpdated = 0;
    const errors: Array<{ sportCode: string; error: string }> = [];

    for (const sportData of args.sports) {
      try {
        // Verify sport exists
        const sport = await ctx.db
          .query("sports")
          .withIndex("by_code", (q) => q.eq("code", sportData.sportCode))
          .first();

        if (!sport) {
          errors.push({
            sportCode: sportData.sportCode,
            error: `Sport with code '${sportData.sportCode}' not found`,
          });
          continue;
        }

        // Import categories and skills for this sport
        let categoriesCreated = 0;
        let categoriesUpdated = 0;
        let skillsCreated = 0;
        let skillsUpdated = 0;

        for (const categoryData of sportData.categories) {
          // Find or create category
          let categoryId: Id<"skillCategories">;
          const existingCategory = await ctx.db
            .query("skillCategories")
            .withIndex("by_sportCode_and_code", (q) =>
              q
                .eq("sportCode", sportData.sportCode)
                .eq("code", categoryData.code)
            )
            .first();

          if (existingCategory) {
            categoryId = existingCategory._id;
            if (args.replaceExisting) {
              await ctx.db.patch(categoryId, {
                name: categoryData.name,
                description: categoryData.description,
                sortOrder: categoryData.sortOrder,
                isActive: true,
              });
              categoriesUpdated += 1;
            }
          } else {
            categoryId = await ctx.db.insert("skillCategories", {
              sportCode: sportData.sportCode,
              code: categoryData.code,
              name: categoryData.name,
              description: categoryData.description,
              sortOrder: categoryData.sortOrder,
              isActive: true,
              createdAt: Date.now(),
            });
            categoriesCreated += 1;
          }

          // Process skills in this category
          for (const skillData of categoryData.skills) {
            const existingSkill = await ctx.db
              .query("skillDefinitions")
              .withIndex("by_sportCode_and_code", (q) =>
                q
                  .eq("sportCode", sportData.sportCode)
                  .eq("code", skillData.code)
              )
              .first();

            if (existingSkill) {
              if (args.replaceExisting) {
                await ctx.db.patch(existingSkill._id, {
                  categoryId,
                  name: skillData.name,
                  description: skillData.description,
                  level1Descriptor: skillData.level1Descriptor,
                  level2Descriptor: skillData.level2Descriptor,
                  level3Descriptor: skillData.level3Descriptor,
                  level4Descriptor: skillData.level4Descriptor,
                  level5Descriptor: skillData.level5Descriptor,
                  ageGroupRelevance: skillData.ageGroupRelevance,
                  sortOrder: skillData.sortOrder,
                  isActive: true,
                });
                skillsUpdated += 1;
              }
            } else {
              await ctx.db.insert("skillDefinitions", {
                categoryId,
                sportCode: sportData.sportCode,
                code: skillData.code,
                name: skillData.name,
                description: skillData.description,
                level1Descriptor: skillData.level1Descriptor,
                level2Descriptor: skillData.level2Descriptor,
                level3Descriptor: skillData.level3Descriptor,
                level4Descriptor: skillData.level4Descriptor,
                level5Descriptor: skillData.level5Descriptor,
                ageGroupRelevance: skillData.ageGroupRelevance,
                sortOrder: skillData.sortOrder,
                isActive: true,
                createdAt: Date.now(),
              });
              skillsCreated += 1;
            }
          }
        }

        totalCategoriesCreated += categoriesCreated;
        totalCategoriesUpdated += categoriesUpdated;
        totalSkillsCreated += skillsCreated;
        totalSkillsUpdated += skillsUpdated;
        sportsProcessed += 1;
      } catch (error) {
        errors.push({
          sportCode: sportData.sportCode,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      sportsProcessed,
      categoriesCreated: totalCategoriesCreated,
      categoriesUpdated: totalCategoriesUpdated,
      skillsCreated: totalSkillsCreated,
      skillsUpdated: totalSkillsUpdated,
      errors,
    };
  },
});

/**
 * Get all sports (including inactive) for admin view
 */
export const getAllSportsAdmin = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("sports"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      governingBody: v.optional(v.string()),
      description: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => await ctx.db.query("sports").collect(),
});

/**
 * Get all skill categories for a sport (including inactive) for admin view
 */
export const getAllCategoriesAdmin = query({
  args: { sportCode: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("skillCategories"),
      _creationTime: v.number(),
      sportCode: v.string(),
      code: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      sortOrder: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) =>
    await ctx.db
      .query("skillCategories")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", args.sportCode))
      .collect()
      .then((cats) => cats.sort((a, b) => a.sortOrder - b.sortOrder)),
});

/**
 * Get org usage statistics for all sports
 * Shows how many orgs are using each sport (via sport passports)
 */
export const getSportUsageStats = query({
  args: {},
  returns: v.array(
    v.object({
      sportCode: v.string(),
      orgCount: v.number(),
      passportCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    // Get all sports
    const sports = await ctx.db.query("sports").collect();

    const stats = await Promise.all(
      sports.map(async (sport) => {
        // Get all passports for this sport
        const passports = await ctx.db
          .query("sportPassports")
          .withIndex("by_org_and_sport")
          .filter((q) => q.eq(q.field("sportCode"), sport.code))
          .collect();

        // Count unique organizations
        const uniqueOrgs = new Set(passports.map((p) => p.organizationId));

        return {
          sportCode: sport.code,
          orgCount: uniqueOrgs.size,
          passportCount: passports.length,
        };
      })
    );

    return stats;
  },
});

/**
 * Get org usage for a specific sport (including org names)
 */
export const getSportOrgUsage = query({
  args: { sportCode: v.string() },
  returns: v.object({
    sportCode: v.string(),
    orgCount: v.number(),
    passportCount: v.number(),
    organizations: v.array(
      v.object({
        organizationId: v.string(),
        playerCount: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Get all passports for this sport
    const passports = await ctx.db
      .query("sportPassports")
      .withIndex("by_org_and_sport")
      .filter((q) => q.eq(q.field("sportCode"), args.sportCode))
      .collect();

    // Group by organization
    const orgCounts = new Map<string, number>();
    for (const passport of passports) {
      const count = orgCounts.get(passport.organizationId) ?? 0;
      orgCounts.set(passport.organizationId, count + 1);
    }

    // Convert to array
    const organizations = Array.from(orgCounts.entries()).map(
      ([organizationId, playerCount]) => ({
        organizationId,
        playerCount,
      })
    );

    return {
      sportCode: args.sportCode,
      orgCount: organizations.length,
      passportCount: passports.length,
      organizations,
    };
  },
});

/**
 * Get all skill definitions for a sport (including inactive) for admin view
 */
export const getAllSkillsAdmin = query({
  args: { sportCode: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("skillDefinitions"),
      _creationTime: v.number(),
      categoryId: v.id("skillCategories"),
      sportCode: v.string(),
      code: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      level1Descriptor: v.optional(v.string()),
      level2Descriptor: v.optional(v.string()),
      level3Descriptor: v.optional(v.string()),
      level4Descriptor: v.optional(v.string()),
      level5Descriptor: v.optional(v.string()),
      ageGroupRelevance: v.optional(v.array(v.string())),
      sortOrder: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) =>
    await ctx.db
      .query("skillDefinitions")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", args.sportCode))
      .collect()
      .then((skills) => skills.sort((a, b) => a.sortOrder - b.sortOrder)),
});

// ============================================================
// QUERIES - Sports
// ============================================================

/**
 * Get all active sports
 */
export const getSports = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("sports"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      governingBody: v.optional(v.string()),
      description: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) =>
    await ctx.db
      .query("sports")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect(),
});

/**
 * Get a sport by code
 */
export const getSportByCode = query({
  args: { code: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("sports"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      governingBody: v.optional(v.string()),
      description: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) =>
    await ctx.db
      .query("sports")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first(),
});

// ============================================================
// QUERIES - Age Groups
// ============================================================

/**
 * Get all active age groups (sorted by sortOrder)
 */
export const getAgeGroups = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("ageGroups"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      minAge: v.optional(v.number()),
      maxAge: v.optional(v.number()),
      ltadStage: v.optional(v.string()),
      description: v.optional(v.string()),
      sortOrder: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) =>
    await ctx.db
      .query("ageGroups")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect()
      .then((groups) => groups.sort((a, b) => a.sortOrder - b.sortOrder)),
});

/**
 * Get an age group by code
 */
export const getAgeGroupByCode = query({
  args: { code: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("ageGroups"),
      _creationTime: v.number(),
      code: v.string(),
      name: v.string(),
      minAge: v.optional(v.number()),
      maxAge: v.optional(v.number()),
      ltadStage: v.optional(v.string()),
      description: v.optional(v.string()),
      sortOrder: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) =>
    await ctx.db
      .query("ageGroups")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first(),
});

// ============================================================
// QUERIES - Skill Categories
// ============================================================

/**
 * Get skill categories for a sport (sorted by sortOrder)
 */
export const getSkillCategoriesBySport = query({
  args: { sportCode: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("skillCategories"),
      _creationTime: v.number(),
      sportCode: v.string(),
      code: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      sortOrder: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) =>
    await ctx.db
      .query("skillCategories")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", args.sportCode))
      .collect()
      .then((cats) =>
        cats.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
      ),
});

// ============================================================
// QUERIES - Skill Definitions
// ============================================================

/**
 * Get all skill definitions across all sports (for linking goals to skills)
 */
export const getAllSkillDefinitions = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("skillDefinitions"),
      code: v.string(),
      name: v.string(),
      sportCode: v.string(),
    })
  ),
  handler: async (ctx) => {
    const skills = await ctx.db.query("skillDefinitions").collect();

    return skills
      .filter((s) => s.isActive)
      .map((s) => ({
        _id: s._id,
        code: s.code,
        name: s.name,
        sportCode: s.sportCode,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * Get all skill definitions for a sport (sorted by category and sortOrder)
 */
export const getSkillDefinitionsBySport = query({
  args: { sportCode: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("skillDefinitions"),
      _creationTime: v.number(),
      categoryId: v.id("skillCategories"),
      sportCode: v.string(),
      code: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      level1Descriptor: v.optional(v.string()),
      level2Descriptor: v.optional(v.string()),
      level3Descriptor: v.optional(v.string()),
      level4Descriptor: v.optional(v.string()),
      level5Descriptor: v.optional(v.string()),
      ageGroupRelevance: v.optional(v.array(v.string())),
      sortOrder: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) =>
    await ctx.db
      .query("skillDefinitions")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", args.sportCode))
      .collect()
      .then((skills) =>
        skills
          .filter((s) => s.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
      ),
});

/**
 * Get skill definitions for a specific category
 */
export const getSkillDefinitionsByCategory = query({
  args: { categoryId: v.id("skillCategories") },
  returns: v.array(
    v.object({
      _id: v.id("skillDefinitions"),
      _creationTime: v.number(),
      categoryId: v.id("skillCategories"),
      sportCode: v.string(),
      code: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      level1Descriptor: v.optional(v.string()),
      level2Descriptor: v.optional(v.string()),
      level3Descriptor: v.optional(v.string()),
      level4Descriptor: v.optional(v.string()),
      level5Descriptor: v.optional(v.string()),
      ageGroupRelevance: v.optional(v.array(v.string())),
      sortOrder: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) =>
    await ctx.db
      .query("skillDefinitions")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", args.categoryId))
      .collect()
      .then((skills) =>
        skills
          .filter((s) => s.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
      ),
});

/**
 * Get skills grouped by category for a sport
 * Returns categories with their skills nested
 */
export const getSkillsByCategoryForSport = query({
  args: { sportCode: v.string() },
  returns: v.array(
    v.object({
      category: v.object({
        _id: v.id("skillCategories"),
        code: v.string(),
        name: v.string(),
        sortOrder: v.number(),
      }),
      skills: v.array(
        v.object({
          _id: v.id("skillDefinitions"),
          code: v.string(),
          name: v.string(),
          sortOrder: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    // Get categories
    const categories = await ctx.db
      .query("skillCategories")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", args.sportCode))
      .collect()
      .then((cats) =>
        cats.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
      );

    // Get skills for each category
    const result = await Promise.all(
      categories.map(async (category) => {
        const skills = await ctx.db
          .query("skillDefinitions")
          .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
          .collect()
          .then((s) =>
            s
              .filter((skill) => skill.isActive)
              .sort((a, b) => a.sortOrder - b.sortOrder)
          );

        return {
          category: {
            _id: category._id,
            code: category.code,
            name: category.name,
            sortOrder: category.sortOrder,
          },
          skills: skills.map((s) => ({
            _id: s._id,
            code: s.code,
            name: s.name,
            sortOrder: s.sortOrder,
          })),
        };
      })
    );

    return result;
  },
});

// ============================================================
// INTERNAL MUTATIONS - Seeding
// ============================================================

/**
 * Seed sports reference data
 */
export const seedSports = internalMutation({
  args: {},
  returns: v.object({
    created: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    const sports = [
      {
        code: "gaa_football",
        name: "GAA Football",
        governingBody: "GAA",
        description:
          "Gaelic football is an Irish team sport played between two teams of 15 players on a rectangular grass pitch.",
      },
      {
        code: "soccer",
        name: "Soccer",
        governingBody: "FAI",
        description:
          "Association football, commonly known as soccer, is a team sport played between two teams of 11 players.",
      },
      {
        code: "rugby",
        name: "Rugby",
        governingBody: "IRFU",
        description:
          "Rugby union is a close-contact team sport that originated in England in the 19th century.",
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const sport of sports) {
      // Check if already exists
      const existing = await ctx.db
        .query("sports")
        .withIndex("by_code", (q) => q.eq("code", sport.code))
        .first();

      if (existing) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("sports", {
        ...sport,
        isActive: true,
        createdAt: Date.now(),
      });
      created += 1;
    }

    return { created, skipped };
  },
});

/**
 * Seed age groups reference data
 */
export const seedAgeGroups = internalMutation({
  args: {},
  returns: v.object({
    created: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    const ageGroups = [
      // Active Start / FUNdamentals (4-9)
      {
        code: "u6",
        name: "Under 6",
        minAge: 4,
        maxAge: 6,
        ltadStage: "Active Start",
        sortOrder: 1,
      },
      {
        code: "u7",
        name: "Under 7",
        minAge: 5,
        maxAge: 7,
        ltadStage: "FUNdamentals",
        sortOrder: 2,
      },
      {
        code: "u8",
        name: "Under 8",
        minAge: 6,
        maxAge: 8,
        ltadStage: "FUNdamentals",
        sortOrder: 3,
      },
      {
        code: "u9",
        name: "Under 9",
        minAge: 7,
        maxAge: 9,
        ltadStage: "FUNdamentals",
        sortOrder: 4,
      },
      // Learn to Train (8-12)
      {
        code: "u10",
        name: "Under 10",
        minAge: 8,
        maxAge: 10,
        ltadStage: "Learn to Train",
        sortOrder: 5,
      },
      {
        code: "u11",
        name: "Under 11",
        minAge: 9,
        maxAge: 11,
        ltadStage: "Learn to Train",
        sortOrder: 6,
      },
      {
        code: "u12",
        name: "Under 12",
        minAge: 10,
        maxAge: 12,
        ltadStage: "Learn to Train",
        sortOrder: 7,
      },
      // Train to Train (11-16)
      {
        code: "u13",
        name: "Under 13",
        minAge: 11,
        maxAge: 13,
        ltadStage: "Train to Train",
        sortOrder: 8,
      },
      {
        code: "u14",
        name: "Under 14",
        minAge: 12,
        maxAge: 14,
        ltadStage: "Train to Train",
        sortOrder: 9,
      },
      {
        code: "u15",
        name: "Under 15",
        minAge: 13,
        maxAge: 15,
        ltadStage: "Train to Train",
        sortOrder: 10,
      },
      {
        code: "u16",
        name: "Under 16",
        minAge: 14,
        maxAge: 16,
        ltadStage: "Train to Train",
        sortOrder: 11,
      },
      // Train to Compete (15-21)
      {
        code: "u17",
        name: "Under 17",
        minAge: 15,
        maxAge: 17,
        ltadStage: "Train to Compete",
        sortOrder: 12,
      },
      {
        code: "u18",
        name: "Under 18",
        minAge: 16,
        maxAge: 18,
        ltadStage: "Train to Compete",
        sortOrder: 13,
      },
      {
        code: "u19",
        name: "Under 19",
        minAge: 17,
        maxAge: 19,
        ltadStage: "Train to Compete",
        sortOrder: 14,
      },
      {
        code: "u21",
        name: "Under 21",
        minAge: 18,
        maxAge: 21,
        ltadStage: "Train to Compete",
        sortOrder: 15,
      },
      // Senior / Train to Win (18+)
      {
        code: "senior",
        name: "Senior",
        minAge: 18,
        maxAge: undefined,
        ltadStage: "Train to Win",
        sortOrder: 16,
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const ageGroup of ageGroups) {
      // Check if already exists
      const existing = await ctx.db
        .query("ageGroups")
        .withIndex("by_code", (q) => q.eq("code", ageGroup.code))
        .first();

      if (existing) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("ageGroups", {
        ...ageGroup,
        isActive: true,
        createdAt: Date.now(),
      });
      created += 1;
    }

    return { created, skipped };
  },
});

/**
 * Seed GAA Football skill categories and definitions
 */
export const seedGAASkills = internalMutation({
  args: {},
  returns: v.object({
    categoriesCreated: v.number(),
    skillsCreated: v.number(),
  }),
  handler: async (ctx) => {
    const sportCode = "gaa_football";

    // Check if sport exists
    const sport = await ctx.db
      .query("sports")
      .withIndex("by_code", (q) => q.eq("code", sportCode))
      .first();

    if (!sport) {
      throw new Error("Sport 'gaa_football' not found. Run seedSports first.");
    }

    // Categories with their skills
    const categoriesWithSkills = [
      {
        category: { code: "ball_mastery", name: "Ball Mastery", sortOrder: 1 },
        skills: [
          { code: "soloing", name: "Soloing", sortOrder: 1 },
          { code: "ball_handling", name: "Ball Handling", sortOrder: 2 },
          { code: "pickup_toe_lift", name: "Pickup / Toe Lift", sortOrder: 3 },
        ],
      },
      {
        category: { code: "kicking", name: "Kicking", sortOrder: 2 },
        skills: [
          { code: "kicking_long", name: "Kicking (Long)", sortOrder: 1 },
          { code: "kicking_short", name: "Kicking (Short)", sortOrder: 2 },
        ],
      },
      {
        category: { code: "catching", name: "Catching", sortOrder: 3 },
        skills: [
          { code: "high_catching", name: "High Catching", sortOrder: 1 },
        ],
      },
      {
        category: { code: "free_taking", name: "Free Taking", sortOrder: 4 },
        skills: [
          {
            code: "free_taking_ground",
            name: "Free Taking (Ground)",
            sortOrder: 1,
          },
          {
            code: "free_taking_hand",
            name: "Free Taking (Hand)",
            sortOrder: 2,
          },
        ],
      },
      {
        category: { code: "passing", name: "Passing", sortOrder: 5 },
        skills: [{ code: "hand_passing", name: "Hand Passing", sortOrder: 1 }],
      },
      {
        category: {
          code: "tactical",
          name: "Tactical & Decision Making",
          sortOrder: 6,
        },
        skills: [
          { code: "positional_sense", name: "Positional Sense", sortOrder: 1 },
          { code: "tracking", name: "Tracking", sortOrder: 2 },
          { code: "decision_making", name: "Decision Making", sortOrder: 3 },
          { code: "decision_speed", name: "Decision Speed", sortOrder: 4 },
        ],
      },
      {
        category: { code: "defensive", name: "Defensive", sortOrder: 7 },
        skills: [{ code: "tackling", name: "Tackling", sortOrder: 1 }],
      },
      {
        category: { code: "laterality", name: "Laterality", sortOrder: 8 },
        skills: [
          { code: "left_side", name: "Left Side", sortOrder: 1 },
          { code: "right_side", name: "Right Side", sortOrder: 2 },
        ],
      },
    ];

    let categoriesCreated = 0;
    let skillsCreated = 0;

    for (const { category, skills } of categoriesWithSkills) {
      // Check if category exists
      let categoryId: Id<"skillCategories">;
      const existingCategory = await ctx.db
        .query("skillCategories")
        .withIndex("by_sportCode_and_code", (q) =>
          q.eq("sportCode", sportCode).eq("code", category.code)
        )
        .first();

      if (existingCategory) {
        categoryId = existingCategory._id;
      } else {
        categoryId = await ctx.db.insert("skillCategories", {
          sportCode,
          code: category.code,
          name: category.name,
          sortOrder: category.sortOrder,
          isActive: true,
          createdAt: Date.now(),
        });
        categoriesCreated += 1;
      }

      // Create skills in this category
      for (const skill of skills) {
        const existingSkill = await ctx.db
          .query("skillDefinitions")
          .withIndex("by_sportCode_and_code", (q) =>
            q.eq("sportCode", sportCode).eq("code", skill.code)
          )
          .first();

        if (!existingSkill) {
          await ctx.db.insert("skillDefinitions", {
            categoryId,
            sportCode,
            code: skill.code,
            name: skill.name,
            sortOrder: skill.sortOrder,
            isActive: true,
            createdAt: Date.now(),
          });
          skillsCreated += 1;
        }
      }
    }

    return { categoriesCreated, skillsCreated };
  },
});

/**
 * Seed Soccer skill categories and definitions
 */
export const seedSoccerSkills = internalMutation({
  args: {},
  returns: v.object({
    categoriesCreated: v.number(),
    skillsCreated: v.number(),
  }),
  handler: async (ctx) => {
    const sportCode = "soccer";

    // Check if sport exists
    const sport = await ctx.db
      .query("sports")
      .withIndex("by_code", (q) => q.eq("code", sportCode))
      .first();

    if (!sport) {
      throw new Error("Sport 'soccer' not found. Run seedSports first.");
    }

    // Categories with their skills
    const categoriesWithSkills = [
      {
        category: { code: "ball_mastery", name: "Ball Mastery", sortOrder: 1 },
        skills: [
          { code: "ball_control", name: "Ball Control", sortOrder: 1 },
          {
            code: "ball_control_under_pressure",
            name: "Ball Control Under Pressure",
            sortOrder: 2,
          },
          { code: "ball_protection", name: "Ball Protection", sortOrder: 3 },
          { code: "dribbling", name: "Dribbling", sortOrder: 4 },
          { code: "first_touch", name: "First Touch", sortOrder: 5 },
        ],
      },
      {
        category: {
          code: "passing",
          name: "Passing & Distribution",
          sortOrder: 2,
        },
        skills: [
          { code: "passing", name: "Passing", sortOrder: 1 },
          {
            code: "passing_under_pressure",
            name: "Passing Under Pressure",
            sortOrder: 2,
          },
          { code: "crossing", name: "Crossing", sortOrder: 3 },
          { code: "throw_ins", name: "Throw Ins", sortOrder: 4 },
        ],
      },
      {
        category: {
          code: "shooting",
          name: "Shooting & Finishing",
          sortOrder: 3,
        },
        skills: [
          { code: "shot_accuracy", name: "Shot Accuracy", sortOrder: 1 },
          { code: "shot_power", name: "Shot Power", sortOrder: 2 },
          {
            code: "finishing_ability",
            name: "Finishing Ability",
            sortOrder: 3,
          },
          { code: "heading", name: "Heading", sortOrder: 4 },
        ],
      },
      {
        category: {
          code: "tactical",
          name: "Tactical & Awareness",
          sortOrder: 4,
        },
        skills: [
          {
            code: "offensive_positioning",
            name: "Offensive Positioning",
            sortOrder: 1,
          },
          {
            code: "defensive_positioning",
            name: "Defensive Positioning",
            sortOrder: 2,
          },
          {
            code: "defensive_aggressiveness",
            name: "Defensive Aggressiveness",
            sortOrder: 3,
          },
          {
            code: "transitional_play",
            name: "Transitional Play",
            sortOrder: 4,
          },
          {
            code: "off_ball_movement",
            name: "Off Ball Movement",
            sortOrder: 5,
          },
          { code: "awareness", name: "Awareness", sortOrder: 6 },
          { code: "decision_making", name: "Decision Making", sortOrder: 7 },
        ],
      },
      {
        category: {
          code: "physical",
          name: "Physical & Athletic",
          sortOrder: 5,
        },
        skills: [
          { code: "speed", name: "Speed", sortOrder: 1 },
          { code: "agility", name: "Agility", sortOrder: 2 },
          { code: "strength", name: "Strength", sortOrder: 3 },
          { code: "endurance", name: "Endurance", sortOrder: 4 },
        ],
      },
      {
        category: { code: "character", name: "Character & Team", sortOrder: 6 },
        skills: [
          { code: "communication", name: "Communication", sortOrder: 1 },
          { code: "coachability", name: "Coachability", sortOrder: 2 },
          { code: "leadership", name: "Leadership", sortOrder: 3 },
          { code: "team_orientation", name: "Team Orientation", sortOrder: 4 },
        ],
      },
    ];

    let categoriesCreated = 0;
    let skillsCreated = 0;

    for (const { category, skills } of categoriesWithSkills) {
      // Check if category exists
      let categoryId: Id<"skillCategories">;
      const existingCategory = await ctx.db
        .query("skillCategories")
        .withIndex("by_sportCode_and_code", (q) =>
          q.eq("sportCode", sportCode).eq("code", category.code)
        )
        .first();

      if (existingCategory) {
        categoryId = existingCategory._id;
      } else {
        categoryId = await ctx.db.insert("skillCategories", {
          sportCode,
          code: category.code,
          name: category.name,
          sortOrder: category.sortOrder,
          isActive: true,
          createdAt: Date.now(),
        });
        categoriesCreated += 1;
      }

      // Create skills in this category
      for (const skill of skills) {
        const existingSkill = await ctx.db
          .query("skillDefinitions")
          .withIndex("by_sportCode_and_code", (q) =>
            q.eq("sportCode", sportCode).eq("code", skill.code)
          )
          .first();

        if (!existingSkill) {
          await ctx.db.insert("skillDefinitions", {
            categoryId,
            sportCode,
            code: skill.code,
            name: skill.name,
            sortOrder: skill.sortOrder,
            isActive: true,
            createdAt: Date.now(),
          });
          skillsCreated += 1;
        }
      }
    }

    return { categoriesCreated, skillsCreated };
  },
});

/**
 * Seed Rugby skill categories and definitions
 */
export const seedRugbySkills = internalMutation({
  args: {},
  returns: v.object({
    categoriesCreated: v.number(),
    skillsCreated: v.number(),
  }),
  handler: async (ctx) => {
    const sportCode = "rugby";

    // Check if sport exists
    const sport = await ctx.db
      .query("sports")
      .withIndex("by_code", (q) => q.eq("code", sportCode))
      .first();

    if (!sport) {
      throw new Error("Sport 'rugby' not found. Run seedSports first.");
    }

    // Categories with their skills
    const categoriesWithSkills = [
      {
        category: {
          code: "passing_handling",
          name: "Passing & Handling",
          sortOrder: 1,
        },
        skills: [
          {
            code: "pass_accuracy_left",
            name: "Pass Accuracy (Left)",
            sortOrder: 1,
          },
          {
            code: "pass_accuracy_right",
            name: "Pass Accuracy (Right)",
            sortOrder: 2,
          },
          {
            code: "pass_under_pressure",
            name: "Pass Under Pressure",
            sortOrder: 3,
          },
          {
            code: "offload_in_contact",
            name: "Offload in Contact",
            sortOrder: 4,
          },
          { code: "draw_and_pass", name: "Draw and Pass", sortOrder: 5 },
          {
            code: "spiral_long_pass",
            name: "Spiral / Long Pass",
            sortOrder: 6,
          },
          { code: "ball_security", name: "Ball Security", sortOrder: 7 },
        ],
      },
      {
        category: {
          code: "catching_receiving",
          name: "Catching & Receiving",
          sortOrder: 2,
        },
        skills: [
          {
            code: "high_ball_catching",
            name: "High Ball Catching",
            sortOrder: 1,
          },
          {
            code: "chest_body_catch",
            name: "Chest / Body Catch",
            sortOrder: 2,
          },
          { code: "low_ball_pickup", name: "Low Ball Pickup", sortOrder: 3 },
          {
            code: "catching_under_pressure",
            name: "Catching Under Pressure",
            sortOrder: 4,
          },
          {
            code: "hands_ready_position",
            name: "Hands Ready Position",
            sortOrder: 5,
          },
          {
            code: "watch_ball_into_hands",
            name: "Watch Ball Into Hands",
            sortOrder: 6,
          },
        ],
      },
      {
        category: {
          code: "running_ball_carry",
          name: "Running & Ball Carry",
          sortOrder: 3,
        },
        skills: [
          {
            code: "running_with_ball",
            name: "Running With Ball",
            sortOrder: 1,
          },
          {
            code: "evasion_side_step",
            name: "Evasion (Side Step)",
            sortOrder: 2,
          },
          { code: "evasion_swerve", name: "Evasion (Swerve)", sortOrder: 3 },
          { code: "dummy_pass", name: "Dummy Pass", sortOrder: 4 },
          {
            code: "acceleration_into_space",
            name: "Acceleration Into Space",
            sortOrder: 5,
          },
          {
            code: "ball_carry_into_contact",
            name: "Ball Carry Into Contact",
            sortOrder: 6,
          },
          {
            code: "body_position_balance",
            name: "Body Position / Balance",
            sortOrder: 7,
          },
        ],
      },
      {
        category: { code: "kicking", name: "Kicking", sortOrder: 4 },
        skills: [
          { code: "punt_kick_left", name: "Punt Kick (Left)", sortOrder: 1 },
          { code: "punt_kick_right", name: "Punt Kick (Right)", sortOrder: 2 },
          { code: "grubber_kick", name: "Grubber Kick", sortOrder: 3 },
          { code: "drop_kick", name: "Drop Kick", sortOrder: 4 },
          { code: "place_kicking", name: "Place Kicking", sortOrder: 5 },
          { code: "kicking_distance", name: "Kicking Distance", sortOrder: 6 },
          { code: "kick_accuracy", name: "Kick Accuracy", sortOrder: 7 },
        ],
      },
      {
        category: {
          code: "contact_breakdown",
          name: "Contact & Breakdown",
          sortOrder: 5,
        },
        skills: [
          { code: "tackle_technique", name: "Tackle Technique", sortOrder: 1 },
          {
            code: "tackle_completion",
            name: "Tackle Completion",
            sortOrder: 2,
          },
          {
            code: "rip_tag_technique",
            name: "Rip / Tag Technique",
            sortOrder: 3,
          },
          {
            code: "body_position_in_contact",
            name: "Body Position in Contact",
            sortOrder: 4,
          },
          {
            code: "leg_drive_through_contact",
            name: "Leg Drive Through Contact",
            sortOrder: 5,
          },
          {
            code: "ball_presentation",
            name: "Ball Presentation",
            sortOrder: 6,
          },
          {
            code: "ruck_entry_cleanout",
            name: "Ruck Entry / Cleanout",
            sortOrder: 7,
          },
          {
            code: "jackaling_turnovers",
            name: "Jackaling / Turnovers",
            sortOrder: 8,
          },
        ],
      },
      {
        category: {
          code: "tactical",
          name: "Tactical & Game Awareness",
          sortOrder: 6,
        },
        skills: [
          { code: "decision_making", name: "Decision Making", sortOrder: 1 },
          { code: "reading_defense", name: "Reading Defense", sortOrder: 2 },
          {
            code: "positional_understanding",
            name: "Positional Understanding",
            sortOrder: 3,
          },
          {
            code: "support_play_attack",
            name: "Support Play (Attack)",
            sortOrder: 4,
          },
          {
            code: "support_play_defense",
            name: "Support Play (Defense)",
            sortOrder: 5,
          },
          {
            code: "communication_on_field",
            name: "Communication on Field",
            sortOrder: 6,
          },
          {
            code: "spatial_awareness",
            name: "Spatial Awareness",
            sortOrder: 7,
          },
          {
            code: "game_sense_instinct",
            name: "Game Sense / Instinct",
            sortOrder: 8,
          },
          {
            code: "following_game_plan",
            name: "Following Game Plan",
            sortOrder: 9,
          },
        ],
      },
    ];

    let categoriesCreated = 0;
    let skillsCreated = 0;

    for (const { category, skills } of categoriesWithSkills) {
      // Check if category exists
      let categoryId: Id<"skillCategories">;
      const existingCategory = await ctx.db
        .query("skillCategories")
        .withIndex("by_sportCode_and_code", (q) =>
          q.eq("sportCode", sportCode).eq("code", category.code)
        )
        .first();

      if (existingCategory) {
        categoryId = existingCategory._id;
      } else {
        categoryId = await ctx.db.insert("skillCategories", {
          sportCode,
          code: category.code,
          name: category.name,
          sortOrder: category.sortOrder,
          isActive: true,
          createdAt: Date.now(),
        });
        categoriesCreated += 1;
      }

      // Create skills in this category
      for (const skill of skills) {
        const existingSkill = await ctx.db
          .query("skillDefinitions")
          .withIndex("by_sportCode_and_code", (q) =>
            q.eq("sportCode", sportCode).eq("code", skill.code)
          )
          .first();

        if (!existingSkill) {
          await ctx.db.insert("skillDefinitions", {
            categoryId,
            sportCode,
            code: skill.code,
            name: skill.name,
            sortOrder: skill.sortOrder,
            isActive: true,
            createdAt: Date.now(),
          });
          skillsCreated += 1;
        }
      }
    }

    return { categoriesCreated, skillsCreated };
  },
});

/**
 * Seed all reference data (sports, age groups, all skills)
 * Convenience function to run all seed functions in order
 */
export const seedAllReferenceData = internalMutation({
  args: {},
  returns: v.object({
    sports: v.object({ created: v.number(), skipped: v.number() }),
    ageGroups: v.object({ created: v.number(), skipped: v.number() }),
    gaaSkills: v.object({
      categoriesCreated: v.number(),
      skillsCreated: v.number(),
    }),
    soccerSkills: v.object({
      categoriesCreated: v.number(),
      skillsCreated: v.number(),
    }),
    rugbySkills: v.object({
      categoriesCreated: v.number(),
      skillsCreated: v.number(),
    }),
  }),
  handler: async (ctx) => {
    // Seed sports first (skills depend on this)
    const sportsResult = await seedSportsHandler(ctx);

    // Seed age groups
    const ageGroupsResult = await seedAgeGroupsHandler(ctx);

    // Seed skills for each sport
    const gaaResult = await seedGAASkillsHandler(ctx);
    const soccerResult = await seedSoccerSkillsHandler(ctx);
    const rugbyResult = await seedRugbySkillsHandler(ctx);

    return {
      sports: sportsResult,
      ageGroups: ageGroupsResult,
      gaaSkills: gaaResult,
      soccerSkills: soccerResult,
      rugbySkills: rugbyResult,
    };
  },
});

// Helper functions to call from seedAllReferenceData
// (These are duplicated logic but necessary since we can't call mutations from mutations)

async function seedSportsHandler(ctx: any) {
  const sports = [
    {
      code: "gaa_football",
      name: "GAA Football",
      governingBody: "GAA",
      description:
        "Gaelic football is an Irish team sport played between two teams of 15 players on a rectangular grass pitch.",
    },
    {
      code: "soccer",
      name: "Soccer",
      governingBody: "FAI",
      description:
        "Association football, commonly known as soccer, is a team sport played between two teams of 11 players.",
    },
    {
      code: "rugby",
      name: "Rugby",
      governingBody: "IRFU",
      description:
        "Rugby union is a close-contact team sport that originated in England in the 19th century.",
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const sport of sports) {
    const existing = await ctx.db
      .query("sports")
      .withIndex("by_code", (q: any) => q.eq("code", sport.code))
      .first();

    if (existing) {
      skipped += 1;
      continue;
    }

    await ctx.db.insert("sports", {
      ...sport,
      isActive: true,
      createdAt: Date.now(),
    });
    created += 1;
  }

  return { created, skipped };
}

async function seedAgeGroupsHandler(ctx: any) {
  const ageGroups = [
    {
      code: "u6",
      name: "Under 6",
      minAge: 4,
      maxAge: 6,
      ltadStage: "Active Start",
      sortOrder: 1,
    },
    {
      code: "u7",
      name: "Under 7",
      minAge: 5,
      maxAge: 7,
      ltadStage: "FUNdamentals",
      sortOrder: 2,
    },
    {
      code: "u8",
      name: "Under 8",
      minAge: 6,
      maxAge: 8,
      ltadStage: "FUNdamentals",
      sortOrder: 3,
    },
    {
      code: "u9",
      name: "Under 9",
      minAge: 7,
      maxAge: 9,
      ltadStage: "FUNdamentals",
      sortOrder: 4,
    },
    {
      code: "u10",
      name: "Under 10",
      minAge: 8,
      maxAge: 10,
      ltadStage: "Learn to Train",
      sortOrder: 5,
    },
    {
      code: "u11",
      name: "Under 11",
      minAge: 9,
      maxAge: 11,
      ltadStage: "Learn to Train",
      sortOrder: 6,
    },
    {
      code: "u12",
      name: "Under 12",
      minAge: 10,
      maxAge: 12,
      ltadStage: "Learn to Train",
      sortOrder: 7,
    },
    {
      code: "u13",
      name: "Under 13",
      minAge: 11,
      maxAge: 13,
      ltadStage: "Train to Train",
      sortOrder: 8,
    },
    {
      code: "u14",
      name: "Under 14",
      minAge: 12,
      maxAge: 14,
      ltadStage: "Train to Train",
      sortOrder: 9,
    },
    {
      code: "u15",
      name: "Under 15",
      minAge: 13,
      maxAge: 15,
      ltadStage: "Train to Train",
      sortOrder: 10,
    },
    {
      code: "u16",
      name: "Under 16",
      minAge: 14,
      maxAge: 16,
      ltadStage: "Train to Train",
      sortOrder: 11,
    },
    {
      code: "u17",
      name: "Under 17",
      minAge: 15,
      maxAge: 17,
      ltadStage: "Train to Compete",
      sortOrder: 12,
    },
    {
      code: "u18",
      name: "Under 18",
      minAge: 16,
      maxAge: 18,
      ltadStage: "Train to Compete",
      sortOrder: 13,
    },
    {
      code: "u19",
      name: "Under 19",
      minAge: 17,
      maxAge: 19,
      ltadStage: "Train to Compete",
      sortOrder: 14,
    },
    {
      code: "u21",
      name: "Under 21",
      minAge: 18,
      maxAge: 21,
      ltadStage: "Train to Compete",
      sortOrder: 15,
    },
    {
      code: "senior",
      name: "Senior",
      minAge: 18,
      maxAge: undefined,
      ltadStage: "Train to Win",
      sortOrder: 16,
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const ageGroup of ageGroups) {
    const existing = await ctx.db
      .query("ageGroups")
      .withIndex("by_code", (q: any) => q.eq("code", ageGroup.code))
      .first();

    if (existing) {
      skipped += 1;
      continue;
    }

    await ctx.db.insert("ageGroups", {
      ...ageGroup,
      isActive: true,
      createdAt: Date.now(),
    });
    created += 1;
  }

  return { created, skipped };
}

async function seedGAASkillsHandler(ctx: any) {
  const sportCode = "gaa_football";
  const categoriesWithSkills = [
    {
      category: { code: "ball_mastery", name: "Ball Mastery", sortOrder: 1 },
      skills: [
        { code: "soloing", name: "Soloing", sortOrder: 1 },
        { code: "ball_handling", name: "Ball Handling", sortOrder: 2 },
        { code: "pickup_toe_lift", name: "Pickup / Toe Lift", sortOrder: 3 },
      ],
    },
    {
      category: { code: "kicking", name: "Kicking", sortOrder: 2 },
      skills: [
        { code: "kicking_long", name: "Kicking (Long)", sortOrder: 1 },
        { code: "kicking_short", name: "Kicking (Short)", sortOrder: 2 },
      ],
    },
    {
      category: { code: "catching", name: "Catching", sortOrder: 3 },
      skills: [{ code: "high_catching", name: "High Catching", sortOrder: 1 }],
    },
    {
      category: { code: "free_taking", name: "Free Taking", sortOrder: 4 },
      skills: [
        {
          code: "free_taking_ground",
          name: "Free Taking (Ground)",
          sortOrder: 1,
        },
        { code: "free_taking_hand", name: "Free Taking (Hand)", sortOrder: 2 },
      ],
    },
    {
      category: { code: "passing", name: "Passing", sortOrder: 5 },
      skills: [{ code: "hand_passing", name: "Hand Passing", sortOrder: 1 }],
    },
    {
      category: {
        code: "tactical",
        name: "Tactical & Decision Making",
        sortOrder: 6,
      },
      skills: [
        { code: "positional_sense", name: "Positional Sense", sortOrder: 1 },
        { code: "tracking", name: "Tracking", sortOrder: 2 },
        { code: "decision_making", name: "Decision Making", sortOrder: 3 },
        { code: "decision_speed", name: "Decision Speed", sortOrder: 4 },
      ],
    },
    {
      category: { code: "defensive", name: "Defensive", sortOrder: 7 },
      skills: [{ code: "tackling", name: "Tackling", sortOrder: 1 }],
    },
    {
      category: { code: "laterality", name: "Laterality", sortOrder: 8 },
      skills: [
        { code: "left_side", name: "Left Side", sortOrder: 1 },
        { code: "right_side", name: "Right Side", sortOrder: 2 },
      ],
    },
  ];

  let categoriesCreated = 0;
  let skillsCreated = 0;

  for (const { category, skills } of categoriesWithSkills) {
    let categoryId: Id<"skillCategories">;
    const existingCategory = await ctx.db
      .query("skillCategories")
      .withIndex("by_sportCode_and_code", (q: any) =>
        q.eq("sportCode", sportCode).eq("code", category.code)
      )
      .first();

    if (existingCategory) {
      categoryId = existingCategory._id;
    } else {
      categoryId = await ctx.db.insert("skillCategories", {
        sportCode,
        ...category,
        isActive: true,
        createdAt: Date.now(),
      });
      categoriesCreated += 1;
    }

    for (const skill of skills) {
      const existingSkill = await ctx.db
        .query("skillDefinitions")
        .withIndex("by_sportCode_and_code", (q: any) =>
          q.eq("sportCode", sportCode).eq("code", skill.code)
        )
        .first();

      if (!existingSkill) {
        await ctx.db.insert("skillDefinitions", {
          categoryId,
          sportCode,
          ...skill,
          isActive: true,
          createdAt: Date.now(),
        });
        skillsCreated += 1;
      }
    }
  }

  return { categoriesCreated, skillsCreated };
}

async function seedSoccerSkillsHandler(ctx: any) {
  const sportCode = "soccer";
  const categoriesWithSkills = [
    {
      category: { code: "ball_mastery", name: "Ball Mastery", sortOrder: 1 },
      skills: [
        { code: "ball_control", name: "Ball Control", sortOrder: 1 },
        {
          code: "ball_control_under_pressure",
          name: "Ball Control Under Pressure",
          sortOrder: 2,
        },
        { code: "ball_protection", name: "Ball Protection", sortOrder: 3 },
        { code: "dribbling", name: "Dribbling", sortOrder: 4 },
        { code: "first_touch", name: "First Touch", sortOrder: 5 },
      ],
    },
    {
      category: {
        code: "passing",
        name: "Passing & Distribution",
        sortOrder: 2,
      },
      skills: [
        { code: "passing", name: "Passing", sortOrder: 1 },
        {
          code: "passing_under_pressure",
          name: "Passing Under Pressure",
          sortOrder: 2,
        },
        { code: "crossing", name: "Crossing", sortOrder: 3 },
        { code: "throw_ins", name: "Throw Ins", sortOrder: 4 },
      ],
    },
    {
      category: {
        code: "shooting",
        name: "Shooting & Finishing",
        sortOrder: 3,
      },
      skills: [
        { code: "shot_accuracy", name: "Shot Accuracy", sortOrder: 1 },
        { code: "shot_power", name: "Shot Power", sortOrder: 2 },
        { code: "finishing_ability", name: "Finishing Ability", sortOrder: 3 },
        { code: "heading", name: "Heading", sortOrder: 4 },
      ],
    },
    {
      category: {
        code: "tactical",
        name: "Tactical & Awareness",
        sortOrder: 4,
      },
      skills: [
        {
          code: "offensive_positioning",
          name: "Offensive Positioning",
          sortOrder: 1,
        },
        {
          code: "defensive_positioning",
          name: "Defensive Positioning",
          sortOrder: 2,
        },
        {
          code: "defensive_aggressiveness",
          name: "Defensive Aggressiveness",
          sortOrder: 3,
        },
        { code: "transitional_play", name: "Transitional Play", sortOrder: 4 },
        { code: "off_ball_movement", name: "Off Ball Movement", sortOrder: 5 },
        { code: "awareness", name: "Awareness", sortOrder: 6 },
        { code: "decision_making", name: "Decision Making", sortOrder: 7 },
      ],
    },
    {
      category: { code: "physical", name: "Physical & Athletic", sortOrder: 5 },
      skills: [
        { code: "speed", name: "Speed", sortOrder: 1 },
        { code: "agility", name: "Agility", sortOrder: 2 },
        { code: "strength", name: "Strength", sortOrder: 3 },
        { code: "endurance", name: "Endurance", sortOrder: 4 },
      ],
    },
    {
      category: { code: "character", name: "Character & Team", sortOrder: 6 },
      skills: [
        { code: "communication", name: "Communication", sortOrder: 1 },
        { code: "coachability", name: "Coachability", sortOrder: 2 },
        { code: "leadership", name: "Leadership", sortOrder: 3 },
        { code: "team_orientation", name: "Team Orientation", sortOrder: 4 },
      ],
    },
  ];

  let categoriesCreated = 0;
  let skillsCreated = 0;

  for (const { category, skills } of categoriesWithSkills) {
    let categoryId: Id<"skillCategories">;
    const existingCategory = await ctx.db
      .query("skillCategories")
      .withIndex("by_sportCode_and_code", (q: any) =>
        q.eq("sportCode", sportCode).eq("code", category.code)
      )
      .first();

    if (existingCategory) {
      categoryId = existingCategory._id;
    } else {
      categoryId = await ctx.db.insert("skillCategories", {
        sportCode,
        ...category,
        isActive: true,
        createdAt: Date.now(),
      });
      categoriesCreated += 1;
    }

    for (const skill of skills) {
      const existingSkill = await ctx.db
        .query("skillDefinitions")
        .withIndex("by_sportCode_and_code", (q: any) =>
          q.eq("sportCode", sportCode).eq("code", skill.code)
        )
        .first();

      if (!existingSkill) {
        await ctx.db.insert("skillDefinitions", {
          categoryId,
          sportCode,
          ...skill,
          isActive: true,
          createdAt: Date.now(),
        });
        skillsCreated += 1;
      }
    }
  }

  return { categoriesCreated, skillsCreated };
}

async function seedRugbySkillsHandler(ctx: any) {
  const sportCode = "rugby";
  const categoriesWithSkills = [
    {
      category: {
        code: "passing_handling",
        name: "Passing & Handling",
        sortOrder: 1,
      },
      skills: [
        {
          code: "pass_accuracy_left",
          name: "Pass Accuracy (Left)",
          sortOrder: 1,
        },
        {
          code: "pass_accuracy_right",
          name: "Pass Accuracy (Right)",
          sortOrder: 2,
        },
        {
          code: "pass_under_pressure",
          name: "Pass Under Pressure",
          sortOrder: 3,
        },
        {
          code: "offload_in_contact",
          name: "Offload in Contact",
          sortOrder: 4,
        },
        { code: "draw_and_pass", name: "Draw and Pass", sortOrder: 5 },
        { code: "spiral_long_pass", name: "Spiral / Long Pass", sortOrder: 6 },
        { code: "ball_security", name: "Ball Security", sortOrder: 7 },
      ],
    },
    {
      category: {
        code: "catching_receiving",
        name: "Catching & Receiving",
        sortOrder: 2,
      },
      skills: [
        {
          code: "high_ball_catching",
          name: "High Ball Catching",
          sortOrder: 1,
        },
        { code: "chest_body_catch", name: "Chest / Body Catch", sortOrder: 2 },
        { code: "low_ball_pickup", name: "Low Ball Pickup", sortOrder: 3 },
        {
          code: "catching_under_pressure",
          name: "Catching Under Pressure",
          sortOrder: 4,
        },
        {
          code: "hands_ready_position",
          name: "Hands Ready Position",
          sortOrder: 5,
        },
        {
          code: "watch_ball_into_hands",
          name: "Watch Ball Into Hands",
          sortOrder: 6,
        },
      ],
    },
    {
      category: {
        code: "running_ball_carry",
        name: "Running & Ball Carry",
        sortOrder: 3,
      },
      skills: [
        { code: "running_with_ball", name: "Running With Ball", sortOrder: 1 },
        {
          code: "evasion_side_step",
          name: "Evasion (Side Step)",
          sortOrder: 2,
        },
        { code: "evasion_swerve", name: "Evasion (Swerve)", sortOrder: 3 },
        { code: "dummy_pass", name: "Dummy Pass", sortOrder: 4 },
        {
          code: "acceleration_into_space",
          name: "Acceleration Into Space",
          sortOrder: 5,
        },
        {
          code: "ball_carry_into_contact",
          name: "Ball Carry Into Contact",
          sortOrder: 6,
        },
        {
          code: "body_position_balance",
          name: "Body Position / Balance",
          sortOrder: 7,
        },
      ],
    },
    {
      category: { code: "kicking", name: "Kicking", sortOrder: 4 },
      skills: [
        { code: "punt_kick_left", name: "Punt Kick (Left)", sortOrder: 1 },
        { code: "punt_kick_right", name: "Punt Kick (Right)", sortOrder: 2 },
        { code: "grubber_kick", name: "Grubber Kick", sortOrder: 3 },
        { code: "drop_kick", name: "Drop Kick", sortOrder: 4 },
        { code: "place_kicking", name: "Place Kicking", sortOrder: 5 },
        { code: "kicking_distance", name: "Kicking Distance", sortOrder: 6 },
        { code: "kick_accuracy", name: "Kick Accuracy", sortOrder: 7 },
      ],
    },
    {
      category: {
        code: "contact_breakdown",
        name: "Contact & Breakdown",
        sortOrder: 5,
      },
      skills: [
        { code: "tackle_technique", name: "Tackle Technique", sortOrder: 1 },
        { code: "tackle_completion", name: "Tackle Completion", sortOrder: 2 },
        {
          code: "rip_tag_technique",
          name: "Rip / Tag Technique",
          sortOrder: 3,
        },
        {
          code: "body_position_in_contact",
          name: "Body Position in Contact",
          sortOrder: 4,
        },
        {
          code: "leg_drive_through_contact",
          name: "Leg Drive Through Contact",
          sortOrder: 5,
        },
        { code: "ball_presentation", name: "Ball Presentation", sortOrder: 6 },
        {
          code: "ruck_entry_cleanout",
          name: "Ruck Entry / Cleanout",
          sortOrder: 7,
        },
        {
          code: "jackaling_turnovers",
          name: "Jackaling / Turnovers",
          sortOrder: 8,
        },
      ],
    },
    {
      category: {
        code: "tactical",
        name: "Tactical & Game Awareness",
        sortOrder: 6,
      },
      skills: [
        { code: "decision_making", name: "Decision Making", sortOrder: 1 },
        { code: "reading_defense", name: "Reading Defense", sortOrder: 2 },
        {
          code: "positional_understanding",
          name: "Positional Understanding",
          sortOrder: 3,
        },
        {
          code: "support_play_attack",
          name: "Support Play (Attack)",
          sortOrder: 4,
        },
        {
          code: "support_play_defense",
          name: "Support Play (Defense)",
          sortOrder: 5,
        },
        {
          code: "communication_on_field",
          name: "Communication on Field",
          sortOrder: 6,
        },
        { code: "spatial_awareness", name: "Spatial Awareness", sortOrder: 7 },
        {
          code: "game_sense_instinct",
          name: "Game Sense / Instinct",
          sortOrder: 8,
        },
        {
          code: "following_game_plan",
          name: "Following Game Plan",
          sortOrder: 9,
        },
      ],
    },
  ];

  let categoriesCreated = 0;
  let skillsCreated = 0;

  for (const { category, skills } of categoriesWithSkills) {
    let categoryId: Id<"skillCategories">;
    const existingCategory = await ctx.db
      .query("skillCategories")
      .withIndex("by_sportCode_and_code", (q: any) =>
        q.eq("sportCode", sportCode).eq("code", category.code)
      )
      .first();

    if (existingCategory) {
      categoryId = existingCategory._id;
    } else {
      categoryId = await ctx.db.insert("skillCategories", {
        sportCode,
        ...category,
        isActive: true,
        createdAt: Date.now(),
      });
      categoriesCreated += 1;
    }

    for (const skill of skills) {
      const existingSkill = await ctx.db
        .query("skillDefinitions")
        .withIndex("by_sportCode_and_code", (q: any) =>
          q.eq("sportCode", sportCode).eq("code", skill.code)
        )
        .first();

      if (!existingSkill) {
        await ctx.db.insert("skillDefinitions", {
          categoryId,
          sportCode,
          ...skill,
          isActive: true,
          createdAt: Date.now(),
        });
        skillsCreated += 1;
      }
    }
  }

  return { categoriesCreated, skillsCreated };
}

// ============================================================
// BENCHMARK SEED DATA
// ============================================================

/**
 * Seed predefined benchmarks for Soccer (FAI standards)
 * Based on Long-Term Player Development (LTPD) framework
 */
export const seedSoccerBenchmarks = internalMutation({
  args: {},
  returns: v.object({
    created: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => await seedSoccerBenchmarksHandler(ctx),
});

async function seedSoccerBenchmarksHandler(ctx: any) {
  const sportCode = "soccer";
  const source = "FAI";
  const sourceDocument = "FAI Youth Development Framework";
  const sourceYear = 2024;
  const now = Date.now();

  // Core technical skills with age-appropriate benchmarks
  // Rating scale: 1 = Beginning, 2 = Developing, 3 = Competent, 4 = Proficient, 5 = Expert
  const benchmarkData = [
    // Ball Mastery skills - progression by age
    {
      skillCode: "ball_control",
      ageExpectations: {
        u7: { expected: 1.5, min: 1.0, dev: 1.3, exc: 2.0 },
        u8: { expected: 2.0, min: 1.5, dev: 1.8, exc: 2.5 },
        u9: { expected: 2.3, min: 1.8, dev: 2.0, exc: 3.0 },
        u10: { expected: 2.5, min: 2.0, dev: 2.3, exc: 3.2 },
        u11: { expected: 2.8, min: 2.2, dev: 2.5, exc: 3.5 },
        u12: { expected: 3.0, min: 2.5, dev: 2.8, exc: 3.7 },
        u13: { expected: 3.3, min: 2.7, dev: 3.0, exc: 4.0 },
        u14: { expected: 3.5, min: 3.0, dev: 3.3, exc: 4.2 },
        u15: { expected: 3.7, min: 3.2, dev: 3.5, exc: 4.5 },
        u16: { expected: 4.0, min: 3.5, dev: 3.8, exc: 4.7 },
        u17: { expected: 4.2, min: 3.7, dev: 4.0, exc: 4.8 },
        u18: { expected: 4.5, min: 4.0, dev: 4.3, exc: 5.0 },
      },
    },
    {
      skillCode: "dribbling",
      ageExpectations: {
        u7: { expected: 1.5, min: 1.0, dev: 1.3, exc: 2.0 },
        u8: { expected: 1.8, min: 1.3, dev: 1.5, exc: 2.3 },
        u9: { expected: 2.2, min: 1.7, dev: 2.0, exc: 2.8 },
        u10: { expected: 2.5, min: 2.0, dev: 2.3, exc: 3.2 },
        u11: { expected: 2.8, min: 2.3, dev: 2.5, exc: 3.5 },
        u12: { expected: 3.0, min: 2.5, dev: 2.8, exc: 3.7 },
        u13: { expected: 3.3, min: 2.8, dev: 3.0, exc: 4.0 },
        u14: { expected: 3.5, min: 3.0, dev: 3.3, exc: 4.2 },
        u15: { expected: 3.8, min: 3.3, dev: 3.5, exc: 4.5 },
        u16: { expected: 4.0, min: 3.5, dev: 3.8, exc: 4.7 },
        u17: { expected: 4.3, min: 3.8, dev: 4.0, exc: 4.9 },
        u18: { expected: 4.5, min: 4.0, dev: 4.3, exc: 5.0 },
      },
    },
    {
      skillCode: "first_touch",
      ageExpectations: {
        u7: { expected: 1.5, min: 1.0, dev: 1.3, exc: 2.0 },
        u8: { expected: 1.8, min: 1.3, dev: 1.5, exc: 2.3 },
        u9: { expected: 2.2, min: 1.7, dev: 2.0, exc: 2.8 },
        u10: { expected: 2.5, min: 2.0, dev: 2.3, exc: 3.0 },
        u11: { expected: 2.8, min: 2.3, dev: 2.5, exc: 3.5 },
        u12: { expected: 3.2, min: 2.7, dev: 3.0, exc: 3.8 },
        u13: { expected: 3.5, min: 3.0, dev: 3.3, exc: 4.0 },
        u14: { expected: 3.7, min: 3.2, dev: 3.5, exc: 4.3 },
        u15: { expected: 4.0, min: 3.5, dev: 3.8, exc: 4.5 },
        u16: { expected: 4.2, min: 3.7, dev: 4.0, exc: 4.7 },
        u17: { expected: 4.4, min: 4.0, dev: 4.2, exc: 4.9 },
        u18: { expected: 4.6, min: 4.2, dev: 4.4, exc: 5.0 },
      },
    },
    // Passing skills
    {
      skillCode: "passing",
      ageExpectations: {
        u7: { expected: 1.5, min: 1.0, dev: 1.3, exc: 2.0 },
        u8: { expected: 1.8, min: 1.3, dev: 1.5, exc: 2.5 },
        u9: { expected: 2.2, min: 1.7, dev: 2.0, exc: 2.8 },
        u10: { expected: 2.5, min: 2.0, dev: 2.3, exc: 3.2 },
        u11: { expected: 2.8, min: 2.3, dev: 2.5, exc: 3.5 },
        u12: { expected: 3.2, min: 2.7, dev: 3.0, exc: 3.8 },
        u13: { expected: 3.5, min: 3.0, dev: 3.3, exc: 4.0 },
        u14: { expected: 3.7, min: 3.2, dev: 3.5, exc: 4.3 },
        u15: { expected: 4.0, min: 3.5, dev: 3.8, exc: 4.5 },
        u16: { expected: 4.2, min: 3.7, dev: 4.0, exc: 4.7 },
        u17: { expected: 4.4, min: 4.0, dev: 4.2, exc: 4.9 },
        u18: { expected: 4.6, min: 4.2, dev: 4.4, exc: 5.0 },
      },
    },
    // Shooting skills - introduced later in development
    {
      skillCode: "shot_accuracy",
      ageExpectations: {
        u9: { expected: 1.5, min: 1.0, dev: 1.3, exc: 2.0 },
        u10: { expected: 2.0, min: 1.5, dev: 1.8, exc: 2.5 },
        u11: { expected: 2.3, min: 1.8, dev: 2.0, exc: 3.0 },
        u12: { expected: 2.7, min: 2.2, dev: 2.5, exc: 3.3 },
        u13: { expected: 3.0, min: 2.5, dev: 2.8, exc: 3.7 },
        u14: { expected: 3.3, min: 2.8, dev: 3.0, exc: 4.0 },
        u15: { expected: 3.5, min: 3.0, dev: 3.3, exc: 4.2 },
        u16: { expected: 3.8, min: 3.3, dev: 3.5, exc: 4.5 },
        u17: { expected: 4.0, min: 3.5, dev: 3.8, exc: 4.7 },
        u18: { expected: 4.3, min: 3.8, dev: 4.0, exc: 5.0 },
      },
    },
    // Tactical awareness - develops with age
    {
      skillCode: "decision_making",
      ageExpectations: {
        u10: { expected: 1.5, min: 1.0, dev: 1.3, exc: 2.0 },
        u11: { expected: 1.8, min: 1.3, dev: 1.5, exc: 2.3 },
        u12: { expected: 2.2, min: 1.7, dev: 2.0, exc: 2.8 },
        u13: { expected: 2.5, min: 2.0, dev: 2.3, exc: 3.2 },
        u14: { expected: 2.8, min: 2.3, dev: 2.5, exc: 3.5 },
        u15: { expected: 3.2, min: 2.7, dev: 3.0, exc: 3.8 },
        u16: { expected: 3.5, min: 3.0, dev: 3.3, exc: 4.2 },
        u17: { expected: 3.8, min: 3.3, dev: 3.5, exc: 4.5 },
        u18: { expected: 4.2, min: 3.7, dev: 4.0, exc: 4.8 },
      },
    },
    {
      skillCode: "awareness",
      ageExpectations: {
        u9: { expected: 1.5, min: 1.0, dev: 1.3, exc: 2.0 },
        u10: { expected: 1.8, min: 1.3, dev: 1.5, exc: 2.3 },
        u11: { expected: 2.2, min: 1.7, dev: 2.0, exc: 2.8 },
        u12: { expected: 2.5, min: 2.0, dev: 2.3, exc: 3.2 },
        u13: { expected: 2.8, min: 2.3, dev: 2.5, exc: 3.5 },
        u14: { expected: 3.2, min: 2.7, dev: 3.0, exc: 3.8 },
        u15: { expected: 3.5, min: 3.0, dev: 3.3, exc: 4.2 },
        u16: { expected: 3.8, min: 3.3, dev: 3.5, exc: 4.5 },
        u17: { expected: 4.0, min: 3.5, dev: 3.8, exc: 4.7 },
        u18: { expected: 4.3, min: 3.8, dev: 4.0, exc: 5.0 },
      },
    },
    // Character skills
    {
      skillCode: "coachability",
      ageExpectations: {
        u7: { expected: 2.0, min: 1.5, dev: 1.8, exc: 2.5 },
        u8: { expected: 2.3, min: 1.8, dev: 2.0, exc: 3.0 },
        u9: { expected: 2.5, min: 2.0, dev: 2.3, exc: 3.2 },
        u10: { expected: 2.8, min: 2.3, dev: 2.5, exc: 3.5 },
        u11: { expected: 3.0, min: 2.5, dev: 2.8, exc: 3.7 },
        u12: { expected: 3.3, min: 2.8, dev: 3.0, exc: 4.0 },
        u13: { expected: 3.5, min: 3.0, dev: 3.3, exc: 4.2 },
        u14: { expected: 3.7, min: 3.2, dev: 3.5, exc: 4.5 },
        u15: { expected: 4.0, min: 3.5, dev: 3.8, exc: 4.7 },
        u16: { expected: 4.2, min: 3.7, dev: 4.0, exc: 4.8 },
        u17: { expected: 4.4, min: 4.0, dev: 4.2, exc: 4.9 },
        u18: { expected: 4.5, min: 4.2, dev: 4.4, exc: 5.0 },
      },
    },
    {
      skillCode: "team_orientation",
      ageExpectations: {
        u7: { expected: 1.8, min: 1.3, dev: 1.5, exc: 2.3 },
        u8: { expected: 2.0, min: 1.5, dev: 1.8, exc: 2.5 },
        u9: { expected: 2.3, min: 1.8, dev: 2.0, exc: 3.0 },
        u10: { expected: 2.5, min: 2.0, dev: 2.3, exc: 3.2 },
        u11: { expected: 2.8, min: 2.3, dev: 2.5, exc: 3.5 },
        u12: { expected: 3.0, min: 2.5, dev: 2.8, exc: 3.7 },
        u13: { expected: 3.3, min: 2.8, dev: 3.0, exc: 4.0 },
        u14: { expected: 3.5, min: 3.0, dev: 3.3, exc: 4.2 },
        u15: { expected: 3.8, min: 3.3, dev: 3.5, exc: 4.5 },
        u16: { expected: 4.0, min: 3.5, dev: 3.8, exc: 4.7 },
        u17: { expected: 4.3, min: 3.8, dev: 4.0, exc: 4.8 },
        u18: { expected: 4.5, min: 4.0, dev: 4.3, exc: 5.0 },
      },
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const { skillCode, ageExpectations } of benchmarkData) {
    for (const [ageGroup, expectations] of Object.entries(ageExpectations)) {
      const existing = await ctx.db
        .query("skillBenchmarks")
        .withIndex("by_context", (q: any) =>
          q
            .eq("sportCode", sportCode)
            .eq("skillCode", skillCode)
            .eq("ageGroup", ageGroup)
            .eq("gender", "all")
            .eq("level", "recreational")
        )
        .first();

      if (existing) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("skillBenchmarks", {
        sportCode,
        skillCode,
        ageGroup,
        gender: "all",
        level: "recreational",
        expectedRating: expectations.expected,
        minAcceptable: expectations.min,
        developingThreshold: expectations.dev,
        excellentThreshold: expectations.exc,
        source,
        sourceDocument,
        sourceYear,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      created += 1;
    }
  }

  return { created, skipped };
}

/**
 * Seed predefined benchmarks for GAA Football (GAA standards)
 */
export const seedGAABenchmarks = internalMutation({
  args: {},
  returns: v.object({
    created: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => await seedGAABenchmarksHandler(ctx),
});

async function seedGAABenchmarksHandler(ctx: any) {
  const sportCode = "gaa_football";
  const source = "GAA";
  const sourceDocument = "GAA Player Pathway Framework";
  const sourceYear = 2024;
  const now = Date.now();

  const benchmarkData = [
    // Core GAA skills - aligned with skill codes from seedGAASkillsHandler
    {
      skillCode: "soloing",
      ageExpectations: {
        u8: { expected: 1.5, min: 1.0, dev: 1.3, exc: 2.0 },
        u9: { expected: 2.0, min: 1.5, dev: 1.8, exc: 2.5 },
        u10: { expected: 2.5, min: 2.0, dev: 2.3, exc: 3.0 },
        u11: { expected: 2.8, min: 2.3, dev: 2.5, exc: 3.5 },
        u12: { expected: 3.2, min: 2.7, dev: 3.0, exc: 3.8 },
        u13: { expected: 3.5, min: 3.0, dev: 3.3, exc: 4.0 },
        u14: { expected: 3.8, min: 3.3, dev: 3.5, exc: 4.3 },
        u15: { expected: 4.0, min: 3.5, dev: 3.8, exc: 4.5 },
        u16: { expected: 4.2, min: 3.7, dev: 4.0, exc: 4.7 },
        u17: { expected: 4.4, min: 4.0, dev: 4.2, exc: 4.9 },
        u18: { expected: 4.6, min: 4.2, dev: 4.4, exc: 5.0 },
      },
    },
    {
      skillCode: "hand_passing",
      ageExpectations: {
        u8: { expected: 1.8, min: 1.3, dev: 1.5, exc: 2.3 },
        u9: { expected: 2.2, min: 1.7, dev: 2.0, exc: 2.8 },
        u10: { expected: 2.5, min: 2.0, dev: 2.3, exc: 3.2 },
        u11: { expected: 2.8, min: 2.3, dev: 2.5, exc: 3.5 },
        u12: { expected: 3.2, min: 2.7, dev: 3.0, exc: 3.8 },
        u13: { expected: 3.5, min: 3.0, dev: 3.3, exc: 4.2 },
        u14: { expected: 3.8, min: 3.3, dev: 3.5, exc: 4.5 },
        u15: { expected: 4.0, min: 3.5, dev: 3.8, exc: 4.7 },
        u16: { expected: 4.3, min: 3.8, dev: 4.0, exc: 4.8 },
        u17: { expected: 4.5, min: 4.0, dev: 4.3, exc: 4.9 },
        u18: { expected: 4.7, min: 4.3, dev: 4.5, exc: 5.0 },
      },
    },
    {
      skillCode: "kicking_long",
      ageExpectations: {
        u9: { expected: 1.5, min: 1.0, dev: 1.3, exc: 2.0 },
        u10: { expected: 2.0, min: 1.5, dev: 1.8, exc: 2.5 },
        u11: { expected: 2.3, min: 1.8, dev: 2.0, exc: 3.0 },
        u12: { expected: 2.7, min: 2.2, dev: 2.5, exc: 3.3 },
        u13: { expected: 3.0, min: 2.5, dev: 2.8, exc: 3.7 },
        u14: { expected: 3.3, min: 2.8, dev: 3.0, exc: 4.0 },
        u15: { expected: 3.6, min: 3.1, dev: 3.3, exc: 4.3 },
        u16: { expected: 3.9, min: 3.4, dev: 3.6, exc: 4.5 },
        u17: { expected: 4.2, min: 3.7, dev: 4.0, exc: 4.8 },
        u18: { expected: 4.5, min: 4.0, dev: 4.3, exc: 5.0 },
      },
    },
    {
      skillCode: "high_catching",
      ageExpectations: {
        u10: { expected: 1.8, min: 1.3, dev: 1.5, exc: 2.3 },
        u11: { expected: 2.2, min: 1.7, dev: 2.0, exc: 2.8 },
        u12: { expected: 2.5, min: 2.0, dev: 2.3, exc: 3.2 },
        u13: { expected: 2.8, min: 2.3, dev: 2.5, exc: 3.5 },
        u14: { expected: 3.2, min: 2.7, dev: 3.0, exc: 3.8 },
        u15: { expected: 3.5, min: 3.0, dev: 3.3, exc: 4.2 },
        u16: { expected: 3.8, min: 3.3, dev: 3.5, exc: 4.5 },
        u17: { expected: 4.0, min: 3.5, dev: 3.8, exc: 4.7 },
        u18: { expected: 4.3, min: 3.8, dev: 4.0, exc: 5.0 },
      },
    },
    {
      skillCode: "tackling",
      ageExpectations: {
        u10: { expected: 1.5, min: 1.0, dev: 1.3, exc: 2.0 },
        u11: { expected: 2.0, min: 1.5, dev: 1.8, exc: 2.5 },
        u12: { expected: 2.3, min: 1.8, dev: 2.0, exc: 3.0 },
        u13: { expected: 2.7, min: 2.2, dev: 2.5, exc: 3.3 },
        u14: { expected: 3.0, min: 2.5, dev: 2.8, exc: 3.7 },
        u15: { expected: 3.3, min: 2.8, dev: 3.0, exc: 4.0 },
        u16: { expected: 3.6, min: 3.1, dev: 3.3, exc: 4.3 },
        u17: { expected: 4.0, min: 3.5, dev: 3.8, exc: 4.6 },
        u18: { expected: 4.3, min: 3.8, dev: 4.0, exc: 4.9 },
      },
    },
    {
      skillCode: "decision_making",
      ageExpectations: {
        u10: { expected: 1.5, min: 1.0, dev: 1.3, exc: 2.0 },
        u11: { expected: 1.8, min: 1.3, dev: 1.5, exc: 2.3 },
        u12: { expected: 2.2, min: 1.7, dev: 2.0, exc: 2.8 },
        u13: { expected: 2.5, min: 2.0, dev: 2.3, exc: 3.2 },
        u14: { expected: 2.8, min: 2.3, dev: 2.5, exc: 3.5 },
        u15: { expected: 3.2, min: 2.7, dev: 3.0, exc: 3.8 },
        u16: { expected: 3.5, min: 3.0, dev: 3.3, exc: 4.2 },
        u17: { expected: 3.8, min: 3.3, dev: 3.5, exc: 4.5 },
        u18: { expected: 4.2, min: 3.7, dev: 4.0, exc: 4.8 },
      },
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const { skillCode, ageExpectations } of benchmarkData) {
    for (const [ageGroup, expectations] of Object.entries(ageExpectations)) {
      const existing = await ctx.db
        .query("skillBenchmarks")
        .withIndex("by_context", (q: any) =>
          q
            .eq("sportCode", sportCode)
            .eq("skillCode", skillCode)
            .eq("ageGroup", ageGroup)
            .eq("gender", "all")
            .eq("level", "recreational")
        )
        .first();

      if (existing) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("skillBenchmarks", {
        sportCode,
        skillCode,
        ageGroup,
        gender: "all",
        level: "recreational",
        expectedRating: expectations.expected,
        minAcceptable: expectations.min,
        developingThreshold: expectations.dev,
        excellentThreshold: expectations.exc,
        source,
        sourceDocument,
        sourceYear,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      created += 1;
    }
  }

  return { created, skipped };
}

/**
 * Seed all benchmarks for all sports
 */
export const seedAllBenchmarks = internalMutation({
  args: {},
  returns: v.object({
    soccer: v.object({ created: v.number(), skipped: v.number() }),
    gaa: v.object({ created: v.number(), skipped: v.number() }),
  }),
  handler: async (ctx) => {
    const soccerResult = await seedSoccerBenchmarksHandler(ctx);
    const gaaResult = await seedGAABenchmarksHandler(ctx);
    return {
      soccer: soccerResult,
      gaa: gaaResult,
    };
  },
});

/**
 * Public mutation to seed all NGB benchmarks
 * Call this from the platform staff dashboard or Convex dashboard
 */
export const seedNGBBenchmarks = mutation({
  args: {},
  returns: v.object({
    soccer: v.object({ created: v.number(), skipped: v.number() }),
    gaa: v.object({ created: v.number(), skipped: v.number() }),
    total: v.number(),
  }),
  handler: async (ctx) => {
    const soccerResult = await seedSoccerBenchmarksHandler(ctx);
    const gaaResult = await seedGAABenchmarksHandler(ctx);
    return {
      soccer: soccerResult,
      gaa: gaaResult,
      total: soccerResult.created + gaaResult.created,
    };
  },
});

// ============================================================
// AGE GROUP HELPERS
// ============================================================

/**
 * Calculate age group from date of birth
 */
export const getAgeGroupFromDOB = query({
  args: {
    dateOfBirth: v.string(), // YYYY-MM-DD format
    referenceDate: v.optional(v.string()), // Optional, defaults to today
  },
  returns: v.union(
    v.object({
      code: v.string(),
      name: v.string(),
      ltadStage: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const dob = new Date(args.dateOfBirth);
    const refDate = args.referenceDate
      ? new Date(args.referenceDate)
      : new Date();

    // Calculate age in years
    let age = refDate.getFullYear() - dob.getFullYear();
    const monthDiff = refDate.getMonth() - dob.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && refDate.getDate() < dob.getDate())
    ) {
      age -= 1;
    }

    // Find matching age group
    const ageGroups = await ctx.db
      .query("ageGroups")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    // Sort by sortOrder to get the right match
    ageGroups.sort((a, b) => a.sortOrder - b.sortOrder);

    for (const ag of ageGroups) {
      if (ag.code === "senior") {
        continue; // Handle senior separately
      }

      if (
        ag.minAge !== undefined &&
        ag.maxAge !== undefined &&
        age >= ag.minAge &&
        age < ag.maxAge
      ) {
        return {
          code: ag.code,
          name: ag.name,
          ltadStage: ag.ltadStage,
        };
      }
    }

    // If 18+, return senior
    if (age >= 18) {
      const senior = ageGroups.find((ag) => ag.code === "senior");
      if (senior) {
        return {
          code: senior.code,
          name: senior.name,
          ltadStage: senior.ltadStage,
        };
      }
    }

    return null;
  },
});

/**
 * Get benchmarks for a player based on their DOB (primary) or enrollment age group (fallback).
 * Uses "match upward" logic: if no exact age group match exists, finds the nearest
 * benchmark age group above the player's age group (e.g., U13 player gets U14 benchmarks).
 */
export const getBenchmarksForPlayer = query({
  args: {
    sportCode: v.string(),
    dateOfBirth: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    level: v.optional(
      v.union(
        v.literal("recreational"),
        v.literal("competitive"),
        v.literal("development"),
        v.literal("elite")
      )
    ),
  },
  returns: v.array(
    v.object({
      skillCode: v.string(),
      expectedRating: v.number(),
      minAcceptable: v.number(),
      developingThreshold: v.number(),
      excellentThreshold: v.number(),
      ageGroup: v.string(),
      source: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    // Determine player's age group: DOB-based calculation is primary, enrollment ageGroup is fallback
    let ageGroupCode: string | null = null;

    if (args.dateOfBirth) {
      const dob = new Date(args.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < dob.getDate())
      ) {
        age -= 1;
      }

      if (age < 6) {
        ageGroupCode = "u6";
      } else if (age < 7) {
        ageGroupCode = "u7";
      } else if (age < 8) {
        ageGroupCode = "u8";
      } else if (age < 9) {
        ageGroupCode = "u9";
      } else if (age < 10) {
        ageGroupCode = "u10";
      } else if (age < 11) {
        ageGroupCode = "u11";
      } else if (age < 12) {
        ageGroupCode = "u12";
      } else if (age < 13) {
        ageGroupCode = "u13";
      } else if (age < 14) {
        ageGroupCode = "u14";
      } else if (age < 15) {
        ageGroupCode = "u15";
      } else if (age < 16) {
        ageGroupCode = "u16";
      } else if (age < 17) {
        ageGroupCode = "u17";
      } else if (age < 18) {
        ageGroupCode = "u18";
      } else if (age < 21) {
        ageGroupCode = "u21";
      } else {
        ageGroupCode = "senior";
      }
    } else if (args.ageGroup) {
      ageGroupCode = args.ageGroup.toLowerCase();
    }

    if (!ageGroupCode) {
      return [];
    }

    const level = args.level ?? "recreational";

    // Get all active benchmarks for this sport
    const allBenchmarks = await ctx.db
      .query("skillBenchmarks")
      .withIndex("by_sportCode", (q) => q.eq("sportCode", args.sportCode))
      .collect();

    const activeBenchmarks = allBenchmarks.filter(
      (b) => b.isActive && b.level === level && b.gender === "all"
    );

    if (activeBenchmarks.length === 0) {
      return [];
    }

    // Get distinct benchmark age groups with their ranks
    const benchmarkAgeGroups = [
      ...new Set(activeBenchmarks.map((b) => b.ageGroup.toLowerCase())),
    ];
    const playerRank = getAgeGroupRank(ageGroupCode);

    // Find target age group: lowest-ranked benchmark age group where rank >= playerRank
    let targetAgeGroup: string | null = null;

    if (playerRank === -1) {
      // Unknown age group — try exact match as last resort
      targetAgeGroup =
        benchmarkAgeGroups.find((ag) => ag === ageGroupCode) ?? null;
    } else {
      const ranked = benchmarkAgeGroups
        .map((ag) => ({ ag, rank: getAgeGroupRank(ag) }))
        .filter((x) => x.rank !== -1)
        .sort((a, b) => a.rank - b.rank);

      // Find the lowest-ranked benchmark age group >= player's rank (match upward)
      const upward = ranked.find((x) => x.rank >= playerRank);
      if (upward) {
        targetAgeGroup = upward.ag;
      } else if (ranked.length > 0) {
        // No match above — use the highest available (Senior)
        targetAgeGroup = ranked.at(-1)?.ag ?? null;
      }
    }

    if (!targetAgeGroup) {
      return [];
    }

    return activeBenchmarks
      .filter((b) => b.ageGroup.toLowerCase() === targetAgeGroup)
      .map((b) => ({
        skillCode: b.skillCode,
        expectedRating: b.expectedRating,
        minAcceptable: b.minAcceptable,
        developingThreshold: b.developingThreshold,
        excellentThreshold: b.excellentThreshold,
        ageGroup: b.ageGroup,
        source: b.source,
      }));
  },
});

// ============================================================
// EXPORT QUERIES - For data export and backup
// ============================================================

/**
 * Export all skill categories (for all sports, including inactive)
 * Used for data backup and reference
 */
export const exportAllSkillCategories = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("skillCategories"),
      _creationTime: v.number(),
      sportCode: v.string(),
      code: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      sortOrder: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("skillCategories")
      .collect()
      .then((cats) =>
        cats.sort((a, b) => {
          // Sort by sportCode first, then sortOrder
          if (a.sportCode !== b.sportCode) {
            return a.sportCode.localeCompare(b.sportCode);
          }
          return a.sortOrder - b.sortOrder;
        })
      );
  },
});

/**
 * Export all skill definitions (for all sports, including inactive)
 * Used for data backup and reference
 */
export const exportAllSkillDefinitions = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("skillDefinitions"),
      _creationTime: v.number(),
      categoryId: v.id("skillCategories"),
      sportCode: v.string(),
      code: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      level1Descriptor: v.optional(v.string()),
      level2Descriptor: v.optional(v.string()),
      level3Descriptor: v.optional(v.string()),
      level4Descriptor: v.optional(v.string()),
      level5Descriptor: v.optional(v.string()),
      ageGroupRelevance: v.optional(v.array(v.string())),
      sortOrder: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("skillDefinitions")
      .collect()
      .then((skills) =>
        skills.sort((a, b) => {
          // Sort by sportCode first, then sortOrder
          if (a.sportCode !== b.sportCode) {
            return a.sportCode.localeCompare(b.sportCode);
          }
          return a.sortOrder - b.sortOrder;
        })
      );
  },
});

/**
 * Export complete skills data structure (categories + definitions grouped)
 * Returns a structured export with categories and their skills nested
 */
export const exportCompleteSkillsData = query({
  args: {},
  returns: v.object({
    exportedAt: v.number(),
    sports: v.array(
      v.object({
        sportCode: v.string(),
        categories: v.array(
          v.object({
            _id: v.id("skillCategories"),
            _creationTime: v.number(),
            code: v.string(),
            name: v.string(),
            description: v.optional(v.string()),
            sortOrder: v.number(),
            isActive: v.boolean(),
            createdAt: v.number(),
            skills: v.array(
              v.object({
                _id: v.id("skillDefinitions"),
                _creationTime: v.number(),
                code: v.string(),
                name: v.string(),
                description: v.optional(v.string()),
                level1Descriptor: v.optional(v.string()),
                level2Descriptor: v.optional(v.string()),
                level3Descriptor: v.optional(v.string()),
                level4Descriptor: v.optional(v.string()),
                level5Descriptor: v.optional(v.string()),
                ageGroupRelevance: v.optional(v.array(v.string())),
                sortOrder: v.number(),
                isActive: v.boolean(),
                createdAt: v.number(),
              })
            ),
          })
        ),
      })
    ),
  }),
  handler: async (ctx) => {
    // Get all categories
    const allCategories = await ctx.db.query("skillCategories").collect();

    // Get all skills
    const allSkills = await ctx.db.query("skillDefinitions").collect();

    // Group by sport
    const sportsMap = new Map<string, typeof allCategories>();
    for (const category of allCategories) {
      if (!sportsMap.has(category.sportCode)) {
        sportsMap.set(category.sportCode, []);
      }
      sportsMap.get(category.sportCode)?.push(category);
    }

    // Build structured export
    const sports = Array.from(sportsMap.entries()).map(
      ([sportCode, categories]) => {
        // Sort categories by sortOrder
        const sortedCategories = categories.sort(
          (a, b) => a.sortOrder - b.sortOrder
        );

        // For each category, get its skills
        const categoriesWithSkills = sortedCategories.map((category) => {
          const categorySkills = allSkills
            .filter((skill) => skill.categoryId === category._id)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          return {
            _id: category._id,
            _creationTime: category._creationTime,
            code: category.code,
            name: category.name,
            description: category.description,
            sortOrder: category.sortOrder,
            isActive: category.isActive,
            createdAt: category.createdAt,
            skills: categorySkills.map((skill) => ({
              _id: skill._id,
              _creationTime: skill._creationTime,
              code: skill.code,
              name: skill.name,
              description: skill.description,
              level1Descriptor: skill.level1Descriptor,
              level2Descriptor: skill.level2Descriptor,
              level3Descriptor: skill.level3Descriptor,
              level4Descriptor: skill.level4Descriptor,
              level5Descriptor: skill.level5Descriptor,
              ageGroupRelevance: skill.ageGroupRelevance,
              sortOrder: skill.sortOrder,
              isActive: skill.isActive,
              createdAt: skill.createdAt,
            })),
          };
        });

        return {
          sportCode,
          categories: categoriesWithSkills,
        };
      }
    );

    return {
      exportedAt: Date.now(),
      sports: sports.sort((a, b) => a.sportCode.localeCompare(b.sportCode)),
    };
  },
});

/**
 * Import complete skills data from exported JSON file
 * This is used for restoring benchmark data after dev data cleanup
 */
export const importCompleteSkillsData = mutation({
  args: {
    skillsData: v.object({
      exportedAt: v.optional(v.union(v.number(), v.string())),
      sports: v.array(
        v.object({
          sportCode: v.string(),
          categories: v.array(
            v.object({
              // Core fields needed for import
              code: v.string(),
              name: v.string(),
              description: v.optional(v.string()),
              sortOrder: v.number(),
              // Extra fields from export (ignored during import)
              _id: v.optional(v.id("skillCategories")),
              _creationTime: v.optional(v.number()),
              sportCode: v.optional(v.string()),
              isActive: v.optional(v.boolean()),
              createdAt: v.optional(v.number()),
              skills: v.array(
                v.object({
                  // Core fields needed for import
                  code: v.string(),
                  name: v.string(),
                  description: v.optional(v.string()),
                  level1Descriptor: v.optional(v.string()),
                  level2Descriptor: v.optional(v.string()),
                  level3Descriptor: v.optional(v.string()),
                  level4Descriptor: v.optional(v.string()),
                  level5Descriptor: v.optional(v.string()),
                  ageGroupRelevance: v.optional(v.array(v.string())),
                  sortOrder: v.number(),
                  // Extra fields from export (ignored during import)
                  _id: v.optional(v.id("skillDefinitions")),
                  _creationTime: v.optional(v.number()),
                  categoryId: v.optional(v.id("skillCategories")),
                  sportCode: v.optional(v.string()),
                  isActive: v.optional(v.boolean()),
                  createdAt: v.optional(v.number()),
                })
              ),
            })
          ),
        })
      ),
    }),
    replaceExisting: v.optional(v.boolean()),
    ensureSportsExist: v.optional(v.boolean()),
  },
  returns: v.object({
    sportsProcessed: v.number(),
    totalCategoriesCreated: v.number(),
    totalCategoriesUpdated: v.number(),
    totalSkillsCreated: v.number(),
    totalSkillsUpdated: v.number(),
    details: v.array(
      v.object({
        sportCode: v.string(),
        categoriesCreated: v.number(),
        categoriesUpdated: v.number(),
        skillsCreated: v.number(),
        skillsUpdated: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const results = {
      sportsProcessed: 0,
      totalCategoriesCreated: 0,
      totalCategoriesUpdated: 0,
      totalSkillsCreated: 0,
      totalSkillsUpdated: 0,
      details: [] as Array<{
        sportCode: string;
        categoriesCreated: number;
        categoriesUpdated: number;
        skillsCreated: number;
        skillsUpdated: number;
      }>,
    };

    // Ensure sports exist if requested
    if (args.ensureSportsExist) {
      await seedSportsHandler(ctx);
    }

    // Import skills for each sport
    for (const sportData of args.skillsData.sports) {
      // Verify sport exists
      const sport = await ctx.db
        .query("sports")
        .withIndex("by_code", (q) => q.eq("code", sportData.sportCode))
        .first();

      if (!sport) {
        throw new Error(
          `Sport with code '${sportData.sportCode}' not found. Set ensureSportsExist: true to auto-create sports.`
        );
      }

      // Import skills using existing importSkillsForSport logic
      let categoriesCreated = 0;
      let categoriesUpdated = 0;
      let skillsCreated = 0;
      let skillsUpdated = 0;

      for (const categoryData of sportData.categories) {
        // Find or create category
        let categoryId: Id<"skillCategories">;
        const existingCategory = await ctx.db
          .query("skillCategories")
          .withIndex("by_sportCode_and_code", (q) =>
            q.eq("sportCode", sportData.sportCode).eq("code", categoryData.code)
          )
          .first();

        if (existingCategory) {
          categoryId = existingCategory._id;
          if (args.replaceExisting) {
            await ctx.db.patch(categoryId, {
              name: categoryData.name,
              description: categoryData.description,
              sortOrder: categoryData.sortOrder,
              isActive: true,
            });
            categoriesUpdated += 1;
          }
        } else {
          categoryId = await ctx.db.insert("skillCategories", {
            sportCode: sportData.sportCode,
            code: categoryData.code,
            name: categoryData.name,
            description: categoryData.description,
            sortOrder: categoryData.sortOrder,
            isActive: true,
            createdAt: Date.now(),
          });
          categoriesCreated += 1;
        }

        // Process skills in this category
        for (const skillData of categoryData.skills) {
          const existingSkill = await ctx.db
            .query("skillDefinitions")
            .withIndex("by_sportCode_and_code", (q) =>
              q.eq("sportCode", sportData.sportCode).eq("code", skillData.code)
            )
            .first();

          if (existingSkill) {
            if (args.replaceExisting) {
              await ctx.db.patch(existingSkill._id, {
                categoryId,
                name: skillData.name,
                description: skillData.description,
                level1Descriptor: skillData.level1Descriptor,
                level2Descriptor: skillData.level2Descriptor,
                level3Descriptor: skillData.level3Descriptor,
                level4Descriptor: skillData.level4Descriptor,
                level5Descriptor: skillData.level5Descriptor,
                ageGroupRelevance: skillData.ageGroupRelevance,
                sortOrder: skillData.sortOrder,
                isActive: true,
              });
              skillsUpdated += 1;
            }
          } else {
            await ctx.db.insert("skillDefinitions", {
              categoryId,
              sportCode: sportData.sportCode,
              code: skillData.code,
              name: skillData.name,
              description: skillData.description,
              level1Descriptor: skillData.level1Descriptor,
              level2Descriptor: skillData.level2Descriptor,
              level3Descriptor: skillData.level3Descriptor,
              level4Descriptor: skillData.level4Descriptor,
              level5Descriptor: skillData.level5Descriptor,
              ageGroupRelevance: skillData.ageGroupRelevance,
              sortOrder: skillData.sortOrder,
              isActive: true,
              createdAt: Date.now(),
            });
            skillsCreated += 1;
          }
        }
      }

      results.sportsProcessed += 1;
      results.totalCategoriesCreated += categoriesCreated;
      results.totalCategoriesUpdated += categoriesUpdated;
      results.totalSkillsCreated += skillsCreated;
      results.totalSkillsUpdated += skillsUpdated;
      results.details.push({
        sportCode: sportData.sportCode,
        categoriesCreated,
        categoriesUpdated,
        skillsCreated,
        skillsUpdated,
      });
    }

    return results;
  },
});
