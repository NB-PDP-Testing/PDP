/**
 * WhatsApp Test Helper
 *
 * Sends synthetic WhatsApp messages by POSTing directly to the Convex HTTP
 * action at `${CONVEX_SITE_URL}/whatsapp/incoming`. This bypasses Twilio
 * and lets us drive the full WhatsApp processing pipeline in automated tests
 * without a real phone.
 *
 * The Convex webhook endpoint accepts standard Twilio form-urlencoded fields
 * and does NOT validate the Twilio signature in sandbox mode.
 *
 * Usage:
 *   const wa = new WhatsAppHelper();
 *   await wa.sendText("Clodagh had a great session today");
 *   await wa.sendAudio("https://example.com/test-note.ogg");
 *   await wa.sendCommand("RESET");
 *   const msgId = await wa.getLastMessageId(page, orgId);
 */

import type { Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

// ── Config ─────────────────────────────────────────────────────────────────

const testDataPath = path.join(__dirname, "../test-data.json");
const testData = JSON.parse(fs.readFileSync(testDataPath, "utf-8"));

/**
 * Derive Convex HTTP actions site URL from the Convex deployment URL.
 * NEXT_PUBLIC_CONVEX_URL = https://[name].convex.cloud
 * CONVEX_SITE_URL        = https://[name].convex.site   ← HTTP actions
 */
export function getConvexSiteUrl(): string {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
  if (!convexUrl) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is not set. Cannot send synthetic WhatsApp messages."
    );
  }
  // Convex HTTP actions are served from .convex.site domain
  return convexUrl.replace(".convex.cloud", ".convex.site");
}

// ── Default test phone numbers ─────────────────────────────────────────────
// These map to the coach accounts in test-data.json.
// The phone number must be registered to the coach's profile in local dev.
// Override via env var: WA_TEST_PHONE=+353851234567

export const WA_COACH_PHONE =
  process.env.WA_TEST_PHONE ||
  testData.whatsapp?.coachPhone ||
  "+353851111111"; // fallback — must be registered in local dev

export const WA_MULTI_ORG_PHONE =
  process.env.WA_TEST_MULTI_ORG_PHONE ||
  testData.whatsapp?.multiOrgCoachPhone ||
  "+353852222222";

export const WA_UNREGISTERED_PHONE =
  process.env.WA_TEST_UNREGISTERED_PHONE || "+353899999999";

// Twilio "To" number (the bot's number — value doesn't matter for local tests)
const WA_TO = "whatsapp:+14155238886";

// ── Test audio URL ─────────────────────────────────────────────────────────
// Small (~5s) real coaching voice note, served from public folder.
// If the URL is unreachable, tests using sendAudio will be marked fixme.
export const TEST_AUDIO_URL =
  process.env.WA_TEST_AUDIO_URL ||
  "http://localhost:3000/test-audio/coaching-note.ogg";

// ── WhatsAppHelper class ───────────────────────────────────────────────────

export class WhatsAppHelper {
  private siteUrl: string;
  private fromPhone: string;
  private msgCounter = 0;

  constructor(fromPhone = WA_COACH_PHONE) {
    this.siteUrl = getConvexSiteUrl();
    this.fromPhone = fromPhone;
  }

  /** Generate a unique MessageSid (Twilio format: SM + 32 hex chars) */
  private nextSid(): string {
    this.msgCounter++;
    const ts = Date.now().toString(16).padStart(12, "0");
    const rand = Math.random().toString(16).slice(2).padStart(20, "0");
    return `SM${ts}${rand}`.slice(0, 34);
  }

