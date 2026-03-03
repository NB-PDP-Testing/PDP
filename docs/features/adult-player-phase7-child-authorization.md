# Adult Player Lifecycle — Phase 7: Child Player Passport Authorization

> Auto-generated documentation - Last updated: 2026-02-28 03:44

## Status

- **Branch**: `ralph/adult-player-phase7-child-authorization`
- **Progress**: 9 / 9 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P7-001: Backend: parentChildAuthorizations Schema & Queries

As a backend developer, I need the parentChildAuthorizations table and all related queries/mutations so that the child access system has a type-safe, auditable foundation.

**Acceptance Criteria:**
- Add TWO new tables to packages/backend/convex/schema.ts:
-   (1) parentChildAuthorizations: parentUserId (string), childPlayerId (v.id('orgPlayerEnrollments')), organizationId (string), accessLevel (v.union of none/view_only/view_interact literals), grantedAt (number), grantedBy (string), optional revokedAt (number), optional revokedBy (string), includeCoachFeedback (boolean), includeVoiceNotes (boolean), includeDevelopmentGoals (boolean), includeAssessments (boolean), includeWellnessAccess (boolean). Indexes: by_parent_and_child [parentUserId, childPlayerId], by_child [childPlayerId], by_org [organizationId]. NOTE: NO embedded changeLog array — use the separate audit table instead.
-   (2) parentChildAuthorizationLogs: authorizationId (v.id('parentChildAuthorizations')), changedAt (number), changedBy (string), action (v.union of 'granted'/'updated'/'revoked'/'toggle_changed' literals), fromAccessLevel (v.optional string), toAccessLevel (v.optional string), togglesChanged (v.optional v.array of v.object with field/from/to). Indexes: by_authorization [authorizationId], by_child [childPlayerId], by_changed_at [changedAt]. This table is WRITE-ONCE — records are never updated or deleted. This satisfies GDPR Article 5 accountability and COPPA audit requirements.
- Also add restrictChildView field to relevant schema table (find where coach voice note insights or manual notes are stored — add v.optional(v.boolean()) field, default false). Run codegen to determine which table this belongs to.
- Add new queries and mutations to appropriate models file (create packages/backend/convex/models/parentChildAuthorizations.ts):
-   getChildAuthorization(childPlayerId): returns the authorization record or null using by_child index
-   getChildrenForParent(parentUserId, organizationId): returns all authorization records for this parent using by_parent_and_child index (scoped to parent's children)
-   grantChildAccess(parentUserId, childPlayerId, organizationId, accessLevel, granularToggles): creates or updates parentChildAuthorizations record. If record exists: update accessLevel and toggles, write a log entry to parentChildAuthorizationLogs. If child age < 13 (calculated from playerIdentity.dateOfBirth): throw error 'Child must be at least 13 years old to have a platform account.'
-   revokeChildAccess(parentUserId, childPlayerId): sets accessLevel to 'none', sets revokedAt/revokedBy, writes 'revoked' log entry to parentChildAuthorizationLogs.
-   updateChildAccessToggles(parentUserId, childPlayerId, toggleUpdates): updates individual granular toggles without changing accessLevel. Writes 'toggle_changed' log entry to parentChildAuthorizationLogs.
-   getRestrictedNotes(childPlayerId): returns coachParentSummaries / voice note records for this child where restrictChildView is NOT true and status is approved/delivered/viewed — filtering is done server-side
-   setNoteChildRestriction(noteId, restrictChildView): sets the restrictChildView field on the relevant note/insight record
- Run npx -w packages/backend convex codegen — all types must pass
- npm run check-types passes

### US-P7-002: Parent Grants Child Platform Access

As a parent/guardian, I want to grant my under-18 child controlled access to view their player development data so that they can take ownership of their sports journey while I remain in control.

**Acceptance Criteria:**
- Add 'Grant Player Access' section to the child's page in the parent portal (find where parents view individual children's profiles)
- Toggle: 'Allow [Child Name] to access their player account'
- When toggled on: access level selector appears with two options: 'View Only (recommended for ages 13–15)' and 'View + Interact (recommended for ages 16–17)'
- Granular content toggles (shown when access level is selected, all default ON): Include Coach Feedback, Include Voice Notes, Include Development Goals, Include Assessments, Allow Wellness Check-Ins
- Preview summary section: 'What [Child Name] will see' — bullet list of enabled content based on selected level and toggles
- Age check: if child age < 13 (from playerIdentity.dateOfBirth): block toggle with message 'PlayerARC requires players to be at least 13 to have their own account'
- On Save: calls grantChildAccess mutation. If new grant: sends invite email to child's email address (see US-P7-003). If updating existing access: updates record, appends to changeLog. No new email sent on updates.
- If second parent/guardian is also linked to this child: they see the same settings and the same access level (unified). Both can update — all changes appear in the changeLog.
- Revoke section: when access is already granted, show 'Revoke access' button with confirmation dialog: 'Revoking access will log [Child Name] out of the platform and they will no longer be able to see their player data. Continue?' — on confirm: calls revokeChildAccess.
- npm run check-types passes

