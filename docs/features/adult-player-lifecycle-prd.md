# PRD: Adult Player Lifecycle & Daily Health Check
**PlayerARC — Proposed Phase**
*Prepared after full codebase analysis — Feb 2026*

---

## Context

PlayerARC currently manages underage (youth) players administered by their parents/guardians. As players approach adulthood, the platform needs to support:

1. **The 18th birthday transition** — controlled handover from guardian to player
2. **Brand new adult players** — imported, invited, or manually added adults with matching to any existing youth records
3. **The Adult Player Portal** — a first-person dashboard mirroring the parent portal in richness
4. **Daily Wellness Check** — a quick emoji-based daily health snapshot for injury prevention and wellbeing tracking, with optional female cycle phase tracking in partnership with Athletics Ireland

---

## What Already Exists (Do NOT Rebuild)

The codebase has significant groundwork already done — Ralph must reuse and extend, never recreate:

| Existing Asset | Location | Status |
|---|---|---|
| `playerGraduations` table + status tracking | `packages/backend/convex/models/playerGraduations.ts` | ✅ Complete |
| `playerClaimTokens` for secure 30-day invite tokens | `packages/backend/convex/models/playerGraduations.ts` | ✅ Complete |
| `transitionToAdult` mutation (youth → adult, converts guardians to emergency contacts) | `packages/backend/convex/models/adultPlayers.ts:206` | ✅ Complete |
| `claimYouthProfile` / `claimPlayerAccount` mutations | `packages/backend/convex/models/adultPlayers.ts:350` | ✅ Complete |
| `registerAdultPlayer` mutation | `packages/backend/convex/models/adultPlayers.ts:147` | ✅ Complete |
| `getPlayerDashboard` query (returns player + enrollment + teams) | `packages/backend/convex/models/adultPlayers.ts:503` | ✅ Complete |
| `hasPlayerDashboard` query | `packages/backend/convex/models/adultPlayers.ts:633` | ✅ Complete |
| Daily cron detecting players turning 18 | `packages/backend/convex/jobs/graduations.ts` | ✅ Complete |
| `getPendingGraduations` / `sendGraduationInvite` / `dismissGraduationPrompt` | `packages/backend/convex/models/playerGraduations.ts` | ✅ Complete |
| **Player portal page** — passport, emergency contacts, benchmarks, goals, skills, positions | `apps/web/src/app/orgs/[orgId]/player/page.tsx` | ✅ Exists — EXTEND only |
| **"player" functional role** — already in role switcher, routes to `/orgs/[orgId]/player` | `apps/web/src/components/org-role-switcher.tsx` | ✅ Complete |
| **Onboarding orchestrator** with `player_graduation` task type already wired | `apps/web/src/components/onboarding/onboarding-orchestrator.tsx` | ✅ Extend only |
| **GDPR consent step** in onboarding (priority 0) | `apps/web/src/components/onboarding/gdpr-consent-step.tsx` | ✅ Extend only |
| **Unified invitation step** — accept invite + child confirmation in one flow | `apps/web/src/components/onboarding/unified-invitation-step.tsx` | ✅ Extend only |
| **Player import flow** — CSV multi-signal matching, team creation, batch processing | `apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx` | ✅ Extend only |
| **Add player manually** — form with duplicate detection, creates playerIdentity + enrollment | `apps/web/src/app/orgs/[orgId]/admin/players/page.tsx` | ✅ Extend only |
| Guardian multi-signal matching algorithm (name, DOB, email, postcode scoring) | `packages/backend/convex/models/playerImport.ts:148` | ✅ Reuse |
| Parent portal structure (layout, sidebar, nav pattern to mirror) | `apps/web/src/app/orgs/[orgId]/parents/` | ✅ Template |
| Notification system with type extensibility | `packages/backend/convex/models/notifications.ts` | ✅ Complete |
| `gender` field on `playerIdentities` (male/female/other) | `packages/backend/convex/models/adultPlayers.ts:9` | ✅ Exists |
| Resend email utility — all email templates + sending infrastructure | `packages/backend/convex/utils/email.ts` | ✅ Extend only |

**Known Gap:** Email sending for graduation invitation is marked `TODO Phase 7` in `playerGraduations.ts:217` — this PRD should complete it by adding to `email.ts`.

**Known Gap:** The existing player page at `/orgs/[orgId]/player/page.tsx` is a single page with no sidebar/navigation. This PRD extends it into a full multi-section portal matching the parent portal structure.

---

## Phase 1: Extend Existing Player Portal to Full Multi-Section Dashboard

### Goal
The player portal at `/orgs/[orgId]/player/page.tsx` already exists with a working single-page dashboard (passport, emergency contacts, benchmarks, goals, skills). This phase extends it into a full multi-section portal with sidebar navigation matching the parent portal structure — without replacing or duplicating what already works.

### User Story US-P-001: Player Portal Layout & Navigation
**As** an adult player
**I want** a sidebar-navigated portal matching the depth of the parent portal
**So that** I can access all my sports management features in one place

