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

// Export the test org ID for direct use in tests
export const TEST_ORG_ID = testData.organization.id;

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
    // Pre-dismiss the AI Coach Assistant help dialog
    await page.addInitScript(() => {
      localStorage.setItem("voice-notes-help-guide-seen", "true");
    });
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
    // Pre-dismiss the AI Coach Assistant help dialog
    await page.addInitScript(() => {
      localStorage.setItem("voice-notes-help-guide-seen", "true");
    });
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
    // Pre-dismiss the AI Coach Assistant help dialog that appears on first visit
    await page.addInitScript(() => {
      localStorage.setItem("voice-notes-help-guide-seen", "true");
    });
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
 * Helper to dismiss any blocking dialogs that appear after navigation.
 *
 * Known blocking dialogs:
 * 1. Onboarding ChildLinkingStep - AlertDialog for parent child confirmation
 *    (appears when a user with parent role has pending guardianPlayerLinks)
 *    Has "Accept All" and optionally "Skip for Now" buttons.
 *    "Skip for Now" has a max count of 3 so use "Accept All" as primary action.
 * 2. PWA install prompt
 *
 * Call this after navigating to a page where blocking dialogs may appear.
 */
export async function dismissBlockingDialogs(page: Page): Promise<void> {
  // Wait for the onboarding dialog to potentially appear.
  // The dialog loads from an async Convex query (getOnboardingTasks).
  // First wait briefly for data to load, then check for dialog.
  await page.waitForTimeout(1500);

  // Handle up to 3 sequential dialogs (privacy, additional info, onboarding)
  for (let i = 0; i < 3; i++) {
    try {
      const alertDialog = page.locator('[role="alertdialog"]');
      // Quick check if dialog is already visible
      if (!(await alertDialog.isVisible({ timeout: 2000 }).catch(() => false))) {
        break; // No dialog, we're done
      }

      // Check if this is the privacy consent dialog
      const privacyCheckbox = page.getByRole("checkbox", { name: /privacy policy/i });
      if (await privacyCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Privacy consent dialog - check the required checkbox
        await privacyCheckbox.click();
        await page.waitForTimeout(500);

        // Click the Accept & Continue button (should now be enabled)
        const acceptButton = page.getByRole("button", { name: /accept.*continue/i });
        await acceptButton.click();
        await page.waitForTimeout(2000);
        continue; // Check for next dialog
      }

      // Check if this is the "Additional Information" dialog (profile completion)
      const additionalInfoHeading = page.getByRole("heading", { name: /additional information/i });
      if (await additionalInfoHeading.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Fill required fields: phone, address, city, postcode
        const phoneInput = page.getByPlaceholder("Enter phone number");
        if (await phoneInput.count() > 0) {
          const currentVal = await phoneInput.inputValue().catch(() => "");
          if (!currentVal || currentVal === "+353") await phoneInput.fill("0871234567");
        }
        const addrInput = page.getByPlaceholder("123 Main Street");
        if (await addrInput.count() > 0) await addrInput.fill("123 Test Street");
        const cityInput = page.getByPlaceholder("Dublin");
        if (await cityInput.count() > 0) await cityInput.fill("Dublin");
        const postcodeInput = page.getByPlaceholder(/d02 xy45/i);
        if (await postcodeInput.count() > 0) await postcodeInput.fill("D02 XY45");
        await page.waitForTimeout(300);

        // Click Save & Continue (use exact text)
        const saveButton = page.getByRole("button", { name: "Save & Continue" });
        await saveButton.click({ timeout: 5000 });
        await page.waitForTimeout(1500);
        continue; // Check for next dialog
      }

      // Other onboarding dialogs — dismiss them by accepting all children (permanent fix)
      // or skipping if accept all isn't available
      const acceptAllButton = page.getByRole("button", { name: /accept all/i });
      if (await acceptAllButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await acceptAllButton.click();
        await page.waitForTimeout(1500);
        continue;
      }

      const skipButton = page.getByRole("button", { name: /skip for now/i });
      if (await skipButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await skipButton.click();
        await page.waitForTimeout(1500);
        continue;
      }

      // Last resort: click the first Accept button for an individual child
      const acceptButton = page.getByRole("button", { name: /accept link to/i }).first()
        .or(page.getByRole("button", { name: /^accept$/i }).first());
      if (await acceptButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await acceptButton.click();
        await page.waitForTimeout(1000);
        // Check if dialog closed, if not try again
        if (await alertDialog.isVisible({ timeout: 500 }).catch(() => false)) {
          const nextAccept = page.getByRole("button", { name: /^accept$/i }).first();
          if (await nextAccept.isVisible({ timeout: 500 }).catch(() => false)) {
            await nextAccept.click();
            await page.waitForTimeout(1000);
          }
        }
        continue;
      }

      // No known dialog type found, break to avoid infinite loop
      break;
    } catch (error) {
      // Error handling dialog, continue to next iteration
      console.log(`Dialog handling error (iteration ${i}):`, error);
    }
  }

  // Dismiss PWA prompt
  await dismissPWAPrompt(page);
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
 * For UAT tests, we use the known test organization ID from test-data.json.
 * This is more reliable than trying to extract it from the page DOM.
 *
 * Strategies:
 * 1. Check if already on an org page (extract from URL)
 * 2. Use the TEST_ORG_ID from test-data.json (default for UAT tests)
 */
export async function getCurrentOrgId(page: Page): Promise<string> {
  // Strategy 1: Check if we're already on an org page
  const url = page.url();
  const orgId = getOrgIdFromUrl(url);

  if (orgId && orgId !== "current") {
    return orgId;
  }

  // Strategy 2: Use the known test organization ID
  // This is the most reliable approach for UAT tests
  if (TEST_ORG_ID) {
    return TEST_ORG_ID;
  }

  throw new Error(`Could not get orgId. TEST_ORG_ID is not set in test-data.json.`);
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
 * Helper to navigate to parent dashboard
 * Improved to handle timing issues and feature flags
 */
export async function navigateToParent(page: Page, orgId?: string): Promise<void> {
  if (!orgId) {
    // Get orgId first using the /orgs/current route
    orgId = await getCurrentOrgId(page);
  }

  // Navigate directly to parent dashboard
  await page.goto(`/orgs/${orgId}/parents`);
  await waitForPageLoad(page);
}

/**
 * Helper to navigate to a specific parent sub-page
 *
 * Parent navigation may include:
 * - Main dashboard with children cards
 * - Coach feedback / summaries view
 * - Child details pages
 *
 * @example
 * await navigateToParentPage(page, orgId, 'coach-feedback');
 * await navigateToParentPage(page, undefined, 'children'); // Gets orgId automatically
 */
export async function navigateToParentPage(
  page: Page,
  orgId: string | undefined,
  subPage: 'coach-feedback' | 'children' | 'settings'
): Promise<void> {
  if (!orgId) {
    // Get orgId first using the /orgs/current route
    orgId = await getCurrentOrgId(page);
  }

  // Navigate directly to parent sub-page
  await page.goto(`/orgs/${orgId}/parents/${subPage}`);
  await waitForPageLoad(page);
}

/**
 * Test data helpers
 */
export const users = testData.users;
export const organization = testData.organization;
export const teams = testData.teams;
export const players = testData.players;