### US-P7-003: Child Account Creation & Onboarding

As a child player, I want to set up my own platform account after my parent has granted me access so that I can log in and see my sports development.

**Acceptance Criteria:**
- When parent grants access (US-P7-002): system sends invite email to child's email address. Add sendChildAccountInviteEmail() to packages/backend/convex/utils/email.ts following the existing Resend pattern.
- Email content: '[Parent name] has given you access to see your player development at [Club]!' — CTA: 'Set Up My Account' button linking to /child-account-setup?token=xxx. Token valid for 7 days, re-sendable by parent (re-send button in parent portal).
- Create public route apps/web/src/app/child-account-setup/page.tsx (similar to /claim-account from Phase 2)
- Page validates the token. REUSE the existing playerClaimTokens table (confirmed to exist from Phase 2, see schema lines 397–410 with token, expiresAt, usedAt, indexes by_token/by_player/by_email). Add a type discriminator field to distinguish 'child_account_setup' tokens from graduation tokens. Child setup tokens must expire in 7 days (the graduation tokens use 30 days — ensure the child token creation sets a different expiresAt). Show player name and club on valid token.
- DOB entry at account setup: if entered DOB shows age < 13, block with 'You must be 13 or older to create a PlayerARC account'
- After account creation via standard auth flow (sign up with email + password or passkey): redirect to /orgs/[orgId]
- SESSION TIMEOUT: child accounts must use a shorter session idle timeout — maximum 60 minutes of inactivity before the session expires and the user must re-authenticate. Check how Better Auth session expiry is configured and apply a shorter timeout for accounts where the member record shows they are linked to a youth playerIdentity (playerType = 'youth'). Read the Better Auth session configuration before implementing — do not hardcode session duration; use a configurable value.
- Add child_account_setup task type to the onboarding orchestrator (onboarding-orchestrator.tsx). Create apps/web/src/components/onboarding/child-account-setup-step.tsx component.
- Onboarding step shows: 'Welcome to your player account at [Club]!' + brief list of what they can see + 'What your coach controls' explainer. CTA: 'Go to My Dashboard'
- After onboarding: redirect to /orgs/[orgId]/player/ — child sees player portal with 'Youth Account' badge
- npm run check-types passes

### US-P7-004: Child Player Dashboard — View Only Mode

As a child player with View Only access (ages 13–15), I want to see my own sports development data in read-only format so that I feel engaged in my own journey.

**Acceptance Criteria:**
- Child players use the same /orgs/[orgId]/player/ portal structure from Phase 1
- 'Youth Account' badge displayed in the sidebar header (alongside the org name)
- On every player portal page load: check getChildAuthorization(childPlayerId). If accessLevel === 'none': redirect to a 'Your access has been revoked. Contact your parent.' page. If accessLevel is view_only or view_interact: proceed.
- All fields and interactive elements in View Only mode are READ-ONLY: no edit buttons, no delete actions, no form submissions (except wellness check-in if includeWellnessAccess: true)
- Content gated by granular toggles (all checked server-side via getChildAuthorization):
-   Assessments: show sport passport ratings page only if includeAssessments: true
-   Development Goals: show goals section only if includeDevelopmentGoals: true
-   Coach Feedback: show /player/feedback page only if includeCoachFeedback: true AND includeVoiceNotes: true
-   Wellness: show /player/health-check page only if includeWellnessAccess: true
- NEVER SHOWN regardless of access level: medical information, emergency contacts, fees/admin data, notes marked restrictChildView: true, coach privateInsight data
- Cycle phase section NEVER shown for under-18 players
- Coach feedback shown: only publicSummary from coachParentSummaries with status approved/delivered AND where restrictChildView is NOT true
- Sidebar nav items that are not enabled: hidden or shown as greyed-out 'Not available' (do not link to those pages)
- npm run check-types passes

