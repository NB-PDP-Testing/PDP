/**
 * Email service utilities for sending invitation emails
 *
 * This module provides email sending functionality for organization invitations.
 * Currently supports basic email sending - can be extended with Resend, SendGrid, etc.
 */

interface InvitationEmailData {
  email: string;
  invitedByUsername: string;
  invitedByEmail: string;
  organizationName: string;
  inviteLink: string;
  role?: string;
}

/**
 * Send an organization invitation email
 *
 * TODO: Integrate with email service provider (Resend, SendGrid, etc.)
 * For now, this logs the email details - actual sending should be implemented
 * via an HTTP action or external service.
 */
export async function sendOrganizationInvitation(
  data: InvitationEmailData
): Promise<void> {
  const { email, invitedByUsername, organizationName, inviteLink, role } = data;

  // Email template
  const subject = `Invitation to join ${organizationName} on PlayerARC`;
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1E3A5F; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">PlayerARC</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1E3A5F; margin-top: 0;">You've been invited!</h2>
          <p>Hi there,</p>
          <p>
            <strong>${invitedByUsername}</strong> (${invitedByEmail}) has invited you to join 
            <strong>${organizationName}</strong> on PlayerARC.
          </p>
          ${role ? `<p><strong>Role:</strong> ${role}</p>` : ""}
          <p>
            PlayerARC is a comprehensive platform for managing youth sports development, 
            helping coaches and parents collaborate to support young athletes.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a 
              href="${inviteLink}" 
              style="background-color: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;"
            >
              Accept Invitation
            </a>
          </div>
          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${inviteLink}" style="color: #1E3A5F; word-break: break-all;">${inviteLink}</a>
          </p>
          <p style="font-size: 12px; color: #666;">
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

${role ? `Role: ${role}\n` : ""}
PlayerARC is a comprehensive platform for managing youth sports development.

Accept your invitation by clicking this link:
${inviteLink}

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
  });

  // TODO: Implement actual email sending
  // Options:
  // 1. Use Resend API (recommended): https://resend.com
  // 2. Use SendGrid API: https://sendgrid.com
  // 3. Use AWS SES: https://aws.amazon.com/ses/
  // 4. Use Nodemailer with SMTP
  //
  // Example with Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'PlayerARC <invitations@playerarc.com>',
  //   to: email,
  //   subject,
  //   html: htmlBody,
  //   text: textBody,
  // });

  // For now, we'll need to implement this via an HTTP action
  // that can call an email service provider
}

/**
 * Generate WhatsApp invitation message
 */
export function generateWhatsAppInvitationMessage(
  data: InvitationEmailData
): string {
  const { invitedByUsername, organizationName, inviteLink, role } = data;

  let message = `🏆 *You've been invited to join ${organizationName} on PlayerARC!*\n\n`;
  message += `${invitedByUsername} has invited you to join ${organizationName}.\n\n`;
  if (role) {
    message += `Role: ${role}\n\n`;
  }
  message +=
    "PlayerARC helps coaches and parents collaborate to support young athletes.\n\n";
  message += `Accept your invitation:\n${inviteLink}\n\n`;
  message += "This invitation expires in 7 days.";

  return message;
}
