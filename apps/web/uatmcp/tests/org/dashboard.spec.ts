import { test, expect } from "@playwright/test";
import {
  dismissPWAPrompt,
  login,
  users,
  organization,
  waitForPageLoad,
} from "../../fixtures/test-fixtures";

/**
 * Organization Dashboard Tests
 *
 * Tests for organization listing, creation, and management.
 * Based on gaps identified in docs/testing/UAT_MCP_TESTS.MD
 */

test.describe("ORG - Dashboard Tests", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, users.owner.email, users.owner.password);
  });

  test("ORG-001: Organizations dashboard displays correctly", async ({ page }) => {
    await expect(page).toHaveURL(/\/orgs/);

    // Verify welcome section
    await expect(
      page.getByRole("heading", { name: /Welcome to PlayerARC/i })
    ).toBeVisible();

    // Verify feature cards
    await expect(page.getByText("Team Management")).toBeVisible();
    await expect(page.getByText("Player Development")).toBeVisible();
    await expect(page.getByText("Analytics & Insights")).toBeVisible();
  });

  test("ORG-002: Your Organizations section is visible", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Your Organizations" })
    ).toBeVisible();

    await expect(
      page.getByText("Manage your sports clubs and organizations")
    ).toBeVisible();
  });

  test("ORG-003: Create Organization button is visible", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /Create Organization/i })
    ).toBeVisible();
  });

  test("ORG-004: Join Organization button is visible", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /Join Organization/i })
    ).toBeVisible();
  });

  test("ORG-005: Navigate to Create Organization page", async ({ page }) => {
    await page.click('text="Create Organization"');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/\/orgs\/create/);
  });

  test("ORG-006: Navigate to Join Organization page", async ({ page }) => {
    await page.click('text="Join Organization"');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/\/orgs\/join/);
  });

  test("ORG-007: Organization card displays correct info", async ({ page }) => {
    // Look for the test organization
    await expect(
      page.getByText(organization.editedname)
    ).toBeVisible();

    // Organization slug should be visible
    await expect(
      page.getByText(organization.slug)
    ).toBeVisible();
  });

  test("ORG-008: Organization card has Coach Panel link", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /Coach Panel/i })
    ).toBeVisible();
  });

  test("ORG-009: Organization card has Admin Panel link", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /Admin Panel/i })
    ).toBeVisible();
  });

  test("ORG-010: Switch between Coach and Admin panels", async ({ page }) => {
    // Click Coach Panel
    await page.click('text="Coach Panel"');
    await waitForPageLoad(page);
    await expect(page).toHaveURL(/\/coach/);

    // Navigate back
    await page.goto("/orgs");
    await waitForPageLoad(page);

    // Click Admin Panel
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);
    await expect(page).toHaveURL(/\/admin/);
  });

  test("ORG-011: Header navigation is visible", async ({ page }) => {
    // Home link
    await expect(
      page.getByRole("link", { name: "Home" })
    ).toBeVisible();

    // Platform link
    await expect(
      page.getByRole("link", { name: "Platform" })
    ).toBeVisible();

    // User dropdown
    await expect(
      page.getByRole("button", { name: /User/i })
    ).toBeVisible();

    // Theme toggle
    await expect(
      page.getByRole("button", { name: /Toggle theme/i })
    ).toBeVisible();
  });

  test("ORG-012: Platform staff sees All Platform Organizations", async ({ page }) => {
    // Platform staff (owner) should see this section
    await expect(
      page.getByRole("heading", { name: "All Platform Organizations" })
    ).toBeVisible();

    await expect(
      page.getByText("View and manage all organizations on the platform")
    ).toBeVisible();
  });
});
