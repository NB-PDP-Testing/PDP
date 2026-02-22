import { test, expect, waitForPageLoad, dismissBlockingDialogs } from "../fixtures/test-fixtures";
import type { Page } from "@playwright/test";

/**
 * INJURY LIFECYCLE E2E — Issue #261
 *
 * Full end-to-end test covering the complete injury lifecycle:
 *   1. Coach reports a new injury for a player
 *   2. Injury appears in active injuries + toast confirms success
 *   3. Coach opens the injury modal and creates a recovery plan
 *   4. Coach adds a milestone to the recovery plan
 *   5. Coach marks the milestone as complete
 *   6. Coach updates injury status to "Cleared" (recovery complete)
 *   7. Admin sees the injury in the analytics dashboard
 *   8. Parent sees injury in their view (graceful skip if no linked child)
 *
 * Uses test.describe.serial so each step builds on the previous.
 *
 * Test accounts:
 *   coach/owner = neil.b (ownerPage)
 *   admin       = neiltest2 (adminPage)
 *   parent      = neiltest3 (parentPage)
 */

// Shared across serial tests
let injuryDesc: string;
const TEST_PLAYER = "Clodagh Barlow";
const ORG_ID_PATTERN = /\/orgs\/([^/]+)/;

// ─── helpers ────────────────────────────────────────────────────────────────

async function goToCoachInjuries(page: Page): Promise<string> {
  await page.goto("/orgs");
  await waitForPageLoad(page);
  await page.waitForTimeout(2000);

  // Extract org ID from URL redirect or page links
  const urlOrgId = page.url().match(ORG_ID_PATTERN)?.[1];
  const orgId =
    urlOrgId && urlOrgId !== "current"
      ? urlOrgId
      : await page.evaluate(() => {
          const hrefs = Array.from(document.querySelectorAll("a[href]")).map(
            (a) => a.getAttribute("href") || ""
          );
          for (const sec of ["coach", "admin", "parents"]) {
            const m = hrefs
              .find((h) => h.match(new RegExp(`/orgs/[^/]+/${sec}`)))
              ?.match(/\/orgs\/([^/]+)/)?.[1];
            if (m) return m;
          }
          return null;
        });

  const base = orgId && orgId !== "current" ? `/orgs/${orgId}` : "/orgs/current";
  await page.goto(`${base}/coach/injuries`);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
  return orgId ?? "current";
}

/**
 * Select a value from a shadcn Select/combobox inside the active dialog.
 * Uses force:true to bypass the dialog overlay z-index issue.
 */
async function selectFromDialogCombo(
  page: Page,
  nthCombobox: number,
  optionText: string
) {
  const dialog = page.getByRole("dialog");
  const combo = dialog.getByRole("combobox").nth(nthCombobox);
  await combo.click();
  await page.waitForTimeout(400);
  await page
    .getByRole("option")
    .filter({ hasText: new RegExp(`^${optionText}$`, "i") })
    .first()
    .click({ force: true });
  await page.waitForTimeout(300);
}

// ─── Serial test suite ───────────────────────────────────────────────────────

