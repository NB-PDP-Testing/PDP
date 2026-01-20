import { chromium, FullConfig } from "@playwright/test";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * Global Setup for PlayerARC UAT Tests
 *
 * This runs once before all tests to:
 * 1. Verify the application is running
 * 2. Create authenticated storage states for each user role
 *
 * Uses the same login approach as apps/web/uat/auth.setup.ts
 */

interface TestUser {
  email: string;
  password: string;
  name: string;
  description: string;
}

interface TestData {
  users: Record<string, TestUser>;
}

/**
 * Helper function to login with email/password
 * Matches the approach in apps/web/uat/auth.setup.ts
 */
async function loginWithEmail(
  page: any,
  email: string,
  password: string,
  userKey: string
): Promise<void> {
  const startTime = Date.now();
  console.log(`[${userKey}] 🔄 Starting login at ${new Date().toISOString()}`);
  
  try {
    console.log(`[${userKey}] Step 1: Navigating to /login`);
    await page.goto("/login");
    console.log(`[${userKey}] ✓ Navigation complete (${Date.now() - startTime}ms)`);

    // Wait for the page to fully load - the form is inside Suspense and Convex auth states
    console.log(`[${userKey}] Step 2: Waiting for login form to load`);
    await page.waitForSelector(
      '[id="email"], button:has-text("Sign in with Google")',
      { timeout: 30000 }
    );
    console.log(`[${userKey}] ✓ Login form visible (${Date.now() - startTime}ms)`);

    // The form uses Tanstack Form - fields have id="email" and id="password"
    console.log(`[${userKey}] Step 3: Waiting for email field`);
    const emailField = page.locator("#email");
    await emailField.waitFor({ state: "visible", timeout: 30000 });
    console.log(`[${userKey}] ✓ Email field ready (${Date.now() - startTime}ms)`);

    // Fill email
    console.log(`[${userKey}] Step 4: Filling email: ${email}`);
    await emailField.fill(email);
    console.log(`[${userKey}] ✓ Email filled (${Date.now() - startTime}ms)`);

    // Fill password
    console.log(`[${userKey}] Step 5: Waiting for password field`);
    const passwordField = page.locator("#password");
    await passwordField.waitFor({ state: "visible", timeout: 5000 });
    console.log(`[${userKey}] ✓ Password field ready (${Date.now() - startTime}ms)`);
    
    console.log(`[${userKey}] Step 6: Filling password`);
    await passwordField.fill(password);
    console.log(`[${userKey}] ✓ Password filled (${Date.now() - startTime}ms)`);

    // Small delay to ensure form validation completes
    console.log(`[${userKey}] Step 6.5: Waiting for form to stabilize`);
    await page.waitForTimeout(500);
    console.log(`[${userKey}] ✓ Form ready (${Date.now() - startTime}ms)`);

    // Click Sign In button (exact match to avoid SSO buttons)
    console.log(`[${userKey}] Step 7: Clicking Sign In button`);
    const signInButton = page.getByRole("button", { name: "Sign In", exact: true });
    await signInButton.waitFor({ state: "visible" });
    await signInButton.click();
    console.log(`[${userKey}] ✓ Sign In clicked (${Date.now() - startTime}ms)`);

    // Wait for successful login - redirects to /orgs
    console.log(`[${userKey}] Step 8: Waiting for redirect to /orgs (timeout: 60s)`);
    const urlBeforeWait = page.url();
    console.log(`[${userKey}]   Current URL: ${urlBeforeWait}`);

    await page.waitForURL(/\/orgs/, { timeout: 60000 });
    const urlAfterWait = page.url();
    console.log(`[${userKey}] ✓ Redirected to ${urlAfterWait} (${Date.now() - startTime}ms)`);
    
    // Wait for network to be idle to ensure auth state is fully settled
    console.log(`[${userKey}] Step 9: Waiting for network idle`);
    await page.waitForLoadState('networkidle');
    console.log(`[${userKey}] ✓ Network idle (${Date.now() - startTime}ms)`);
    
    console.log(`[${userKey}] ✅ Login complete in ${Date.now() - startTime}ms\n`);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[${userKey}] ❌ Login failed after ${elapsed}ms`);
    console.error(`[${userKey}] Current URL: ${page.url()}`);
    console.error(`[${userKey}] Error: ${error}`);
    throw error;
  }
}

/**
 * Run linting check before tests
 * Uses the same biome configuration as pre-commit hooks
 * Only checks files changed in current branch (compared to main)
 */
async function runLintingCheck(): Promise<void> {
  console.log("\n🔍 UAT Pre-Test: Running linting check on changed files...");

  const projectRoot = path.join(__dirname, "../../..");

  try {
    // Get the main branch name (could be 'main' or 'master')
    let mainBranch = "main";
    try {
      execSync("git rev-parse --verify main", {
        cwd: projectRoot,
        stdio: "ignore",
      });
    } catch {
      try {
        execSync("git rev-parse --verify master", {
          cwd: projectRoot,
          stdio: "ignore",
        });
        mainBranch = "master";
      } catch {
        console.log("⚠️  Could not find main/master branch, checking all files");
        mainBranch = null;
      }
    }

    // Get list of changed files
    let changedFiles: string[] = [];
    if (mainBranch) {
      try {
        const gitDiffOutput = execSync(
          `git diff --name-only --diff-filter=ACM ${mainBranch}...HEAD`,
          {
            cwd: projectRoot,
            encoding: "utf-8",
          }
        );
        changedFiles = gitDiffOutput
          .trim()
          .split("\n")
          .filter((file) => file.match(/\.(ts|tsx|js|jsx)$/))
          .filter((file) => file.length > 0);
      } catch (error) {
        // If git diff fails, fall back to checking all files
        console.log("⚠️  Git diff failed, checking all files");
      }
    }

    // If no changed files, skip linting
    if (changedFiles.length === 0) {
      console.log("ℹ️  No changed TypeScript/JavaScript files to lint");
      console.log("✅ Linting check passed!\n");
      return;
    }

    console.log(`   Checking ${changedFiles.length} changed file(s)...`);

    // Run biome check on changed files only
    // This matches pre-commit behavior (only check changed files)
    execSync(
      `npx biome check --diagnostic-level=error --files-ignore-unknown=true --no-errors-on-unmatched ${changedFiles.join(" ")}`,
      {
        cwd: projectRoot,
        stdio: "inherit", // Show biome output directly
        encoding: "utf-8",
      }
    );

    console.log("✅ Linting check passed!\n");
  } catch (error) {
    console.error("");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ LINTING FAILED - UAT tests cannot proceed");
    console.error("");
    console.error("Fix linting errors in changed files before running tests:");
    console.error("  npx biome check --write <file>   # Auto-fix safe issues");
    console.error("  npx biome check <file>           # View all issues");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("");

    throw new Error("Linting check failed - UAT tests blocked");
  }
}

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || "http://localhost:3000";

  // Load test data
  const testDataPath = path.join(__dirname, "test-data.json");
  const testData: TestData = JSON.parse(fs.readFileSync(testDataPath, "utf-8"));

  // Create storage states directory
  const storageDir = path.join(__dirname, ".auth");
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const browser = await chromium.launch();

  // Verify application is running
  const page = await browser.newPage();
  try {
    await page.goto(baseURL, { timeout: 10000 });
    console.log("✅ Application is running at", baseURL);
  } catch (error) {
    console.error("❌ Application is not running at", baseURL);
    console.error("Please start the dev server: npm run dev");
    await browser.close();
    throw new Error(`Application not running at ${baseURL}`);
  }
  await page.close();

  // Run linting check before proceeding with authentication
  await runLintingCheck();

  // Create authenticated states for each user role
  const usersToAuth = ["owner", "admin", "coach", "parent"];

  for (const userKey of usersToAuth) {
    const user = testData.users[userKey];
    if (!user) continue;

    const maxRetries = 2;
    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      attempt++;
      const retryLabel = attempt > 1 ? ` (Retry ${attempt - 1}/${maxRetries - 1})` : "";
      
      if (attempt > 1) {
        console.log(`\n🔄 Retrying ${userKey} authentication...\n`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Extra delay before retry
      }

      const context = await browser.newContext({ baseURL });
      const authPage = await context.newPage();

      try {
        await loginWithEmail(authPage, user.email, user.password, userKey);

        // Save storage state
        console.log(`[${userKey}] Step 10: Saving storage state`);
        const storagePath = path.join(storageDir, `${userKey}.json`);
        await context.storageState({ path: storagePath });
        console.log(`✅ Created auth state for ${userKey} (${user.email})${retryLabel}\n`);
        success = true;
      } catch (error) {
        console.error(`❌ Failed to create auth state for ${userKey}${retryLabel}`);
        console.error(`   Email: ${user.email}`);
        console.error(`   Time: ${new Date().toISOString()}`);
        
        if (attempt >= maxRetries) {
          console.error(`   ⚠️  Max retries reached. Continuing with other users...\n`);
        }
      }

      await context.close();
    }
    
    // Add delay between user authentications to prevent backend contention
    // This helps avoid race conditions with rapid sequential auth requests
    if (userKey !== "parent") {  // Don't delay after the last user
      console.log(`⏱️  Waiting 3 seconds before next user...\n`);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Increased to 3s
    }
  }

  await browser.close();
  console.log("\n🎉 Global setup complete!\n");
}

export default globalSetup;
