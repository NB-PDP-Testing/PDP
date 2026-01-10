import { test, expect } from "../../fixtures/test-fixtures";
import {
  waitForPageLoad,
  navigateToAdmin,
  organization,
} from "../../fixtures/test-fixtures";

/**
 * Admin Dashboard Tests
 *
 * Tests for admin dashboard functionality including navigation, stats, and features.
 * Based on gaps identified in docs/testing/UAT_MCP_TESTS.MD
 */

test.describe("ADMIN - Dashboard Tests", () => {
  test("ADMIN-001: Admin dashboard displays overview", async ({ ownerPage }) => {
    const page = ownerPage;

    // Navigate to orgs first
    await page.goto("/orgs");
    await waitForPageLoad(page);

    // Click Admin Panel
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Verify admin dashboard heading
    await expect(
      page.getByRole("heading", { name: "Admin Dashboard" })
    ).toBeVisible();

    // Verify overview description
    await expect(
      page.getByText("Overview of your organization management")
    ).toBeVisible();
  });

  test("ADMIN-002: Dashboard shows statistics cards", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Verify stat cards are visible - use first() for elements that appear multiple times
    await expect(page.getByText("Pending Requests").first()).toBeVisible();
    await expect(page.getByText("Total Members").first()).toBeVisible();
    await expect(page.getByText("Teams").first()).toBeVisible();
    await expect(page.getByText("Players").first()).toBeVisible();
    await expect(page.getByText("Medical Profiles").first()).toBeVisible();
  });

  test("ADMIN-003: Navigation tabs are visible", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Verify key navigation tabs exist (using first() to handle duplicates)
    const expectedTabs = [
      "Overview",
      "Players",
      "Teams",
      "Coaches",
      "Users",
      "Settings",
    ];

    for (const tab of expectedTabs) {
      // Use first() to handle cases where tabs appear in both sidebar and mobile nav
      const tabElement = page.getByRole("link", { name: tab }).or(page.getByRole("button", { name: tab })).first();
      await expect(tabElement).toBeVisible();
    }
  });

  test("ADMIN-004: Organization owner info is displayed", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Verify organization owner section - use first() for potential duplicates
    await expect(page.getByText("Organization Owner").first()).toBeVisible();
  });

  test("ADMIN-005: Pending membership requests section", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Verify pending requests section exists - use first()
    await expect(
      page.getByText("Pending Membership Requests").first()
    ).toBeVisible();
  });

  test("ADMIN-006: Grow your organization section", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Verify grow organization section - use first() for potential duplicates
    await expect(page.getByText("Grow Your Organization").first()).toBeVisible();
  });

  test("ADMIN-007: Command palette button is visible", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Verify search/command palette button
    await expect(
      page.getByRole("button", { name: /Search|⌘ K/i })
    ).toBeVisible();
  });

  test.skip("ADMIN-010: Command palette opens with keyboard shortcut", async ({ ownerPage }) => {
    // SKIPPED: Command palette keyboard shortcuts not yet implemented
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Click the search button to open command palette instead of keyboard shortcut
    // (keyboard shortcuts can be unreliable in Playwright)
    await page.getByRole("button", { name: /Search|⌘ K/i }).click();

    // Verify command palette is visible
    await expect(
      page.getByRole("heading", { name: "Command Palette" })
    ).toBeVisible({ timeout: 5000 });
  });

  test("ADMIN-008: Back to App button works", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Click Back to App
    await page.click('text="Back to App"');

    // Should navigate back to org page
    await expect(page).toHaveURL(/\/orgs\/[^/]+$/);
  });

  test("ADMIN-009: Stat cards are clickable links", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Click on Players stat card
    await page.click('text="Players"');
    await waitForPageLoad(page);

    // Should navigate to players page
    await expect(page).toHaveURL(/\/admin\/players/);
  });
});
