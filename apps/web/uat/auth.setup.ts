import { test as setup, expect } from "@playwright/test";
import { TEST_USERS, AUTH_STATES } from "./fixtures/test-utils";

/**
 * Authentication Setup
 *
 * This file creates authenticated session states for different user roles.
 * These sessions are saved and reused by tests to avoid logging in repeatedly.
 *
 * Run this setup first before other tests.
 */

/**
 * Helper function to login with email/password
 * Waits for form to be fully loaded before interacting
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

  // The form uses Tanstack Form - labels are "Email Address" and "Password"
  // Wait specifically for the email input field
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
  await expect(page).toHaveURL(/\/orgs/);
}

// Setup admin user session
setup("authenticate as admin", async ({ page }) => {
  await loginWithEmail(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

  // Save storage state
  await page.context().storageState({ path: AUTH_STATES.admin });
});

// Setup coach user session
setup("authenticate as coach", async ({ page }) => {
  await loginWithEmail(page, TEST_USERS.coach.email, TEST_USERS.coach.password);

  await page.context().storageState({ path: AUTH_STATES.coach });
});

// Setup parent user session
setup("authenticate as parent", async ({ page }) => {
  await loginWithEmail(
    page,
    TEST_USERS.parent.email,
    TEST_USERS.parent.password
  );

  await page.context().storageState({ path: AUTH_STATES.parent });
});

// Setup owner user session
setup("authenticate as owner", async ({ page }) => {
  await loginWithEmail(page, TEST_USERS.owner.email, TEST_USERS.owner.password);

  await page.context().storageState({ path: AUTH_STATES.owner });
});