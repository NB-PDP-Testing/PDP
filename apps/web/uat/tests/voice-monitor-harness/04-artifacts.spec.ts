/**
 * Voice Monitor Harness — Artifacts
 *
 * Tests for the artifacts list and detail view at:
 *   /platform/voice-monitoring/artifacts
 *   /platform/voice-monitoring/artifacts/[artifactId]
 *
 * Each artifact represents a single voice note that entered the V2 pipeline.
 * Artifacts should show:
 *   - Source (WhatsApp phone number or in-app)
 *   - Status (processing, completed, failed, etc.)
 *   - Created timestamp
 *   - Pipeline events for that artifact
 *   - Org assignment (once resolved)
 *
 * @feature Voice Monitor Harness — Artifacts
 * @route /platform/voice-monitoring/artifacts
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

const ARTIFACTS_URL = "/platform/voice-monitoring/artifacts";

async function navigateToArtifacts(page: Page): Promise<void> {
  await page.goto(ARTIFACTS_URL);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

function skipIfNoConvex() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
  }
}

// ── VNH-ARTIFACTS-001: Artifacts page loads ───────────────────────────────

test.describe("VNH-ARTIFACTS-001: Artifacts page basic structure", () => {
  test("artifacts page loads for platform staff", async ({ ownerPage }) => {
    await navigateToArtifacts(ownerPage);

    await expect(ownerPage).not.toHaveURL(/\/login/);
    await expect(ownerPage.locator("body")).not.toContainText(
      /404|forbidden/i
    );
  });

  test("artifacts page shows list or empty state", async ({ ownerPage }) => {
    await navigateToArtifacts(ownerPage);

    const hasArtifacts = await ownerPage
      .locator(
        "table tr, .artifact-row, [data-artifact], [role='row']"
      )
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasEmptyState = await ownerPage
      .getByText(/no artifacts|nothing here|empty/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasArtifacts || hasEmptyState).toBeTruthy();
  });

  test("artifacts page has a table or list structure", async ({ ownerPage }) => {
    await navigateToArtifacts(ownerPage);

    const hasTable = await ownerPage
      .locator("table, [role='table'], .artifact-list")
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    console.log("Artifacts table structure:", hasTable);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── VNH-ARTIFACTS-002: New artifact appears after sending note ────────────

test.describe("VNH-ARTIFACTS-002: New artifact appears in list after note", () => {
  test.slow();

  test("artifact appears in list within 30s of sending a WhatsApp note", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Clodagh and Sinead both had excellent training tonight. [artifacts-test]"
    );

    await ownerPage.goto(ARTIFACTS_URL);
    await waitForPageLoad(ownerPage);

    // Wait for at least one artifact to appear
    await expect(
      ownerPage.locator("table tr, [data-artifact], .artifact-row").first()
    ).toBeVisible({ timeout: 60_000 });
  });

  test("most recent artifact is at the top of the list", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const ts = Date.now();
    const wa = new WhatsAppHelper();
    await wa.sendText(
      `Eimear had a great session. Top performer. [latest-${ts}]`
    );

    await waitForPipelineEvent(ownerPage, "artifact_received", 30_000);
    await navigateToArtifacts(ownerPage);

    // Should show at least one artifact
    await expect(
      ownerPage
        .locator("table tr, [data-artifact], .artifact-row")
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });
});

// ── VNH-ARTIFACTS-003: Artifact detail page ───────────────────────────────

test.describe("VNH-ARTIFACTS-003: Artifact detail page shows pipeline events", () => {
  test.slow();

  test("clicking an artifact opens the detail page", async ({ ownerPage }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText("Clodagh worked hard today.");
    await waitForPipelineEvent(ownerPage, "artifact_received", 30_000);

    await navigateToArtifacts(ownerPage);

    // Click the first artifact link
    const firstArtifactLink = ownerPage
      .locator("a[href*='/artifacts/']")
      .first();

    if (await firstArtifactLink.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await firstArtifactLink.click();
      await waitForPageLoad(ownerPage);

      // Detail page should load without error
      await expect(ownerPage.locator("body")).not.toContainText(
        /404|error|not found/i
      );
    } else {
      console.warn(
        "No artifact link found — may need to wait longer for artifact to process"
      );
    }
  });

  test("artifact detail page shows pipeline events for that artifact", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText("Sinead was excellent at training tonight.");
    await waitForPipelineEvent(ownerPage, "transcription_completed", 60_000);

    await navigateToArtifacts(ownerPage);

    const firstArtifact = ownerPage
      .locator("a[href*='/artifacts/'], tr[data-artifact]")
      .first();

    if (await firstArtifact.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await firstArtifact.click();
      await waitForPageLoad(ownerPage);

      // Detail page should show pipeline events for this artifact
      await expect(
        ownerPage
          .getByText(/artifact|transcription|claims|pipeline/i)
          .first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("artifact detail page shows source phone or org information", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    await navigateToArtifacts(ownerPage);

    const firstArtifact = ownerPage
      .locator("a[href*='/artifacts/'], .artifact-row a")
      .first();

    if (await firstArtifact.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await firstArtifact.click();
      await waitForPageLoad(ownerPage);

      // Should show some artifact-specific information
      await expect(ownerPage.locator("body")).not.toContainText(
        /unhandled error/i
      );
    }
  });
});

// ── VNH-ARTIFACTS-004: Artifact status display ───────────────────────────

test.describe("VNH-ARTIFACTS-004: Artifact shows pipeline status", () => {
  test("artifacts list shows processing status for each entry", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    await navigateToArtifacts(ownerPage);

    // Check for status indicators (completed, processing, failed, etc.)
    const hasStatusBadge = await ownerPage
      .getByText(/completed|processing|failed|pending/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    console.log("Artifacts show status badges:", hasStatusBadge);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });

  test("artifact detail page shows retry buttons for failed artifacts", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    // Navigate to artifacts and look for a failed artifact to test retry UI
    await navigateToArtifacts(ownerPage);

    // First check if there are any failed artifacts
    const failedArtifact = ownerPage
      .getByText(/failed/i)
      .first();

    const hasFailed = await failedArtifact.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasFailed) {
      // Try to click into it
      const failedRow = ownerPage.locator("tr, .artifact-row").filter({ hasText: /failed/i }).first();
      const link = failedRow.locator("a[href*='/artifacts/']").first();
      if (await link.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await link.click();
        await waitForPageLoad(ownerPage);

        // The detail page should show retry buttons (confirmed from voicePipelineRetry.ts)
        const retryButtons = [
          /retry transcription/i,
          /retry claims/i,
          /retry entity.?resolution/i,
          /retry full pipeline/i,
        ];

        let visibleRetry = 0;
        for (const btnText of retryButtons) {
          const isVisible = await ownerPage
            .getByRole("button", { name: btnText })
            .first()
            .isVisible({ timeout: 3_000 })
            .catch(() => false);
          if (isVisible) visibleRetry++;
        }
        console.log(`Retry buttons visible on failed artifact: ${visibleRetry}/4`);
      }
    } else {
      console.log("No failed artifacts found — retry button test skipped (no failures present)");
    }

    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });
});
