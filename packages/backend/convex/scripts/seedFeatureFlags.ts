/**
 * Seed Platform Feature Flags
 *
 * Inserts or updates platform-level feature flags.
 * Safe to run multiple times - skips flags that already exist.
 *
 * Usage: Run from Convex dashboard as an internal mutation.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

const DEFAULT_FLAGS = [
  {
    name: "ENTITY_RESOLUTION_V2_GLOBAL",
    enabled: true,
    scope: "platform",
  },
  {
    name: "VOICE_NOTES_V2_GLOBAL",
    enabled: true,
    scope: "platform",
  },
];

export const seedFeatureFlags = internalMutation({
  args: {},
  returns: v.object({
    created: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    let created = 0;
    let skipped = 0;

    for (const flag of DEFAULT_FLAGS) {
      const existing = await ctx.db
        .query("featureFlags")
        .withIndex("by_name", (q) => q.eq("name", flag.name))
        .first();

      if (existing) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("featureFlags", flag);
      created += 1;
    }

    return { created, skipped };
  },
});
