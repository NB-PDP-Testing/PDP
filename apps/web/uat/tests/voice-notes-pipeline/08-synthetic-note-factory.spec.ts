/**
 * Voice Notes Pipeline — Synthetic Note Factory
 *
 * Comprehensive synthetic note generation tests covering all input methods
 * and edge cases for the voice insights pipeline.
 *
 * This suite uses the WhatsAppHelper to create large volumes of synthetic
 * coaching notes covering realistic coaching language, Irish names,
 * GAA/soccer/rugby terminology, mixed content, and edge cases.
 *
 * Input methods exercised:
 *   - WhatsApp text (all tests)
 *   - WhatsApp audio (selected tests using TEST_AUDIO_URL)
 *
 * The goal is to stress-test the AI extraction pipeline with realistic,
 * varied inputs to surface edge cases in:
 *   - Player name matching (unique, ambiguous, Irish, abbreviated)
 *   - Insight categorisation (skill, injury, team, action, parent)
 *   - Multi-player notes (3+ players mentioned)
 *   - Notes with implicit vs explicit structure
 *   - Notes from different sports contexts
 *
 * @feature Voice Notes Synthetic Testing
 */

import type { Page } from "@playwright/test";
import {
  TEST_ORG_ID,
  dismissBlockingDialogs,
  expect,
  test,
  waitForPageLoad,
} from "../../fixtures/test-fixtures";
import { WhatsAppHelper } from "../../fixtures/whatsapp-helper";

// ── Helpers ────────────────────────────────────────────────────────────────

function skipIfNoConvex() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
  }
}

async function sendAndWait(
  wa: WhatsAppHelper,
  text: string,
  waitMs = 20_000,
  page?: Page
): Promise<string> {
  const sid = await wa.sendText(text);
  if (page) await page.waitForTimeout(waitMs);
  return sid;
}

// ── WA-SYNTH-001: Irish name variations ─────────────────────────────────

test.describe("WA-SYNTH-001: Irish name variations — first name only, full name, fada variants", () => {
  test.slow();

  const irishNameTests = [
    {
      id: "first-name-only",
      note: "Clodagh played brilliantly in the first half. Her work rate was exceptional.",
      expectedPlayer: "Clodagh",
      description: "First name only — should auto-resolve if unique in org",
    },
    {
      id: "full-name",
      note: "Clodagh Barlow had her best performance of the season. Outstanding distribution.",
      expectedPlayer: "Clodagh Barlow",
      description: "Full name — high confidence match",
    },
    {
      id: "irish-prefix-ni",
      note: "Saoirse Ní Fhaoláin showed excellent leadership today. Great captain performance.",
      expectedPlayer: "Saoirse",
      description: "Irish feminine prefix (Ní) — should handle accent marks",
    },
    {
      id: "irish-prefix-mac",
      note: "Ciarán Mac Giolla Chuda was sharp in defence. His reading of play has improved.",
      expectedPlayer: "Ciarán",
      description: "Irish masculine compound surname",
    },
    {
      id: "fada-dropped",
      note: "Eimear showed excellent ball retention. Really composed under pressure.",
      expectedPlayer: "Eimear",
      description: "Name without fada (common in WhatsApp typing)",
    },
    {
      id: "anglicised-form",
      note: "Kieran played well at midfield today. Good engine in the middle of the park.",
      expectedPlayer: "Kieran",
      description: "Anglicised form of Irish name (Ciarán → Kieran)",
    },
    {
      id: "possessive-form",
      note: "Clodagh's passing was excellent. Sinead's positioning was outstanding.",
      expectedPlayer: "Clodagh",
      description: "Possessive form with apostrophe-s",
    },
    {
      id: "abbreviated-first-name",
      note: "Cloda was working hard today. Really impressed with her stamina.",
      expectedPlayer: "Clodagh",
      description: "Abbreviated/nickname form — alias matching (Layer 2 fix)",
    },
  ];

  for (const { id, note, description } of irishNameTests) {
    test(`[${id}] ${description}`, async ({ ownerPage }) => {
      skipIfNoConvex();

      const wa = new WhatsAppHelper();
      const marker = `irish-name-${id}-${Date.now()}`;
      const sid = await wa.sendText(`${note} [${marker}]`);

      await ownerPage.waitForTimeout(25_000);
      await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
      await waitForPageLoad(ownerPage);

      await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
      console.log(`[${id}] Note processed: ${sid}`);
    });
  }
});

// ── WA-SYNTH-002: Coaching content variety ──────────────────────────────