  private async post(fields: Record<string, string>): Promise<Response> {
    const body = new URLSearchParams({
      AccountSid: "ACtest000000000000000000000000000000",
      To: WA_TO,
      From: `whatsapp:${this.fromPhone}`,
      ...fields,
    });

    const response = await fetch(`${this.siteUrl}/whatsapp/incoming`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok && response.status !== 200) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `WhatsApp webhook returned ${response.status}: ${text.slice(0, 200)}`
      );
    }

    return response;
  }

  /**
   * Send a text message (simulates coach typing in WhatsApp).
   * @param body The message text
   * @param sid Optional override for MessageSid (useful for duplicate tests)
   */
  async sendText(body: string, sid?: string): Promise<string> {
    const messageSid = sid ?? this.nextSid();
    await this.post({
      MessageSid: messageSid,
      Body: body,
      NumMedia: "0",
    });
    return messageSid;
  }

  /**
   * Send an audio message (simulates coach sending a voice note).
   * The webhook will download from mediaUrl and store it.
   * @param mediaUrl URL of the audio file (must be publicly accessible)
   */
  async sendAudio(mediaUrl = TEST_AUDIO_URL, sid?: string): Promise<string> {
    const messageSid = sid ?? this.nextSid();
    await this.post({
      MessageSid: messageSid,
      Body: "",
      NumMedia: "1",
      MediaUrl0: mediaUrl,
      MediaContentType0: "audio/ogg",
    });
    return messageSid;
  }

  /**
   * Send a WhatsApp command (RESET, HELP, cancel, R, SWITCH, CONFIRM, etc.)
   */
  async sendCommand(command: string): Promise<string> {
    return this.sendText(command);
  }

  /**
   * Send numeric org selection reply (1, 2, etc.)
   */
  async sendOrgSelection(choice: number): Promise<string> {
    return this.sendText(String(choice));
  }

  /**
   * Send the same message twice quickly — used for duplicate detection tests.
   * The same MessageSid means "genuinely the same message" (Twilio retry).
   * Different SIDs sent quickly = distinct messages that should both process.
   */
  async sendDuplicateExact(body: string): Promise<[string, string]> {
    const sid = this.nextSid();
    await this.sendText(body, sid);
    await this.sendText(body, sid); // same SID = genuine duplicate
    return [sid, sid];
  }

  async sendConsecutive(messages: string[]): Promise<string[]> {
    const sids: string[] = [];
    for (const msg of messages) {
      sids.push(await this.sendText(msg));
      // Small gap — real coach sends notes in rapid succession
      await new Promise((r) => setTimeout(r, 500));
    }
    return sids;
  }
}

// ── Page helpers for verifying pipeline state in the UI ───────────────────

/**
 * Navigate to admin voice notes and wait for a note matching text to appear.
 */
export async function waitForNoteInAdmin(
  page: Page,
  orgId: string,
  partialText: string,
  timeout = 60_000
): Promise<void> {
  await page.goto(`/orgs/${orgId}/admin/voice-notes`);
  await page.waitForLoadState("networkidle");
  await page
    .getByText(partialText, { exact: false })
    .first()
    .waitFor({ state: "visible", timeout });
}

/**
 * Navigate to the monitoring dashboard and wait for an event of a given type.
 */
export async function waitForPipelineEvent(
  page: Page,
  eventType: string,
  timeout = 90_000
): Promise<void> {
  await page.goto("/platform/voice-monitoring/events");
  await page.waitForLoadState("networkidle");
  await page
    .getByText(eventType.replace(/_/g, " "), { exact: false })
    .first()
    .waitFor({ state: "visible", timeout });
}

/**
 * Navigate to the voice notes dashboard and click the Drafts tab.
 * Returns whether the drafts tab has any content (not empty state).
 */
export async function checkDraftsTab(
  page: Page,
  orgId: string
): Promise<boolean> {
  await page.goto(`/orgs/${orgId}/coach/voice-notes`);
  await page.waitForLoadState("networkidle");

  // Click Drafts tab — confirmed always-visible tab in voice-notes-dashboard.tsx
  // Uses role="button" not role="tab" in the actual implementation
  const draftsTab = page
    .getByRole("button", { name: /^Drafts/i })
    .or(page.getByText("Drafts", { exact: true }))
    .first();

  if (await draftsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await draftsTab.click();
    await page.waitForTimeout(1000);
  }

  // Check for empty state — exact text confirmed from drafts-tab.tsx
  const isEmpty = await page
    .getByText("No pending drafts")
    .first()
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  return !isEmpty;
}

/**
 * Poll the admin voice notes page until the note has a given status.
 * Returns true if the status is reached within timeout.
 */
export async function waitForNoteStatus(
  page: Page,
  orgId: string,
  noteTextFragment: string,
  status: string,
  timeout = 120_000
): Promise<boolean> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    await page.goto(`/orgs/${orgId}/admin/voice-notes`);
    await page.waitForLoadState("networkidle");
    const row = page.getByText(noteTextFragment, { exact: false }).first();
    if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
      const rowEl = row.locator("..").locator("..");
      const statusEl = rowEl.getByText(status, { exact: false });
      if (await statusEl.isVisible({ timeout: 2000 }).catch(() => false)) {
        return true;
      }
    }
    await page.waitForTimeout(3000);
  }
  return false;
}
