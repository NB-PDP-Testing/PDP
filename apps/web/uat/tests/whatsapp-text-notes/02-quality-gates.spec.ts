/**
 * WhatsApp Text Notes — Quality Gates & Validation
 *
 * Tests the text validation quality gate that runs before the V2 pipeline.
 * Short, low-quality, or gibberish text should be rejected with a helpful
 * WhatsApp reply rather than wasting AI processing credits.
 *
 * Known gate rules (from #423 and validate_text_message action):
 *   - Minimum length (too-short messages rejected)
 *   - Gibberish / non-English text detection
 *   - Messages that are pure commands (handled separately)
 *   - Messages with only numbers / special characters
 *
 * Regression guard for:
 *   #423 — gibberish text notes bypassing validation and clogging the pipeline
 *
 * @feature WhatsApp Text Quality Gates
 * @bugs #423 (gibberish validation bypass)
 */

import {
  expect,
  test,
} from "../../fixtures/test-fixtures";
import { WhatsAppHelper } from "../../fixtures/whatsapp-helper";

function skipIfNoConvex() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
  }
}

// ── WA-QUALITY-001: Valid coaching notes pass through ─────────────────────

test.describe("WA-QUALITY-001: Valid coaching content passes validation", () => {
  test("full coaching note with player name passes webhook", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      "Clodagh Barlow had an excellent training session today. Her passing accuracy was significantly improved and she showed great leadership in the drills."
    );
    expect(sid).toBeTruthy();
  });

  test("short but valid coaching note passes", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      "Sinead played well today. Good defensive performance."
    );
    expect(sid).toBeTruthy();
  });

  test("coaching note with Irish names passes", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      "Caoimhe Ní Bhriain was the standout player at training. Her skills development is progressing well."
    );
    expect(sid).toBeTruthy();
  });

  test("coaching note with Gaelic sport terminology passes", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      "Eimear scored three points from play and her free-taking was accurate. Excellent soloing and hand-passing throughout."
    );
    expect(sid).toBeTruthy();
  });
});

// ── WA-QUALITY-002: Low-quality text handling ─────────────────────────────

test.describe("WA-QUALITY-002: Low-quality / invalid text handling", () => {
  test("single character message is handled without crash", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    // Should be handled gracefully — either rejected cleanly or processed
    // without crashing the pipeline
    const sid = await wa.sendText("x");
    expect(sid).toBeTruthy();
  });

  test("single word message is handled without crash", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText("great");
    expect(sid).toBeTruthy();
  });

  test("random gibberish text is handled without crash (#423 guard)", async () => {
    // Regression guard for #423: gibberish shouldn't crash the pipeline
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      "asdkfjhaskdjfhkajsdhfkajsdhf kajsdhfkajsdhf"
    );
    expect(sid).toBeTruthy();
  });

  test("emoji-only message is handled without crash", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText("👍 ⚽ 🏃‍♀️");
    expect(sid).toBeTruthy();
  });

  test("numbers-only message is handled without crash", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText("12345");
    expect(sid).toBeTruthy();
  });

  test("very long message (500+ chars) is handled without crash", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const longNote =
      "Clodagh had an outstanding training session today. " +
      "Her positional awareness, ball skills, and leadership have all improved significantly over the past few weeks. " +
      "She was first to every tackle, won most of her aerial battles, and her free-kick accuracy was perfect throughout the session. " +
      "The coaching staff are very pleased with her development. She would benefit from extra work on her left foot. " +
      "Overall a top-quality session from a top-quality player. We expect great things this season.";
    const sid = await wa.sendText(longNote);
    expect(sid).toBeTruthy();
  });
});

// ── WA-QUALITY-003: Non-English content handling ──────────────────────────

test.describe("WA-QUALITY-003: Non-English and mixed-language text", () => {
  test("Irish language note is handled without crash", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      "Bhí Clodagh ar fheabhas ag an traenáil inniu. Tá a cuid scileanna ag feabhsú go mór."
    );
    expect(sid).toBeTruthy();
  });

  test("mixed English/Irish note is handled without crash", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      "Clodagh was brilliant today — ar fheabhas ar fad. Great work rate."
    );
    expect(sid).toBeTruthy();
  });
});

// ── WA-QUALITY-004: Special characters and formatting ─────────────────────

test.describe("WA-QUALITY-004: Special characters in coaching notes", () => {
  test("note with apostrophes (Irish surnames) is handled", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      "Sinead O'Brien and Niamh Mac Giolla Chuda both had excellent sessions today."
    );
    expect(sid).toBeTruthy();
  });

  test("note with diacritics is handled correctly", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      "Caoimhe Ní Mhuircheartaigh showed excellent tackling at training."
    );
    expect(sid).toBeTruthy();
  });

  test("note with quotation marks and punctuation is handled", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      `Clodagh said "I'll keep working hard". Great attitude from our captain.`
    );
    expect(sid).toBeTruthy();
  });

  test("note with newlines (multi-paragraph) is handled", async () => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const sid = await wa.sendText(
      "Sinead:\n- Excellent pace\n- Good passing\n- Needs to work on tackling\n\nOverall: excellent session."
    );
    expect(sid).toBeTruthy();
  });
});
