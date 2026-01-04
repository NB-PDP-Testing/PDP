import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * Test user credentials - these should match your test accounts
 * Update these with actual test account credentials
 */

export const TEST_USERS = {
  newUser: {
    email: 'newuser_pdp@outlook.com',
    password: 'Password123!', // Replace with actual password
    name: 'New Test User',
  },
  admin: {
    email: 'adm1n_pdp@outlook.com',
    password: 'Password123!', // Replace with actual password
    name: 'Admin User',
  },
  coach: {
    email: 'coach_pdp@outlook.com',
    password: 'Password123!', // Replace with actual password
    name: 'Coach User',
  },
  parent: {
    email: 'parent_pdp@outlook.com',
    password: 'Password123!', // Replace with actual password
    name: 'Parent User',
  },
  owner: {
    email: 'owner_pdp@outlook.com',
    password: 'Password123!', // Replace with actual password
    name: 'Owner User',
  },
  multiRole: {
    email: 'multi_pdp@outlook.com',
    password: 'Password123!', // Replace with actual password
    name: 'Multi Role User',
  },
};

/**
 * Test organization details
 */
export const TEST_ORG = {
  name: 'Esker Celtic Football Club',
  id: 'jh7abc123def456_organization123', // ← Put your org ID here
};

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
    await this.page.getByRole('button', { name: /sign in|log in|login/i }).click();
    // Wait for redirect to orgs page or dashboard
    await this.page.waitForURL(/\/(orgs|dashboard)/);
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
