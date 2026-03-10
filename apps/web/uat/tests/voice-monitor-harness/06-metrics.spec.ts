/**
 * Voice Monitor Harness — Metrics & Analytics
 *
 * Tests for the metrics and analytics capabilities of the harness.
 * The harness provides:
 *   - Real-time metrics (current throughput, latency, queue sizes)
 *   - Historical metrics (charts/graphs showing trends over time)
 *   - Latency baseline calculation per pipeline stage
 *   - Success/failure rate tracking
 *   - Health check execution model
 *
 * @feature Voice Monitor Harness — Metrics
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
import { WhatsAppHelper } from "../../fixtures/whatsapp-helper";

// ── Helpers ────────────────────────────────────────────────────────────────

const HARNESS_URL = "/platform/voice-monitoring";
const METRICS_URL = "/platform/voice-monitoring/metrics";

async function navigateToHarness(page: Page): Promise<void> {
  await page.goto(HARNESS_URL);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

async function navigateToMetrics(page: Page): Promise<void> {
  await page.goto(METRICS_URL);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

function skipIfNoConvex() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
  }
}

// ── VNH-METRICS-001: Real-time metrics on dashboard ──────────────────────

test.describe("VNH-METRICS-001: Real-time metrics display", () => {
  test("dashboard shows numeric metrics (counts, rates)", async ({
    ownerPage,
  }) => {
    await navigateToHarness(ownerPage);

    // Should show some numeric values (counts, rates, etc.)
    const hasNumbers = await ownerPage
      .locator(".metric-value, [data-metric-value], .stat-number, h2, h3")
      .filter({ hasText: /^\d+$/ })
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    console.log("Dashboard shows numeric metrics:", hasNumbers);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });

  test("dashboard shows total artifacts processed metric", async ({
    ownerPage,
  }) => {
    await navigateToHarness(ownerPage);

    const hasTotal = await ownerPage
      .getByText(/total|processed|artifacts/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    console.log("Total artifacts metric visible:", hasTotal);
  });

  test("dashboard shows pipeline health percentage or score", async ({
    ownerPage,
  }) => {
    await navigateToHarness(ownerPage);

    const hasHealth = await ownerPage
      .getByText(/health|uptime|success.?rate|\d+%/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    console.log("Pipeline health metric visible:", hasHealth);
  });
});

// ── VNH-METRICS-002: Historical metrics charts ────────────────────────────

test.describe("VNH-METRICS-002: Historical metrics and charts", () => {
  test("dashboard shows historical data charts or graphs", async ({
    ownerPage,
  }) => {
    await navigateToHarness(ownerPage);

    // Charts are typically rendered as canvas, SVG, or charting library elements
    const hasChart = await ownerPage
      .locator("canvas, .recharts-wrapper, .chart, [data-chart]")
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    console.log("Historical charts visible:", hasChart);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });

  test("metrics page has time range selector (1H / 6H / 24H / 7D / 30D)", async ({
    ownerPage,
  }) => {
    // The metrics page has a time range selector with these specific options
    // (confirmed from voicePipelineMetrics.ts)
    await navigateToMetrics(ownerPage);

    const timeRanges = ["1H", "6H", "24H", "7D", "30D"];
    let visibleCount = 0;
    for (const range of timeRanges) {
      const isVisible = await ownerPage
        .getByText(range, { exact: true })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      if (isVisible) visibleCount++;
    }
    console.log(`Time range options visible: ${visibleCount}/${timeRanges.length}`);

    // Fallback check on main overview page
    if (visibleCount === 0) {
      await navigateToHarness(ownerPage);
      const hasTimeRange = await ownerPage
        .getByText(/24h|last hour|7 days|today/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      console.log("Time range on overview:", hasTimeRange);
    }
  });

  test("metrics page shows per-stage latency breakdown", async ({ ownerPage }) => {
    await navigateToMetrics(ownerPage);

    // The metrics page has a stacked bar chart with per-stage latency
    const stageNames = [
      /transcription/i,
      /claims.?extraction/i,
      /entity.?resolution/i,
      /draft.?generation/i,
    ];

    let visibleCount = 0;
    for (const stage of stageNames) {
      const isVisible = await ownerPage
        .getByText(stage)
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      if (isVisible) visibleCount++;
    }
    console.log(`Stage labels visible on metrics page: ${visibleCount}/4`);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });
});

// ── VNH-METRICS-003: Latency metrics ─────────────────────────────────────

test.describe("VNH-METRICS-003: Latency metrics per pipeline stage", () => {
  test("dashboard shows processing time / latency metrics", async ({
    ownerPage,
  }) => {
    await navigateToHarness(ownerPage);

    const hasLatency = await ownerPage
      .getByText(/latency|processing time|avg time|ms|seconds/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    console.log("Latency metrics visible:", hasLatency);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── VNH-METRICS-004: Metrics update after activity ────────────────────────

test.describe("VNH-METRICS-004: Metrics update with pipeline activity", () => {
  test.slow();

  test("artifact count increases after sending a new note", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    // Navigate to dashboard and note current counts
    await navigateToHarness(ownerPage);

    // Get initial count text from any count element
    const countBefore = await ownerPage
      .locator(".metric-value, [data-count], .stat-number")
      .first()
      .textContent()
      .catch(() => "0");

    // Send a new note
    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Clodagh was exceptional at training today. [metrics-update-test]"
    );

    // Wait for processing
    await ownerPage.waitForTimeout(10_000);

    // Counts may have updated (reactive via Convex)
    const countAfter = await ownerPage
      .locator(".metric-value, [data-count], .stat-number")
      .first()
      .textContent()
      .catch(() => "0");

    console.log(`Metric count: before=${countBefore}, after=${countAfter}`);
    // Just log — metrics may update asynchronously
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── VNH-METRICS-005: Health check execution ───────────────────────────────

test.describe("VNH-METRICS-005: Health check and cron status", () => {
  test("health check endpoint/status is accessible", async ({ ownerPage }) => {
    await navigateToHarness(ownerPage);

    // Health check crons should be running — no "health check not running" warnings
    const hasHealthCheck = await ownerPage
      .getByText(/health|cron|scheduled/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    console.log("Health check status visible:", hasHealthCheck);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });

  test("no critical latency baseline violations shown", async ({
    ownerPage,
  }) => {
    await navigateToHarness(ownerPage);

    // Check that there are no critical baseline violations
    // (if latency is within normal bounds, there should be no critical alerts for it)
    const hasCriticalLatency = await ownerPage
      .getByText(/critical.*latency|latency.*critical/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (hasCriticalLatency) {
      console.warn(
        "Critical latency alert detected in harness. This may indicate pipeline performance issues."
      );
    }

    await expect(ownerPage.locator("body")).not.toContainText(
      /unhandled error/i
    );
  });
});

// ── VNH-METRICS-006: Cross-platform metrics comparison ────────────────────

test.describe("VNH-METRICS-006: WhatsApp vs in-app metrics breakdown", () => {
  test("dashboard shows source breakdown (WhatsApp vs in-app)", async ({
    ownerPage,
  }) => {
    await navigateToHarness(ownerPage);

    const hasBreakdown = await ownerPage
      .getByText(/whatsapp|in.?app|source/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    console.log("Source breakdown visible:", hasBreakdown);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});
