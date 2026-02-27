# Adult Player Lifecycle — Manual Test Checklist (Phases 1–5)

**Test account:** `neil.B@blablablak.com` / `lien1979`
**Base URL:** `http://localhost:3000`

Mark each item `[x]` as you complete it. Note any failures with the actual vs expected behaviour.

---

## Phase 1 — Player Portal Layout & Navigation

### P1-001 · Sidebar Navigation

- [ ] Log in as a user with the **player** functional role → confirm the player portal loads at `/orgs/[orgId]/player/`
- [ ] Confirm the sidebar contains all **9 nav items** with correct labels and icons:
  - Overview (Home icon)
  - My Profile (User icon)
  - My Progress (TrendingUp icon)
  - My Teams (Users icon)
  - Daily Wellness (Heart icon)
  - My Injuries (Activity icon)
  - Coach Feedback (MessageSquare icon)
  - Passport Sharing (Share2 icon)
  - Settings (Settings icon)
- [ ] Click each nav item → confirm no 404 errors; unbuilt sections show a "Coming Soon" placeholder
- [ ] Log in as a user **without** the player role → confirm redirect to org home (not the player portal)
- [ ] Confirm org theme colours are applied consistently across all portal pages (sidebar, cards, buttons)

### P1-001 · Mobile Layout

- [ ] Resize browser to **375px wide** → confirm a bottom nav bar appears with 4 primary items
- [ ] Confirm all bottom nav tap targets are at least **44×44px**
- [ ] Confirm the sidebar collapses correctly on mobile

### P1-002 · Today Priority Section

- [ ] Navigate to Overview (`/player/`) → confirm the **Today** section is at the top of the page
- [ ] With **no wellness check submitted today** → confirm an **amber** "Complete your daily wellness check" card is shown with a "Start Check-In" button
- [ ] Submit a wellness check → without refreshing, confirm the card turns **green** and shows today's aggregate score (e.g. "4.2 / 5")
- [ ] With **no active injuries** → confirm the injury card is **NOT shown**
- [ ] With an **active injury on record** → confirm an amber injury card appears showing body part and status, linking to `/player/injuries`
- [ ] When wellness is done AND no active injuries AND no unread feedback → confirm a single green **"All clear today 🎉"** card appears
- [ ] Confirm the quick stats strip shows: player name, current team(s), today's date in format "Tuesday, 25 Feb"
- [ ] Confirm the **Full Profile** section (passport, emergency contacts, benchmarks, goals, skills, positions) renders below the Today section on the same page — content unchanged from original

### P1-002 · Mobile

- [ ] At 375px: confirm Today cards stack vertically, full width
- [ ] Confirm a "See full profile ↓" link anchors to the Full Profile section

### P1-003 · My Profile Self-Edit

- [ ] Navigate to My Profile (`/player/profile`)
- [ ] Confirm **editable fields** are present: email, phone, address, town, postcode, country
- [ ] Edit the **phone number** → save → refresh the page → confirm the new phone number persists
- [ ] Confirm **read-only fields** (first name, last name, date of birth, gender) display a **lock icon** and cannot be edited
- [ ] Hover or tap the lock icon → confirm tooltip "Contact your admin to change"
- [ ] Confirm the Save button shows a loading state during save, a success toast on completion, and an error toast if it fails
- [ ] Confirm the **Emergency Contacts** section is visible below personal details
- [ ] Click **Add** → fill in name, phone, relationship → save → confirm the new contact appears in the list
- [ ] Edit an existing emergency contact → save → confirm changes persist
- [ ] Delete an emergency contact → confirm it is removed from the list
- [ ] At 375px: confirm the profile form is single-column and usable

---

## Phase 2 — Youth-to-Adult Graduation Flow

> **Setup note:** To test the full flow you need a youth player with a DOB exactly 18 years ago and an associated guardian account. Use the Convex dashboard to inspect `playerGraduations` records directly.

