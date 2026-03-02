# Adult Player Lifecycle — Manual Test Checklist (Phases 6–9)

**Test account:** `neil.B@blablablak.com` / `lien1979`
**Base URL:** `http://localhost:3000`

Mark each item `[x]` as you complete it. Note any failures with the actual vs expected behaviour.

> **Setup note:** You will need at least one account with **multiple functional roles** (e.g. player + coach, or player + admin) to test Phase 6. For Phase 7 you need a parent account with a linked child player aged 13–17.

---

## Phase 6 — Multi-Role UX

### P6-001 · Primary Role & Default Dashboard

- [ ] Log in as a user with **multiple functional roles** (e.g. player + coach)
- [ ] Navigate to any role's **Settings** page → confirm a **"My Roles"** section is present listing all assigned roles
- [ ] Confirm the role that is currently set as primary shows a **"Primary"** badge
- [ ] Click **"Set as Primary"** on a different role → confirm a success toast "Coach is now your primary role" (or whichever role was selected)
- [ ] Confirm the previously primary role badge disappears
- [ ] Log out → log back in → confirm you are redirected directly to the **primary role's dashboard** (e.g. `/orgs/[orgId]/coach/` if coach is primary)
- [ ] Change the primary role to **player** → log out → log back in → confirm redirect lands at `/orgs/[orgId]/player/`
- [ ] Change the primary role to **admin** → log out → log back in → confirm redirect lands at `/orgs/[orgId]/admin/`

### P6-002 · Role Context Badge in Navigation

- [ ] Log in with multiple roles → navigate to the **player portal** → confirm a role badge (e.g. "Player") appears in the header/sidebar navigation
- [ ] The badge colour should match the **org theme** primary colour (not a hardcoded colour)
- [ ] Navigate to the **coach portal** → confirm the badge updates to show "Coach"
- [ ] Navigate to the **admin portal** → confirm the badge updates to show "Admin" or "Owner"
- [ ] On a **single-role account** → confirm the badge is still shown (showing that one role)
- [ ] Resize to **375px** → confirm the badge is visible and not clipped in the mobile layout

### P6-003 · Adding the Player Role to an Existing Account

- [ ] Log in as a user who has **no player role** (e.g. a coach-only account)
- [ ] Navigate to `/orgs/[orgId]/request-role` → confirm a role selection page appears
- [ ] Select **Player** → submit the request
- [ ] Confirm a success message and that the request is pending admin approval
- [ ] Log in as **admin** → navigate to `/orgs/[orgId]/admin/users/approvals` → confirm the Role Requests section shows the pending player role request
- [ ] Confirm the request shows: the member's name, their current roles, and the requested role ("Player")
- [ ] Click **Approve** → confirm the role is granted and the user's role list updates
- [ ] Log back in as the user → confirm the player portal (`/orgs/[orgId]/player/`) is now accessible
- [ ] The My Roles section in Settings → confirm "Player" is now listed

### P6-004 · Cross-Role Permission Guards

- [ ] Log in as a user who has **both admin and player roles**
- [ ] Switch to the **admin** context → navigate to a player's skill assessment page → attempt to submit an assessment **for yourself** → confirm a guard message blocks this: admins cannot assess their own passport
- [ ] Log in as a user who has **both coach and player roles**
- [ ] Switch to **coach** context → navigate to voice notes → attempt to record a voice note about **yourself as a player** → confirm this is blocked or warned
- [ ] Switch to **player** context → confirm you can view your own data normally without restrictions

### P6-005 · Role-Scoped Notification Routing

- [ ] Trigger a **wellness access request** (from a coach requesting access to your wellness data) → log in as the **player** → confirm the notification appears in the **player** notifications bell, not in any coach notifications
- [ ] Trigger an **injury alert** → confirm it routes to the appropriate role's notification feed
- [ ] Confirm notifications from one role context do **not** bleed through to a different role's dashboard

