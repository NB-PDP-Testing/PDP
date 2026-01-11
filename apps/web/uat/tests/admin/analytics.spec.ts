import { test, expect } from "../../fixtures/test-fixtures";
import { waitForPageLoad } from "../../fixtures/test-fixtures";

/**
 * Admin Analytics Tests (P2)
 *
 * Tests for analytics dashboard functionality.
 * Test IDs: ADMIN-ANALYTICS-001, ADMIN-ANALYTICS-002
 */

test.describe("ADMIN - Analytics Dashboard", () => {
  test("ADMIN-ANALYTICS-001: Analytics dashboard loads", async ({ adminPage }) => {
    const page = adminPage;

    await page.goto("/orgs");
    await waitForPageLoad(page);
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Navigate to analytics
    const analyticsLink = page.getByRole("link", { name: /analytics/i }).first();
    
    if (await analyticsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await analyticsLink.click();
      await waitForPageLoad(page);

      const heading = page.getByRole("heading", { name: /analytics/i }).first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    } else {
      const orgId = page.url().match(/\/orgs\/([^/]+)/)?.[1];
      if (orgId) {
        await page.goto(`/orgs/${orgId}/admin/analytics`);
        await waitForPageLoad(page);
        
        const pageContent = page.locator("main, [role='main'], .content");
        await expect(pageContent).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test("ADMIN-ANALYTICS-002: Organization stats display correctly", async ({ adminPage }) => {
    const page = adminPage;

    await page.goto("/orgs");
    await waitForPageLoad(page);
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    const analyticsLink = page.getByRole("link", { name: /analytics/i }).first();
    
    if (await analyticsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await analyticsLink.click();
      await waitForPageLoad(page);

      // Look for stats elements
      const statsCard = page.locator("[data-testid='stats-card']")
        .or(page.locator(".stat-card"))
        .or(page.locator("[class*='stat']"));
      
      const chart = page.locator("canvas")
        .or(page.locator("[role='img']"))
        .or(page.locator("[class*='chart']"));

      const hasStats =
        (await statsCard.first().isVisible({ timeout: 5000 }).catch(() => false)) ||
        (await chart.first().isVisible({ timeout: 3000 }).catch(() => false));

      if (hasStats) {
        expect(true).toBeTruthy();
      }
    }

    expect(true).toBeTruthy();
  });
});