### P2-001 · Guardian Graduation Alert

- [ ] Log in as a **guardian** with a child who has a pending graduation record → confirm the graduation alert banner appears in the parent dashboard
- [ ] Alert shows: player full name, date of birth, org name, "They turned 18 on [date DD MMM YYYY]"
- [ ] Confirm two buttons are present: **"Send Account Invite"** and **"Dismiss"**
- [ ] Click **Dismiss** → confirm the banner disappears immediately and does not return on refresh
- [ ] If multiple children have pending graduations → confirm one alert card per child

### P2-002 · Send Account Invite Email

- [ ] From the graduation alert, click **"Send Account Invite"**
- [ ] Confirm a dialog opens with the player's email pre-filled and the player's name visible
- [ ] Edit the email address if needed → click confirm
- [ ] Confirm the success message "Invite sent to [email]. Link valid for 30 days." appears
- [ ] Check the Convex logs → confirm a graduation invitation email was dispatched via Resend
- [ ] Click "Send Account Invite" a second time → confirm a new token is created and the previous one is invalidated

### P2-003 · Player Claims Account (Token Flow)

- [ ] Open the claim link from the email (`/claim-account?token=xxx`) → confirm it shows the player name and org name
- [ ] Try `/claim-account?token=invalid` → confirm "This link is invalid" error with guidance to contact guardian
- [ ] Try an expired token → confirm "This invite link has expired" message with a resend prompt
- [ ] Try an already-used token → confirm "This account has already been claimed. Try signing in."
- [ ] Open a valid link while **not logged in** → confirm a sign-in/sign-up prompt appears, token is preserved through auth redirect
- [ ] Log in, return to the claim page → confirm a confirmation dialog appears before claiming

**SMS/Email PIN verification:**
- [ ] (Player **with** a mobile number on record) Click confirm on the claim dialog → confirm a **6-digit SMS** is received on the registered mobile number
- [ ] Enter the correct PIN → confirm the account is claimed successfully
- [ ] (Player **without** a mobile number) Click confirm → confirm a 6-digit PIN is sent by **email** instead
- [ ] Enter an **incorrect PIN** → confirm error shows "Incorrect code. [N] attempts remaining."
- [ ] Enter a wrong PIN **3 times** → confirm the flow locks with "Too many incorrect attempts. Please ask your guardian to resend the invite." — the token itself should remain valid for admin bypass
- [ ] Enter an **expired PIN** → confirm "Your code has expired. Click Resend to get a new one." with a Resend button

**Post-claim:**
- [ ] After successful claim → confirm redirect to `/orgs/[orgId]/`
- [ ] Confirm the onboarding orchestrator shows the **player_graduation** step (welcome message, "Go to My Dashboard" button)
- [ ] Click "Go to My Dashboard" → confirm redirect to `/orgs/[orgId]/player/`
- [ ] Try to use the same token again → confirm "already used" error

### P2-004 · Admin Manual Graduation Trigger

- [ ] Log in as admin → navigate to a youth player aged 18+ in `/admin/players/[playerId]`
- [ ] Confirm a **Graduation** section is visible (only for youth players aged ≥ 18)
- [ ] Confirm the section shows the current graduation status (pending / invitation_sent / claimed / dismissed) and it updates in real time
- [ ] Click **"Send Invitation"** → confirm email dispatched (check Convex logs)
- [ ] Click **"Transition Now"** → confirm a dialog appears: "This will convert [Name] to an adult player. Guardian contacts will be converted to emergency contacts. This cannot be undone. Proceed?"
- [ ] Confirm the transition → verify `playerType` changes to `'adult'` in the DB

---

## Phase 3 — Adult Import & Youth Record Matching

> **Setup note:** Create a youth player record first (e.g. "Séan O'Brien", DOB = 18 years ago). Then perform each matching test against that record.

### P3-001 / P3-002 · Manual Add Player — High Confidence Match

