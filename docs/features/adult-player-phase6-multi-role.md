# Adult Player Lifecycle — Phase 6: Multi-Role UX

> Auto-generated documentation - Last updated: 2026-02-27 23:04

## Status

- **Branch**: `ralph/adult-player-phase6-multi-role`
- **Progress**: 7 / 7 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P6-001: Primary Role & Default Dashboard Setting

As a user with multiple roles, I want to set which role I land on after logging in so that my most important dashboard is immediately accessible.

**Acceptance Criteria:**
- Find or create a 'My Roles' section in account/org settings accessible from any role context (likely in /orgs/[orgId]/settings/ or via profile menu)
- Section shows all functional roles the user holds (from their member record's functionalRoles array) with their associated dashboard paths
- Each role row has a 'Set as primary' button. On click: calls mutation to update primaryFunctionalRole on the member record. This field must be ADDED to the schema and a setPrimaryFunctionalRole mutation added to models/members.ts — see criticalContext for exact instructions.
- Current primary role shows a 'Primary' badge instead of the 'Set as primary' button
- On next login: org routing reads primaryFunctionalRole and redirects to that role's dashboard. If primaryFunctionalRole is null or the role is no longer held: fall back to existing default behaviour.
- Changing the primary role does NOT log the user out or redirect them mid-session — takes effect on next login
- npm run check-types passes

### US-P6-002: Role Context Badge in Navigation

As a user with multiple roles, I want to always know which role I am currently acting as so that I cannot accidentally take actions in the wrong context.

**Acceptance Criteria:**
- Add a persistent role context badge/chip to the page header or sidebar header — visible on EVERY page within /orgs/[orgId]/
- Badge shows: 'Acting as: [Role Name]' — e.g. 'Acting as: Player', 'Acting as: Coach', 'Acting as: Admin'
- Badge uses the org theme colours (--org-primary, --org-secondary) to colour-code by role
- Badge only appears when the user holds MORE than one role (single-role users see no badge — no change to their experience)
- Role switcher dropdown remains accessible within ≤ 2 clicks from any page
- Switching role via the role switcher: navigates to that role's home dashboard AND updates the badge
- On mobile (375px): badge is visible without opening any menu — may be abbreviated (e.g. just the role initial or a coloured dot with role name on hover/tap)
- If the user is on a role-specific page and switches away: they land on the new role's home dashboard, not an error page
- npm run check-types passes

### US-P6-003: Adding Player Role to an Existing Account

As an existing platform member (coach, parent, or admin), I want to register myself as a player so that I can access the player portal without creating a new account.

**Acceptance Criteria:**
- In the 'My Roles' settings section (US-P6-001): add an 'Add a role' expandable section below the role list
- Show 'Register as a player' option (only if the user does NOT already hold the 'player' functional role)
- On click: open a form with DOB field (required, date picker) and optional team selection dropdown (fetches org teams)
- On submit: backend calls the youth profile matching function from packages/backend/convex/models/playerMatching.ts (READ that file to find the correct exported function name — implemented in Phase 3) passing the user's name and DOB to check for existing youth records
- If HIGH confidence youth match found: show message 'A youth profile may match your record. An admin will review and link your history.' — create a pending playerIdentity request with the matchedPlayerIdentityId stored. Do NOT auto-link.
- If no match: create new playerIdentity + orgPlayerEnrollment with status 'pending'. Admin must approve in existing pending players UI.
- After submission: show 'Your player registration is with the admin for review. You'll be notified when approved.' — user cannot access player portal until approved.
- On admin approval: user's functionalRoles gains 'player', player portal becomes accessible. In-app notification to user: 'Your player role has been approved. You can now access the Player portal.'
- FIRST-RUN MOMENT: the first time the user switches to the Player role (after approval), show a dismissible welcome banner at the top of the player portal: 'Welcome to your Player portal — explore your profile, wellness check-ins, and more.' Banner is shown only once — store a 'playerPortalWelcomeDismissed' flag in localStorage after the user dismisses it. Do NOT show it on subsequent visits.
- No duplicate user account is created under any path
- npm run check-types passes

### US-P6-004: Cross-Role Permission Scenarios

As a user with multiple roles, I want the platform to handle cross-role situations correctly so that I have appropriate access without confusion or security gaps.

**Acceptance Criteria:**
- COACH who is also a PLAYER (viewing own player profile via coach interface):
- When a coach navigates to their own player profile from the team roster, show an enhanced read-only view of their own data (assessments, goals, passport)
- Self-assessment is disabled in the UI: assessment submit buttons, rating inputs, and coach feedback forms are greyed out with tooltip 'You cannot assess yourself'
- BACKEND GUARD REQUIRED — not UI-only: the assessment submission mutation must validate that the assessor's userId does not match the assessed playerIdentity's userId field (the field is named userId on the playerIdentities table — confirmed in schema). If they match, throw a validation error ('A coach cannot submit an assessment for their own player record'). Read how assessments are stored before implementing — find the mutation and add the userId comparison check. This guard fires regardless of which role the user is currently acting in.
- The 'Add voice note' and 'Create coach parent summary' actions are disabled for the coach's own player record
- PARENT who is also a PLAYER:
- Parent portal and player portal are entirely separate role contexts navigated via the role switcher
- No data from the player role bleeds into the parent portal's dashboard (e.g. player's own wellness data does not appear in the parent portal)
- ADMIN who is also a PLAYER on a team they manage:
- Admin can add themselves to a team lineup from the admin interface (no restriction)
- Any admin action that directly modifies their own player record (e.g. editing their enrollment, changing their status) must show a confirmation dialog: 'You are about to make admin changes to your own player record. Continue?' — admin can still proceed after confirming
- BACKEND GUARD FOR ADMIN-OWN-RECORD: the mutations that update playerEnrollment status, edit enrollment details, or change a player's team must accept a required boolean arg: confirmed: v.boolean(). If the target playerIdentity's userId field (on the playerIdentities table) matches the admin's userId AND confirmed is false, the mutation throws ('Self-modification requires explicit confirmation'). The UI dialog sets confirmed=true before calling the mutation. This prevents any path (direct API call, future UI change) from bypassing the confirmation. Read the existing enrollment update mutations before implementing — find and extend them.
- npm run check-types passes

