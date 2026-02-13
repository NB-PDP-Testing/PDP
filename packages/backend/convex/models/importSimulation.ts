/**
 * Import Simulation Query - Dry run preview for import wizard.
 *
 * Exposes the query-only simulator as a Convex query function.
 * This is inherently read-only (Convex queries cannot write),
 * making it safe to run before committing an import.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { simulateImport } from "../lib/import/simulator";

const genderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("other")
);

const playerPreviewValidator = v.object({
  index: v.number(),
  name: v.string(),
  dateOfBirth: v.string(),
  ageGroup: v.string(),
  action: v.union(v.literal("create"), v.literal("update")),
  guardianAction: v.optional(
    v.union(v.literal("create"), v.literal("link_existing"), v.literal("none"))
  ),
  guardianName: v.optional(v.string()),
  enrollmentAction: v.union(v.literal("create"), v.literal("update")),
  passportAction: v.optional(
    v.union(v.literal("create"), v.literal("exists"), v.literal("none"))
  ),
});

/**
 * Simulate an import to preview what will happen before committing.
 *
 * Returns accurate counts for creates vs updates across all entity types,
 * plus per-player preview details and any warnings/errors detected.
 */
export const simulate = query({
  args: {
    organizationId: v.string(),
    sportCode: v.optional(v.string()),
    selectedRowIndices: v.optional(v.array(v.number())),
    applyBenchmarks: v.optional(v.boolean()),
    benchmarkStrategy: v.optional(v.string()),
    players: v.array(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        dateOfBirth: v.string(),
        gender: genderValidator,
        ageGroup: v.string(),
        season: v.string(),
        address: v.optional(v.string()),
        town: v.optional(v.string()),
        postcode: v.optional(v.string()),
        country: v.optional(v.string()),
        parentFirstName: v.optional(v.string()),
        parentLastName: v.optional(v.string()),
        parentEmail: v.optional(v.string()),
        parentPhone: v.optional(v.string()),
        parentRelationship: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({
    success: v.boolean(),
    preview: v.object({
      playersToCreate: v.number(),
      playersToUpdate: v.number(),
      guardiansToCreate: v.number(),
      guardiansToLink: v.number(),
      enrollmentsToCreate: v.number(),
      enrollmentsToUpdate: v.number(),
      passportsToCreate: v.number(),
      passportsExisting: v.number(),
      benchmarksToApply: v.number(),
      playerPreviews: v.array(playerPreviewValidator),
    }),
    warnings: v.array(v.string()),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) =>
    await simulateImport(ctx, args.players, {
      organizationId: args.organizationId,
      sportCode: args.sportCode,
      selectedRowIndices: args.selectedRowIndices,
      applyBenchmarks: args.applyBenchmarks,
      benchmarkStrategy: args.benchmarkStrategy,
    }),
});
