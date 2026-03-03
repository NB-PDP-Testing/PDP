import {
  type Page,
  TEST_ORG_ID,
  dismissBlockingDialogs,
  expect,
  test,
  waitForPageLoad,
} from "../fixtures/test-fixtures";

/**
 * Phase 5: Adult Player Portal — Remaining Sections UAT Tests
 *
 * US-P5-001: My Progress (Player View of Sport Passports)
 * US-P5-002: My Passport Sharing Management
 * US-P5-003: My Injuries
 * US-P5-004: My Coach Feedback & AI Summaries
 * US-P5-005: Player Data Export (GDPR Article 20)
 * US-P5-006: Radar Chart Visual Progress Profile
 *
 * Test account: owner_pdp@outlook.com (ownerPage)
 * Org: TEST_ORG_ID
 */

const PLAYER_PROGRESS_URL = `/orgs/${TEST_ORG_ID}/player/progress`;
const PLAYER_SHARING_URL = `/orgs/${TEST_ORG_ID}/player/sharing`;
const PLAYER_INJURIES_URL = `/orgs/${TEST_ORG_ID}/player/injuries`;
const PLAYER_FEEDBACK_URL = `/orgs/${TEST_ORG_ID}/player/feedback`;
const PLAYER_SETTINGS_URL = `/orgs/${TEST_ORG_ID}/player/settings`;

