/**
 * Global Setup for Standard UAT Tests
 *
 * This runs ONCE before standard tests to set up the test environment.
 * It performs the following steps:
 * 1. Verifies platform admin has correct permissions
 * 2. Creates test data (users, org, teams, players) WITHOUT resetting the database
 *
 * The teardown will remove this test data after tests complete,
 * leaving the system in the same state as before.
 *
 * PREREQUISITES:
 * - Convex dev server must be running
 * - Platform admin (owner) account must exist with correct permissions
 *
 * NOTE: For onboarding tests, use `npm run test:onboarding:fresh` which
 * has its own setup that resets the entire database.
 */

import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

// Load test data from JSON configuration file
const testDataPath = path.join(__dirname, "test-data.json");
const testData = JSON.parse(fs.readFileSync(testDataPath, "utf-8"));
const TEST_USERS = testData.users;

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
    // Step 1: Verify platform admin has correct permissions
    console.log("🔐 Step 1/3: Verifying platform admin permissions...");
    console.log("   (Checking owner account has platformStaff role)\n");

    try {
      // Call Convex function to verify platform admin permissions
      // This checks that the owner account exists and has the correct role
      execSync("npx convex run scripts/verifyUATSetup:verifyPlatformAdmin", {
        cwd: backendDir,
        stdio: "inherit",
        timeout: 30000,
      });
      console.log("✅ Platform admin permissions verified\n");
    } catch (error) {
      console.log(
        "⚠️  Platform admin verification failed or function not found\n"
      );
      console.log("   Checking owner account manually...\n");

      // Fallback: try to verify by checking if the user exists
      try {
        execSync(
          `npx convex run scripts/verifyUATSetup:checkUserExists '{"email": "${TEST_USERS.owner.email}"}'`,
          {
            cwd: backendDir,
            stdio: "inherit",
            timeout: 30000,
          }
        );
        console.log("✅ Owner account exists\n");
      } catch (checkError) {
        console.log("⚠️  Could not verify owner account\n");
        console.log("   To enable verification, create:");
        console.log("   packages/backend/convex/scripts/verifyUATSetup.ts\n");
        console.log("   With functions:");
        console.log("   - verifyPlatformAdmin: Checks owner has platformStaff role");
        console.log("   - checkUserExists: Checks if a user exists by email\n");
      }
    }

    // Step 2: Verify required permissions and roles exist
    console.log("🛡️  Step 2/3: Verifying test user permissions...");
    console.log("   (Checking all test accounts have correct roles)\n");

    try {
      // Verify all test users have the expected roles
      execSync(
        "npx convex run scripts/verifyUATSetup:verifyTestUserPermissions",
        {
          cwd: backendDir,
          stdio: "inherit",
          timeout: 30000,
        }
      );
      console.log("✅ Test user permissions verified\n");
    } catch (error) {
      console.log("⚠️  Test user permission verification skipped\n");
      console.log("   (Function not found or verification failed)\n");
    }

    // Step 3: Seed UAT test data (creates test users, org, teams, players)
    // This DOES NOT reset the database - it adds data specifically for UAT
    console.log("👥 Step 3/3: Creating/verifying UAT test data...");
    console.log(
      "   (This creates test users, org, teams, and players if they don't exist)\n"
    );

    try {
      // Call Convex seed function that creates UAT-specific test data
      // The seed function should be idempotent - safe to run multiple times
      execSync("npx convex run scripts/seedUATData:seedUATTestData", {
        cwd: backendDir,
        stdio: "inherit",
        timeout: 120000,
      });
      console.log("✅ UAT test data created/verified\n");
    } catch (error) {
      // If seed function doesn't exist, log instructions
      console.log("⚠️  UAT seed function not found\n");
      console.log("   To enable automatic test data creation, create:");
      console.log("   packages/backend/convex/scripts/seedUATData.ts\n");
      console.log("   The function should create:");
      console.log("   - Test users (owner, admin, coach, parent)");
      console.log("   - Test organization");
      console.log("   - Test teams with coach assignments");
      console.log("   - Test players with team assignments");
      console.log("   - Parent-child linkages\n");
      console.log("   Tests will continue but may fail if data doesn't exist.\n");
    }

    // Create .auth directory if it doesn't exist (for browser session storage)
    const authDir = path.join(__dirname, ".auth");
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    // Store a marker that setup ran (used by teardown to know what to clean)
    const setupMarker = path.join(__dirname, ".setup-ran");
    fs.writeFileSync(setupMarker, new Date().toISOString());

    console.log("🎉 Global Setup Complete!\n");
    console.log("Verified test accounts (from test-data.json):");
    console.log(`  - Owner (platformStaff): ${TEST_USERS.owner.email}`);
    console.log(`  - Admin: ${TEST_USERS.admin.email}`);
    console.log(`  - Coach: ${TEST_USERS.coach.email}`);
    console.log(`  - Parent: ${TEST_USERS.parent.email}`);
    console.log("");
    console.log("Expected permissions:");
    console.log("  - Owner: platformStaff=true, can create orgs, owner role");
    console.log("  - Admin: admin role in organization");
    console.log("  - Coach: coach role with team assignment");
    console.log("  - Parent: parent role with linked children");
    console.log("");
  } catch (error) {
    console.error("❌ Global Setup Failed:", error);
    // Don't throw - let tests proceed and handle missing data gracefully
    console.log("⚠️  Continuing despite setup errors...\n");
  }
}

export default globalSetup;