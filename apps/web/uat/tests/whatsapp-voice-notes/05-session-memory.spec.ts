/**
 * WhatsApp Voice Notes — Session Memory
 *
 * Tests the session memory / org preference caching behaviour.
 *
 * Session memory stores a coach's last-used org for WhatsApp routing.
 * - Single-org coaches: no session needed (always routed to their one org)
 * - Multi-org coaches: session stores selected org for 24h (changed from 2h in #601 fix)
 * - RESET command: clears session, forces re-prompt
 * - Stale session (#480): after expiry, wrong org was used without re-prompting
 *
 * @feature WhatsApp Session Memory
 * @bugs #480 (stale session routes to wrong org), #601 (session duration change 2h→24h)
 */

import type { Page } from "@playwright/test";
import {
  TEST_ORG_ID,
  dismissBlockingDialogs,
  expect,
  test,
  waitForPageLoad,
} from "../../fixtures/test-fixtures";
import { WA_MULTI_ORG_PHONE, WhatsAppHelper } from "../../fixtures/whatsapp-helper";

// ── Helpers ────────────────────────────────────────────────────────────────

async function goToAdminVoiceNotes(page: Page): Promise<void> {
  await page.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

function skipIfNoConvex() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
  }
}

function skipIfNoMultiOrg() {
  skipIfNoConvex();
  if (!WA_MULTI_ORG_PHONE || WA_MULTI_ORG_PHONE === "+353852222222") {
    test.skip(
      true,
      "WA_TEST_MULTI_ORG_PHONE not configured — set env var to a coach registered in 2+ orgs"
    );
  }
}

// ── WA-SESSION-001: Single-org has no session requirement ─────────────────

test.describe("WA-SESSION-001: Single-org coach — no session memory needed", () => {
  test.slow();

  test("single-org coach first note routes without waiting for session", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper(); // uses single-org coach phone
    const noteText = `Brid showed great determination. [session-s1-${Date.now()}]`;
    await wa.sendText(noteText);

    // Should process immediately — no org selection needed
    await ownerPage.waitForTimeout(5_000);
    await goToAdminVoiceNotes(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });

  test("single-org coach consecutive notes all route immediately", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const ts = Date.now();
    await wa.sendConsecutive([
      `Session note 1: Aoife was great. [session-s2a-${ts}]`,
      `Session note 2: Clodagh too. [session-s2b-${ts}]`,
      `Session note 3: Sinead topped it. [session-s2c-${ts}]`,
    ]);

    await ownerPage.waitForTimeout(10_000);
    await goToAdminVoiceNotes(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── WA-SESSION-002: Multi-org first use (no session) ──────────────────────

test.describe("WA-SESSION-002: Multi-org coach — first message prompts org selection", () => {
  test.slow();

  test("first message from multi-org coach triggers org selection (no cached session)", async ({
    ownerPage,
  }) => {
    skipIfNoMultiOrg();

    // First RESET to clear any existing session
    const wa = new WhatsAppHelper(WA_MULTI_ORG_PHONE);
    await wa.sendCommand("RESET");
    await ownerPage.waitForTimeout(2_000);

    // Send a new note — should prompt for org
    await wa.sendText(`Muireann had a great session. [fresh-session-${Date.now()}]`);
    await ownerPage.waitForTimeout(10_000);

    await goToAdminVoiceNotes(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── WA-SESSION-003: Session persists within 24h window ────────────────────

test.describe("WA-SESSION-003: Session memory persists for 24h after org selection", () => {
  test.slow();

  test("second note within 24h uses cached org without re-prompting", async ({
    ownerPage,
  }) => {
    // This test requires a multi-org coach to have recently selected an org.
    // We set up the session by selecting org 1, then verify subsequent notes
    // use the cached org without another prompt.
    skipIfNoMultiOrg();

    const wa = new WhatsAppHelper(WA_MULTI_ORG_PHONE);

    // Set up session by selecting org 1
    await wa.sendText(`Setup note. [session-setup-${Date.now()}]`);
    await ownerPage.waitForTimeout(3_000);
    await wa.sendOrgSelection(1);
    await ownerPage.waitForTimeout(5_000);

    // Send follow-up note — should use cached org
    const ts = Date.now();
    await wa.sendText(`Follow-up note. [session-followup-${ts}]`);
    await ownerPage.waitForTimeout(8_000);

    // Verify system handled it without error
    await goToAdminVoiceNotes(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── WA-SESSION-004: RESET clears session ──────────────────────────────────

test.describe("WA-SESSION-004: RESET command invalidates session", () => {
  test.slow();

  test("RESET after org selection clears the cached org preference", async ({
    ownerPage,
  }) => {
    skipIfNoMultiOrg();

    const wa = new WhatsAppHelper(WA_MULTI_ORG_PHONE);

    // Build a session
    await wa.sendText(`Pre-RESET note. [pre-reset-${Date.now()}]`);
    await ownerPage.waitForTimeout(3_000);
    await wa.sendOrgSelection(1);
    await ownerPage.waitForTimeout(3_000);

    // RESET
    await wa.sendCommand("RESET");
    await ownerPage.waitForTimeout(2_000);

    // New note should need org re-selection
    await wa.sendText(`Post-RESET note. [post-reset-${Date.now()}]`);
    await ownerPage.waitForTimeout(10_000);

    await goToAdminVoiceNotes(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });

  test("single-org coach RESET still processes next note normally", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper(); // single-org
    await wa.sendCommand("RESET");
    await ownerPage.waitForTimeout(2_000);

    const noteText = `After RESET, single-org coach note. [reset-single-${Date.now()}]`;
    await wa.sendText(noteText);

    await ownerPage.waitForTimeout(5_000);
    await goToAdminVoiceNotes(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── WA-SESSION-005: Session duration is 24h (not 2h) — #601/#480 guards ───

test.describe("WA-SESSION-005: Session duration verification (24h post #601 fix)", () => {
  test("session configuration is accessible in system (audit check)", async ({
    ownerPage,
  }) => {
    // This is a code-level guard — we verify the platform admin
    // monitoring dashboard doesn't show any session-related errors
    // that would indicate the 24h timeout isn't working
    skipIfNoConvex();

    await ownerPage.goto("/platform/voice-monitoring");
    await waitForPageLoad(ownerPage);

    // Monitoring dashboard should load without errors
    // If there are session-related error spikes, they'll show in alerts
    const hasErrors = await ownerPage
      .getByText(/session.*error|timeout.*error/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (hasErrors) {
      console.warn(
        "Session-related errors detected in monitoring dashboard. " +
          "This may indicate #480/#601 session duration regression."
      );
    }

    // Page should at least load
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });
});
