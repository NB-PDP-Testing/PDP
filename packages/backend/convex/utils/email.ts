/**
 * Email service utilities for sending invitation emails
 *
 * This module provides email sending functionality for organization invitations.
 * Currently supports basic email sending - can be extended with Resend, SendGrid, etc.
 */

type TeamInfo = {
  id: string;
  name: string;
  sport?: string;
  ageGroup?: string;
};

type PlayerInfo = {
  id: string;
  name: string;
  ageGroup?: string;
};

type InvitationEmailData = {
  email: string;
  invitedByUsername: string;
  invitedByEmail: string;
  organizationName: string;
  inviteLink: string;
  functionalRoles?: string[]; // Functional roles (Coach, Parent, Admin)
  // Role-specific context for email
  teams?: TeamInfo[]; // For coach role - shows which teams they'll manage
  players?: PlayerInfo[]; // For parent role - shows which players they're linked to
  hasPendingChildren?: boolean; // For guardian invitation - indicates pending child acknowledgments
};

/**
 * Send an organization invitation email
 *
 * TODO: Integrate with email service provider (Resend, SendGrid, etc.)
 * For now, this logs the email details - actual sending should be implemented
 * via an HTTP action or external service.
 */
/**
 * Get role-specific capabilities list
 */
function getRoleCapabilities(role: string): string[] {
  switch (role.toLowerCase()) {
    case "coach":
      return [
        "Manage your assigned teams and players",
        "Create and track player assessments",
        "Record voice notes with AI transcription",
        "Set and monitor development goals",
        "View player passports and progress",
      ];
    case "parent":
      return [
        "View your child's player passport and progress",
        "Track development goals and assessments",
        "Communicate with coaches",
        "Access medical information and attendance records",
      ];
    case "admin":
      return [
        "Manage organization members and teams",
        "Invite and assign roles to users",
        "Configure organization settings",
        "Access all features across the platform",
      ];
    default:
      return ["Access organization features"];
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Email template generation requires complex conditional logic for role-specific content (teams for coaches, players for parents, capabilities for all roles). Refactoring would reduce readability of the template structure.
export async function sendOrganizationInvitation(
  data: InvitationEmailData
): Promise<void> {
  const {
    email,
    invitedByUsername,
    invitedByEmail,
    organizationName,
    inviteLink,
    functionalRoles,
    teams,
    players,
    hasPendingChildren,
  } = data;

  // Format roles for display - NEVER show Better Auth role
  const rolesDisplay =
    functionalRoles && functionalRoles.length > 0
      ? functionalRoles
          .map((r) => r.charAt(0).toUpperCase() + r.slice(1))
          .join(", ")
      : null;

  // Format sport codes to display names
  const formatSport = (sportCode: string) => {
    const sportMap: Record<string, string> = {
      gaa_football: "GAA Football",
      gaa_hurling: "GAA Hurling",
      gaa_camogie: "GAA Camogie",
      gaa_handball: "GAA Handball",
      soccer: "Soccer",
      rugby: "Rugby",
      basketball: "Basketball",
      athletics: "Athletics",
      swimming: "Swimming",
    };
    return (
      sportMap[sportCode] ||
      sportCode.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  // Email template
  const subject = `Invitation to join ${organizationName} on PlayerARC`;
  const preheaderText = rolesDisplay
    ? `Join as ${rolesDisplay} at ${organizationName}`
    : `Join ${organizationName} on PlayerARC`;
  const logoUrl = getLogoUrl();
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Preheader text (shows in email preview) -->
        <div style="display: none; max-height: 0px; overflow: hidden;">
          ${preheaderText}
        </div>
        <div style="background-color: #1E3A5F; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 auto;">
            <tr>
              <td style="text-align: center; padding-bottom: 4px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 12px;">
                      <img src="${logoUrl}" alt="PlayerARC Logo" style="max-width: 80px; height: auto; display: block;" />
                    </td>
                    <td style="vertical-align: middle;">
                      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold; line-height: 1.2;">PlayerARC</h1>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding-top: 0;">
                <p style="color: #22c55e; margin: 0; font-size: 13px; font-style: italic;">As many as possible, for as long as possible…</p>
              </td>
            </tr>
          </table>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1E3A5F; margin-top: 0;">You've been invited!</h2>
          <p>Hi there,</p>
          <p>
            <strong>${invitedByUsername}</strong> (${invitedByEmail}) has invited you to join
            <strong>${organizationName}</strong> on PlayerARC.
          </p>

          ${rolesDisplay ? `<p style="font-size: 16px; margin: 20px 0;"><strong>Your Role${functionalRoles && functionalRoles.length > 1 ? "s" : ""}:</strong> ${rolesDisplay}</p>` : ""}

          <!-- Primary CTA - Above the fold for immediate action -->
          <div style="text-align: center; margin: 25px 0;">
            <a
              href="${inviteLink}"
              style="background-color: #22c55e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;"
              onmouseover="this.style.backgroundColor='#16a34a'"
              onmouseout="this.style.backgroundColor='#22c55e'"
            >
              ${hasPendingChildren ? "Accept Invitation & Review Children" : "Accept Invitation & Create Your Account"}
            </a>
          </div>

          <!-- Optional divider with "Want to know more?" prompt -->
          ${
            (teams && teams.length > 0) ||
            (players && players.length > 0) ||
            (functionalRoles && functionalRoles.length > 0)
              ? `
          <div style="text-align: center; margin: 30px 0 25px 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <p style="color: #666; font-size: 14px; margin: 0; font-style: italic;">Want to know more about your role and responsibilities? Read on below.</p>
          </div>
          `
              : ""
          }

          <!-- Detailed information for users who want to know more -->
          ${
            teams && teams.length > 0
              ? `
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #22c55e;">
              <h3 style="color: #1E3A5F; margin: 0 0 10px 0; font-size: 16px;">Your Teams</h3>
              <p style="font-size: 13px; color: #666; margin: 0 0 10px 0;">You've been assigned to coach the following teams:</p>
              <ul style="margin: 0; padding-left: 20px;">
                ${teams
                  .map(
                    (team) => `
                  <li style="margin: 5px 0; color: #333;">
                    <strong>${team.name}</strong>${team.ageGroup ? ` - ${team.ageGroup}` : ""}${team.sport ? ` (${formatSport(team.sport)})` : ""}
                  </li>
                `
                  )
                  .join("")}
              </ul>
            </div>
          `
              : ""
          }

          ${
            players && players.length > 0
              ? `
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="color: #1E3A5F; margin: 0 0 10px 0; font-size: 16px;">Linked Players</h3>
              <p style="font-size: 13px; color: #666; margin: 0 0 10px 0;">You'll be able to view these players' progress and development:</p>
              <ul style="margin: 0; padding-left: 20px;">
                ${players
                  .map(
                    (player) => `
                  <li style="margin: 5px 0; color: #333;">
                    <strong>${player.name}</strong>${player.ageGroup ? ` - ${player.ageGroup}` : ""}
                  </li>
                `
                  )
                  .join("")}
              </ul>
            </div>
          `
              : ""
          }

          ${
            hasPendingChildren
              ? `
            <div style="background-color: #fff7ed; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">⚠️ Action Required: Child Acknowledgments</h3>
              <p style="color: #78350f; margin: 0 0 10px 0;">
                You have been assigned as a guardian for one or more children at ${organizationName}.
              </p>
              <p style="color: #78350f; margin: 0;">
                <strong>After creating your account, you will need to review and acknowledge each child connection.</strong> This ensures accuracy and protects everyone's privacy.
              </p>
            </div>
          `
              : ""
          }

          ${
            functionalRoles && functionalRoles.length > 0
              ? `
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #1E3A5F; margin: 0 0 10px 0; font-size: 16px;">What you'll be able to do:</h3>
              ${functionalRoles
                .map(
                  (role) => `
                ${functionalRoles.length > 1 ? `<p style="margin: 15px 0 5px 0; font-weight: bold; color: #1E3A5F;">${role.charAt(0).toUpperCase() + role.slice(1)}:</p>` : ""}
                <ul style="margin: 5px 0; padding-left: 20px;">
                  ${getRoleCapabilities(role)
                    .map(
                      (cap) =>
                        `<li style="margin: 5px 0; color: #666;">${cap}</li>`
                    )
                    .join("")}
                </ul>
              `
                )
                .join("")}
            </div>
          `
              : ""
          }

          <!-- Secondary CTA - Repeat for users who scrolled through details -->
          <div style="text-align: center; margin: 30px 0;">
            <a
              href="${inviteLink}"
              style="background-color: #22c55e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;"
              onmouseover="this.style.backgroundColor='#16a34a'"
              onmouseout="this.style.backgroundColor='#22c55e'"
            >
              ${hasPendingChildren ? "Accept Invitation & Review Children" : "Accept Invitation & Create Your Account"}
            </a>
          </div>

          <p style="font-size: 13px; color: #666; margin-top: 25px;">
            Once you accept, you'll be able to immediately access <strong>${organizationName}</strong> and start using your assigned features.
          </p>

          <p style="font-size: 13px; color: #666;">
            Questions? Reply to this email and we'll help you get started.
          </p>

          <p style="font-size: 12px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${inviteLink}" style="color: #1E3A5F; word-break: break-all;">${inviteLink}</a>
          </p>
          <p style="font-size: 12px; color: #999;">
            This invitation will expire in 7 days. If you didn't expect this invitation,
            you can safely ignore this email.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} PlayerARC. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const textBody = `
You've been invited to join ${organizationName} on PlayerARC!

${invitedByUsername} (${invitedByEmail}) has invited you to join ${organizationName}.

${rolesDisplay ? `Your Role${functionalRoles && functionalRoles.length > 1 ? "s" : ""}: ${rolesDisplay}\n` : ""}
${
  teams && teams.length > 0
    ? `
YOUR TEAMS
You've been assigned to coach the following teams:
${teams.map((team) => `  • ${team.name}${team.ageGroup ? ` - ${team.ageGroup}` : ""}${team.sport ? ` (${formatSport(team.sport)})` : ""}`).join("\n")}
`
    : ""
}
${
  players && players.length > 0
    ? `
LINKED PLAYERS
You'll be able to view these players' progress and development:
${players.map((player) => `  • ${player.name}${player.ageGroup ? ` - ${player.ageGroup}` : ""}`).join("\n")}
`
    : ""
}
${
  hasPendingChildren
    ? `
⚠️ ACTION REQUIRED: Child Acknowledgments

You have been assigned as a guardian for one or more children at ${organizationName}.

After creating your account, you will need to review and acknowledge each child connection. This ensures accuracy and protects everyone's privacy.
`
    : ""
}
${
  functionalRoles && functionalRoles.length > 0
    ? `
WHAT YOU'LL BE ABLE TO DO:
${functionalRoles
  .map(
    (role) => `
${functionalRoles.length > 1 ? `${role.charAt(0).toUpperCase() + role.slice(1)}:\n` : ""}${getRoleCapabilities(
  role
)
  .map((cap) => `  • ${cap}`)
  .join("\n")}`
  )
  .join("\n")}
`
    : ""
}

${hasPendingChildren ? "Accept your invitation and review children by clicking this link:" : "Accept your invitation by clicking this link:"}
${inviteLink}

${hasPendingChildren ? "Once you accept, you'll need to review and acknowledge your child connections before accessing your assigned features." : `Once you accept, you'll be able to immediately access ${organizationName} and start using your assigned features.`}

Questions? Reply to this email and we'll help you get started.

---
This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} PlayerARC. All rights reserved.
  `.trim();

  // Log email details (for development/debugging)
  console.log("📧 Organization Invitation Email:", {
    to: email,
    subject,
    inviteLink,
    organizationName,
    invitedBy: invitedByUsername,
    functionalRoles,
    rolesDisplay,
    teamsCount: teams?.length || 0,
    playersCount: players?.length || 0,
  });

  // Send email via Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.EMAIL_FROM_ADDRESS ||
    "PlayerARC <team@notifications.playerarc.io>";

  if (!resendApiKey) {
    console.warn(
      "⚠️ RESEND_API_KEY not configured. Email will not be sent. Set RESEND_API_KEY in Convex dashboard."
    );
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject,
        html: htmlBody,
        text: textBody,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Failed to send email via Resend:", {
        status: response.status,
        error: errorData,
      });
      throw new Error(`Resend API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Email sent successfully via Resend:", result.id);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    // Don't throw - log the error but don't break the invitation flow
    // The invitation is still created in the database
  }
}

/**
 * Generate WhatsApp invitation message
 */
export function generateWhatsAppInvitationMessage(
  data: InvitationEmailData
): string {
  const { invitedByUsername, organizationName, inviteLink, functionalRoles } =
    data;

  // Format roles for display
  const rolesDisplay =
    functionalRoles && functionalRoles.length > 0
      ? functionalRoles
          .map((r) => r.charAt(0).toUpperCase() + r.slice(1))
          .join(", ")
      : null;

  let message = `🏆 *You've been invited to join ${organizationName} on PlayerARC!*\n\n`;
  message += `${invitedByUsername} has invited you to join ${organizationName}.\n\n`;
  if (rolesDisplay) {
    message += `Role${functionalRoles && functionalRoles.length > 1 ? "s" : ""}: ${rolesDisplay}\n\n`;
  }
  message +=
    "PlayerARC helps coaches and parents collaborate to support young athletes.\n\n";
  message += `Accept your invitation:\n${inviteLink}\n\n`;
  message += "This invitation expires in 7 days.";

  return message;
}

/**
 * Get the PlayerARC logo URL for emails
 */
function getLogoUrl(): string {
  // Use production URL for logo (email clients can't access localhost)
  // This ensures logo displays correctly in both dev and production
  return "https://playerarc.io/logos-landing/PDP-Logo-OffWhiteOrbit_GreenHuman.png";
}

/**
 * Demo request notification email data
 */
type DemoRequestNotificationData = {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  message?: string;
  requestedAt: number;
  adminEmails: string[]; // Email addresses to send notification to
};

/**
 * Send email notification when a new demo request is submitted
 */
export async function sendDemoRequestNotification(
  data: DemoRequestNotificationData
): Promise<void> {
  const {
    name,
    email,
    phone,
    organization,
    message,
    requestedAt,
    adminEmails,
  } = data;

  const subject = `New Demo Request from ${name}`;
  const requestDate = new Date(requestedAt).toLocaleString();
  const logoUrl = getLogoUrl();

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1E3A5F; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 auto;">
            <tr>
              <td style="text-align: center; padding-bottom: 4px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 12px;">
                      <img src="${logoUrl}" alt="PlayerARC Logo" style="max-width: 80px; height: auto; display: block;" />
                    </td>
                    <td style="vertical-align: middle;">
                      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold; line-height: 1.2;">PlayerARC</h1>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding-top: 0;">
                <p style="color: #22c55e; margin: 0; font-size: 13px; font-style: italic;">As many as possible, for as long as possible…</p>
              </td>
            </tr>
          </table>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1E3A5F; margin-top: 0;">New Demo Request</h2>
          <p>A new demo request has been submitted on PlayerARC.</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #1E3A5F; margin-top: 0;">Request Details</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            ${phone ? `<p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>` : ""}
            ${organization ? `<p><strong>Organization:</strong> ${organization}</p>` : ""}
            ${message ? `<p><strong>Message:</strong><br>${message.replace(/\n/g, "<br>")}</p>` : ""}
            <p><strong>Submitted:</strong> ${requestDate}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a 
              href="mailto:${email}?subject=Re: Demo Request for PlayerARC" 
              style="background-color: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;"
            >
              Reply to ${name}
            </a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} PlayerARC. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const textBody = `
New Demo Request from ${name}

A new demo request has been submitted on PlayerARC.

Request Details:
- Name: ${name}
- Email: ${email}
${phone ? `- Phone: ${phone}\n` : ""}
${organization ? `- Organization: ${organization}\n` : ""}
${message ? `- Message: ${message}\n` : ""}
- Submitted: ${requestDate}

Reply to: ${email}
  `.trim();

  // Send email via Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.EMAIL_FROM_ADDRESS ||
    "PlayerARC <team@notifications.playerarc.io>";

  if (!resendApiKey) {
    console.warn(
      "⚠️ RESEND_API_KEY not configured. Demo request notification will not be sent."
    );
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: adminEmails, // Resend supports array of recipients
        subject,
        html: htmlBody,
        text: textBody,
        replyTo: email, // Set reply-to to the requester's email
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Failed to send demo request notification:", {
        status: response.status,
        error: errorData,
      });
      throw new Error(`Resend API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Demo request notification sent successfully:", result.id);
  } catch (error) {
    console.error("❌ Error sending demo request notification:", error);
    // Don't throw - log the error but don't break the demo request creation
  }
}

/**
 * Coach message email data
 */
type CoachMessageEmailData = {
  email: string;
  recipientName: string; // Guardian's name
  coachName: string;
  playerName: string;
  subject: string;
  body: string;
  organizationName: string;
  messageDetailUrl: string;
  // Optional context
  sessionType?: string;
  sessionDate?: string;
  developmentArea?: string;
  // Optional insight data
  discussionPrompts?: string[];
  actionItems?: string[];
};

/**
 * Build HTML email template for coach-to-parent messages
 */
function buildCoachMessageEmailHtml(data: CoachMessageEmailData): string {
  const {
    recipientName,
    coachName,
    playerName,
    subject,
    body,
    organizationName,
    messageDetailUrl,
    sessionType,
    sessionDate,
    developmentArea,
    discussionPrompts,
    actionItems,
  } = data;

  const logoUrl = getLogoUrl();

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1E3A5F; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 auto;">
            <tr>
              <td style="text-align: center; padding-bottom: 4px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 12px;">
                      <img src="${logoUrl}" alt="PlayerARC Logo" style="max-width: 80px; height: auto; display: block;" />
                    </td>
                    <td style="vertical-align: middle;">
                      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold; line-height: 1.2;">PlayerARC</h1>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding-top: 0;">
                <p style="color: #22c55e; margin: 0; font-size: 13px; font-style: italic;">As many as possible, for as long as possible…</p>
              </td>
            </tr>
          </table>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1E3A5F; margin-top: 0;">Message from ${coachName}</h2>
          <p>Hi ${recipientName},</p>
          <p>
            <strong>${coachName}</strong> has sent you a message about <strong>${playerName}</strong> at ${organizationName}.
          </p>

          <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h3 style="color: #1E3A5F; margin: 0 0 15px 0; font-size: 18px;">${subject}</h3>
            <p style="white-space: pre-wrap; color: #333; line-height: 1.6;">${body}</p>
          </div>

          ${
            sessionType || sessionDate || developmentArea
              ? `
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #1E3A5F; margin: 0 0 10px 0; font-size: 14px;">Session Details</h4>
            ${sessionType ? `<p style="margin: 5px 0; color: #666;"><strong>Type:</strong> ${sessionType}</p>` : ""}
            ${sessionDate ? `<p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${sessionDate}</p>` : ""}
            ${developmentArea ? `<p style="margin: 5px 0; color: #666;"><strong>Focus Area:</strong> ${developmentArea}</p>` : ""}
          </div>
          `
              : ""
          }

          ${
            discussionPrompts && discussionPrompts.length > 0
              ? `
          <div style="background-color: #faf5ff; padding: 15px; border-radius: 5px; margin: 20px 0; border: 2px solid #c084fc;">
            <h4 style="color: #7c3aed; margin: 0 0 10px 0; font-size: 14px;">Discussion Points</h4>
            <ul style="margin: 5px 0; padding-left: 20px; color: #4c1d95;">
              ${discussionPrompts.map((prompt) => `<li style="margin: 5px 0;">${prompt}</li>`).join("")}
            </ul>
          </div>
          `
              : ""
          }

          ${
            actionItems && actionItems.length > 0
              ? `
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0; border: 2px solid #60a5fa;">
            <h4 style="color: #1e40af; margin: 0 0 10px 0; font-size: 14px;">Action Items</h4>
            <ul style="margin: 5px 0; padding-left: 20px; color: #1e3a8a;">
              ${actionItems.map((item) => `<li style="margin: 5px 0;">${item}</li>`).join("")}
            </ul>
          </div>
          `
              : ""
          }

          <div style="text-align: center; margin: 30px 0;">
            <a
              href="${messageDetailUrl}"
              style="background-color: #22c55e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;"
              onmouseover="this.style.backgroundColor='#16a34a'"
              onmouseout="this.style.backgroundColor='#22c55e'"
            >
              View in PlayerARC
            </a>
          </div>

          <p style="font-size: 13px; color: #666;">
            You can respond or acknowledge this message by viewing it in PlayerARC.
          </p>

          <p style="font-size: 12px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${messageDetailUrl}" style="color: #1E3A5F; word-break: break-all;">${messageDetailUrl}</a>
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} ${organizationName} via PlayerARC. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Build plain text email for coach-to-parent messages
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Email template generation requires conditional logic for optional fields (context, prompts, action items). Similar to invitation email pattern, this is necessary for clean template structure.
function buildCoachMessageEmailText(data: CoachMessageEmailData): string {
  const {
    recipientName,
    coachName,
    playerName,
    subject,
    body,
    organizationName,
    messageDetailUrl,
    sessionType,
    sessionDate,
    developmentArea,
    discussionPrompts,
    actionItems,
  } = data;

  let text = `Message from ${coachName}\n\n`;
  text += `Hi ${recipientName},\n\n`;
  text += `${coachName} has sent you a message about ${playerName} at ${organizationName}.\n\n`;
  text += "---\n";
  text += `${subject}\n`;
  text += "---\n\n";
  text += `${body}\n\n`;

  if (sessionType || sessionDate || developmentArea) {
    text += "SESSION DETAILS\n";
    if (sessionType) {
      text += `Type: ${sessionType}\n`;
    }
    if (sessionDate) {
      text += `Date: ${sessionDate}\n`;
    }
    if (developmentArea) {
      text += `Focus Area: ${developmentArea}\n`;
    }
    text += "\n";
  }

  if (discussionPrompts && discussionPrompts.length > 0) {
    text += "DISCUSSION POINTS\n";
    for (const prompt of discussionPrompts) {
      text += `  • ${prompt}\n`;
    }
    text += "\n";
  }

  if (actionItems && actionItems.length > 0) {
    text += "ACTION ITEMS\n";
    for (const item of actionItems) {
      text += `  • ${item}\n`;
    }
    text += "\n";
  }

  text += `View in PlayerARC:\n${messageDetailUrl}\n\n`;
  text +=
    "You can respond or acknowledge this message by viewing it in PlayerARC.\n\n";
  text += "---\n";
  text += `© ${new Date().getFullYear()} ${organizationName} via PlayerARC. All rights reserved.\n`;

  return text.trim();
}

/**
 * Send coach-to-parent message notification email
 */
export async function sendCoachMessageNotification(
  data: CoachMessageEmailData
): Promise<void> {
  const { email, subject } = data;

  const emailSubject = `Message from ${data.coachName} about ${data.playerName}`;
  const htmlBody = buildCoachMessageEmailHtml(data);
  const textBody = buildCoachMessageEmailText(data);

  // Log email details (for development/debugging)
  console.log("📧 Coach Message Notification Email:", {
    to: email,
    subject: emailSubject,
    messageSubject: subject,
    coachName: data.coachName,
    playerName: data.playerName,
    organizationName: data.organizationName,
  });

  // Send email via Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.EMAIL_FROM_ADDRESS ||
    "PlayerARC <team@notifications.playerarc.io>";

  if (!resendApiKey) {
    console.warn(
      "⚠️ RESEND_API_KEY not configured. Coach message email will not be sent. Set RESEND_API_KEY in Convex dashboard."
    );
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: emailSubject,
        html: htmlBody,
        text: textBody,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Failed to send coach message email via Resend:", {
        status: response.status,
        error: errorData,
      });
      throw new Error(`Resend API error: ${response.status}`);
    }

    const result = await response.json();
    console.log(
      "✅ Coach message email sent successfully via Resend:",
      result.id
    );
  } catch (error) {
    console.error("❌ Error sending coach message email:", error);
    throw error; // Re-throw so the action can handle the failure
  }
}

/**
 * Send acknowledgement email to the demo request requester
 */
export async function sendDemoRequestAcknowledgement(data: {
  name: string;
  email: string;
  requestedAt: number;
}): Promise<void> {
  const { name, email, requestedAt } = data;

  const subject = "Thank you for your demo request - PlayerARC";
  const requestDate = new Date(requestedAt).toLocaleString();
  const logoUrl = getLogoUrl();

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1E3A5F; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 auto;">
            <tr>
              <td style="text-align: center; padding-bottom: 4px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 12px;">
                      <img src="${logoUrl}" alt="PlayerARC Logo" style="max-width: 80px; height: auto; display: block;" />
                    </td>
                    <td style="vertical-align: middle;">
                      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold; line-height: 1.2;">PlayerARC</h1>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding-top: 0;">
                <p style="color: #22c55e; margin: 0; font-size: 13px; font-style: italic;">As many as possible, for as long as possible…</p>
              </td>
            </tr>
          </table>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1E3A5F; margin-top: 0;">Thank you for your interest, ${name}!</h2>
          <p>We've received your demo request submitted on ${requestDate} and our team will be in touch with you shortly.</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #1E3A5F; margin-top: 0;">What happens next?</h3>
            <ul style="color: #666; padding-left: 20px;">
              <li>Our team will review your request within 24 hours</li>
              <li>We'll contact you to schedule a convenient time for your personalized demo</li>
              <li>During the demo, we'll show you how PlayerARC can help manage and develop young athletes</li>
            </ul>
          </div>
          
          <p style="color: #666;">
            If you have any questions in the meantime, feel free to reply to this email and we'll be happy to help.
          </p>
          
          <p style="color: #666; margin-top: 30px;">
            Best regards,<br>
            <strong>The PlayerARC Team</strong>
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} PlayerARC. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const textBody = `
Thank you for your interest, ${name}!

We've received your demo request submitted on ${requestDate} and our team will be in touch with you shortly.

What happens next?
- Our team will review your request within 24 hours
- We'll contact you to schedule a convenient time for your personalized demo
- During the demo, we'll show you how PlayerARC can help manage and develop young athletes

If you have any questions in the meantime, feel free to reply to this email and we'll be happy to help.

Best regards,
The PlayerARC Team

© ${new Date().getFullYear()} PlayerARC. All rights reserved.
  `.trim();

  // Send email via Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.EMAIL_FROM_ADDRESS ||
    "PlayerARC <team@notifications.playerarc.io>";

  if (!resendApiKey) {
    console.warn(
      "⚠️ RESEND_API_KEY not configured. Demo request acknowledgement will not be sent."
    );
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject,
        html: htmlBody,
        text: textBody,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Failed to send demo request acknowledgement:", {
        status: response.status,
        error: errorData,
      });
      throw new Error(`Resend API error: ${response.status}`);
    }

    const result = await response.json();
    console.log(
      "✅ Demo request acknowledgement sent successfully:",
      result.id
    );
  } catch (error) {
    console.error("❌ Error sending demo request acknowledgement:", error);
    // Don't throw - log the error but don't break the demo request creation
  }
}

/**
 * Pending guardian action notification email data (for existing users)
 */
type PendingGuardianActionEmailData = {
  email: string;
  recipientName: string;
  organizationName: string;
  loginUrl: string;
  pendingChildrenCount: number;
};

/**
 * Send simple notification to existing user about pending guardian actions
 * This is for Scenario A - user already has an account
 * Does NOT include any child details (PII protection)
 */
export async function sendPendingGuardianActionNotification(
  data: PendingGuardianActionEmailData
): Promise<void> {
  const {
    email,
    recipientName,
    organizationName,
    loginUrl,
    pendingChildrenCount,
  } = data;

  const subject = `Pending Action Required - ${organizationName}`;
  const childrenText =
    pendingChildrenCount === 1
      ? "1 pending child connection"
      : `${pendingChildrenCount} pending child connections`;
  const logoUrl = getLogoUrl();

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1E3A5F; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 auto;">
            <tr>
              <td style="text-align: center; padding-bottom: 4px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 12px;">
                      <img src="${logoUrl}" alt="PlayerARC Logo" style="max-width: 80px; height: auto; display: block;" />
                    </td>
                    <td style="vertical-align: middle;">
                      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold; line-height: 1.2;">PlayerARC</h1>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding-top: 0;">
                <p style="color: #22c55e; margin: 0; font-size: 13px; font-style: italic;">As many as possible, for as long as possible…</p>
              </td>
            </tr>
          </table>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1E3A5F; margin-top: 0;">You Have Pending Actions</h2>
          <p>Hi ${recipientName},</p>
          <p>
            You have <strong>${childrenText}</strong> to review at <strong>${organizationName}</strong> on PlayerARC.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a
              href="${loginUrl}"
              style="background-color: #22c55e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;"
              onmouseover="this.style.backgroundColor='#16a34a'"
              onmouseout="this.style.backgroundColor='#22c55e'"
            >
              Log In to Review
            </a>
          </div>

          <p style="font-size: 13px; color: #666;">
            Please log in to your PlayerARC account to review and acknowledge these child connections.
          </p>

          <p style="font-size: 12px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${loginUrl}" style="color: #1E3A5F; word-break: break-all;">${loginUrl}</a>
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>© ${new Date().getFullYear()} PlayerARC. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const textBody = `
You Have Pending Actions

Hi ${recipientName},

You have ${childrenText} to review at ${organizationName} on PlayerARC.

Please log in to your PlayerARC account to review and acknowledge these child connections.

Log in here:
${loginUrl}

© ${new Date().getFullYear()} PlayerARC. All rights reserved.
  `.trim();

  // Log email details (for development/debugging)
  console.log("📧 Pending Guardian Action Notification:", {
    to: email,
    subject,
    organizationName,
  });

  // Send email via Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.EMAIL_FROM_ADDRESS ||
    "PlayerARC <team@notifications.playerarc.io>";

  if (!resendApiKey) {
    console.warn(
      "⚠️ RESEND_API_KEY not configured. Pending action notification will not be sent."
    );
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject,
        html: htmlBody,
        text: textBody,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Failed to send pending action notification:", {
        status: response.status,
        error: errorData,
      });
      throw new Error(`Resend API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Pending action notification sent successfully:", result.id);
  } catch (error) {
    console.error("❌ Error sending pending action notification:", error);
    // Don't throw - log the error but don't break the guardian link creation
  }
}
