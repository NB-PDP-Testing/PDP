"use node";

/**
 * Meta WhatsApp Business Cloud API Integration
 *
 * REQUIRED ENVIRONMENT VARIABLES:
 *   META_GRAPH_API_TOKEN   — Meta app access token (long-lived system user token)
 *   META_PHONE_NUMBER_ID   — WhatsApp Business phone number ID from Meta Business Manager
 *   META_WABA_ID           — WhatsApp Business Account ID
 *   META_FLOWS_WELLNESS_ID — ID of the published wellness Flow (after Flow registration)
 *   META_WEBHOOK_VERIFY_TOKEN — Random secret token for Meta webhook GET challenge
 *   META_APP_SECRET        — Meta app secret for verifying X-Hub-Signature-256
 *
 * NEVER mix with Twilio env vars:
 *   Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
 */

import crypto from "node:crypto";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

const META_GRAPH_BASE = "https://graph.facebook.com/v18.0";

// Top-level regex (Biome: useTopLevelRegex)
const WHATSAPP_PREFIX_REGEX = /^whatsapp:/;
const PLUS_PREFIX_REGEX = /^\+/;

// ============================================================
// CHANNEL AVAILABILITY CHECK
// ============================================================

/**
 * Check if a phone number has WhatsApp via Meta Contacts API.
 * Used during player registration to auto-detect the best channel.
 */
export const checkWhatsappAvailability = internalAction({
  args: {
    phoneNumber: v.string(), // E.164 format
  },
  returns: v.object({
    isWhatsapp: v.boolean(),
    waId: v.union(v.string(), v.null()),
  }),
  handler: async (_ctx, args) => {
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    const token = process.env.META_GRAPH_API_TOKEN;

    if (!(phoneNumberId && token)) {
      console.warn(
        "[metaWhatsapp] META_PHONE_NUMBER_ID or META_GRAPH_API_TOKEN not set — defaulting to sms_conversational"
      );
      return { isWhatsapp: false, waId: null };
    }

    try {
      const response = await fetch(
        `${META_GRAPH_BASE}/${phoneNumberId}/contacts`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            blocking: "wait",
            contacts: [args.phoneNumber],
            force_check: true,
          }),
        }
      );

      if (!response.ok) {
        console.error(
          `[metaWhatsapp] Contacts API error: ${response.status} ${response.statusText}`
        );
        return { isWhatsapp: false, waId: null };
      }

      const data = (await response.json()) as {
        contacts?: Array<{ input: string; wa_id?: string; status?: string }>;
      };
      const contact = data.contacts?.[0];

      if (contact?.wa_id && contact.status === "valid") {
        return { isWhatsapp: true, waId: contact.wa_id };
      }

      return { isWhatsapp: false, waId: null };
    } catch (error) {
      console.error("[metaWhatsapp] checkWhatsappAvailability error:", error);
      return { isWhatsapp: false, waId: null };
    }
  },
});

// ============================================================
// SEND FLOW MESSAGE
// ============================================================

/**
 * Send a Meta WhatsApp Flows template message to a player.
 * Player taps 'Start Check-In' → WhatsApp opens native Flow form.
 */
