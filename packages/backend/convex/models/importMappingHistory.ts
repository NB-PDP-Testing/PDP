import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ============================================================
// IMPORT MAPPING HISTORY
// ============================================================
// Learns from past imports to improve auto-mapping accuracy.
// Records column mapping decisions and provides historical
// lookups for suggesting mappings in future imports.
// ============================================================

const mappingHistoryReturnValidator = v.object({
  _id: v.id("importMappingHistory"),
  _creationTime: v.number(),
  organizationId: v.optional(v.string()),
  templateId: v.optional(v.id("importTemplates")),
  sourceColumnName: v.string(),
  normalizedColumnName: v.string(),
  targetField: v.string(),
  usageCount: v.number(),
  lastUsedAt: v.number(),
  confidence: v.number(),
  createdAt: v.number(),
  aiSuggested: v.optional(v.boolean()),
  aiConfidence: v.optional(v.number()),
});

/**
 * Normalize a column name for matching:
 * lowercase, trim, remove special characters
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Record a column mapping decision (upsert pattern).
 * Increments usageCount if a matching record exists, creates if new.
 */
export const recordMappingHistory = mutation({
  args: {
    organizationId: v.optional(v.string()),
    templateId: v.optional(v.id("importTemplates")),
    sourceColumnName: v.string(),
    targetField: v.string(),
    aiSuggested: v.optional(v.boolean()),
    aiConfidence: v.optional(v.number()),
  },
  returns: v.id("importMappingHistory"),
  handler: async (ctx, args) => {
    const normalized = normalizeColumnName(args.sourceColumnName);
    const now = Date.now();

    // Look for existing record with same normalized name and target field
    const existing = await ctx.db
      .query("importMappingHistory")
      .withIndex("by_normalizedColumnName", (q) =>
        q.eq("normalizedColumnName", normalized)
      )
      .collect();

    const match = existing.find(
      (h) =>
        h.targetField === args.targetField &&
        h.organizationId === args.organizationId
    );

    if (match) {
      // Update existing: increment count, update confidence
      const newCount = match.usageCount + 1;
      const newConfidence = Math.min(100, 60 + newCount * 5); // Starts at 65, caps at 100
      await ctx.db.patch(match._id, {
        usageCount: newCount,
        lastUsedAt: now,
        confidence: newConfidence,
      });
      return match._id;
    }

    // Create new record
    const id = await ctx.db.insert("importMappingHistory", {
      organizationId: args.organizationId,
      templateId: args.templateId,
      sourceColumnName: args.sourceColumnName,
      normalizedColumnName: normalized,
      targetField: args.targetField,
      usageCount: 1,
      lastUsedAt: now,
      confidence: 65, // Initial confidence for historical match
      createdAt: now,
      aiSuggested: args.aiSuggested,
      aiConfidence: args.aiConfidence,
    });
    return id;
  },
});

/**
 * Get historical mappings for a given normalized column name,
 * optionally filtered by organization.
 */
export const getHistoricalMappings = query({
  args: {
    sourceColumnName: v.string(),
    organizationId: v.optional(v.string()),
  },
  returns: v.array(mappingHistoryReturnValidator),
  handler: async (ctx, args) => {
    const normalized = normalizeColumnName(args.sourceColumnName);

    const mappings = await ctx.db
      .query("importMappingHistory")
      .withIndex("by_normalizedColumnName", (q) =>
        q.eq("normalizedColumnName", normalized)
      )
      .collect();

    if (args.organizationId) {
      return mappings.filter(
        (m) =>
          m.organizationId === args.organizationId ||
          m.organizationId === undefined
      );
    }

    return mappings;
  },
});

/**
 * Get the best (highest confidence) mapping for a given column name.
 * Prefers org-specific mappings over global ones.
 */
export const getBestMapping = query({
  args: {
    sourceColumnName: v.string(),
    organizationId: v.optional(v.string()),
  },
  returns: v.union(mappingHistoryReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const normalized = normalizeColumnName(args.sourceColumnName);

    const mappings = await ctx.db
      .query("importMappingHistory")
      .withIndex("by_normalizedColumnName", (q) =>
        q.eq("normalizedColumnName", normalized)
      )
      .collect();

    if (mappings.length === 0) {
      return null;
    }

    // Prefer org-specific mappings, then sort by confidence desc
    const sorted = mappings.sort((a, b) => {
      // Org-specific matches get a boost
      const aOrgMatch =
        args.organizationId && a.organizationId === args.organizationId
          ? 10
          : 0;
      const bOrgMatch =
        args.organizationId && b.organizationId === args.organizationId
          ? 10
          : 0;
      return b.confidence + bOrgMatch - (a.confidence + aOrgMatch);
    });

    return sorted[0] ?? null;
  },
});

/**
 * Get correction stats for AI suggestions
 * Shows acceptance/rejection rates by confidence level
 */
export const getCorrectionStats = query({
  args: {
    organizationId: v.optional(v.string()),
  },
  returns: v.object({
    total: v.number(),
    aiSuggested: v.number(),
    aiAccepted: v.number(),
    aiRejected: v.number(),
    byConfidence: v.array(
      v.object({
        range: v.string(),
        suggested: v.number(),
        accepted: v.number(),
        rejectionRate: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Get all mappings (optionally filtered by org)
    let dbQuery = ctx.db.query("importMappingHistory");
    if (args.organizationId) {
      dbQuery = dbQuery.withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      );
    }

    const allMappings = await dbQuery.collect();

    // Filter AI-suggested mappings
    const aiSuggested = allMappings.filter((m) => m.aiSuggested === true);

    // Track corrections: if usageCount > 1, it was accepted/confirmed
    const aiAccepted = aiSuggested.filter((m) => m.usageCount > 1);
    const aiRejected = aiSuggested.filter((m) => m.usageCount === 1);

    // Group by confidence ranges
    const ranges = [
      { min: 80, max: 100, label: "High (80%+)" },
      { min: 50, max: 79, label: "Medium (50-79%)" },
      { min: 0, max: 49, label: "Low (<50%)" },
    ];

    const byConfidence = ranges.map((range) => {
      const inRange = aiSuggested.filter(
        (m) =>
          m.aiConfidence &&
          m.aiConfidence >= range.min &&
          m.aiConfidence <= range.max
      );
      const accepted = inRange.filter((m) => m.usageCount > 1).length;
      const rejectionRate =
        inRange.length > 0
          ? ((inRange.length - accepted) / inRange.length) * 100
          : 0;

      return {
        range: range.label,
        suggested: inRange.length,
        accepted,
        rejectionRate,
      };
    });

    return {
      total: allMappings.length,
      aiSuggested: aiSuggested.length,
      aiAccepted: aiAccepted.length,
      aiRejected: aiRejected.length,
      byConfidence,
    };
  },
});
