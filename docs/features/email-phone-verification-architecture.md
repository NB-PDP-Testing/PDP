# Email & Phone Verification — Technical Architecture

**Issue:** #567 | **PR:** #590 | **Branch:** `feature/567-email-phone-verification`

---

## Overview

Progressive email and phone verification system. Users get immediate access after signup with a persistent verification banner — certain actions are gated until email is verified. Phone verification is optional but required for SMS/WhatsApp-dependent features.

**Design pattern:** Stripe/GitHub progressive verification — not block-until-verified.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js)                                             │
│                                                                 │
│  ┌─ orgs/layout.tsx ──────────────────────────────────────────┐ │
│  │  if (!user.emailVerified)                                  │ │
│  │    → <EmailVerificationBanner email={user.email} />        │ │
│  │  if (user && !emailVerified && isOAuth)                    │ │
│  │    → autoVerifyOAuthUser() mutation                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ Feature Gating ──────────────────────────────────────────┐  │
│  │  useRequireVerified() hook                                │  │
│  │    → returns { isVerified, requireVerification() }        │  │
│  │    → shows toast "Please verify your email first"         │  │
│  │                                                           │  │
│  │  Used in:                                                 │  │
│  │    • /admin/users  → invite, save role changes            │  │
│  │    • /admin/teams  → create team                          │  │
│  │    • /coach/messages/compose → send message               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Phone Verification ─────────────────────────────────────┐   │
│  │  PhoneVerificationDialog                                 │   │
│  │    Step 1: Show phone → "Send Code"                      │   │
│  │    Step 2: 6-digit OTP input → "Verify"                  │   │
│  │    Step 3: Green checkmark → auto-close                  │   │
│  │                                                          │   │
│  │  Triggered from: profile-settings-dialog.tsx             │   │
│  │    → useAction(sendPhoneOTP)                             │   │
│  │    → useAction(verifyPhoneOTP)                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ CurrentUserProvider ────────────────────────────────────┐   │
│  │  Single useQuery(getCurrentUser) subscription            │   │
│  │  Exposes: emailVerified, phoneVerified, phoneVerifiedAt  │   │
│  │  Banner auto-disappears when emailVerified flips to true │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  BACKEND (Convex)                                               │
│                                                                 │
│  ┌─ Better Auth (auth.ts) ───────────────────────────────────┐  │
│  │  emailVerification:                                       │  │
│  │    sendOnSignUp: true                                     │  │
│  │    autoSignInAfterVerification: true                      │  │
│  │    requireEmailVerification: false  ← progressive!        │  │
│  │                                                           │  │
│  │  rateLimit:                                               │  │
│  │    /sign-in/email       → 5 / 15 min                     │  │
│  │    /sign-in/magic-link  → 5 / hour                        │  │
│  │    /forgot-password     → 3 / hour                        │  │
│  │    /sign-up/email       → 3 / hour                        │  │
│  │    /email-verification  → 5 / hour                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Server-Side Guards ──────────────────────────────────────┐  │
│  │  coachParentMessages.createMessage  → emailVerified check │  │
│  │  coachParentMessages.sendMessage    → emailVerified check │  │
│  │  members.updateInvitationMetadata   → emailVerified check │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Phone Verification Actions ──────────────────────────────┐  │
│  │  sendPhoneOTP    → Twilio Verify API (generates OTP)      │  │
│  │  verifyPhoneOTP  → Twilio Verify API (validates OTP)      │  │
│  │                  → updates user.phoneVerified via adapter  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  EXTERNAL SERVICES                                              │
│                                                                 │
│  Resend API  ← verification emails, password reset, magic link  │
│  Twilio Verify API  ← phone OTP send + check ($0.05/success)   │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Map

### Backend

