"use node";

import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { action } from "../_generated/server";
import {
  sendOrganizationInvitation,
  sendPendingGuardianActionNotification,
} from "../utils/email";

// Regex for removing trailing slashes from URLs
const TRAILING_SLASH_REGEX = /\/+$/;

/**
 * Send guardian notification email
 * Detects if user exists and sends appropriate email:
 * - Scenario A (existing user): Simple "You have pending actions" notification
 * - Scenario B (new user): Full invitation email with pending children message
 */
export const sendGuardianNotificationEmail = action({
  args: {
    guardianEmail: v.string(),
    guardianFirstName: v.string(),
    guardianLastName: v.string(),
    organizationId: v.string(),
    guardianPlayerLinkId: v.id("guardianPlayerLinks"),
    invitedByUserId: v.string(),
    invitedByUsername: v.string(),
    invitedByEmail: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    scenario: v.union(
      v.literal("existing_user"),
      v.literal("new_user"),
      v.literal("error")
    ),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    try {
      const {
        guardianEmail,
        guardianFirstName,
        guardianLastName,
        organizationId,
        guardianPlayerLinkId,
        invitedByUserId,
        invitedByUsername,
        invitedByEmail,
      } = args;

      console.log("[sendGuardianNotificationEmail] Starting for:", {
        email: guardianEmail,
        organizationId,
        linkId: guardianPlayerLinkId,
      });

      // Check if RESEND_API_KEY is configured
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.error(
          "[sendGuardianNotificationEmail] RESEND_API_KEY not configured"
        );
        return {
          success: false,
          scenario: "error" as const,
          message:
            "Email service not configured. Please set RESEND_API_KEY in Convex environment variables.",
        };
      }

      // Step 1: Check if user exists with this email
      const existingUser = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "user",
          where: [
            {
              field: "email",
              value: guardianEmail.toLowerCase().trim(),
              operator: "eq",
            },
          ],
        }
      );

      // Get organization details
      const organization = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "organization",
          where: [{ field: "_id", value: organizationId, operator: "eq" }],
        }
      );

      if (!organization) {
        console.error("[sendGuardianNotificationEmail] Organization not found");
        return {
          success: false,
          scenario: "error" as const,
          message: "Organization not found",
        };
      }

      const organizationName = organization.name;
      const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(
        TRAILING_SLASH_REGEX,
        ""
      );

      // SCENARIO A: User exists - send simple notification
      if (existingUser) {
        console.log(
          "[sendGuardianNotificationEmail] Scenario A: User exists, sending simple notification"
        );

        // Get pending children count for this guardian's email
        const pendingChildrenCount = await ctx.runQuery(
          internal.models.guardianPlayerLinks.getPendingChildrenCountByEmail,
          { guardianEmail: guardianEmail.toLowerCase().trim() }
        );

        console.log(
          `[sendGuardianNotificationEmail] Found ${pendingChildrenCount} pending children for ${guardianEmail}`
        );

        const loginUrl = `${siteUrl}/orgs/${organizationId}`;
        const recipientName = `${guardianFirstName} ${guardianLastName}`;

        await sendPendingGuardianActionNotification({
          email: guardianEmail,
          recipientName,
          organizationName,
          loginUrl,
          pendingChildrenCount,
        });

        // Update notificationSentAt on the link
        await ctx.runMutation(
          internal.models.guardianPlayerLinks.updateNotificationSentAt,
          {
            linkId: guardianPlayerLinkId,
          }
        );

        return {
          success: true,
          scenario: "existing_user" as const,
          message: "Simple notification sent to existing user",
        };
      }

      // SCENARIO B: User doesn't exist - create/find invitation and send full invitation email
      console.log(
        "[sendGuardianNotificationEmail] Scenario B: User doesn't exist, creating invitation"
      );

      // Check if invitation already exists for this email + organization
      const existingInvitations = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "invitation",
          paginationOpts: { cursor: null, numItems: 100 },
          where: [
            {
              field: "email",
              value: guardianEmail.toLowerCase().trim(),
              operator: "eq",
            },
          ],
        }
      );

      // Find invitation for this organization
      const existingInvitation = existingInvitations.page.find(
        (inv: any) =>
          inv.organizationId === organizationId && inv.status === "pending"
      );

      let invitationId: string;

      if (existingInvitation) {
        console.log(
          "[sendGuardianNotificationEmail] Using existing invitation:",
          existingInvitation._id
        );
        invitationId = existingInvitation._id;
      } else {
        // Create new Better Auth invitation
        console.log("[sendGuardianNotificationEmail] Creating new invitation");

        // Generate invitation using Better Auth component
        // This creates the invitation record and returns the invitation object
        const newInvitation = await ctx.runMutation(
          components.betterAuth.adapter.create,
          {
            input: {
              model: "invitation",
              data: {
                email: guardianEmail.toLowerCase().trim(),
                organizationId,
                inviterId: invitedByUserId,
                role: "member", // Better Auth role (will be mapped to functional roles later)
                status: "pending",
                expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
                metadata: {
                  suggestedFunctionalRoles: ["parent"], // Functional role
                  source: "guardian_assignment",
                },
              },
            },
          }
        );

        invitationId = newInvitation._id;
      }

      // Send full invitation email with pending children message
      const inviteLink = `${siteUrl}/orgs/accept-invitation/${invitationId}`;

      await sendOrganizationInvitation({
        email: guardianEmail,
        invitedByUsername,
        invitedByEmail,
        organizationName,
        inviteLink,
        functionalRoles: ["parent"],
        hasPendingChildren: true, // This triggers the pending children message
      });

      // Update notificationSentAt on the link
      await ctx.runMutation(
        internal.models.guardianPlayerLinks.updateNotificationSentAt,
        {
          linkId: guardianPlayerLinkId,
        }
      );

      return {
        success: true,
        scenario: "new_user" as const,
        message:
          "Full invitation email sent to new user with pending children message",
      };
    } catch (error) {
      console.error("[sendGuardianNotificationEmail] Error:", error);
      return {
        success: false,
        scenario: "error" as const,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
