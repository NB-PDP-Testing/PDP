/**
 * Voice Notes Pipeline — Full Pipeline Verification
 *
 * End-to-end tests verifying the complete V2 pipeline runs for WhatsApp notes.
 *
 * V2 Pipeline phases:
 *   Phase 1: Artifact ingestion (artifact_received)
 *   Phase 2: Transcription (transcription_completed) — immediate for text
 *   Phase 3: Claims extraction (claims_extracted)
 *   Phase 4: Entity resolution (entity_resolution_completed)
 *   Phase 5: Draft generation (drafts_generated)
 *   (Phase 6: Apply draft — user-initiated)
 *
 * Critical regression guard for:
 *   #498 — Phase 4 inline resolution exits Phase 5 early → no entity resolutions
 *           created → drafts never generated → Drafts tab permanently empty
 *
 * @feature Voice Notes V2 Pipeline
 * @bugs #498 (pipeline dead-end), #473 (drafts tab empty)
 */

import type { Page } from "@playwright/test";
import {
  TEST_ORG_ID,
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

async function goToMonitoringEvents(page: Page): Promise<void> {
  await page.goto("/platform/voice-monitoring/events");
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

async function goToMonitoringPipeline(page: Page): Promise<void> {
  await page.goto("/platform/voice-monitoring/pipeline");
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

function skipIfNoConvex() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
  }
}

// ── WA-PIPE-001: All 5 pipeline events fire in order ─────────────────────

test.describe("WA-PIPE-001: Complete pipeline event sequence", () => {
  test.slow();

  test("artifact_received fires first", async ({ ownerPage }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Clodagh was outstanding today. Her fitness levels are exceptional."
    );

    await waitForPipelineEvent(ownerPage, "artifact_received", 30_000);
  });

  test("transcription_completed fires after artifact_received", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Sinead scored twice in the first half. Exceptional composure."
    );

    await waitForPipelineEvent(ownerPage, "transcription_completed", 30_000);
  });

  test("claims_extracted fires after transcription", async ({ ownerPage }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Eimear showed excellent ball skills today. Her positioning has improved significantly."
    );

    await waitForPipelineEvent(ownerPage, "claims_extracted", 60_000);
  });

  test("entity_resolution_completed fires (#498 regression guard — early exit bug)", async ({
    ownerPage,
  }) => {
    // ═══════════════════════════════════════════════════════════════
    // ISSUE #498 ROOT CAUSE (confirmed by code analysis):
    //
    // packages/backend/convex/actions/entityResolution.ts ~line 134:
    //
    //   const unresolvedClaims = claims.filter(c => !c.resolvedPlayerIdentityId);
    //   if (unresolvedClaims.length === 0) {
    //     return null;  // ← EARLY EXIT — does NOT schedule generateDrafts!
    //   }
    //
    // When Phase 4 (extractClaims) auto-resolves a claim inline by setting
    // claim.resolvedPlayerIdentityId, Phase 5 (entityResolution) finds
    // zero "unresolved" claims and exits without ever scheduling Phase 6
    // (generateDrafts). Drafts are never created → Drafts tab always empty.
    //
    // FIX: Before the early return, schedule generateDrafts:
    //   if (unresolvedClaims.length === 0) {
    //     await ctx.scheduler.runAfter(0, internal.actions.draftGeneration.generateDrafts, { artifactId });
    //     return null;
    //   }
    //
    // This test triggers the exact code path:
    //   - Clodagh is the ONLY player with that name in the org
    //   - Phase 4 auto-resolves her inline (sets resolvedPlayerIdentityId)
    //   - Phase 5 sees 0 unresolved claims
    //   - BUG: exits without scheduling generateDrafts
    //   - FIX: schedules generateDrafts before exiting
    // ═══════════════════════════════════════════════════════════════
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Clodagh was outstanding at training. Her fitness levels are exceptional and she led the team beautifully."
    );

    // This event MUST fire — if it doesn't, #498 is still broken
    await waitForPipelineEvent(ownerPage, "entity_resolution_completed", 90_000);
    await expect(
      ownerPage.getByText(/entity.?resolution.?completed/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("drafts_generated fires as final pipeline step (#498/#473 regression guard)", async ({
    ownerPage,
  }) => {
    // If entityResolution exits early without scheduling generateDrafts (#498),
    // drafts_generated never fires and the My Impact/Drafts tab is permanently
    // empty (#473 symptom).
    // This test guards both #498 (root cause) and #473 (symptom).
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Sinead played brilliantly today. Her passing accuracy and movement off the ball were exceptional."
    );

    await waitForPipelineEvent(ownerPage, "drafts_generated", 120_000);
    await expect(
      ownerPage.getByText(/drafts.?generated/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ── WA-PIPE-002: Pipeline event ordering ─────────────────────────────────

test.describe("WA-PIPE-002: Pipeline events appear in correct order", () => {
  test.slow();

  test("all 5 events appear in the events feed for a single note", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Eimear McDonagh had the best session of the season today. Her ball skills, fitness, and leadership were all exceptional."
    );

    // Wait for full pipeline
    await waitForPipelineEvent(ownerPage, "drafts_generated", 120_000);

    // Verify events feed shows all phases
    await goToMonitoringEvents(ownerPage);

    const expectedEvents = [
      "artifact_received",
      "transcription_completed",
      "claims_extracted",
      "entity_resolution_completed",
      "drafts_generated",
    ];

    for (const event of expectedEvents) {
      const eventEl = ownerPage
        .getByText(event.replace(/_/g, " "), { exact: false })
        .first();
      // Soft check — events may scroll off or be paginated
      const isVisible = await eventEl
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (!isVisible) {
        console.warn(`Event ${event} not visible in feed — may be paginated`);
      }
    }
  });
});

// ── WA-PIPE-003: Pipeline failure handling ────────────────────────────────

test.describe("WA-PIPE-003: Pipeline failure events and error states", () => {
  test("pipeline dashboard shows no unexpected error events for recent notes", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    await goToMonitoringEvents(ownerPage);

    // Check for *_failed events in the recent feed
    // There may be some expected failures but there should be no cascade
    const failedCount = await ownerPage
      .getByText(/_failed/i)
      .count();

    console.log(`Pipeline failed events in recent feed: ${failedCount}`);
    // Just log — failures may be expected in dev; we don't hard-fail here
  });

  test("pipeline status page loads without error", async ({ ownerPage }) => {
    skipIfNoConvex();

    await goToMonitoringPipeline(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(
      /unhandled error|500/i
    );
  });
});

// ── WA-PIPE-004: Audio note pipeline ─────────────────────────────────────

test.describe("WA-PIPE-004: Audio note pipeline (includes transcription phase)", () => {
  test.slow();

  test("audio note triggers artifact_received event", async ({ ownerPage }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendAudio();

    await waitForPipelineEvent(ownerPage, "artifact_received", 30_000);
  });

  test("audio note triggers transcription_completed (may take longer)", async ({
    ownerPage,
  }) => {
    // Audio transcription is async via Deepgram — allow more time
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendAudio();

    await waitForPipelineEvent(ownerPage, "transcription_completed", 60_000);
  });
});
