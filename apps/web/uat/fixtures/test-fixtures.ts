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

// Base URL for all tests
const baseURL = "http://localhost:3000";

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
      baseURL,
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
      baseURL,
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
      baseURL,
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
      baseURL,
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
 * Helper to get current org ID
 *
 * Tries multiple strategies to get orgId:
 * 1. Check if already on an org page
 * 2. Navigate to /orgs and extract from first org card
 * 3. Use JavaScript to get from Better Auth session
 */
export async function getCurrentOrgId(page: Page): Promise<string> {
  // Strategy 1: Check if we're already on an org page
  let url = page.url();
  let orgId = getOrgIdFromUrl(url);

  if (orgId && orgId !== "current") {
    return orgId;
  }

  // Strategy 2: Navigate to /orgs and get first organization
  await page.goto("/orgs");
  await waitForPageLoad(page);

  // Wait a bit for async data to load
  await page.waitForTimeout(2000);

  // Try to find an org card and click it to get to an org page
  const orgCard = page.locator('[data-testid="org-card"]').first()
    .or(page.locator('[data-slot="card"]').first())
    .or(page.getByRole("link", { name: /admin panel|coach panel/i }).first());

  const cardVisible = await orgCard.isVisible({ timeout: 10000 }).catch(() => false);

  if (cardVisible) {
    // Get href from a link inside the card
    const adminLink = page.getByRole("link", { name: /admin panel/i }).first();
    const coachLink = page.getByRole("link", { name: /coach panel/i }).first();

    let href = null;
    if (await adminLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      href = await adminLink.getAttribute("href");
    } else if (await coachLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      href = await coachLink.getAttribute("href");
    }

    if (href) {
      const match = href.match(/\/orgs\/([^\/]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
  }

  // Strategy 3: Try to get from JavaScript/localStorage
  try {
    const sessionData = await page.evaluate(() => {
      // Try to get from Better Auth session
      const authStr = localStorage.getItem('better-auth.session.token') ||
                     localStorage.getItem('session') ||
                     localStorage.getItem('auth');
      return authStr;
    });

    if (sessionData) {
      // This is a fallback - the session might have orgId
      console.log("[getCurrentOrgId] Found session data, but need to extract orgId");
    }
  } catch (e) {
    // Ignore evaluation errors
  }

  throw new Error(`Could not get orgId from /orgs page. No organization cards found.`);
}

/**
 * Helper to navigate to admin dashboard
 * Improved to handle timing issues and feature flags
 */
export async function navigateToAdmin(page: Page, orgId?: string): Promise<void> {
  if (!orgId) {
    // Get orgId first using the /orgs/current route
    orgId = await getCurrentOrgId(page);
  }

  // Navigate directly to admin dashboard
  await page.goto(`/orgs/${orgId}/admin`);
  await waitForPageLoad(page);
}

/**
 * Helper to navigate to coach dashboard
 * Improved to handle timing issues and feature flags
 */
export async function navigateToCoach(page: Page, orgId?: string): Promise<void> {
  if (!orgId) {
    // Get orgId first using the /orgs/current route
    orgId = await getCurrentOrgId(page);
  }

  // Navigate directly to coach dashboard
  await page.goto(`/orgs/${orgId}/coach`);
  await waitForPageLoad(page);
}

/**
 * Helper to navigate to a specific coach sub-page
 *
 * Coach navigation is organized in collapsible sidebar groups:
 * - Players: assess, players
 * - Development: goals, voice-notes, session-plans
 * - Health & Attendance: injuries, medical, match-day
 *
 * Instead of clicking through UI navigation (which requires expanding groups
 * and depends on feature flags), this navigates directly to the page URL.
 *
 * @example
 * await navigateToCoachPage(page, orgId, 'assess');
 * await navigateToCoachPage(page, undefined, 'injuries'); // Gets orgId automatically
 */
export async function navigateToCoachPage(
  page: Page,
  orgId: string | undefined,
  subPage: 'assess' | 'players' | 'goals' | 'voice-notes' | 'session-plans' | 'injuries' | 'medical' | 'match-day' | 'todos'
): Promise<void> {
  if (!orgId) {
    // Get orgId first using the /orgs/current route
    orgId = await getCurrentOrgId(page);
  }

  // Navigate directly to coach sub-page
  await page.goto(`/orgs/${orgId}/coach/${subPage}`);
  await waitForPageLoad(page);
}

/**
 * Helper to navigate to organizations list and click a specific panel
 * Use this when you specifically need to test the UI navigation
 */
export async function navigateToOrgAndClickPanel(
  page: Page,
  panel: "Admin Panel" | "Coach Panel" | "Parent Portal"
): Promise<void> {
  await page.goto("/orgs");
  await waitForPageLoad(page);

  // Wait for the panel button to be visible (with longer timeout for loading)
  const panelButton = page.locator(`text="${panel}"`).first();
  await panelButton.waitFor({ state: "visible", timeout: 15000 });
  await panelButton.click();
  await waitForPageLoad(page);
}

/**
 * Test data helpers
 */
export const users = testData.users;
export const organization = testData.organization;
export const teams = testData.teams;
export const players = testData.players;
