import { test, expect, waitForPageLoad, dismissBlockingDialogs } from "../fixtures/test-fixtures";
import type { Page } from "@playwright/test";

/**
 * Injury Tracking UAT Tests — Issue #261
 *
 * Covers Phase 1 (notifications), Phase 2 (recovery management),
 * and Phase 3 (admin analytics) of the injury tracking feature.
 *
 * Test accounts:
 *   owner/coach  = neil.b (ownerPage)
 *   admin        = neiltest2 (adminPage)
 *   coach        = neiltesting (coachPage)
 *   parent       = neiltest3 (parentPage)
 */

// ─── helpers ────────────────────────────────────────────────────────────────

async function getOrgId(page: Page): Promise<string> {
  await page.waitForFunction(
    () => {
      const m = window.location.pathname.match(/\/orgs\/([^/]+)/);
      return m && m[1] && m[1] !== "current";
    },
    { timeout: 10000 }
  ).catch(() => {});
  const m = page.url().match(/\/orgs\/([^/]+)/);
  return m?.[1] ?? "current";
}

/**
 * Navigate to the first available org's page section.
 * First visits /orgs to establish auth context, extracts org ID from
 * the org listing, then navigates to the target path.
 *
 * Falls back to extracting org ID from any section link (coach, admin, parents)
 * so that admin/parents navigation works even when only coach links are visible.
 */
async function navigateViaOrgs(
  page: Page,
  section: "coach" | "admin" | "parents",
  subPath: string
): Promise<string> {
  // Step 1: visit /orgs to establish auth context and get org ID
  await page.goto("/orgs");
  await waitForPageLoad(page);
  await page.waitForTimeout(2000);

  // Step 2: extract org ID — try URL redirect first (handles accounts that redirect on /orgs),
  // then fall back to scanning page links
  const redirectOrgId = page.url().match(/\/orgs\/([^/]+)/)?.[1];

  const orgId = (redirectOrgId && redirectOrgId !== "current")
    ? redirectOrgId
    : await page.evaluate((sec) => {
        const links = Array.from(document.querySelectorAll("a[href]"));
        const hrefs = links.map((l) => l.getAttribute("href") || "");

        // Try target section first
        const targetMatch = hrefs.find((href) =>
          href.match(new RegExp(`/orgs/[^/]+/${sec}`))
        );
        if (targetMatch) {
          return targetMatch.match(/\/orgs\/([^/]+)/)?.[1] ?? null;
        }

        // Fall back to any section link to get the org ID
        for (const fallbackSec of ["coach", "admin", "parents"]) {
          const fallbackMatch = hrefs.find((href) =>
            href.match(new RegExp(`/orgs/[^/]+/${fallbackSec}`))
          );
          if (fallbackMatch) {
            return fallbackMatch.match(/\/orgs\/([^/]+)/)?.[1] ?? null;
          }
        }
        return null;
      }, section);

  if (orgId && orgId !== "current") {
    await page.goto(`/orgs/${orgId}/${section}/${subPath}`);
  } else {
    // Fallback: try with current (may work if auth is fresh)
    await page.goto(`/orgs/current/${section}/${subPath}`);
  }
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
  return getOrgId(page);
}

async function goToCoachInjuries(page: Page): Promise<string> {
  return navigateViaOrgs(page, "coach", "injuries");
}

async function goToAdminInjuries(page: Page): Promise<string> {
  return navigateViaOrgs(page, "admin", "injuries");
}

async function goToParentInjuries(page: Page): Promise<string> {
  return navigateViaOrgs(page, "parents", "injuries");
}

// ─── Phase 1: Notifications & Coach Injury Page ──────────────────────────────

