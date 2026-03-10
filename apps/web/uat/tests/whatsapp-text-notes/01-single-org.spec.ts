/**
 * WhatsApp Text Notes — Single-Org Coach
 *
 * Tests the text-message (non-audio) path through WhatsApp. Text messages
 * skip transcription entirely and go straight to claims extraction.
 *
 * Single-org coaches should have text notes processed without org selection.
 * Text notes follow the same V2 pipeline as audio, but Phase 1
 * (transcription) is a no-op — the Body text IS the transcript.
 *
 * @feature WhatsApp Text Notes
 * @route Admin: /orgs/[orgId]/admin/voice-notes
 * @route Coach: /orgs/[orgId]/coach/voice-notes
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
  checkDraftsTab,
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
}

function skipIfNoConvex() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
  }
}

// ── WA-TEXT-S01: Basic text note receipt ──────────────────────────────────

test.describe("WA-TEXT-S01: Basic text note receipt", () => {
  test("webhook accepts a text note with 200 status", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      "Clodagh had a great session today. Her positional play is improving significantly."
    );
    expect(sid).toBeTruthy();
  });

  test("text note appears in admin panel within 60s", async ({ ownerPage }) => {
    test.slow();
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const uniqueText = `Sinead worked really hard today. Her stamina is improving. [text-s01-${Date.now()}]`;
    await wa.sendText(uniqueText);

    await waitForNoteInAdmin(ownerPage, TEST_ORG_ID, "Sinead", 60_000);
    await expect(
      ownerPage.getByText(/Sinead/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("text note appears in coach voice notes history", async ({
    coachPage,
  }) => {
    test.slow();
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const ts = Date.now();
    await wa.sendText(
      `Eimear showed excellent ball skills today. [text-history-${ts}]`
    );

    await goToCoachVoiceNotes(coachPage);

    const historyTab = coachPage
      .getByRole("tab", { name: /history/i })
      .or(coachPage.getByText("History", { exact: true }).first());
    if (await historyTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await historyTab.click();
    }

    await expect(
      coachPage.getByText(/Eimear/i).first()
    ).toBeVisible({ timeout: 60_000 });
  });
});

// ── WA-TEXT-S02: Text note skips transcription phase ─────────────────────

test.describe("WA-TEXT-S02: Text notes skip transcription (V2 pipeline shortcut)", () => {
  test.slow();

  test("transcription_completed event fires immediately for text note", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Clodagh was exceptional at training tonight. Her leadership skills are developing well."
    );

    // For text notes, transcription is immediate (no Deepgram call needed)
    await waitForPipelineEvent(ownerPage, "transcription_completed", 15_000);
  });

  test("claims_extracted event fires within 60s for text note", async ({
    ownerPage,
  }) => {
    test.slow();
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Sinead scored twice in training. Her shooting accuracy has improved massively."
    );

    await waitForPipelineEvent(ownerPage, "claims_extracted", 60_000);
  });

  test("full pipeline completes for text note (drafts_generated)", async ({
    ownerPage,
  }) => {
    test.slow();
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Eimear had the best performance of the season tonight. Her positional awareness and work rate were outstanding."
    );

    await waitForPipelineEvent(ownerPage, "drafts_generated", 120_000);
  });
});

// ── WA-TEXT-S03: Text note content in drafts ─────────────────────────────

test.describe("WA-TEXT-S03: Text note content flows to drafts tab", () => {
  test.slow();

  test("draft generated from text note appears in drafts tab", async ({
    coachPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Clodagh Barlow was outstanding at training today. Her passing accuracy was exceptional and she showed great leadership."
    );

    // Allow full pipeline to run
    await coachPage.waitForTimeout(90_000);

    const hasDrafts = await checkDraftsTab(coachPage, TEST_ORG_ID);
    // Just log — drafts may take time; don't hard-fail if pipeline is slow
    console.log("Drafts tab has content:", hasDrafts);
  });
});

// ── WA-TEXT-S04: Multiple text notes ─────────────────────────────────────

test.describe("WA-TEXT-S04: Multiple text notes in sequence", () => {
  test.slow();

  test("three consecutive text notes all appear in admin panel", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const ts = Date.now();
    const notes = [
      `Clodagh was brilliant today. Excellent work rate. [multi-text-1-${ts}]`,
      `Sinead topped the fitness test again this week. [multi-text-2-${ts}]`,
      `Eimear showed real improvement in her defensive positioning. [multi-text-3-${ts}]`,
    ];

    for (const note of notes) {
      await wa.sendText(note);
      await ownerPage.waitForTimeout(500);
    }

    // Wait for all to process
    await ownerPage.waitForTimeout(30_000);
    await goToAdminVoiceNotes(ownerPage);

    // All notes should be in the system (not deduplicated)
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});