### P6-006 · Deep Link Role Context Prompt

- [ ] While logged in as a multi-role user currently in **player** context, copy and open a URL that belongs to the **coach** portal (e.g. `/orgs/[orgId]/coach/`)
- [ ] Confirm a dialog or prompt appears: "This page is for your Coach context. Would you like to switch?"
- [ ] Click **Switch** → confirm the active role changes to coach and the page loads correctly
- [ ] Click **Stay** (or dismiss) → confirm you remain in your current role context and are redirected to the player dashboard instead
- [ ] Repeat with a **parent** portal URL while in player context → confirm the same prompt appears

---

## Phase 7 — Child Player Passport Authorization

> **Setup note:** You need a parent account with at least one linked child player aged 13–15 (for View Only) and ideally another aged 16–17 (for View + Interact). Use the Convex dashboard to confirm `parentChildAuthorizations` records.

### P7-001 / P7-002 · Parent Grants Child Platform Access

- [ ] Log in as a **parent** → navigate to the Parent dashboard → confirm a **"Grant Child Access"** section or card is visible for each linked child
- [ ] For a child aged **under 13** → confirm the option to grant access is **not shown** (minimum age is 13)
- [ ] For an eligible child → click the access grant control → confirm three access levels are presented:
  - **No Access** (default)
  - **View Only**
  - **View + Interact** (available only for ages 16–17)
- [ ] For a child aged **13–15** → confirm **"View + Interact"** is **disabled/greyed out** (not available for under-16s)
- [ ] Select **View Only** → save → confirm the change persists on page refresh
- [ ] Navigate to the **Content Toggles** section → confirm individual content controls are present (e.g. show/hide: passport ratings, coach feedback, injuries, goals)
- [ ] Toggle off **coach feedback** → save → verify the child's view no longer shows that section (log in as child to verify)
- [ ] Select **No Access** → save → confirm the child can no longer log in to the portal (or sees an access-revoked page)

### P7-003 · Child Account Creation & Onboarding

- [ ] Log in as **admin** → create a new youth player record (DOB = 14 years ago) with a parent guardian
- [ ] Invite the child player via the child account setup flow → confirm an email is sent to the child's email address
- [ ] Open the invite link → confirm the **child account setup page** (`/child-account-setup`) loads with the child's name and org
- [ ] Create a password and complete setup → confirm successful account creation
- [ ] Log in as the child → confirm an **onboarding flow** appears (age-appropriate, not the adult onboarding)
- [ ] Confirm the child is redirected to the **player portal** after onboarding
- [ ] Confirm a **parent notification** is sent when the child logs in for the first time

### P7-004 · Child Dashboard — View Only Mode

- [ ] Log in as a **child player (age 13–15)** with **View Only** access granted by parent
- [ ] Confirm the player portal loads at `/orgs/[orgId]/player/`
- [ ] Confirm the child can **view** their passport ratings, coach feedback, and wellness trends
- [ ] Confirm there are **no edit, submit, or input controls** anywhere — all forms are read-only
- [ ] Confirm the **Daily Wellness check-in form** does not appear (no submission allowed in view-only mode)
- [ ] Confirm **coach feedback** is shown in read-only format (no acknowledge button)
- [ ] Confirm the **Goals** page shows goals but has no "Add Goal" or "Edit" buttons
- [ ] Confirm the navigation does **not** include Settings items that would allow data changes
- [ ] If parent revokes access → child receives the **access-revoked page** at `/orgs/[orgId]/player/access-revoked`

### P7-005 · Child View + Interact Mode (Ages 16–17)

