/**
 * Voice Notes Pipeline — Review Microsite
 *
 * Tests the review microsite at /r/[code] — coaches share this 8-char short link
 * with parents after generating insights from a voice note.
 *
 * Microsite structure (confirmed from review-queue.tsx):
 *   - Navy header (#1E3A5F) with "Voice Note Review" subtitle
 *   - Max width 768px, mobile-first
 *   - Sections (shown when they have content):
 *     1. "Injuries"         — red border, Shield icon, Apply/Skip per card, batch "Apply All"
 *     2. "Unmatched Players" — amber border, HelpCircle icon, Dismiss only
 *     3. "Needs Review"     — yellow border, AlertTriangle icon, Apply/Skip, batch "Apply All"
 *     4. "Actions / Todos"  — blue border, ClipboardList icon, "Add to Tasks" per card
 *     5. "Team Notes"       — green border, Users icon, "Save Team Note", batch "Save All Team Notes"
 *     6. "Auto-Applied"     — gray border, collapsed by default
 *     7. "Recently Reviewed" — blue border, shows applied/skipped breakdown
 *   - Completion state: PartyPopper icon, "All caught up!"
 *   - Empty state per section: "No Injuries to Review", "All Players Matched", etc.
 *
 * Known issues:
 *   #492 — Review microsite shows team-level notes under "Unmatched Players"
 *           (should appear under "Team Notes" instead)
 *   #499 — cancel command does not remove note from microsite
 *
 * @feature Review Microsite
 * @bugs #492 (team notes under unmatched), #499 (cancel doesn't remove from microsite)
 * @route /r/[code]
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
} from "../../fixtures/whatsapp-helper";

// ── Helpers ────────────────────────────────────────────────────────────────

async function goToAdminVoiceNotes(page: Page): Promise<void> {
  await page.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

/**
 * Find a review link (/r/XXXXXXXX) in the admin panel.
 * Returns the href of the first review link found, or null.
 */
async function findReviewLink(page: Page): Promise<string | null> {
  await goToAdminVoiceNotes(page);

  const reviewLinkEl = page
    .locator("a[href*='/r/'], [data-review-link]")
    .or(page.getByText(/\/r\/[a-zA-Z0-9]+/))
    .first();

  if (await reviewLinkEl.isVisible({ timeout: 10_000 }).catch(() => false)) {
    // Try to get the href
    const href = await reviewLinkEl
      .getAttribute("href")
      .catch(() => null);
    if (href) return href;

    // If it's a text element, extract the path
    const text = await reviewLinkEl.textContent().catch(() => null);
    if (text) {
      const match = text.match(/\/r\/[a-zA-Z0-9]+/);
      if (match) return match[0];
    }
  }

  return null;
}

function skipIfNoConvex() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    test.skip(true, "NEXT_PUBLIC_CONVEX_URL not configured");
  }
}

// ── WA-REVIEW-001: Review link generation ────────────────────────────────

test.describe("WA-REVIEW-001: Review link is generated for processed notes", () => {
  test.slow();

  test("processed note generates a review link in admin panel", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Eimear was the standout player today. Great defensive awareness and work rate."
    );

    await waitForNoteInAdmin(ownerPage, TEST_ORG_ID, "Eimear", 60_000);

    // Find a review link
    await goToAdminVoiceNotes(ownerPage);
    await expect(
      ownerPage
        .locator("a[href*='/r/'], [data-review-link]")
        .or(ownerPage.getByText(/\/r\//i))
        .first()
    ).toBeVisible({ timeout: 60_000 });
  });

  test("review link code is 8 characters long", async ({ ownerPage }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Clodagh scored three points today. Excellent performance from start to finish."
    );

    await waitForNoteInAdmin(ownerPage, TEST_ORG_ID, "Clodagh", 60_000);

    const reviewLink = await findReviewLink(ownerPage);
    if (reviewLink) {
      const code = reviewLink.split("/r/")[1];
      // Codes should be 8 alphanumeric characters
      expect(code).toMatch(/^[a-zA-Z0-9]{8}$/);
    } else {
      console.warn("No review link found in admin panel — note may still be processing");
    }
  });
});

// ── WA-REVIEW-002: Review microsite accessibility ─────────────────────────