- [ ] Admin → Add Player → enter an adult with the **same name and DOB** as the youth player → submit
- [ ] Confirm a **blocking dialog** appears: "A youth profile matching this player exists — [Name], born [DOB]. Link to existing history or create new?"
- [ ] Click **"Link to Existing History"** → confirm **no new** `playerIdentity` record is created; the existing record is transitioned to adult
- [ ] Repeat, this time click **"Create New Profile"** → confirm two records now exist

### P3-002 · Irish Name Normalisation

- [ ] Add adult with name **"Séan O'Brien"** (with fada) matching youth record **"Sean OBrien"** (same DOB) → confirm HIGH match dialog appears
- [ ] Add adult with surname **"MacCarthy"** matching youth **"McCarthy"** (same DOB) → confirm HIGH match dialog appears

### P3-002 · Medium Confidence Match

- [ ] Add adult with a similar but not identical name (same DOB) → confirm an **amber non-blocking warning banner** appears above the form with a "View Match" link
- [ ] Confirm the flow continues without blocking

### P3-003 · CSV Import Matching

- [ ] Upload a CSV with an adult row that matches an existing youth player by name + DOB
- [ ] Confirm a **"Youth Match"** column appears in the import review table with a **"High"** badge for the matching row
- [ ] Default selection for HIGH match row is **"Accept Match"** → confirm this is pre-selected
- [ ] Change a HIGH match row to **"Skip Match"** → complete import → confirm a new record is created
- [ ] Accept match → complete import → confirm no duplicate record, existing enrollment updated
- [ ] Confirm the import summary shows: "X adult rows will be merged with existing profiles, Y will create new profiles"

### P3-004 · Self-Registration with Youth Matching

- [ ] Go to the org join request form → select **"I'm a player"** role
- [ ] Confirm a **DOB field** appears (required for player role)
- [ ] Submit with name + DOB matching an existing youth record
- [ ] Log in as admin → navigate to pending requests → confirm the request is **flagged** with "May match [Name], born [DOB]. Link or create new?"
- [ ] Click **"Approve & Link to Existing History"** → confirm player is linked to existing record
- [ ] Confirm the player receives an approval email

### P3-005 · Email Invite with Youth Matching

- [ ] Admin → Invite Player by email → enter email + DOB matching an existing youth record
- [ ] Confirm an informational note appears inline in the dialog: "A youth profile may exist for this person. They'll be linked to their existing history when they accept the invite."
- [ ] Complete the invite → player accepts → confirm existing youth record is linked (not duplicated) when age ≥ 18

---

## Phase 4 — Daily Player Wellness Check

### P4-002 · Wellness Dimension Settings

- [ ] Navigate to Player Settings (`/player/settings`) → Wellness Dimensions section
- [ ] Confirm **5 core dimensions** are shown as read-only rows with a **lock icon** and green "Active" badge (Sleep Quality, Energy, Mood, Physical Feeling, Motivation)
- [ ] Confirm there are **no toggles** on the core dimensions — they cannot be individually disabled
- [ ] ~~Confirm the 3 optional dimensions (Food Intake, Water Intake, Muscle Recovery) are no longer shown~~ *(removed — optional dimensions have been removed from the product)*

### P4-003 · Daily Wellness Check-In

- [ ] Navigate to Daily Wellness (`/player/health-check`)
- [ ] Confirm exactly **5 core dimension** questions are shown (Sleep Quality, Energy, Mood, Physical Feeling, Motivation)
- [ ] Confirm each dimension shows **5 emoji buttons**: 😢 😟 😐 🙂 😁
- [ ] Confirm emoji buttons are at least **44×44px** tap targets
- [ ] Tap an emoji → confirm it highlights with the accent colour; other emojis become muted
- [ ] Confirm the **Submit button is disabled** until all 5 dimensions are answered
- [ ] Fill all 5 dimensions → click Submit → confirm success toast with streak counter (e.g. "Wellness check submitted ✓ — 3 days in a row 🔥")
- [ ] Return to the page the **same day** → confirm current answers are shown in selected state and the button reads "Update Check-In"
- [ ] Change one answer → click Update → confirm change is saved

