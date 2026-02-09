"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";

// Usage (dry run): npx -w packages/backend convex run scripts/runMigration '{"dryRun": true}'
// Usage (org only): npx -w packages/backend convex run scripts/runMigration '{"organizationId": "...", "dryRun": false}'
// Usage (all orgs): npx -w packages/backend convex run scripts/runMigration '{"dryRun": false}'

export const runMigration = action({
  args: {
    organizationId: v.optional(v.string()),
    dryRun: v.boolean(),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    processed: v.number(),
    artifacts: v.number(),
    transcripts: v.number(),
    claims: v.number(),
    errors: v.number(),
    skipped: v.number(),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
    processed: number;
    artifacts: number;
    transcripts: number;
    claims: number;
    errors: number;
    skipped: number;
  }> =>
    await ctx.runAction(internal.actions.migration.migrateVoiceNotesToV2, args),
});