### US-P6-005: Role-Scoped Notification Routing

As a user with multiple roles, I want notifications to appear only in the role context they belong to, so that coach notifications don't interrupt me while I'm acting as a player.

**Acceptance Criteria:**
- Add an optional targetRole field to the notifications table schema: targetRole: v.optional(v.union(v.literal('coach'), v.literal('admin'), v.literal('parent'), v.literal('player'))). This is a backward-compatible addition — existing notifications without targetRole continue to display to all roles.
- Update all existing notification creation call sites to include targetRole. Mapping: injury_reported / injury_status_changed / severe_injury_alert / injury_cleared / milestone_completed / clearance_received → 'coach'; invitation_request / child_declined / org_invitation_received → 'admin'; role_granted → omit targetRole (global, shown to all); team_assigned / team_removed → 'coach'.
- Add player-portal notification type: add v.literal('player_role_approved') to the notificationTypeValidator union (used by Phase 6 US-P6-003 approval flow). This notification's targetRole = 'player'.
- Update the getUserNotifications query in packages/backend/convex/models/notifications.ts: add an optional activeRole arg. When provided: return notifications where targetRole === activeRole OR targetRole is null/undefined. When not provided: return all (existing behaviour, preserves backward compatibility).
- Update the notification-provider.tsx to pass the user's current activeFunctionalRole to the notifications query. Read org-role-switcher.tsx to understand how activeFunctionalRole is determined — use the same source. Do NOT duplicate the role detection logic.
- The notification bell badge count and toast popups respect the active role filter — a coach acting as player does not see coach injury notifications.
- When the user switches role, the notification provider re-queries with the new role — the bell count and unseen toasts update immediately.
- npm run check-types passes
- npx -w packages/backend convex codegen passes

