"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendGraduationInvitationEmail } from "../utils/email";

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

    const claimLink = `${baseUrl}/claim-account?token=${args.claimToken}`;

    await sendGraduationInvitationEmail({
      email: args.email,
      playerFirstName: args.playerFirstName,
      organizationName: args.organizationName,
      claimLink,
    });

    return null;
  },
});
