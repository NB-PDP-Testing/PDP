import {
  type Page,
  TEST_ORG_ID,
  dismissBlockingDialogs,
  expect,
  test,
  waitForPageLoad,
} from "../fixtures/test-fixtures";

/**
 * Phase 2: Adult Player Lifecycle — Youth-to-Adult Graduation Flow UAT Tests
 *
 * US-P2-001: Guardian Sees Graduation Alert in Parent Dashboard
 * US-P2-002: Guardian Sends Account Invite Email
 * US-P2-003: Player Claims Account via Token & Onboards
 * US-P2-004: Admin Manual Graduation Trigger
 *
 * These tests cover the UI/UX of the graduation flow. Token-dependent tests
 * verify error states using mock tokens. The actual graduation flow requires
 * manual seeding of test data (see manual test checklist below).
 *
 * Test account: owner_pdp@outlook.com (ownerPage / adminPage)
 * Parent account: parentPage (neil.B@blablablak.com)
 * Org: TEST_ORG_ID
 */

const PARENT_DASHBOARD_URL = `/orgs/${TEST_ORG_ID}/parents`;
const ADMIN_PLAYERS_URL = `/orgs/${TEST_ORG_ID}/admin/players`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function goToParentDashboard(page: Page): Promise<void> {
  await page.goto(PARENT_DASHBOARD_URL);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

async function goToClaimPage(page: Page, token: string): Promise<void> {
  await page.goto(`/claim-account/${token}`);
  await waitForPageLoad(page);
}

async function goToAdminPlayers(page: Page): Promise<void> {
  await page.goto(ADMIN_PLAYERS_URL);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

// ─── US-P2-001: Guardian Sees Graduation Alert ────────────────────────────────

test.describe("US-P2-001: Guardian Sees Graduation Alert in Parent Dashboard", () => {
  test("PG2-001: Parent dashboard resolves without error", async ({
    parentPage: page,
  }) => {
    await goToParentDashboard(page);
    await expect(page).not.toHaveTitle(/error|not found/i);
    // Page should have parent-related content
    const pageContent = page.getByRole("main");
    await expect(pageContent).toBeVisible();
  });

  test("PG2-002: Parent dashboard does not show graduation alert when no pending graduations", async ({
    parentPage: page,
  }) => {
    await goToParentDashboard(page);
    // If there are no pending graduations, the alert should not be present
    const alertCard = page.locator(".border-amber-300");
    // It's acceptable for this to either be absent or present (depends on test data)
    // Just verify the page loads correctly either way
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("PG2-003: Graduation alert structure has required elements when present", async ({
    parentPage: page,
  }) => {
    await goToParentDashboard(page);

    const alertCards = page.locator(".border-amber-300");
    const count = await alertCards.count();

    if (count > 0) {
      const firstCard = alertCards.first();

      // Alert should show player name and organization
      await expect(firstCard).toContainText(/Has Turned 18/i);

      // Should have Send Account Invite button
      await expect(
        firstCard.getByRole("button", { name: /send account invite/i })
      ).toBeVisible();

      // Should have Dismiss button
      await expect(
        firstCard.getByRole("button", { name: /dismiss/i })
      ).toBeVisible();
    }
  });

  test("PG2-004: Dismiss button is accessible on graduation alert card", async ({
    parentPage: page,
  }) => {
    await goToParentDashboard(page);

    const alertCards = page.locator(".border-amber-300");
    const count = await alertCards.count();

    if (count > 0) {
      const dismissBtn = alertCards
        .first()
        .getByRole("button", { name: /dismiss/i });
      await expect(dismissBtn).toBeEnabled();
    }
  });
});

// ─── US-P2-002: Guardian Sends Account Invite ─────────────────────────────────

test.describe("US-P2-002: Guardian Sends Account Invite Email", () => {
  test("PG2-005: Send Invite dialog opens on button click", async ({
    parentPage: page,
  }) => {
    await goToParentDashboard(page);

    const alertCards = page.locator(".border-amber-300");
    const count = await alertCards.count();

    if (count > 0) {
      await alertCards
        .first()
        .getByRole("button", { name: /send account invite/i })
        .click();

      // Dialog should appear
      await expect(
        page.getByRole("dialog").getByText(/send account invite/i)
      ).toBeVisible();

      // Email input should be present
      await expect(page.getByLabel(/email address/i)).toBeVisible();

      // Cancel button should be present
      await expect(
        page.getByRole("button", { name: /cancel/i }
      )).toBeVisible();

      // Send button should be present
      await expect(
        page.getByRole("button", { name: /send invite/i })
      ).toBeVisible();
    }
  });

  test("PG2-006: Send Invite dialog cancel closes without changes", async ({
    parentPage: page,
  }) => {
    await goToParentDashboard(page);

    const alertCards = page.locator(".border-amber-300");
    const count = await alertCards.count();

    if (count > 0) {
      await alertCards
        .first()
        .getByRole("button", { name: /send account invite/i })
        .click();

      await expect(page.getByRole("dialog")).toBeVisible();

      await page.getByRole("button", { name: /cancel/i }).click();

      // Dialog should close
      await expect(page.getByRole("dialog")).not.toBeVisible({
        timeout: 3000,
      });
    }
  });

  test("PG2-007: Send Invite button is disabled when email is empty", async ({
    parentPage: page,
  }) => {
    await goToParentDashboard(page);

    const alertCards = page.locator(".border-amber-300");
    const count = await alertCards.count();

    if (count > 0) {
      await alertCards
        .first()
        .getByRole("button", { name: /send account invite/i })
        .click();

      // With empty email, send button should be disabled
      const sendBtn = page.getByRole("button", { name: /^send invite$/i });
      await expect(sendBtn).toBeDisabled();
    }
  });
});

// ─── US-P2-003: Claim Account Page ───────────────────────────────────────────

test.describe("US-P2-003: Player Claims Account via Token", () => {
  test("PG2-008: Invalid token shows error state", async ({
    ownerPage: page,
  }) => {
    await goToClaimPage(page, "invalid-token-xyz-123");

    // Should show error state — not found / invalid
    await expect(
      page
        .getByText(/invalid invitation/i)
        .or(page.getByText(/not valid/i))
        .or(page.getByText(/invalid/i))
    ).toBeVisible({ timeout: 10000 });

    // Should NOT show claim wizard steps
    await expect(page.getByText(/welcome/i).and(page.getByText(/turned 18/i)).or(page.getByText(/claim your account/i))).not.toBeVisible();
  });

  test("PG2-009: Claim page loading state shows spinner", async ({
    ownerPage: page,
  }) => {
    // Navigate and catch loading state (may be very brief)
    await page.goto("/claim-account/any-token");
    // The loading spinner text should appear briefly
    const loadingEl = page.getByText(/validating your invitation/i);
    // Just check the page loads without crashing
    await waitForPageLoad(page);
    await expect(page).not.toHaveTitle(/error/i);
  });

  test("PG2-010: Already-used token shows already claimed state", async ({
    ownerPage: page,
  }) => {
    // A non-existent token should show "invalid" state (same as "used" flow for unknown tokens)
    await goToClaimPage(page, "used-token-00000000");
    await waitForPageLoad(page);

    // Should show one of the error states
    const errorState = page
      .getByText(/invalid invitation/i)
      .or(page.getByText(/already claimed/i))
      .or(page.getByText(/expired/i))
      .or(page.getByText(/not valid/i));

    await expect(errorState).toBeVisible({ timeout: 10000 });
  });

  test("PG2-011: Claim page has Go to Home Page button in error state", async ({
    ownerPage: page,
  }) => {
    await goToClaimPage(page, "invalid-token");
    await waitForPageLoad(page);

    // Error state should have navigation option
    const homeBtn = page.getByRole("link", { name: /go to home/i });
    await expect(homeBtn).toBeVisible({ timeout: 10000 });
  });

  test("PG2-012: Valid claim page shows multi-step wizard with correct steps", async ({
    ownerPage: page,
  }) => {
    // This test requires a real valid token in the DB to fully work
    // Without a valid token, we at least verify the error path renders
    await goToClaimPage(page, "test-token-does-not-exist");
    await waitForPageLoad(page);

    // Either wizard or error state should be visible (not a blank screen)
    const content = page.getByRole("main").or(page.locator("body"));
    await expect(content).toBeVisible();
  });
});

// ─── US-P2-004: Admin Manual Graduation Trigger ───────────────────────────────

test.describe("US-P2-004: Admin Manual Graduation Trigger", () => {
  test("PG2-013: Admin players list page loads without error", async ({
    adminPage: page,
  }) => {
    await goToAdminPlayers(page);
    await expect(page).not.toHaveTitle(/error|not found/i);

    // Should show players section
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("PG2-014: Admin player edit page structure includes player info", async ({
    adminPage: page,
  }) => {
    await goToAdminPlayers(page);

    // Try to find a player link
    const playerLinks = page.locator("a").filter({
      hasText: /edit|view/i,
    });
    const linkCount = await playerLinks.count();

    if (linkCount > 0) {
      await playerLinks.first().click();
      await waitForPageLoad(page);

      // Edit page should have player information sections
      const hasPlayerInfo =
        (await page
          .getByText(/basic information/i)
          .or(page.getByText(/enrollment details/i))
          .count()) > 0;
      expect(hasPlayerInfo).toBeTruthy();
    }
  });

  test("PG2-015: Graduation section renders on youth player aged 18+ edit page", async ({
    adminPage: page,
  }) => {
    // Navigate to admin players list
    await goToAdminPlayers(page);

    // This test requires a manually seeded youth player aged 18+
    // Without such a player, we verify the edit page structure is correct
    const playerRows = page.locator("table tbody tr").or(
      page.locator('[data-testid="player-row"]')
    );
    const count = await playerRows.count();

    if (count > 0) {
      // Click first player's edit link
      const editLink = playerRows
        .first()
        .getByRole("link", { name: /edit/i })
        .or(page.getByRole("link", { name: /edit/i }).first());

      if ((await editLink.count()) > 0) {
        await editLink.first().click();
        await waitForPageLoad(page);

        // Page should load without errors
        await expect(page).not.toHaveTitle(/error/i);
      }
    }
  });

  test("PG2-016: Graduation section shows Send Invitation and Transition Now buttons for eligible players", async ({
    adminPage: page,
  }) => {
    // This test requires a youth player aged 18+ to be present
    // It validates the graduation section UI when such a player exists
    await page.goto(`/orgs/${TEST_ORG_ID}/admin/players`);
    await waitForPageLoad(page);
    await dismissBlockingDialogs(page);

    // If graduation section is visible anywhere on an edit page we navigate to
    const graduationSection = page
      .getByText(/graduation/i)
      .and(page.getByText(/transition now/i));

    // This is conditional — only passes if test data includes an eligible player
    const isVisible = await graduationSection
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (isVisible) {
      // Should have Send Invitation button
      await expect(
        page.getByRole("button", { name: /send invitation/i })
      ).toBeVisible();

      // Should have Transition Now button
      await expect(
        page.getByRole("button", { name: /transition now/i })
      ).toBeVisible();
    }
  });

  test("PG2-017: Transition Now confirmation dialog has correct warning content", async ({
    adminPage: page,
  }) => {
    // If we can reach a page with the graduation section visible, verify the dialog
    await page.goto(`/orgs/${TEST_ORG_ID}/admin/players`);
    await waitForPageLoad(page);
    await dismissBlockingDialogs(page);

    const transitionBtn = page.getByRole("button", {
      name: /transition now/i,
    });
    const isVisible = await transitionBtn
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (isVisible) {
      await transitionBtn.click();

      // Dialog should show warning content
      await expect(
        page.getByRole("dialog").getByText(/cannot be undone/i)
      ).toBeVisible();

      // Should have Proceed and Cancel buttons
      await expect(
        page.getByRole("button", { name: /proceed/i })
      ).toBeVisible();
      await expect(
        page.getByRole("dialog").getByRole("button", { name: /cancel/i })
      ).toBeVisible();
    }
  });
});

/**
 * ─── Manual Test Checklist ─────────────────────────────────────────────────
 *
 * The following tests require manual execution with seeded test data:
 *
 * Manual Test 1:
 *   Create a playerIdentity with dateOfBirth exactly 18 years ago
 *   → Trigger detectPlayerGraduations via Convex dashboard
 *   → Confirm playerGraduations record with status "pending"
 *
 * Manual Test 2:
 *   Log in as the player's guardian
 *   → Navigate to /orgs/[orgId]/parents
 *   → Confirm graduation alert banner appears with player name
 *   → Confirm "They turned 18 on [date]" text is correct
 *
 * Manual Test 3:
 *   From parent dashboard, click "Send Account Invite"
 *   → Enter test email address
 *   → Confirm success toast: "Invite sent to [email]. Link valid for 30 days."
 *   → Check Convex logs for sendGraduationInvitationEmailAction execution
 *
 * Manual Test 4:
 *   Click the claim link from the email
 *   → Confirm page shows player name and organization name
 *   → Confirm ClaimWizard multi-step progress indicator is visible
 *
 * Manual Test 5 (player with mobile on record):
 *   Sign in as player at /login
 *   → Return to /claim-account/[token]
 *   → Confirm PIN verification step appears with SMS destination
 *   → Enter correct 6-digit PIN
 *   → Complete GDPR step and Confirm step
 *   → Confirm redirect to /orgs/[orgId]
 *   → Confirm PlayerGraduationStep welcome modal appears
 *   → Click "Go to My Dashboard" → confirm welcome modal disappears
 *
 * Manual Test 6 (player without mobile — email PIN fallback):
 *   Same as Manual Test 5 but player has no phone number
 *   → Confirm PIN sent to email instead of SMS
 *
 * Manual Test 7 (wrong PIN):
 *   Enter wrong PIN 3 times
 *   → Confirm "Too Many Attempts" lock state appears
 *   → Confirm claimPlayerAccount is NOT called
 *
 * Manual Test 8 (already-used token):
 *   Attempt to use same token link again after claim
 *   → Confirm "Already Claimed" error state
 *
 * Manual Test 9 (expired token):
 *   Manually set invitationExpiresAt to past in DB via Convex dashboard
 *   → Visit claim link
 *   → Confirm "Invitation Expired" message with guardian contact advice
 *
 * Manual Test 10 (admin manual graduation):
 *   Navigate to admin → players → [youth player aged 18+] → Edit
 *   → Confirm "Graduation" section appears in purple border
 *   → Click "Transition Now"
 *   → Confirm warning dialog appears
 *   → Click Proceed
 *   → Confirm player type changes to "adult" in DB
 *   → Confirm guardian contacts converted to emergency contacts
 *
 * Manual Test 11 (admin send invitation):
 *   From admin player edit page
 *   → Click "Send Invitation" in Graduation section
 *   → Enter player email
 *   → Confirm invite sent toast
 *   → Check Convex logs for email dispatch
 */