### US-P6-006: Deep Link Role Context Prompt

As a multi-role user who follows a shared link to a role-specific page, I want to be offered a role switch rather than hitting a blank or forbidden page, so that the link takes me where it intended.

**Acceptance Criteria:**
- EXTEND the existing role switcher (org-role-switcher.tsx) — do NOT create a new routing layer. The role switcher already contains ROLE_PATHNAME_REGEX which extracts the role from the current pathname. Extend this logic.
- When the user navigates to a URL whose role segment (/admin/, /coach/, /parents/, /player/) does NOT match their activeFunctionalRole, AND they hold the required role in their functionalRoles array: show a non-blocking dialog/sheet: 'This page is for your [RequiredRole] context. Switch to [RequiredRole]?' with two buttons: 'Switch to [RequiredRole]' and 'Stay as [CurrentRole]'.
- 'Switch to [RequiredRole]': calls the existing role switch mutation (updateActiveFunctionalRole), updates the badge, and allows navigation to the target page to complete.
- 'Stay as [CurrentRole]': dismisses the dialog. Navigation proceeds to the URL — if the page's own access guard blocks them, that guard's existing error/redirect behaviour handles it. Do NOT add a second layer of route blocking here.
- If the user does NOT hold the required role (e.g., a parent-only user follows a /coach/ link): do NOT show the switch prompt. Let the existing page-level access guard handle it (typically a redirect to their own dashboard).
- The prompt is shown at most ONCE per navigation event — no loops. If the user dismisses ('Stay as [CurrentRole]') and stays on the same URL, do not re-prompt.
- The prompt does NOT fire when the user explicitly switches role via the role switcher dropdown — only on URL-driven navigation.
- On mobile (375px): the prompt is a bottom sheet, not a centered dialog, to avoid covering the full viewport.
- npm run check-types passes

### US-P6-UAT: Phase 6 Multi-Role E2E Tests

As a developer, I want Playwright E2E tests covering all Phase 6 multi-role stories so that role-switching, primary role setting, and cross-role permissions work correctly.

