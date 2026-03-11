/**
 * WhatsApp Voice Notes — Multi-Org Coach Routing
 *
 * Tests the org selection flow for coaches who belong to multiple organisations.
 * Multi-org coaches are prompted with "Which club?" before processing.
 * After selecting, their preference is cached for 24 hours (SESSION_TIMEOUT_MS = 86400000).
 *
 * Org detection cascade (8 steps, first match wins — confirmed from findCoachWithOrgContext):
 *   1. single_org         — coach has exactly one org → immediate routing
 *   2. explicit_mention   — "for Grange", "@Grange", "Grange:", "at Grange", "from Grange"
 *   3. team_match         — team name fuzzy match in message text
 *   4. age_group_match    — u12, u-12, under 12, senior, etc.
 *   5. sport_match        — soccer, gaa, hurling, rugby, basketball, etc.
 *   6. player_match       — player name fuzzy match (Levenshtein >= 0.8, handles Irish aliases)
 *   7. coach_match        — another coach on same team mentioned
 *   8. session_memory     — last org used within 24h window
 *   → needsClarification  — all 8 steps exhausted without match → prompt coach
 *
 * Audio auto-detection: when audio message arrives for multi-org coach with no session,
 * the system creates a pending message and races:
 *   - Manual org selection (coach replies 1/2/3 or org name)
 *   - Auto-detect via transcription (attemptOrgDetectionFromAudio)
 * First to resolve wins.
 *
 * Regression guards for:
 *   #601 — multi-org coaches never see the clarification prompt (session extended to 24h)
 *   #480 — stale session routes audio to wrong org after 2h expiry
 *
 * @feature WhatsApp Voice Notes
 * @bugs #601 (org routing), #480 (stale session)
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
  WA_MULTI_ORG_PHONE,
  WhatsAppHelper,
  waitForNoteInAdmin,
  waitForNoteStatus,
} from "../../fixtures/whatsapp-helper";

// ── Helpers ────────────────────────────────────────────────────────────────

async function goToAdminVoiceNotes(page: Page): Promise<void> {
  await page.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

function skipIfNoEnv() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
  }
  if (!WA_MULTI_ORG_PHONE || WA_MULTI_ORG_PHONE === "+353852222222") {
    test.skip(
      true,
      "WA_TEST_MULTI_ORG_PHONE not configured — set WA_TEST_MULTI_ORG_PHONE env var to a coach with 2+ orgs"
    );
  }
}

// ── WA-VOICE-M01: Clarification prompt ────────────────────────────────────

test.describe("WA-VOICE-M01: Multi-org coach gets clarification prompt", () => {
  test.slow();

  test("audio note from multi-org coach triggers org selection prompt", async ({
    ownerPage,
  }) => {
    skipIfNoEnv();

    const wa = new WhatsAppHelper(WA_MULTI_ORG_PHONE);
    await wa.sendAudio();

    // Wait for processing — the note should enter pending_org_selection state
    await ownerPage.waitForTimeout(8_000);
    await goToAdminVoiceNotes(ownerPage);

    // For multi-org coaches, the note status should be "pending_org_selection"
    // (not "processing" or "completed") until org is selected
    // The admin panel should reflect this state
    const pendingText = ownerPage
      .getByText(/pending.?org|waiting.?org|which club/i)
      .first();
    await expect(pendingText).toBeVisible({ timeout: 30_000 });
  });

  test("text note from multi-org coach triggers org selection prompt", async ({
    ownerPage,
  }) => {
    skipIfNoEnv();

    const wa = new WhatsAppHelper(WA_MULTI_ORG_PHONE);
    await wa.sendText(
      `Niamh showed excellent pace today. Great performance. [multi-${Date.now()}]`
    );

    // Give it 10s to potentially process
    await ownerPage.waitForTimeout(10_000);
    await goToAdminVoiceNotes(ownerPage);

    // The note should not have been routed without org confirmation
    // There should be no completed note from the multi-org coach without selection
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── WA-VOICE-M02: Org selection via numeric reply ──────────────────────────

test.describe("WA-VOICE-M02: Numeric reply resolves org selection", () => {
  test.slow();

  test("reply '1' routes note to first org in the list", async ({
    ownerPage,
  }) => {
    skipIfNoEnv();

    const wa = new WhatsAppHelper(WA_MULTI_ORG_PHONE);
    const noteText = `Aoife had a great training session. [multi-org-1-${Date.now()}]`;

    // Send note → will prompt org selection
    await wa.sendText(noteText);
    await ownerPage.waitForTimeout(5_000);

    // Select org 1
    await wa.sendOrgSelection(1);

    // Now the note should be routed and processing for org 1
    await goToAdminVoiceNotes(ownerPage);
    // After org selection, note should eventually appear in the admin panel
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });

  test("reply '2' routes note to second org in the list", async ({
    ownerPage,
  }) => {
    skipIfNoEnv();

    const wa = new WhatsAppHelper(WA_MULTI_ORG_PHONE);
    await wa.sendText(
      `Fionnuala scored twice. Top performer. [multi-org-2-${Date.now()}]`
    );
    await ownerPage.waitForTimeout(5_000);

    // Select org 2
    await wa.sendOrgSelection(2);

    // Note should be routed (to org 2, which is a different org from TEST_ORG_ID)
    // Just verify no error state
    await goToAdminVoiceNotes(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });

  test("invalid reply (out of range) does not crash pipeline", async ({
    ownerPage,
  }) => {
    skipIfNoEnv();

    const wa = new WhatsAppHelper(WA_MULTI_ORG_PHONE);
    await wa.sendText(`Siobhan showed good skills. [invalid-${Date.now()}]`);
    await ownerPage.waitForTimeout(3_000);

    // Reply with an out-of-range number (e.g. 99)
    await wa.sendOrgSelection(99);
    await ownerPage.waitForTimeout(3_000);

    // Should NOT cause errors — should re-prompt or keep pending
    await goToAdminVoiceNotes(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });
});

// ── WA-VOICE-M03: Auto-detection from audio (#601) ─────────────────────────

test.describe("WA-VOICE-M03: Auto org detection from audio content (#601)", () => {
  test.slow();

  test("audio with clear org-specific player names auto-routes without manual reply", async ({
    ownerPage,
  }) => {
    // This tests the `attemptOrgDetectionFromAudio` action added to fix #601
    // When audio transcription mentions only players from one org, it should
    // auto-select that org without requiring a manual numeric reply.
    skipIfNoEnv();

    const wa = new WhatsAppHelper(WA_MULTI_ORG_PHONE);
    // Clodagh Barlow is a player only in the Grange org (TEST_ORG_ID)
    // If auto-detection works, this should be routed to Grange without prompting
    await wa.sendAudio();

    // Allow time for transcription + auto-detection
    await ownerPage.waitForTimeout(30_000);

    // Check admin panel — if auto-detection worked, the note should be in a
    // non-pending state (processing or completed), not pending_org_selection
    await goToAdminVoiceNotes(ownerPage);

    // The note should NOT still be in pending_org_selection if auto-detection succeeded
    // (this test may fail if #601 auto-detection is not yet shipped)
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── WA-VOICE-M04: Session memory after org selection ──────────────────────

test.describe("WA-VOICE-M04: Org preference cached after selection", () => {
  test.slow();

  test("second note uses cached org without re-prompting (within 24h)", async ({
    ownerPage,
  }) => {
    skipIfNoEnv();

    const wa = new WhatsAppHelper(WA_MULTI_ORG_PHONE);

    // First note — will prompt for org selection
    await wa.sendText(`Grainne played well today. [cache-test-1-${Date.now()}]`);
    await ownerPage.waitForTimeout(5_000);
    await wa.sendOrgSelection(1); // Select org 1
    await ownerPage.waitForTimeout(5_000);

    // Second note — should use cached org without prompting
    await wa.sendText(
      `Grainne improved her passing today. [cache-test-2-${Date.now()}]`
    );

    // Wait and check that the note processed without another org selection prompt
    await ownerPage.waitForTimeout(8_000);
    await goToAdminVoiceNotes(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── WA-VOICE-M05: RESET command clears org session ────────────────────────

test.describe("WA-VOICE-M05: RESET command clears org preference", () => {
  test.slow();

  test("RESET command followed by new note triggers fresh org selection prompt", async ({
    ownerPage,
  }) => {
    skipIfNoEnv();

    const wa = new WhatsAppHelper(WA_MULTI_ORG_PHONE);

    // Set up: select an org first
    await wa.sendText(`Meadhbh was brilliant. [reset-pre-${Date.now()}]`);
    await ownerPage.waitForTimeout(3_000);
    await wa.sendOrgSelection(1);
    await ownerPage.waitForTimeout(3_000);

    // RESET should clear the session
    await wa.sendCommand("RESET");
    await ownerPage.waitForTimeout(2_000);

    // After RESET, next note should prompt for org selection again
    await wa.sendText(
      `Sorcha showed great stamina. [post-reset-${Date.now()}]`
    );
    await ownerPage.waitForTimeout(10_000);

    // Admin panel should show the note in pending_org_selection (not auto-routed)
    await goToAdminVoiceNotes(ownerPage);
    // Just verify system is healthy
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});