export const sendFlowMessage = internalAction({
  args: {
    toPhoneNumber: v.string(), // E.164 format
    playerName: v.string(),
    orgName: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    const token = process.env.META_GRAPH_API_TOKEN;
    const flowId = process.env.META_FLOWS_WELLNESS_ID;
    const templateName = process.env.WELLNESS_TEMPLATE_NAME ?? "wellness_check";

    if (!(phoneNumberId && token && flowId)) {
      const missing = [
        !phoneNumberId && "META_PHONE_NUMBER_ID",
        !token && "META_GRAPH_API_TOKEN",
        !flowId && "META_FLOWS_WELLNESS_ID",
      ]
        .filter(Boolean)
        .join(", ");
      console.error(`[metaWhatsapp] Missing env vars: ${missing}`);
      return { success: false, error: `Missing env vars: ${missing}` };
    }

    // Strip whatsapp: prefix if present
    const to = args.toPhoneNumber.replace(WHATSAPP_PREFIX_REGEX, "");

    try {
      const response = await fetch(
        `${META_GRAPH_BASE}/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: templateName,
              language: { code: "en" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: args.playerName },
                    { type: "text", text: args.orgName },
                  ],
                },
                {
                  type: "button",
                  sub_type: "flow",
                  index: "0",
                  parameters: [
                    {
                      type: "action",
                      action: {
                        flow_token: `wellness_${Date.now()}`,
                      },
                    },
                  ],
                },
              ],
            },
          }),
        }
      );

      const data = (await response.json()) as {
        messages?: Array<{ id: string }>;
        error?: { message: string };
      };

      if (!response.ok || data.error) {
        const errMsg = data.error?.message ?? `HTTP ${response.status}`;
        console.error(`[metaWhatsapp] sendFlowMessage error: ${errMsg}`);
        return { success: false, error: errMsg };
      }

      const messageId = data.messages?.[0]?.id;
      console.log(
        `[metaWhatsapp] Flow message sent to ${to}, messageId: ${messageId}`
      );
      return { success: true, messageId };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[metaWhatsapp] sendFlowMessage exception:", errMsg);
      return { success: false, error: errMsg };
    }
  },
});

// ============================================================
// SIGNATURE VERIFICATION
// ============================================================

/**
 * Verify X-Hub-Signature-256 on incoming Meta webhook POST requests.
 * MUST be called before processing any Meta webhook payload.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string
): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error("[metaWhatsapp] META_APP_SECRET not set — rejecting");
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex")}`;

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(signatureHeader, "utf8")
    );
  } catch {
    return false;
  }
}

// ============================================================
// FLOW COMPLETION PROCESSING
// ============================================================

/**
 * Parse the Flow completion payload from Meta webhook.
 * Extracts wa_id and dimension answers.
 * Returns raw data — caller must immediately resolve wa_id to playerIdentityId
 * and MUST NOT persist wa_id (GDPR Article 9 pseudonymization requirement).
 */
export function processFlowCompletion(payload: object): {
  playerWaId: string | null;
  answers: Record<string, number>;
  submittedAt: number;
} {
  try {
    const p = payload as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<{
              from?: string;
              timestamp?: string;
              interactive?: {
                type?: string;
                nfm_reply?: {
                  response_json?: string;
                };
              };
            }>;
          };
        }>;
      }>;
    };

    const message = p.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) {
      return { playerWaId: null, answers: {}, submittedAt: Date.now() };
    }

    const playerWaId = message.from ?? null;
    const submittedAt = message.timestamp
      ? Number(message.timestamp) * 1000
      : Date.now();

    const responseJson = message.interactive?.nfm_reply?.response_json;
    if (!responseJson) {
      return { playerWaId, answers: {}, submittedAt };
    }

    const rawAnswers = JSON.parse(responseJson) as Record<string, string>;
    const answers: Record<string, number> = {};

    for (const [key, value] of Object.entries(rawAnswers)) {
      const numVal = Number(value);
      if (!Number.isNaN(numVal) && numVal >= 1 && numVal <= 5) {
        answers[key] = numVal;
      }
    }

    return { playerWaId, answers, submittedAt };
  } catch (error) {
    console.error("[metaWhatsapp] processFlowCompletion parse error:", error);
    return { playerWaId: null, answers: {}, submittedAt: Date.now() };
  }
}

// ============================================================
// PROCESS FLOW COMPLETION WEBHOOK (internal action)
// ============================================================

/**
 * Internal action called from the HTTP webhook handler when Meta sends
 * a Flow completion event. Resolves wa_id → playerIdentityId, checks
 * idempotency, calls submitDailyHealthCheck, sends confirmation.
 */