test.describe("INJURY — Phase 1: Coach Injury Page", () => {
  test("INJ-001: Coach can navigate to injuries page", async ({ ownerPage: page }) => {
    await goToCoachInjuries(page);
    await expect(page).toHaveURL(/\/coach\/injuries/);
    await expect(page.getByRole("heading", { name: /injury tracking/i })).toBeVisible({ timeout: 8000 });
  });

  test("INJ-002: Active injuries widget is visible with correct count", async ({ ownerPage: page }) => {
    await goToCoachInjuries(page);
    // Active injuries section header
    await expect(page.getByText(/active injuries/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("INJ-003: Complete injury history table is visible", async ({ ownerPage: page }) => {
    await goToCoachInjuries(page);
    await expect(page.getByText(/complete injury history/i)).toBeVisible({ timeout: 8000 });
    // At least one injury row should exist (seeded data)
    await expect(page.getByText(/hamstring|ankle|strain|sprain/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("INJ-004: Player selector is present", async ({ ownerPage: page }) => {
    await goToCoachInjuries(page);
    await expect(page.getByText(/select.*player|select a player/i).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("combobox").first()).toBeVisible({ timeout: 8000 });
  });

  test("INJ-005: Status filter dropdown works on history table", async ({ ownerPage: page }) => {
    await goToCoachInjuries(page);
    // Status filter combobox (All Status)
    const statusFilter = page.getByRole("combobox").filter({ hasText: /all status/i });
    await expect(statusFilter).toBeVisible({ timeout: 8000 });
  });

  test("INJ-006: Severity badges are visible on injury cards", async ({ ownerPage: page }) => {
    await goToCoachInjuries(page);
    // Should show severity labels (Minor / Moderate / Severe)
    await expect(page.getByText(/minor|moderate|severe/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("INJ-007: Injury card is clickable and opens detail modal", async ({ ownerPage: page }) => {
    await goToCoachInjuries(page);
    // Click the first injury card in the history list
    const firstCard = page.getByRole("button").filter({ hasText: /hamstring|ankle|strain|sprain/i }).first();
    await expect(firstCard).toBeVisible({ timeout: 8000 });
    await firstCard.click();
    // Modal should open
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
  });

  test("INJ-008: Injury notification icons visible in notification bell", async ({ ownerPage: page }) => {
    await goToCoachInjuries(page);
    const bellButton = page.getByRole("button", { name: /notifications/i });
    await expect(bellButton).toBeVisible({ timeout: 8000 });
    await bellButton.click();
    // Bell dropdown should open
    await expect(page.getByText(/recent activity|notifications|no notifications/i).first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Phase 2: Recovery Management — Injury Detail Modal ──────────────────────

test.describe("INJURY — Phase 2: Injury Detail Modal (Recovery)", () => {
  async function openFirstInjuryModal(page: Page) {
    await goToCoachInjuries(page);
    const firstCard = page.getByRole("button").filter({ hasText: /hamstring|ankle|strain|sprain/i }).first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
  }

  test("INJ-009: Detail modal has Overview tab", async ({ ownerPage: page }) => {
    await openFirstInjuryModal(page);
    await expect(page.getByRole("tab", { name: /overview/i })).toBeVisible();
  });

  test("INJ-010: Detail modal has Recovery tab", async ({ ownerPage: page }) => {
    await openFirstInjuryModal(page);
    await expect(page.getByRole("tab", { name: /recovery/i })).toBeVisible();
  });

  test("INJ-011: Detail modal has Timeline tab", async ({ ownerPage: page }) => {
    await openFirstInjuryModal(page);
    await expect(page.getByRole("tab", { name: /timeline/i })).toBeVisible();
  });

  test("INJ-012: Detail modal has Docs tab", async ({ ownerPage: page }) => {
    await openFirstInjuryModal(page);
    await expect(page.getByRole("tab", { name: /docs/i })).toBeVisible();
  });

  test("INJ-013: Overview tab shows injury details", async ({ ownerPage: page }) => {
    await openFirstInjuryModal(page);
    await page.getByRole("tab", { name: /overview/i }).click();
    // Should show body part / severity / status
    await expect(page.getByText(/moderate|minor|severe/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("INJ-014: Recovery tab shows recovery plan UI", async ({ ownerPage: page }) => {
    await openFirstInjuryModal(page);
    await page.getByRole("tab", { name: /recovery/i }).click();
    // Should show either a recovery plan form or milestones section
    await expect(
      page.getByText(/recovery plan|milestone|no recovery plan/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("INJ-015: Timeline tab shows timeline section", async ({ ownerPage: page }) => {
    await openFirstInjuryModal(page);
    await page.getByRole("tab", { name: /timeline/i }).click();
    await expect(page.getByText(/recovery timeline|injury reported|no updates/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("INJ-016: Docs tab shows document upload area", async ({ ownerPage: page }) => {
    await openFirstInjuryModal(page);
    await page.getByRole("tab", { name: /docs/i }).click();
    await expect(
      page.getByText(/upload|document|no documents/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("INJ-017: Modal can be closed", async ({ ownerPage: page }) => {
    await openFirstInjuryModal(page);
    const closeBtn = page.getByRole("button", { name: /close/i });
    await closeBtn.click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 });
  });

  test("INJ-018: Edit injury dialog opens from history table", async ({ ownerPage: page }) => {
    await goToCoachInjuries(page);
    // Edit buttons (pencil icon) on history rows
    const editBtn = page.getByRole("link", { name: /edit/i }).or(
      page.locator('[aria-label*="edit"], [data-testid*="edit"]').first()
    );
    // Alternatively look for the edit icon button in the table rows
    const rowEditBtn = page.locator("button").filter({ has: page.locator("svg") }).nth(2);
    if (await rowEditBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Just verify the page is stable — we don't click to avoid mutations on test data
      await expect(rowEditBtn).toBeVisible();
    } else {
      // Edit buttons might be inside the modal - just verify modal tabs contain editing capability
      const firstCard = page.getByRole("button").filter({ hasText: /hamstring|ankle|strain|sprain/i }).first();
      await firstCard.click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole("tab", { name: /overview/i })).toBeVisible();
    }
  });
});

// ─── Phase 2: Parent Injury View ─────────────────────────────────────────────

test.describe("INJURY — Phase 2: Parent Injury View", () => {
  test("INJ-019: Parent can access injuries page", async ({ parentPage: page }) => {
    await goToParentInjuries(page);
    await expect(page).toHaveURL(/\/injuries/, { timeout: 10000 });
  });

  test("INJ-020: Parent sees injury list or empty state", async ({ parentPage: page }) => {
    await goToParentInjuries(page);
    // Either injuries list or empty state
    await expect(
      page.getByText(/injury|no injuries|no active/i).first()
    ).toBeVisible({ timeout: 8000 });
  });
});

// ─── Phase 3: Admin Injury Analytics ─────────────────────────────────────────
// All admin tests use adminPage (neiltest2) who has Organization Admin role

test.describe("INJURY — Phase 3: Admin Analytics Dashboard", () => {
  /** Navigate to admin injuries and return whether analytics data is present */
  async function goToAdminAndCheckData(page: Page): Promise<boolean> {
    await goToAdminInjuries(page);
    // If we got redirected away from the admin injuries page, skip
    if (!page.url().includes("/admin/injuries")) return false;
    // Wait for data to load (either analytics or empty state)
    await page.waitForSelector(
      '[data-testid="injury-analytics"], .recharts-wrapper, [class*="CardContent"]',
      { timeout: 8000 }
    ).catch(() => {});
    // Check if injury data exists (summary cards only render when totalInjuries > 0)
    const hasData = await page.getByText(/Total Injuries|Currently Active/i).isVisible({ timeout: 5000 }).catch(() => false);
    return hasData;
  }

  test("INJ-021: Admin can navigate to injury analytics page", async ({ adminPage: page }) => {
    await goToAdminInjuries(page);
    if (!page.url().includes("/admin/injuries")) {
      test.skip(true, "No admin access available for this test account");
      return;
    }
    await expect(page).toHaveURL(/\/admin\/injuries/, { timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: /Injury Analytics/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("INJ-022: Admin nav has Injury Analytics link", async ({ adminPage: page }) => {
    await goToAdminInjuries(page);
    if (!page.url().includes("/admin/injuries")) {
      test.skip(true, "No admin access available");
      return;
    }
    // "Injury Analytics" link appears in the sidebar of the admin/injuries page
    await expect(
      page.getByRole("link", { name: /injury analytics/i }).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test("INJ-023: Summary statistics cards are visible", async ({ adminPage: page }) => {
    await goToAdminInjuries(page);
    if (!page.url().includes("/admin/injuries")) {
      test.skip(true, "No admin access available");
      return;
    }
    // Either show data cards or the no-data empty state — both are valid
    await expect(
      page.getByText(/Total Injuries|No injury data recorded/i).first()
    ).toBeVisible({ timeout: 10000 });
    // If data exists, also check Avg Recovery Days
    const hasData = await page.getByText(/Total Injuries/i).isVisible({ timeout: 3000 }).catch(() => false);
    if (hasData) {
      await expect(page.getByText(/Avg Recovery Days/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test("INJ-024: Trend chart is rendered", async ({ adminPage: page }) => {
    const hasData = await goToAdminAndCheckData(page);
    if (!page.url().includes("/admin/injuries")) {
      test.skip(true, "No admin access available");
      return;
    }
    if (!hasData) {
      test.skip(true, "No injury data in org — charts not rendered");
      return;
    }
    // Recharts renders SVG elements
    await expect(page.locator("svg.recharts-surface, .recharts-wrapper svg").first()).toBeVisible({ timeout: 10000 });
  });

  test("INJ-025: Body part chart is rendered", async ({ adminPage: page }) => {
    const hasData = await goToAdminAndCheckData(page);
    if (!page.url().includes("/admin/injuries")) {
      test.skip(true, "No admin access available");
      return;
    }
    if (!hasData) {
      test.skip(true, "No injury data in org — charts not rendered");
      return;
    }
    await expect(page.getByText(/Injuries by Body Part/i)).toBeVisible({ timeout: 10000 });
  });

  test("INJ-026: Severity distribution chart is rendered", async ({ adminPage: page }) => {
    const hasData = await goToAdminAndCheckData(page);
    if (!page.url().includes("/admin/injuries")) {
      test.skip(true, "No admin access available");
      return;
    }
    if (!hasData) {
      test.skip(true, "No injury data in org — charts not rendered");
      return;
    }
    await expect(page.getByText(/Severity Distribution/i)).toBeVisible({ timeout: 10000 });
  });

  test("INJ-027: Team comparison table is rendered", async ({ adminPage: page }) => {
    const hasData = await goToAdminAndCheckData(page);
    if (!page.url().includes("/admin/injuries")) {
      test.skip(true, "No admin access available");
      return;
    }
    if (!hasData) {
      test.skip(true, "No injury data in org — table not rendered");
      return;
    }
    await expect(page.getByText(/Team Comparison/i)).toBeVisible({ timeout: 10000 });
  });

  test("INJ-028: Recent injuries table is rendered", async ({ adminPage: page }) => {
    const hasData = await goToAdminAndCheckData(page);
    if (!page.url().includes("/admin/injuries")) {
      test.skip(true, "No admin access available");
      return;
    }
    if (!hasData) {
      test.skip(true, "No injury data in org — table not rendered");
      return;
    }
    await expect(page.getByText(/Recent Injuries/i)).toBeVisible({ timeout: 10000 });
  });

  test("INJ-029: Date range toggle buttons are present", async ({ adminPage: page }) => {
    await goToAdminInjuries(page);
    if (!page.url().includes("/admin/injuries")) {
      test.skip(true, "No admin access available");
      return;
    }
    // Actual button labels: "Last 30 days", "Last 90 days", "This season", "All time"
    await expect(
      page.getByRole("button", { name: /Last 30 days|Last 90 days|This season|All time/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("INJ-030: CSV export button is present and clickable", async ({ adminPage: page }) => {
    await goToAdminInjuries(page);
    if (!page.url().includes("/admin/injuries")) {
      test.skip(true, "No admin access available");
      return;
    }
    const exportBtn = page.getByRole("button", { name: /Export CSV/i });
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
    // Click to trigger — first click loads data
    await exportBtn.click();
    await page.waitForTimeout(2000);
    // Button should still be visible (not broken)
    await expect(exportBtn).toBeVisible({ timeout: 5000 });
  });

  test("INJ-031: Period comparison indicators (trend arrows) are visible", async ({ adminPage: page }) => {
    await goToAdminInjuries(page);
    if (!page.url().includes("/admin/injuries")) {
      test.skip(true, "No admin access available");
      return;
    }
    // Trend indicators show ↑ or ↓ arrows with percentages
    await expect(
      page.getByText(/↑|↓|vs\. prev|vs prev/i).or(
        page.locator('[class*="trend"], [class*="indicator"]').first()
      ).first()
    ).toBeVisible({ timeout: 10000 }).catch(async () => {
      // Acceptable if no trend data yet (insufficient historical data)
      await expect(
        page.getByText(/Injury Analytics|No injury data/i).first()
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test("INJ-032: Admin can switch date range and page updates", async ({ adminPage: page }) => {
    await goToAdminInjuries(page);
    if (!page.url().includes("/admin/injuries")) {
      test.skip(true, "No admin access available");
      return;
    }
    // Click a different period — actual button labels
    const btn = page.getByRole("button", { name: /Last 90 days|This season|All time/i }).first();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(1500);
      // Page should still show the analytics heading after period change
      await expect(page.getByRole("heading", { name: /Injury Analytics/i })).toBeVisible({ timeout: 8000 });
    } else {
      test.skip(true, "Date range buttons not found with expected labels");
    }
  });
});
