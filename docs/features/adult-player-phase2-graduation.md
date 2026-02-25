# Adult Player Lifecycle — Phase 2: Youth-to-Adult Graduation Flow

> Auto-generated documentation - Last updated: 2026-02-25 17:31

## Status

- **Branch**: `ralph/adult-player-phase2-graduation`
- **Progress**: 5 / 5 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P2-001: Guardian Sees Graduation Alert in Parent Dashboard

As a parent/guardian, I want to see a clear prompt when my child turns 18, so that I can initiate the handover of their account.

**Acceptance Criteria:**
- Add graduation alert banner/card to the parent dashboard — follow the action-items-panel.tsx pattern already used for pending actions
- Alert driven by getPendingGraduations() query (already built in playerGraduations.ts)
- Alert shows: player full name, date of birth, org name, 'They turned 18 on [date formatted DD MMM YYYY]'
- Two action buttons: 'Send Account Invite' (opens email dialog, US-P2-002) and 'Dismiss'
- 'Dismiss' calls dismissGraduationPrompt mutation (already built) and removes the banner immediately
- Add notification type 'age_transition_available' to packages/backend/convex/models/notifications.ts type union
- When graduation record is created by the daily cron, send an in-app notification of type age_transition_available to the guardian
- Banner persists across page refreshes until dismissed or graduation status becomes 'claimed'
- If multiple children have pending graduations, show one alert card per child
- npm run check-types passes

### US-P2-002: Guardian Sends Account Invite Email to Player

As a parent/guardian, I want to send my child a secure email link to claim their account, so that they can take control of their sports profile.

**Acceptance Criteria:**
- Clicking 'Send Account Invite' from the graduation alert opens a dialog
- Dialog pre-fills player's email address from any existing data on the playerIdentity record (editable by guardian before sending)
- Dialog shows player name and brief explanation of what the email will do
- On confirm: calls sendGraduationInvite(playerIdentityId, playerEmail) mutation (already built in playerGraduations.ts)
- COMPLETE THE TODO at playerGraduations.ts:217: sendGraduationInvite must trigger a Convex action that calls sendGraduationInvitationEmail()
- Add sendGraduationInvitationEmail() to packages/backend/convex/utils/email.ts — copy the exact Resend fetch pattern from sendOrganizationInvitation
- Email template includes: player first name, org name, 'Claim Your Account' CTA button linking to /claim-account?token=xxx, '30-day expiry' warning, PlayerARC branding
- Email sent from 'PlayerARC <team@notifications.playerarc.io>'
- After successful send: guardian sees 'Invite sent to [email]. Link valid for 30 days.'
- If guardian sends again (resend): new token created, previous token invalidated — verify existing mutation handles this, add if not
- npm run check-types passes
- npx -w packages/backend convex codegen passes

### US-P2-003: Player Claims Account via Token & Onboards via Orchestrator

As a player turning 18, I want to click my invite link, claim my sports profile, and be guided through setup, so that I can manage my own development journey.

**Acceptance Criteria:**
- Create public route apps/web/src/app/claim-account/page.tsx that accepts ?token=xxx query parameter
- Page calls getPlayerClaimStatus(token) (already built in playerGraduations.ts) to validate token
- Valid token: show player name, org name, and 'Claim [Name]'s profile at [Org]?' confirmation UI
- Invalid token: show 'This link is invalid' error with 'Contact your guardian for a new invite' message
- Expired token: show 'This invite link has expired' with 'Ask your guardian to resend the invite' message
- Already-used token: show 'This account has already been claimed. Try signing in.' message
- If user not logged in: show sign-in/sign-up prompt, preserve token in URL params through auth redirect
- If user logged in and token valid: show confirmation dialog before claiming
- VERIFICATION STEP (required before claiming): On confirmation dialog confirm, before calling claimPlayerAccount: call a new sendClaimVerificationPin(playerIdentityId) mutation. This mutation: (1) looks up the mobile number on the playerIdentity record; (2) if mobile found: generates a 6-digit PIN and sends it via Twilio SMS ('Your PlayerARC account claim code is: [PIN]. Valid for 10 minutes.'); (3) if no mobile: generates a 6-digit PIN and sends it via Resend email to the claim email ('Your PlayerARC account claim code is: [PIN]. Valid for 10 minutes. If you did not request this, ignore this message.'); (4) stores PIN in verificationPins table with expiresAt = now + 10 minutes.
- Show a PIN entry screen: 'A verification code has been sent to [masked mobile e.g. +353 87 *** 4567] (or email if no mobile). Enter the 6-digit code to confirm your identity.' Single 6-digit input (numeric keyboard on mobile).
- On PIN submit: call verifyClaimPin(playerIdentityId, pin). If valid: proceed to claimPlayerAccount. If invalid: show 'Incorrect code. [N] attempts remaining.' Allow 3 attempts before locking (lock = abandon flow, show 'Too many incorrect attempts. Please ask your guardian to resend the invite.' — do not block the token itself).
- If PIN expired: show 'Your code has expired. Click Resend to get a new one.' with a Resend button (calls sendClaimVerificationPin again, invalidates previous PIN).
- Backend: add to packages/backend/convex/schema.ts a verificationPins table: playerIdentityId (v.id), pin (string), expiresAt (number), optional usedAt (number), attemptCount (number, default 0), channel ('sms' | 'email'). Index: by_player [playerIdentityId].
- Backend: add sendClaimVerificationPin(playerIdentityId) mutation and verifyClaimPin(playerIdentityId, pin) mutation to packages/backend/convex/models/playerGraduations.ts.
- Admin 'Transition Now' action (US-P2-004) bypasses PIN verification — admin is already authenticated.
- On confirm: calls claimPlayerAccount(token, userId) (already built in playerGraduations.ts)
- After successful claim: redirect to /orgs/[orgId] — the existing onboarding orchestrator handles next steps via player_graduation task type
- Create apps/web/src/components/onboarding/player-graduation-step.tsx to implement the player_graduation task in the orchestrator
- player-graduation-step.tsx shows: welcome message with player name, explanation of the player portal, 'Go to My Dashboard' button linking to /orgs/[orgId]/player
- Wire player-graduation-step.tsx into the orchestrator's task type switch — follow the pattern of unified-guardian-claim-step.tsx
- Add notification type 'age_transition_claimed' to notifications.ts and send to org admins when a player claims their account
- npm run check-types passes

