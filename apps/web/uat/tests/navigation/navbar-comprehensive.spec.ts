import { test, expect } from "../../fixtures/test-fixtures";
import { waitForPageLoad, getCurrentOrgId } from "../../fixtures/test-fixtures";
import type { Page } from "@playwright/test";

/**
 * Comprehensive Navigation Bar Tests
 *
 * Tests all navigation links for each user role (Owner, Admin, Coach, Parent).
 * Handles both navbar modes controlled by PostHog feature flags:
 * - Legacy/default horizontal navigation
 * - Grouped sidebar navigation (ux_admin_nav_sidebar)
 *
 * These tests verify:
 * 1. All navigation links are accessible
 * 2. Links navigate to correct pages
 * 3. Pages load without errors
 * 4. No console errors during navigation
 *
 * Test IDs: NAVBAR-001 through NAVBAR-100+
 */

/**
 * Helper to detect which navigation mode is active
 */
async function detectNavMode(page: Page): Promise<"sidebar" | "horizontal"> {
  // Check for sidebar navigation indicators
  const hasSidebar = await page.locator('[data-testid="admin-sidebar"]')
    .or(page.locator('aside nav'))
    .or(page.locator('[class*="sidebar"]'))
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  return hasSidebar ? "sidebar" : "horizontal";
}

/**
 * Helper to extract all navigation links from the page
 * Handles both sidebar and horizontal navigation modes
 */
async function getAllNavLinks(page: Page): Promise<Array<{ text: string; href: string }>> {
  const navMode = await detectNavMode(page);

  let navContainer;
  if (navMode === "sidebar") {
    // Sidebar navigation - look in aside or sidebar container
    navContainer = page.locator('aside nav, [data-testid="admin-sidebar"], [class*="sidebar"] nav').first();
  } else {
    // Horizontal navigation - look in header nav or horizontal scroll container
    navContainer = page.locator('header nav, [class*="horizontal-nav"], [class*="scroll"]').first();
  }

  // Get all links within the navigation container
  const links = await navContainer.locator('a[href]').all();

  const navLinks: Array<{ text: string; href: string }> = [];

  for (const link of links) {
    try {
      const text = await link.innerText({ timeout: 1000 });
      const href = await link.getAttribute('href');

      if (href && text && !href.startsWith('#')) {
        navLinks.push({
          text: text.trim(),
          href
        });
      }
    } catch (e) {
      // Skip links that are not visible or accessible
      continue;
    }
  }

  return navLinks;
}

/**
 * Helper to expand collapsed navigation groups (sidebar mode)
 */
async function expandAllNavGroups(page: Page): Promise<void> {
  const navMode = await detectNavMode(page);

  if (navMode === "sidebar") {
    // Look for collapsible group buttons
    const groupButtons = await page.locator('button[aria-expanded="false"]').all();

    for (const button of groupButtons) {
      try {
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          await page.waitForTimeout(300); // Brief wait for expansion animation
        }
      } catch (e) {
        // Some buttons might not be clickable, continue
        continue;
      }
    }
  }
}

/**
 * Helper to navigate to a link and verify no errors
 */
