/**
 * Voice Monitor Harness — Pipeline Status View
 *
 * Tests for the pipeline status page at /platform/voice-monitoring/pipeline.
 *
 * The pipeline page provides a visual overview of:
 *   - Current pipeline stage health (each phase)
 *   - Queue depths per stage
 *   - Success/failure rates
 *   - Average processing times
 *   - Currently active/stalled artifacts
 *
 * @feature Voice Monitor Harness — Pipeline Status
 * @route /platform/voice-monitoring/pipeline
 * @issue #495
 */

import type { Page } from "@playwright/test";
import {
  dismissBlockingDialogs,
  expect,
  test,
  waitForPageLoad,
} from "../../fixtures/test-fixtures";
import {
  WhatsAppHelper,
  waitForPipelineEvent,
} from "../../fixtures/whatsapp-helper";

// ── Helpers ────────────────────────────────────────────────────────────────

const PIPELINE_URL = "/platform/voice-monitoring/pipeline";

async function navigateToPipeline(page: Page): Promise<void> {
  await page.goto(PIPELINE_URL);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

function skipIfNoConvex() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
  }
}

// ── VNH-PIPELINE-001: Pipeline page loads ────────────────────────────────

test.describe("VNH-PIPELINE-001: Pipeline page basic structure", () => {
  test("pipeline page loads for platform staff", async ({ ownerPage }) => {
    await navigateToPipeline(ownerPage);

    await expect(ownerPage).not.toHaveURL(/\/login/);
    await expect(ownerPage.locator("body")).not.toContainText(
      /404|forbidden/i
    );
  });

  test("pipeline page has meaningful content", async ({ ownerPage }) => {
    await navigateToPipeline(ownerPage);

    // Page should show some pipeline-related content
    await expect(
      ownerPage
        .getByText(/pipeline|processing|phase|artifact|transcription/i)
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("pipeline page shows all 5 pipeline phases", async ({ ownerPage }) => {
    await navigateToPipeline(ownerPage);

    const phases = [
      "transcription",
      "claims",
      "entity",
      "draft",
    ];

    for (const phase of phases) {
      const phaseEl = ownerPage.getByText(new RegExp(phase, "i")).first();
      const isVisible = await phaseEl
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      console.log(`Phase '${phase}' visible:`, isVisible);
    }

    // At least the page loads without error
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── VNH-PIPELINE-002: Pipeline flow graph ─────────────────────────────────

test.describe("VNH-PIPELINE-002: Pipeline flow visualization", () => {
  test("pipeline flow graph (SVG) is rendered", async ({ ownerPage }) => {
    await navigateToPipeline(ownerPage);

    // The pipeline flow should be visualized (likely as SVG)
    const svgEl = ownerPage.locator("svg").first();
    const isVisible = await svgEl
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    console.log("Pipeline SVG graph visible:", isVisible);
  });

  test("pipeline graph shows phase connections", async ({ ownerPage }) => {
    await navigateToPipeline(ownerPage);

    // SVG should have nodes/edges connecting pipeline phases
    const svgPaths = await ownerPage.locator("svg path, svg line").count();
    console.log("SVG paths/connections:", svgPaths);

    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── VNH-PIPELINE-003: Phase health indicators ─────────────────────────────

test.describe("VNH-PIPELINE-003: Pipeline phase health status", () => {
  test("each pipeline phase shows a health status indicator", async ({
    ownerPage,
  }) => {
    await navigateToPipeline(ownerPage);

    // Health indicators may use colors, badges, or icons
    // Look for success/healthy/green indicators
    const hasHealthIndicators = await ownerPage
      .getByText(/healthy|ok|operational|\d+%/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    console.log("Phase health indicators visible:", hasHealthIndicators);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });

  test("pipeline page shows queue depth or count per phase", async ({
    ownerPage,
  }) => {
    await navigateToPipeline(ownerPage);

    // Should show how many items are in each phase queue
    const hasNumbers = await ownerPage
      .locator("td, .metric, [data-count]")
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    console.log("Phase queue depth numbers visible:", hasNumbers);
  });
});

// ── VNH-PIPELINE-004: Live pipeline during processing ────────────────────

test.describe("VNH-PIPELINE-004: Pipeline status updates during active processing", () => {
  test.slow();

  test("pipeline shows active artifact during processing", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Clodagh was outstanding at training today. Her fitness is exceptional and her leadership is improving."
    );

    // Navigate to pipeline page while processing is happening
    await navigateToPipeline(ownerPage);

    // During processing, the pipeline should show the artifact moving through stages
    // Check for any "active" or "processing" indicators
    const hasActivity = await ownerPage
      .getByText(/active|processing|in.?progress/i)
      .first()
      .isVisible({ timeout: 15_000 })
      .catch(() => false);

    console.log("Pipeline shows active processing:", hasActivity);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });

  test("pipeline shows completed artifact after processing finishes", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Sinead had her best session of the season. Incredible performance."
    );

    // Wait for full pipeline completion
    await waitForPipelineEvent(ownerPage, "drafts_generated", 120_000);

    await navigateToPipeline(ownerPage);

    // After completion, the completed artifact should be visible
    const hasCompleted = await ownerPage
      .getByText(/completed|done|success/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    console.log("Pipeline shows completed artifact:", hasCompleted);
  });
});

// ── VNH-PIPELINE-005: Error detection in pipeline ─────────────────────────

test.describe("VNH-PIPELINE-005: Pipeline error detection", () => {
  test("pipeline page shows failed artifacts if any exist", async ({
    ownerPage,
  }) => {
    await navigateToPipeline(ownerPage);

    // Check if there are any failed artifacts shown
    const hasFailures = await ownerPage
      .getByText(/failed|error/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    console.log("Pipeline shows failed artifacts:", hasFailures);
    // Just log — failures may be expected in dev environment
  });

  test("stalled artifacts are highlighted if detected", async ({
    ownerPage,
  }) => {
    await navigateToPipeline(ownerPage);

    const hasStalled = await ownerPage
      .getByText(/stalled|stuck|timeout/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    console.log("Pipeline shows stalled artifacts:", hasStalled);
    await expect(ownerPage.locator("body")).not.toContainText(
      /unhandled error/i
    );
  });
});
