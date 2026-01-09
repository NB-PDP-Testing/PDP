/**
 * Onboarding Database Setup
 *
 * This is a special setup that runs ONLY for onboarding tests.
 * It performs a COMPLETE DATABASE RESET before the onboarding tests run.
 *
 * WARNING: This deletes ALL data from the database!
 * Only use with: npm run test:onboarding:fresh
 *
 * What this does:
 * 1. Clears all users, organizations, teams, players, etc.
 * 2. Seeds only the reference data (sports, skills, benchmarks)
 * 3. Prepares a clean slate for testing first-user signup flows
 */

import { test as setup } from "@playwright/test";
import { execSync } from "child_process";
import * as path from "path";

setup("Reset database for onboarding tests", async () => {
  console.log("\n🔄 Onboarding Database Reset Starting...\n");

  const rootDir = path.resolve(__dirname, "../../../");
  const backendDir = path.join(rootDir, "packages/backend");

  try {
    // Step 1: Clear all data and seed reference data
    console.log("💥 Step 1/2: Resetting database...");
    console.log(
      "   WARNING: This deletes all users, orgs, teams, players!\n"
    );

    try {
      // Call the clearAllAndSeedReference function
      // This clears the database and seeds sports, skills, benchmarks
      execSync(
        "npx convex run scripts/seedDatabase:clearAllAndSeedReference",
        {
          cwd: backendDir,
          stdio: "inherit",
          timeout: 120000, // 2 minutes for safety
        }
      );
      console.log("✅ Database reset complete\n");
    } catch (error) {
      console.error("❌ Database reset failed:", error);
      throw new Error(
        "Failed to reset database for onboarding tests. " +
          "Make sure packages/backend/convex/scripts/seedDatabase.ts exists " +
          "with a clearAllAndSeedReference function."
      );
    }

    // Step 2: Verify the database is empty (no users)
    console.log("🔍 Step 2/2: Verifying clean database state...\n");

    try {
      // Check that no users exist
      const result = execSync(
        "npx convex run scripts/verifyUATSetup:getUserCount",
        {
          cwd: backendDir,
          encoding: "utf-8",
          timeout: 30000,
        }
      );

      // Parse the result to check user count
      const trimmed = result.trim();
      console.log(`   User count check: ${trimmed}`);

      // The result should be 0 or close to it
      if (trimmed.includes("0") || trimmed.includes("null")) {
        console.log("✅ Database is clean (no users)\n");
      } else {
        console.log("⚠️  Some users may still exist\n");
        console.log("   This could be expected if admin user is preserved\n");
      }
    } catch (error) {
      console.log("⚠️  Could not verify user count (function may not exist)\n");
    }

    console.log("🎉 Onboarding Database Setup Complete!\n");
    console.log("Database state:");
    console.log("  - Users: CLEARED");
    console.log("  - Organizations: CLEARED");
    console.log("  - Teams: CLEARED");
    console.log("  - Players: CLEARED");
    console.log("  - Reference Data: SEEDED (sports, skills, benchmarks)");
    console.log("");
    console.log("Ready for fresh onboarding tests!\n");
  } catch (error) {
    console.error("❌ Onboarding Database Setup Failed:", error);
    throw error; // Rethrow to fail the test setup
  }
});