// @ts-nocheck
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

const DEFAULT_FLAGS: Array<{
  featureKey: string;
  enabled: boolean;
  scope: "platform" | "organization" | "user";
}> = [
  {
    featureKey: "entity_resolution_v2",
    enabled: true,
    scope: "platform",
  },
  {
    featureKey: "voice_notes_v2",
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
        .withIndex("by_featureKey_and_scope", (q) =>
          q.eq("featureKey", flag.featureKey).eq("scope", flag.scope)
        )
        .first();

      if (existing) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("featureFlags", {
        ...flag,
        updatedAt: Date.now(),
      });
      created += 1;
    }

    return { created, skipped };
  },
});
