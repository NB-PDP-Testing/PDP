"use node";

/**
 * Phone Verification Actions — US-P8-005
 *
 * REQUIRED ENVIRONMENT VARIABLES:
 *   TWILIO_ACCOUNT_SID — Twilio account SID
 *   TWILIO_AUTH_TOKEN  — Twilio auth token
 *   TWILIO_SMS_FROM    — Plain SMS phone number in E.164 format (e.g. +353...).
 *                        Falls back to TWILIO_WHATSAPP_NUMBER if not set.
 *                        This number sends the verification PIN via plain SMS
 *                        (not WhatsApp) so it works before WhatsApp is detected.
 */

import crypto from "node:crypto";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";

// ============================================================
// SEND VERIFICATION PIN
// ============================================================

/**
 * Generate a 6-digit PIN, store it in verificationPins, and send via Twilio SMS.
 * Uses plain SMS (not WhatsApp) — phone format is unknown at this stage.
 */
export const sendVerificationPin = action({
  args: {
    phoneNumber: v.string(), // E.164 format, e.g. +353871234567
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.object({ sent: v.boolean() }),
  handler: async (ctx, args) => {
    // Generate 6-digit PIN using cryptographically secure random
    const pinNum = crypto.randomInt(100_000, 1_000_000);
    const pin = String(pinNum);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store in verificationPins (replaces any previous unused PIN)
    await ctx.runMutation(
      internal.models.whatsappWellness.storeVerificationPin,
      {
        playerIdentityId: args.playerIdentityId,
        pin,
        expiresAt,
      }
    );

    // Send via Twilio plain SMS
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    // Prefer dedicated SMS number; fall back to WhatsApp number (same Twilio account)
    const fromNumber =
      process.env.TWILIO_SMS_FROM ?? process.env.TWILIO_WHATSAPP_NUMBER;

    if (!(accountSid && authToken && fromNumber)) {
      console.error(
        "[phoneVerification] Twilio credentials not configured — cannot send PIN"
      );
      return { sent: false };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString(
        "base64"
      );

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: fromNumber, // Plain E.164, no "whatsapp:" prefix
          To: args.phoneNumber,
          Body: `Your PlayerARC verification code is: ${pin}. Valid for 10 minutes. Do not share this code.`,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[phoneVerification] Failed to send SMS:", error);
        return { sent: false };
      }

      return { sent: true };
    } catch (error) {
      console.error("[phoneVerification] Error sending SMS:", error);
      return { sent: false };
    }
  },
});

// ============================================================
// VERIFY PIN AND DETECT CHANNEL
// ============================================================

/**
 * Verify a PIN, detect WhatsApp availability, and register the player's channel.
 * On success: playerWellnessSettings is updated with phone number and channel.
 * The player still needs to explicitly opt in via the setWellnessOptIn mutation.
 */
export const verifyPinAndDetectChannel = action({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    pin: v.string(),
    phoneNumber: v.string(), // E.164 format
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      wellnessChannel: v.union(
        v.literal("whatsapp_flows"),
        v.literal("sms_conversational")
      ),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (
    ctx,
    args
  ): Promise<
    | {
        success: true;
        wellnessChannel: "whatsapp_flows" | "sms_conversational";
      }
    | { success: false; error: string }
  > => {
    // Step 1: Claim the PIN
    const pinResult: { valid: true } | { valid: false; error: string } =
      await ctx.runMutation(
        internal.models.whatsappWellness.claimVerificationPin,
        {
          playerIdentityId: args.playerIdentityId,
          pin: args.pin,
        }
      );

    if (!pinResult.valid) {
      return { success: false as const, error: pinResult.error };
    }

    // Step 2: Check WhatsApp availability via Meta Contacts API
    const availability: { isWhatsapp: boolean; waId: string | null } =
      await ctx.runAction(
        internal.actions.metaWhatsapp.checkWhatsappAvailability,
        { phoneNumber: args.phoneNumber }
      );

    const wellnessChannel: "whatsapp_flows" | "sms_conversational" =
      availability.isWhatsapp ? "whatsapp_flows" : "sms_conversational";

    // Step 3: Register channel (opt-in remains false until user toggles)
    await ctx.runMutation(
      internal.models.whatsappWellness.registerPlayerChannel,
      {
        playerIdentityId: args.playerIdentityId,
        organizationId: args.organizationId,
        phoneNumber: args.phoneNumber,
        wellnessChannel,
        whatsappOptIn: false,
      }
    );

    return { success: true as const, wellnessChannel };
  },
});
