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
  const {
    email,
    invitedByUsername,
    invitedByEmail,
    organizationName,
    inviteLink,
    role,
  } = data;

  // Email template
  const subject = `Invitation to join ${organizationName} on PlayerARC`;
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
        <div style="background-color: #1E3A5F; padding: 25px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <img src="${logoUrl}" alt="PlayerARC Logo" style="max-width: 100px; height: auto; margin-bottom: 12px;" />
          <h1 style="color: white; margin: 0 0 4px 0; font-size: 24px; font-weight: bold;">PlayerARC</h1>
          <p style="color: #22c55e; margin: 0; font-size: 14px; font-style: italic;">As many as possible, for as long as possible…</p>
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

/**
 * Get the PlayerARC logo URL for emails
 */
function getLogoUrl(): string {
  const siteUrl = process.env.SITE_URL || "https://playerarc.io";
  return `${siteUrl}/logos-landing/PDP-Logo-OffWhiteOrbit_GreenHuman.png`;
}

/**
 * Demo request notification email data
 */
interface DemoRequestNotificationData {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  message?: string;
  requestedAt: number;
  adminEmails: string[]; // Email addresses to send notification to
}

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
        <div style="background-color: #1E3A5F; padding: 20px; border-radius: 8px 8px 0 0;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px;">
            <img src="${logoUrl}" alt="PlayerARC Logo" style="max-width: 80px; height: auto;" />
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">PlayerARC</h1>
          </div>
          <p style="color: #22c55e; margin: 0; font-size: 13px; font-style: italic; text-align: center;">As many as possible, for as long as possible…</p>
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
        <div style="background-color: #1E3A5F; padding: 20px; border-radius: 8px 8px 0 0;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px;">
            <img src="${logoUrl}" alt="PlayerARC Logo" style="max-width: 80px; height: auto;" />
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">PlayerARC</h1>
          </div>
          <p style="color: #22c55e; margin: 0; font-size: 13px; font-style: italic; text-align: center;">As many as possible, for as long as possible…</p>
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
