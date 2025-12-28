/**
 * Seed Default Sport Rules
 *
 * Populates sport-specific age group eligibility rules with sensible defaults.
 * This should be run once during initial setup or when adding a new sport.
 *
 * Default Rules:
 * - Players can join teams at SAME age or HIGHER (no playing down)
 * - Same age group: Allowed, no approval needed
 * - Playing up (1-2 age groups higher): Allowed, but requires approval (admin override)
 * - Playing up (3+ age groups higher): Allowed, but requires approval (admin override)
 *
 * Usage:
 * - Call from Convex dashboard or via internal action
 * - Optionally specify a single sport code to seed only that sport
 * - Set dryRun=true to see what would be created without actually creating
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { DEFAULT_AGE_GROUP_ORDER } from "../lib/ageGroupUtils";

export const seedDefaultSportRules = internalMutation({
  args: {
    sportCode: v.optional(v.string()), // If provided, seed only this sport
    dryRun: v.optional(v.boolean()), // If true, don't actually create records
    overwriteExisting: v.optional(v.boolean()), // If true, delete existing rules first
  },
  returns: v.object({
    success: v.boolean(),
    sportsProcessed: v.array(v.string()),
    rulesCreated: v.number(),
    errors: v.array(v.string()),
    dryRun: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun;
    const overwriteExisting = args.overwriteExisting;
    const errors: string[] = [];
    const sportsProcessed: string[] = [];
    let rulesCreated = 0;

    try {
      // 1. Get sports to process
      let sports;
      if (args.sportCode) {
        // Seed only specified sport
        const sport = await ctx.db
          .query("sports")
          .withIndex("by_code", (q) => q.eq("code", args.sportCode!))
          .first();

        if (!sport) {
          throw new Error(`Sport with code "${args.sportCode}" not found`);
        }

        sports = [sport];
      } else {
        // Seed all active sports
        sports = await ctx.db
          .query("sports")
          .withIndex("by_isActive", (q) => q.eq("isActive", true))
          .collect();
      }

      if (sports.length === 0) {
        return {
          success: true,
          sportsProcessed: [],
          rulesCreated: 0,
          errors: ["No active sports found"],
          dryRun,
        };
      }

      // 2. Get all active age groups
      const ageGroups = await ctx.db
        .query("ageGroups")
        .withIndex("by_isActive", (q) => q.eq("isActive", true))
        .collect();

      if (ageGroups.length === 0) {
        return {
          success: false,
          sportsProcessed: [],
          rulesCreated: 0,
          errors: ["No active age groups found in database"],
          dryRun,
        };
      }

      // Create a map of age group codes to their sort order
      const ageGroupMap = new Map(
        ageGroups.map((ag) => [ag.code.toLowerCase(), ag.sortOrder])
      );

      // 3. For each sport, create eligibility rules
      for (const sport of sports) {
        try {
          // Delete existing rules if overwriteExisting is true
          if (overwriteExisting && !dryRun) {
            const existingRules = await ctx.db
              .query("sportAgeGroupEligibilityRules")
              .withIndex("by_sport", (q) => q.eq("sportCode", sport.code))
              .collect();

            for (const rule of existingRules) {
              await ctx.db.delete(rule._id);
            }
          }

          // Generate rules based on DEFAULT_AGE_GROUP_ORDER
          const validAgeGroups = DEFAULT_AGE_GROUP_ORDER.filter((code) =>
            ageGroupMap.has(code)
          );

          for (let i = 0; i < validAgeGroups.length; i++) {
            const fromAgeGroup = validAgeGroups[i];

            for (let j = 0; j < validAgeGroups.length; j++) {
              const toAgeGroup = validAgeGroups[j];

              // Determine if this combination is allowed and if it requires approval
              let isAllowed = false;
              let requiresApproval = false;
              let description = "";

              if (i === j) {
                // Same age group - always allowed, no approval needed
                isAllowed = true;
                requiresApproval = false;
                description = "Same age group - automatically eligible";
              } else if (i < j) {
                // Playing up (player younger than team) - allowed with approval
                const ageGroupsDifference = j - i;
                isAllowed = true;
                requiresApproval = true; // Requires admin override

                if (ageGroupsDifference === 1) {
                  description =
                    "Playing up 1 age group - requires admin override";
                } else if (ageGroupsDifference === 2) {
                  description =
                    "Playing up 2 age groups - requires admin override";
                } else {
                  description = `Playing up ${ageGroupsDifference} age groups - requires admin override`;
                }
              } else {
                // Playing down (player older than team) - not allowed
                isAllowed = false;
                requiresApproval = false; // Not allowed even with override
                description =
                  "Playing down not permitted - player too old for team";
              }

              // Check if rule already exists
              const existingRule = await ctx.db
                .query("sportAgeGroupEligibilityRules")
                .withIndex("by_sport_and_ages", (q) =>
                  q
                    .eq("sportCode", sport.code)
                    .eq("fromAgeGroupCode", fromAgeGroup)
                    .eq("toAgeGroupCode", toAgeGroup)
                )
                .first();

              if (existingRule && !overwriteExisting) {
                // Skip if rule already exists and we're not overwriting
                continue;
              }

              // Create the rule
              if (!dryRun) {
                await ctx.db.insert("sportAgeGroupEligibilityRules", {
                  sportCode: sport.code,
                  fromAgeGroupCode: fromAgeGroup,
                  toAgeGroupCode: toAgeGroup,
                  isAllowed,
                  requiresApproval,
                  description,
                  isActive: true,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                });
              }

              rulesCreated++;
            }
          }

          sportsProcessed.push(sport.code);
        } catch (error) {
          const errorMessage = `Error processing sport "${sport.code}": ${
            error instanceof Error ? error.message : "Unknown error"
          }`;
          errors.push(errorMessage);
          console.error(errorMessage);
        }
      }

      return {
        success: errors.length === 0,
        sportsProcessed,
        rulesCreated,
        errors,
        dryRun,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        sportsProcessed,
        rulesCreated,
        errors: [errorMessage],
        dryRun,
      };
    }
  },
});

/**
 * Seed default enforcement levels for all teams in an organization
 *
 * Sets the default enforcement level (strict/warning/flexible) for all teams
 * in an organization. This is useful for initial setup.
 *
 * Usage:
 * - Call with organizationId and desired enforcement level
 * - Typically run during org setup or when enabling eligibility rules
 */
export const seedTeamEnforcementLevels = internalMutation({
  args: {
    organizationId: v.string(),
    enforcementLevel: v.union(
      v.literal("strict"),
      v.literal("warning"),
      v.literal("flexible")
    ),
    requireOverrideReason: v.optional(v.boolean()),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    teamsProcessed: v.number(),
    settingsCreated: v.number(),
    errors: v.array(v.string()),
    dryRun: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun;
    const requireOverrideReason = true;
    const errors: string[] = [];
    const teamsProcessed = 0;
    const settingsCreated = 0;

    try {
      // Note: Teams are stored in Better Auth, not Convex
      // We can't query them directly here, so this function would need to be called
      // from an action that can access Better Auth data

      // For now, return a helpful message
      errors.push(
        "This function needs to be called from an action that has access to Better Auth team data. " +
          "Teams are managed by Better Auth's organization plugin, not Convex."
      );

      return {
        success: false,
        teamsProcessed,
        settingsCreated,
        errors,
        dryRun,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        teamsProcessed,
        settingsCreated,
        errors: [errorMessage],
        dryRun,
      };
    }
  },
});