**Acceptance Criteria:**
- Add `layout.tsx` to `apps/web/src/app/orgs/[orgId]/player/` — does NOT exist yet (current page has no layout)
- `PlayerSidebar` component built by mirroring `ParentSidebar` (`apps/web/src/components/layout/parent-sidebar.tsx`)
- Existing `player/page.tsx` becomes the Overview tab — no content removed, only framed in the new layout
- `hasPlayerDashboard` query (`adultPlayers.ts:633`) gates the entire portal — redirect to home if no player profile
- Mobile responsive: bottom nav tabs matching parent portal pattern (4 primary tabs)
- Org theming via `useOrgTheme()` consistent with all other portals

**Sidebar Navigation Items (new sub-routes to add):**
| Label | Icon | Route | Status |
|---|---|---|---|
| Overview | Home | `/player/` | Exists — reframe in layout |
| My Profile | User | `/player/profile` | New |
| My Progress | TrendingUp | `/player/progress` | New |
| My Teams | Users | `/player/teams` | New |
| My Injuries | Activity | `/player/injuries` | New |
| Passport Sharing | Share2 | `/player/sharing` | New |
| Daily Wellness | Heart | `/player/health-check` | New (Phase 4) |
| Settings | Settings | `/player/settings` | New |

### User Story US-P-002: Player Overview Dashboard Enhancement
**As** an adult player
**I want** the existing overview to surface a "Daily Wellness" CTA and key summary cards
**So that** my most important actions are immediately visible

**Acceptance Criteria:**
- Existing passport/goals/skills content remains intact
- Add summary card row (top of page): active injuries count, latest assessment rating, today's wellness status
- If wellness not submitted today: show amber "Complete Your Daily Wellness Check" CTA card
- Empty state cards when no data
- Fetches via existing `getPlayerDashboard(organizationId)` query

### User Story US-P-003: Player Profile Self-Edit Sub-Page
**As** an adult player
**I want** a dedicated page to manage my contact details and emergency contacts
**So that** my information stays current without having to ask an admin

**Acceptance Criteria:**
- Route: `apps/web/src/app/orgs/[orgId]/player/profile/page.tsx`
- Uses `updateMyProfile` mutation (already built at `adultPlayers.ts:287`)
- Editable fields: email, phone, address, town, postcode, country
- Read-only (admin-only): name, DOB, gender — shown with a lock icon and "Contact your admin to change"
- Emergency contacts section: view former guardian contacts, add/edit/delete additional contacts
- Mobile-first layout (375px minimum width)

### User Story US-P-001-UAT: Phase 1 Automated Tests
**As** a developer
**I want** Playwright E2E tests covering all Phase 1 stories
**So that** the player portal works correctly end-to-end and regressions are caught automatically

**Acceptance Criteria:**
- Test file: `apps/web/uat/tests/player-portal-phase1.spec.ts`
- Tests cover: portal access gate (no player profile → redirect), sidebar navigation (all links render correct pages), profile edit (update phone, verify saved), emergency contact display, overview summary cards render

**Manual Test Steps for Phase 1:**
1. Log in as a user with "player" functional role → confirm sidebar appears with all listed nav items
2. Log in as a user WITHOUT player role → confirm redirect to org home
3. Navigate to My Profile → edit phone number → save → refresh page → confirm new number persists
4. Verify read-only fields (name, DOB) show lock icon and cannot be edited
5. Navigate to each sidebar section → confirm no 404 errors
6. Resize browser to 375px → confirm mobile bottom nav appears and all items are tappable
7. Confirm org theme colours are applied consistently across all portal pages

---

## Phase 2: Youth-to-Adult Transition Flow (18th Birthday)

### Goal
Complete the end-to-end graduation journey — from guardian notification through to the player claiming their account and onboarding via the existing orchestrator. **The onboarding orchestrator already has a `player_graduation` task type** (`apps/web/src/components/onboarding/onboarding-orchestrator.tsx`) — wire it to real UI components rather than building a parallel flow.

### User Story US-P-004: Guardian Sees Graduation Alert in Parent Dashboard
**As** a parent/guardian
**I want** to see a clear prompt when my child turns 18
**So that** I can initiate the handover of their account

**Acceptance Criteria:**
- `getPendingGraduations()` query drives an alert banner/card in the parent dashboard — follow the `action-items-panel.tsx` pattern already used for pending actions
- Shows: player name, DOB, org name, "They turned 18 on [date]"
- Two actions: **"Send Account Invite"** (opens email dialog) and **"Dismiss"** (calls `dismissGraduationPrompt`)
- Sends in-app notification of type `age_transition_available` (add to `notifications.ts` type list)
- Banner persists until dismissed or claimed

### User Story US-P-005: Guardian Sends Account Invite Email
**As** a parent/guardian
**I want** to send my child a secure email link to claim their account
**So that** they can take control of their sports profile

