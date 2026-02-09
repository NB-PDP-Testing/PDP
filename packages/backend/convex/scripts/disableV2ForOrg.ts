import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";

// Usage: npx -w packages/backend convex run scripts/disableV2ForOrg '{"organizationId": "...", "disabledBy": "admin"}'

export const disableV2ForOrg = mutation({
  args: {
    organizationId: v.string(),
    disabledBy: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    flagsSet: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const flagsToDisable = ["voice_notes_v2", "entity_resolution_v2"];
    const flagsSet: string[] = [];

    for (const featureKey of flagsToDisable) {
      await ctx.runMutation(internal.lib.featureFlags.setFeatureFlag, {
        featureKey,
        scope: "organization",
        organizationId: args.organizationId,
        enabled: false,
        updatedBy: args.disabledBy ?? "script",
        notes: `Disabled via disableV2ForOrg script (rollback) at ${new Date().toISOString()}`,
      });
      flagsSet.push(featureKey);
    }

    console.info(
      `[disableV2ForOrg] v2 pipeline disabled for org ${args.organizationId} by ${args.disabledBy ?? "script"}`
    );
    return { success: true, flagsSet };
  },
});