**Acceptance Criteria:**
- Create test file: apps/web/uat/tests/multi-role-phase6.spec.ts
- Test: primary role setting updates primaryFunctionalRole on member record in DB
- Test: role context badge visible in header for a user with 2+ roles
- Test: role context badge NOT visible for a user with only 1 role
- Test: 'Register as player' form is not shown to a user who already has the player role
- Test: submitting player registration creates a pending playerIdentity record
- Test: coach cannot submit self-assessment on their own player profile (actions disabled in UI)
- Test: direct API call to assessment submission mutation with assessor userId === assessed player userId returns a validation error (backend guard fires independent of UI)
- Test: direct API call to enrollment update mutation with confirmed=false and admin userId === player's userId (on playerIdentities) returns a validation error
- Test: as coach+player acting as player, notification bell does NOT show coach injury notifications (role-scoped filter working)
- Test: as coach+player acting as coach, notification bell DOES show coach injury notifications
- Test: navigating to /orgs/[orgId]/coach/ while activeFunctionalRole is 'player' (and user holds coach role) shows the role-switch prompt dialog
- Test: dismissing the role-switch prompt ('Stay as Player') does not re-trigger the prompt on the same URL
- Manual test 1: Log in as a user with Player + Coach roles → My Roles settings → set Player as primary → log out → log back in → confirm landing on /player/ dashboard
- Manual test 2: Confirm role context badge is visible in header showing current active role
- Manual test 3: Switch to Coach role via role switcher → confirm navigation to coach dashboard and badge updates to 'Coach'
- Manual test 4: Switch back to Player role → confirm landing on player portal, not an error page
- Manual test 5: Log in as parent-only user → My Roles → Register as player → submit with DOB → log in as admin → confirm pending player request appears in admin pending list
- Manual test 6: Admin approves the player request → log back in as the user → confirm Player now appears in role switcher and player portal is accessible
- Manual test 7: As user who is both coach and player: navigate to team roster as coach → find own name → click own player profile → confirm assessment form fields are disabled with 'cannot assess yourself' tooltip
- Manual test 8: As admin-player: attempt to edit own enrollment status from admin panel → confirm confirmation dialog appears before proceeding, AND confirm that directly calling the mutation with confirmed=false throws
- Manual test 9: As coach+player acting as player → copy the URL of a coach-specific page → open it in the same session → confirm the role-switch prompt appears
- Manual test 10: Choose 'Switch to Coach' in prompt → confirm badge updates and page loads correctly
- Manual test 11: Trigger an injury notification as admin → log in as the injured player's coach who is also a player → switch to Player role → confirm injury notification does NOT appear in the notification bell


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- `getMembersForAllOrganizations` had stale type annotations - `functionalRoles` was typed as `("coach"|"parent"|"admin")[]` missing "player". Had to update all type annotations in the handler.
- Biome enforces max 4 parameters. For functions needing 5+ params, use an options object type.
- The `pendingRoleRequests` in the membership context is correctly named (it's the return field name), but the schema uses `pendingFunctionalRoleRequests` - the mismatch is intentional (query renames it in the return).
- Coach settings are not a page.tsx - they're a `CoachSettingsDialog` opened from `enhanced-user-menu.tsx`. Adding MyRolesSection there would require dialog integration.
- There's already a stub `PreferencesDialog` with "Login Preferences" that uses `useDefaultPreference` (stub hook). The `primaryFunctionalRole` implementation is a better version of the same concept stored on the member record.
- Post-login routing in `orgs/current/page.tsx` uses `getRedirectRoute()` - updated to check primaryFunctionalRole first.
- functionalRoles type in getMembersForAllOrganizations handler was missing "player" - caused TS2345 error on `.includes(primaryRole)`.
- Biome "Function has 5 parameters" error required refactoring to options object.
--
- There is NO top-level `/orgs/[orgId]/layout.tsx`. Each role has its own layout file.

**Gotchas encountered:**
- functionalRoles type in getMembersForAllOrganizations handler was missing "player" - caused TS2345 error on `.includes(primaryRole)`.
- Biome "Function has 5 parameters" error required refactoring to options object.
- Role Context Badge in Navigation
- Read org layout to understand where badge should live
- Badge only for users with 2+ roles
- Uses org theme colors
- Mobile: abbreviated display
--
- Biome linter ran between Edit calls and removed the `RoleContextBadge` import before the
- Adding Player Role to an Existing Account

### Files Changed

- packages/backend/convex/betterAuth/schema.ts (+11)
- packages/backend/convex/models/members.ts (+90, -15)
- apps/web/src/providers/membership-provider.tsx (+1)
- apps/web/src/components/settings/my-roles-section.tsx (new, +170)
- apps/web/src/app/orgs/current/page.tsx (+40, -15)
- apps/web/src/app/orgs/[orgId]/player/settings/page.tsx (+2)
- apps/web/src/app/orgs/[orgId]/parents/settings/page.tsx (+3)
- apps/web/src/app/orgs/[orgId]/admin/settings/page.tsx (+3)
- ✅ Convex codegen: passed
- ✅ Type check: passed
- ✅ Linting: passed (pre-commit hook passed)
- ✅ Browser verification: not required (backend + settings UI)
- `getMembersForAllOrganizations` had stale type annotations - `functionalRoles` was typed as `("coach"|"parent"|"admin")[]` missing "player". Had to update all type annotations in the handler.
- Biome enforces max 4 parameters. For functions needing 5+ params, use an options object type.
- The `pendingRoleRequests` in the membership context is correctly named (it's the return field name), but the schema uses `pendingFunctionalRoleRequests` - the mismatch is intentional (query renames it in the return).


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