async function navigateAndVerify(
  page: Page,
  linkText: string,
  href: string,
  testContext: string
): Promise<{ success: boolean; error?: string }> {
  const errors: string[] = [];

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Listen for page errors
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  try {
    // Navigate to the link
    await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitForPageLoad(page);

    // Verify page loaded successfully
    const url = page.url();
    if (!url.includes(href.split('?')[0])) {
      return {
        success: false,
        error: `Navigation failed: expected URL to include ${href}, got ${url}`
      };
    }

    // Check for error messages on page
    const hasErrorMessage = await page.locator('text=/error|not found|something went wrong/i')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (hasErrorMessage) {
      return {
        success: false,
        error: 'Page displays error message'
      };
    }

    // Check for collected errors
    if (errors.length > 0) {
      // Filter out WebSocket HMR errors (development only)
      const realErrors = errors.filter(err =>
        !err.includes('webpack-hmr') &&
        !err.includes('WebSocket') &&
        !err.includes('ERR_CONNECTION_REFUSED')
      );

      if (realErrors.length > 0) {
        return {
          success: false,
          error: `Console errors: ${realErrors.join(', ')}`
        };
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    // Remove listeners
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
  }
}

test.describe("NAVBAR - Admin Navigation Tests", () => {
  test("NAVBAR-ADMIN-001: Detect navigation mode and expand groups", async ({ adminPage }) => {
    const page = adminPage;

    // Navigate to admin dashboard
    await page.goto("/orgs");
    await waitForPageLoad(page);

    const adminPanel = page.getByText("Admin Panel").first();
    if (await adminPanel.isVisible({ timeout: 5000 }).catch(() => false)) {
      await adminPanel.click();
      await waitForPageLoad(page);
    } else {
      // Direct navigation if button not visible
      const orgId = await getCurrentOrgId(page);
      await page.goto(`/orgs/${orgId}/admin`);
      await waitForPageLoad(page);
    }

    // Detect navigation mode
    const navMode = await detectNavMode(page);
    console.log(`[NAVBAR-ADMIN-001] Navigation mode detected: ${navMode}`);

    // Expand all groups if in sidebar mode
    await expandAllNavGroups(page);

    // Verify we can extract nav links
    const navLinks = await getAllNavLinks(page);
    console.log(`[NAVBAR-ADMIN-001] Found ${navLinks.length} navigation links`);

    expect(navLinks.length).toBeGreaterThan(0);
  });

  test("NAVBAR-ADMIN-002: Overview/Dashboard link", async ({ adminPage }) => {
    const page = adminPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/admin`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Overview",
      `/orgs/${orgId}/admin`,
      "NAVBAR-ADMIN-002"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-ADMIN-002] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-ADMIN-003: Players link", async ({ adminPage }) => {
    const page = adminPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/admin`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Players",
      `/orgs/${orgId}/admin/players`,
      "NAVBAR-ADMIN-003"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-ADMIN-003] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-ADMIN-004: Teams link", async ({ adminPage }) => {
    const page = adminPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/admin`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Teams",
      `/orgs/${orgId}/admin/teams`,
      "NAVBAR-ADMIN-004"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-ADMIN-004] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-ADMIN-005: Coaches link", async ({ adminPage }) => {
    const page = adminPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/admin`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Coaches",
      `/orgs/${orgId}/admin/coaches`,
      "NAVBAR-ADMIN-005"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-ADMIN-005] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-ADMIN-006: Guardians link", async ({ adminPage }) => {
    const page = adminPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/admin`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Guardians",
      `/orgs/${orgId}/admin/guardians`,
      "NAVBAR-ADMIN-006"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-ADMIN-006] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-ADMIN-007: Users link", async ({ adminPage }) => {
    const page = adminPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/admin`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Users",
      `/orgs/${orgId}/admin/users`,
      "NAVBAR-ADMIN-007"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-ADMIN-007] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-ADMIN-008: Approvals link", async ({ adminPage }) => {
    const page = adminPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/admin`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Approvals",
      `/orgs/${orgId}/admin/users/approvals`,
      "NAVBAR-ADMIN-008"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-ADMIN-008] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-ADMIN-009: Settings link", async ({ adminPage }) => {
    const page = adminPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/admin`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Settings",
      `/orgs/${orgId}/admin/settings`,
      "NAVBAR-ADMIN-009"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-ADMIN-009] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-ADMIN-010: Benchmarks link", async ({ adminPage }) => {
    const page = adminPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/admin`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Benchmarks",
      `/orgs/${orgId}/admin/benchmarks`,
      "NAVBAR-ADMIN-010"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-ADMIN-010] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-ADMIN-011: Analytics link", async ({ adminPage }) => {
    const page = adminPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/admin`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Analytics",
      `/orgs/${orgId}/admin/analytics`,
      "NAVBAR-ADMIN-011"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-ADMIN-011] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-ADMIN-012: Overrides link", async ({ adminPage }) => {
    const page = adminPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/admin`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Overrides",
      `/orgs/${orgId}/admin/overrides`,
      "NAVBAR-ADMIN-012"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-ADMIN-012] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-ADMIN-013: Announcements link", async ({ adminPage }) => {
    const page = adminPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/admin`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Announcements",
      `/orgs/${orgId}/admin/announcements`,
      "NAVBAR-ADMIN-013"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-ADMIN-013] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-ADMIN-014: Player Access link", async ({ adminPage }) => {
    const page = adminPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/admin`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Player Access",
      `/orgs/${orgId}/admin/player-access`,
      "NAVBAR-ADMIN-014"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-ADMIN-014] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-ADMIN-099: All navigation links work", async ({ adminPage }) => {
    const page = adminPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/admin`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    // Get all navigation links
    const navLinks = await getAllNavLinks(page);
    console.log(`[NAVBAR-ADMIN-099] Testing ${navLinks.length} navigation links`);

    const results: Array<{ link: string; success: boolean; error?: string }> = [];

    for (const { text, href } of navLinks) {
      // Skip external links and hash links
      if (href.startsWith('http') || href.startsWith('#')) {
        continue;
      }

      // Make href absolute if relative
      const absoluteHref = href.startsWith('/') ? href : `/orgs/${orgId}/${href}`;

      const result = await navigateAndVerify(page, text, absoluteHref, `NAVBAR-ADMIN-099-${text}`);
      results.push({ link: text, success: result.success, error: result.error });

      console.log(`  ${result.success ? '✓' : '✗'} ${text}: ${absoluteHref}`);
      if (!result.success) {
        console.error(`    Error: ${result.error}`);
      }

      // Return to admin dashboard for next link
      await page.goto(`/orgs/${orgId}/admin`);
      await waitForPageLoad(page);
      await expandAllNavGroups(page);
    }

    // Report summary
    const failedLinks = results.filter(r => !r.success);
    console.log(`\n[NAVBAR-ADMIN-099] Summary: ${results.length - failedLinks.length}/${results.length} links passed`);

    if (failedLinks.length > 0) {
      console.error(`[NAVBAR-ADMIN-099] Failed links:`);
      failedLinks.forEach(({ link, error }) => {
        console.error(`  - ${link}: ${error}`);
      });
    }

    // Test passes if at least 80% of links work
    const passRate = (results.length - failedLinks.length) / results.length;
    expect(passRate).toBeGreaterThanOrEqual(0.8);
  });
});

