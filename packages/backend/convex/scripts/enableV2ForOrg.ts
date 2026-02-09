import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";

// Usage: npx -w packages/backend convex run scripts/enableV2ForOrg '{"organizationId": "...", "enabledBy": "admin"}'

export const enableV2ForOrg = mutation({
  args: {
    organizationId: v.string(),
    enabledBy: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    flagsSet: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const flagsToEnable = ["voice_notes_v2", "entity_resolution_v2"];
    const flagsSet: string[] = [];

    for (const featureKey of flagsToEnable) {
      await ctx.runMutation(internal.lib.featureFlags.setFeatureFlag, {
        featureKey,
        scope: "organization",
        organizationId: args.organizationId,
        enabled: true,
        updatedBy: args.enabledBy ?? "script",
        notes: `Enabled via enableV2ForOrg script at ${new Date().toISOString()}`,
      });
      flagsSet.push(featureKey);
    }

    console.log(
      `[enableV2ForOrg] v2 pipeline enabled for org ${args.organizationId} by ${args.enabledBy ?? "script"}`
    );
    return { success: true, flagsSet };
  },
});