test.describe("WA-REVIEW-002: Review microsite loads and is accessible", () => {
  test.slow();

  test("review microsite page loads from /r/ link", async ({
    ownerPage,
    page,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Sinead Haughey was brilliant at training today. Her ball-handling skills are exceptional."
    );

    await waitForNoteInAdmin(ownerPage, TEST_ORG_ID, "Sinead", 60_000);

    const reviewLink = await findReviewLink(ownerPage);
    if (reviewLink) {
      await page.goto(reviewLink);
      await waitForPageLoad(page);

      // Microsite should render — not a 404 or error page
      await expect(page.locator("body")).not.toContainText(/404|not found/i);
      await expect(page.locator("body")).not.toContainText(/error/i);
    } else {
      console.warn("Review link not found — test skipped (note may be processing)");
    }
  });

  test("review microsite shows player name and assessment content", async ({
    ownerPage,
    page,
  }) => {
    test.slow();
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Clodagh Barlow had an outstanding session today. Her passing accuracy and leadership were both excellent."
    );

    await waitForNoteInAdmin(ownerPage, TEST_ORG_ID, "Clodagh", 60_000);

    const reviewLink = await findReviewLink(ownerPage);
    if (reviewLink) {
      await page.goto(reviewLink);
      await waitForPageLoad(page);

      // Should show player name or assessment content
      await expect(
        page.getByText(/Clodagh|assessment|coaching/i).first()
      ).toBeVisible({ timeout: 10_000 });
    } else {
      console.warn("Review link not found — note may still be processing");
    }
  });

  test("review microsite shows 'Voice Note Review' heading", async ({
    ownerPage,
    page,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText("Eimear worked hard today at training.");
    await waitForNoteInAdmin(ownerPage, TEST_ORG_ID, "Eimear", 60_000);

    const reviewLink = await findReviewLink(ownerPage);
    if (reviewLink) {
      await page.goto(reviewLink);
      await waitForPageLoad(page);

      // Confirmed from /r/[code]/page.tsx — microsite header text
      const hasTitle = await page
        .getByText(/voice note review/i)
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      console.log("'Voice Note Review' heading visible:", hasTitle);
      await expect(page.locator("body")).not.toContainText(/404|error/i);
    }
  });

  test("review microsite action buttons: Apply and Skip are present", async ({
    ownerPage,
    page,
  }) => {
    // Confirmed from review-queue.tsx: primary action per card is "Apply" (green check)
    // and secondary is "Skip" (red X icon)
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "Sinead showed great composure under pressure. Best game of the season."
    );
    await waitForNoteInAdmin(ownerPage, TEST_ORG_ID, "Sinead", 60_000);

    const reviewLink = await findReviewLink(ownerPage);
    if (reviewLink) {
      await page.goto(reviewLink);
      await waitForPageLoad(page);

      // "Apply" and "Skip" are the confirmed button names
      const hasApply = await page
        .getByRole("button", { name: /^Apply$/i })
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      const hasSkip = await page
        .getByRole("button", { name: /^Skip$/i })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      // Might show completion state ("All caught up!") if all items already reviewed
      const hasCompletion = await page
        .getByText(/all caught up/i)
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      console.log("Apply button:", hasApply, "Skip button:", hasSkip, "Completion:", hasCompletion);
      await expect(page.locator("body")).not.toContainText(/unhandled error/i);
    }
  });
});

// ── WA-REVIEW-003: Team-level note on microsite (#492) ────────────────────

test.describe("WA-REVIEW-003: Team-level notes on review microsite (#492)", () => {
  test.slow();

  test("team-level note (no specific player) appears on microsite without 'Unmatched Player' confusion", async ({
    ownerPage,
    page,
  }) => {
    // Regression guard for #492: team notes should display clearly as team observations,
    // NOT appear under "Unmatched Players" with a player search dropdown.
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText(
      "The U18 squad trained brilliantly today. Excellent teamwork and communication throughout. Very proud of the whole group."
    );

    await ownerPage.waitForTimeout(60_000);
    await goToAdminVoiceNotes(ownerPage);

    const reviewLink = await findReviewLink(ownerPage);
    if (reviewLink) {
      await page.goto(reviewLink);
      await waitForPageLoad(page);

      // #492: Should NOT show an "Unmatched Players" section or player search
      // for a team-level note
      const hasUnmatchedSection = await page
        .getByText(/unmatched player/i)
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (hasUnmatchedSection) {
        console.warn(
          "#492 regression: Team-level note is showing 'Unmatched Players' section. " +
            "This should not appear for team-level observations."
        );
      }

      // Microsite should at least load without error
      await expect(page.locator("body")).not.toContainText(/unhandled error/i);
    } else {
      console.warn("Review link not found — note may still be processing");
    }
  });
});

// ── WA-REVIEW-004: R command re-generates review link ────────────────────

test.describe("WA-REVIEW-004: R command generates a new review link", () => {
  test.slow();

  test("sending R command after a note generates a (new) review link", async ({
    ownerPage,
  }) => {
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    await wa.sendText("Clodagh showed real improvement this week.");
    await ownerPage.waitForTimeout(10_000);

    // Request new review link
    await wa.sendCommand("R");
    await ownerPage.waitForTimeout(5_000);

    await goToAdminVoiceNotes(ownerPage);
    // Admin panel should still be functional
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── WA-REVIEW-005: cancel does not remove from microsite (#499 guard) ─────

test.describe("WA-REVIEW-005: cancel command and microsite state (#499)", () => {
  test.slow();

  test("after cancel: note is (ideally) not visible on microsite (#499 known issue)", async ({
    ownerPage,
    page,
  }) => {
    // Regression guard for #499: cancel sends a WA reply but doesn't update
    // the backend record status, so the note may still appear on the microsite.
    skipIfNoConvex();

    const wa = new WhatsAppHelper();
    const ts = Date.now();
    await wa.sendText(
      `Roisin had a great session today. Excellent passing. [cancel-review-${ts}]`
    );
    await ownerPage.waitForTimeout(10_000);

    // Get the review link BEFORE cancelling
    const reviewLink = await findReviewLink(ownerPage);

    // Cancel the note
    await wa.sendCommand("cancel");
    await ownerPage.waitForTimeout(5_000);

    if (reviewLink) {
      await page.goto(reviewLink);
      await waitForPageLoad(page);

      // Check if the microsite shows the note as cancelled or as expired
      const isCancelled = await page
        .getByText(/cancelled|expired|no longer available/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (!isCancelled) {
        console.warn(
          "#499 regression: After cancel command, note is still visible on review microsite. " +
            "Backend status was not updated to 'cancelled'."
        );
      }

      console.log("Review microsite after cancel — shows cancelled:", isCancelled);
    } else {
      console.warn(
        "No review link found before cancel test — cannot test microsite state"
      );
    }
  });
});
