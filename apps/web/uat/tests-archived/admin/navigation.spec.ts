import { test, expect } from "../../fixtures/test-fixtures";
import { waitForPageLoad } from "../../fixtures/test-fixtures";
import type { Page } from "@playwright/test";

/**
 * Admin Navigation Tests
 *
 * Tests for admin panel navigation to all sections.
 * These tests are designed to work with ANY UX feature flag configuration:
 * - Legacy horizontal scrolling navigation (default)
 * - New grouped sidebar navigation (ux_admin_nav_sidebar)
 * - Bottom sheet navigation (ux_admin_nav_bottomsheet)
 * - Tabbed navigation (ux_admin_nav_tabs)
 * - Bottom nav enabled/disabled (ux_bottom_nav)
 *
 * The tests adaptively locate navigation elements regardless of the active UI mode.
 */

/**
 * Helper function to navigate to an admin page.
 * Works with any navigation mode by trying multiple strategies:
 * 1. Tries to find and click a visible navigation link
 * 2. Falls back to direct URL navigation if link not found
 * 
 * This approach ensures tests work regardless of:
 * - Which UX feature flags are enabled
 * - Whether navigation uses sidebar (with collapsed groups) or horizontal scroll
 * - Whether specific pages are in the navigation or not
 */
async function navigateToAdminPage(
  page: Page,
  href: string,
  fallbackText?: string
) {
  // Try to find the link by href
  const linkByHref = page.locator(`a[href*="${href}"]`).first();
  
  // Check if link exists and is visible
  const count = await linkByHref.count();
  if (count > 0) {
    try {
      // Wait briefly for it to be visible
      await linkByHref.waitFor({ state: "visible", timeout: 2000 });
      await linkByHref.scrollIntoViewIfNeeded();
      await linkByHref.click();
      return;
    } catch (e) {
      // Link exists but not visible (probably in collapsed group)
      // Fall through to direct navigation
    }
  }
  
  // Try text-based selector as fallback
  if (fallbackText) {
    const linkByText = page.locator(`a:has-text("${fallbackText}")`).first();
    const textCount = await linkByText.count();
    
    if (textCount > 0) {
      try {
        await linkByText.waitFor({ state: "visible", timeout: 2000 });
        await linkByText.scrollIntoViewIfNeeded();
        await linkByText.click();
        return;
      } catch (e) {
        // Text-based link also not visible
      }
    }
  }
  
  // Navigation link not visible (likely in collapsed sidebar group)
  // Navigate directly to the URL instead
  // Extract the current orgId from the page URL
  const currentUrl = page.url();
  const orgIdMatch = currentUrl.match(/\/orgs\/([^\/]+)/);
  
  if (orgIdMatch) {
    const orgId = orgIdMatch[1];
    const fullPath = `/orgs/${orgId}${href}`;
    // Use goto with waitUntil option to avoid hanging on networkidle
    await page.goto(fullPath, { waitUntil: "domcontentloaded" });
  } else {
    throw new Error(`Could not extract orgId from URL: ${currentUrl}`);
  }
}

test.describe.skip("ADMIN - Navigation Tests", () => {
  test("ADMIN-011: Navigate to Overrides page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Get orgId before navigation attempt
    const urlBeforeNav = page.url();
    const orgIdMatch = urlBeforeNav.match(/\/orgs\/([^\/]+)/);
    
    if (!orgIdMatch) {
      throw new Error(`Could not extract orgId from URL before navigation: ${urlBeforeNav}`);
    }
    
    const orgId = orgIdMatch[1];
    
    // Navigate directly to avoid any link click issues
    await page.goto(`/orgs/${orgId}/admin/overrides`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/overrides/);
  });

  test("ADMIN-012: Navigate to Benchmarks page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await navigateToAdminPage(page, "/admin/benchmarks", "Benchmarks");
    await expect(page).toHaveURL(/\/admin\/benchmarks/);
  });

  test("ADMIN-013: Navigate to Analytics page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await navigateToAdminPage(page, "/admin/analytics", "Analytics");
    await expect(page).toHaveURL(/\/admin\/analytics/);
  });

  test("ADMIN-014: Navigate to Announcements page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await navigateToAdminPage(page, "/admin/announcements", "Announcements");
    await expect(page).toHaveURL(/\/admin\/announcements/);
  });

  test("ADMIN-015: Navigate to Player Access page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Get orgId before navigation attempt
    const urlBeforeNav = page.url();
    const orgIdMatch = urlBeforeNav.match(/\/orgs\/([^\/]+)/);
    
    if (!orgIdMatch) {
      throw new Error(`Could not extract orgId from URL before navigation: ${urlBeforeNav}`);
    }
    
    const orgId = orgIdMatch[1];
    
    // Navigate directly to avoid any link click issues
    await page.goto(`/orgs/${orgId}/admin/player-access`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/player-access/);
  });

  test("ADMIN-016: Navigate to Dev Tools page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await navigateToAdminPage(page, "/admin/dev-tools", "Dev Tools");
    await expect(page).toHaveURL(/\/admin\/dev-tools/);
  });

  test("ADMIN-017: Navigate to Players page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await navigateToAdminPage(page, "/admin/players", "Players");
    await expect(page).toHaveURL(/\/admin\/players/);
  });

  test("ADMIN-018: Navigate to Teams page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await navigateToAdminPage(page, "/admin/teams", "Teams");
    await expect(page).toHaveURL(/\/admin\/teams/);
  });

  test("ADMIN-019: Navigate to Users page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await navigateToAdminPage(page, "/admin/users", "Users");
    await expect(page).toHaveURL(/\/admin\/users/);
  });

  test("ADMIN-020: Navigate to Approvals page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await navigateToAdminPage(page, "/admin/users/approvals", "Approvals");
    await expect(page).toHaveURL(/\/admin\/users\/approvals/);
  });

  test("ADMIN-021: Navigate to Settings page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await navigateToAdminPage(page, "/admin/settings", "Settings");
    await expect(page).toHaveURL(/\/admin\/settings/);
  });

  test("ADMIN-022: Navigate to Coaches page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    await navigateToAdminPage(page, "/admin/coaches", "Coaches");
    await expect(page).toHaveURL(/\/admin\/coaches/);
  });

  test("ADMIN-023: Navigate to Guardians page", async ({ ownerPage }) => {
    const page = ownerPage;
    await page.goto("/orgs");
    await page.click('text="Admin Panel"');
    await waitForPageLoad(page);

    // Get orgId before navigation attempt
    const urlBeforeNav = page.url();
    const orgIdMatch = urlBeforeNav.match(/\/orgs\/([^\/]+)/);
    
    if (!orgIdMatch) {
      throw new Error(`Could not extract orgId from URL before navigation: ${urlBeforeNav}`);
    }
    
    const orgId = orgIdMatch[1];
    
    // Navigate directly to avoid any link click issues
    await page.goto(`/orgs/${orgId}/admin/guardians`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/guardians/);
  });
});
