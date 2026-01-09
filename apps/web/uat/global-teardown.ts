/**
 * Global Teardown for Standard UAT Tests
 *
 * This runs ONCE after all standard tests complete.
 * It cleans up test data created by global-setup.ts,
 * leaving the database in the same state as before tests ran.
 *
 * IMPORTANT: This does NOT delete users or reset the database.
 * It only removes UAT-specific test data (players, teams, etc.)
 *
 * For a complete database reset, use the onboarding tests instead.
 */

import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

async function globalTeardown() {
  console.log("\n🧹 UAT Global Teardown Starting...\n");

  const rootDir = path.resolve(__dirname, "../../..");
  const backendDir = path.join(rootDir, "packages/backend");

  // Check if we should skip teardown
  if (process.env.SKIP_UAT_TEARDOWN === "true") {
    console.log("⏭️  Skipping teardown (SKIP_UAT_TEARDOWN=true)\n");
    return;
  }

  // Check if setup ran (if not, nothing to clean)
  const setupMarker = path.join(__dirname, ".setup-ran");
  if (!fs.existsSync(setupMarker)) {
    console.log("⏭️  Skipping teardown (setup marker not found)\n");
    return;
  }

  try {
    // Step 1: Clean up UAT test data
    console.log("🗑️  Step 1/2: Cleaning up UAT test data...");
    console.log("   (Removing test players, teams created during tests)\n");

    try {
      // Call Convex function to clean up UAT-specific test data
      // This should NOT delete users or the organization
      execSync("npx convex run scripts/cleanupUATData:cleanupUATTestData", {
        cwd: backendDir,
        stdio: "inherit",
        timeout: 60000,
      });
      console.log("✅ UAT test data cleaned up\n");
    } catch (error) {
      console.log("⚠️  UAT cleanup function not found or failed\n");
      console.log("   To enable automatic cleanup, create:");
      console.log("   packages/backend/convex/scripts/cleanupUATData.ts\n");
      console.log("   The function should remove:");
      console.log("   - Test players created during UAT");
      console.log("   - Test teams created during UAT");
      console.log("   - Test invitations (if any)\n");
      console.log("   NOTE: Do NOT delete users or organizations.\n");
    }

    // Step 2: Clean up auth storage files
    console.log("🔐 Step 2/2: Cleaning up auth storage...");

    const authDir = path.join(__dirname, ".auth");
    if (fs.existsSync(authDir)) {
      // List files in auth directory
      const authFiles = fs.readdirSync(authDir);
      authFiles.forEach((file) => {
        const filePath = path.join(authDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          console.log(`   Removed: ${file}`);
        }
      });
      console.log("✅ Auth storage cleaned\n");
    } else {
      console.log("   No auth storage to clean\n");
    }

    // Remove setup marker
    if (fs.existsSync(setupMarker)) {
      fs.unlinkSync(setupMarker);
    }

    console.log("🎉 Global Teardown Complete!\n");
    console.log("Database state:");
    console.log("  - Users: Preserved (not deleted)");
    console.log("  - Organization: Preserved (not deleted)");
    console.log("  - Test data: Cleaned up");
    console.log("");
  } catch (error) {
    console.error("❌ Global Teardown Error:", error);
    // Don't throw - teardown errors should not fail the test run
    console.log("⚠️  Continuing despite teardown errors...\n");
  }
}

export default globalTeardown;