### P4-003 · Offline Support

- [ ] Open DevTools → Network tab → set to **Offline**
- [ ] Fill all dimensions → submit → confirm "No connection — your check-in is saved and will sync when you're back online." banner
- [ ] Restore network → confirm "Check-in synced ✓" toast appears automatically
- [ ] Check the DB record → confirm `submittedOffline: true`

### P4-003 / P4-007 · Cycle Phase (Female Players Only)

- [ ] Log in as a **female adult player** → navigate to Daily Wellness → confirm the **Cycle Phase** section appears at the bottom with 5 phase pills: Menstruation, Early Follicular, Ovulation, Early Luteal, Late Luteal
- [ ] Tap a cycle phase pill (first time, no prior consent) → confirm the **GDPR consent modal** appears **before** the selection is registered
- [ ] Confirm the GDPR modal checkbox is **NOT pre-ticked**
- [ ] Tick the checkbox → confirm "I Consent" button becomes enabled → click it → confirm the modal closes and the phase can now be selected
- [ ] Click "Skip / No Thanks" → confirm cycle phase section is hidden for the session
- [ ] Log in as a **male player** → navigate to Daily Wellness → confirm the cycle phase section does **NOT appear**
- [ ] Log in as a **female player under 18** → confirm cycle phase section does **NOT appear**

### P4-004 · Wellness Trend Charts

- [ ] After submitting at least 2 check-ins → scroll down on the Daily Wellness page → confirm trend charts appear
- [ ] Confirm an **overall aggregate score** chart is shown first (most prominent)
- [ ] Confirm one chart per enabled core dimension
- [ ] Toggle between **7 days / 30 days / 90 days** → confirm all charts update
- [ ] Confirm days with no submission show as a **gap** in the line (not zero)
- [ ] On narrow screens (375px) → confirm charts scroll horizontally rather than squashing labels
- [ ] With fewer than 2 check-ins → confirm "Check in for a few more days to see your trends" message appears instead of charts

### P4-005 · Per-Coach Wellness Access — Player Side

- [ ] Navigate to Player Settings → **Wellness Access** section
- [ ] Confirm empty state: "No coaches have requested access to your wellness data yet."
- [ ] After a coach sends a request (see P4-006 below): confirm the coach name appears with **Approve** and **Deny** buttons
- [ ] Click **Approve** → confirm status changes to "Approved" with a green badge and a "Revoke" button
- [ ] Click **Revoke** → confirm a dialog "Remove [Coach Name]'s access to your wellness data?" → confirm → status changes to "Revoked"
- [ ] Confirm denied coaches show "Denied" label with no action buttons

### P4-006 · Coach Team Wellness Dashboard

- [ ] Log in as a **coach** → navigate to Team Hub → confirm a **Team Wellness** section is present
- [ ] For players **without** approved access: confirm "Access not granted" label and "Request Access" button
- [ ] Click **Request Access** → confirm button changes to "Request sent — awaiting approval" (disabled)
- [ ] Confirm the player receives an in-app notification: "[Coach name] has requested access to your wellness trends"
- [ ] After player approves (P4-005): confirm the coach sees the player's **aggregate score** (colour-coded 1–5) and a **7-day sparkline trend**
- [ ] Confirm **individual dimension values are NEVER shown** to the coach
- [ ] Confirm **cycle phase is NEVER shown** in the coach view
- [ ] Players with aggregate score ≤ 2.0 → confirm they are highlighted with an amber alert icon and bolded name
- [ ] Confirm the summary line: "X of Y players checked in today"
- [ ] After player revokes access → confirm player shows "Access not granted" again in coach view

### P4-007 · GDPR Cycle Phase Consent — Settings

