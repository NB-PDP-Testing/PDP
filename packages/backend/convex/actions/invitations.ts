"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendOrganizationInvitation } from "../utils/email";

/**
 * Internal action to resend invitation email
 * This is called from the resendInvitation mutation
 */
export const resendInvitationEmail = internalAction({
  args: {
    email: v.string(),
    invitedByUsername: v.string(),
    invitedByEmail: v.string(),
    organizationName: v.string(),
    inviteLink: v.string(),
    role: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("📧 Resending invitation email", {
      email: args.email,
      organizationName: args.organizationName,
    });

    try {
      await sendOrganizationInvitation({
        email: args.email,
        invitedByUsername: args.invitedByUsername,
        invitedByEmail: args.invitedByEmail,
        organizationName: args.organizationName,
        inviteLink: args.inviteLink,
        role: args.role,
      });
      console.log("✅ Invitation email resent successfully");
    } catch (error) {
      console.error("❌ Error resending invitation email:", error);
      throw error;
    }

    return null;
  },
});
