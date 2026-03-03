"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendChildAccountInviteEmail } from "../utils/email";

/**
 * Internal action to send a child account invite email.
 * Called from grantChildAccess / resendChildAccountInvite mutations
 * via ctx.scheduler.runAfter(0, ...).
 */
export const sendChildAccountInviteEmailAction = internalAction({
  args: {
    email: v.string(),
    playerFirstName: v.string(),
    parentName: v.string(),
    organizationName: v.string(),
    setupToken: v.string(),
    appUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const baseUrl =
      args.appUrl ||
      process.env.CONVEX_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://app.playerarc.io";

    const setupLink = `${baseUrl}/child-account-setup?token=${args.setupToken}`;

    await sendChildAccountInviteEmail({
      email: args.email,
      playerFirstName: args.playerFirstName,
      parentName: args.parentName,
      organizationName: args.organizationName,
      setupLink,
    });

    return null;
  },
});
