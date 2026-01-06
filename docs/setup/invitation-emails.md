# Invitation Email Setup Guide

## Overview

The organization invitation system is now configured to send emails when members are invited to join organizations. This document outlines what has been implemented and what needs to be completed.

## What's Been Implemented

### 1. Email Configuration ✅

- **Location**: `packages/backend/convex/auth.ts`
- **Function**: `sendInvitationEmail` in the organization plugin
- **Status**: Configured to call `sendOrganizationInvitation` utility

### 2. Email Template ✅

- **Location**: `packages/backend/convex/utils/email.ts`
- **Function**: `sendOrganizationInvitation`
- **Features**:
  - HTML email template with PlayerARC branding
  - Plain text fallback
  - Includes invitation link, organization name, inviter details
  - Professional styling with navy (#1E3A5F) and green (#22c55e) brand colors

### 3. Accept Invitation Page ✅

- **Location**: `apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx`
- **Features**:
  - Handles invitation acceptance flow
  - Redirects to login if user not authenticated
  - Shows loading, success, and error states
  - Auto-redirects to organization after acceptance

### 4. WhatsApp Message Generator ✅

- **Location**: `packages/backend/convex/utils/email.ts`
- **Function**: `generateWhatsAppInvitationMessage`
- **Status**: Ready to use for WhatsApp sharing (requires frontend integration)

## What Needs to Be Done

### 1. Set Up Email Service Provider ⚠️

The email sending function currently only logs the email details. You need to integrate with an email service provider.

#### Option A: Resend (Recommended)

1. **Sign up**: https://resend.com
2. **Get API key**: From Resend dashboard
3. **Install package**:
   ```bash
   npm install resend --workspace=packages/backend
   ```
4. **Update `packages/backend/convex/utils/email.ts`**:
   ```typescript
   import { Resend } from "resend";
   
   const resend = new Resend(process.env.RESEND_API_KEY);
   
   // In sendOrganizationInvitation function:
   await resend.emails.send({
     from: 'PlayerARC <invitations@yourdomain.com>',
     to: email,
     subject,
     html: htmlBody,
     text: textBody,
   });
   ```
5. **Add environment variable**: `RESEND_API_KEY` in Convex dashboard

#### Option B: SendGrid

1. **Sign up**: https://sendgrid.com
2. **Get API key**: From SendGrid dashboard
3. **Install package**:
   ```bash
   npm install @sendgrid/mail --workspace=packages/backend
   ```
4. **Update email utility** to use SendGrid API

#### Option C: AWS SES

1. **Set up AWS SES**: https://aws.amazon.com/ses/
2. **Configure SMTP credentials**
3. **Use Nodemailer** with SMTP transport

### 2. Create HTTP Action for Email Sending (If Needed)

Since Convex actions can't directly call external APIs, you may need to create an HTTP action:

**Location**: `packages/backend/convex/http.ts`

```typescript
import { httpAction } from "./_generated/server";
import { sendOrganizationInvitation } from "./utils/email";

http.route({
  path: "/send-invitation-email",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const data = await request.json();
    await sendOrganizationInvitation(data);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
```

Then update `auth.ts` to call this HTTP endpoint instead of directly calling the email function.

### 3. WhatsApp Integration (Optional)

To enable WhatsApp message sharing for invitations:

1. **Frontend Integration**: Add a "Share via WhatsApp" button in the invite dialog
2. **Use the generator**: Call `generateWhatsAppInvitationMessage()` from the email utility
3. **Open WhatsApp**: Use WhatsApp deep link:
   ```typescript
   const message = generateWhatsAppInvitationMessage(data);
   const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
   window.open(whatsappUrl, '_blank');
   ```

### 4. Environment Variables

Add to Convex dashboard environment variables:

- `RESEND_API_KEY` (if using Resend)
- `SENDGRID_API_KEY` (if using SendGrid)
- `EMAIL_FROM_ADDRESS` (e.g., "PlayerARC <invitations@playerarc.com>")
- `SITE_URL` (should already be set)

### 5. Domain Verification

For production email sending:

1. **Verify your domain** with your email provider
2. **Set up SPF/DKIM records** in DNS
3. **Update `from` address** to use your verified domain

## Testing

### Development Testing

Currently, emails are logged to the console. Check Convex logs to see:
```
📧 Organization Invitation Email: {
  to: "user@example.com",
  subject: "Invitation to join...",
  inviteLink: "...",
  ...
}
```

### Production Testing

1. Invite a test user via the admin panel
2. Check email inbox (and spam folder)
3. Click invitation link
4. Verify acceptance flow works

## Current Invitation Flow

1. **Admin invites user** → `authClient.organization.inviteMember()` called
2. **Better Auth creates invitation** → Invitation record created in database
3. **Email sent** → `sendInvitationEmail` hook called
4. **User receives email** → With invitation link
5. **User clicks link** → Redirected to `/orgs/accept-invitation/[invitationId]`
6. **User accepts** → `authClient.organization.acceptInvitation()` called
7. **User added to org** → Member record created
8. **Redirect** → User redirected to organization dashboard

## Troubleshooting

### Emails Not Sending

- Check Convex logs for errors
- Verify email service API key is set
- Check email service provider dashboard for delivery status
- Verify domain is verified (for production)

### Invitation Links Not Working

- Check `SITE_URL` environment variable is correct
- Verify invitation hasn't expired (default: 7 days)
- Check invitation status in database
- Ensure user is logged in before accepting

### Better Auth Errors

- Check Better Auth logs
- Verify organization plugin is properly configured
- Ensure invitation table exists in schema

## Next Steps

1. ✅ Email template created
2. ✅ Accept invitation page created
3. ✅ WhatsApp message generator created
4. ⚠️ **TODO**: Set up email service provider (Resend/SendGrid/etc.)
5. ⚠️ **TODO**: Add environment variables
6. ⚠️ **TODO**: Test email delivery
7. ⚠️ **TODO**: (Optional) Add WhatsApp sharing button in UI

