import { test as base, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * PlayerARC UAT Test Fixtures
 *
 * Provides authenticated contexts and shared utilities for all tests.
 */

// Load test data
const testDataPath = path.join(__dirname, "../test-data.json");
export const testData = JSON.parse(fs.readFileSync(testDataPath, "utf-8"));

// Storage state paths
const authDir = path.join(__dirname, "../.auth");

/**
 * Extended test fixture with authenticated users
 */
export const test = base.extend<{
  ownerPage: Page;
  adminPage: Page;
  coachPage: Page;
  parentPage: Page;
}>({
  // Owner user (Platform Staff)
  ownerPage: async ({ browser }, use) => {
    const storageState = path.join(authDir, "owner.json");
    const context = await browser.newContext({
      storageState: fs.existsSync(storageState) ? storageState : undefined,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Admin user (Organization Admin)
  adminPage: async ({ browser }, use) => {
    const storageState = path.join(authDir, "admin.json");
    const context = await browser.newContext({
      storageState: fs.existsSync(storageState) ? storageState : undefined,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Coach user
  coachPage: async ({ browser }, use) => {
    const storageState = path.join(authDir, "coach.json");
    const context = await browser.newContext({
      storageState: fs.existsSync(storageState) ? storageState : undefined,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Parent user
  parentPage: async ({ browser }, use) => {
    const storageState = path.join(authDir, "parent.json");
    const context = await browser.newContext({
      storageState: fs.existsSync(storageState) ? storageState : undefined,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };

/**
 * Helper to dismiss PWA install prompt
 */
export async function dismissPWAPrompt(page: Page): Promise<void> {
  const notNowButton = page.getByRole("button", { name: "Not now" });
  if (await notNowButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await notNowButton.click();
  }
}

/**
 * Helper to wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
}

/**
 * Helper to login manually (for tests that need fresh login)
 * Uses the same approach as apps/web/uat/auth.setup.ts
 */
export async function login(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/login");

  // Wait for the page to fully load - the form is inside Suspense and Convex auth states
  await page.waitForSelector(
    '[id="email"], button:has-text("Sign in with Google")',
    { timeout: 30000 }
  );

  // The form uses Tanstack Form - fields have id="email" and id="password"
  const emailField = page.locator("#email");
  await emailField.waitFor({ state: "visible", timeout: 30000 });
  await emailField.fill(email);

  const passwordField = page.locator("#password");
  await passwordField.waitFor({ state: "visible", timeout: 5000 });
  await passwordField.fill(password);

  // Click Sign In button (exact match to avoid SSO buttons)
  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  // Wait for successful login - redirects to /orgs
  await page.waitForURL(/\/orgs/, { timeout: 30000 });
}

/**
 * Helper to logout
 */
export async function logout(page: Page): Promise<void> {
  // Click user dropdown and sign out
  await page.click('button:has-text("User")'); // Adjust selector as needed
  await page.click('text="Sign Out"');
  await page.waitForURL("/login");
}

/**
 * Helper to get organization ID from URL
 */
export function getOrgIdFromUrl(url: string): string | null {
  const match = url.match(/\/orgs\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Helper to navigate to admin dashboard
 */
export async function navigateToAdmin(page: Page, orgId?: string): Promise<void> {
  if (orgId) {
    await page.goto(`/orgs/${orgId}/admin`);
  } else {
    // Navigate via UI
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
  }
  await waitForPageLoad(page);
}

/**
 * Helper to navigate to coach dashboard
 */
export async function navigateToCoach(page: Page, orgId?: string): Promise<void> {
  if (orgId) {
    await page.goto(`/orgs/${orgId}/coach`);
  } else {
    await page.goto("/orgs");
    await page.click('text="Coach Panel"');
  }
  await waitForPageLoad(page);
}

/**
 * Test data helpers
 */
export const users = testData.users;
export const organization = testData.organization;
export const teams = testData.teams;
export const players = testData.players;