### US-P7-005: Child View + Interact Mode (Ages 16–17)

As a child player with View + Interact access (ages 16–17), I want to set my own development goals and respond to coach feedback so that I can take an active role in my sports development.

**Acceptance Criteria:**
- Builds on US-P7-004 — all View Only content applies plus the following additional capabilities:
- PERSONAL DEVELOPMENT GOALS: if includeDevelopmentGoals: true, child can ADD their own goals. Goal form identical to existing goal creation UI but sets setByRole: 'player' on the goal record. Goal appears labelled 'My Goal' or 'Player Goal' (distinct from coach-set goals which are labelled 'Coach Goal').
- Child cannot edit or delete coach-set goals — only their own goals are editable/deletable by the child
- NOTES ON COACH FEEDBACK: if includeCoachFeedback: true, child can append a text response to any feedback card. Response stored separately (find the appropriate table or add a new childResponse field to coachParentSummaries). Visible to parent and coach in their respective views, labelled 'Player response'.
- ACKNOWLEDGE COACH MESSAGES: child can mark any feedback item as 'Seen' (calls existing acknowledge mutation if it exists, or adds acknowledgedByChild: boolean field). Show 'Acknowledged' state on the card.
- All child-added content (goals, notes) is labelled clearly: 'Player note', 'Player goal'
- Parent can see all child-added goals and notes from the parent portal (no additional gating — if parent can see the child's profile they see child-added content)
- Coach can see child response notes in their player view alongside the original feedback entry
- npm run check-types passes

### US-P7-006: Coach Parent-Only Note Filtering

As a coach, I want to mark certain notes as parent-only so that I can have frank conversations with parents without the child seeing everything.

**Acceptance Criteria:**
- Add restrictChildView field (v.optional(v.boolean()), default false) to the relevant note/insight table in schema.ts (this was done in US-P7-001 — use the same field)
- When a coach creates or edits a voice note insight or manual note: show a toggle 'Restrict from child view — Parent and coach only'
- Toggle is OFF by default (no restriction) — this is additive and non-breaking for existing content
- Notes with restrictChildView: true are: visible to coaches, parents, and admins — but silently excluded from the child's player portal view
- Child's portal shows NO 'hidden content' indicator — the note simply does not appear. The child is unaware content is restricted.
- Existing notes (without the field or with restrictChildView: false) behave exactly as before — no data migration needed
- npm run check-types passes

### US-P7-007: 30-Day and 7-Day Pre-Birthday Advance Notifications

As a parent and as a player approaching 18, I want to be notified in advance that the full account transition is coming so that we can prepare and there are no surprises on the 18th birthday.

**Acceptance Criteria:**
- Read packages/backend/convex/jobs/graduations.ts (or equivalent graduation cron file) FULLY before modifying
- Extend the existing graduation cron to also check for players turning 18 in exactly 30 days and exactly 7 days (in addition to the existing 'today' check for Phase 2)
- Add two new notification types to packages/backend/convex/models/notifications.ts: 'age_transition_30_days' and 'age_transition_7_days'
- 30-day notification TO PARENT/GUARDIAN: 'In 30 days, [Child Name] will turn 18 and gain full control of their account. After that, they'll need to grant you continued access if you'd like to keep viewing their data.'
- 30-day notification TO CHILD (if they have a platform account with a userId): 'In 30 days, you'll turn 18 and take full control of your sports account at [Club]. Get ready!'
- 7-day notifications: same messages with '7 days' replacing '30 days'
- Notifications are sent as in-app notifications. Email is optional — check if a notification preference setting exists and respect it.
- Guard: do not send duplicate notifications. Check if a notification of the given type was already sent for this player in the last 25 days before sending the 30-day one (and last 5 days before the 7-day one).
- The existing 18th birthday graduation handling (Phase 2) remains unchanged — this is purely additive
- npm run check-types passes

### US-P7-008: Child's Independent Right to Data Erasure (GDPR Recital 65)

As a child player who is competent to understand their rights, I want to be able to request deletion of my own sports data without requiring my parent's approval, so that I maintain meaningful control over my personal information.

**Acceptance Criteria:**
- Add a 'Privacy & Data' section to the child player's account settings page (accessible within the player portal)
- Section includes a 'Request Data Erasure' button with explanatory text: 'You can ask us to delete your sports development data. Your coach and parent will be notified that you have made this request. An admin will review and process it.'
- On click: show a confirmation dialog: 'This will ask [Club] to delete all your player data — assessments, wellness history, development goals, and coaching feedback. Your account will also be removed. This cannot be undone. Continue?' — require the child to type 'DELETE' to confirm (prevents accidental taps).
- On confirm: create a pending erasure request record (add v.literal('child_data_erasure') to the notifications type union, or create a new adminRequests table — read existing patterns before choosing). Store: requestingUserId, childPlayerId, organizationId, requestedAt, status ('pending'). Do NOT delete any data yet.
- Send in-app notification to org admin(s): 'A child player has submitted a data erasure request. Review in Admin → Player Requests.' Include the child's name and the date of request.
- Admin review flow: in the admin panel, show pending erasure requests with: child's name, DOB, requesting user, date, 'Process Erasure' and 'Decline with Explanation' buttons.
- 'Process Erasure': calls a deleteChildPlayerData mutation that hard-deletes: playerIdentity record, orgPlayerEnrollment, wellnessCheckins, passportRatings, developmentGoals, coachParentSummaries (child's records), parentChildAuthorizations for this child, parentChildAuthorizationLogs for this child. Retains only the orgPlayerEnrollment stub (renamed to 'deleted player') for team roster continuity if the admin chooses. Updates the request record status to 'completed'.
- 'Decline with Explanation': admin enters a reason (e.g. 'Legitimate interest in retaining statistical data'). Status set to 'declined', reason stored. Sends in-app notification back to the child: 'Your data erasure request was reviewed. [Reason].'
- The erasure process does NOT require the parent to approve or be consulted — this is the child's independent right under GDPR Recital 65.
- The child's request is processed even if the parent has not consented (i.e., the child can request erasure even while the parent's grant is still active — the erasure supersedes the grant).
- npm run check-types passes

### US-P7-UAT: Phase 7 Child Authorization E2E Tests

As a developer, I want Playwright E2E tests for the child authorization system so that access granting, portal gating, content filtering, and pre-birthday notifications all work correctly.

**Acceptance Criteria:**
- Create test file: apps/web/uat/tests/child-authorization-phase7.spec.ts
- Test: parent grant creates parentChildAuthorizations record with correct accessLevel and toggles AND creates a corresponding 'granted' log entry in parentChildAuthorizationLogs
- Test: parentChildAuthorizations record has NO changeLog array (embedded audit pattern removed — logs are in parentChildAuthorizationLogs only)
- Test: child under 13 is blocked from account creation
- Test: child portal shows 'Youth Account' badge in sidebar
- Test: child with View Only access cannot see edit buttons on assessment page
- Test: coach feedback with restrictChildView: true does not appear in child's portal
- Test: child with View+Interact can add a personal development goal (setByRole: 'player')
- Test: parent can see child-added goal in parent portal
- Test: 30-day pre-birthday notification sent to parent (use Convex DB to check notification record)
- Manual test 1: Log in as parent → child profile → Grant Player Access → select View Only → save → verify parentChildAuthorizations record created
- Manual test 2: Invite email sent to child → child opens /child-account-setup?token= → creates account → onboarding shows → lands on player portal with 'Youth Account' badge
- Manual test 3: Log in as child player → confirm all data is read-only (no edit buttons, no form submissions for coach-controlled fields)
- Manual test 4: Disable 'Include Development Goals' toggle in parent portal → log in as child → confirm development goals section not visible
- Manual test 5: As coach: create a voice note insight → toggle 'Restrict from child view' ON → approve it → log in as child → confirm the note does NOT appear in feedback feed
- Manual test 6: As coach: create another note WITHOUT restriction → approve → log in as child → confirm it DOES appear
- Manual test 7: Grant View+Interact to a 16-year-old → log in as child → confirm goal creation form is available → add a goal → confirm it appears labelled 'My Goal'
- Manual test 8: Log in as parent → confirm child-added goal visible in parent portal
- Manual test 9: Parent revokes access → log in as child → confirm redirect to 'access revoked' page
- Manual test 10: Using Convex DB, set a player's DOB to exactly 30 days from today → run graduation cron manually → confirm age_transition_30_days notification created for parent and child
- Manual test 11: Try to create child account with DOB showing age 12 → confirm error 'You must be 13 or older'
- Manual test 12: Log in as a child player (aged 14) → navigate to account settings → click 'Request Data Erasure' → type DELETE → confirm → log in as admin → confirm pending erasure request appears in admin panel
- Manual test 13: Admin processes the erasure request → confirm child's playerIdentity, wellness, goals, and coaching feedback records are deleted → confirm parentChildAuthorizations record removed
- Manual test 14: Log the child back in after erasure → confirm they cannot log in (account removed)
- Manual test 15: Log in as child player → leave session idle for 65 minutes → attempt an action → confirm re-authentication is required (session expired)


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- `v.partial()` does NOT exist in Convex values library — use individual `v.optional(v.boolean())` args instead
- `authComponent.safeGetAuthUser(ctx)` — user `._id` is typed as string (cast with `as string`)
- `age--` triggers biome lint error (noIncrementDecrement) — use `age -= 1` instead
- `restrictChildView` belongs on `coachParentSummaries` (the parent-facing AI summary record), NOT on `voiceNotes` (the raw source). Coach summaries are what parents/children actually see.
- The `parentChildAuthorizationLogs` table needs `childPlayerId` denormalized for efficient `by_child` index queries
- First codegen attempt failed with `t.partial is not a function` — Convex doesn't have v.partial
- Lint check on entire codebase shows 243 errors + 1864 warnings (all pre-existing) — check only modified files with `npx @biomejs/biome check <files>`
--
- The parent portal individual child view is the `ChildCard` component (not a dedicated route) — it's rendered in a grid on `/parents/children/`
- ChildCard's `enrollment` type is a manual subset — if you need a new field from enrollment records, add it to the `enrollment?: {...}` type in the ChildCard props

**Gotchas encountered:**
- First codegen attempt failed with `t.partial is not a function` — Convex doesn't have v.partial
- Lint check on entire codebase shows 243 errors + 1864 warnings (all pre-existing) — check only modified files with `npx @biomejs/biome check <files>`
- [x] Find the parent portal individual child view page — it's the ChildCard component in `/parents/children/` page
- [x] Add 'Grant Player Access' section with access level selector + granular toggles
- [x] Wire up grantChildAccess/revokeChildAccess mutations
- [ ] The invite email (US-P7-003) is triggered on first grant — coordinate with email.ts (deferred to US-P7-003)
---
--
- Biome linter removes unused imports between edits — always add import and its usage in one shot, or add import directly before the usage line
- The invite email (sendChildAccountInviteEmail) is NOT yet implemented — that's US-P7-003. For US-P7-002, the UI grant flow is complete but email sending needs US-P7-003 to add the email function

### Files Changed

- packages/backend/convex/schema.ts (+58, -1)
- packages/backend/convex/models/parentChildAuthorizations.ts (+515, new file)
- packages/backend/convex/models/coachParentSummaries.ts (+3, -0)
- ✅ `npx -w packages/backend convex codegen` — passed
- ✅ `npm run check-types` — passed (0 errors)
- ✅ Linting: biome check on changed files passed (no errors)
- ✅ Pre-commit hook: passed
- `v.partial()` does NOT exist in Convex values library — use individual `v.optional(v.boolean())` args instead
- `authComponent.safeGetAuthUser(ctx)` — user `._id` is typed as string (cast with `as string`)
- `age--` triggers biome lint error (noIncrementDecrement) — use `age -= 1` instead
- `restrictChildView` belongs on `coachParentSummaries` (the parent-facing AI summary record), NOT on `voiceNotes` (the raw source). Coach summaries are what parents/children actually see.
- The `parentChildAuthorizationLogs` table needs `childPlayerId` denormalized for efficient `by_child` index queries
- First codegen attempt failed with `t.partial is not a function` — Convex doesn't have v.partial
--
- apps/web/src/app/orgs/[orgId]/parents/components/grant-child-access-section.tsx (+461, new file)


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
