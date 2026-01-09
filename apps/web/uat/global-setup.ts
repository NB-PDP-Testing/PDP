/**
 * Global Setup for Standard UAT Tests
 *
 * This runs ONCE before standard tests to set up the test environment.
 * It performs the following steps:
 * 1. Verifies platform admin permissions
 * 2. Verifies test user permissions
 * 3. Seeds additional UAT test data (if seed function exists)
 *
 * PREREQUISITES:
 * - Convex dev server must be running
 * - Test user accounts must already exist (create manually or via onboarding tests)
 * - Web app must be running
 */

import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

async function globalSetup() {
  console.log("\n🔧 UAT Global Setup Starting...\n");

  const rootDir = path.resolve(__dirname, "../../..");
  const backendDir = path.join(rootDir, "packages/backend");

  // Check if we should skip setup
  if (process.env.SKIP_UAT_SETUP === "true") {
    console.log("⏭️  Skipping setup (SKIP_UAT_SETUP=true)\n");
    return;
  }

  // Check if this is being run for onboarding tests (should use --no-setup)
  if (process.env.TEST_PROJECT === "onboarding-fresh") {
    console.log("⏭️  Skipping setup for onboarding tests\n");
    return;
  }

  try {
    // Step 1: Verify platform admin permissions
    console.log("🔐 Step 1/3: Verifying platform admin permissions...");
    console.log("   (Checking owner account has platformStaff role)\n");

    try {
      execSync("npx convex run scripts/verifyUATSetup:verifyPlatformAdmin", {
        cwd: backendDir,
        stdio: "inherit",
        timeout: 30000,
      });
      console.log("✅ Platform admin permissions verified\n");
    } catch {
      console.log("⚠️  Platform admin verification failed or function not found\n");
    }

    // Step 2: Verify test user permissions
    console.log("🛡️  Step 2/3: Verifying test user permissions...");
    console.log("   (Checking all test accounts have correct roles)\n");

    try {
      execSync("npx convex run scripts/verifyUATSetup:verifyTestUserPermissions", {
        cwd: backendDir,
        stdio: "inherit",
        timeout: 30000,
      });
      console.log("✅ Test user permissions verified\n");
    } catch {
      console.log("⚠️  Test user permission verification failed\n");
    }

    // Step 3: Seed UAT test data (optional)
    console.log("📦 Step 3/3: Seeding UAT test data...");

    try {
      execSync("npx convex run scripts/seedUATData:seedUATTestData", {
        cwd: backendDir,
        stdio: "inherit",
        timeout: 120000,
      });
      console.log("✅ UAT test data seeded\n");
    } catch {
      console.log("⚠️  UAT seed function not found or failed\n");
    }

    // Create .auth directory if it doesn't exist
    const authDir = path.join(__dirname, ".auth");
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    // Store a marker that setup ran
    const setupMarker = path.join(__dirname, ".setup-ran");
    fs.writeFileSync(setupMarker, new Date().toISOString());

    console.log("🎉 Global Setup Complete!\n");
    console.log("NOTE: Test accounts must be created manually or via onboarding tests.");
    console.log("Required accounts (from test-data.json):");
    console.log("  - owner_pdp@outlook.com (platformStaff)");
    console.log("  - adm1n_pdp@outlook.com (admin)");
    console.log("  - coach_pdp@outlook.com (coach)");
    console.log("  - parent_pdp@outlook.com (parent)");
    console.log("");

  } catch (error) {
    console.error("❌ Global Setup Failed:", error);
    console.log("⚠️  Continuing despite setup errors...\n");
  }
}

export default globalSetup;