export const processFlowCompletionWebhook = internalAction({
  args: {
    payload: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { playerWaId, answers, submittedAt } = processFlowCompletion(
      args.payload as object
    );

    if (!playerWaId) {
      console.error("[metaWhatsapp] No wa_id in Flow completion payload");
      return null;
    }

    // Immediately resolve wa_id to playerIdentityId — never store wa_id
    // GDPR Article 9: pseudonymize on first receipt
    const whatsappNumber = playerWaId.startsWith("+")
      ? playerWaId
      : `+${playerWaId}`;

    const playerSettings = await ctx.runQuery(
      internal.models.whatsappWellness.getSettingsByWhatsappNumber,
      { whatsappNumber }
    );

    if (!playerSettings) {
      console.warn(
        "[metaWhatsapp] No player found for wa_id (pseudonymized) — wa_id discarded"
      );
      return null;
    }

    const { playerIdentityId, organizationId } = playerSettings;

    // Idempotency: check if today's record already exists
    const today = new Date().toISOString().split("T")[0];
    const existing = await ctx.runQuery(
      internal.models.playerHealthChecks.getTodayHealthCheckInternal,
      { playerIdentityId, checkDate: today }
    );

    if (existing) {
      console.log(
        `[metaWhatsapp] Idempotency: record already exists for player ${playerIdentityId} on ${today} — skipping duplicate`
      );
      // Still send confirmation in case the first confirmation was lost
      await sendFlowConfirmation(playerSettings.whatsappNumber ?? "", existing);
      return null;
    }

    // Build dimension values from answers
    const dimensionValues: {
      sleepQuality?: number;
      energyLevel?: number;
      foodIntake?: number;
      waterIntake?: number;
      mood?: number;
      motivation?: number;
      physicalFeeling?: number;
      muscleRecovery?: number;
    } = {};
    const validDimensions = [
      "sleepQuality",
      "energyLevel",
      "foodIntake",
      "waterIntake",
      "mood",
      "motivation",
      "physicalFeeling",
      "muscleRecovery",
    ] as const;
    for (const dim of validDimensions) {
      if (typeof answers[dim] === "number") {
        dimensionValues[dim] = answers[dim];
      }
    }

    // Determine which dimensions were answered
    const enabledDimensions = Object.keys(dimensionValues);

    // Submit the health check (internal version — no auth required for webhook)
    const checkId = await ctx.runMutation(
      internal.models.playerHealthChecks.submitDailyHealthCheckInternal,
      {
        playerIdentityId,
        organizationId,
        checkDate: today,
        dimensionValues,
        enabledDimensions,
        submittedAt,
        source: "whatsapp_flows",
      }
    );

    console.log(
      `[metaWhatsapp] Flow completion processed: playerIdentityId=${playerIdentityId}, checkId=${checkId}`
    );

    // Send confirmation message via Meta API
    await sendFlowConfirmation(playerSettings.whatsappNumber ?? "", {
      ...dimensionValues,
      enabledDimensions: playerSettings.enabledDimensions ?? [],
    });

    return null;
  },
});

// ============================================================
// FLOW REGISTRATION (manual utility)
// ============================================================

/**
 * Re-register/update the wellness Flow with Meta when the Flow JSON changes.
 * Run manually via Convex dashboard when Flow definition needs updating.
 */
export const registerFlow = internalAction({
  args: {},
  returns: v.object({
    success: v.boolean(),
    flowId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, _args) => {
    const wabaId = process.env.META_WABA_ID;
    const token = process.env.META_GRAPH_API_TOKEN;

    if (!(wabaId && token)) {
      return {
        success: false,
        error: "META_WABA_ID or META_GRAPH_API_TOKEN not set",
      };
    }

    // Flow JSON is loaded from the static definition
    const flowJson = getWellnessFlowJson();

    try {
      const response = await fetch(`${META_GRAPH_BASE}/${wabaId}/flows`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "PlayerARC Daily Wellness Check",
          categories: ["SURVEY"],
          flow_json: JSON.stringify(flowJson),
        }),
      });

      const data = (await response.json()) as {
        id?: string;
        error?: { message: string };
      };

      if (!response.ok || data.error) {
        const errMsg = data.error?.message ?? `HTTP ${response.status}`;
        console.error(`[metaWhatsapp] registerFlow error: ${errMsg}`);
        return { success: false, error: errMsg };
      }

      console.log(
        `[metaWhatsapp] Flow registered successfully. ID: ${data.id}. Set META_FLOWS_WELLNESS_ID=${data.id}`
      );
      return { success: true, flowId: data.id };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[metaWhatsapp] registerFlow exception:", errMsg);
      return { success: false, error: errMsg };
    }
  },
});

