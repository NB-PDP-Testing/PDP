# Adult Player Lifecycle — Phase 1: Player Portal Layout & Navigation

> Auto-generated documentation - Last updated: 2026-02-25 16:01

## Status

- **Branch**: `ralph/adult-player-phase1-portal`
- **Progress**: 4 / 4 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P1-001: Player Portal Layout & Sidebar Navigation

As an adult player, I want a sidebar-navigated portal matching the depth of the parent portal, so that I can access all my sports management features in one place.

**Acceptance Criteria:**
- Create apps/web/src/app/orgs/[orgId]/player/layout.tsx — this file does NOT currently exist
- Build PlayerSidebar component by mirroring ParentSidebar at apps/web/src/components/layout/parent-sidebar.tsx
- Existing player/page.tsx content must remain completely intact — it becomes the Overview tab, just framed in the new layout
- hasPlayerDashboard query (adultPlayers.ts:633) gates the entire portal — redirect to org home if user has no player profile
- Sidebar navigation items (9 total): Overview (Home icon, /player/), My Profile (User icon, /player/profile), My Progress (TrendingUp icon, /player/progress), My Teams (Users icon, /player/teams), Daily Wellness (Heart icon, /player/health-check), My Injuries (Activity icon, /player/injuries), Coach Feedback (MessageSquare icon, /player/feedback), Passport Sharing (Share2 icon, /player/sharing), Settings (Settings icon, /player/settings)
- Mobile responsive: bottom nav tabs (4 primary items) matching parent portal pattern at 375px minimum
- Org theming via useOrgTheme() applied consistently — CSS vars --org-primary, --org-secondary, --org-tertiary
- Sub-routes that don't have pages yet (progress, teams, injuries, sharing, health-check, feedback, settings) show a placeholder 'Coming Soon' page — no 404 errors
- npm run check-types passes
- npx -w packages/backend convex codegen passes

### US-P1-002: Player Overview — 'Today' Priority First-Screen

As an adult player, I want the overview to immediately surface only the 2–3 things that need my attention today, so that I can act quickly without scrolling through data that isn't relevant right now.

**Acceptance Criteria:**
- The /orgs/[orgId]/player/ route renders a single scrollable page with two sections: a 'Today' priority section at the top, and a 'Full Profile' section below (the unchanged existing player/page.tsx content).
- TODAY SECTION — Priority action cards (show ONLY if relevant — do not show empty placeholders for irrelevant cards):
-   (a) WELLNESS CARD: if no wellness check submitted today (getTodayHealthCheck returns null) → amber card 'Complete your daily wellness check' with subtitle 'Takes under a minute' and a 'Start Check-In' button linking to /player/health-check. If already submitted → green card '✓ Wellness checked in today' with today's aggregate score shown (e.g. '4.2 / 5').
-   (b) INJURY CARD: if player has at least one active injury (status 'active' or 'recovering') → amber card showing injury count, e.g. '⚠ 1 active injury' with body part and status, linking to /player/injuries. If no active injuries → card NOT shown.
-   (c) FEEDBACK CARD: if player has at least one unacknowledged coachParentSummary (Phase 5 will provide the query — stub with null for now) → blue card 'New coach feedback available' with count, linking to /player/feedback. If none → card NOT shown.
- If ALL three conditions are 'clear' (wellness done, no active injuries, no unread feedback): show a single green 'All clear today 🎉' card instead of the three cards.
- TODAY SECTION — Quick stats strip below cards: Player name, current team(s) (comma-separated), today's date in format 'Tuesday, 25 Feb'.
- FULL PROFILE SECTION: headed 'My Profile' with a subtle divider. Renders the existing player/page.tsx content exactly as-is (passport, emergency contacts, benchmarks, goals, skills, positions). No changes to this content.
- On MOBILE (375px): Today section cards stack vertically and fill the full width. A 'See full profile ↓' link anchors to the Full Profile section. The 4 bottom nav tabs remain visible.
- On DESKTOP: Today cards display in a 3-column grid. Full Profile is visible below without needing a scroll prompt.
- Today section data: wellness from getTodayHealthCheck stub (Phase 1 already creates this); injuries from a new lightweight query getTodayPriorityData(playerIdentityId, organizationId) that returns { activeInjuryCount, activeInjuryBodyPart } — add this query to packages/backend/convex/models/adultPlayers.ts following existing patterns. The feedback query stubs to null until Phase 5.
- Today section must render in under 200ms perceived time — use Convex reactive queries, no loading spinners for the primary cards (Suspense boundaries acceptable for the Full Profile section below).
- Mobile responsive at 375px minimum.
- npm run check-types passes

### US-P1-003: Player Profile Self-Edit Sub-Page

As an adult player, I want a dedicated page to manage my contact details and emergency contacts, so that my information stays current without asking an admin.

