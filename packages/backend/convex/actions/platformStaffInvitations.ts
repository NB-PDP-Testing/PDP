"use node";

/**
 * Platform Staff Invitations Actions
 *
 * Internal actions for sending invitation emails. Actions are needed because
 * mutations cannot make HTTP calls to external services like Resend.
 */

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { sendPlatformStaffInvitationEmail } from "../utils/email";

const INVITATION_EXPIRY_DAYS = 7;

/**
 * Internal action to send platform staff invitation email
 * Called from the createInvitation mutation via scheduler
 */
export const sendInvitationEmail = internalAction({
  args: {
    email: v.string(),
    invitedByName: v.optional(v.string()),
    invitedByEmail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const baseUrl = process.env.SITE_URL || "https://app.playerarc.io";
    const inviteLink = `${baseUrl}/signup`;

    console.log("📧 Sending platform staff invitation email", {
      email: args.email,
      invitedByName: args.invitedByName,
    });

    try {
      await sendPlatformStaffInvitationEmail({
        email: args.email,
        invitedByName: args.invitedByName,
        invitedByEmail: args.invitedByEmail,
        inviteLink,
        expiresInDays: INVITATION_EXPIRY_DAYS,
      });
      console.log("✅ Platform staff invitation email sent successfully");
    } catch (error) {
      console.error("❌ Error sending platform staff invitation email:", error);
      // Don't throw - log the error but don't break the flow
      // The invitation record is already created
    }

    return null;
  },
});
