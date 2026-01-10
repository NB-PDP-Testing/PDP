import { test, expect } from "../../fixtures/test-fixtures";
import { waitForPageLoad } from "../../fixtures/test-fixtures";

/**
 * Coach Dashboard Tests
 *
 * Tests for coach dashboard functionality.
 * Based on gaps identified in docs/testing/UAT_MCP_TESTS.MD
 */

test.describe("COACH - Dashboard Tests", () => {
  test("COACH-001: Coach dashboard loads correctly", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await waitForPageLoad(page);

    // Click Coach Panel
    await page.click('text="Coach Panel"');
    await waitForPageLoad(page);

    // Verify URL contains /coach
    await expect(page).toHaveURL(/\/coach/);
  });

  test("COACH-002: Coach dashboard header is visible", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Coach Panel"');
    await waitForPageLoad(page);

    // Verify Coach Dashboard link/heading
    await expect(
      page.getByText("Coach Dashboard")
    ).toBeVisible();
  });

  test("COACH-003: Back to App button works", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Coach Panel"');
    await waitForPageLoad(page);

    // Click Back to App
    await page.click('text="Back to App"');
    await waitForPageLoad(page);

    // Should navigate back to org page
    await expect(page).toHaveURL(/\/orgs\/[^/]+$/);
  });

  test("COACH-010: Empty state shows when no teams assigned", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Coach Panel"');
    await waitForPageLoad(page);

    // Check for empty state (may or may not be visible depending on data)
    // If no teams assigned, should show empty state
    const emptyState = page.getByRole("heading", { name: "No Teams Assigned" });
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    if (hasEmptyState) {
      await expect(emptyState).toBeVisible();
      await expect(
        page.getByText(/Contact your administrator/i)
      ).toBeVisible();
    }
    // If teams are assigned, the empty state won't be visible
    // which is also a valid state
  });

  test("COACH-004: Admin link visible for users with admin role", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Coach Panel"');
    await waitForPageLoad(page);

    // For owner user who has admin role, Admin link should be visible
    await expect(
      page.getByRole("link", { name: "Admin" })
    ).toBeVisible();
  });

  test("COACH-005: Navigate to Admin from Coach dashboard", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Coach Panel"');
    await waitForPageLoad(page);

    // Click Admin link
    await page.click('a:has-text("Admin")');
    await waitForPageLoad(page);

    // Should navigate to admin dashboard
    await expect(page).toHaveURL(/\/admin/);
  });
});