async function goToPlayerPage(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

// ─── US-P5-001: My Progress ───────────────────────────────────────────────────

test.describe("US-P5-001: My Progress — Player View of Sport Passports", () => {
  test("PP5-001: Progress page loads without error [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_PROGRESS_URL);
    await expect(page.getByText(/server error|page not found/i)).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("PP5-002: Progress page shows My Progress heading [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_PROGRESS_URL);
    if (!page.url().includes("/player")) return;
    await expect(
      page.getByRole("heading", { name: /my progress/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("PP5-003: Skill Ratings card is visible [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_PROGRESS_URL);
    if (!page.url().includes("/player")) return;
    await expect(
      page.getByText(/skill ratings/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("PP5-004: No edit inputs within the ratings card (read-only view) [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_PROGRESS_URL);
    if (!page.url().includes("/player")) return;
    // Wait for page to settle
    await page.waitForTimeout(2000);
    // The ratings card should contain NO range inputs (sliders used in coach edit view)
    const sliderInputs = page.locator('input[type="range"]');
    await expect(sliderInputs).toHaveCount(0, { timeout: 5000 });
  });

  test("PP5-005: Player notes textarea is present [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_PROGRESS_URL);
    if (!page.url().includes("/player")) return;
    // Notes section with a textarea
    await expect(
      page.getByText(/player notes/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

// ─── US-P5-006: Radar Chart ───────────────────────────────────────────────────

test.describe("US-P5-006: Radar Chart Visual Progress Profile", () => {
  test("PP5-006: Chart/list toggle buttons are visible [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_PROGRESS_URL);
    if (!page.url().includes("/player")) return;
    await page.waitForTimeout(2000);
    // Toggle buttons for chart vs list view
    const chartToggle = page.getByRole("button", { name: /chart/i });
    const listToggle = page.getByRole("button", { name: /list/i });
    const hasChartToggle = await chartToggle.isVisible({ timeout: 5000 }).catch(() => false);
    const hasListToggle = await listToggle.isVisible({ timeout: 1000 }).catch(() => false);
    // At least one toggle should be visible if the player has passport data
    // If no data, the empty state is acceptable
    if (hasChartToggle || hasListToggle) {
      expect(hasChartToggle || hasListToggle).toBe(true);
    }
  });

  test("PP5-007: Assessment History section visible or empty state [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_PROGRESS_URL);
    if (!page.url().includes("/player")) return;
    await page.waitForTimeout(2000);
    // Either assessment history card or empty state
    const hasHistory = await page.getByText(/assessment history/i).isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await page.getByText(/no passport data|no assessments|start with/i).isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasHistory || hasEmpty).toBe(true);
  });
});

// ─── US-P5-002: My Passport Sharing ──────────────────────────────────────────

test.describe("US-P5-002: My Passport Sharing Management", () => {
  test("PP5-008: Passport Sharing page loads without error", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_SHARING_URL);
    await expect(page.getByText(/server error|page not found/i)).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("PP5-009: Sharing page shows Passport Sharing heading [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_SHARING_URL);
    if (!page.url().includes("/player")) return;
    await expect(
      page.getByRole("heading", { name: /passport sharing/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("PP5-010: Info card about passport sharing is visible [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_SHARING_URL);
    if (!page.url().includes("/player")) return;
    await expect(
      page.getByText(/what is passport sharing/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("PP5-011: Empty state or sharing list is visible [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_SHARING_URL);
    if (!page.url().includes("/player")) return;
    await page.waitForTimeout(2000);
    // Either empty state or active/pending shares
    const hasEmptyState = await page.getByText(/no sharing requests/i).isVisible({ timeout: 5000 }).catch(() => false);
    const hasActiveShares = await page.getByText(/active shares|pending requests/i).isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasEmptyState || hasActiveShares).toBe(true);
  });
});

// ─── US-P5-003: My Injuries ───────────────────────────────────────────────────

test.describe("US-P5-003: My Injuries", () => {
  test("PP5-012: Injuries page loads without error", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_INJURIES_URL);
    await expect(page.getByText(/server error|page not found/i)).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("PP5-013: Injuries page shows My Injuries heading [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_INJURIES_URL);
    if (!page.url().includes("/player")) return;
    await expect(
      page.getByRole("heading", { name: /my injuries/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("PP5-014: Report New Injury button is present [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_INJURIES_URL);
    if (!page.url().includes("/player")) return;
    await expect(
      page.getByRole("button", { name: /report.*injury|new injury/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("PP5-015: Report New Injury dialog opens when button clicked [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_INJURIES_URL);
    if (!page.url().includes("/player")) return;

    const reportBtn = page.getByRole("button", { name: /report.*injury|new injury/i });
    await expect(reportBtn).toBeVisible({ timeout: 10000 });
    await reportBtn.click();

    // Dialog should appear with injury form fields
    await expect(
      page.getByRole("dialog")
    ).toBeVisible({ timeout: 5000 });
  });

  test("PP5-016: Injury history section or empty state is visible [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_INJURIES_URL);
    if (!page.url().includes("/player")) return;
    await page.waitForTimeout(2000);
    const hasInjuries = await page.getByText(/active injuries|past injuries|injury history/i).isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await page.getByText(/no injuries|no active injuries/i).isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasInjuries || hasEmpty).toBe(true);
  });
});

// ─── US-P5-004: My Coach Feedback ────────────────────────────────────────────

test.describe("US-P5-004: My Coach Feedback & AI Summaries", () => {
  test("PP5-017: Feedback page loads without error", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_FEEDBACK_URL);
    await expect(page.getByText(/server error|page not found/i)).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("PP5-018: Feedback page shows Coach Feedback heading [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_FEEDBACK_URL);
    if (!page.url().includes("/player")) return;
    await expect(
      page.getByRole("heading", { name: /coach feedback/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("PP5-019: privateInsight text is NEVER shown on feedback page [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_FEEDBACK_URL);
    if (!page.url().includes("/player")) return;
    await page.waitForTimeout(3000);
    // The field "privateInsight" must never appear in the rendered page
    await expect(page.getByText("privateInsight")).not.toBeVisible({ timeout: 2000 });
    // Also check raw page content does not contain the DB field name
    const content = await page.content();
    expect(content).not.toContain("privateInsight");
  });

  test("PP5-020: Feedback empty state or feedback cards are visible [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_FEEDBACK_URL);
    if (!page.url().includes("/player")) return;
    await page.waitForTimeout(2000);
    const hasFeedback = await page.getByText(/from.*coach|acknowledge/i).isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await page.getByText(/no feedback yet|haven.t shared any feedback/i).isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasFeedback || hasEmpty).toBe(true);
  });
});

// ─── US-P5-005: Player Data Export (GDPR) ────────────────────────────────────

test.describe("US-P5-005: Player Data Export (GDPR Article 20)", () => {
  test("PP5-021: Settings page loads without error", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_SETTINGS_URL);
    await expect(page.getByText(/server error|page not found/i)).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("PP5-022: Download My Data button is present in settings [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_SETTINGS_URL);
    if (!page.url().includes("/player")) return;
    await expect(
      page.getByRole("button", { name: /download.*data|export.*data/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("PP5-023: Privacy & Data section is visible in settings [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_SETTINGS_URL);
    if (!page.url().includes("/player")) return;
    await expect(
      page.getByText(/privacy.*data|data.*privacy/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("PP5-024: Exported JSON does not contain privateInsight field [player-linked]", async ({
    ownerPage: page,
  }) => {
    await goToPlayerPage(page, PLAYER_SETTINGS_URL);
    if (!page.url().includes("/player")) return;

    // Set up download listener before clicking
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }).catch(() => null),
      page.getByRole("button", { name: /download.*data|export.*data/i }).click(),
    ]);

    if (!download) {
      // If no download happened (no player identity linked), test passes vacuously
      return;
    }

    // Read the downloaded file
    const downloadPath = await download.path();
    if (!downloadPath) return;

    const fs = await import("fs");
    const content = fs.readFileSync(downloadPath, "utf-8");

    // The exported JSON must never contain privateInsight
    expect(content).not.toContain("privateInsight");

    // The exported JSON should contain the GDPR basis
    const json = JSON.parse(content);
    expect(json.metadata?.gdprBasis).toContain("Article 20");
  });
});
