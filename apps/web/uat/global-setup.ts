import { chromium, FullConfig } from "@playwright/test";
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
  password: string
): Promise<void> {
  await page.goto("/login");

  // Wait for the page to fully load - the form is inside Suspense and Convex auth states
  // Wait for either the email field OR the "Sign in with Google" button to appear
  await page.waitForSelector(
    '[id="email"], button:has-text("Sign in with Google")',
    { timeout: 30000 }
  );

  // The form uses Tanstack Form - fields have id="email" and id="password"
  const emailField = page.locator("#email");
  await emailField.waitFor({ state: "visible", timeout: 30000 });

  // Fill email
  await emailField.fill(email);

  // Fill password
  const passwordField = page.locator("#password");
  await passwordField.waitFor({ state: "visible", timeout: 5000 });
  await passwordField.fill(password);

  // Click Sign In button (exact match to avoid SSO buttons)
  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  // Wait for successful login - redirects to /orgs
  await page.waitForURL(/\/orgs/, { timeout: 30000 });
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

  // Create authenticated states for each user role
  const usersToAuth = ["owner", "admin", "coach", "parent"];

  for (const userKey of usersToAuth) {
    const user = testData.users[userKey];
    if (!user) continue;

    const context = await browser.newContext({ baseURL });
    const authPage = await context.newPage();

    try {
      await loginWithEmail(authPage, user.email, user.password);

      // Save storage state
      const storagePath = path.join(storageDir, `${userKey}.json`);
      await context.storageState({ path: storagePath });
      console.log(`✅ Created auth state for ${userKey} (${user.email})`);
    } catch (error) {
      console.error(`❌ Failed to create auth state for ${userKey}:`, error);
    }

    await context.close();
  }

  await browser.close();
  console.log("\n🎉 Global setup complete!\n");
}

export default globalSetup;