**Acceptance Criteria:**
- Dialog: confirm player's email address (pre-filled from any existing data, editable)
- On confirm: calls `sendGraduationInvite(playerIdentityId, playerEmail)` (already built)
- **COMPLETES THE TODO at `playerGraduations.ts:217`:** new Convex action calls `sendGraduationInvitationEmail()` added to `packages/backend/convex/utils/email.ts` following the exact Resend pattern already used for org invitations
- Email template: player name, org name, "Claim Your Account" CTA button, token link `/claim-account?token=xxx`, 30-day expiry warning, PlayerARC branding
- Guardian sees confirmation: "Invite sent to [email]. Link valid for 30 days."
- If token expires: guardian can resend — creates new token, previous token automatically invalidated

### User Story US-P-006: Player Claims Their Account & Onboards via Orchestrator
**As** a player turning 18
**I want** to click my invite link, claim my sports profile, and be guided through setup
**So that** I can manage my own development journey

**Acceptance Criteria:**
- Public route `apps/web/src/app/claim-account/page.tsx` accepts `?token=xxx`
- Validates via `getPlayerClaimStatus(token)` — shows player name + org if valid
- If user not logged in: show sign-in/sign-up prompt, then redirect back with token preserved
- If user logged in: show confirmation "Claim [Name]'s profile at [Org]?" before proceeding
- On confirm: calls `claimPlayerAccount(token, userId)` (already built)
- After success: redirect to `/orgs/[orgId]` — the **existing onboarding orchestrator** handles the rest via the `player_graduation` task type
- The `player_graduation` onboarding step must be implemented as a new `player-graduation-step.tsx` component (parallel to `unified-guardian-claim-step.tsx`) — shows welcome message, explains new dashboard, links to player portal
- Error states: token expired ("Request new invite from your guardian"), already used, invalid token

### User Story US-P-007: Admin Manual Graduation Trigger
**As** an admin
**I want** to manually trigger the graduation flow for a player
**So that** I can handle edge cases (guardian not responding, late claims)

**Acceptance Criteria:**
- In the player profile admin view (`/admin/players/[playerId]`), a "Graduation" section appears when player age ≥ 18 AND `playerType = "youth"`
- Shows current graduation status (pending / invitation_sent / claimed / dismissed)
- Admin can: send invitation directly (bypassing guardian — email goes to player email on record), trigger `transitionToAdult` without a token
- Status updates reflected in real-time via Convex reactive query

### User Story US-P-004-UAT: Phase 2 Automated Tests
**As** a developer
**I want** Playwright E2E tests covering all Phase 2 graduation stories
**So that** the transition flow works correctly end-to-end

**Acceptance Criteria:**
- Test file: `apps/web/uat/tests/player-graduation-phase2.spec.ts`
- Tests cover: graduation alert appears in parent dashboard for eligible player, dismiss action works, claim token page validates correctly (valid/expired/used states), post-claim redirect triggers onboarding

**Manual Test Steps for Phase 2:**
1. Create a test player with DOB exactly 18 years ago → run graduation cron manually → confirm `playerGraduations` record created with status "pending"
2. Log in as the player's guardian → confirm graduation alert banner appears in parent dashboard
3. Click "Send Account Invite" → enter email → confirm Resend email is dispatched (check Convex logs)
4. Click the token link from the email → confirm claim page shows player name and org
5. Sign in as the player → complete claim → confirm redirect to onboarding orchestrator → complete `player_graduation` step → confirm landing in player portal
6. Attempt to use the same token again → confirm "already used" error
7. Test expired token: manually set `expiresAt` to past in DB → confirm "expired" message with resend prompt
8. As admin: navigate to a youth player aged 18+ → confirm "Graduation" section visible → trigger transition manually → confirm `playerType` changes to "adult"

---

## Phase 3: Adult Import & Youth Record Matching

### Goal
When an adult is imported (CSV/GAA), invited by email, or added manually, the system checks for a matching youth `playerIdentity` to avoid duplicate records and preserve history. **All three entry points already exist** — this phase extends them with matching logic, not replaces them.

### Background
The existing import matching in `playerImport.ts:148` already scores guardian-to-adult matches. A new backend query `findMatchingYouthProfile` is needed specifically for adult-to-youth-identity matching. The manual add form at `admin/players/page.tsx` already has duplicate detection — extend it. The import flow at `admin/player-import/page.tsx` is the authoritative flow — extend it, not replace it.

### User Story US-P-008: Youth Record Matching on Manual Add
**As** an admin adding an adult player manually
**I want** the system to suggest if this adult matches an existing youth record
**So that** I don't create duplicate profiles and lose their history