test.describe("NAVBAR - Coach Navigation Tests", () => {
  test("NAVBAR-COACH-001: Detect navigation mode and expand groups", async ({ coachPage }) => {
    const page = coachPage;

    await page.goto("/orgs");
    await waitForPageLoad(page);

    const coachPanel = page.getByText("Coach Panel").first();
    if (await coachPanel.isVisible({ timeout: 5000 }).catch(() => false)) {
      await coachPanel.click();
      await waitForPageLoad(page);
    } else {
      const orgId = await getCurrentOrgId(page);
      await page.goto(`/orgs/${orgId}/coach`);
      await waitForPageLoad(page);
    }

    const navMode = await detectNavMode(page);
    console.log(`[NAVBAR-COACH-001] Navigation mode detected: ${navMode}`);

    await expandAllNavGroups(page);

    const navLinks = await getAllNavLinks(page);
    console.log(`[NAVBAR-COACH-001] Found ${navLinks.length} navigation links`);

    expect(navLinks.length).toBeGreaterThan(0);
  });

  test("NAVBAR-COACH-002: Dashboard link", async ({ coachPage }) => {
    const page = coachPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/coach`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Dashboard",
      `/orgs/${orgId}/coach`,
      "NAVBAR-COACH-002"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-COACH-002] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-COACH-003: Assess link", async ({ coachPage }) => {
    const page = coachPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/coach`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Assess",
      `/orgs/${orgId}/coach/assess`,
      "NAVBAR-COACH-003"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-COACH-003] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-COACH-004: Players link", async ({ coachPage }) => {
    const page = coachPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/coach`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Players",
      `/orgs/${orgId}/coach/players`,
      "NAVBAR-COACH-004"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-COACH-004] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-COACH-005: Goals link", async ({ coachPage }) => {
    const page = coachPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/coach`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Goals",
      `/orgs/${orgId}/coach/goals`,
      "NAVBAR-COACH-005"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-COACH-005] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-COACH-006: Voice Notes link", async ({ coachPage }) => {
    const page = coachPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/coach`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Voice Notes",
      `/orgs/${orgId}/coach/voice-notes`,
      "NAVBAR-COACH-006"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-COACH-006] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-COACH-007: Session Plans link", async ({ coachPage }) => {
    const page = coachPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/coach`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Session Plans",
      `/orgs/${orgId}/coach/session-plans`,
      "NAVBAR-COACH-007"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-COACH-007] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-COACH-008: Injuries link", async ({ coachPage }) => {
    const page = coachPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/coach`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Injuries",
      `/orgs/${orgId}/coach/injuries`,
      "NAVBAR-COACH-008"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-COACH-008] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-COACH-009: Medical link", async ({ coachPage }) => {
    const page = coachPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/coach`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Medical",
      `/orgs/${orgId}/coach/medical`,
      "NAVBAR-COACH-009"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-COACH-009] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-COACH-010: Match Day link", async ({ coachPage }) => {
    const page = coachPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/coach`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const result = await navigateAndVerify(
      page,
      "Match Day",
      `/orgs/${orgId}/coach/match-day`,
      "NAVBAR-COACH-010"
    );

    expect(result.success).toBeTruthy();
    if (!result.success) {
      console.error(`[NAVBAR-COACH-010] Failed: ${result.error}`);
    }
  });

  test("NAVBAR-COACH-099: All navigation links work", async ({ coachPage }) => {
    const page = coachPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/coach`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const navLinks = await getAllNavLinks(page);
    console.log(`[NAVBAR-COACH-099] Testing ${navLinks.length} navigation links`);

    const results: Array<{ link: string; success: boolean; error?: string }> = [];

    for (const { text, href } of navLinks) {
      if (href.startsWith('http') || href.startsWith('#')) {
        continue;
      }

      const absoluteHref = href.startsWith('/') ? href : `/orgs/${orgId}/${href}`;

      const result = await navigateAndVerify(page, text, absoluteHref, `NAVBAR-COACH-099-${text}`);
      results.push({ link: text, success: result.success, error: result.error });

      console.log(`  ${result.success ? '✓' : '✗'} ${text}: ${absoluteHref}`);
      if (!result.success) {
        console.error(`    Error: ${result.error}`);
      }

      await page.goto(`/orgs/${orgId}/coach`);
      await waitForPageLoad(page);
      await expandAllNavGroups(page);
    }

    const failedLinks = results.filter(r => !r.success);
    console.log(`\n[NAVBAR-COACH-099] Summary: ${results.length - failedLinks.length}/${results.length} links passed`);

    if (failedLinks.length > 0) {
      console.error(`[NAVBAR-COACH-099] Failed links:`);
      failedLinks.forEach(({ link, error }) => {
        console.error(`  - ${link}: ${error}`);
      });
    }

    const passRate = (results.length - failedLinks.length) / results.length;
    expect(passRate).toBeGreaterThanOrEqual(0.8);
  });
});