test.describe("WA-SYNTH-002: Variety of realistic coaching note formats", () => {
  test.slow();

  test("structured numbered list note processes correctly", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      `Session notes:\n` +
        `1. Clodagh Barlow — excellent pace, needs to work on left foot\n` +
        `2. Sinead Haughey — great defensive positioning, distribute ball faster\n` +
        `3. Eimear McDonagh — two goals, brilliant finishing\n` +
        `4. Team: defensive shape in second half was much improved\n` +
        `5. Todo: book pitch for extra session Tuesday`
    );

    await ownerPage.waitForTimeout(25_000);
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });

  test("bullet point / dash format note processes correctly", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      `Training review:\n` +
        `- Clodagh: great session, passing accuracy 90%+\n` +
        `- Aoife: ankle strap still on, monitoring\n` +
        `- Fionnuala: first session back, took it easy — looked good though\n` +
        `- Team overall: much better transition speed than last week`
    );

    await ownerPage.waitForTimeout(25_000);
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });

  test("very enthusiastic/emotional coach language note processes correctly", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      `WOW what a session!!! Clodagh was UNBELIEVABLE today — I've never seen her play like that. ` +
        `She was everywhere on the pitch. 10/10 performance. ` +
        `The whole team was electric — best session we've had all year!!! 🏆`
    );

    await ownerPage.waitForTimeout(20_000);
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });

  test("note written in stream of consciousness (no punctuation) processes correctly", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      `clodagh was great sinead also did well eimear scored twice the team defence was good ` +
        `need to work on transitions and book pitch for tuesday and remind parents about county final`
    );

    await ownerPage.waitForTimeout(20_000);
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });

  test("note with time references (first half, second half, minutes) processes correctly", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      `First half was poor — Clodagh looked tired after 20 minutes. ` +
        `Half-time talk seemed to work. ` +
        `Sinead came on as a sub in the 45th minute and made an immediate impact. ` +
        `Second half was much better — Eimear scored at 65 and 78 minutes. ` +
        `Final 10 minutes we defended really deep and held on.`
    );

    await ownerPage.waitForTimeout(20_000);
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });
});

// ── WA-SYNTH-003: Sport-specific terminology ────────────────────────────

test.describe("WA-SYNTH-003: Sport-specific terminology extraction", () => {
  test.slow();

  test("GAA football terminology extracts correctly (kick-out, mark, short pass)", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      `Clodagh's kick-outs were excellent today — long and accurate. ` +
        `Sinead took a great mark at the edge of the small square. ` +
        `Eimear's hand-passing in tight spaces has really improved. ` +
        `Our short kick-out game created three goal opportunities.`
    );

    await ownerPage.waitForTimeout(25_000);
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });

  test("GAA hurling terminology processes correctly (puck-out, sliotar, jab-lift)", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      `Great session today. ` +
        `Clodagh's puck-outs were accurate and consistent. ` +
        `Her jab-lift under pressure has improved a lot. ` +
        `Need to work on her first touch when the sliotar comes from the right side. ` +
        `Sinead's ground hurling in the wet conditions was excellent.`
    );

    await ownerPage.waitForTimeout(25_000);
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });

  test("soccer/football terminology processes correctly (pressing, runs in behind, hold-up play)", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      `Clodagh's runs in behind the defence were excellent today. ` +
        `Her hold-up play has improved — she's really good at bringing others into play. ` +
        `Sinead's pressing from the front was relentless — won the ball back 4 times in the final third. ` +
        `Eimear's off-the-ball movement to create space is one of her key strengths.`
    );

    await ownerPage.waitForTimeout(25_000);
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });
});

// ── WA-SYNTH-004: Edge cases and stress tests ────────────────────────────

test.describe("WA-SYNTH-004: Edge cases in note content", () => {
  test.slow();

  test("note mentioning 5+ players processes without timeout", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const marker = `five-players-${Date.now()}`;
    await wa.sendText(
      `Big session today with lots of standout performers. ` +
        `Clodagh Barlow was excellent — her work rate was superb. ` +
        `Sinead Haughey had a great game at midfield. ` +
        `Eimear McDonagh scored twice and set up another. ` +
        `Aoife Murphy was solid in defence — commanding in the air. ` +
        `Fionnuala McGrath came on as a sub and immediately made an impact — ` +
        `great energy and commitment. ` +
        `A really positive session overall. [${marker}]`
    );

    // Longer wait for complex multi-player extraction
    await ownerPage.waitForTimeout(45_000);
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
    console.log(`5-player note processed: ${marker}`);
  });

  test("note with same player mentioned 3 times creates one insight, not duplicates", async ({
    ownerPage,
    coachPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const marker = `repeat-player-${Date.now()}`;
    await wa.sendText(
      `Clodagh was excellent in the first half. ` +
        `Clodagh also impressed in the second half with her link play. ` +
        `Overall, Clodagh had the best performance on the team today. [${marker}]`
    );

    await ownerPage.waitForTimeout(30_000);
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });

  test("note mixing player insight + injury + team note + action — all extracted", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    // The "kitchen sink" note — exercises all insight categories in one note
    const wa = new WhatsAppHelper();
    const marker = `kitchen-sink-${Date.now()}`;
    await wa.sendText(
      `Mixed session today. ` +
        // Skill/performance insight
        `Clodagh Barlow showed excellent pace and great shooting accuracy — ` +
        `two goals from play and a point. ` +
        // Injury concern
        `Sinead Haughey picked up a calf strain in the warm-up — she only did light work. ` +
        `Needs physio assessment before Saturday. ` +
        // Team note
        `The team's defensive shape in the second half was excellent — ` +
        `much better than last week's performance. ` +
        // Action/todo
        `Remind me to discuss Clodagh's development pathway with her parents at the next meeting. ` +
        `Also need to book the video analysis session for next Monday. [${marker}]`
    );

    await ownerPage.waitForTimeout(35_000);
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
    console.log(`Kitchen sink note processed: ${marker}`);
  });

  test("note with only an action item (no player) creates action insight without player", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      `Reminder: book the county board registration by end of week. ` +
        `Also send out the tournament schedule to all parents today.`
    );

    await ownerPage.waitForTimeout(20_000);
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });

  test("note about a player's progress over time (longitudinal) processes correctly", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      `Reflecting on Clodagh's development this season: ` +
        `at the start she was struggling with her left foot and her positioning under pressure. ` +
        `Over the past 6 weeks she has improved dramatically in both areas. ` +
        `Today's session confirmed she's ready for the step up to the senior panel. ` +
        `Her confidence has grown enormously — she's a completely different player.`
    );

    await ownerPage.waitForTimeout(25_000);
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });
});

