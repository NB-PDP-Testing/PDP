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
    const adminEmail =
      process.env.DEMO_REQUEST_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      console.warn(
        "⚠️ DEMO_REQUEST_NOTIFICATION_EMAIL or ADMIN_EMAIL not configured. Notification will not be sent."
      );
      return null;
    }

    await sendDemoRequestNotification({
      name: args.name,
      email: args.email,
      phone: args.phone,
      organization: args.organization,
      message: args.message,
      requestedAt: args.requestedAt,
      adminEmail,
    });

    return null;
  },
});