- [ ] Navigate to Player Settings → **Privacy** section (visible only for female players ≥ 18)
- [ ] Confirm "Menstrual Cycle Phase Tracking" toggle is present
- [ ] With active consent: toggle is **ON** → toggle it OFF → confirm dialog "Withdrawing consent will permanently delete all your menstrual cycle phase data. This cannot be undone. Continue?"
- [ ] Confirm withdrawal → check DB → confirm all past `cyclePhase` values are **nulled out**

### P4-009 · Admin Wellness Analytics

- [ ] Log in as admin → navigate to Analytics → confirm a **Wellness** tab is present
- [ ] Confirm the org-level chart shows average daily wellness scores across all players
- [ ] Click a player name → confirm drill-down to full dimension-level history
- [ ] Confirm a **CSV export** button is available with date range and player filters

### P4-010 · AI Wellness Insights

- [ ] After submitting **7 or more** check-ins: submit a new check-in → within ~10 seconds, confirm a "💡 [insight text]" card appears below the submission confirmation
- [ ] Navigate to the trend chart view → confirm the **"Latest Insight"** collapsible panel is present at the top
- [ ] Confirm the attribution reads "Generated by AI · Based on your last [N] check-ins"
- [ ] With fewer than 7 check-ins → confirm "Check in for [7 - count] more days to unlock personalised insights." nudge message
- [ ] Confirm the insight is **not visible** to coaches or admins

---

## Phase 5 — Full Player Portal Remaining Sections

### P5-001 · My Progress (Sport Passports)

- [ ] Navigate to My Progress (`/player/progress`)
- [ ] Confirm passport ratings are displayed (technical, tactical, physical, mental) in **read-only** format
- [ ] Confirm there are **no edit buttons or inputs** on skill ratings
- [ ] Confirm the label "Ratings are set by your coach" is visible
- [ ] Confirm **trend arrows** (↑ ↓ =) appear next to each rating based on most recent vs previous assessment
- [ ] If multiple sports: confirm a **tab or pill switcher** appears at the top to select between sports
- [ ] Confirm the **assessment history timeline** shows assessment dates with summary score, newest first
- [ ] Scroll to the **My Notes** section → type a note → save → refresh → confirm note persists
- [ ] With no assessments: confirm "No passport assessments yet. Your coach will complete your first assessment."
- [ ] At 375px: confirm the page is usable on mobile

### P5-001 / P5-006 · Radar Chart (Visual Progress Profile)

- [ ] Confirm a **Chart / List** toggle is visible above the ratings section, defaulting to "Chart"
- [ ] Switch to **Chart view** → confirm a radar/spider chart appears using the most recent assessment
- [ ] Confirm the chart has one axis per passport dimension (technical, tactical, physical, mental)
- [ ] Hover over an axis point → confirm tooltip shows dimension name + score (e.g. "Technical: 7.5")
- [ ] If multiple assessments exist: confirm a **ghost radar** (dashed, 40% opacity) for the previous assessment is overlaid, with a legend showing current vs previous dates
- [ ] Switch to **List view** → confirm trend arrows and dimension list are shown, unchanged
- [ ] Refresh the page → confirm the view preference is **remembered** (persisted in localStorage)
- [ ] At 375px: confirm the radar chart remains readable and axis labels are not clipped
- [ ] With no assessments: confirm the empty state message appears — **not** an empty radar chart

### P5-002 · My Passport Sharing

- [ ] Navigate to Passport Sharing (`/player/sharing`)
- [ ] Confirm the UI mirrors the parent sharing page (toggle, sharing requests list)
- [ ] Toggle sharing **on** → confirm the change persists in the DB
- [ ] Toggle sharing **off** → confirm the change persists in the DB
- [ ] If a sharing enquiry exists: confirm **Approve** and **Deny** buttons are present and functional
- [ ] Empty state: "No sharing requests yet. Enable sharing to let other clubs view your passport."
- [ ] **Ownership transfer** (requires a graduation claim to have occurred): confirm that after a player claims their account, the passport sharing controls belong to the **player** (not the guardian), and the guardian no longer has sharing control

