# PRD: Adult Player Lifecycle & Daily Health Check
**PlayerARC — Proposed Phase**
*Prepared after full codebase analysis — Feb 2026*
*Updated after comprehensive issue review — Feb 2026 (Issues #26, #255, #256, #453)*

---

## Context

PlayerARC currently manages underage (youth) players administered by their parents/guardians. As players approach adulthood, the platform needs to support:

1. **The 18th birthday transition** — controlled handover from guardian to player
2. **Brand new adult players** — imported, invited, or manually added adults with matching to any existing youth records
3. **The Adult Player Portal** — a first-person dashboard mirroring the parent portal in richness, including access to coach-shared feedback and AI summaries
4. **Daily Wellness Check** — a configurable emoji-based daily health snapshot across 8 dimensions for injury prevention and wellbeing tracking, with optional female cycle phase tracking in partnership with Athletics Ireland
5. **Multi-Role UX** — seamless experience for adults who hold multiple roles simultaneously (player + coach, player + parent, player + admin)
6. **Child Player Passport Authorization** — a comprehensive system allowing parents to grant under-18 players access to view (and interact with) their own development data

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
| **`coachParentSummaries` table** — `privateInsight` (coach-only) + `publicSummary` (AI-generated, shareable) with approval/delivery workflow | `packages/backend/convex/models/coachParentSummaries.ts` | ✅ Reuse for adult player visibility |
| **`activeFunctionalRole` / `primaryFunctionalRole`** fields on member record — role switcher infrastructure | `apps/web/src/components/org-role-switcher.tsx` | ✅ Extend only |

**Known Gap:** Email sending for graduation invitation is marked `TODO Phase 7` in `playerGraduations.ts:217` — this PRD should complete it by adding to `email.ts`.

**Known Gap:** The existing player page at `/orgs/[orgId]/player/page.tsx` is a single page with no sidebar/navigation. This PRD extends it into a full multi-section portal matching the parent portal structure.

**Important — Voice Notes Sharing Model:** The `coachParentSummaries` table already separates `privateInsight` (raw coach observation, coach-only) from `publicSummary` (AI-generated version shared with families, after coach approval). Adult players should have access to `publicSummary` records at status `approved`, `auto_approved`, `delivered`, or `viewed` — the same records parents currently see. The `privateInsight` is never exposed to players or parents.

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
| Coach Feedback | MessageSquare | `/player/feedback` | New (Phase 5) |
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
Give players a quick, emoji-driven daily health snapshot across 8 configurable wellness dimensions. Players own their data and choose which dimensions to track. Coaches can request access to see trend data (aggregate score only) with explicit player consent. Support optional menstrual cycle phase tracking for female players (Athletics Ireland requirement). Data feeds coach and admin dashboards. Submission works offline and syncs when the player's connection is restored.

### New Schema: `dailyPlayerHealthChecks`

```typescript
dailyPlayerHealthChecks: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  checkDate: v.string(),          // "YYYY-MM-DD" — one per player per day

  // 8 wellness dimensions (all optional — only stored if that dimension was enabled)
  // Each stored on a 1–5 scale
  sleepQuality: v.optional(v.number()),     // Q1: How did you sleep?
  energyLevel: v.optional(v.number()),      // Q2: How is your energy?
  foodIntake: v.optional(v.number()),       // Q3: How was your food intake?
  waterIntake: v.optional(v.number()),      // Q4: How was your hydration?
  mood: v.optional(v.number()),             // Q5: How is your mood?
  motivation: v.optional(v.number()),       // Q6: How motivated are you for training?
  physicalFeeling: v.optional(v.number()),  // Q7: How does your body feel physically?
  muscleRecovery: v.optional(v.number()),   // Q8: How are your muscles/soreness?

  // Which dimensions were enabled at time of submission (drives chart display)
  enabledDimensions: v.array(v.string()),   // e.g. ["sleepQuality","energyLevel","mood"]

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

  // Offline sync tracking
  submittedOffline: v.optional(v.boolean()),  // True if originally stored locally
  deviceSubmittedAt: v.optional(v.number()),  // Device timestamp when locally stored
})
.index("by_player_and_date", ["playerIdentityId", "checkDate"])
.index("by_org_and_date", ["organizationId", "checkDate"])
.index("by_player", ["playerIdentityId"])
```

### New Schema: `playerWellnessSettings`

```typescript
playerWellnessSettings: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  // Which of the 8 dimensions the player has enabled (all enabled by default)
  enabledDimensions: v.array(v.string()),
  updatedAt: v.number(),
})
.index("by_player", ["playerIdentityId"])
```

### New Schema: `wellnessCoachAccess`

```typescript
wellnessCoachAccess: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),
  coachUserId: v.string(),
  coachName: v.string(),          // Denormalised for display without extra query
  requestedAt: v.number(),
  status: v.union(
    v.literal("pending"),         // Coach has requested, player has not responded
    v.literal("approved"),        // Player approved this coach
    v.literal("denied"),          // Player denied this coach's request
    v.literal("revoked"),         // Player previously approved, then revoked
  ),
  approvedAt: v.optional(v.number()),
  revokedAt: v.optional(v.number()),
})
.index("by_player", ["playerIdentityId"])
.index("by_coach_and_player", ["coachUserId", "playerIdentityId"])
.index("by_org_and_coach", ["organizationId", "coachUserId"])
```

### Wellness Rating Scale (5 levels, same pattern as skill assessments)

| Value | Emoji | Label | Colour |
|---|---|---|---|
| 1 | 😢 | Very Poor | Red (#ef4444) |
| 2 | 😕 | Poor | Orange (#f97316) |
| 3 | 😐 | Neutral | Yellow (#eab308) |
| 4 | 🙂 | Good | Light green (#86efac) |
| 5 | 😁 | Great | Green (#22c55e) |

### Aggregate Wellness Score Calculation
When displaying a single score (for coaches or overview cards): average all submitted enabled dimensions for that check-in, rounded to one decimal place. Example: if 6 of 8 dimensions are enabled and submitted, score = sum of 6 values / 6.

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
| Player (self) | All own data, all enabled dimensions | Yes |
| Parent | Child's aggregate wellness data (read-only) while child < 18 | No |
| Coach | Aggregate wellness score + trend ONLY if player has approved access | No |
| Admin/Medical | All org data | Yes (medical access only) |

### User Story US-P-011: Daily Wellness Check Submission (Player)
**As** an adult player
**I want** to quickly rate my wellness each day across my chosen dimensions using emojis
**So that** I can track my own health and optionally share readiness data with coaches

**Acceptance Criteria:**
- Route: `/orgs/[orgId]/player/health-check`
- On first load: fetch `playerWellnessSettings` to determine enabled dimensions — default is all 8 enabled
- Show only enabled dimensions on the check-in form
- Each question shows 5 large emoji buttons (tappable, minimum 44×44px touch target)
- Selected answer highlights in the question's accent colour
- Dimension order (when all enabled): Sleep Quality, Energy, Food Intake, Water Intake, Mood, Motivation, Physical Feeling, Muscle Recovery
- Female-specific section: appears at bottom with "Optional — You don't have to answer this" label, only shown if `player.gender === "female"`
- Cycle phase shows as 5 horizontal pills with phase name + day range
- Submit button enabled when all currently-enabled dimensions have been answered (cycle phase always optional)
- On submit: calls `submitDailyHealthCheck` mutation
- **Offline support:** if device is offline, check-in data is stored in browser local storage (IndexedDB) with device timestamp. When connection is restored, data is synced automatically. Player sees "Saved offline — will sync when you're back online" indicator. Submission marked `submittedOffline: true` in DB after sync.
- If already submitted today: shows current answers, allows editing (calls `updateDailyHealthCheck`)
- Success toast: "Wellness check submitted ✓"
- Small streak indicator: "You've checked in X days in a row 🔥"

### User Story US-P-011b: Wellness Dimension Settings (Player)
**As** an adult player
**I want** to choose which wellness dimensions I track
**So that** the check-in stays relevant and quick for my situation

**Acceptance Criteria:**
- Route: `/orgs/[orgId]/player/settings` — new "Wellness Dimensions" section within the player settings page
- Shows all 8 dimensions as a list with toggle switches (on/off)
- All 8 are ON by default (first-time load uses defaults if no `playerWellnessSettings` record exists)
- Minimum 1 dimension must remain enabled (cannot disable all)
- Toggle changes save immediately via `updateWellnessSettings` mutation — no save button required
- Helper text per dimension explains what it tracks (e.g. "Sleep Quality — how rested you feel")
- When a dimension is disabled, it disappears from the check-in form and its data is excluded from trend charts
- Existing historical data for a disabled dimension is retained — re-enabling it will restore historical trends
- Note clearly displayed: "Disabling a dimension hides it from coaches who have access to your wellness data"

### User Story US-P-011c: Player Wellness Trend Charts
**As** an adult player
**I want** to see trends in my wellness data over time
**So that** I can understand my own patterns and manage my training load

**Acceptance Criteria:**
- Trend charts are displayed on the `/orgs/[orgId]/player/health-check` page, below the daily submission form
- One chart per enabled dimension showing the last 7 days of data
- Overall aggregate wellness score trend chart shown first (average of all enabled dimensions per day)
- Days with no submission shown as a gap in the line
- Charts use the same colour coding as the emoji scale (1=red, 5=green)
- Data is the player's own — no coach or admin interaction required to view
- Coach access to this data is controlled separately via the consent model (US-P-013d)

### User Story US-P-012: Under-18 Player Health Check
**As** a youth player (under 18) whose parent has granted them platform access
**I want** to submit my daily wellness check
**So that** my parents and coaches can monitor my wellbeing

**Acceptance Criteria:**
- Health check accessible from the player's own profile (not from parent portal)
- Uses the same 8-dimension UI as the adult check-in; all wellness settings rules apply equally
- Parent can VIEW (read-only) their child's wellness history in the parent portal under a new "Wellness" tab — but cannot submit on the child's behalf
- Parent access to wellness data is controlled by the `parentChildAuthorizations` table (see Phase 7) via the `includeWellnessAccess` flag
- Cycle phase section is NOT shown for under-18 players regardless of gender
- Parent access to wellness data is automatically revoked when player turns 18 and claims their adult account

### User Story US-P-013: Coach Wellness Dashboard
**As** a coach
**I want** to see wellness data for players who have shared it with me
**So that** I can adapt training and identify players who need support

**Acceptance Criteria:**
- New section in coach Team Hub: "Team Wellness" widget (extends existing `health-safety-widget.tsx` pattern)
- Shows only players who have approved this coach's access request (via US-P-013d)
- For each approved player: displays their **overall aggregate wellness score** (average of all enabled dimensions) as a colour-coded badge — not individual dimension values
- Shows today's check-in completion rate among approved players: "8/14 players checked in today"
- Players with aggregate score ≤ 2 highlighted with an alert icon
- Trend chart: 7-day rolling aggregate wellness score per player (aggregate only — individual dimensions not shown to coaches)
- Players who have not granted access: shown with "Access not granted" in place of a score — with a "Request Access" button
- **Cycle phase is NOT shown to coaches under any circumstances** — aggregate wellness score only

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

### User Story US-P-013d: Coach Wellness Access Request & Player Consent
**As** a coach
**I want** to request access to a player's wellness trend data
**So that** I can support their training with health context if they choose to share it

**As** a player
**I want** to control exactly which coaches can see my wellness data
**So that** my health information is only shared with people I choose

**Acceptance Criteria:**

**Coach side:**
- "Request Access" button appears on the Team Wellness widget next to any player who has not granted access
- On click: sends in-app notification to the player and creates a `wellnessCoachAccess` record with status `pending`
- Coach sees "Request sent — awaiting player approval" state after clicking
- If previously denied or revoked: coach can send a new request (one active request per coach-player pair at a time)

**Player side:**
- Player receives in-app notification: "[Coach name] has requested access to your wellness trends"
- Notification links to the "Wellness Access" section of `/orgs/[orgId]/player/settings`
- Player can: Approve or Deny the pending request
- Approved coaches can see the player's aggregate wellness score + 7-day trend (no individual dimensions)
- Settings page "Wellness Access" section shows a list of all coaches with current access status (Pending / Approved / Denied)
- Player can revoke an approved coach at any time — coach's access is removed immediately
- No minimum approval period — revocation is instant

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
**So that** submission, editing, visibility rules, coach access consent, and GDPR consent all work correctly

**Acceptance Criteria:**
- Test file: `apps/web/uat/tests/daily-wellness-phase4.spec.ts`
- Tests cover: wellness check submission (all enabled dimensions answered), same-day edit, offline submission stores locally and syncs, dimension settings toggle removes dimension from form, GDPR consent modal appears on first cycle phase attempt, cycle phase section hidden if consent not given, coach wellness dashboard shows aggregate scores only, coach request/approve/revoke flow, admin wellness analytics loads

**Manual Test Steps for Phase 4:**
1. Log in as an adult female player → navigate to Daily Wellness → confirm all 8 dimensions display with emoji buttons
2. Go to Settings → Wellness Dimensions → toggle off "Food Intake" → return to check-in → confirm Food Intake question is gone
3. Tap each emoji for each remaining question → confirm selected emoji highlights in colour
4. Submit with all enabled questions answered → confirm success toast and submission recorded
5. Return to wellness page same day → confirm current answers shown, editable
6. Edit one answer → save → confirm update persisted
7. Attempt to submit with one enabled question unanswered → confirm submit button disabled
8. Turn off device network → fill in all dimensions → submit → confirm "Saved offline" indicator → restore network → confirm data synced to DB
9. Scroll to bottom of form (female player) → confirm cycle phase section shows with "Optional" label
10. First tap on any cycle phase option → confirm GDPR consent modal appears with opt-in checkbox (NOT pre-ticked)
11. Accept consent → select a cycle phase → submit → confirm cycle phase saved
12. Go to Settings → find "Menstrual Cycle Tracking" toggle → toggle off → confirm consent withdrawn, past cycle data deleted
13. Log in as a male player → confirm cycle phase section does NOT appear
14. As a coach: navigate to Team Wellness widget → find a player → click "Request Access" → confirm notification sent
15. Log in as that player → approve the coach request → log back in as coach → confirm player's aggregate score and trend now visible, no individual dimensions shown
16. As player: revoke coach access → log in as coach → confirm player returns to "Access not granted" state
17. Log in as org admin → navigate to wellness analytics → confirm org-wide wellness trends chart visible
18. Test under-18 player (parent has granted wellness access via `includeWellnessAccess`): submit wellness check → log in as parent → confirm wellness visible read-only in parent portal; confirm cycle phase NOT shown

---

## Phase 5: Full Player Portal — Remaining Sections

### Goal
Complete the remaining portal sub-pages: progress, coach feedback, passport sharing, and injuries — all leveraging existing backend queries and UI patterns.

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

### User Story US-P-018: My Coach Feedback & AI Summaries (Player View)
**As** an adult player
**I want** to see the feedback and AI summaries my coaches have chosen to share with me
**So that** I can understand my development from my coach's perspective

**Background:** The `coachParentSummaries` table stores two distinct objects per coach observation: `privateInsight` (the coach's raw note — coach-only, never shared) and `publicSummary` (an AI-generated version the coach has approved for sharing with families). Adult players see the same `publicSummary` records that parents currently receive. All sensitivity categories (normal, injury, behavior) are visible since it is the player's own data.

**Acceptance Criteria:**
- Route: `/orgs/[orgId]/player/feedback`
- Fetches `coachParentSummaries` records for this player where `status` is one of: `approved`, `auto_approved`, `delivered`, `viewed`
- Displays as a chronological feed (newest first): coach name, date, AI summary text, sensitivity badge (normal / injury / concern)
- Player can acknowledge a summary (calls existing acknowledge mutation, updates `acknowledgedAt`)
- The raw `privateInsight` is NEVER fetched or displayed — backend query must only return `publicSummary` fields
- All three sensitivity categories (normal, injury, behavior) are shown — this is the player's own development data
- Empty state: "Your coaches haven't shared any feedback with you yet. Feedback shared by your coach will appear here."

### User Story US-P-015-UAT: Phase 5 Automated Tests
**As** a developer
**I want** Playwright E2E tests for the full player portal sections
**So that** progress, sharing, injury, and coach feedback features work end-to-end

**Acceptance Criteria:**
- Test file: `apps/web/uat/tests/player-portal-phase5.spec.ts`
- Tests cover: My Progress shows sport passport ratings, My Passport Sharing toggle works, My Injuries displays active injuries and allows new self-report, My Feedback shows approved summaries but not private insights

**Manual Test Steps for Phase 5:**
1. Log in as adult player with an existing sport passport → navigate to My Progress → confirm ratings visible with sport tabs
2. Confirm player cannot edit their own skill ratings (fields are read-only)
3. Confirm player CAN add a personal note to their passport notes section
4. Navigate to My Passport Sharing → toggle sharing on for the org → confirm sharing enabled in DB
5. Navigate to My Injuries → confirm existing injuries shown
6. Click "Report New Injury" → fill in body part, severity, date → submit → confirm injury created with `reportedByRole: "player"`
7. Confirm new injury appears in the list with "Player-reported" badge
8. Log in as a coach → confirm the player-reported injury appears in their injury view for that player
9. As coach: approve a `coachParentSummary` for a player → log in as that player → navigate to Coach Feedback → confirm summary appears with correct text
10. Confirm the coach's raw `privateInsight` text does NOT appear anywhere in the player's feedback feed
11. Acknowledge a summary → confirm `acknowledgedAt` timestamp is set

---

## Phase 6: Multi-Role UX

### Goal
Adults in PlayerARC frequently hold more than one role simultaneously — a senior player who also coaches youth, a parent who also plays, an admin who plays on the team they manage. This phase ensures role-switching is seamless and unambiguous, that users can add the "player" role to an existing account, and that cross-role permission scenarios are handled correctly. **The role switcher already exists** (`org-role-switcher.tsx`) — this phase extends and enhances it.

### User Story US-P-019: Primary Role & Default Dashboard Setting
**As** a user with multiple roles
**I want** to set which role I land on after logging in
**So that** my most important dashboard is immediately accessible

**Acceptance Criteria:**
- New "My Roles" section in account settings (accessible from any role context)
- Shows all functional roles the user holds with their associated dashboards
- "Set as primary" action next to each role — updates `primaryFunctionalRole` on the member record
- Primary role indicator shown next to the active primary role
- On next login: user lands on their primary role's dashboard by default
- If no primary role set: existing default behaviour applies (first assigned role)
- Changing primary role does not log the user out or change their current session

### User Story US-P-020: Role Context Clarity in Navigation
**As** a user with multiple roles
**I want** to always know which role I am currently acting as
**So that** I cannot accidentally take actions in the wrong context

**Acceptance Criteria:**
- Current role is displayed prominently in the page header/sidebar header (beyond just the role switcher dropdown)
- Role indicator: a coloured badge or chip with the current role name (e.g., "Acting as: Player", "Acting as: Coach")
- Role switcher remains accessible in ≤ 2 clicks from any page
- Switching roles navigates to that role's home dashboard
- If a page is role-specific and the user switches away, they land on the new role's home — not an error page
- On mobile: role indicator is visible without opening a menu

### User Story US-P-021: Adding Player Role to an Existing Account
**As** an existing platform member (coach, parent, or admin)
**I want** to register myself as a player
**So that** I can access the player portal without creating a new account

**Acceptance Criteria:**
- "My Roles" settings section includes "Add a role" option
- Selecting "Register as a player" opens a form: DOB entry (required) and optional team selection
- Backend runs `findMatchingYouthProfile(firstName, lastName, DOB)` on submission
- **If HIGH confidence match found:** admin sees a merge request in the pending players panel — user is notified their request is with the admin
- **If no match:** creates a new `playerIdentity` + `orgPlayerEnrollment` with status pending admin approval
- Admin approves in the existing pending players UI → `functionalRoles` gains `"player"` → player portal becomes accessible
- User receives in-app notification when approved: "Your player role has been approved. You can now access the Player portal."
- No duplicate user account is created under any path

### User Story US-P-022: Cross-Role Permission Scenarios
**As** a user with multiple roles
**I want** the platform to handle cross-role situations intelligently
**So that** I have appropriate access without confusion or security gaps

**Acceptance Criteria:**

**Coach who is also a Player (viewing own player profile via coach interface):**
- When a coach navigates to their own player profile from the team roster, they see an enhanced view — all their own assessment data, goals, and passport entries
- They cannot submit assessments or feedback for themselves (self-assessment disabled; actions greyed out with tooltip "You cannot assess yourself")

**Parent who is also a Player:**
- Parent portal and player portal are entirely separate role contexts, navigated via the role switcher
- Data from one role does not bleed into the other's dashboard

**Admin who is also a Player on a team they manage:**
- Admin can add themselves to a team lineup from the admin interface
- Admin actions affecting their own player record require an explicit confirmation dialog: "You are about to make admin changes to your own player record. Continue?"

### User Story US-P-019-UAT: Phase 6 Automated Tests
**As** a developer
**I want** Playwright E2E tests covering all Phase 6 multi-role stories
**So that** role-switching, primary role setting, and cross-role permissions work correctly

**Acceptance Criteria:**
- Test file: `apps/web/uat/tests/multi-role-phase6.spec.ts`
- Tests cover: primary role setting persists across login, role badge visible in header, adding player role from settings triggers admin review, coach cannot self-assess, admin modifying own player record shows confirmation

**Manual Test Steps for Phase 6:**
1. Log in as a user with Player + Coach roles → go to Settings → My Roles → set "Player" as primary → log out → log back in → confirm landing on player portal
2. Confirm role badge is visible in header showing current role
3. Switch to Coach role via role switcher → confirm navigation to coach dashboard and badge updates to "Coach"
4. As a parent user: navigate to Settings → My Roles → Register as a player → submit with DOB → log in as admin → confirm pending player request appears
5. Approve the player request → log back in as the user → confirm Player now appears in role switcher
6. As a user who is both coach and player: navigate to team roster as coach → find own name → click own player profile → confirm self-assessment actions are disabled
7. As admin-player: attempt to edit own enrollment status from admin panel → confirm confirmation dialog appears

---

## Phase 7: Child Player Passport Authorization

### Goal
Enable parents to grant their under-18 child controlled access to view (and at higher levels, interact with) their own player development data. This is a comprehensive consent and access system that empowers young athletes while maintaining full parental oversight and complying with GDPR and COPPA requirements.

### New Schema: `parentChildAuthorizations`

```typescript
parentChildAuthorizations: defineTable({
  parentUserId: v.string(),
  childPlayerId: v.id("orgPlayerEnrollments"),
  organizationId: v.string(),

  accessLevel: v.union(
    v.literal("none"),           // Access revoked or not yet granted
    v.literal("view_only"),      // Child can view: assessments, goals, feedback, attendance, progress charts
    v.literal("view_interact"),  // Child can also: set personal goals, add notes to coach feedback
  ),

  grantedAt: v.number(),
  grantedBy: v.string(),              // parentUserId who most recently set/changed level
  revokedAt: v.optional(v.number()),
  revokedBy: v.optional(v.string()),

  // Granular content controls (all default true when access is granted)
  includeCoachFeedback: v.boolean(),
  includeVoiceNotes: v.boolean(),
  includeDevelopmentGoals: v.boolean(),
  includeAssessments: v.boolean(),
  includeWellnessAccess: v.boolean(),   // Allows child to submit wellness check-ins

  // Audit log — all changes appended, not overwritten
  changeLog: v.array(v.object({
    changedAt: v.number(),
    changedBy: v.string(),
    fromLevel: v.string(),
    toLevel: v.string(),
  })),
})
.index("by_parent_and_child", ["parentUserId", "childPlayerId"])
.index("by_child", ["childPlayerId"])
.index("by_org", ["organizationId"])
```

> **What children NEVER see regardless of access level:** medical information, emergency contacts, administrative or fee information, parent-coach private communications, coach `privateInsight` data, notes marked "Parent-only" by the coach (`restrictChildView: true`).

### Authorization Levels

| Level | Who It's For | What the Child Can Do |
|---|---|---|
| None | Default — no access | Child cannot log in to platform |
| View Only | Ages 13–15 (recommended) | Log in, view passport, assessments, goals, approved feedback, attendance, progress charts — no editing |
| View + Interact | Ages 16–17 (recommended) | Everything from View Only, PLUS: set personal development goals, add notes to coach feedback, acknowledge coach messages |
| Full | At 18 — automatic | Complete adult account via Phase 2 graduation flow |

**Minimum age for child access:** 13 years (COPPA compliance). Platform enforces this at account creation.
**GDPR (Article 8):** Parental consent is the legal basis for child account creation for ages 13–15 in the EU. The parent grant action constitutes this consent and is recorded with timestamp and parent ID.

### User Story US-P-023: Parent Grants Child Access
**As** a parent/guardian
**I want** to grant my under-18 child controlled access to view their player development data
**So that** they can take ownership of their sports journey while I remain in control

**Acceptance Criteria:**
- Route: child's profile settings in parent portal — new "Grant Player Access" section
- Toggle: "Allow [Child Name] to access their player passport"
- When toggling on: access level selector appears (View Only / View + Interact) with age guidance text
- Granular toggles (all default on): Include Coach Feedback, Include Voice Notes, Include Development Goals, Include Assessments, Allow Wellness Check-In
- Preview section: "What [Child Name] will see" — summary of enabled data
- On save: creates/updates `parentChildAuthorizations` record, triggers invite email to child
- **Age check:** if child is under 13, block with message "PlayerARC requires players to be at least 13 to have their own account."
- If two parents/guardians are linked to this child: either can grant or revoke; access level is unified; all changes logged in `changeLog` and visible to both parents

### User Story US-P-024: Child Account Creation & Onboarding
**As** a child player
**I want** to set up my own platform account after my parent has granted me access
**So that** I can log in and see my sports development

**Acceptance Criteria:**
- System sends invite email to child's email address when parent grants access
- Email template: "[Parent name] has given you access to see your player development at [Club]!" — new template in `email.ts`
- Public route: `/child-account-setup?token=xxx` — token valid for 7 days, re-sendable by parent
- Child sets a password or passkey at setup via standard auth flow
- DOB entered at setup: if child is under 13 → block account creation
- Brief onboarding screen: explains what they can see, that they cannot edit coach-controlled items
- After onboarding: redirected to player portal with "Youth Account" badge visible in header

### User Story US-P-025: Child Player Dashboard (View Only)
**As** a child player (View Only access)
**I want** to see my own sports development data
**So that** I feel engaged in my own journey and can track my progress

**Acceptance Criteria:**
- Child uses the same player portal structure (`/orgs/[orgId]/player/`)
- "Youth Account" badge displayed in the sidebar header
- All fields and actions are read-only — no edit buttons, no delete actions, no form submissions except wellness check-in (if `includeWellnessAccess: true`)
- **Shown (controlled by parent granular toggles):** personal info (read-only), skill assessments (if `includeAssessments`), development goals (if `includeDevelopmentGoals`), approved coach feedback (if `includeCoachFeedback` AND `includeVoiceNotes`), training attendance, upcoming events, progress charts
- **Never shown:** medical information, emergency contacts, fees/admin data, notes marked `restrictChildView: true`, coach `privateInsight` data
- Coach feedback shown: only `publicSummary` from `coachParentSummaries` with status `approved`/`delivered`
- Cycle phase section does NOT appear for under-18 players

### User Story US-P-026: Child View + Interact Level
**As** a child player (View + Interact access)
**I want** to set my own development goals and add notes to coach feedback
**So that** I can take an active role in my sports development

**Acceptance Criteria:**
- Builds on US-P-025 — all View Only content plus:
- **Personal development goals:** child can add own goals (`setByRole: "player"`), labelled "My Goal" distinct from coach-set goals
- **Notes on coach feedback:** child can append a text response to any feedback entry — stored separately, visible to parent and coach
- **Acknowledge coach messages:** child can mark a feedback item as "Seen" (updates `acknowledgedAt`)
- Parent can see all child-added goals and notes from the parent portal
- All child-added content labelled "Player note" or "Player goal"

### User Story US-P-027: Coach Feedback Parent-Only Filtering
**As** a coach
**I want** to mark certain notes as parent-only so the child never sees them
**So that** I can have frank conversations with parents without the child seeing everything

**Acceptance Criteria:**
- When creating or editing a voice note insight or manual note: optional toggle "Restrict from child view — Parent and admin only"
- Notes marked this way: visible to coaches, parents, and admins — not to the child even if child has view access
- New field on insight/note record: `restrictChildView: v.optional(v.boolean())` (default `false`)
- In the child's player portal, these insights are silently excluded (no "hidden content" indicator shown to child)
- Existing notes default to `restrictChildView: false` — no behaviour change for existing content

### User Story US-P-028: 30-Day Pre-Birthday Notification
**As** a parent and as a player approaching 18
**I want** to be notified in advance that full account transition is coming
**So that** we can prepare and there are no surprises

**Acceptance Criteria:**
- Existing graduation cron (`jobs/graduations.ts`) extended to check: players turning 18 in exactly 30 days and in exactly 7 days
- **30-day notification to parent:** "In 30 days, [Child Name] will turn 18 and gain full control of their account. After that, they'll need to grant you continued access."
- **30-day notification to child (if they have a platform account):** "In 30 days, you'll turn 18 and take full control of your sports account at [Club]."
- **7-day notification:** same messages with updated countdown
- Notifications sent as in-app notifications (email optional, per notification preferences)
- Notification types: `age_transition_30_days`, `age_transition_7_days`
- On the 18th birthday: existing graduation cron handles the transition (Phase 2, no changes needed)

### User Story US-P-029: Multiple Guardian Authorization Management
**As** a child linked to two parents/guardians
**I want** both parents to be able to see and manage my access settings
**So that** either parent can act on my behalf

**Acceptance Criteria:**
- `parentChildAuthorizations` record is shared between both linked parents — one unified access level per child
- Either parent can grant access (creates/updates the shared record)
- Either parent can revoke access (sets `accessLevel: "none"`) — immediately removes child's access
- If parent A revokes and parent B wants to restore: parent B must re-grant explicitly
- Both parents can see the current access level and full `changeLog` in parent portal child settings
- All changes logged with `changedBy` (parent user ID) and timestamp
- In-app notification sent to the other parent when access level is changed

### User Story US-P-023-UAT: Phase 7 Automated Tests
**As** a developer
**I want** Playwright E2E tests covering all Phase 7 child authorization stories
**So that** the parental consent system, child dashboard, and multi-guardian scenarios work correctly

**Acceptance Criteria:**
- Test file: `apps/web/uat/tests/child-auth-phase7.spec.ts`
- Tests cover: parent grants View Only → child receives invite → child sets up account → child sees allowed data, not medical data; granular toggle disables assessments in child view; View+Interact child can add personal goal; coach parent-only flag hides note from child; 30-day notification fires for player turning 18 in 30 days; second parent can see change log

**Manual Test Steps for Phase 7:**
1. Log in as a parent → navigate to child's profile settings → find "Grant Player Access" → toggle on with "View Only" → save
2. Confirm invite email is sent to child's email address
3. Click invite link → test with DOB < 13 → confirm blocked → use valid age (14) → complete onboarding → confirm "Youth Account" badge visible
4. Navigate to My Progress → confirm assessments visible (read-only) with no edit buttons
5. Navigate to Coach Feedback → confirm only approved `publicSummary` records shown, no `privateInsight` text
6. Attempt to access medical information URL directly → confirm access denied
7. As parent: set `includeAssessments: false` → as child: refresh → confirm assessments no longer visible
8. As parent: upgrade child to "View + Interact" → as child: confirm "Add Personal Goal" option now available → add a goal → as parent: confirm goal visible in parent portal labelled "Player goal"
9. As coach: create a note with "Restrict from child view" enabled → as child: confirm note does NOT appear in feedback feed → as parent: confirm note DOES appear
10. Create a second parent account linked to same child → as second parent: confirm access level and change log visible → second parent revokes access → confirm child cannot log in → first parent re-grants → confirm access restored
11. Manually set a test player's DOB to 30 days from today → run graduation cron → confirm `age_transition_30_days` notification sent to parent and child

---

## Data Architecture Summary

### New Tables
- `dailyPlayerHealthChecks` (Phase 4 — 8 optional dimensions, `enabledDimensions` array, offline tracking fields)
- `playerWellnessSettings` (Phase 4 — per-player dimension preferences, all 8 enabled by default)
- `wellnessCoachAccess` (Phase 4 — per-coach consent for wellness trend access)
- `playerHealthConsents` (Phase 4 — GDPR cycle tracking consent)
- `parentChildAuthorizations` (Phase 7 — child passport authorization with access levels and audit log)

### New Backend Functions Needed
- `submitDailyHealthCheck` mutation
- `updateDailyHealthCheck` mutation
- `getMyHealthChecks(startDate, endDate)` query (player view — all enabled dimensions)
- `getMyWellnessSettings()` query
- `updateWellnessSettings(enabledDimensions)` mutation
- `getTeamWellnessSummary(teamId, date)` query (coach view — **aggregate score only** for approved players)
- `getPlayerWellnessTrend(playerIdentityId, startDate, endDate)` query (coach view — aggregate trend only)
- `requestWellnessAccess(playerIdentityId)` mutation (coach initiates)
- `approveWellnessAccess(coachUserId)` mutation (player approves)
- `revokeWellnessAccess(coachUserId)` mutation (player revokes)
- `getMyWellnessAccessList()` query (player — lists coaches with current access status)
- `getOrgWellnessAnalytics(organizationId, startDate, endDate)` query (admin)
- `findMatchingYouthProfile(firstName, lastName, dateOfBirth, email?)` query (Phase 3)
- `grantCycleTrackingConsent` / `withdrawCycleTrackingConsent` mutations
- `purgeExpiredCycleData` scheduled cron job (deletes cycle phase data older than 18 months)
- `getMyCoachFeedback()` query (player view — returns `publicSummary` records only, never `privateInsight`)
- `acknowledgeCoachSummary(summaryId)` mutation
- `setPrimaryFunctionalRole(role)` mutation (Phase 6)
- `registerAsPlayer(dateOfBirth)` mutation (Phase 6 — add player role to existing account)
- Action for sending graduation invitation email — `sendGraduationInvitationEmail()` in `packages/backend/convex/utils/email.ts`
- `grantChildAccess(childPlayerId, accessLevel, settings)` mutation (Phase 7)
- `revokeChildAccess(childPlayerId)` mutation (Phase 7)
- `getChildAuthorization(childPlayerId)` query (Phase 7)
- `createChildAccountToken(childPlayerId)` mutation (Phase 7)
- `getChildAccountSetupToken(token)` query (Phase 7 — public)
- `addChildPersonalGoal(text, targetDate)` mutation (Phase 7 — View+Interact)
- `addChildFeedbackNote(summaryId, note)` mutation (Phase 7 — View+Interact)

### Extended/New Frontend Routes
- `apps/web/src/app/orgs/[orgId]/player/layout.tsx` — NEW: adds sidebar to existing single-page portal (Phase 1)
- `apps/web/src/app/orgs/[orgId]/player/profile/page.tsx` — NEW sub-page (Phase 1)
- `apps/web/src/app/orgs/[orgId]/player/progress/page.tsx` — NEW sub-page (Phase 5)
- `apps/web/src/app/orgs/[orgId]/player/injuries/page.tsx` — NEW sub-page (Phase 5)
- `apps/web/src/app/orgs/[orgId]/player/sharing/page.tsx` — NEW sub-page (Phase 5)
- `apps/web/src/app/orgs/[orgId]/player/feedback/page.tsx` — NEW sub-page (Phase 5 — coach feedback & AI summaries)
- `apps/web/src/app/orgs/[orgId]/player/health-check/page.tsx` — NEW sub-page (Phase 4)
- `apps/web/src/app/orgs/[orgId]/player/settings/page.tsx` — NEW sub-page (Phases 4 & 6 — wellness settings + role management)
- `apps/web/src/app/claim-account/page.tsx` — NEW: public token claim page (Phase 2)
- `apps/web/src/app/child-account-setup/page.tsx` — NEW: public child account setup (Phase 7)
- `apps/web/src/components/onboarding/player-graduation-step.tsx` — NEW: wires `player_graduation` task in orchestrator (Phase 2)
- **Existing `apps/web/src/app/orgs/[orgId]/player/page.tsx`** — EXTEND only, becomes Overview tab
- **Existing `apps/web/src/app/orgs/[orgId]/admin/players/page.tsx`** — EXTEND only: add youth matching (Phase 3)
- **Existing `apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx`** — EXTEND only: add match badges (Phase 3)

### Notification Types to Add
- `age_transition_available` — notifies guardian child has turned 18
- `age_transition_claimed` — notifies admin player has claimed their account
- `age_transition_30_days` — notifies player and parent 30 days before 18th birthday (Phase 7)
- `age_transition_7_days` — notifies player and parent 7 days before 18th birthday (Phase 7)
- `wellness_alert` — notifies admin/medical when player aggregate wellness score ≤ 2
- `wellness_access_request` — notifies player when a coach requests wellness access (Phase 4)
- `wellness_access_approved` — notifies coach when player approves their request (Phase 4)
- `wellness_access_revoked` — notifies coach when player revokes their access (Phase 4)
- `child_access_level_changed` — notifies second parent when first parent changes child access (Phase 7)

---

## Resolved Questions & Design Decisions

### 1. Email Provider — Resend (already live)
The system uses **Resend** via `packages/backend/convex/utils/email.ts`. New email templates (graduation invitation, child account setup) follow the exact same pattern. No new infrastructure needed.

### 2. Player Self-Registration (without guardian invite)
Adult players can register independently via the existing join request flow. Extensions: accept DOB during the request form, run `findMatchingYouthProfile`, flag match for admin review. On approval with match: user linked to existing `playerIdentityId`.

### 3. Under-18 with Their Own Account
A parent can grant their under-18 child access (minimum age 13 — COPPA). The system supports two levels (View Only / View+Interact). The `parentChildAuthorizations` table governs all access. Parent access to all data revoked automatically when player turns 18 and claims adult account.

### 4. Wellness Check Timing & Reminders
Admin-configurable per organisation (daily, match-day, training-day). No automated low-score alerts to coaches — coaches access wellness data voluntarily, and only for players who have granted them explicit per-coach consent.

### 5. Wellness Rating Scale
5-point scale (😢😕😐🙂😁, values 1–5). Provides additional granularity for trend analysis. Aggregate score for coaches = average of all enabled dimensions, rounded to one decimal place.

### 6. Wellness Dimensions — 8 Configurable
Sleep Quality, Energy, Food Intake, Water Intake, Mood, Motivation, Physical Feeling, Muscle Recovery — all on by default. Players toggle them in settings. Coaches see only an aggregate score (never individual dimension breakdowns). Minimum 1 dimension must remain enabled.

### 7. Coach Access to Wellness Data — Per-Coach Consent
Coaches must request access; players approve or deny individually. Coaches see only the aggregate wellness score + historical trend. Individual dimension scores are never shown to coaches. Players manage their approved coach list and can revoke at any time.

### 8. Wellness Offline Support
Submission-only offline support. Check-in data stored in IndexedDB when offline; synced automatically when connection restored. Viewing historical data requires being online.

### 9. Voice Notes & AI Summaries for Adult Players
Adult players see `publicSummary` from `coachParentSummaries` (the AI-generated, coach-approved version). The coach's `privateInsight` is never accessible to players. All three sensitivity categories (normal, injury, behavior) are visible to the adult player — it is their own development data. Reuses existing `coachParentSummaries` infrastructure without modification to the coach workflow.

### 10. Adult Player Data Scope
An adult player is treated as a parent and player combined: they see everything a parent would see about their child (all approved coach-parent summaries, assessments, attendance, match data, goals) plus their own first-person player data.

### 11. Multi-Role Adults — Primary Role Setting
Adults with multiple functional roles can set a primary role that determines their landing page on login. The existing `primaryFunctionalRole` field on the member record supports this. Role context is displayed prominently in the UI at all times (badge in header/sidebar).

### 12. Child Authorization — Multiple Guardians
Access level is unified per child (not per-parent). Either parent can grant or revoke. Full change log visible to both parents. Second parent notified when first parent changes anything.

### 13. GDPR — Menstrual Cycle Data (Special Category Health Data)
Explicit, granular consent required before cycle phase input is ever shown. Separate opt-in modal. Withdrawal deletes all past cycle data. Automatic purge of cycle data older than 18 months via scheduled cron. Visible only to player and org medical/admin staff.

### 14. GDPR/COPPA — Child Accounts
Minimum age 13 (COPPA). Under GDPR Article 8, parental consent is the legal basis for accounts of children under 16. Parent's grant action in `parentChildAuthorizations` constitutes and records this consent.

### 15. Coach Feedback Filtering for Children
Coaches can mark individual notes/insights as "Parent-only" (`restrictChildView: true`). These are silently excluded from the child's feedback feed while remaining visible to parents, coaches, and admins. Default is `false` — no behaviour change for existing content.

### 16. Athletics Ireland Reporting
No specific export format required. Standard wellness data collection is sufficient. The cycle phase injury correlation analysis (admin-level aggregate view) meets their informational needs without a formal integration.

---

## Story Count

| Phase | Feature Stories | UAT Story | Total |
|---|---|---|---|
| Phase 1: Player Portal Extension | 3 | 1 | 4 |
| Phase 2: Youth-to-Adult Transition | 4 | 1 | 5 |
| Phase 3: Adult Import & Self-Registration Matching | 4 | 1 | 5 |
| Phase 4: Daily Wellness Check (incl. GDPR consent, offline, coach access) | 9 | 1 | 10 |
| Phase 5: Full Player Portal Sections (incl. Coach Feedback) | 4 | 1 | 5 |
| Phase 6: Multi-Role UX | 4 | 1 | 5 |
| Phase 7: Child Player Passport Authorization | 7 | 1 | 8 |
| **Total** | **35** | **7** | **42** |

Each UAT story includes both:
- Automated Playwright E2E test suite (`apps/web/uat/tests/`)
- Documented manual test steps for human verification before phase sign-off

---

## Files Ralph Must Read Before Starting

- `packages/backend/convex/models/adultPlayers.ts` — existing adult player mutations/queries
- `packages/backend/convex/models/playerGraduations.ts` — graduation flow
- `packages/backend/convex/models/playerImport.ts:148` — matching algorithm to reuse
- `packages/backend/convex/models/notifications.ts` — notification type pattern
- `packages/backend/convex/models/coachParentSummaries.ts` — privateInsight vs publicSummary model (reuse for adult player feedback view)
- `packages/backend/convex/schema.ts` — full schema for new table definitions
- `apps/web/src/app/orgs/[orgId]/player/page.tsx` — existing player portal to extend
- `apps/web/src/app/orgs/[orgId]/parents/layout.tsx` — portal layout to mirror
- `apps/web/src/app/orgs/[orgId]/parents/components/` — component patterns to mirror
- `apps/web/src/components/onboarding/onboarding-orchestrator.tsx` — orchestrator with player_graduation task
- `apps/web/src/components/org-role-switcher.tsx` — existing role switcher to extend
- `packages/backend/convex/utils/email.ts` — Resend email utility to extend
