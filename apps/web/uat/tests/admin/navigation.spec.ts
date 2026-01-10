import { test, expect } from "../../fixtures/test-fixtures";
import { waitForPageLoad } from "../../fixtures/test-fixtures";

/**
 * Admin Navigation Tests
 *
 * Tests for admin panel navigation to all sections identified during exploration.
 * Based on gaps identified in docs/testing/UAT_MCP_TESTS.MD
 */

test.describe("ADMIN - Navigation Tests", () => {
  test("ADMIN-011: Navigate to Overrides page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await page.click('text="Overrides"');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/\/admin\/overrides/);
  });

  test("ADMIN-012: Navigate to Benchmarks page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await page.click('text="Benchmarks"');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/\/admin\/benchmarks/);
  });

  test("ADMIN-013: Navigate to Analytics page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await page.click('text="Analytics"');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/\/admin\/analytics/);
  });

  test("ADMIN-014: Navigate to Announcements page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await page.click('text="Announcements"');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/\/admin\/announcements/);
  });

  test("ADMIN-015: Navigate to Player Access page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await page.click('text="Player Access"');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/\/admin\/player-access/);
  });

  test("ADMIN-016: Navigate to Dev Tools page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await page.click('text="Dev Tools"');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/\/admin\/dev-tools/);
  });

  test("ADMIN-017: Navigate to Players page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await page.click('a:has-text("Players")');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/\/admin\/players/);
  });

  test("ADMIN-018: Navigate to Teams page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await page.click('a:has-text("Teams")');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/\/admin\/teams/);
  });

  test("ADMIN-019: Navigate to Users page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await page.click('text="Users"');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/\/admin\/users/);
  });

  test("ADMIN-020: Navigate to Approvals page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await page.click('text="Approvals"');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/\/admin\/users\/approvals/);
  });

  test("ADMIN-021: Navigate to Settings page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await page.click('text="Settings"');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/\/admin\/settings/);
  });

  test("ADMIN-022: Navigate to Coaches page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await page.click('text="Coaches"');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/\/admin\/coaches/);
  });

  test("ADMIN-023: Navigate to Guardians page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await page.click('text="Guardians"');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/\/admin\/guardians/);
  });
});