### P5-003 · My Injuries

- [ ] Navigate to My Injuries (`/player/injuries`)
- [ ] Confirm existing injuries are listed with: body part, injury type, severity, date, status
- [ ] Confirm coach-reported injuries show a **"Reported by coach"** badge
- [ ] Confirm player-reported injuries show a **"You reported this"** badge
- [ ] If an active injury exists: confirm it appears **prominently at the top** with status and expected return date
- [ ] Click **"Report New Injury"** → confirm a dialog opens with: body part (dropdown), injury type, severity radio (minor / moderate / severe), date occurred (date picker), occurred during radio (training / match / other), notes (optional textarea)
- [ ] Fill all fields → submit → confirm the injury record is created with `reportedByRole: 'player'`
- [ ] Confirm the new injury appears in the list with the **"You reported this"** badge
- [ ] Log in as a **coach** → navigate to the same player's injury view → confirm the player-reported injury appears with a **"Player-reported"** badge
- [ ] Empty state: "No injuries on record. Stay healthy!" when no injuries exist
- [ ] At 375px: confirm the report dialog is usable on mobile

### P5-004 · Coach Feedback

- [ ] As a coach, approve a `coachParentSummary` for a player (set status to `approved`)
- [ ] Log in as that **player** → navigate to Coach Feedback (`/player/feedback`)
- [ ] Confirm the feedback card shows: coach name, date, AI summary text (`publicSummary.text`), sensitivity badge (normal=grey / injury=amber / behavior=blue)
- [ ] Confirm **unacknowledged** items have a subtle highlight or "New" badge
- [ ] Click **acknowledge** on a feedback item → confirm "Acknowledged ✓" state appears, `acknowledgedAt` is set in the DB
- [ ] Confirm **all three sensitivity categories** (normal, injury, behavior) are visible
- [ ] Inspect the page source / network response → confirm the **`privateInsight` field does NOT appear anywhere**
- [ ] Empty state: "Your coaches haven't shared any feedback with you yet. Feedback shared by your coach will appear here."
- [ ] At 375px: confirm cards are readable

### P5-005 · GDPR Data Export

- [ ] Navigate to Player Settings (`/player/settings`) → confirm a **"Your Data"** section is present with explanatory GDPR Article 20 text
- [ ] Click **"Download"** → confirm a format selection dialog opens with "Download JSON" and "Download CSV" buttons
- [ ] Click **"Download JSON"** → confirm a `.json` file downloads without navigating away from the page
- [ ] Open the downloaded JSON → confirm it contains all **9 data domains**:
  - `profile`
  - `emergencyContacts`
  - `passportRatings`
  - `wellnessHistory`
  - `injuries`
  - `coachFeedback`
  - `sharingRecords`
  - `consentRecords`
  - `wellnessCoachAccess`
- [ ] Confirm the JSON has a `metadata` object with `exportedAt`, `playerName`, `organizationName`, `gdprBasis: "Article 20 — Right to Data Portability"`
- [ ] Confirm **`privateInsight` does NOT appear anywhere** in the `coachFeedback` array
- [ ] For a player **without** cycle tracking consent: confirm `cyclePhase` is **absent** from all wellness records
- [ ] For a player **with** cycle tracking consent: confirm `cyclePhase` is present where it was recorded
- [ ] Click **Download** again within 24 hours → confirm rate-limit message: "You already downloaded your data today. You can request another export in [N] hour(s)."
- [ ] Click **"Download CSV"** → confirm a `.csv` file downloads
- [ ] On mobile (iOS Safari or Chrome Android) → confirm the download button works correctly

---

*Generated from PRD acceptance criteria for phases 1–5 of the Adult Player Lifecycle.*
*Last updated: 2026-02-26*
