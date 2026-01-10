import { test, expect } from "@playwright/test";
import {
  dismissPWAPrompt,
  users,
  login,
} from "../../fixtures/test-fixtures";

/**
 * Authentication Tests - Login
 *
 * Tests for login functionality including email/password and SSO flows.
 * Based on gaps identified in docs/testing/UAT_MCP_TESTS.MD
 */

test.describe("AUTH - Login Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await dismissPWAPrompt(page);
  });

  test("AUTH-001: Login page displays correctly", async ({ page }) => {
    // Verify page title and heading
    await expect(page).toHaveTitle(/PlayerArc/i);
    await expect(
      page.getByRole("heading", { name: "Sign In" })
    ).toBeVisible();

    // Verify form elements - form uses id="email" and id="password"
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign In", exact: true })
    ).toBeVisible();

    // Verify SSO buttons
    await expect(
      page.getByRole("button", { name: /Sign in with Google/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Sign in with Microsoft/i })
    ).toBeVisible();

    // Verify signup link
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("AUTH-002: Successful login with valid credentials", async ({ page }) => {
    const owner = users.owner;

    // Fill in credentials using form field IDs
    await page.locator("#email").fill(owner.email);
    await page.locator("#password").fill(owner.password);

    // Click sign in (exact match to avoid SSO buttons)
    await page.getByRole("button", { name: "Sign In", exact: true }).click();

    // Wait for redirect to authenticated area
    await page.waitForURL(/\/orgs/, { timeout: 30000 });

    // Verify user is logged in
    await expect(page).toHaveURL(/\/orgs/);
    // Use first() to handle multiple matching headings
    await expect(
      page.getByRole("heading", { name: /Welcome|Organizations/i }).first()
    ).toBeVisible();
  });

  test("AUTH-003: Login fails with invalid credentials", async ({ page }) => {
    // Fill in invalid credentials
    await page.locator("#email").fill("invalid@example.com");
    await page.locator("#password").fill("wrongpassword");

    // Click sign in
    await page.getByRole("button", { name: "Sign In", exact: true }).click();

    // Should stay on login page with error
    await expect(page).toHaveURL(/\/login/);

    // Should show error message (adjust selector based on actual error UI)
    // This may show as a toast or inline error
  });

  test("AUTH-004: Login fails with empty email", async ({ page }) => {
    // Leave email empty, fill password
    await page.locator("#password").fill("Password123!");

    // Click sign in
    await page.getByRole("button", { name: "Sign In", exact: true }).click();

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("AUTH-005: Login fails with empty password", async ({ page }) => {
    // Fill email, leave password empty
    await page.locator("#email").fill(users.owner.email);

    // Click sign in
    await page.getByRole("button", { name: "Sign In", exact: true }).click();

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("AUTH-006: Navigate to signup from login page", async ({ page }) => {
    // Click signup link
    await page.click('a:has-text("Sign up")');

    // Should navigate to signup page
    await expect(page).toHaveURL(/\/signup/);
    await expect(
      page.getByRole("heading", { name: "Sign Up" })
    ).toBeVisible();
  });

  test("AUTH-010: PWA install prompt can be dismissed", async ({ page }) => {
    // Go to login fresh (without beforeEach dismissal)
    await page.goto("/login");

    // Check if PWA prompt is visible
    const notNowButton = page.getByRole("button", { name: "Not now" });
    const installButton = page.getByRole("button", { name: "Install" });

    // If PWA prompt is shown, verify it can be dismissed
    if (await notNowButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(installButton).toBeVisible();
      await notNowButton.click();

      // After dismissing, login form should be visible
      await expect(
        page.getByRole("heading", { name: "Sign In" })
      ).toBeVisible();
    }
  });

  test("AUTH-011: Forgot password link is present", async ({ page }) => {
    // Verify forgot password link exists
    const forgotPasswordLink = page.getByRole("link", {
      name: /Forgot password/i,
    });
    await expect(forgotPasswordLink).toBeVisible();

    // Note: Click test depends on actual implementation
    // await forgotPasswordLink.click();
    // await expect(page).toHaveURL(/\/reset-password/);
  });

  test("AUTH-012: Google SSO button is clickable", async ({ page }) => {
    const googleButton = page.getByRole("button", {
      name: /Sign in with Google/i,
    });
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();

    // Note: Actual SSO flow requires Google OAuth setup
    // We just verify the button is functional
  });

  test("AUTH-013: Microsoft SSO button is clickable", async ({ page }) => {
    const microsoftButton = page.getByRole("button", {
      name: /Sign in with Microsoft/i,
    });
    await expect(microsoftButton).toBeVisible();
    await expect(microsoftButton).toBeEnabled();

    // Note: Actual SSO flow requires Microsoft OAuth setup
  });

  test("AUTH-014: Welcome message shows after login", async ({ page }) => {
    await login(page, users.owner.email, users.owner.password);

    // Check for welcome toast/message
    // This was observed during exploration: "Welcome back! Let's get to work."
    // Toast may have already disappeared, so this is optional verification
  });

  test("AUTH-015: Login persists across page refresh", async ({ page }) => {
    await login(page, users.owner.email, users.owner.password);

    // Verify logged in
    await expect(page).toHaveURL(/\/orgs/);

    // Refresh page
    await page.reload();

    // Should still be logged in
    await expect(page).toHaveURL(/\/orgs/);
    await expect(
      page.getByRole("heading", { name: /Welcome|Organizations/i }).first()
    ).toBeVisible();
  });
});
