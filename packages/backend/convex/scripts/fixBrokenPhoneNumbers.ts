/**
 * Fix Broken Phone Numbers - Emergency Cleanup Script
 *
 * Bug #469: Phone numbers lost '+' prefix after updateProfileWithSync calls
 * This script finds and fixes all phone numbers missing the '+' prefix.
 *
 * **RUN THIS IN PRODUCTION IMMEDIATELY AFTER DEPLOYING HOTFIX**
 *
 * Usage:
 *   1. Deploy the hotfix first (fixes future updates)
 *   2. Run this script via Convex dashboard: npx convex run scripts/fixBrokenPhoneNumbers
 *   3. Review output to confirm all numbers fixed
 *
 * The script:
 * - Finds all user.phone fields that are digits-only (no '+')
 * - Adds '+' prefix back
 * - Logs all changes for audit trail
 * - Also fixes guardianIdentities.phone if affected
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export default internalMutation({
  args: {},
  returns: v.object({
    usersFixed: v.number(),
    guardiansFixed: v.number(),
    errors: v.array(v.string()),
    changes: v.array(
      v.object({
        userId: v.string(),
        oldPhone: v.string(),
        newPhone: v.string(),
      })
    ),
  }),
  handler: async (ctx) => {
    const errors: string[] = [];
    const changes: Array<{
      userId: string;
      oldPhone: string;
      newPhone: string;
    }> = [];

    // =================================================================
    // STEP 1: Fix user table phone numbers
    // =================================================================

    console.log("🔍 Scanning user table for broken phone numbers...");

    // Get all users (use adapter to access Better Auth user table)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { components: betterAuthComponents } = require("../_generated/api");
    const usersResult = await ctx.runQuery(
      betterAuthComponents.betterAuth.adapter.findMany,
      {
        model: "user",
        paginationOpts: {
          cursor: null,
          numItems: 10000, // Get all users
        },
      }
    );

    // biome-ignore lint/suspicious/noExplicitAny: Dynamic type from Better Auth
    const users = (usersResult.page || []) as any[];

    console.log(`📊 Found ${users.length} users to scan`);

    let usersFixed = 0;

    for (const user of users) {
      if (!user.phone) {
        continue; // Skip users without phone numbers
      }

      const phone = user.phone;

      // Check if phone is digits-only (broken format)
      const isDigitsOnly = /^\d+$/.test(phone);

      // Phone should have at least 10 digits and NOT start with '+'
      const needsFixing =
        isDigitsOnly && phone.length >= 10 && !phone.startsWith("+");

      if (needsFixing) {
        const oldPhone = phone;
        const newPhone = `+${phone}`;

        console.log(
          `🔧 Fixing user ${user.email}: "${oldPhone}" → "${newPhone}"`
        );

        try {
          // Update via adapter
          await ctx.runMutation(betterAuthComponents.betterAuth.adapter.updateOne, {
            input: {
              model: "user",
              where: [{ field: "_id", value: user._id, operator: "eq" }],
              update: {
                phone: newPhone,
                updatedAt: Date.now(),
              },
            },
          });

          changes.push({
            userId: user._id,
            oldPhone,
            newPhone,
          });

          usersFixed++;
        } catch (error) {
          const errorMsg = `Failed to fix user ${user.email}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    }

    console.log(`✅ Fixed ${usersFixed} user phone numbers`);

    // =================================================================
    // STEP 2: Fix guardianIdentities table phone numbers
    // =================================================================

    console.log("🔍 Scanning guardianIdentities table...");

    const guardians = await ctx.db.query("guardianIdentities").collect();

    console.log(`📊 Found ${guardians.length} guardian identities to scan`);

    let guardiansFixed = 0;

    for (const guardian of guardians) {
      if (!guardian.phone) {
        continue;
      }

      const phone = guardian.phone;
      const isDigitsOnly = /^\d+$/.test(phone);
      const needsFixing =
        isDigitsOnly && phone.length >= 10 && !phone.startsWith("+");

      if (needsFixing) {
        const oldPhone = phone;
        const newPhone = `+${phone}`;

        console.log(
          `🔧 Fixing guardian ${guardian.email || guardian.firstName}: "${oldPhone}" → "${newPhone}"`
        );

        try {
          await ctx.db.patch(guardian._id, {
            phone: newPhone,
            updatedAt: Date.now(),
          });

          guardiansFixed++;
        } catch (error) {
          const errorMsg = `Failed to fix guardian ${guardian._id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    }

    console.log(`✅ Fixed ${guardiansFixed} guardian phone numbers`);

    // =================================================================
    // SUMMARY
    // =================================================================

    console.log("\n" + "=".repeat(60));
    console.log("📋 CLEANUP SUMMARY");
    console.log("=".repeat(60));
    console.log(`Users fixed:      ${usersFixed}`);
    console.log(`Guardians fixed:  ${guardiansFixed}`);
    console.log(`Total errors:     ${errors.length}`);
    console.log(`Changes logged:   ${changes.length}`);
    console.log("=".repeat(60) + "\n");

    if (errors.length > 0) {
      console.error("⚠️  ERRORS ENCOUNTERED:");
      for (const error of errors) {
        console.error(`  - ${error}`);
      }
    }

    return {
      usersFixed,
      guardiansFixed,
      errors,
      changes,
    };
  },
});
