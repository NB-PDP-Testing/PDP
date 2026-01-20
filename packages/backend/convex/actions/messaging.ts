"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { sendCoachMessageNotification } from "../utils/email";

/**
 * Internal action to send message email notification
 * This is called from the sendMessage mutation via ctx.scheduler
 */
export const sendMessageEmail = internalAction({
  args: {
    messageId: v.id("coachParentMessages"),
    recipientId: v.id("messageRecipients"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("📧 Sending message email", {
      messageId: args.messageId,
      recipientId: args.recipientId,
    });

    try {
      // Fetch message and recipient records using internal query
      const messageData = await ctx.runQuery(
        internal.models.coachParentMessages.getMessageForEmail,
        {
          messageId: args.messageId,
          recipientId: args.recipientId,
        }
      );

      if (!messageData) {
        console.warn("⚠️ Message or recipient not found", {
          messageId: args.messageId,
          recipientId: args.recipientId,
        });
        return null;
      }

      const { message, recipient, guardian, organizationName } = messageData;

      // Skip if guardian has no email
      if (!guardian.email) {
        console.warn("⚠️ Guardian has no email address", {
          guardianId: recipient.guardianIdentityId,
          guardianName: guardian.firstName
            ? `${guardian.firstName} ${guardian.lastName || ""}`.trim()
            : "Unknown",
        });

        // Update recipient status to failed with reason
        await ctx.runMutation(
          internal.models.coachParentMessages.updateRecipientEmailStatus,
          {
            recipientId: args.recipientId,
            status: "failed",
            bounceReason: "No email address on file",
          }
        );

        return null;
      }

      // Format optional context fields
      let sessionDate: string | undefined;
      if (message.context?.sessionDate) {
        sessionDate = new Date(message.context.sessionDate).toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        );
      }

      // Build message detail URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://playerarc.io";
      const messageDetailUrl = `${baseUrl}/orgs/${message.organizationId}/parents/messages/${args.messageId}`;

      // Send email
      await sendCoachMessageNotification({
        email: guardian.email,
        recipientName: guardian.firstName
          ? `${guardian.firstName} ${guardian.lastName || ""}`.trim()
          : "Parent/Guardian",
        coachName: message.senderName,
        playerName: message.playerName,
        subject: message.subject,
        body: message.body,
        organizationName,
        messageDetailUrl,
        sessionType: message.context?.sessionType,
        sessionDate,
        developmentArea: message.context?.developmentArea,
        discussionPrompts: message.discussionPrompts,
        actionItems: message.actionItems,
      });

      // Update recipient status to sent
      await ctx.runMutation(
        internal.models.coachParentMessages.updateRecipientEmailStatus,
        {
          recipientId: args.recipientId,
          status: "sent",
        }
      );

      console.log("✅ Message email sent successfully", {
        to: guardian.email,
        messageId: args.messageId,
      });
    } catch (error) {
      console.error("❌ Error sending message email:", error);

      // Update recipient status to failed
      await ctx.runMutation(
        internal.models.coachParentMessages.updateRecipientEmailStatus,
        {
          recipientId: args.recipientId,
          status: "failed",
          bounceReason:
            error instanceof Error ? error.message : "Unknown error",
        }
      );
    }

    return null;
  },
});