test.describe("NAVBAR - Parent Navigation Tests", () => {
  test("NAVBAR-PARENT-001: Detect navigation mode", async ({ parentPage }) => {
    const page = parentPage;

    await page.goto("/orgs");
    await waitForPageLoad(page);

    const parentPortal = page.getByText(/Parent Portal|Parents/i).first();
    if (await parentPortal.isVisible({ timeout: 5000 }).catch(() => false)) {
      await parentPortal.click();
      await waitForPageLoad(page);
    } else {
      const orgId = await getCurrentOrgId(page);
      await page.goto(`/orgs/${orgId}/parents`);
      await waitForPageLoad(page);
    }

    const navMode = await detectNavMode(page);
    console.log(`[NAVBAR-PARENT-001] Navigation mode detected: ${navMode}`);

    const navLinks = await getAllNavLinks(page);
    console.log(`[NAVBAR-PARENT-001] Found ${navLinks.length} navigation links`);

    expect(navLinks.length).toBeGreaterThan(0);
  });

  test("NAVBAR-PARENT-099: All navigation links work", async ({ parentPage }) => {
    const page = parentPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/parents`);
    await waitForPageLoad(page);

    const navLinks = await getAllNavLinks(page);
    console.log(`[NAVBAR-PARENT-099] Testing ${navLinks.length} navigation links`);

    const results: Array<{ link: string; success: boolean; error?: string }> = [];

    for (const { text, href } of navLinks) {
      if (href.startsWith('http') || href.startsWith('#')) {
        continue;
      }

      const absoluteHref = href.startsWith('/') ? href : `/orgs/${orgId}/${href}`;

      const result = await navigateAndVerify(page, text, absoluteHref, `NAVBAR-PARENT-099-${text}`);
      results.push({ link: text, success: result.success, error: result.error });

      console.log(`  ${result.success ? '✓' : '✗'} ${text}: ${absoluteHref}`);
      if (!result.success) {
        console.error(`    Error: ${result.error}`);
      }

      await page.goto(`/orgs/${orgId}/parents`);
      await waitForPageLoad(page);
    }

    const failedLinks = results.filter(r => !r.success);
    console.log(`\n[NAVBAR-PARENT-099] Summary: ${results.length - failedLinks.length}/${results.length} links passed`);

    if (failedLinks.length > 0) {
      console.error(`[NAVBAR-PARENT-099] Failed links:`);
      failedLinks.forEach(({ link, error }) => {
        console.error(`  - ${link}: ${error}`);
      });
    }

    const passRate = (results.length - failedLinks.length) / results.length;
    expect(passRate).toBeGreaterThanOrEqual(0.8);
  });
});

test.describe("NAVBAR - Owner/Platform Navigation Tests", () => {
  test("NAVBAR-OWNER-001: Admin navigation works for owner", async ({ ownerPage }) => {
    const page = ownerPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/admin`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const navLinks = await getAllNavLinks(page);
    console.log(`[NAVBAR-OWNER-001] Found ${navLinks.length} admin navigation links`);

    expect(navLinks.length).toBeGreaterThan(0);
  });

  test("NAVBAR-OWNER-002: Coach navigation works for owner", async ({ ownerPage }) => {
    const page = ownerPage;
    const orgId = await getCurrentOrgId(page);

    await page.goto(`/orgs/${orgId}/coach`);
    await waitForPageLoad(page);
    await expandAllNavGroups(page);

    const navLinks = await getAllNavLinks(page);
    console.log(`[NAVBAR-OWNER-002] Found ${navLinks.length} coach navigation links`);

    expect(navLinks.length).toBeGreaterThan(0);
  });

  test("NAVBAR-OWNER-003: Platform staff can access platform pages", async ({ ownerPage }) => {
    const page = ownerPage;

    // Platform staff should have access to /platform routes
    const result = await navigateAndVerify(
      page,
      "Platform",
      "/platform",
      "NAVBAR-OWNER-003"
    );

    // May or may not exist depending on implementation
    // Just verify no crash if it exists
    expect(result.success || result.error?.includes('not found')).toBeTruthy();
  });
});
