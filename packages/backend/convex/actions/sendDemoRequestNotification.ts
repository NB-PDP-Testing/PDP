"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendDemoRequestNotification } from "../utils/email";

/**
 * Internal action to send demo request notification email
 * This is called from the createDemoRequest mutation
 */
export const sendNotification = internalAction({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    organization: v.optional(v.string()),
    message: v.optional(v.string()),
    requestedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("📧 Demo request notification action started", {
      name: args.name,
      email: args.email,
    });

    const emailConfig = process.env.ADMIN_EMAIL;

    if (!emailConfig) {
      console.warn(
        "⚠️ ADMIN_EMAIL not configured. Demo request notification will not be sent."
      );
      return null;
    }

    // Parse comma-separated email addresses and trim whitespace
    const adminEmails = emailConfig
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (adminEmails.length === 0) {
      console.warn("⚠️ No valid email addresses found in ADMIN_EMAIL.");
      return null;
    }

    console.log("📧 Sending demo request notification to:", adminEmails);

    try {
      await sendDemoRequestNotification({
        name: args.name,
        email: args.email,
        phone: args.phone,
        organization: args.organization,
        message: args.message,
        requestedAt: args.requestedAt,
        adminEmails,
      });
      console.log("✅ Demo request notification sent successfully");
    } catch (error) {
      console.error("❌ Error in demo request notification action:", error);
      throw error;
    }

    return null;
  },
});
