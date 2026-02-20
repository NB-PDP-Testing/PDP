import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============================================================
// IMPORT TEMPLATES CRUD
// ============================================================
// Manages sport-specific and organization-specific import
// configurations (column mappings, age group mappings,
// skill initialization strategy, defaults).
// ============================================================

// Shared validator shapes
const columnMappingValidator = v.object({
  sourcePattern: v.string(),
  targetField: v.string(),
  required: v.boolean(),
  transform: v.optional(v.string()),
  aliases: v.optional(v.array(v.string())),
});

const ageGroupMappingValidator = v.object({
  sourceValue: v.string(),
  targetAgeGroup: v.string(),
});

const skillInitializationValidator = v.object({
  strategy: v.union(
    v.literal("blank"),
    v.literal("middle"),
    v.literal("age-appropriate"),
    v.literal("ngb-benchmarks"),
    v.literal("custom")
  ),
  customBenchmarkTemplateId: v.optional(v.id("benchmarkTemplates")),
  applyToPassportStatus: v.optional(v.array(v.string())),
});

const defaultsValidator = v.object({
  createTeams: v.boolean(),
  createPassports: v.boolean(),
  season: v.optional(v.string()),
});

const templateReturnValidator = v.object({
  _id: v.id("importTemplates"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  sportCode: v.optional(v.string()),
  sourceType: v.union(v.literal("csv"), v.literal("excel"), v.literal("paste")),
  scope: v.union(v.literal("platform"), v.literal("organization")),
  organizationId: v.optional(v.string()),
  columnMappings: v.array(columnMappingValidator),
  ageGroupMappings: v.optional(v.array(ageGroupMappingValidator)),
  skillInitialization: skillInitializationValidator,
  defaults: defaultsValidator,
  isActive: v.boolean(),
  createdBy: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/**
 * Create a new import template
 */
export const createTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    sportCode: v.optional(v.string()),
    sourceType: v.union(
      v.literal("csv"),
      v.literal("excel"),
      v.literal("paste")
    ),
    scope: v.union(v.literal("platform"), v.literal("organization")),
    organizationId: v.optional(v.string()),
    columnMappings: v.array(columnMappingValidator),
    ageGroupMappings: v.optional(v.array(ageGroupMappingValidator)),
    skillInitialization: skillInitializationValidator,
    defaults: defaultsValidator,
    createdBy: v.string(),
  },
  returns: v.id("importTemplates"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("importTemplates", {
      name: args.name,
      description: args.description,
      sportCode: args.sportCode,
      sourceType: args.sourceType,
      scope: args.scope,
      organizationId: args.organizationId,
      columnMappings: args.columnMappings,
      ageGroupMappings: args.ageGroupMappings,
      skillInitialization: args.skillInitialization,
      defaults: args.defaults,
      isActive: true,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Update an existing import template
 */
export const updateTemplate = mutation({
  args: {
    templateId: v.id("importTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sportCode: v.optional(v.string()),
    sourceType: v.optional(
      v.union(v.literal("csv"), v.literal("excel"), v.literal("paste"))
    ),
    columnMappings: v.optional(v.array(columnMappingValidator)),
    ageGroupMappings: v.optional(v.array(ageGroupMappingValidator)),
    skillInitialization: v.optional(skillInitializationValidator),
    defaults: v.optional(defaultsValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { templateId, ...updates } = args;
    const existing = await ctx.db.get(templateId);
    if (!existing) {
      throw new Error("Template not found");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (updates.name !== undefined) {
      patch.name = updates.name;
    }
    if (updates.description !== undefined) {
      patch.description = updates.description;
    }
    if (updates.sportCode !== undefined) {
      patch.sportCode = updates.sportCode;
    }
    if (updates.sourceType !== undefined) {
      patch.sourceType = updates.sourceType;
    }
    if (updates.columnMappings !== undefined) {
      patch.columnMappings = updates.columnMappings;
    }
    if (updates.ageGroupMappings !== undefined) {
      patch.ageGroupMappings = updates.ageGroupMappings;
    }
    if (updates.skillInitialization !== undefined) {
      patch.skillInitialization = updates.skillInitialization;
    }
    if (updates.defaults !== undefined) {
      patch.defaults = updates.defaults;
    }

    await ctx.db.patch(templateId, patch);
    return null;
  },
});

/**
 * Soft-delete a template (set isActive = false)
 */
export const deleteTemplate = mutation({
  args: {
    templateId: v.id("importTemplates"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.templateId);
    if (!existing) {
      throw new Error("Template not found");
    }
    await ctx.db.patch(args.templateId, {
      isActive: false,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Clone an existing template with a new name
 */
export const cloneTemplate = mutation({
  args: {
    templateId: v.id("importTemplates"),
    newName: v.string(),
    createdBy: v.string(),
  },
  returns: v.id("importTemplates"),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.templateId);
    if (!existing) {
      throw new Error("Template not found");
    }

    const now = Date.now();
    const id = await ctx.db.insert("importTemplates", {
      name: args.newName,
      description: existing.description,
      sportCode: existing.sportCode,
      sourceType: existing.sourceType,
      scope: existing.scope,
      organizationId: existing.organizationId,
      columnMappings: existing.columnMappings,
      ageGroupMappings: existing.ageGroupMappings,
      skillInitialization: existing.skillInitialization,
      defaults: existing.defaults,
      isActive: true,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Get a single template by ID
 */
export const getTemplate = query({
  args: {
    templateId: v.id("importTemplates"),
  },
  returns: v.union(templateReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template?.isActive) {
      return null;
    }
    return template;
  },
});

/**
 * List templates by scope with optional sport filter.
 * Returns only active templates.
 */
export const listTemplates = query({
  args: {
    scope: v.union(v.literal("platform"), v.literal("organization")),
    sportCode: v.optional(v.string()),
    organizationId: v.optional(v.string()),
  },
  returns: v.array(templateReturnValidator),
  handler: async (ctx, args) => {
    // Use the composite scope+sport index when sportCode is provided
    if (args.sportCode) {
      const templates = await ctx.db
        .query("importTemplates")
        .withIndex("by_scope_and_sport", (q) =>
          q.eq("scope", args.scope).eq("sportCode", args.sportCode)
        )
        .collect();
      return templates.filter((t) => t.isActive);
    }

    // Use scope-only index when no sportCode filter
    if (args.scope === "organization" && args.organizationId) {
      const templates = await ctx.db
        .query("importTemplates")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();
      return templates.filter((t) => t.isActive);
    }

    const templates = await ctx.db
      .query("importTemplates")
      .withIndex("by_scope", (q) => q.eq("scope", args.scope))
      .collect();
    return templates.filter((t) => t.isActive);
  },
});
