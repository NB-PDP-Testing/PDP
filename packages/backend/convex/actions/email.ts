"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";

/**
 * Send a wellness reminder email via Resend.
 * Called from the sendWellnessReminders internalMutation via ctx.scheduler.
 */
export const sendWellnessReminderEmail = internalAction({
  args: {
    to: v.string(),
    playerName: v.string(),
    organizationName: v.string(),
    wellnessUrl: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    const from =
      process.env.EMAIL_FROM_ADDRESS ||
      "PlayerARC <team@notifications.playerarc.io>";

    if (!apiKey) {
      console.warn(
        "⚠️ RESEND_API_KEY not configured. Wellness reminder email will not be sent."
      );
      return null;
    }

    const { organizationName, wellnessUrl } = args;
    const subject = `Daily Wellness Check-In Reminder — ${organizationName}`;
    const firstName = args.playerName.split(" ")[0] ?? args.playerName;

    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${subject}</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #1E3A5F; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">PlayerARC</h1>
      <p style="color: #22c55e; margin: 4px 0 0; font-size: 13px; font-style: italic;">As many as possible, for as long as possible…</p>
    </div>
    <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
      <h2 style="color: #1E3A5F; margin-top: 0;">Daily Wellness Check-In</h2>
      <p>Hi ${firstName},</p>
      <p>
        Don't forget to complete your daily wellness check-in for
        <strong>${organizationName}</strong> today.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a
          href="${wellnessUrl}"
          style="background-color: #22c55e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;"
        >
          Complete Check-In
        </a>
      </div>
      <p style="color: #666; font-size: 13px;">
        Tracking your wellness helps your coaches support you better. It only takes a minute!
      </p>
    </div>
    <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
      <p>© ${new Date().getFullYear()} PlayerARC. All rights reserved.</p>
    </div>
  </body>
</html>
    `.trim();

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [args.to],
          subject,
          html,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        console.log("✅ Wellness reminder email sent successfully:", result.id);
      } else {
        const err = await res.text();
        console.error("❌ Failed to send wellness reminder email:", {
          status: res.status,
          error: err,
        });
      }
    } catch (error) {
      console.error("❌ Error sending wellness reminder email:", error);
    }

    return null;
  },
});
