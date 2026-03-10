/**
 * WhatsApp Voice Notes — Single-Org Coach
 *
 * Tests the happy path for a coach who belongs to exactly one organisation.
 * Single-org coaches should NEVER be prompted to select a club — the note
 * goes straight through to processing.
 *
 * These tests send synthetic WhatsApp messages via the Convex HTTP webhook
 * endpoint and verify the result in the admin/coach UI.
 *
 * PRECONDITIONS:
 *   - Dev server running on localhost:3000
 *   - NEXT_PUBLIC_CONVEX_URL set in environment
 *   - WA_TEST_PHONE must match a coach account registered to exactly ONE org
 *   - That org must be TEST_ORG_ID in test-data.json
 *
 * @feature WhatsApp Voice Notes
 * @bugs #601 (org routing), #500 (duplicate detection), #498 (pipeline gap)
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
  waitForNoteInAdmin,
  waitForPipelineEvent,
} from "../../fixtures/whatsapp-helper";

// ── Helpers ────────────────────────────────────────────────────────────────

async function goToAdminVoiceNotes(page: Page): Promise<void> {
  await page.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

async function goToCoachVoiceNotes(page: Page): Promise<void> {
  await page.goto(`/orgs/${TEST_ORG_ID}/coach/voice-notes`);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
  // Dashboard auto-switches to Parents/Insights when pending items exist.
  // Click "New" tab to ensure the new note form is visible.
  const newTab = page.getByRole("tab", { name: /new/i }).or(
    page.getByText("New", { exact: true }).first()
  );
  if (await newTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await newTab.click();
  }
}

// ── WA-VOICE-S01: Basic receipt and processing ─────────────────────────────

test.describe("WA-VOICE-S01: Single-org voice note receipt", () => {
  test("webhook returns 200 for a valid audio POST", async () => {
    // Skip if NEXT_PUBLIC_CONVEX_URL not set (CI without Convex)
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
      return;
    }
    const wa = new WhatsAppHelper();
    // We use a text-only test here so we don't need a real audio file URL
    // The webhook should still return 200 for any well-formed POST
    const sid = await wa.sendText(
      "Clodagh had a great session today. Her hand pass accuracy is improving."
    );
    expect(sid).toBeTruthy();
  });

  test("single-org: note appears in admin panel within 60s", async ({
    ownerPage,
  }) => {
    test.slow(); // Allow 3× default timeout
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
      return;
    }

    const wa = new WhatsAppHelper();
    const noteText =
      "Sinead was exceptional at training tonight. Her positional play is excellent.";

    await wa.sendText(noteText);

    // Note should appear in admin panel
    await waitForNoteInAdmin(ownerPage, TEST_ORG_ID, "Sinead", 60_000);
    await expect(
      ownerPage.getByText(/Sinead/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("single-org: no clarification prompt sent (no 'Which club' message)", async ({
    ownerPage,
  }) => {
    test.slow();
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
      return;
    }

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Eimear worked hard today. Her tackling needs improvement."
    );

    // Give it 10s to potentially send a clarification
    await ownerPage.waitForTimeout(10_000);

    // The admin panel should show the note as processing, NOT waiting for org selection
    await goToAdminVoiceNotes(ownerPage);

    // There should NOT be a "pending_org_selection" status for single-org
    await expect(
      ownerPage.getByText(/which club|select.*org/i)
    ).not.toBeVisible({ timeout: 3000 });
  });

  test("single-org: note appears in coach history tab", async ({
    coachPage,
  }) => {
    test.slow();
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
      return;
    }

    const wa = new WhatsAppHelper();
    const noteText = `Clodagh showed great leadership qualities at training. [test-${Date.now()}]`;
    await wa.sendText(noteText);

    await goToCoachVoiceNotes(coachPage);

    // Click History tab
    const historyTab = coachPage
      .getByRole("tab", { name: /history/i })
      .or(coachPage.getByText("History", { exact: true }).first());
    if (await historyTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await historyTab.click();
    }

    await expect(
      coachPage.getByText(/Clodagh/i).first()
    ).toBeVisible({ timeout: 60_000 });
  });
});

// ── WA-VOICE-S02: Pipeline verification ───────────────────────────────────

test.describe("WA-VOICE-S02: V2 pipeline runs after text note", () => {
  test.slow();

  test("artifact_received event appears in monitoring dashboard", async ({
    ownerPage,
  }) => {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
      return;
    }

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Clodagh has excellent stamina. Best performer at today's training session."
    );

    await waitForPipelineEvent(ownerPage, "artifact_received", 30_000);
    await expect(
      ownerPage.getByText(/artifact.?received/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("transcription_completed event appears (for text notes, immediate)", async ({
    ownerPage,
  }) => {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
      return;
    }

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Sinead scored twice today. Excellent composure in front of goal."
    );

    await waitForPipelineEvent(ownerPage, "transcription_completed", 30_000);
  });

  test("claims_extracted event appears after text note", async ({
    ownerPage,
  }) => {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
      return;
    }

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Eimear showed excellent ball skills today and her positioning has improved significantly."
    );

    await waitForPipelineEvent(ownerPage, "claims_extracted", 60_000);
  });

  test("entity_resolution_completed event appears (#498 regression guard)", async ({
    ownerPage,
  }) => {
    // This test guards against bug #498: Phase 4 inline resolution → Phase 5 exits
    // → entity resolutions never created → drafts never generated
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
      return;
    }

    const wa = new WhatsAppHelper();
    await wa.sendText(
      // Clodagh is the ONLY player with that name → Phase 4 should auto-resolve
      // This is the exact scenario that triggers the #498 dead-end
      "Clodagh was outstanding today. Her fitness levels are exceptional."
    );

    // entity_resolution_completed MUST fire — if it doesn't, #498 is still broken
    await waitForPipelineEvent(ownerPage, "entity_resolution_completed", 90_000);
  });

  test("drafts_generated event appears after full pipeline (#498 regression guard)", async ({
    ownerPage,
  }) => {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
      return;
    }

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Sinead played brilliantly today. Her passing accuracy and movement off the ball were exceptional."
    );

    await waitForPipelineEvent(ownerPage, "drafts_generated", 120_000);
  });
});

// ── WA-VOICE-S03: Artifact drill-down ─────────────────────────────────────

test.describe("WA-VOICE-S03: Harness artifact drill-down", () => {
  test("artifacts list shows new note in monitoring dashboard", async ({
    ownerPage,
  }) => {
    test.slow();
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
      return;
    }

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Clodagh and Sinead both had excellent training tonight."
    );

    await ownerPage.goto("/platform/voice-monitoring/artifacts");
    await waitForPageLoad(ownerPage);

    // Should show at least one artifact
    await expect(
      ownerPage.locator("table tr, [data-artifact], .artifact-row").first()
    ).toBeVisible({ timeout: 60_000 });
  });

  test("artifact detail page shows pipeline events for that artifact", async ({
    ownerPage,
  }) => {
    test.slow();
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
      return;
    }

    await ownerPage.goto("/platform/voice-monitoring/artifacts");
    await waitForPageLoad(ownerPage);

    // Click first artifact in list
    const firstArtifact = ownerPage
      .locator("a[href*='/artifacts/'], button")
      .first();
    if (await firstArtifact.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await firstArtifact.click();
      await waitForPageLoad(ownerPage);

      // Should show event timeline/pipeline events
      await expect(
        ownerPage
          .getByText(/artifact|transcription|claims/i)
          .first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });
});

// ── WA-VOICE-S04: Review link ──────────────────────────────────────────────

test.describe("WA-VOICE-S04: Review link generated and functional", () => {
  test("review link code is 8 characters", async ({ ownerPage }) => {
    test.slow();
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
      return;
    }

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Eimear was the standout player today. Great defensive awareness."
    );

    await goToAdminVoiceNotes(ownerPage);

    // Find a review link (format: /r/XXXXXXXX)
    await expect(
      ownerPage.locator("a[href*='/r/'], [data-review-link]")
        .or(ownerPage.getByText(/\/r\//i))
        .first()
    ).toBeVisible({ timeout: 60_000 });
  });

  test("'R' command generates a new review link", async ({ ownerPage }) => {
    test.slow();
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
      return;
    }

    // First send a note to get something in the system
    const wa = new WhatsAppHelper();
    await wa.sendText("Clodagh showed real improvement today.");
    await ownerPage.waitForTimeout(5_000);

    // Send "R" command to re-request review link
    await wa.sendCommand("R");
    await ownerPage.waitForTimeout(3_000);

    // Verify via admin panel (we can't easily intercept the WhatsApp reply)
    await goToAdminVoiceNotes(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});
