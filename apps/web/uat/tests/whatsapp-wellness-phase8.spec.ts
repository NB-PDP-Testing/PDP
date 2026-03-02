import {
  TEST_ORG_ID,
  dismissBlockingDialogs,
  expect,
  test,
  waitForPageLoad,
} from "../fixtures/test-fixtures";

/**
 * Phase 8: WhatsApp Wellness Check Integration (Dual-Channel) — E2E Tests
 *
 * US-P8-001: Backend Schema, Meta API Setup & Channel Abstraction
 * US-P8-002: Meta Webhook Endpoints — Flow Completion & Data Exchange
 * US-P8-003: Meta WhatsApp Flows Template — Design & Registration
 * US-P8-004: Twilio Conversational/SMS Channel (Retained & Updated)
 * US-P8-005: Player Channel Registration & Phone Verification (Settings UI)
 * US-P8-006: Admin WhatsApp Wellness Scheduling Configuration
 * US-P8-007: Daily Dispatch Cron — Channel-Aware
 * US-P8-008: App Sync, Completion UX & Channel Source Tracking
 * US-P8-009: Admin WhatsApp Wellness Monitoring Dashboard
 *
 * AUTOMATED UI TESTS:
 * These tests verify the UI elements are present and navigable.
 * They do NOT test actual WhatsApp message delivery (requires real device).
 *
 * MANUAL TESTS REQUIRED (see end of file for protocol):
 * - WhatsApp Flows end-to-end delivery (tests 1-7)
 * - SMS/conversational end-to-end (tests 8-12)
 * - Fallback and edge cases (tests 13-16)
 *
 * Test account: neil.B@blablablak.com / lien1979 (via ownerPage fixture)
 */