| File | Purpose |
|------|---------|
| `packages/backend/convex/auth.ts` | Better Auth config — `emailVerification`, `rateLimit`, magic link, password reset |
| `packages/backend/convex/betterAuth/schema.ts` | Schema — `phoneVerified`, `phoneVerifiedAt` fields on user table |
| `packages/backend/convex/models/phoneVerification.ts` | `sendPhoneOTP` and `verifyPhoneOTP` Convex actions |
| `packages/backend/convex/utils/sms.ts` | `sendPhoneVerification()`, `checkPhoneVerification()` — Twilio Verify REST API |
| `packages/backend/convex/utils/email.ts` | `sendVerificationEmail()` — branded Resend template (1-hour expiry) |
| `packages/backend/convex/models/users.ts` | `getCurrentUser` (returns verification fields), `autoVerifyOAuthUser` mutation |
| `packages/backend/convex/models/coachParentMessages.ts` | Server-side `emailVerified` guard on `createMessage` and `sendMessage` |
| `packages/backend/convex/models/members.ts` | Server-side `emailVerified` guard on `updateInvitationMetadata` |
| `packages/backend/convex/migrations/verifyExistingUsers.ts` | One-time batch migration — auto-verifies existing OAuth users |

### Frontend

| File | Purpose |
|------|---------|
| `apps/web/src/app/orgs/layout.tsx` | Renders `<EmailVerificationBanner>` + triggers OAuth auto-verify |
| `apps/web/src/components/verification-banner.tsx` | Amber sticky banner — non-dismissible, 60s resend cooldown |
| `apps/web/src/hooks/use-require-verified.ts` | `useRequireVerified()` hook — feature gating with toast |
| `apps/web/src/app/verify-email/page.tsx` | `/verify-email` callback — success/error states, auto-redirect |
| `apps/web/src/components/profile/phone-verification-dialog.tsx` | 6-digit OTP dialog (send → verify → success) |
| `apps/web/src/components/profile/profile-settings-dialog.tsx` | Email/phone verification badges + phone verify trigger |
| `apps/web/src/components/sign-up-form.tsx` | Post-signup "Check your email" interstitial |
| `apps/web/src/providers/current-user-provider.tsx` | Centralized user state with `emailVerified`, `phoneVerified` |

---

## Email Verification Flow

### 1. New Signup

```
User signs up (email/password)
  → Better Auth creates user with emailVerified: false
  → sendVerificationEmail() fires (Resend API)
  → Frontend shows "Check your email" interstitial
  → User clicks "Continue to app"
  → Amber banner shown at top of every page
```

### 2. Clicking the Verification Link

```
User clicks link in email
  → GET /api/auth/verify-email?token=...&callbackURL=/verify-email
  → Better Auth validates token, sets emailVerified: true
  → Redirect to /verify-email page
  → Page shows "Email Verified!" with green checkmark
  → Auto-redirect to /orgs/current after 2 seconds
  → Banner auto-disappears (Convex subscription reactivity)
```

### 3. OAuth Users (Google/Microsoft)

```
User signs in via Google/Microsoft
  → orgs/layout.tsx detects !emailVerified + OAuth account
  → Calls autoVerifyOAuthUser() mutation
  → Mutation checks account table for google/microsoft providerId
  → Sets emailVerified: true
  → No banner ever shown
```

### 4. Magic Link

```
User requests magic link
  → Better Auth sends magic link email
  → User clicks link → auto-signed in
  → Magic link proves email ownership
  → emailVerified set to true by Better Auth
```

### 5. Existing Users (Migration)

```
Run: npx convex run migrations/verifyExistingUsers:verifyExistingOAuthUsers
  → Queries all users where emailVerified === false
  → Checks account table for OAuth providers
  → OAuth users → emailVerified: true
  → Email/password users → remain false → see banner on next login
```

---

## Phone Verification Flow

```
Profile Settings → Phone field → "Verify" button
  → Opens PhoneVerificationDialog
  → Step 1: User confirms phone number, clicks "Send Code"
    → useAction(sendPhoneOTP) → Twilio Verify API generates 6-digit OTP
    → SMS delivered to phone
  → Step 2: User enters 6-digit code
    → useAction(verifyPhoneOTP) → Twilio Verify API validates code
    → If approved: user.phoneVerified = true, user.phoneVerifiedAt = Date.now()
    → Updated via components.betterAuth.adapter.updateOne
  → Step 3: Green checkmark shown, dialog auto-closes after 1.5s
  → Profile shows green "Verified" badge next to phone
```

**Why Twilio Verify API (not raw SMS)?**
- Twilio generates AND validates the OTP — no code stored on our side
- Built-in Fraud Guard blocks suspicious requests
- $0.05/successful verification (free for failed attempts)
- Automatic rate limiting per phone number

**Why custom implementation (not Better Auth phone plugin)?**
- Our existing `phone` field is used by WhatsApp matching and guardian linking
- Better Auth phone plugin would create a second `phoneNumber` field — sync nightmare
- Custom Convex actions + Twilio Verify avoids the dual-field conflict

