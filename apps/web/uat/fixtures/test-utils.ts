import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Load test data from JSON configuration file
 */
const testDataPath = path.join(__dirname, '../test-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));

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
  id: process.env.TEST_ORG_ID || '', // Populated at runtime
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
  admin: path.join(__dirname, '../.auth/admin.json'),
  coach: path.join(__dirname, '../.auth/coach.json'),
  parent: path.join(__dirname, '../.auth/parent.json'),
  owner: path.join(__dirname, '../.auth/owner.json'),
  multiRole: path.join(__dirname, '../.auth/multi-role.json'),
};

/**
 * Helper class for common test operations
 */
export class TestHelper {
  constructor(public page: Page) {}

  /**
   * Login with email and password
   */
  async login(email: string, password: string) {
    await this.page.goto('/login');
    await this.page.getByLabel(/email/i).fill(email);
    await this.page.getByLabel(/password/i).fill(password);
    // Use exact match to avoid matching SSO buttons like "Sign in with Google"
    await this.page.getByRole('button', { name: 'Sign In', exact: true }).click();
    // Wait for redirect to orgs page or dashboard
    await this.page.waitForURL(/\/(orgs|dashboard)/, { timeout: 15000 });
  }

  /**
   * Logout current user
   */
  async logout() {
    // Click user menu and logout
    await this.page.getByRole('button', { name: /user|profile|menu/i }).click();
    await this.page.getByRole('menuitem', { name: /logout|sign out/i }).click();
    await this.page.waitForURL('/login');
  }

  /**
   * Navigate to organization
   */
  async goToOrg(orgId?: string) {
    const id = orgId || process.env.TEST_ORG_ID || TEST_ORG.id;
    await this.page.goto(`/orgs/${id}`);
  }

  /**
   * Navigate to admin dashboard
   */
  async goToAdmin(orgId?: string) {
    const id = orgId || process.env.TEST_ORG_ID || TEST_ORG.id;
    await this.page.goto(`/orgs/${id}/admin`);
  }

  /**
   * Navigate to coach dashboard
   */
  async goToCoach(orgId?: string) {
    const id = orgId || process.env.TEST_ORG_ID || TEST_ORG.id;
    await this.page.goto(`/orgs/${id}/coach`);
  }

  /**
   * Navigate to parent dashboard
   */
  async goToParent(orgId?: string) {
    const id = orgId || process.env.TEST_ORG_ID || TEST_ORG.id;
    await this.page.goto(`/orgs/${id}/parents`);
  }

  /**
   * Wait for page to be fully loaded (no network activity)
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if toast notification appears with text
   */
  async expectToast(text: string | RegExp) {
    await expect(this.page.getByRole('alert').filter({ hasText: text })).toBeVisible();
  }

  /**
   * Check if user is redirected to login
   */
  async expectRedirectToLogin() {
    await this.page.waitForURL('/login');
    await expect(this.page).toHaveURL('/login');
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
    await this.page.getByRole('button', { name }).click();
  }

  /**
   * Select option from dropdown
   */
  async selectOption(label: string | RegExp, value: string) {
    await this.page.getByLabel(label).selectOption(value);
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