### US-P2-004: Admin Manual Graduation Trigger

As an admin, I want to manually trigger the graduation flow for a player, so that I can handle edge cases where the guardian isn't responding.

**Acceptance Criteria:**
- In the player profile admin view (/admin/players/[playerId]), add a 'Graduation' section that appears only when player age >= 18 AND playerType === 'youth'
- If /admin/players/[playerId] detail page does not exist: create it as a new page showing player name, DOB, playerType, enrollment info
- Graduation section shows current graduation status (pending / invitation_sent / claimed / dismissed) from the playerGraduations table — reactive via Convex query
- If status is 'pending' or 'dismissed': admin can click 'Send Invitation' to send email directly to player (bypasses guardian) — uses same sendGraduationInvite flow
- Admin can click 'Transition Now' to call transitionToAdult(playerIdentityId) without requiring a token
- 'Transition Now' shows a confirmation dialog: 'This will convert [Name] to an adult player. Guardian contacts will be converted to emergency contacts. This cannot be undone. Proceed?'
- Status updates in real-time via Convex reactive query (no page refresh needed)
- npm run check-types passes

### US-P2-UAT: Phase 2 Graduation Flow E2E Tests

As a developer, I want Playwright E2E tests covering all Phase 2 graduation stories, so that the transition flow works correctly end-to-end.

**Acceptance Criteria:**
- Create test file: apps/web/uat/tests/player-graduation-phase2.spec.ts
- Test: graduation alert appears in parent dashboard for a player with graduation status 'pending'
- Test: dismiss button removes the graduation alert from parent dashboard
- Test: /claim-account?token=VALID_TOKEN shows player name and org name
- Test: /claim-account?token=invalid shows invalid token error state
- Test: /claim-account?token=EXPIRED_TOKEN shows expired error state
- Test: /claim-account?token=USED_TOKEN shows already-claimed state
- Test: after successful claim, onboarding orchestrator shows player_graduation step
- Test: claim flow shows PIN entry screen after login and token validation
- Test: entering wrong PIN shows error with remaining attempt count
- Test: entering correct PIN proceeds to claimPlayerAccount
- Test: entering wrong PIN 3 times shows lock message and does not call claimPlayerAccount
- Manual test 1: Create test player with DOB exactly 18 years ago → trigger graduation cron → confirm playerGraduations record with status 'pending'
- Manual test 2: Log in as player's guardian → confirm graduation alert banner in parent dashboard
- Manual test 3: Click 'Send Account Invite' → enter email → confirm Resend email dispatched (check Convex logs)
- Manual test 4: Click token link from email → confirm claim page shows player name and org
- Manual test 5: Sign in as player → complete claim → confirm redirect to onboarding → complete player_graduation step → land in player portal
- Manual test 6: Attempt to use same token again → confirm 'already used' error
- Manual test 7: Manually set expiresAt to past in DB → confirm 'expired' message with resend prompt
- Manual test 8: As admin → navigate to youth player aged 18+ → confirm Graduation section visible → trigger manual transition → confirm playerType changes to 'adult'
- Manual test 9: As player with mobile number on record — click claim link → log in → confirm verification SMS received on mobile → enter PIN → confirm account claimed successfully
- Manual test 10: As player WITHOUT mobile on record — click claim link → log in → confirm verification code sent to email instead → enter PIN → confirm account claimed
- Manual test 11: Enter wrong PIN 3 times → confirm flow locks with appropriate message → admin can still use 'Transition Now' to bypass


## Implementation Notes

### Key Patterns & Learnings


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
