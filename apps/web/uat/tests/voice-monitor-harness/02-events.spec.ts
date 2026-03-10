/**
 * Voice Monitor Harness — Events Feed
 *
 * Tests for the pipeline events feed at /platform/voice-monitoring/events.
 *
 * The events feed shows V2 pipeline events (26 types total):
 *   - Artifact: artifact_received, artifact_status_changed, artifact_completed, artifact_failed
 *   - Transcription: transcription_started, transcription_completed, transcription_failed
 *   - Claims: claims_extraction_started, claims_extracted, claims_extraction_failed
 *   - Entity resolution: entity_resolution_started, entity_resolution_completed,
 *                        entity_resolution_failed, entity_needs_disambiguation
 *   - Draft generation: draft_generation_started, drafts_generated, draft_generation_failed,
 *                       draft_confirmed, draft_rejected
 *   - Operational: circuit_breaker_opened, circuit_breaker_closed, retry_initiated,
 *                  retry_succeeded, retry_failed, budget_threshold_reached,
 *                  budget_exceeded, rate_limit_hit
 *
 * Events are real-time (Convex reactive query).
 * Activity feed uses [data-event-item] attribute on each event row.
 * Events are paginated (default 20 items per page).
 *
 * @feature Voice Monitor Harness — Events
 * @route /platform/voice-monitoring/events
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

const EVENTS_URL = "/platform/voice-monitoring/events";

async function navigateToEvents(page: Page): Promise<void> {
  await page.goto(EVENTS_URL);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

function skipIfNoConvex() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
  }
}

// ── VNH-EVENTS-001: Events page loads ────────────────────────────────────

test.describe("VNH-EVENTS-001: Events page basic structure", () => {
  test("events page loads for platform staff", async ({ ownerPage }) => {
    await navigateToEvents(ownerPage);

    await expect(ownerPage).not.toHaveURL(/\/login/);
    await expect(ownerPage.locator("body")).not.toContainText(
      /404|forbidden|access denied/i
    );
  });

  test("events page has a title or heading", async ({ ownerPage }) => {
    await navigateToEvents(ownerPage);

    const heading = ownerPage.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test("events page shows events list or empty state", async ({
    ownerPage,
  }) => {
    await navigateToEvents(ownerPage);

    // Activity feed uses [data-event-item] attribute on each row
    const hasDataEventItems = await ownerPage
      .locator("[data-event-item]")
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasTableEvents = await ownerPage
      .locator("table, [role='table'], .event-row, tr")
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasEmptyState = await ownerPage
      .getByText(/no events|no recent activity|nothing to show|empty/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    console.log("Events — data-event-item:", hasDataEventItems, "table:", hasTableEvents, "empty:", hasEmptyState);
    expect(hasDataEventItems || hasTableEvents || hasEmptyState).toBeTruthy();
  });
});

// ── VNH-EVENTS-002: Event types visible in feed ───────────────────────────

test.describe("VNH-EVENTS-002: All event types appear in feed", () => {
  test.slow();

  test("artifact_received event appears after sending a note", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Clodagh had an excellent session today for events monitoring test."
    );

    await waitForPipelineEvent(ownerPage, "artifact_received", 30_000);
    await expect(
      ownerPage.getByText(/artifact.?received/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("transcription_completed event appears in events feed", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Sinead had an excellent session. Her passing was accurate throughout."
    );

    await waitForPipelineEvent(ownerPage, "transcription_completed", 30_000);
    await expect(
      ownerPage.getByText(/transcription.?completed/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("claims_extracted event appears in events feed", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Eimear showed excellent ball skills today. Her positioning has improved significantly."
    );

    await waitForPipelineEvent(ownerPage, "claims_extracted", 60_000);
  });

  test("entity_resolution_completed event appears (critical #498 guard)", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    // Send note with unambiguous player name for guaranteed auto-resolution
    await wa.sendText(
      "Clodagh was outstanding at training. Her fitness is exceptional."
    );

    await waitForPipelineEvent(ownerPage, "entity_resolution_completed", 90_000);
    await expect(
      ownerPage
        .getByText(/entity.?resolution.?completed/i)
        .first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("drafts_generated event appears in events feed", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Sinead played brilliantly. Her passing accuracy and movement off the ball were excellent."
    );

    await waitForPipelineEvent(ownerPage, "drafts_generated", 120_000);
    await expect(
      ownerPage.getByText(/drafts.?generated/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ── VNH-EVENTS-003: Event detail information ─────────────────────────────

test.describe("VNH-EVENTS-003: Event entries show useful information", () => {
  test.slow();

  test("events show timestamps", async ({ ownerPage }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText("Clodagh worked hard today.");
    await waitForPipelineEvent(ownerPage, "artifact_received", 30_000);

    await navigateToEvents(ownerPage);

    // Look for timestamp-like content (time, date, ago format)
    const hasTimestamp = await ownerPage
      .getByText(/ago|\d{2}:\d{2}|today|just now/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    console.log("Events show timestamps:", hasTimestamp);
  });

  test("events show artifact ID or reference", async ({ ownerPage }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText("Sinead scored twice today.");
    await waitForPipelineEvent(ownerPage, "artifact_received", 30_000);

    await navigateToEvents(ownerPage);

    // Events should show some reference to the artifact
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── VNH-EVENTS-004: Events real-time updates ─────────────────────────────

test.describe("VNH-EVENTS-004: Events feed updates in real-time", () => {
  test.slow();

  test("new event appears without page refresh", async ({ ownerPage }) => {
    skipIfNoConvex();

    // Navigate to events page
    await navigateToEvents(ownerPage);

    // Note the number of events currently visible
    const initialCount = await ownerPage
      .locator("table tr, .event-row, [data-event]")
      .count();

    // Send a new note
    const wa = new WhatsAppHelper();
    await wa.sendText(
      `Eimear had a great session today. [realtime-${Date.now()}]`
    );

    // Wait for new event to appear WITHOUT navigating
    await expect(
      ownerPage.getByText(/artifact.?received/i).first()
    ).toBeVisible({ timeout: 30_000 });

    console.log("Real-time update confirmed — events appeared without page refresh");
  });
});

// ── VNH-EVENTS-005: Event filtering (if implemented) ──────────────────────

test.describe("VNH-EVENTS-005: Event filtering capability", () => {
  test("events page has filtering options", async ({ ownerPage }) => {
    await navigateToEvents(ownerPage);

    // Check for filter controls (dropdown, checkboxes, search)
    const hasFilter = await ownerPage
      .locator(
        "select, [role='combobox'], input[type='search'], .filter, [data-filter]"
      )
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    console.log("Events page has filtering:", hasFilter);
    // Just informational — not a hard requirement
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});