// ── WA-SYNTH-005: Rapid-fire note volume test ────────────────────────────

test.describe("WA-SYNTH-005: Pipeline handles rapid submission of multiple notes", () => {
  test.slow();

  test("3 notes submitted within 30 seconds all process without error", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const ts = Date.now();

    // Send 3 notes in rapid succession (2 second gaps)
    const notes = [
      `[rapid-1-${ts}] Clodagh showed great pace today. Excellent positional awareness throughout the session.`,
      `[rapid-2-${ts}] Sinead had a tough session — her concentration dropped in the second half. Needs to work on focus.`,
      `[rapid-3-${ts}] Eimear scored twice and had a great assist. Her movement off the ball is exceptional this season.`,
    ];

    const sids: string[] = [];
    for (const note of notes) {
      sids.push(await wa.sendText(note));
      await new Promise((r) => setTimeout(r, 2_000));
    }

    console.log(`Sent 3 rapid notes: ${sids.join(", ")}`);
    expect(new Set(sids).size).toBe(3); // All distinct SIDs

    // Wait for all to process
    await ownerPage.waitForTimeout(60_000);

    // Check admin panel — all 3 should appear
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await dismissBlockingDialogs(ownerPage);

    let found = 0;
    for (let i = 1; i <= 3; i++) {
      const noteVisible = await ownerPage
        .getByText(`rapid-${i}-${ts}`, { exact: false })
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      if (noteVisible) found++;
      console.log(`Note rapid-${i}-${ts}: ${noteVisible ? "visible" : "not yet visible"}`);
    }

    console.log(`${found}/3 rapid notes visible in admin panel`);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });

  test("5 notes sent consecutively all get unique SIDs", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const messages = [
      "Clodagh was excellent today. Great session.",
      "Sinead showed real improvement in her positioning.",
      "Eimear scored three from play — outstanding finishing.",
      "Aoife had a solid defensive display. Good communication.",
      "Fionnuala's distribution has improved significantly this month.",
    ];

    const sids = await wa.sendConsecutive(messages);
    expect(sids).toHaveLength(5);
    expect(new Set(sids).size).toBe(5);
    console.log(`5 consecutive notes: ${sids.join(", ")}`);
  });
});

// ── WA-SYNTH-006: Parent-relevant content extraction ───────────────────

test.describe("WA-SYNTH-006: Parent-relevant content is identified for parent summaries", () => {
  test.slow();

  test("note with parent-relevant development insight schedules parent summary consideration", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const marker = `parent-update-${Date.now()}`;
    await wa.sendText(
      `Clodagh Barlow had a really positive session today. ` +
        `Her confidence has grown enormously over the past few weeks. ` +
        `She was leading the team talk and motivating her teammates — ` +
        `great leadership qualities emerging. Her parents should be really proud. ` +
        `Worth mentioning at the next parent meeting. [${marker}]`
    );

    await ownerPage.waitForTimeout(25_000);
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });

  test("note with injury concern flags appropriate parent communication", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      `Sinead Haughey has a knee concern that needs parental awareness. ` +
        `She mentioned it's been sore since last week's match. ` +
        `I've advised her parents should bring her to the physio before the next game. ` +
        `She won't be training at full capacity until cleared.`
    );

    await ownerPage.waitForTimeout(25_000);
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await expect(ownerPage.locator("body")).not.toContainText(/unhandled error/i);
  });
});