**Acceptance Criteria:**
- Extends `apps/web/src/app/orgs/[orgId]/admin/players/page.tsx` — the existing "Add Player" form
- The existing duplicate check (same name + DOB + gender) already catches exact duplicates; this adds a softer "youth record match" check for adults
- When admin submits for a player with age ≥ 18: new query `findMatchingYouthProfile(firstName, lastName, dateOfBirth, email?)` runs in parallel with the existing duplicate check
- Matching algorithm: exact DOB + surname → HIGH confidence; DOB + first name → MEDIUM; surname only → LOW
- HIGH confidence: blocking dialog "A youth profile matching this player exists — [Name], DOB [date]. Link to existing history or create new?"
- MEDIUM: non-blocking amber warning with option to review before proceeding
- "Merge" action: calls `transitionToAdult(existingPlayerIdentityId, userId?)` — does NOT create new `playerIdentity`
- "Create New" action: existing player creation flow unchanged

### User Story US-P-009: Youth Record Matching on CSV Import
**As** an admin running a player import
**I want** adult players in the CSV to be flagged against existing youth records
**So that** imported data enriches existing profiles rather than duplicating them

**Acceptance Criteria:**
- Extends the existing import flow at `apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx` — new column in the review table for adult rows (age ≥ 18): "Youth Record Match" badge (High / Medium / None)
- Uses new `findMatchingYouthProfile` query on each adult row
- Admin sees confidence badge in the import preview table
- Admin choices per matched row: Accept Match (merge on import), Skip Match (create new), Review Later (creates new + adds note)
- Import continues via the existing `batchImportMutation` — no new import pipeline

### User Story US-P-009b: Player Self-Registration with Youth Record Matching
**As** an adult player who has never received an invite
**I want** to register myself and join an organisation
**So that** my existing history is preserved when I'm linked to my youth profile

**Acceptance Criteria:**
- Extends the existing org join request flow — "I'm a player" option added alongside coach/parent in the join request form
- Join request form collects DOB when "player" role selected (used for matching)
- Backend runs `findMatchingYouthProfile` at join request submission
- Admin review screen (existing pending requests UI) flags: "This request may match [Name], DOB [date]. Link or create new?"
- On approval with link: user connected to existing `playerIdentityId`, gains player portal access
- Player receives confirmation email via Resend (new template in `email.ts` following existing pattern)

### User Story US-P-010: Youth Record Matching on Email Invite
**As** an admin inviting an adult player by email
**I want** the system to detect if a youth record exists for this person
**So that** their history is linked when they accept

**Acceptance Criteria:**
- Extends the existing invite dialog — when DOB is entered alongside email, backend checks `findMatchingYouthProfile`
- If match found: informational note inline: "A youth profile may exist for this person. They'll be linked to their history when they accept."
- On invitation acceptance (existing flow via `accept-invitation` page + onboarding orchestrator): after `claimPlayerAccount`, system automatically runs `transitionToAdult` if age ≥ 18

### User Story US-P-008-UAT: Phase 3 Automated Tests
**As** a developer
**I want** Playwright E2E tests for all Phase 3 matching scenarios
**So that** adult import matching is reliable and regression-free

**Acceptance Criteria:**
- Test file: `apps/web/uat/tests/adult-import-matching-phase3.spec.ts`
- Tests cover: manual add with HIGH confidence match shows blocking dialog, manual add with no match proceeds normally, import CSV with adult row shows match badge, self-registration join request with DOB triggers admin match flag

**Manual Test Steps for Phase 3:**
1. Create a youth player (DOB = exactly 18 years ago + 1 day = still youth). Then change DOB to 18 years ago exactly. Try to manually add them as an adult → confirm HIGH confidence match dialog appears
2. In the match dialog: choose "Link to existing" → confirm no new `playerIdentity` created, existing record transitioned to adult
3. In the match dialog: choose "Create New" → confirm new `playerIdentity` created (two records now exist — acceptable)
4. Upload a CSV with an adult row matching an existing youth player by name+DOB → confirm "High" match badge appears in import preview
5. Accept the match during import → verify no duplicate record, existing enrollment updated
6. Submit a self-registration join request as a player with DOB that matches a youth record → log in as admin → confirm match flag visible in pending requests panel
7. Test invite flow: invite a player by email + DOB matching a youth record → confirm informational note appears in invite dialog

---

## Phase 4: Daily Player Wellness Check

### Goal
Give players a quick, emoji-driven daily health snapshot covering 5 wellness dimensions. Support optional menstrual cycle phase tracking for female players (Athletics Ireland requirement). Data feeds coach and admin dashboards.

### New Schema: `dailyPlayerHealthChecks`

```typescript
dailyPlayerHealthChecks: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  checkDate: v.string(),          // "YYYY-MM-DD" — one per player per day

  // Core 5 wellness dimensions (1–5 scale)
  physicalFeeling: v.number(),    // Q1: How does your body feel?
  energyLevel: v.number(),        // Q2: How is your energy/sleep?
  mentalWellbeing: v.number(),    // Q3: How are you feeling mentally?
  muscleRecovery: v.number(),     // Q4: How are your muscles/soreness?
  motivation: v.number(),         // Q5: How motivated are you for training?

  // Optional: female cycle phase tracking
  cyclePhase: v.optional(v.union(
    v.literal("menstruation"),          // Days 1–5: higher injury risk, fatigue
    v.literal("early_follicular"),      // Days 6–9: recovery, rebuilding
    v.literal("ovulation"),             // Days 10–14: peak performance window
    v.literal("early_luteal"),          // Days 15–21: strength window
    v.literal("late_luteal"),           // Days 22–28: pre-menstrual, higher risk
  )),

  // Optional free text note
  notes: v.optional(v.string()),

  submittedAt: v.number(),
  updatedAt: v.number(),
})
.index("by_player_and_date", ["playerIdentityId", "checkDate"])
.index("by_org_and_date", ["organizationId", "checkDate"])
.index("by_player", ["playerIdentityId"])
```

