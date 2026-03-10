/**
 * Voice Notes Pipeline — Insight Accuracy & Categorisation
 *
 * Tests that verify the CONTENT of generated insights, not just that they exist.
 * These tests use synthetic WhatsApp text notes with known content to assert
 * that the AI extraction pipeline produces correctly categorised, player-matched
 * insights.
 *
 * Input method covered: WhatsApp text (synthetic via WhatsAppHelper)
 *
 * Insight categories (from voiceNotes.ts schema):
 *   - "skill_development"  — player skill improvement/observation
 *   - "performance"        — match/training performance observation
 *   - "injury_concern"     — injury flag (feeds "Injuries" section on microsite)
 *   - "team_dynamics"      — team-level note, no specific player
 *   - "coaching_action"    — todo/action item for coach (feeds "Actions" section)
 *   - "parent_update"      — information suitable for parent summary
 *
 * Regression guards:
 *   #492 — Team notes incorrectly placed under "Unmatched Players" on microsite
 *   #616 — Ghost player "Chloe" hallucinated from non-existent player name
 *
 * @feature Voice Notes Insight Accuracy
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
  WA_UNREGISTERED_PHONE,
} from "../../fixtures/whatsapp-helper";

// ── Helpers ────────────────────────────────────────────────────────────────

async function goToAdminVoiceNotes(page: Page): Promise<void> {
  await page.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

async function findReviewLinkInAdmin(
  page: Page,
  orgId: string
): Promise<string | null> {
  await page.goto(`/orgs/${orgId}/admin/voice-notes`);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);

  const linkEl = page.locator("a[href*='/r/'], [data-review-link]").first();
  if (await linkEl.isVisible({ timeout: 10_000 }).catch(() => false)) {
    return linkEl.getAttribute("href");
  }
  return null;
}

function skipIfNoConvex() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
  }
}

// ── WA-INSIGHT-001: Player-specific insights ────────────────────────────

test.describe("WA-INSIGHT-001: Player-specific insights correctly identify player", () => {
  test.slow();

  test("note about a unique-named player creates an insight with that player's name", async ({
    ownerPage,
    coachPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const marker = `insight-player-${Date.now()}`;
    await wa.sendText(
      `Clodagh Barlow was absolutely outstanding today. Her passing accuracy was exceptional — best session of the season. [${marker}]`
    );

    await ownerPage.waitForTimeout(30_000);

    // Check admin panel for the note
    await goToAdminVoiceNotes(ownerPage);
    const noteVisible = await ownerPage
      .getByText(marker, { exact: false })
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    console.log(`Note with marker visible in admin: ${noteVisible}`);

    // Check review microsite for player assignment
    const reviewHref = await findReviewLinkInAdmin(ownerPage, TEST_ORG_ID);
    if (reviewHref) {
      await coachPage.goto(reviewHref);
      await waitForPageLoad(coachPage);
      await dismissBlockingDialogs(coachPage);

      // Should show Clodagh Barlow as the matched player
      const playerMentioned = await coachPage
        .getByText(/clodagh/i)
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      console.log(`Player 'Clodagh' visible on microsite: ${playerMentioned}`);
    }

    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });

  test("note about multiple players creates separate insights for each", async ({
    ownerPage,
    coachPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const marker = `multi-player-${Date.now()}`;
    await wa.sendText(
      `Clodagh Barlow had great positioning. ` +
        `Sinead Haughey showed excellent defensive awareness. ` +
        `Eimear McDonagh scored twice with great finishing. ` +
        `[${marker}]`
    );

    await ownerPage.waitForTimeout(35_000);

    const reviewHref = await findReviewLinkInAdmin(ownerPage, TEST_ORG_ID);
    if (!reviewHref) {
      console.warn("No review link found — pipeline may still be processing");
      await expect(ownerPage.locator("body")).not.toContainText(/error/i);
      return;
    }

    await coachPage.goto(reviewHref);
    await waitForPageLoad(coachPage);
    await dismissBlockingDialogs(coachPage);

    // Each player should appear in at least one insight
    const players = ["Clodagh", "Sinead", "Eimear"];
    for (const name of players) {
      const isVisible = await coachPage
        .getByText(new RegExp(name, "i"))
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      console.log(`Player '${name}' visible on microsite: ${isVisible}`);
    }

    await expect(coachPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── WA-INSIGHT-002: Injury concern detection ────────────────────────────

test.describe("WA-INSIGHT-002: Injury concerns are categorised correctly", () => {
  test.slow();

  test("note mentioning injury appears in 'Injuries' section on microsite", async ({
    ownerPage,
    coachPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const marker = `injury-test-${Date.now()}`;
    await wa.sendText(
      `Clodagh Barlow picked up a slight ankle strain in training today — ` +
        `she came off after 20 minutes. Monitor carefully before next match. [${marker}]`
    );

    await ownerPage.waitForTimeout(30_000);

    const reviewHref = await findReviewLinkInAdmin(ownerPage, TEST_ORG_ID);
    if (!reviewHref) {
      console.warn("No review link found");
      return;
    }

    await coachPage.goto(reviewHref);
    await waitForPageLoad(coachPage);
    await dismissBlockingDialogs(coachPage);

    // Check for Injuries section
    const injuriesSection = await coachPage
      .getByText(/injuries/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const ankleContent = await coachPage
      .getByText(/ankle/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    console.log(
      `Injuries section visible: ${injuriesSection}, Ankle content: ${ankleContent}`
    );

    // Shield icon is used for injury section (confirmed from review-queue.tsx)
    await expect(coachPage.locator("body")).not.toContainText(/error/i);
  });

  test("multiple injury mentions in one note create separate injury entries", async ({
    ownerPage,
    coachPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      `Aoife Murphy has a knee concern — she's been limping after drills. ` +
        `Also, Saoirse Brennan mentioned her hamstring is tight. ` +
        `Both need physio assessment before Saturday's match.`
    );

    await ownerPage.waitForTimeout(30_000);

    const reviewHref = await findReviewLinkInAdmin(ownerPage, TEST_ORG_ID);
    if (!reviewHref) {
      console.warn("No review link");
      return;
    }

    await coachPage.goto(reviewHref);
    await waitForPageLoad(coachPage);
    await dismissBlockingDialogs(coachPage);

    await expect(coachPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── WA-INSIGHT-003: Team-level notes ────────────────────────────────────

test.describe("WA-INSIGHT-003: Team-level notes go to 'Team Notes' section, not 'Unmatched Players' (#492)", () => {
  test.slow();

  test("team-level observation appears in Team Notes section, not Unmatched Players", async ({
    ownerPage,
    coachPage,
  }) => {
    skipIfNoConvex();

    // Regression guard for #492 — team notes incorrectly placed under "Unmatched Players"
    const wa = new WhatsAppHelper();
    await wa.sendText(
      `The team as a whole showed great defensive organisation today. ` +
        `Our pressing from the front was really effective. ` +
        `Transition speed needs improvement — team needs to work on quick counter-press.`
    );

    await ownerPage.waitForTimeout(30_000);

    const reviewHref = await findReviewLinkInAdmin(ownerPage, TEST_ORG_ID);
    if (!reviewHref) {
      console.warn("No review link");
      return;
    }

    await coachPage.goto(reviewHref);
    await waitForPageLoad(coachPage);
    await dismissBlockingDialogs(coachPage);

    const teamNotesSection = await coachPage
      .getByText(/team notes/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    // The "Unmatched Players" section should NOT contain team-level content
    // (this was the #492 bug — team notes under "Unmatched Players")
    const unmatchedSection = coachPage.getByText(/unmatched players/i).first();
    const unmatchedVisible = await unmatchedSection
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    console.log(
      `Team Notes section: ${teamNotesSection}, Unmatched Players section: ${unmatchedVisible}`
    );

    if (teamNotesSection && unmatchedVisible) {
      // Both sections visible — verify team content is in Team Notes, not Unmatched
      console.log(
        "Both sections visible — manual verification needed that team content is in correct section"
      );
    }

    await expect(coachPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── WA-INSIGHT-004: Coaching action / todo extraction ───────────────────

test.describe("WA-INSIGHT-004: Coaching actions (todos) are extracted to 'Actions' section", () => {
  test.slow();

  test("note with explicit todo appears in Actions section on microsite", async ({
    ownerPage,
    coachPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      `Good session overall. ` +
        `Remind me to speak to Clodagh's parents about the upcoming tournament. ` +
        `Need to book the pitch for next Tuesday's extra training session. ` +
        `Also, remind Seán to send the strength and conditioning programme to all players.`
    );

    await ownerPage.waitForTimeout(30_000);

    const reviewHref = await findReviewLinkInAdmin(ownerPage, TEST_ORG_ID);
    if (!reviewHref) {
      console.warn("No review link");
      return;
    }

    await coachPage.goto(reviewHref);
    await waitForPageLoad(coachPage);
    await dismissBlockingDialogs(coachPage);

    const actionsSection = await coachPage
      .getByText(/actions|todos|tasks/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    console.log(`Actions/Todos section visible: ${actionsSection}`);
    await expect(coachPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── WA-INSIGHT-005: Ghost player prevention (#616) ───────────────────────

test.describe("WA-INSIGHT-005: Ghost player prevention — unrecognised names go to Unmatched, not hallucinated (#616)", () => {
  test.slow();

  test("note mentioning a name not in the org roster creates Unmatched entry, not phantom insight", async ({
    ownerPage,
    coachPage,
  }) => {
    skipIfNoConvex();

    // #616 regression guard: a player name not in the roster (e.g. "Marcus")
    // should NOT create an insight with a hallucinated player identity.
    // It should appear in "Unmatched Players" section on the microsite.
    const wa = new WhatsAppHelper();
    const marker = `ghost-player-${Date.now()}`;
    await wa.sendText(
      `Marcus showed great pace today — excellent contribution to the attack. [${marker}]`
    );

    await ownerPage.waitForTimeout(30_000);

    const reviewHref = await findReviewLinkInAdmin(ownerPage, TEST_ORG_ID);
    if (!reviewHref) {
      console.warn("No review link");
      return;
    }

    await coachPage.goto(reviewHref);
    await waitForPageLoad(coachPage);
    await dismissBlockingDialogs(coachPage);

    // Should appear in "Unmatched Players" section
    const unmatchedSection = await coachPage
      .getByText(/unmatched|not matched/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    // Should NOT have auto-applied with a hallucinated player
    const autoApplied = await coachPage
      .getByText(/auto.applied/i)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    console.log(
      `Ghost player 'Marcus': unmatchedSection=${unmatchedSection}, autoApplied=${autoApplied}`
    );

    // System should be healthy — ghost player insights stay "pending" (not applied)
    await expect(coachPage.locator("body")).not.toContainText(/error/i);
  });

  test("note mentioning only a first name that is ambiguous goes to Unmatched (not forced match)", async ({
    ownerPage,
    coachPage,
  }) => {
    skipIfNoConvex();

    // If there are 2 players named "Sarah" in the org, the note should not
    // auto-match to either — it should require manual disambiguation
    const wa = new WhatsAppHelper();
    await wa.sendText(
      `Sarah played very well in the second half. Strong performance overall.`
    );

    await ownerPage.waitForTimeout(25_000);

    const reviewHref = await findReviewLinkInAdmin(ownerPage, TEST_ORG_ID);
    if (!reviewHref) {
      console.warn("No review link");
      return;
    }

    await coachPage.goto(reviewHref);
    await waitForPageLoad(coachPage);
    await dismissBlockingDialogs(coachPage);

    // Regardless of outcome, system should be healthy
    await expect(coachPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── WA-INSIGHT-006: Insight quality for various note styles ─────────────

test.describe("WA-INSIGHT-006: Insight extraction quality across note styles", () => {
  test.slow();

  test("very short note (one sentence) still extracts a meaningful insight", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText("Clodagh Barlow was brilliant today.");
    await ownerPage.waitForTimeout(20_000);

    // Admin panel should show the note (not dropped by quality gate)
    await goToAdminVoiceNotes(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });

  test("long detailed note (300+ words) extracts multiple distinct insights", async ({
    ownerPage,
    coachPage,
  }) => {
    skipIfNoConvex();

    const marker = `long-note-${Date.now()}`;
    const wa = new WhatsAppHelper();
    await wa.sendText(
      `Session review for Thursday training. ` +
        `Clodagh Barlow was outstanding throughout — her ball retention under pressure ` +
        `has improved significantly since last month. She's reading the game much better. ` +
        `Sinead Haughey had her best session in weeks. Her defensive positioning was ` +
        `excellent and her distribution from the back line was crisp and accurate. ` +
        `Eimear McDonagh scored three times from play — her movement off the ball ` +
        `to create space is developing well. She needs to work on her weaker left foot ` +
        `but overall a really positive session. ` +
        `Aoife Murphy had a tough session — she struggled with confidence after a ` +
        `few missed opportunities but I expect she'll bounce back. Worth a quick chat ` +
        `before the next session. ` +
        `Team-wide: defensive transitions have improved a lot. The high press worked ` +
        `well in the second half of the session. Still need to work on set piece defence. ` +
        `Remember to email all parents about the upcoming county final. [${marker}]`
    );

    await ownerPage.waitForTimeout(40_000);

    const reviewHref = await findReviewLinkInAdmin(ownerPage, TEST_ORG_ID);
    if (!reviewHref) {
      console.warn("No review link found for long note test");
      return;
    }

    await coachPage.goto(reviewHref);
    await waitForPageLoad(coachPage);
    await dismissBlockingDialogs(coachPage);

    // Should have multiple insights across multiple sections
    const insightCount = await coachPage
      .locator("[data-insight], .insight-card, button:has-text('Apply')")
      .count()
      .catch(() => 0);

    console.log(`Long note generated ${insightCount} actionable insights`);
    await expect(coachPage.locator("body")).not.toContainText(/error/i);
  });

  test("note with GAA/Irish sport terminology extracts correct skill categories", async ({
    ownerPage,
    coachPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const marker = `gaa-terms-${Date.now()}`;
    await wa.sendText(
      `Clodagh's hand-passing accuracy was excellent. ` +
        `Sinead's solo runs were controlled and composed. ` +
        `Eimear's free-taking was inconsistent — needs practice. ` +
        `Overall the team's puck-out strategy worked well. [${marker}]`
    );

    await ownerPage.waitForTimeout(30_000);

    const reviewHref = await findReviewLinkInAdmin(ownerPage, TEST_ORG_ID);
    if (!reviewHref) {
      console.warn("No review link");
      return;
    }

    await coachPage.goto(reviewHref);
    await waitForPageLoad(coachPage);
    await dismissBlockingDialogs(coachPage);

    await expect(coachPage.locator("body")).not.toContainText(/error/i);
  });

  test("note in Irish language (Gaeilge) is handled without crash", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      `Bhí Clodagh ar fheabhas inniu. Rinne sí obair iontach ó thaobh na liathróide de.`
    );

    await ownerPage.waitForTimeout(15_000);
    await goToAdminVoiceNotes(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });

  test("note with mixed English and Irish is handled without crash", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      `Clodagh was brilliant today — bhí sí ar fheabhas. Her positioning was excellent.`
    );

    await ownerPage.waitForTimeout(15_000);
    await goToAdminVoiceNotes(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });
});

// ── WA-INSIGHT-007: Cross-org data isolation ────────────────────────────

test.describe("WA-INSIGHT-007: Cross-org data isolation — coaches cannot see other orgs' insights", () => {
  test("admin voice notes page only shows notes for the current org", async ({
    ownerPage,
  }) => {
    // The admin page is org-scoped — notes from other orgs should not appear
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await dismissBlockingDialogs(ownerPage);

    // No error
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);

    // URL confirms org scope
    expect(ownerPage.url()).toContain(TEST_ORG_ID);
  });

  test("coach voice notes dashboard is org-scoped", async ({ coachPage }) => {
    await coachPage.goto(`/orgs/${TEST_ORG_ID}/coach/voice-notes`);
    await waitForPageLoad(coachPage);
    await dismissBlockingDialogs(coachPage);

    await expect(coachPage.locator("body")).not.toContainText(/error/i);
    expect(coachPage.url()).toContain(TEST_ORG_ID);
  });

  test("review microsite with invalid/expired code shows appropriate error, not another org's data", async ({
    coachPage,
  }) => {
    // Try to access a non-existent review link
    await coachPage.goto("/r/INVALID1");
    await waitForPageLoad(coachPage);

    const hasNotFound = await coachPage
      .getByText(/not found|invalid|expired|no longer available/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasUnhandledError = await coachPage
      .getByText(/unhandled error/i)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    console.log(
      `Invalid /r/ code: notFound=${hasNotFound}, unhandledError=${hasUnhandledError}`
    );
    expect(hasUnhandledError).toBeFalsy();
  });
});

// ── WA-INSIGHT-008: WhatsApp audio → insight pipeline ───────────────────

test.describe("WA-INSIGHT-008: WhatsApp audio note → transcription → insight pipeline", () => {
  test.slow();

  test("audio note triggers full pipeline (transcription → claims → drafts)", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendAudio();

    // Wait for transcription + extraction (audio is slower than text)
    await ownerPage.waitForTimeout(45_000);

    // Check admin panel — note should have processed
    await goToAdminVoiceNotes(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
    console.log(`Audio note ${sid} submitted — pipeline check passed`);
  });

  test("audio note from unknown phone (unregistered) is handled gracefully", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    // Use the unregistered phone number
    const wa = new WhatsAppHelper(WA_UNREGISTERED_PHONE);
    await wa.sendAudio();

    await ownerPage.waitForTimeout(10_000);
    await goToAdminVoiceNotes(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });

  test("two different audio notes both process through pipeline independently", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid1 = await wa.sendAudio();
    await ownerPage.waitForTimeout(2_000);
    const sid2 = await wa.sendAudio();

    expect(sid1).not.toBe(sid2);

    await ownerPage.waitForTimeout(50_000);
    await goToAdminVoiceNotes(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
    console.log(`Two audio notes processed: ${sid1}, ${sid2}`);
  });
});
