import { test as base, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

/**
 * Load test data from JSON configuration file
 */
const testDataPath = path.join(__dirname, "../test-data.json");
const testData = JSON.parse(fs.readFileSync(testDataPath, "utf-8"));

/**
 * Test user credentials - loaded from test-data.json
 */
export const TEST_USERS = testData.users;

/**
 * Test organization details - loaded from test-data.json
 */
export const TEST_ORG = {
  name: testData.organization.name,
  slug: testData.organization.slug,
  sports: testData.organization.sports,
  colors: testData.organization.colors,
  id: process.env.TEST_ORG_ID || "", // Populated at runtime
  // Organization edit fields for TEST-SETUP-011
  editedname: testData.organization.editedname,
  editedslug: testData.organization.editedslug,
  Website: testData.organization.Website,
  FaceBook: testData.organization.FaceBook,
  Twitter: testData.organization.Twitter,
  Instagram: testData.organization.Instagram,
  Linkedin: testData.organization.Linkedin,
};

/**
 * Test teams - loaded from test-data.json
 */
export const TEST_TEAMS = testData.teams;

/**
 * Test invitations - loaded from test-data.json
 */
export const TEST_INVITATIONS = testData.invitations;

/**
 * Test players - loaded from test-data.json
 */
export const TEST_PLAYERS = testData.players || [];

/**
 * Storage state paths for authenticated sessions
 */
export const AUTH_STATES = {
  admin: path.join(__dirname, "../.auth/admin.json"),
  coach: path.join(__dirname, "../.auth/coach.json"),
  parent: path.join(__dirname, "../.auth/parent.json"),
  owner: path.join(__dirname, "../.auth/owner.json"),
  multiRole: path.join(__dirname, "../.auth/multi-role.json"),
};

/**
 * Helper class for common test operations
 */
export class TestHelper {
  constructor(public page: Page) {}

  /**
   * Login with email and password
   * Waits for form to be fully loaded before interacting
   */
  async login(email: string, password: string) {
    await this.page.goto("/login");

    // Wait for the page to fully load - the form is inside Suspense and Convex auth states
    // Wait for either the email field OR the "Sign in with Google" button to appear
    await this.page.waitForSelector(
      '[id="email"], button:has-text("Sign in with Google")',
      { timeout: 30000 }
    );

    // The form uses Tanstack Form - the email input has id="email"
    const emailField = this.page.locator("#email");
    await emailField.waitFor({ state: "visible", timeout: 30000 });

    // Fill email
    await emailField.fill(email);

    // Fill password
    const passwordField = this.page.locator("#password");
    await passwordField.waitFor({ state: "visible", timeout: 5000 });
    await passwordField.fill(password);

    // Use exact match to avoid matching SSO buttons like "Sign in with Google"
    await this.page
      .getByRole("button", { name: "Sign In", exact: true })
      .click();

    // Wait for successful redirect - login redirects to /orgs/current which then redirects to actual org page
    // Simply wait for URL to change away from /login
    await this.page.waitForURL(
      (url) => {
        const pathname = url.pathname;
        return !pathname.includes("/login") && !pathname.includes("/signup");
      },
      { timeout: 20000 }
    );
  }

  /**
   * Logout current user
   * 
   * The UserMenu component has:
   * - A DropdownMenuTrigger button (variant="outline") showing the user's name
   * - Inside the dropdown: "Sign Out" button (variant="destructive")
   */
  async logout() {
    // Wait for page to be stable
    await this.page.waitForLoadState("networkidle");

    // Check if Sign Out is already visible (dropdown already open)
    const signOutButton = this.page.getByRole("button", { name: "Sign Out" });
    if (await signOutButton.isVisible({ timeout: 500 }).catch(() => false)) {
      await signOutButton.click();
      await this.page.waitForURL(/\/login/, { timeout: 10000 });
      return;
    }

    // Strategy 1: Look for the user menu button which contains a user's name
    // The UserMenu shows the current user's name - it's a button trigger for a dropdown
    // Try common test user names from TEST_USERS
    const possibleUserNames = [
      TEST_USERS.owner?.name,
      TEST_USERS.admin?.name,
      TEST_USERS.coach?.name,
      TEST_USERS.parent?.name,
      "PDP Owner",
      "Test Admin",
      "Test Coach",
      "Test Parent",
    ].filter(Boolean);

    for (const name of possibleUserNames) {
      const userButton = this.page.getByRole("button", { name, exact: true });
      if (await userButton.isVisible({ timeout: 500 }).catch(() => false)) {
        await userButton.click();
        await this.page.waitForTimeout(200);
        
        // Check if Sign Out button appeared
        if (await signOutButton.isVisible({ timeout: 500 }).catch(() => false)) {
          await signOutButton.click();
          await this.page.waitForURL(/\/login/, { timeout: 10000 });
          return;
        }
        
        // Close if wrong menu
        await this.page.keyboard.press("Escape");
        await this.page.waitForTimeout(100);
      }
    }
    
    // Strategy 2: Find all buttons and look for one that opens a dropdown with Sign Out
    const allButtons = this.page.locator('button');
    const buttonCount = await allButtons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const btn = allButtons.nth(i);
      const isVisible = await btn.isVisible().catch(() => false);
      if (!isVisible) continue;
      
      const text = (await btn.textContent()) || "";
      // Skip obvious non-user-menu buttons
      if (text.match(/sign in|sign up|submit|save|cancel|google|microsoft|close|back|next|previous|menu|settings|toggle|moon|sun/i)) continue;
      if (!text.trim()) continue; // Skip buttons with no text
      
      // Click to see if it opens a dropdown
      await btn.click();
      await this.page.waitForTimeout(200);
      
      // Check if Sign Out button appeared
      if (await signOutButton.isVisible({ timeout: 500 }).catch(() => false)) {
        await signOutButton.click();
        await this.page.waitForURL(/\/login/, { timeout: 10000 });
        return;
      }
      
      // Close dropdown by pressing Escape
      await this.page.keyboard.press("Escape");
      await this.page.waitForTimeout(100);
    }

    // Fallback: Look for any clickable Sign Out text
    const signOutText = this.page.getByText("Sign Out", { exact: true });
    if (await signOutText.isVisible({ timeout: 1000 }).catch(() => false)) {
      await signOutText.click();
      await this.page.waitForURL(/\/login/, { timeout: 10000 });
      return;
    }

    throw new Error("Could not find user menu or Sign Out button");
  }

  /**
   * Navigate to organization
   */
  async goToOrg(orgId?: string) {
    const id = orgId || process.env.TEST_ORG_ID || TEST_ORG.id;
    await this.page.goto(`/orgs/${id}`);
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Navigate to admin dashboard
   */
  async goToAdmin(orgId?: string) {
    const id = orgId || process.env.TEST_ORG_ID || TEST_ORG.id;
    await this.page.goto(`/orgs/${id}/admin`);
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Navigate to coach dashboard
   */
  async goToCoach(orgId?: string) {
    const id = orgId || process.env.TEST_ORG_ID || TEST_ORG.id;
    await this.page.goto(`/orgs/${id}/coach`);
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Navigate to parent dashboard
   */
  async goToParent(orgId?: string) {
    const id = orgId || process.env.TEST_ORG_ID || TEST_ORG.id;
    await this.page.goto(`/orgs/${id}/parents`);
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Wait for page to be fully loaded (no network activity)
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Check if toast notification appears with text (using Sonner)
   */
  async expectToast(text: string | RegExp) {
    // Sonner uses data-sonner-toast attribute
    await expect(
      this.page.locator("[data-sonner-toast]").filter({ hasText: text })
    ).toBeVisible({ timeout: 10000 });
  }

  /**
   * Wait for toast to disappear
   */
  async waitForToastToDisappear() {
    await this.page
      .locator("[data-sonner-toast]")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => {
        /* Toast may have already disappeared */
      });
  }

  /**
   * Check if user is redirected to login
   */
  async expectRedirectToLogin() {
    await this.page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(this.page).toHaveURL(/\/login/);
  }

  /**
   * Fill form field by label
   */
  async fillField(label: string | RegExp, value: string) {
    await this.page.getByLabel(label).fill(value);
  }

  /**
   * Click button by name
   */
  async clickButton(name: string | RegExp) {
    await this.page.getByRole("button", { name }).click();
  }

  /**
   * Select option from dropdown
   */
  async selectOption(label: string | RegExp, value: string) {
    await this.page.getByLabel(label).selectOption(value);
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(locator: string | RegExp, timeout = 10000) {
    if (typeof locator === "string") {
      await this.page.locator(locator).waitFor({ timeout });
    } else {
      await this.page.getByText(locator).waitFor({ timeout });
    }
  }

  /**
   * Check if element exists and is visible
   */
  async isVisible(locator: string): Promise<boolean> {
    return this.page
      .locator(locator)
      .isVisible({ timeout: 2000 })
      .catch(() => false);
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async screenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }
}

/**
 * Extended test fixture with helper utilities
 */
export const test = base.extend<{ helper: TestHelper }>({
  helper: async ({ page }, use) => {
    const helper = new TestHelper(page);
    await use(helper);
  },
});

export { expect };
