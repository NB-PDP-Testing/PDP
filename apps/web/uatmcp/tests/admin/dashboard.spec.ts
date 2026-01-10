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

    // Verify stat cards are visible
    await expect(page.getByText("Pending Requests")).toBeVisible();
    await expect(page.getByText("Total Members")).toBeVisible();
    await expect(page.getByText("Teams")).toBeVisible();
    await expect(page.getByText("Players")).toBeVisible();
    await expect(page.getByText("Medical Profiles")).toBeVisible();
  });

  test("ADMIN-003: Navigation tabs are visible", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Verify all navigation tabs from exploration
    const expectedTabs = [
      "Overview",
      "Players",
      "Teams",
      "Overrides",
      "Coaches",
      "Guardians",
      "Users",
      "Approvals",
      "Import",
      "GAA",
      "Benchmarks",
      "Analytics",
      "Announcements",
      "Player Access",
      "Settings",
    ];

    for (const tab of expectedTabs) {
      await expect(
        page.getByRole("link", { name: tab }).or(page.getByRole("button", { name: tab }))
      ).toBeVisible();
    }
  });

  test("ADMIN-004: Organization owner info is displayed", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Verify organization owner section
    await expect(page.getByText("Organization Owner")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Manage Ownership/i }).or(
        page.getByRole("button", { name: /Manage Ownership/i })
      )
    ).toBeVisible();
  });

  test("ADMIN-005: Pending membership requests section", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Verify pending requests section
    await expect(
      page.getByText("Pending Membership Requests")
    ).toBeVisible();
  });

  test("ADMIN-006: Grow your organization section", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Verify grow organization section
    await expect(page.getByText("Grow Your Organization")).toBeVisible();
    await expect(page.getByText(/share your organization join link/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /View Join Page/i }).or(
        page.getByRole("button", { name: /View Join Page/i })
      )
    ).toBeVisible();
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

  test("ADMIN-010: Command palette opens with keyboard shortcut", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Press Cmd+K (or Ctrl+K)
    await page.keyboard.press("Meta+k");

    // Verify command palette is visible
    await expect(
      page.getByRole("heading", { name: "Command Palette" }).or(
        page.getByText("Search for a command")
      )
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