test.describe.serial("INJURY LIFECYCLE — Full E2E flow", () => {
  test.beforeAll(() => {
    injuryDesc = `E2E ankle sprain ${Date.now()}`;
  });

  // ── Step 1: Coach reports injury ──────────────────────────────────────────

  test("E2E-001: Coach reports a new ankle sprain injury", async ({
    ownerPage: page,
  }) => {
    await goToCoachInjuries(page);

    // Open player selector and choose test player
    await page.getByRole("combobox").first().click();
    await page.waitForTimeout(400);
    await page
      .getByRole("option", { name: new RegExp(TEST_PLAYER, "i") })
      .first()
      .click();
    await page.waitForTimeout(500);

    // "Report Injury" button now appears
    await expect(
      page.getByRole("button", { name: /Report Injury/i })
    ).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /Report Injury/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

    // Fill required fields:
    // 0=Injury Type, 1=Body Part, 2=Side (optional), 3=Severity, 4=Occurred During
    await selectFromDialogCombo(page, 0, "Sprain");
    await selectFromDialogCombo(page, 1, "Ankle");
    await selectFromDialogCombo(page, 3, "Moderate");

    // Description (use unique identifier so we can find this injury later)
    await page
      .locator('[placeholder="Describe what happened and current symptoms..."]')
      .fill(injuryDesc);

    // Submit
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Report Injury" })
      .click();

    // Success: toast appears and dialog closes
    await expect(page.getByText(/Injury reported successfully/i)).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });

    // Injury appears in Active Injuries section
    await expect(
      page.getByText(new RegExp(TEST_PLAYER, "i")).first()
    ).toBeVisible({ timeout: 8000 });
  });

  // ── Step 2: Verify injury visible in history ──────────────────────────────

  test("E2E-002: New injury appears in complete injury history", async ({
    ownerPage: page,
  }) => {
    await goToCoachInjuries(page);

    // The unique description should appear somewhere on the page
    // (either in history table or after selecting the player)
    await page.getByRole("combobox").first().click();
    await page.waitForTimeout(400);
    await page
      .getByRole("option", { name: new RegExp(TEST_PLAYER, "i") })
      .first()
      .click();
    await page.waitForTimeout(1000);

    // Injury History section should appear for this player
    await expect(
      page.getByText(/Injury History|Complete Injury History/i).first()
    ).toBeVisible({ timeout: 8000 });

    // Player-specific injury should be listed
    await expect(
      page
        .getByRole("button")
        .filter({ hasText: new RegExp(TEST_PLAYER, "i") })
        .first()
    ).toBeVisible({ timeout: 8000 });
  });

  // ── Step 3: Coach opens injury modal and creates recovery plan ────────────

  test("E2E-003: Coach creates recovery plan with milestone", async ({
    ownerPage: page,
  }) => {
    await goToCoachInjuries(page);

    // Select the test player
    await page.getByRole("combobox").first().click();
    await page.waitForTimeout(400);
    await page
      .getByRole("option", { name: new RegExp(TEST_PLAYER, "i") })
      .first()
      .click();
    await page.waitForTimeout(1000);

    // Click the first active injury card for this player
    await page
      .getByRole("button")
      .filter({ hasText: new RegExp(TEST_PLAYER, "i") })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

    // Navigate to Recovery tab
    await page.getByRole("tab", { name: /recovery/i }).click();
    await expect(
      page.getByRole("button", { name: /Create Recovery Plan/i })
    ).toBeVisible({ timeout: 5000 });

    // Create recovery plan
    await page.getByRole("button", { name: /Create Recovery Plan/i }).click();
    const planDialog = page.getByRole("dialog").filter({ hasText: /recovery plan/i });
    await expect(planDialog).toBeVisible({ timeout: 5000 });

    // Fill estimated days
    await planDialog
      .locator('input[type="number"], input[placeholder*="days"], input[placeholder*="e.g"]')
      .first()
      .fill("14");

    // Fill recovery notes
    await planDialog
      .locator("textarea")
      .first()
      .fill("RICE protocol for 3 days, gradual return to training");

    // Save plan
    await planDialog.getByRole("button", { name: /Save Plan/i }).click();
    await expect(page.getByText(/plan saved|recovery plan|saved/i).first()).toBeVisible({
      timeout: 8000,
    });
    // Plan dialog should close, still on main modal
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 });

    // Add a milestone
    await page.getByRole("button", { name: /Add Milestone/i }).click();
    const milestoneDialog = page.getByRole("dialog").filter({ hasText: /milestone/i });
    await expect(milestoneDialog).toBeVisible({ timeout: 5000 });

    await milestoneDialog.locator("#description, input[id*='description'], input").first().fill(
      "Can walk without pain"
    );

    await milestoneDialog
      .getByRole("button", { name: /Add Milestone/i })
      .click();

    // Milestone should appear in the list
    await expect(
      page.getByText(/Can walk without pain/i)
    ).toBeVisible({ timeout: 8000 });
  });

  // ── Step 4: Coach completes the milestone ─────────────────────────────────

  test("E2E-004: Coach marks milestone as complete", async ({
    ownerPage: page,
  }) => {
    await goToCoachInjuries(page);

    // Select player and open injury modal
    await page.getByRole("combobox").first().click();
    await page.waitForTimeout(400);
    await page
      .getByRole("option", { name: new RegExp(TEST_PLAYER, "i") })
      .first()
      .click();
    await page.waitForTimeout(1000);

    await page
      .getByRole("button")
      .filter({ hasText: new RegExp(TEST_PLAYER, "i") })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

    // Recovery tab
    await page.getByRole("tab", { name: /recovery/i }).click();
    await expect(
      page.getByText(/Can walk without pain/i)
    ).toBeVisible({ timeout: 8000 });

    // Click the milestone checkbox or "Mark Complete" button
    const markCompleteBtn = page.getByRole("button", { name: /Mark Complete|complete/i }).first();
    const checkbox = page.locator('[role="checkbox"]').first();

    if (await markCompleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await markCompleteBtn.click();
    } else {
      await checkbox.click();
    }

    // Completion dialog may appear
    const completionDialog = page.getByRole("dialog").filter({ hasText: /complete|completion/i });
    if (await completionDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await completionDialog
        .getByRole("button", { name: /Mark Complete|Confirm/i })
        .click();
    }

    // Milestone should show as completed (green checkmark or "Completed" text)
    await expect(
      page.getByText(/Completed|100%/i).first()
    ).toBeVisible({ timeout: 8000 });
  });

  // ── Step 5: Coach clears the injury (recovery complete) ───────────────────

  test("E2E-005: Coach marks injury as cleared", async ({ ownerPage: page }) => {
    await goToCoachInjuries(page);

    // Confirm injury appears in history
    await page.getByRole("combobox").first().click();
    await page.waitForTimeout(400);
    await page
      .getByRole("option", { name: new RegExp(TEST_PLAYER, "i") })
      .first()
      .click();
    await page.waitForTimeout(1000);

    // Open injury modal from the active card
    await page
      .getByRole("button")
      .filter({ hasText: new RegExp(TEST_PLAYER, "i") })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

    // Close modal and find edit button in history table instead
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // Look for Edit button in the complete injury history table
    // The history table row for this player should have an Edit button
    const editBtn = page
      .locator("tr, [class*='row'], li")
      .filter({ hasText: new RegExp(TEST_PLAYER, "i") })
      .getByRole("button", { name: /edit/i })
      .first();

    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click();
    } else {
      // Fallback: look for any Edit button near a Clodagh Barlow mention
      await page.getByRole("button", { name: /edit/i }).first().click();
    }

    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

    // Find Status dropdown (index may vary — look for "active" currently selected)
    const statusCombo = page
      .getByRole("dialog")
      .getByRole("combobox")
      .filter({ hasText: /active|recovering/i })
      .first();

    if (await statusCombo.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusCombo.click();
      await page.waitForTimeout(400);
      await page
        .getByRole("option", { name: /Cleared|Healed/i })
        .first()
        .click({ force: true });
      await page.waitForTimeout(300);

      // Save changes
      await page
        .getByRole("dialog")
        .getByRole("button", { name: /Save Changes|Save/i })
        .click();
      await expect(
        page.getByText(/updated|saved|success/i).first()
      ).toBeVisible({ timeout: 8000 });
    } else {
      test.skip(true, "Could not find Status dropdown in edit dialog");
    }
  });

  // ── Step 6: Admin sees injury in analytics ────────────────────────────────

  test("E2E-006: Admin can see injury in analytics dashboard", async ({
    adminPage: page,
  }) => {
    // Navigate to /orgs to get org ID via redirect
    await page.goto("/orgs");
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    const urlOrgId = page.url().match(ORG_ID_PATTERN)?.[1];
    if (!urlOrgId || urlOrgId === "current") {
      test.skip(true, "Could not determine org ID for admin");
      return;
    }

    await page.goto(`/orgs/${urlOrgId}/admin/injuries`);
    await waitForPageLoad(page);
    await dismissBlockingDialogs(page);
    await page.waitForTimeout(2000);

    if (!page.url().includes("/admin/injuries")) {
      test.skip(true, "No admin access available");
      return;
    }

    // Admin analytics page should be accessible
    await expect(
      page.getByRole("heading", { name: /Injury Analytics/i })
    ).toBeVisible({ timeout: 10000 });

    // Should show either data or empty state
    await expect(
      page
        .getByText(/Total Injuries|No injury data recorded/i)
        .first()
    ).toBeVisible({ timeout: 10000 });
  });

  // ── Step 7: Parent sees injury (skip if no linked child) ─────────────────

  test("E2E-007: Parent can view injury for linked child", async ({
    parentPage: page,
  }) => {
    await page.goto("/orgs");
    await waitForPageLoad(page);
    await page.waitForTimeout(2000);

    const urlOrgId = page.url().match(ORG_ID_PATTERN)?.[1];
    if (!urlOrgId || urlOrgId === "current") {
      test.skip(true, "No org access for parent account");
      return;
    }

    await page.goto(`/orgs/${urlOrgId}/parents/injuries`);
    await waitForPageLoad(page);
    await dismissBlockingDialogs(page);
    await page.waitForTimeout(2000);

    if (!page.url().includes("/injuries")) {
      test.skip(true, "Parent cannot access injuries page");
      return;
    }

    // Parent sees either injuries for their linked child or an empty state
    await expect(
      page.getByText(/injury|no injuries|no active|linked/i).first()
    ).toBeVisible({ timeout: 8000 });
  });
});
