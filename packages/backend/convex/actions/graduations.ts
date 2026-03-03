"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import {
  sendGraduationInvitationEmail,
  sendVerificationPinEmail,
} from "../utils/email";

/**
 * Internal action to send a graduation invitation email
 * Called from sendGraduationInvite mutation via ctx.scheduler.runAfter(0, ...)
 */
export const sendGraduationInvitationEmailAction = internalAction({
  args: {
    email: v.string(),
    playerFirstName: v.string(),
    organizationName: v.string(),
    claimToken: v.string(),
    appUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const baseUrl =
      args.appUrl ||
      process.env.CONVEX_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://app.playerarc.io";

    const claimLink = `${baseUrl}/claim-account/${args.claimToken}`;

    await sendGraduationInvitationEmail({
      email: args.email,
      playerFirstName: args.playerFirstName,
      organizationName: args.organizationName,
      claimLink,
    });

    return null;
  },
});

/**
 * Internal action to send a 6-digit verification PIN
 * Called from sendClaimVerificationPin mutation via ctx.scheduler.runAfter(0, ...)
 *
 * Channel:
 * - "sms": sends via Twilio SMS to the player's mobile number
 * - "email": sends via Resend to the claim email address
 */
export const sendVerificationPinAction = internalAction({
  args: {
    channel: v.union(v.literal("sms"), v.literal("email")),
    destination: v.string(), // Phone number (for SMS) or email address (for email)
    pin: v.string(),
    playerFirstName: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const message = `Your PlayerARC account claim code is: ${args.pin}. Valid for 10 minutes. If you did not request this, ignore this message.`;

    if (args.channel === "sms") {
      // Send SMS via Twilio
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber =
        process.env.TWILIO_SMS_FROM || process.env.TWILIO_WHATSAPP_NUMBER;

      if (!(accountSid && authToken && fromNumber)) {
        console.warn(
          "⚠️ Twilio SMS credentials not configured. Verification PIN SMS will not be sent."
        );
        return null;
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
            From: fromNumber.replace("whatsapp:", ""), // Strip whatsapp: prefix for SMS
            To: args.destination,
            Body: message,
          }),
        });

        if (response.ok) {
          console.log("✅ Verification PIN SMS sent to", args.destination);
        } else {
          const error = await response.text();
          console.error("❌ Failed to send verification PIN SMS:", error);
        }
      } catch (error) {
        console.error("❌ Error sending verification PIN SMS:", error);
      }
    } else {
      // Send email via Resend
      await sendVerificationPinEmail({
        email: args.destination,
        playerFirstName: args.playerFirstName,
        pin: args.pin,
      });
    }

    return null;
  },
});