**Critical implementation note:** Phone verification uses Convex `action()` with `"use node"` directive, NOT `mutation()`. Convex mutations cannot call `fetch()` — this was a bug discovered during live testing.

---

## Feature Gating — What's Restricted

### For unverified email users

| Action | Where Gated | How |
|--------|-------------|-----|
| **Send invitations** | Frontend: `/admin/users` | `useRequireVerified()` hook → toast |
| | Backend: `members.updateInvitationMetadata` | `if (!authUser.emailVerified) throw` |
| **Create teams** | Frontend: `/admin/teams` | Direct `session.user.emailVerified` check → toast |
| **Send messages** | Frontend: `/coach/messages/compose` | Direct `currentUser.emailVerified` check → toast |
| | Backend: `coachParentMessages.createMessage` | `if (!authUser.emailVerified) throw` |
| | Backend: `coachParentMessages.sendMessage` | `if (!authUser.emailVerified) throw` |
| **Save role changes** | Frontend: `/admin/users` | `useRequireVerified()` hook → toast |

### Allowed without verification

- Viewing dashboards, profiles, assessments
- Editing own profile (including adding phone)
- Accepting invitations
- Browsing/reading all data
- OAuth users auto-verified on first load

### Phone verification

Phone verification is **not currently a gate for any action**. It's an optional trust signal displayed as a badge. Future gating could include:
- WhatsApp messaging (requires verified phone)
- Guardian linking (phone-based matching)

---

## Schema

### User table fields (Better Auth component table)

```typescript
// packages/backend/convex/betterAuth/schema.ts

// Built-in Better Auth field
emailVerified: v.boolean()            // Set by Better Auth on email verify

// Custom fields (added for phone verification)
phoneVerified: v.optional(v.boolean())    // Set by verifyPhoneOTP action
phoneVerifiedAt: v.optional(v.number())   // Timestamp of phone verification
```

These fields are on the Better Auth `user` component table, accessed via the adapter (`components.betterAuth.adapter`), not via `ctx.db` directly.

---

## Rate Limiting

Configured in `packages/backend/convex/auth.ts`:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/sign-in/email` (password login) | 5 attempts | 15 minutes |
| `/sign-in/magic-link` | 5 requests | 1 hour |
| `/forgot-password` | 3 requests | 1 hour |
| `/sign-up/email` | 3 signups | 1 hour |
| `/email-verification/send-verification-email` | 5 resends | 1 hour |
| Global default | 10 requests | 60 seconds |

Phone OTP rate limiting is handled by Twilio Verify's built-in Fraud Guard (5 attempts per phone number).

---

## Environment Variables

| Variable | Service | Required For |
|----------|---------|-------------|
| `RESEND_API_KEY` | Resend | Verification emails, password reset, magic link |
| `EMAIL_FROM_ADDRESS` | Resend | Sender address (default: `team@notifications.playerarc.io`) |
| `TWILIO_ACCOUNT_SID` | Twilio | Phone OTP |
| `TWILIO_AUTH_TOKEN` | Twilio | Phone OTP |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio | Phone OTP (Verify Service, not phone number) |

All set on the Convex deployment (dev: `valuable-pig-963`), not in `.env` files.

---

## Security Considerations

1. **Enumeration prevention:** Magic link and forgot-password for non-existent emails silently succeed (no email sent). UI shows generic "Check your email" in both cases.

2. **Double gating:** Critical actions are gated both frontend (toast) AND backend (mutation throws). Frontend gating is UX only — backend is the security boundary.

3. **Token expiry:** Email verification links expire in 1 hour. Magic links expire in 10 minutes.

4. **Convex reactivity:** The verification banner uses Convex's real-time subscription. When `emailVerified` flips to `true` in the database, the banner auto-disappears without page refresh.

5. **Phone normalization:** All phone numbers normalized via `normalizePhoneNumber()` from `packages/backend/convex/lib/phoneUtils.ts` before Twilio API calls.

---

## E2E Tests

**File:** `apps/web/uat/tests/email-phone-verification.spec.ts` — 25 tests across 12 sections.

Covers: banner visibility, feature gating, verify-email page, OAuth auto-verify, phone OTP dialog, profile badges, sign-up form interstitial.