**Acceptance Criteria:**
- Create apps/web/src/app/orgs/[orgId]/player/profile/page.tsx
- Editable fields (using updateMyProfile mutation at adultPlayers.ts:287): email, phone, address, town, postcode, country
- Read-only fields: firstName, lastName, dateOfBirth, gender — each shown with a Lock icon and tooltip 'Contact your admin to change'
- Form uses React Hook Form with Zod validation, matching existing form patterns in the codebase
- Save button shows loading state during mutation, success toast on save, error toast on failure
- Emergency contacts section below personal details: displays all existing emergency contacts (from getMyPlayerProfile) with name, phone, relationship
- Emergency contacts: Add button opens a dialog to create a new emergency contact
- Emergency contacts: Edit and Delete actions on each contact row
- Emergency contact mutations (addEmergencyContact, updateEmergencyContact, deleteEmergencyContact): add to packages/backend/convex/models/adultPlayers.ts following the playerEmergencyContacts table pattern already established
- Mobile-first layout: 375px minimum width, single-column on mobile
- npm run check-types passes

### US-P1-UAT: Phase 1 Player Portal E2E Tests

As a developer, I want Playwright E2E tests covering all Phase 1 stories, so that the player portal works correctly end-to-end and regressions are caught automatically.

**Acceptance Criteria:**
- Create test file: apps/web/uat/tests/player-portal-phase1.spec.ts
- Test: user without player role visiting /orgs/[orgId]/player is redirected to org home
- Test: user with player role sees sidebar with all 9 nav items rendered
- Test: clicking each sidebar nav item navigates without 404
- Test: overview page shows summary cards (may be empty state)
- Test: amber wellness CTA card is visible when no wellness check submitted today
- Test: injury card is NOT shown when player has no active injuries
- Test: 'All clear today' card shown when wellness done and no active injuries
- Test: Full Profile section renders below Today section on the same page
- Test: navigate to My Profile, edit phone number, save, refresh, confirm new phone number persists
- Test: read-only fields (name, DOB) inputs are disabled and show lock icon
- Test: emergency contacts section is visible in My Profile
- Manual test 1: Log in as user with player role → confirm sidebar with all 9 nav items
- Manual test 2: Log in as user WITHOUT player role → confirm redirect to org home
- Manual test 3: Navigate to My Profile → edit phone → save → refresh → confirm persisted
- Manual test 4: Verify read-only fields show lock icon and cannot be edited
- Manual test 5: Navigate to each sidebar section → confirm no 404 errors, placeholder shown for unbuilt sections
- Manual test 6: Resize to 375px → confirm mobile bottom nav appears, all items tappable (44×44px min)
- Manual test 7: Confirm org theme colours applied consistently across all portal pages
- Manual test 8: Submit wellness check → confirm Today section updates to green '✓ Wellness checked in today' card without page refresh


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Import + usage must be added in one Write operation to avoid linter removing "unused" imports
- `biome format --write` fixes formatting before committing is cleaner than fixing manually
- playerInjuries `by_status` index: `["playerIdentityId", "status"]` - need two queries for active + recovering
- Adding imports in one Edit call and usage in another triggers linter to remove "unused" imports between edits
- Always write full file with Write tool when making complex multi-section changes to avoid linter conflicts
- `noExcessiveCognitiveComplexity` is a warning, not an error - doesn't block commit
--
- emergencyContacts.ts model already has full CRUD (create/update/remove/updatePriority)
- EmergencyContactsSection component is reusable and already handles all emergency contact UI
- Profile page doesn't need orgId - getMyPlayerProfile uses auth identity internally

**Gotchas encountered:**
- Adding imports in one Edit call and usage in another triggers linter to remove "unused" imports between edits
- Always write full file with Write tool when making complex multi-section changes to avoid linter conflicts
- `noExcessiveCognitiveComplexity` is a warning, not an error - doesn't block commit
- Create apps/web/src/app/orgs/[orgId]/player/profile/page.tsx
- Use updateMyProfile mutation (already built at adultPlayers.ts:287)
- Add emergency contact CRUD mutations to adultPlayers.ts
- Form: React Hook Form + Zod, read-only fields with Lock icon

### Files Changed

- packages/backend/convex/models/adultPlayers.ts (+55, -0)
- apps/web/src/app/orgs/[orgId]/player/page.tsx (+182, -1)
- ✅ Convex codegen: passed
- ✅ Type check: only pre-existing error in diagnoseSafeGetAuthUser.ts
- ✅ Lint: clean (biome format fixed one formatting issue)
- ✅ Pre-commit hook: passed
- Import + usage must be added in one Write operation to avoid linter removing "unused" imports
- `biome format --write` fixes formatting before committing is cleaner than fixing manually
- playerInjuries `by_status` index: `["playerIdentityId", "status"]` - need two queries for active + recovering
- Adding imports in one Edit call and usage in another triggers linter to remove "unused" imports between edits
- Always write full file with Write tool when making complex multi-section changes to avoid linter conflicts
- `noExcessiveCognitiveComplexity` is a warning, not an error - doesn't block commit
--
- apps/web/src/app/orgs/[orgId]/player/profile/page.tsx (+309, new file)
- ✅ Type check: only pre-existing error in diagnoseSafeGetAuthUser.ts


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
