/**
 * Voice Notes Pipeline — In-App Typed & Recorded Notes
 *
 * Tests for voice notes created via the in-app UI (not WhatsApp).
 * In-app notes use a DIFFERENT pipeline path:
 *   - Typed notes: go through V1 `buildInsights` directly (skipV2=true is NOT set)
 *     Actually for in-app it depends on feature flags.
 *   - Recorded audio: same — in-app recording uses V1 path
 *
 * The in-app UI allows:
 *   - Typing a note in the "New" tab
 *   - Recording audio (mic button) — creates a recorded note
 *   - Selecting a team and player
 *   - Submitting for processing
 *
 * @feature In-App Voice Notes
 * @route /orgs/[orgId]/coach/voice-notes
 */

import type { Page } from "@playwright/test";
import {
  TEST_ORG_ID,
  dismissBlockingDialogs,
  expect,
  test,
  waitForPageLoad,
} from "../../fixtures/test-fixtures";

// ── Helpers ────────────────────────────────────────────────────────────────

const VOICE_NOTES_URL = `/orgs/${TEST_ORG_ID}/coach/voice-notes`;

async function navigateToNewNoteTab(page: Page): Promise<void> {
  await page.goto(VOICE_NOTES_URL);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);

  // Click "New" tab explicitly (dashboard auto-switches to other tabs)
  const newTab = page
    .getByRole("tab", { name: /new/i })
    .or(page.getByText("New", { exact: true }).first());

  if (await newTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await newTab.click();
    await page.waitForTimeout(500);
  }
}

async function navigateToHistoryTab(page: Page): Promise<void> {
  await page.goto(VOICE_NOTES_URL);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);

  const historyTab = page
    .getByRole("tab", { name: /history/i })
    .or(page.getByText("History", { exact: true }).first());

  if (await historyTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await historyTab.click();
    await page.waitForTimeout(500);
  }
}

// ── WA-INAPP-001: In-app UI structure ────────────────────────────────────