- [ ] Log in as a **child player aged 16–17** with **View + Interact** access granted by parent
- [ ] Confirm the **Daily Wellness check-in** form is **active and submittable**
- [ ] Submit a daily wellness check-in → confirm success toast and the record appears in the DB
- [ ] Confirm the child can **add a personal goal** (the "Add Goal" button is present and functional)
- [ ] Confirm the child can **respond to coach feedback** (a text response field is present)
- [ ] Confirm the child **cannot edit** their profile fields (name, DOB, gender are locked)
- [ ] Confirm the child **cannot** access passport sharing controls or GDPR data export
- [ ] On the **Goals** page: confirm goals added by the child show a **"Player Goal"** badge (blue) and coach-added goals show a **"Coach Goal"** badge

### P7-006 · Coach Parent-Only Note Filtering

- [ ] Log in as a **coach** → navigate to Voice Notes for a player who has an active child account
- [ ] In the parent summary for that player, add a note marked as **"Parent Only"** (check the sensitivity level controls)
- [ ] Log in as the **child player** → navigate to Coach Feedback → confirm the **parent-only note does not appear** in the child's feedback view
- [ ] Log in as the **parent** → navigate to Coach Feedback for that child → confirm the parent-only note **does appear**
- [ ] Confirm the filtering is applied server-side (inspect the network response — the note should not be in the JSON returned to the child's session)

### P7-007 · Pre-Birthday Advance Notifications

- [ ] Use the Convex dashboard to locate a youth player whose birthday is **within the next 30 days**
- [ ] Trigger or wait for the nightly notification job → check the **parent's notifications bell** for a "Your child turns 18 in [N] days" notification
- [ ] Confirm a **30-day** notification is sent when the birthday is 30 days away
- [ ] Confirm a **7-day** notification is sent when the birthday is 7 days away
- [ ] Confirm the notification links to the graduation flow or relevant action page
- [ ] Confirm **admins** also receive the advance birthday notifications for players approaching 18

### P7-008 · Child's Independent Right to Data Erasure

- [ ] Log in as a **child player aged 16–17** (View + Interact mode)
- [ ] Navigate to Player Settings → confirm a **"Your Data Rights"** or "Right to Erasure" section is visible
- [ ] Confirm explanatory text is shown about what data will be erased and what cannot be erased (audit logs, child authorization logs)
- [ ] Submit an erasure request → confirm a success message and a status tracker appears showing "Pending"
- [ ] Log in as **admin** → navigate to `/orgs/[orgId]/admin/data-rights` → confirm the child's erasure request appears in the queue
- [ ] Confirm the request is flagged as originating from a **child player** (not a guardian or adult)
- [ ] Approve the erasure → confirm the appropriate data categories are soft-deleted
- [ ] Log back in as the child → confirm wellness data, coach feedback entries, and other erasable data are no longer visible

---

## Phase 8 — Dual-Channel Wellness (WhatsApp & SMS)

> **Setup note:** Phase 8 requires a live WhatsApp Business API connection (Meta BSP) and a Twilio account for SMS. Some tests can only be verified via Convex logs and DB records if you do not have access to a physical phone. Mark those `[skip — no live phone]` if needed.

### P8-005 · Player Channel Registration

- [ ] Log in as a **player** → navigate to Player Settings → confirm a **"Wellness Check-In Channel"** or **"Notification Channel"** section is present
- [ ] Confirm the available channel options are: **In-App only**, **WhatsApp**, **SMS (Conversational)**
- [ ] Select **SMS (Conversational)** → confirm a phone number input field appears
- [ ] Enter a valid mobile number in E.164 format (e.g. +353...) → click **Send Verification Code**
- [ ] Confirm a 6-digit SMS is received on the entered number `[skip — no live phone]`
- [ ] Enter the correct code → confirm "Phone verified" success message and the channel is saved
- [ ] Enter an **incorrect code** → confirm an error message with remaining attempts count
- [ ] Navigate away and return → confirm the saved channel preference is shown correctly
- [ ] Select **WhatsApp** → confirm a WhatsApp opt-in flow is triggered (or a QR code / link is shown to opt in) `[skip — no live WhatsApp connection]`
- [ ] Select **In-App only** → confirm the channel is saved and no phone number is required

### P8-006 · Admin Wellness Scheduling Configuration

- [ ] Log in as **admin** → navigate to the org settings or wellness admin section → confirm a **WhatsApp Wellness Scheduling** configuration panel is present
- [ ] Confirm configurable options include: **send time** (HH:MM), **days of week**, and **timezone**
- [ ] Change the send time → save → confirm the change persists
- [ ] Confirm the schedule applies to all players in the org who have opted into WhatsApp or SMS wellness
- [ ] Navigate to `/orgs/[orgId]/admin/analytics` → confirm a **WhatsApp / Notifications** tab is available

### P8-007 · Daily Dispatch Cron (Channel-Aware)

- [ ] In Convex dashboard logs, confirm the daily wellness dispatch cron fires at the configured time
- [ ] For a player with **In-App** channel: confirm no SMS/WhatsApp message is sent; they receive an **in-app push notification** instead
- [ ] For a player with **SMS** channel: confirm a Twilio outbound SMS message appears in the Convex `whatsappMessages` or SMS session tables `[verify in DB]`
- [ ] For a player with **WhatsApp** channel: confirm a WhatsApp Flow is dispatched via the Meta API `[verify in Convex logs]`
- [ ] Confirm players who have **already submitted** today's wellness check do **not** receive a dispatch message
- [ ] Confirm players with **no channel registered** receive an **in-app notification** as fallback

### P8-008 · App Sync & Completion UX

- [ ] As a player who receives an **SMS wellness prompt**: reply to the SMS with your dimension scores → confirm the responses are saved to `dailyPlayerHealthChecks` in the DB
- [ ] After completing via SMS: open the **in-app Daily Wellness page** → confirm today's check is shown as **already submitted** with the responses displayed (synced from SMS)
- [ ] Confirm the check-in page shows the **channel source**: e.g. "Submitted via SMS today"
- [ ] After completing via WhatsApp Flow: open the in-app page → confirm the same sync behaviour
- [ ] Complete the in-app check-in (overriding a previously submitted SMS response) → confirm the in-app submission takes precedence

### P8-009 · Admin WhatsApp Wellness Monitoring Dashboard

- [ ] Log in as **admin** → navigate to Analytics → **WhatsApp / Notifications** tab
- [ ] Confirm the dashboard shows: number of messages sent today, delivery status breakdown (sent / delivered / failed / replied)
- [ ] Confirm a **per-player breakdown** is shown: player name, channel, last response date
- [ ] Confirm **opt-out** players are shown with a "No channel" or "Opted out" status
- [ ] Filter by date range → confirm the counts update correctly
- [ ] Confirm no **wellness dimension values** are shown in the admin monitoring view (aggregate compliance stats only, not individual health data)

---

## Phase 9 — Compliance (GDPR Erasure, Data Retention & WCAG AA)

### P9-003 · Player Right to Erasure — Submit & Track

- [ ] Log in as a **player** → navigate to Player Settings → scroll to the **"Your Data Rights"** section
- [ ] Confirm explanatory GDPR Article 17 text is present
- [ ] Confirm a list of **erasable data categories** is shown (Wellness Data, Assessment History, Coach Feedback, Communication Data, Profile Data)
- [ ] Confirm **non-erasable categories** are shown as locked with a legal reason: Injury Records (healthcare retention, 7yr), Audit Logs (GDPR Art. 30, 3yr), Child Auth Logs (safeguarding, 7yr)
- [ ] Select one or more erasable categories → click **"Submit Erasure Request"**
- [ ] Confirm a confirmation dialog appears: "This action cannot be undone. The selected data will be permanently deleted." → confirm
- [ ] Confirm a success message and a **request status tracker** appears showing status: **"Pending"**
- [ ] Confirm the status updates in real time (no page refresh needed) as the admin processes the request
- [ ] Try to submit a **second erasure request** while one is already pending → confirm this is blocked with a message: "You already have an active request."

### P9-004 · Admin Erasure Request Review & Execution

- [ ] Log in as **admin** → navigate to `/orgs/[orgId]/admin/data-rights`
- [ ] Confirm all pending erasure requests are listed with: player name, request date, requested categories, status
- [ ] Click on a request → confirm a detail view shows the full category breakdown and any notes
- [ ] Click **"Approve & Execute"** → confirm a dialog: "This will permanently delete [N] categories of data for [Player Name]. This cannot be undone."
- [ ] Confirm the execution → verify in the Convex DB that the relevant records have `retentionExpired: true` set (soft-deleted)
- [ ] Confirm the player's erasure status updates to **"Completed"** in real time
- [ ] Click **"Reject"** on a different request → enter a rejection reason → confirm status updates to **"Rejected"** and the player sees the reason in their status tracker
- [ ] Confirm **Injury Records, Audit Logs, and Child Auth Logs** are **never shown** as erasable categories in the admin view — they should not appear as options

### P9-005 · Data Retention Configuration

- [ ] Log in as **admin** → navigate to `/orgs/[orgId]/admin/data-retention`
- [ ] Confirm the configuration page shows the **six configurable retention periods** with their defaults:
  - Wellness Data: 730 days (2 years)
  - Assessment History: 1825 days (5 years)
  - Injury Records: 2555 days (7 years) — read-only, legally mandated
  - Coach Feedback: 1825 days (5 years)
  - Audit Logs: 1095 days (3 years) — read-only, minimum enforced
  - Communication Data: 365 days (1 year)
- [ ] Attempt to set **Wellness Data** to **10 days** → confirm a validation error: minimum must be greater than 0 (or a meaningful minimum)
- [ ] Attempt to set **Audit Logs** to **365 days** → confirm the field is locked at the minimum (1095 days) with a tooltip explaining the legal requirement
- [ ] Set **Wellness Data** to **365 days** → save → confirm the change persists
- [ ] Confirm an **upcoming expiry count** section shows: "X wellness records expiring in the next 90 days"
- [ ] Revert to defaults → confirm the values reset correctly

### P9-006 · Retention Enforcement Cron (Soft-Delete & Hard-Delete Pipeline)

> Verify via Convex dashboard logs and DB records.

- [ ] In the Convex DB, find a `dailyPlayerHealthChecks` record with a `retentionExpiresAt` timestamp in the past → confirm it has not yet been soft-deleted (simulate by manually setting `retentionExpiresAt` to a past date)
- [ ] After the nightly cron runs (or trigger it manually via Convex) → confirm the record now has `retentionExpired: true` and `retentionExpiredAt` is set
- [ ] Confirm the soft-deleted record does **not appear** in the player's wellness history in the UI
- [ ] Confirm the record is **not hard-deleted** immediately — it should remain in the DB during the 30-day grace period
- [ ] After the 30-day grace period (simulate by setting `retentionExpiredAt` > 30 days ago) → run the hard-delete cron → confirm the record is fully removed from the DB (`ctx.db.delete`)
- [ ] Check the `whatsappMessages` table → confirm expired messages follow the same soft-delete → hard-delete pipeline
- [ ] Check the Monday 6 AM UTC **weekly digest** cron → confirm org admins receive an in-app `retention_weekly_digest` notification with a summary of records processed

### P9-007 / P9-008 / P9-009 · WCAG 2.1 AA Accessibility

#### Automated (axe-playwright)

- [ ] Run the Playwright accessibility audit: `npm run e2e -- --grep "axe"` (or the equivalent test command) → confirm **zero critical violations** on all audited pages
- [ ] Confirm the axe report is generated in `playwright-report/` after the run

#### Keyboard Navigation

- [ ] Open any page in the **player portal** → press **Tab** → confirm a **"Skip to main content"** link appears as the first focusable element
- [ ] Press **Enter** on the skip link → confirm focus jumps past the navigation to the main content area
- [ ] Tab through the entire **Daily Wellness check-in** page without using a mouse → confirm every emoji button and the Submit button receive visible focus indicators
- [ ] On the emoji scale (**radiogroup**): confirm **ArrowRight / ArrowDown** moves focus to the next emoji option; **ArrowLeft / ArrowUp** moves to the previous
- [ ] Confirm the currently selected emoji has `aria-checked="true"` and non-selected have `aria-checked="false"` (inspect with browser DevTools accessibility panel)
- [ ] Confirm each emoji button has an **sr-only label** (e.g. "Very Poor — 1 out of 5") readable by screen readers
- [ ] Tab through the **player profile form** → confirm all inputs have visible focus rings and correct `aria-label` or associated `<label>` elements
- [ ] Confirm the **lock icons** on read-only fields (dateOfBirth, gender) have an accessible tooltip: "Contact your admin to change"

#### Colour Contrast & Theme

- [ ] Using browser DevTools or axe → confirm all **text on org-themed backgrounds** (buttons, badges, navigation) meets WCAG AA contrast ratio (≥ 4.5:1 for normal text, ≥ 3:1 for large text)
- [ ] Apply a **dark org theme** (if configurable) → re-check contrast — confirm the theme colours adapt correctly via CSS custom properties (`--org-primary`, `--org-secondary`)
- [ ] Navigate through the app with **"Prefer reduced motion"** enabled in OS settings → confirm animations and transitions are disabled or reduced

#### Form Labels

- [ ] Inspect the **player registration / onboarding forms** → confirm every `<input>`, `<select>`, and `<textarea>` has either a visible `<label>` or an `aria-label` attribute
- [ ] Confirm **error messages** are associated with their fields via `aria-describedby` or shown inline adjacent to the field

### P9-010 · Data Breach Notification Register

- [ ] Log in as **admin** → navigate to `/orgs/[orgId]/admin/breach-register`
- [ ] Confirm the breach register page loads with an empty state if no incidents have been logged
- [ ] Click **"Log Incident"** (or equivalent button) → confirm a dialog opens with fields:
  - Incident title / description
  - Date of discovery
  - Data categories affected (checkboxes: wellness, assessments, profile, etc.)
  - Number of data subjects affected
  - Severity (minor / moderate / major)
  - Actions taken / mitigation notes
  - DPA notification required? (Yes / No / TBD)
- [ ] Fill in all fields → submit → confirm the incident appears in the breach register list
- [ ] Confirm the record shows: title, discovery date, severity badge, status
- [ ] Click **"Update"** on an existing record → change the status to "Resolved" → confirm the update persists
- [ ] Confirm the register shows a **running count** of incidents and a **72-hour DPA notification deadline** indicator where applicable (GDPR Article 33 — DPA must be notified within 72 hours of discovery if the breach is likely to result in risk to individuals)
- [ ] Confirm only **admin and owner** roles can access the breach register — a coach or player role should be **denied access**

---

## Cross-Phase Smoke Tests (Phases 6–9)

Run these quick checks after completing the individual phase tests:

- [ ] A user with **player + coach** roles can seamlessly switch between `/orgs/[orgId]/player/` and `/orgs/[orgId]/coach/` without being logged out
- [ ] After a **child player submits a wellness check** (View + Interact mode), the check appears in the **coach team wellness dashboard** with the correct player name and aggregate score
- [ ] The **player data export** (GDPR Article 20, Phase 5) includes data created in Phases 6–9: wellness submissions from WhatsApp channel (marked with `channel: "whatsapp"`), any erasure request history
- [ ] On **mobile (375px)**: all Phase 9 compliance pages (data-rights, data-retention, breach-register) are usable and not horizontally scrollable
- [ ] Confirm the **weekly retention digest notification** appears in the admin notifications bell with title "Weekly Data Retention Summary"

---

*Generated from PRD acceptance criteria for phases 6–9 of the Adult Player Lifecycle.*
*Last updated: 2026-03-01*