// ============================================================
// HELPERS
// ============================================================

/**
 * Returns the wellness Flow JSON definition.
 * This is the static template — dynamic content is served via data exchange endpoint.
 */
export function getWellnessFlowJson() {
  return {
    version: "3.1",
    data_api_version: "3.0",
    routing_model: {},
    screens: [
      {
        id: "WELLNESS_SCREEN",
        title: "Daily Wellness Check",
        data: {},
        layout: {
          type: "SingleColumnLayout",
          children: [
            buildRadioGroup("sleepQuality", "😴 Sleep Quality"),
            buildRadioGroup("energyLevel", "⚡ Energy Level"),
            buildRadioGroup("foodIntake", "🥗 Food Intake"),
            buildRadioGroup("waterIntake", "💧 Water Intake"),
            buildRadioGroup("mood", "😊 Mood"),
            buildRadioGroup("motivation", "🔥 Motivation"),
            buildRadioGroup("physicalFeeling", "💪 Physical Feeling"),
            buildRadioGroup("muscleRecovery", "🏋️ Muscle Recovery"),
            {
              type: "Footer",
              label: "Submit my check-in",
              "on-click-action": {
                name: "complete",
                payload: {},
              },
            },
          ],
        },
      },
    ],
  };
}

function buildRadioGroup(name: string, label: string) {
  return {
    type: "RadioButtonsGroup",
    name,
    label,
    required: false,
    "data-source": [
      { id: "1", title: "😢 Very Poor" },
      { id: "2", title: "😕 Poor" },
      { id: "3", title: "😐 Neutral" },
      { id: "4", title: "🙂 Good" },
      { id: "5", title: "😁 Great" },
    ],
  };
}

/**
 * Score interpretation text for wellness aggregate.
 */
export function getScoreInterpretation(score: number): string {
  if (score <= 2.0) {
    return "Listen to your body today 💙";
  }
  if (score <= 3.5) {
    return "Moderate day — recover well 🟡";
  }
  if (score <= 4.5) {
    return "Good energy — great session ahead! 🟢";
  }
  return "Excellent — you're feeling great! 🔥";
}

/**
 * Send a confirmation WhatsApp message via Meta API after Flow completion.
 */
async function sendFlowConfirmation(
  toPhoneNumber: string,
  checkData: Record<string, unknown>
) {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const token = process.env.META_GRAPH_API_TOKEN;

  if (!(phoneNumberId && token)) {
    return;
  }

  // Calculate aggregate score
  const dimensionKeys = [
    "sleepQuality",
    "energyLevel",
    "foodIntake",
    "waterIntake",
    "mood",
    "motivation",
    "physicalFeeling",
    "muscleRecovery",
  ];
  const scores = dimensionKeys
    .map((k) => checkData[k])
    .filter((val): val is number => typeof val === "number");

  const avg =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const score = Math.round(avg * 10) / 10;
  const interpretation = getScoreInterpretation(score);

  const to = toPhoneNumber
    .replace(WHATSAPP_PREFIX_REGEX, "")
    .replace(PLUS_PREFIX_REGEX, "");

  const message = `✅ Wellness check complete! 🎉\n\nYour score today: ${score}/5\n${interpretation}\n\nView your trends in the PlayerARC app.`;

  try {
    await fetch(`${META_GRAPH_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    });
  } catch (error) {
    console.error("[metaWhatsapp] sendFlowConfirmation error:", error);
  }
}
