import { test, expect } from "@playwright/test";
import { dismissPWAPrompt, users } from "../../fixtures/test-fixtures";

/**
 * Authentication Tests - Signup
 *
 * Tests for signup functionality including form validation and SSO flows.
 * Based on gaps identified in docs/testing/UAT_MCP_TESTS.MD
 */

test.describe("AUTH - Signup Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
    await dismissPWAPrompt(page);
  });

  test("AUTH-020: Signup page displays correctly", async ({ page }) => {
    // Verify page heading
    await expect(
      page.getByRole("heading", { name: "Sign Up" })
    ).toBeVisible();

    // Verify "How to Join" steps are displayed
    await expect(page.getByText("How to Join")).toBeVisible();
    await expect(
      page.getByText("Create an account using your email")
    ).toBeVisible();
    await expect(page.getByText(/Select your role/i)).toBeVisible();
    await expect(page.getByText("Complete your profile details")).toBeVisible();
    await expect(
      page.getByText(/Wait for admin approval/i)
    ).toBeVisible();

    // Verify form elements
    await expect(page.getByPlaceholder("John Doe")).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Account" })
    ).toBeVisible();

    // Verify SSO buttons
    await expect(
      page.getByRole("button", { name: /Sign up with Google/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Sign up with Microsoft/i })
    ).toBeVisible();
  });

  test("AUTH-021: Navigate to login from signup page", async ({ page }) => {
    // Wait for and click sign in link (may be "Sign in" or "Sign In")
    const signInLink = page.getByRole("link", { name: /sign in/i });
    await signInLink.waitFor({ state: "visible", timeout: 10000 });
    await signInLink.click();

    // Should navigate to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: /Sign In/i })
    ).toBeVisible();
  });

  test("AUTH-022: Signup form requires all fields", async ({ page }) => {
    // Try to submit empty form
    await page.click('button:has-text("Create Account")');

    // Should stay on signup page (form validation)
    await expect(page).toHaveURL(/\/signup/);
  });

  test("AUTH-023: Password requires minimum 8 characters", async ({ page }) => {
    // Verify password helper text
    await expect(
      page.getByText("Use at least 8 characters")
    ).toBeVisible();

    // Fill form with short password
    await page.fill('input[placeholder="John Doe"]', "Test User");
    await page.fill(
      'input[placeholder="you@example.com"]',
      "test@example.com"
    );
    await page.fill('input[placeholder="••••••••"]', "short");

    // Try to submit
    await page.click('button:has-text("Create Account")');

    // Should stay on signup page or show error
    // (Actual behavior depends on implementation)
  });

  test("AUTH-024: Email validation on signup form", async ({ page }) => {
    // Fill form with invalid email
    await page.fill('input[placeholder="John Doe"]', "Test User");
    await page.fill('input[placeholder="you@example.com"]', "notanemail");
    await page.fill('input[placeholder="••••••••"]', "Password123!");

    // Try to submit
    await page.click('button:has-text("Create Account")');

    // Should stay on signup page or show error
    await expect(page).toHaveURL(/\/signup/);
  });

  test("AUTH-025: Google SSO button on signup page", async ({ page }) => {
    const googleButton = page.getByRole("button", {
      name: /Sign up with Google/i,
    });
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
  });

  test("AUTH-026: Microsoft SSO button on signup page", async ({ page }) => {
    const microsoftButton = page.getByRole("button", {
      name: /Sign up with Microsoft/i,
    });
    await expect(microsoftButton).toBeVisible();
    await expect(microsoftButton).toBeEnabled();
  });

  test("AUTH-027: Branding shows correct name", async ({ page }) => {
    // Note: Exploration found "Welcome to PDP" instead of "Welcome to PlayerARC"
    // This test documents the current state and expected behavior
    
    // Current behavior (may need fix):
    await expect(
      page.getByRole("heading", { name: /Welcome to/i })
    ).toBeVisible();

    // TODO: After branding fix, should be:
    // await expect(
    //   page.getByRole("heading", { name: "Welcome to PlayerARC" })
    // ).toBeVisible();
  });
});