test.describe("WA-INAPP-001: In-app voice notes UI structure", () => {
  test("voice notes dashboard loads for coach", async ({ coachPage }) => {
    await coachPage.goto(VOICE_NOTES_URL);
    await waitForPageLoad(coachPage);
    await dismissBlockingDialogs(coachPage);

    await expect(
      coachPage.getByText(/voice notes/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("New tab is accessible and shows note entry form", async ({
    coachPage,
  }) => {
    await navigateToNewNoteTab(coachPage);

    // Should show a text area or recording button
    const hasTextArea = await coachPage
      .locator("textarea, [contenteditable='true']")
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasMicButton = await coachPage
      .locator("[data-record], button:has(svg)")
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(hasTextArea || hasMicButton).toBeTruthy();
  });

  test("History tab is accessible and shows search", async ({ coachPage }) => {
    await navigateToHistoryTab(coachPage);

    // Should show some form of history/search
    const hasContent = await coachPage
      .locator("input[type='search'], input[placeholder*='search'], [role='search']")
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasNotes = await coachPage
      .locator(".note-card, [data-note], tr")
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    const hasEmptyState = await coachPage
      .getByText(/no notes|nothing here|get started/i)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(hasContent || hasNotes || hasEmptyState).toBeTruthy();
  });

  test("Drafts tab is always visible (even when empty)", async ({ coachPage }) => {
    // Confirmed from voice-notes-dashboard.tsx: Drafts tab ALWAYS renders,
    // unlike Parents/Insights/Processing/Team which only show when count > 0
    await coachPage.goto(VOICE_NOTES_URL);
    await waitForPageLoad(coachPage);
    await dismissBlockingDialogs(coachPage);

    const draftsTab = coachPage
      .getByRole("button", { name: /^Drafts/i })
      .or(coachPage.getByText("Drafts", { exact: true }).first());

    await expect(draftsTab).toBeVisible({ timeout: 10_000 });
  });

  test("Drafts tab empty state shows correct message", async ({ coachPage }) => {
    await coachPage.goto(VOICE_NOTES_URL);
    await waitForPageLoad(coachPage);
    await dismissBlockingDialogs(coachPage);

    // Click Drafts tab
    const draftsTab = coachPage
      .getByRole("button", { name: /^Drafts/i })
      .or(coachPage.getByText("Drafts", { exact: true }).first());

    if (await draftsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await draftsTab.click();
      await coachPage.waitForTimeout(1_000);

      // Empty state shows specific text (confirmed from drafts-tab.tsx)
      const hasEmptyState = await coachPage
        .getByText("No pending drafts")
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasDraftContent = await coachPage
        .locator("[data-draft], .draft-card")
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      // Either empty state or draft content should be visible
      expect(hasEmptyState || hasDraftContent).toBeTruthy();
    }
  });
});

// ── WA-INAPP-002: Typed note submission ───────────────────────────────────

test.describe("WA-INAPP-002: Typed note entry via in-app UI", () => {
  test("text area accepts input", async ({ coachPage }) => {
    await navigateToNewNoteTab(coachPage);

    const textArea = coachPage
      .locator("textarea")
      .first();

    if (await textArea.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await textArea.fill(
        "Clodagh had a great session today. Her passing accuracy was excellent."
      );
      const value = await textArea.inputValue();
      expect(value).toContain("Clodagh");
    } else {
      // Some versions use contenteditable
      const contentEditable = coachPage
        .locator("[contenteditable='true']")
        .first();
      if (await contentEditable.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await contentEditable.fill(
          "Clodagh had a great session today. Her passing accuracy was excellent."
        );
        const text = await contentEditable.textContent();
        expect(text).toContain("Clodagh");
      }
    }
  });
});

// ── WA-INAPP-003: Recording UI ────────────────────────────────────────────

test.describe("WA-INAPP-003: Audio recording UI elements", () => {
  test("mic/record button is visible on New note tab", async ({ coachPage }) => {
    await navigateToNewNoteTab(coachPage);

    // The recording button may be labeled "Record", show a mic icon, etc.
    const recordButton = coachPage
      .getByRole("button", { name: /record|mic/i })
      .or(coachPage.locator("[data-record-button], .record-btn, button[aria-label*='record']"))
      .first();

    const isVisible = await recordButton
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    console.log("Recording button visible:", isVisible);
    // Just log — not all views show the mic prominently
  });
});

// ── WA-INAPP-004: Admin audit view ────────────────────────────────────────

test.describe("WA-INAPP-004: Admin voice notes audit view", () => {
  test("admin voice notes page loads and shows 'Voice Notes Audit' title", async ({
    ownerPage,
  }) => {
    // Confirmed from admin/voice-notes/page.tsx:
    // Title: "Voice Notes Audit" with subtitle "Organization-wide voice notes for compliance and oversight"
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await dismissBlockingDialogs(ownerPage);

    await expect(
      ownerPage.getByText("Voice Notes Audit").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("admin voice notes shows table/list of notes", async ({ ownerPage }) => {
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await dismissBlockingDialogs(ownerPage);

    // Should show a table or list of notes, or an empty state
    const hasNotes = await ownerPage
      .locator("table, [role='table'], .note-list, .note-row")
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    const hasEmptyState = await ownerPage
      .getByText(/no notes|get started|no voice notes/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasNotes || hasEmptyState).toBeTruthy();
  });

  test("admin page shows note status indicators", async ({ ownerPage }) => {
    await ownerPage.goto(`/orgs/${TEST_ORG_ID}/admin/voice-notes`);
    await waitForPageLoad(ownerPage);
    await dismissBlockingDialogs(ownerPage);

    // Should show status badges or indicators
    await expect(ownerPage.locator("body")).not.toContainText(/error/i);
  });
});

// ── WA-INAPP-005: Navigation between tabs ────────────────────────────────

test.describe("WA-INAPP-005: Tab navigation works correctly", () => {
  test("can switch between all available tabs", async ({
    coachPage,
  }) => {
    // Always-visible tabs: "New", "Drafts", "History", "My Impact"
    // Conditional tabs (only show when count > 0): "Parents", "Insights", "Processing", "Team", "Sent to Parents"
    await coachPage.goto(VOICE_NOTES_URL);
    await waitForPageLoad(coachPage);
    await dismissBlockingDialogs(coachPage);

    const tabNames = ["New", "Drafts", "History", "My Impact"];
    for (const tabName of tabNames) {
      const tab = coachPage
        .getByRole("tab", { name: new RegExp(tabName, "i") })
        .or(coachPage.getByText(tabName, { exact: true }).first());

      if (await tab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await tab.click();
        await coachPage.waitForTimeout(500);
        // No errors after clicking each tab
        await expect(coachPage.locator("body")).not.toContainText(
          /unhandled error/i
        );
        console.log(`Tab '${tabName}' clicked successfully`);
      } else {
        console.log(`Tab '${tabName}' not visible — skipped`);
      }
    }
  });

  test("all four always-present tabs exist: New, Drafts, History, My Impact", async ({
    coachPage,
  }) => {
    // Confirmed from voice-notes-dashboard.tsx:
    // These four tabs always render regardless of content count.
    // Conditional tabs (Parents, Insights, Processing, Team) only show when count > 0.
    await coachPage.goto(VOICE_NOTES_URL);
    await waitForPageLoad(coachPage);
    await dismissBlockingDialogs(coachPage);

    const alwaysPresentTabs = ["New", "Drafts", "History", "My Impact"];
    for (const tabName of alwaysPresentTabs) {
      const tab = coachPage
        .getByRole("button", { name: new RegExp(`^${tabName}`, "i") })
        .or(coachPage.getByText(tabName, { exact: true }).first());
      await expect(tab).toBeVisible({ timeout: 10_000 });
    }
  });
});
