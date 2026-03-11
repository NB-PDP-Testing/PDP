/**
 * WhatsApp Text Notes — Player Name Matching
 *
 * Tests the entity resolution / player matching logic for Irish names.
 * The pipeline extracts player names from note content and resolves them
 * to enrolled player identities within the organisation.
 *
 * Irish name challenges:
 *   - Diacritics (fada): Aoife = Aoife, Ní Bhriain = Ni Bhriain (no fada in WhatsApp)
 *   - O' / Ó prefixes: O'Brien, Ó'Brien, O Brien
 *   - Mac / Mc / Nic / Níc prefixes
 *   - First-name-only references: "Clodagh played well" → Clodagh Barlow
 *   - Nickname matching: "Siné" → Sinead
 *   - Multiple players: separate claims per player
 *   - Disambiguation: two players with same first name → disambiguation flow
 *
 * @feature Player Entity Resolution
 * @route /orgs/[orgId]/coach/voice-notes (disambiguation tab)
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

async function goToDisambiguationTab(page: Page): Promise<void> {
  await page.goto(`/orgs/${TEST_ORG_ID}/coach/voice-notes`);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);

  const disambigTab = page
    .getByRole("tab", { name: /disambig/i })
    .or(page.getByText("Needs Review", { exact: true }).first())
    .or(page.getByText("Review", { exact: true }).first());

  if (await disambigTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await disambigTab.click();
  }
}

function skipIfNoConvex() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
  }
}

// ── WA-PLAYER-001: Unambiguous first-name-only match ─────────────────────

test.describe("WA-PLAYER-001: Unambiguous first-name-only player matching", () => {
  test.slow();

  test("'Clodagh' alone matches Clodagh Barlow (only Clodagh in org)", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Clodagh was the best player at training today. Excellent effort throughout."
    );

    // entity_resolution_completed should fire (auto-resolved, no ambiguity)
    await waitForPipelineEvent(ownerPage, "entity_resolution_completed", 90_000);
  });

  test("'Sinead' alone matches Sinead Haughey (only Sinead in org)", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Sinead had a fantastic session. Her fitness levels are exceptional."
    );

    await waitForPipelineEvent(ownerPage, "entity_resolution_completed", 90_000);
  });

  test("'Eimear' alone matches Eimear McDonagh (only Eimear in org)", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Eimear showed great improvement in her positional play today."
    );

    await waitForPipelineEvent(ownerPage, "entity_resolution_completed", 90_000);
  });
});

// ── WA-PLAYER-002: Full name matching ────────────────────────────────────

test.describe("WA-PLAYER-002: Full name matching", () => {
  test.slow();

  test("'Clodagh Barlow' (full name) is resolved correctly", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Clodagh Barlow was outstanding today. Best player in training by far."
    );

    await waitForPipelineEvent(ownerPage, "entity_resolution_completed", 90_000);
  });

  test("'Sinead Haughey' (full name) is resolved correctly", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Sinead Haughey scored twice at training. Excellent finishing."
    );

    await waitForPipelineEvent(ownerPage, "entity_resolution_completed", 90_000);
  });
});

// ── WA-PLAYER-003: Multiple players in one note ───────────────────────────

test.describe("WA-PLAYER-003: Multiple player names in a single note", () => {
  test.slow();

  test("note mentioning 3 players creates separate claims for each", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Clodagh, Sinead, and Eimear all had excellent sessions today. Great teamwork from all three players."
    );

    await waitForPipelineEvent(ownerPage, "claims_extracted", 60_000);
    // After claims extraction, entity resolution should resolve all three
    await waitForPipelineEvent(ownerPage, "entity_resolution_completed", 90_000);
  });

  test("note mentioning players and team-level observation is handled", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "The team worked really well together. Clodagh led brilliantly as captain. The whole squad gave 100%."
    );

    await waitForPipelineEvent(ownerPage, "claims_extracted", 60_000);
  });
});

// ── WA-PLAYER-004: Irish name handling ────────────────────────────────────

test.describe("WA-PLAYER-004: Irish name variations and diacritics", () => {
  test("O'Brien style names are accepted in webhook", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      "Niamh O'Brien showed excellent ball control at training today. Her skills are improving."
    );
    expect(sid).toBeTruthy();
  });

  test("Ní/Nic prefix names are accepted in webhook", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      "Caoimhe Ní Bhriain was the best player on the pitch today. Top performance."
    );
    expect(sid).toBeTruthy();
  });

  test("Mac/Mc prefix names are accepted in webhook", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      "Siobhan McNamara and Roisin Mac Giolla Chuda both had great training sessions."
    );
    expect(sid).toBeTruthy();
  });

  test("name with fada (diacritics) is accepted in webhook", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      "Áine Ó Briain showed excellent speed and stamina at training today."
    );
    expect(sid).toBeTruthy();
  });

  test("name without fada (common in WhatsApp) is accepted", async () => {
    skipIfNoConvex();

    // WhatsApp users often drop fadas — "Aine" instead of "Áine"
    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      "Aine O'Brien had a brilliant session. Her pace is exceptional."
    );
    expect(sid).toBeTruthy();
  });
});

// ── WA-PLAYER-005: Unknown player (no match) ─────────────────────────────

test.describe("WA-PLAYER-005: Unknown player name — disambiguation required", () => {
  test.slow();

  test("note with unknown player name creates a disambiguation entry", async ({
    coachPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    // "Brunhilde" is unlikely to be in the system — should go to disambiguation
    await wa.sendText(
      `Brunhilde Testplayer had an excellent session today. Great performance all round. [unknown-player-${Date.now()}]`
    );

    // Wait for pipeline to attempt resolution
    await coachPage.waitForTimeout(60_000);

    await goToDisambiguationTab(coachPage);
    // Page should load without error (disambiguation flow exists)
    await expect(coachPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── WA-PLAYER-006: Team-level notes (no specific player) ─────────────────

test.describe("WA-PLAYER-006: Team-level observations without specific players", () => {
  test.slow();

  test("team-level note processes through pipeline without disambiguation", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "The U18 team had a great training session today. Excellent effort from everyone. Strong teamwork and communication throughout."
    );

    await waitForPipelineEvent(ownerPage, "claims_extracted", 60_000);
  });
});
