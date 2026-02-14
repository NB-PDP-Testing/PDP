import { v } from "convex/values";
import { query } from "../_generated/server";
import {
  accumulateResult,
  analyzePlayer,
  checkDuplicateInBatch,
  type PlayerPreview,
  type SimSummary,
  validatePlayerFields,
} from "../lib/import/simulator";

// ============================================================
// IMPORT SIMULATION (DRY-RUN PREVIEW)
// ============================================================

const genderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("other")
);

const playerValidator = v.object({
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
});

export const simulate = query({
  args: {
    organizationId: v.string(),
    sportCode: v.optional(v.string()),
    players: v.array(playerValidator),
    applyBenchmarks: v.optional(v.boolean()),
    benchmarkStrategy: v.optional(v.string()),
  },
  returns: v.object({
    summary: v.object({
      playersToCreate: v.number(),
      playersToUpdate: v.number(),
      guardiansToCreate: v.number(),
      guardiansToLink: v.number(),
      enrollmentsToCreate: v.number(),
      passportsToCreate: v.number(),
      benchmarksToApply: v.number(),
    }),
    playerPreviews: v.array(
      v.object({
        name: v.string(),
        dateOfBirth: v.string(),
        age: v.number(),
        ageGroup: v.string(),
        gender: v.string(),
        action: v.union(v.literal("create"), v.literal("update")),
        guardianName: v.optional(v.string()),
        guardianAction: v.optional(
          v.union(v.literal("create"), v.literal("link"))
        ),
      })
    ),
    warnings: v.array(v.string()),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const summary: SimSummary = {
      playersToCreate: 0,
      playersToUpdate: 0,
      guardiansToCreate: 0,
      guardiansToLink: 0,
      enrollmentsToCreate: 0,
      passportsToCreate: 0,
      benchmarksToApply: 0,
    };

    const playerPreviews: PlayerPreview[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    const seenNames = new Map<string, number>();

    for (const player of args.players) {
      const fieldError = validatePlayerFields(player);
      if (fieldError) {
        errors.push(fieldError);
        continue;
      }

      const dupWarning = checkDuplicateInBatch(player, seenNames);
      if (dupWarning) {
        warnings.push(dupWarning);
      }

      const result = await analyzePlayer(
        ctx.db,
        player,
        args.organizationId,
        args.sportCode
      );

      if ("error" in result) {
        errors.push(result.error);
        continue;
      }

      accumulateResult(
        summary,
        result,
        !!(args.applyBenchmarks && args.sportCode)
      );
      if (result.warning) {
        warnings.push(result.warning);
      }

      if (playerPreviews.length < 5) {
        playerPreviews.push({
          name: `${player.firstName} ${player.lastName}`,
          dateOfBirth: player.dateOfBirth,
          age: result.age,
          ageGroup: player.ageGroup,
          gender: player.gender,
          action: result.action,
          guardianName: result.guardian?.name,
          guardianAction: result.guardian?.action,
        });
      }
    }

    return { summary, playerPreviews, warnings, errors };
  },
});
