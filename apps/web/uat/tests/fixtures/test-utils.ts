/**
 * Test utilities re-export from main fixtures
 * This file provides backwards compatibility for tests that import from this path
 */

import { test as base, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Load test data
const testDataPath = path.join(__dirname, "../../test-data.json");
const testData = JSON.parse(fs.readFileSync(testDataPath, "utf-8"));

// Export test users and data
export const TEST_USERS = testData.users;
export const TEST_ORG = testData.organization;
export const TEST_TEAMS = testData.teams || [];
export const TEST_INVITATIONS = testData.invitations || {};
export const TEST_PLAYERS = testData.players || [];

/**
 * Test helper class for common operations
 */
class TestHelper {
  constructor(private page: Page) {}

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.goto("/login");
    await this.page.waitForSelector(
      '[id="email"], button:has-text("Sign in with Google")',
      { timeout: 30000 }
    );

    const emailField = this.page.locator("#email");
    await emailField.waitFor({ state: "visible", timeout: 30000 });
    await emailField.fill(email);

    const passwordField = this.page.locator("#password");
    await passwordField.waitFor({ state: "visible", timeout: 5000 });
    await passwordField.fill(password);

    await this.page.getByRole("button", { name: "Sign In", exact: true }).click();
    await this.page.waitForURL(/\/orgs/, { timeout: 30000 });
  }
}

/**
 * Extended test fixture with helper
 */
export const test = base.extend<{
  helper: TestHelper;
}>({
  helper: async ({ page }, use) => {
    const helper = new TestHelper(page);
    await use(helper);
  },
});

export { expect };