### Wellness Rating Scale (5 levels, same pattern as skill assessments)

| Value | Emoji | Label | Colour |
|---|---|---|---|
| 1 | 😢 | Very Poor | Red (#ef4444) |
| 2 | 😕 | Poor | Orange (#f97316) |
| 3 | 😐 | Neutral | Yellow (#eab308) |
| 4 | 🙂 | Good | Light green (#86efac) |
| 5 | 😁 | Great | Green (#22c55e) |

### Cycle Phase Definitions (for medical accuracy, per Athletics Ireland guidance)

| Phase | Days (approx.) | Injury Risk | Performance |
|---|---|---|---|
| Menstruation | 1–5 | Higher (lax ligaments) | Lower |
| Early Follicular | 6–9 | Moderate | Recovering |
| Ovulation | 10–14 | Higher (ACL risk peak) | Peak |
| Early Luteal | 15–21 | Lower | Good strength |
| Late Luteal | 22–28 | Higher (pre-menstrual) | Variable |

> **Privacy Note:** Cycle phase data is visible ONLY to the player and org medical/admin staff with explicit medical access. Coaches do NOT see cycle phase data — they see only an aggregate wellness score.

### Visibility Rules Summary

| Viewer | Can See | Can See Cycle Phase |
|---|---|---|
| Player (self) | All own data | Yes |
| Parent | Child's data while child < 18 | No |
| Coach | Individual + aggregate for assigned players | No |
| Admin/Medical | All org data | Yes (medical access only) |

### User Story US-P-011: Daily Wellness Check Submission (Player)
**As** an adult player
**I want** to quickly rate my wellness each day using emojis
**So that** my coaches and club have visibility into my readiness and wellbeing

**Acceptance Criteria:**
- Route: `/orgs/[orgId]/player/health-check`
- Mobile-first full-screen card UI — one question per screen OR all 5 on one scrollable screen (TBD with UX review, suggest all-at-once for speed)
- Each question shows 5 large emoji buttons (tappable, minimum 44×44px touch target)
- Selected answer highlights in the question's accent colour
- Female-specific section: appears at bottom with "Optional — You don't have to answer this" label, only shown if `player.gender === "female"`
- Cycle phase shows as 5 horizontal pills with phase name + day range
- Submit button enabled when all 5 core questions answered (cycle phase always optional)
- On submit: calls `submitDailyHealthCheck` mutation
- If already submitted today: shows current answers, allows editing (calls `updateDailyHealthCheck`)
- Success toast: "Wellness check submitted ✓"
- Small streak indicator: "You've checked in X days in a row 🔥" (gamification hook)

### User Story US-P-012: Under-18 Player Health Check
**As** a youth player (under 18 with a claimed account, or logged in via their own email)
**I want** to submit my daily wellness check
**So that** my parents and coaches can monitor my wellbeing

**Acceptance Criteria:**
- Health check accessible from the player's own profile (not from parent portal)
- Parent can VIEW (read-only) their child's wellness history in the parent portal under a new "Wellness" tab — but cannot submit on the child's behalf
- Parent access is automatically revoked when player turns 18
- Parent must explicitly enable under-18 player access (toggle in parent portal settings for that child)

### User Story US-P-013: Coach Wellness Dashboard
**As** a coach
**I want** to see my players' daily wellness scores
**So that** I can adapt training and identify players who need support

**Acceptance Criteria:**
- New section in coach Team Hub: "Team Wellness" widget (extends existing `health-safety-widget.tsx` pattern)
- Shows today's check-in completion rate: "8/14 players checked in today"
- Player list with average wellness score as colour-coded badge (red/orange/yellow/green)
- Players with score ≤ 2 on any dimension highlighted with alert icon
- Drill-down: tap player to see their individual 5-dimension breakdown
- Trend chart: 7-day rolling wellness average per player
- **Cycle phase is NOT shown to coaches** — aggregate wellness score only

### User Story US-P-013b: GDPR Consent Flow for Cycle Tracking
**As** a female player
**I want** to be clearly informed about what menstrual cycle data is collected and give explicit consent
**So that** my sensitive health data is handled in accordance with GDPR

**Acceptance Criteria:**
- First time cycle phase section is displayed, a modal intercepts before showing the input
- Modal explains in plain language: data collected, why, who sees it (player + medical admin only), retention period (up to 18 months)
- Single explicit checkbox: "I consent to PlayerARC storing my menstrual cycle phase data for sports performance analysis. I can withdraw this consent at any time."
- Consent is NOT pre-ticked; cannot submit the form without consenting or skipping
- If player clicks "Skip / No Thanks": cycle phase section is permanently hidden (can re-enable in settings)
- New `playerHealthConsents` table records: `playerIdentityId`, `consentType: "cycle_tracking"`, `givenAt`, `withdrawnAt?`
- Settings page: "Menstrual Cycle Tracking" toggle — toggling off triggers withdrawal mutation that deletes all past cycle phase data
- Privacy policy link included in consent modal

### User Story US-P-013c: Wellness Reminder Configuration (Admin)
**As** an org admin
**I want** to configure wellness check reminders for my organisation
**So that** players are prompted to check in at the right time

**Acceptance Criteria:**
- New section in org admin settings: "Wellness Reminders"
- Toggle to enable/disable reminders organisation-wide
- When enabled: frequency options (daily, match-day only, training-day only)
- Reminder type: in-app notification, email, or both
- Reminder sends only to players who haven't submitted that day (checked via `by_player_and_date` index)
- Low-score notifications for admins/medical staff configurable separately (threshold and recipient list)
- No automated alerts sent to coaches for low scores — coaches view voluntarily

### User Story US-P-014: Admin Wellness & Injury Correlation View
**As** an org admin or medical staff member
**I want** to see wellness data alongside injury records
**So that** I can identify patterns and reduce injury risk

**Acceptance Criteria:**
- New tab in admin analytics: "Player Wellness"
- Team-level: average daily wellness scores trending over time
- Correlation view: players with consecutive low wellness scores + any injuries reported in that period
- Cycle phase analysis (medical staff access only): aggregate heatmap of injury occurrences by cycle phase across female players
- Export: CSV export of wellness data with date range filter

### User Story US-P-011-UAT: Phase 4 Automated Tests
**As** a developer
**I want** Playwright E2E tests for the daily wellness check feature
**So that** submission, editing, visibility rules, and GDPR consent all work correctly

**Acceptance Criteria:**
- Test file: `apps/web/uat/tests/daily-wellness-phase4.spec.ts`
- Tests cover: wellness check submission (all 5 questions answered), same-day edit, submission blocked if < 5 questions answered, GDPR consent modal appears on first cycle phase attempt, cycle phase section hidden if consent not given, coach wellness dashboard shows today's submissions, admin wellness analytics loads

**Manual Test Steps for Phase 4:**
1. Log in as an adult female player → navigate to Daily Wellness → confirm 5 wellness questions display with emoji buttons
2. Tap each emoji for each question → confirm selected emoji highlights in colour
3. Submit with all 5 answered → confirm success toast and submission recorded
4. Return to wellness page same day → confirm current answers shown, editable
5. Edit one answer → save → confirm update persisted
6. Attempt to submit with only 4 questions answered → confirm submit button disabled
7. Scroll to bottom of form (female player) → confirm cycle phase section shows with "Optional" label
8. First tap on any cycle phase option → confirm GDPR consent modal appears with plain-language explanation and opt-in checkbox (NOT pre-ticked)
9. Accept consent → select a cycle phase → submit → confirm cycle phase saved
10. Go to Settings → find "Menstrual Cycle Tracking" toggle → toggle off → confirm consent withdrawn, past cycle data deleted
11. Log in as a male player → confirm cycle phase section does NOT appear
12. Log in as a coach → navigate to Team Wellness widget → confirm today's check-in rate shown and players listed with wellness badges
13. Confirm coaches do NOT see cycle phase data for any player
14. Log in as org admin → navigate to wellness analytics → confirm org-wide wellness trends chart visible
15. Test under-18 player (parent has enabled access): submit wellness check → log in as parent → confirm wellness visible read-only in parent portal
16. Disable wellness reminders in admin settings → confirm no reminder notifications sent; enable with daily frequency → confirm in-app notification sent

---

## Phase 5: Full Player Portal — Remaining Sections

### Goal
Complete the remaining portal sub-pages: progress, passport sharing, and injuries — all leveraging existing backend queries and UI patterns.

### User Story US-P-015: My Progress (Player View of Own Passports)
**As** an adult player
**I want** to see my sport passport ratings and assessment history
**So that** I can track my own development

**Acceptance Criteria:**
- Route: `/orgs/[orgId]/player/progress`
- Fetches own passports via `getPassportsForPlayer(playerIdentityId)`
- Shows all sports with tab/pill switcher
- Read-only view of skill ratings (technical, tactical, physical, mental) with trend arrows
- Assessment history timeline
- Cannot edit their own ratings (coach-controlled)
- Can add own notes (via player notes section of passport)

### User Story US-P-016: My Passport Sharing Management (Player Controls Own Sharing)
**As** an adult player
**I want** to control who can see my sports passport
**So that** I can share my data with other clubs when I choose

**Acceptance Criteria:**
- Route: `/orgs/[orgId]/player/sharing`
- On transition to adult: player inherits or takes over passport sharing controls from guardian
- Mirrors existing parent sharing UI at `apps/web/src/app/orgs/[orgId]/parents/sharing/page.tsx`
- Player can: enable/disable sharing, approve/deny enquiries from other orgs
- Guardian sharing access revoked for this player once account is claimed

### User Story US-P-017: My Injuries (Player View)
**As** an adult player
**I want** to view and self-report my own injuries
**So that** I can track my recovery and keep my club informed

**Acceptance Criteria:**
- Route: `/orgs/[orgId]/player/injuries`
- Shows own injury history (read only for historic coach-reported injuries)
- Player can report a new injury (creates injury with `reportedByRole: "player"`)
- Shows current active injury status and recovery milestones
- Links to full injury detail

### User Story US-P-015-UAT: Phase 5 Automated Tests
**As** a developer
**I want** Playwright E2E tests for the full player portal sections
**So that** progress, sharing, and injury features work end-to-end

**Acceptance Criteria:**
- Test file: `apps/web/uat/tests/player-portal-phase5.spec.ts`
- Tests cover: My Progress shows sport passport ratings, My Passport Sharing toggle works, My Injuries displays active injuries and allows new self-report

**Manual Test Steps for Phase 5:**
1. Log in as adult player with an existing sport passport → navigate to My Progress → confirm ratings visible with sport tabs
2. Confirm player cannot edit their own skill ratings (fields are read-only)
3. Confirm player CAN add a personal note to their passport notes section
4. Navigate to My Passport Sharing → toggle sharing on for the org → confirm sharing enabled in DB
5. Navigate to My Injuries → confirm existing injuries shown
6. Click "Report New Injury" → fill in body part, severity, date → submit → confirm injury created with `reportedByRole: "player"`
7. Confirm new injury appears in the list with "Player-reported" badge
8. Log in as a coach → confirm the player-reported injury appears in their injury view for that player

---

## Data Architecture Summary

### New Tables
- `dailyPlayerHealthChecks` (Phase 4)
- `playerHealthConsents` (Phase 4 — GDPR cycle tracking consent)

### New Backend Functions Needed
- `submitDailyHealthCheck` mutation
- `updateDailyHealthCheck` mutation
- `getMyHealthChecks(startDate, endDate)` query (player view)
- `getTeamWellnessSummary(teamId, date)` query (coach view)
- `getOrgWellnessAnalytics(organizationId, startDate, endDate)` query (admin)
- `findMatchingYouthProfile(firstName, lastName, dateOfBirth, email?)` query (Phase 3)
- `grantCycleTrackingConsent` / `withdrawCycleTrackingConsent` mutations
- `purgeExpiredCycleData` scheduled cron job (deletes cycle phase data older than 18 months)
- Action for sending graduation invitation email — add `sendGraduationInvitationEmail()` to `packages/backend/convex/utils/email.ts` using Resend, matching existing pattern

### Extended/New Frontend Routes
- `apps/web/src/app/orgs/[orgId]/player/layout.tsx` — NEW: adds sidebar to existing single-page portal (Phase 1)
- `apps/web/src/app/orgs/[orgId]/player/profile/page.tsx` — NEW sub-page (Phase 1)
- `apps/web/src/app/orgs/[orgId]/player/progress/page.tsx` — NEW sub-page (Phase 5)
- `apps/web/src/app/orgs/[orgId]/player/injuries/page.tsx` — NEW sub-page (Phase 5)
- `apps/web/src/app/orgs/[orgId]/player/sharing/page.tsx` — NEW sub-page (Phase 5)
- `apps/web/src/app/orgs/[orgId]/player/health-check/page.tsx` — NEW sub-page (Phase 4)
- `apps/web/src/app/claim-account/page.tsx` — NEW: public token claim page (Phase 2)
- `apps/web/src/components/onboarding/player-graduation-step.tsx` — NEW: wires `player_graduation` task in orchestrator (Phase 2)
- **Existing `apps/web/src/app/orgs/[orgId]/player/page.tsx`** — EXTEND only, becomes Overview tab
- **Existing `apps/web/src/app/orgs/[orgId]/admin/players/page.tsx`** — EXTEND only: add youth matching (Phase 3)
- **Existing `apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx`** — EXTEND only: add match badges (Phase 3)

### Notification Types to Add
- `age_transition_available` — notifies guardian child has turned 18
- `age_transition_claimed` — notifies admin player has claimed their account
- `wellness_alert` — notifies coach when player scores ≤ 2 on any dimension

---

## Resolved Questions & Design Decisions

### 1. Email Provider — Resend (already live)
The system uses **Resend** via `packages/backend/convex/utils/email.ts`. The graduation invitation email just needs a new `sendGraduationInvitationEmail()` function in that file following the exact same template pattern (`RESEND_API_KEY`, from `team@notifications.playerarc.io`). No new infrastructure needed.

### 2. Player Self-Registration (without guardian invite)
Adult players can register independently — same join request loop used by coaches and parents today. The join request flow must be extended to:
- Accept DOB during the request form (used for matching)
- Run youth-to-adult matching against existing `playerIdentities` records
- If match found: admin sees "This request may match [Name], DOB [date]. Link or create new?"
- On approval: admin confirms merge, linking the user to the existing `playerIdentityId`
- Notifies player their account is now linked to their existing history

### 3. Under-18 with Their Own Account
A parent can grant their under-18 child access to their own player account (explicit parent permission flow required). This is **not** restricted to 18+. Rules:
- Under-18 player portal: same 5-section layout, but with a "Youth Account" badge
- Parent must explicitly enable this (toggle in parent portal settings for that child)
- Player can submit wellness check once parent has enabled access
- Parent can VIEW wellness submissions (read-only) but receives **no score-based alerts**
- Parent access to all data revoked automatically when player turns 18 and claims adult account

### 4. Wellness Check Timing & Reminders
Reminders are **admin-configurable per organisation**:
- Admin org settings: toggle to enable/disable wellness reminders
- When enabled: admin can set frequency (daily, match-day only, training-day only) and reminder type (in-app notification, email, both)
- No alerts sent to coaches for low scores; coaches view data voluntarily on their dashboard
- Low-score notifications for admins/medical staff remain configurable separately

### 5. GDPR — Menstrual Cycle Data (Special Category Health Data)

**GDPR Classification:** Menstrual cycle data is classified as **Special Category data under GDPR Article 9** (health data). This requires stricter handling than standard personal data.

**Legal Basis Required:**
- Explicit, separate, granular consent is required — cannot be bundled into general T&Cs
- Consent must be: freely given, specific, informed, and unambiguous
- Player must be able to withdraw consent at any time without detriment

**Implementation Requirements:**
- First-time consent screen required before cycle phase input is ever shown — separate from wellness check consent
- Plain-language explanation of: what is collected, why, who sees it, how long it's kept
- "I consent to storing my menstrual cycle phase data for sports performance analysis" checkbox (opt-in, not pre-ticked)
- Separate opt-out setting in player account settings — withdrawal deletes all historic cycle data
- Cycle phase data must be **access-controlled**: visible only to player + org medical/admin with explicit medical role (NOT coaches)

**Data Retention Policy (recommended, based on Irish DPC guidance):**
- **Active athletes**: Retain for duration of active org membership + 12 months
- **Inactive/left org**: Delete or anonymise cycle phase data within 6 months of inactivity
- **Automatic purge**: Scheduled Convex cron job to delete cycle data older than 18 months
- **Player-initiated deletion**: Available at any time from account settings (GDPR Article 17 right to erasure)
- No fixed period mandated by GDPR — the 18-month maximum is a proportionate recommendation for this purpose

**Privacy Policy Addition:**
PlayerARC's privacy policy must be updated to include a new "Sensitive Health Data" section covering: collection scope, legal basis (explicit consent), access controls, retention schedule, withdrawal rights, and the fact this data is never shared with third parties.

**New Schema Additions Needed:**
- `playerHealthConsents` table: `playerIdentityId`, `consentType: "cycle_tracking"`, `givenAt`, `withdrawnAt?`

### 6. Athletics Ireland Reporting
No specific export format required. Standard wellness data collection is sufficient. The cycle phase injury correlation analysis (admin-level aggregate view) meets their informational needs without a formal integration.

---

## Story Count

| Phase | Feature Stories | UAT Story | Total |
|---|---|---|---|
| Phase 1: Player Portal Extension | 3 | 1 | 4 |
| Phase 2: Youth-to-Adult Transition | 4 | 1 | 5 |
| Phase 3: Adult Import & Self-Registration Matching | 4 | 1 | 5 |
| Phase 4: Daily Wellness Check (incl. GDPR consent) | 6 | 1 | 7 |
| Phase 5: Full Player Portal Sections | 3 | 1 | 4 |
| **Total** | **20** | **5** | **25** |

Each UAT story includes both:
- Automated Playwright E2E test suite (`apps/web/uat/tests/`)
- Documented manual test steps for human verification before phase sign-off

---

## Files Ralph Must Read Before Starting

- `packages/backend/convex/models/adultPlayers.ts` — existing adult player mutations/queries
- `packages/backend/convex/models/playerGraduations.ts` — graduation flow
- `packages/backend/convex/models/playerImport.ts:148` — matching algorithm to reuse
- `packages/backend/convex/models/notifications.ts` — notification type pattern
- `apps/web/src/app/orgs/[orgId]/player/page.tsx` — existing player portal to extend
- `apps/web/src/app/orgs/[orgId]/parents/layout.tsx` — portal layout to mirror
- `apps/web/src/app/orgs/[orgId]/parents/components/` — component patterns to mirror
- `apps/web/src/components/onboarding/onboarding-orchestrator.tsx` — orchestrator with player_graduation task
- `packages/backend/convex/schema.ts` — full schema for new table definition
- `packages/backend/convex/utils/email.ts` — Resend email utility to extend
