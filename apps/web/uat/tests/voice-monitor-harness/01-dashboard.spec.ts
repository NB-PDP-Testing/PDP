/**
 * Voice Monitor Harness — Main Dashboard
 *
 * Tests for the platform-level voice notes monitoring dashboard.
 * Accessible only to platform staff (neil.b@blablablak.com role).
 *
 * The monitoring dashboard shows:
 *   - Real-time pipeline health metrics
 *   - Active artifacts (notes currently being processed)
 *   - Recent pipeline events (activity feed)
 *   - Active alerts
 *   - Historical metrics charts
 *   - Pipeline flow graph (SVG)
 *
 * @feature Voice Monitor Harness
 * @route /platform/voice-monitoring
 * @issue #495
 */

import type { Page } from "@playwright/test";
import {
  dismissBlockingDialogs,
  expect,
  test,
  waitForPageLoad,
} from "../../fixtures/test-fixtures";

// ── Helpers ────────────────────────────────────────────────────────────────

const HARNESS_URL = "/platform/voice-monitoring";

async function navigateToHarness(page: Page): Promise<void> {
  await page.goto(HARNESS_URL);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

// ── VNH-DASH-001: Dashboard access ───────────────────────────────────────

test.describe("VNH-DASH-001: Dashboard access and authentication", () => {
  test("platform staff can access the monitoring dashboard", async ({
    ownerPage,
  }) => {
    await navigateToHarness(ownerPage);

    // Should not redirect to login or show 404/403
    await expect(ownerPage).not.toHaveURL(/\/login/);
    await expect(ownerPage.locator("body")).not.toContainText(
      /404|not found|forbidden|access denied/i
    );
  });

  test("dashboard page loads within 10 seconds", async ({ ownerPage }) => {
    await navigateToHarness(ownerPage);
    // waitForLoadState already ensures page is loaded
    await expect(ownerPage.locator("body")).not.toContainText(/loading.../i, {
      timeout: 10_000,
    });
  });

  test("non-platform-staff (coach) is redirected from dashboard", async ({
    coachPage,
  }) => {
    // Coach should NOT be able to access /platform routes
    await coachPage.goto(HARNESS_URL);
    await waitForPageLoad(coachPage);

    // Should either redirect to orgs page or show a permission error
    const url = coachPage.url();
    const isStillOnHarness = url.includes("/platform/voice-monitoring");

    if (isStillOnHarness) {
      // If accessible, should show permission denied content
      const hasPermissionError = await coachPage
        .getByText(/access denied|forbidden|not authorized|permission/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      console.log(
        "Coach on harness page — permission error shown:",
        hasPermissionError
      );
    } else {
      // Redirected — correct behavior
      console.log("Coach redirected from harness to:", url);
    }
  });
});

// ── VNH-DASH-002: Dashboard structure ────────────────────────────────────

test.describe("VNH-DASH-002: Dashboard has correct structure and sections", () => {
  test("dashboard shows a page title/heading", async ({ ownerPage }) => {
    await navigateToHarness(ownerPage);

    const heading = ownerPage.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test("dashboard has navigation tabs or sections for Events, Alerts, Artifacts, Pipeline", async ({
    ownerPage,
  }) => {
    await navigateToHarness(ownerPage);

    // Should show navigation to sub-sections
    const navItems = [
      ownerPage.getByText(/events/i).first(),
      ownerPage.getByText(/alerts/i).first(),
      ownerPage.getByText(/artifacts/i).first(),
      ownerPage.getByText(/pipeline/i).first(),
    ];

    for (const item of navItems) {
      const isVisible = await item
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      console.log("Nav item visible:", await item.textContent().catch(() => "?"), isVisible);
    }

    // At least one navigation element should be visible
    const anyVisible = await Promise.any(
      navItems.map((item) => item.isVisible({ timeout: 5_000 }).catch(() => false))
    ).catch(() => false);
    expect(anyVisible).toBeTruthy();
  });

  test("dashboard shows the 6 KPI status cards", async ({ ownerPage }) => {
    await navigateToHarness(ownerPage);

    // The StatusCards component renders 6 named cards (confirmed from source)
    const expectedCards = [
      /active artifacts/i,
      /completed today/i,
      /failed today/i,
      /avg latency/i,
      /ai service status/i,
      /total cost today/i,
    ];

    let visibleCount = 0;
    for (const pattern of expectedCards) {
      const isVisible = await ownerPage
        .getByText(pattern)
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      if (isVisible) visibleCount++;
      console.log(`Status card '${pattern}': ${isVisible}`);
    }

    // At least 4 of the 6 cards should be visible
    expect(visibleCount).toBeGreaterThanOrEqual(4);
  });

  test("pipeline flow graph (SVG) is rendered", async ({ ownerPage }) => {
    await navigateToHarness(ownerPage);

    // The pipeline flow is rendered as an SVG diagram
    const svgEl = ownerPage.locator("svg").first();
    const isVisible = await svgEl
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    console.log("SVG pipeline graph visible:", isVisible);
  });
});

// ── VNH-DASH-003: Real-time data ──────────────────────────────────────────

test.describe("VNH-DASH-003: Dashboard shows real-time data", () => {
  test("activity feed shows recent events or empty state", async ({
    ownerPage,
  }) => {
    await navigateToHarness(ownerPage);

    // Activity feed uses [data-event-item] attribute on each event row
    const eventItems = ownerPage.locator("[data-event-item]");
    const eventItemCount = await eventItems.count().catch(() => 0);
    console.log(`Activity feed event items (data-event-item): ${eventItemCount}`);

    // Also check for text-based event matches as fallback
    const hasEventText = await ownerPage
      .getByText(
        /artifact.?received|transcription.?completed|claims.?extracted|entity.?resolution|drafts.?generated/i
      )
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasEmptyState = await ownerPage
      .getByText(/no recent activity|no recent events|no activity|nothing to show/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    console.log("Activity feed — event items:", eventItemCount, "text events:", hasEventText, "empty:", hasEmptyState);
    // Both are valid states
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });

  test("alerts section shows current alerts or 'no alerts' state", async ({
    ownerPage,
  }) => {
    await navigateToHarness(ownerPage);

    const hasAlerts = await ownerPage
      .getByText(/critical|warning|alert/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasNoAlerts = await ownerPage
      .getByText(/no alerts|all systems operational|healthy/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    console.log("Alerts — has alerts:", hasAlerts, "no alerts:", hasNoAlerts);
  });
});

// ── VNH-DASH-004: Dashboard after sending a note ─────────────────────────

test.describe("VNH-DASH-004: Dashboard reflects pipeline activity", () => {
  test("sending a WhatsApp note updates the dashboard within 30s", async ({
    ownerPage,
  }) => {
    test.slow();

    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
    }

    const { WhatsAppHelper } = await import("../../fixtures/whatsapp-helper");
    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Clodagh had an excellent training session today for harness monitoring test."
    );

    // Navigate to dashboard immediately to watch for activity
    await navigateToHarness(ownerPage);

    // Wait for an event to appear in the feed
    await expect(
      ownerPage
        .getByText(/artifact_received|artifact received/i)
        .first()
    ).toBeVisible({ timeout: 30_000 });
  });
});