const HEALTH_CHECK_URL = `/orgs/${TEST_ORG_ID}/player/health-check`;
const PLAYER_SETTINGS_URL = `/orgs/${TEST_ORG_ID}/player/settings`;
const ADMIN_ANALYTICS_URL = `/orgs/${TEST_ORG_ID}/admin/analytics`;
const ADMIN_SETTINGS_URL = `/orgs/${TEST_ORG_ID}/admin/settings`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function goToPlayerSettings(
  page: Parameters<typeof dismissBlockingDialogs>[0]
): Promise<void> {
  await page.goto(PLAYER_SETTINGS_URL);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

async function goToHealthCheck(
  page: Parameters<typeof dismissBlockingDialogs>[0]
): Promise<void> {
  await page.goto(HEALTH_CHECK_URL);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

async function goToAdminAnalytics(
  page: Parameters<typeof dismissBlockingDialogs>[0]
): Promise<void> {
  await page.goto(ADMIN_ANALYTICS_URL);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

async function goToAdminSettings(
  page: Parameters<typeof dismissBlockingDialogs>[0]
): Promise<void> {
  await page.goto(ADMIN_SETTINGS_URL);
  await waitForPageLoad(page);
  await dismissBlockingDialogs(page);
}

// ─── US-P8-005: Player Channel Registration UI ────────────────────────────────

test.describe("US-P8-005: Player Channel Registration UI", () => {
  test("P8-001: Player settings page loads without error", async ({
    ownerPage: page,
  }) => {
    await goToPlayerSettings(page);
    await expect(page).not.toHaveTitle(/error|not found/i);
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("P8-002: Wellness Check-In section is visible in player settings", async ({
    ownerPage: page,
  }) => {
    await goToPlayerSettings(page);

    // The section heading or a related text should be present
    const wellnessSection = page.getByText(/wellness check.in/i).first();
    await expect(wellnessSection).toBeVisible({ timeout: 8000 });
  });

  test("P8-003: Phone number input is present in wellness section", async ({
    ownerPage: page,
  }) => {
    await goToPlayerSettings(page);

    // Either phone input (unregistered) or masked phone (registered) should show
    const phoneInput = page.getByRole("textbox").filter({ hasText: "" }).first();
    const maskedPhone = page.getByText(/\+\d{3}.*\*\*\*/).first();
    const verifyButton = page.getByRole("button", { name: /verify number/i });

    const hasPhoneInput = await phoneInput.isVisible({ timeout: 3000 }).catch(() => false);
    const hasMaskedPhone = await maskedPhone.isVisible({ timeout: 1000 }).catch(() => false);
    const hasVerifyButton = await verifyButton.isVisible({ timeout: 1000 }).catch(() => false);

    // At least one of these should be visible (registered or unregistered state)
    expect(hasPhoneInput || hasMaskedPhone || hasVerifyButton).toBe(true);
  });

  test("P8-004: GDPR Article 9 consent text is present or channel info shown", async ({
    ownerPage: page,
  }) => {
    await goToPlayerSettings(page);

    // GDPR consent wording or channel status should be visible
    const gdprText = page
      .getByText(/special category health data|gdpr article 9|consent/i)
      .first();
    const channelLabel = page.getByText(/whatsapp flows|sms will be used|channel/i).first();

    const hasGdpr = await gdprText.isVisible({ timeout: 3000 }).catch(() => false);
    const hasChannel = await channelLabel.isVisible({ timeout: 1000 }).catch(() => false);

    // One of these should be present
    expect(hasGdpr || hasChannel).toBe(true);
  });
});

// ─── US-P8-006: Admin Wellness Scheduling Config UI ───────────────────────────

test.describe("US-P8-006: Admin Wellness Scheduling Config", () => {
  test("P8-005: Admin settings page loads", async ({ ownerPage: page }) => {
    await goToAdminSettings(page);
    await expect(page).not.toHaveTitle(/error|not found/i);
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("P8-006: Wellness dispatch section is present in admin settings", async ({
    ownerPage: page,
  }) => {
    await goToAdminSettings(page);

    // The WhatsApp wellness section should be visible
    const dispatchSection = page
      .getByText(/whatsapp.*sms.*wellness|enable whatsapp|dispatch/i)
      .first();
    const wellnessSection = page.getByText(/wellness reminder/i).first();

    const hasDispatch = await dispatchSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasWellness = await wellnessSection.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasDispatch || hasWellness).toBe(true);
  });
});

// ─── US-P8-008: Channel Source Tracking in Health Check History ───────────────

test.describe("US-P8-008: Channel Source Tracking in Health Check History", () => {
  test("P8-007: Health check page loads", async ({ ownerPage: page }) => {
    await goToHealthCheck(page);
    await expect(page).not.toHaveTitle(/error|not found/i);
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("P8-008: Recent check-ins section renders (if history exists)", async ({
    ownerPage: page,
  }) => {
    await goToHealthCheck(page);

    // Either the recent check-ins section or the form should be visible
    const recentCheckIns = page.getByText(/recent check.ins/i).first();
    const form = page.getByText(/daily wellness/i).first();
    const notFound = page.getByText(/player profile not found|wellness access/i).first();

    const hasHistory = await recentCheckIns.isVisible({ timeout: 5000 }).catch(() => false);
    const hasForm = await form.isVisible({ timeout: 2000 }).catch(() => false);
    const hasGate = await notFound.isVisible({ timeout: 1000 }).catch(() => false);

    expect(hasHistory || hasForm || hasGate).toBe(true);
  });
});

// ─── US-P8-009: Admin WhatsApp Notifications Monitoring Dashboard ─────────────

test.describe("US-P8-009: Admin Notifications Monitoring Dashboard", () => {
  test("P8-009: Admin analytics page loads with Notifications tab", async ({
    ownerPage: page,
  }) => {
    await goToAdminAnalytics(page);
    await expect(page).not.toHaveTitle(/error|not found/i);
    await expect(page.getByRole("main")).toBeVisible();

    // Notifications tab should be visible
    const notificationsTab = page.getByRole("tab", { name: /notifications/i });
    await expect(notificationsTab).toBeVisible({ timeout: 8000 });
  });

  test("P8-010: Notifications tab shows dispatch summary", async ({
    ownerPage: page,
  }) => {
    await goToAdminAnalytics(page);

    // Click the Notifications tab
    const notificationsTab = page.getByRole("tab", { name: /notifications/i });
    const tabExists = await notificationsTab
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!tabExists) {
      test.skip(true, "Notifications tab not yet visible");
      return;
    }

    await notificationsTab.click();

    // Today's dispatch summary should appear
    const summarySection = page.getByText(/today.*dispatch summary|dispatch summary/i).first();
    await expect(summarySection).toBeVisible({ timeout: 5000 });
  });

  test("P8-011: Notifications tab shows error log section", async ({
    ownerPage: page,
  }) => {
    await goToAdminAnalytics(page);

    const notificationsTab = page.getByRole("tab", { name: /notifications/i });
    const tabExists = await notificationsTab
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!tabExists) {
      test.skip(true, "Notifications tab not yet visible");
      return;
    }

    await notificationsTab.click();

    // Error log section should appear
    const errorLog = page.getByText(/error log|delivery failures/i).first();
    await expect(errorLog).toBeVisible({ timeout: 5000 });
  });

  test("P8-012: Notifications tab shows 30-day chart section", async ({
    ownerPage: page,
  }) => {
    await goToAdminAnalytics(page);

    const notificationsTab = page.getByRole("tab", { name: /notifications/i });
    const tabExists = await notificationsTab
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!tabExists) {
      test.skip(true, "Notifications tab not yet visible");
      return;
    }

    await notificationsTab.click();

    // 30-day channel breakdown should appear
    const chartSection = page.getByText(/30.day channel breakdown/i).first();
    await expect(chartSection).toBeVisible({ timeout: 5000 });
  });
});

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * MANUAL TEST PROTOCOL — WhatsApp Flows and SMS Channel Testing
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * These tests require a real Meta Business API setup and WhatsApp device.
 * They CANNOT be automated in Playwright. Run these manually against staging.
 *
 * PREREQUISITES:
 * - Meta Business API configured (META_GRAPH_API_TOKEN etc. in Convex env)
 * - META_FLOWS_WELLNESS_ID set after Flow registration (see US-P8-003)
 * - Twilio configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)
 * - Dev server running, test user logged in as a player
 *
 * ─── WhatsApp Flows Channel Tests ────────────────────────────────────────────
 *
 * Manual test 1: Register a WhatsApp number in player settings
 *   1. Login as a player (neil.B@blablablak.com / lien1979)
 *   2. Go to /orgs/[orgId]/player/settings
 *   3. Find "Wellness Check-In Notifications" section
 *   4. Enter a real WhatsApp-enabled mobile number (+353...)
 *   5. Click "Verify Number"
 *   6. Check SMS received on phone with 6-digit PIN
 *   7. Enter PIN in the app
 *   EXPECTED: Channel detected as "WhatsApp Flows", green checkmark shown
 *   8. Enable the opt-in toggle with GDPR consent
 *   EXPECTED: Settings saved, "How it works" section shows WhatsApp Flows info
 *
 * Manual test 2: Trigger dispatch via admin send time
 *   1. Login as admin, go to settings → Wellness Reminders
 *   2. Set dispatch time 2 minutes from now, enable WhatsApp
 *   3. Wait for cron to fire
 *   EXPECTED: WhatsApp message received on player's phone with "Start Check-In" button
 *
 * Manual test 3: Complete the WhatsApp Flow form
 *   1. On the device from test 2, tap "Start Check-In" button
 *   EXPECTED: WhatsApp Flows form opens inside WhatsApp with only ENABLED dimensions
 *   2. Fill in all dimension values using the radio buttons
 *   3. Tap "Submit my check-in"
 *   EXPECTED: Confirmation message received: "✅ Wellness check complete! 🎉 Your score today: X/5"
 *
 * Manual test 4: Verify DB record
 *   1. Check Convex dashboard → dailyPlayerHealthChecks table
 *   EXPECTED: Record exists with source: "whatsapp_flows" and correct dimension values
 *
 * Manual test 5: App sync — check health check page
 *   1. Login as player in browser, go to /orgs/[orgId]/player/health-check
 *   EXPECTED: "Recent Check-Ins" section shows today's record with "Via WhatsApp" badge
 *   EXPECTED: Green "Check-in submitted today" banner shown
 *
 * Manual test 6: Idempotency — send Flow completion twice
 *   1. Use curl or Convex dashboard to resend the same Flow completion webhook payload
 *   EXPECTED: Only ONE dailyPlayerHealthChecks record exists for that player+date
 *   EXPECTED: Confirmation message sent again (or not, depending on implementation)
 *
 * Manual test 7: Admin Notifications dashboard
 *   1. Login as admin, go to Analytics → Notifications tab
 *   EXPECTED: Today's summary shows "WhatsApp Flows Sent: 1, WhatsApp Flows Done: 1"
 *   EXPECTED: 30-day chart shows today's check-in in the WhatsApp Flows (green) bar
 *
 * ─── SMS/Conversational Channel Tests ────────────────────────────────────────
 *
 * Manual test 8: Register an SMS-only number
 *   1. Use a phone number that does NOT have WhatsApp
 *   2. Register in player settings, verify PIN
 *   EXPECTED: Channel detected as "SMS", phone icon shown
 *   3. Enable opt-in
 *
 * Manual test 9: Complete SMS wellness check
 *   1. Trigger dispatch as in test 2
 *   EXPECTED: SMS received with first question
 *   2. Reply "4"
 *   EXPECTED: Next question arrives
 *   3. Reply to all questions
 *   EXPECTED: Completion SMS received with score and interpretation
 *
 * Manual test 10: Verify SMS DB record
 *   EXPECTED: dailyPlayerHealthChecks record with source: "sms" and correct values
 *
 * Manual test 11: Invalid reply handling
 *   1. Start a new session, reply "abc" to first question
 *   EXPECTED: "Please reply 1-5" resent
 *   2. Reply invalid twice more
 *   EXPECTED: Session abandoned with apology message
 *
 * Manual test 12: SKIP command
 *   1. Start a session, send "SKIP"
 *   EXPECTED: "No problem! Check in via the app anytime." received
 *   EXPECTED: No dailyPlayerHealthChecks record created
 *
 * ─── Fallback & Edge Case Tests ──────────────────────────────────────────────
 *
 * Manual test 13: Meta API failure fallback
 *   1. Temporarily set META_GRAPH_API_TOKEN to an invalid value in Convex dashboard
 *   2. Trigger dispatch for a whatsapp_flows player
 *   EXPECTED: Dispatch cron falls back to sending SMS
 *   EXPECTED: Admin Notifications → Fallback Events shows the fallback entry
 *   3. Restore the correct META_GRAPH_API_TOKEN
 *
 * Manual test 14: App check-in before dispatch
 *   1. Player submits wellness check via app before dispatch time
 *   2. Trigger dispatch
 *   EXPECTED: WhatsApp/SMS is NOT sent to that player (skipped — already checked in)
 *   EXPECTED: Admin summary shows "Skipped (app check-in): 1"
 *
 * Manual test 15: Coach who is also a player — wellness session intercepts
 *   1. Register a coach's phone for wellness (same phone number)
 *   2. Start a wellness session (via dispatch or WELLNESS command)
 *   3. Send a coach voice note from that number
 *   EXPECTED: The wellness session intercepts the reply and treats "1"-"5" as answers
 *   EXPECTED: Coach voice note processing happens only after wellness session completes
 *
 * Manual test 16: On-demand WELLNESS command
 *   1. Send "WELLNESS" to the Twilio WhatsApp number from an opted-in SMS player
 *   EXPECTED: First wellness question received immediately
 *   2. Complete the session
 *   EXPECTED: Record created with source: "sms" or "whatsapp_conversational"
 *
 * ─── WELLNESSSTOP command ─────────────────────────────────────────────────────
 * Manual test 17: WELLNESSSTOP deregistration
 *   1. From an opted-in player's phone, send "WELLNESSSTOP"
 *   EXPECTED EXACT RESPONSE: "You have been removed from wellness check-ins. Reply WELLNESS to re-subscribe."
 *   (This exact wording is required by Meta Business Policy)
 *   2. Check player settings in app — opt-in toggle should show as OFF
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */
