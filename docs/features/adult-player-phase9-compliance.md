# Adult Player Lifecycle — Phase 9: Compliance Sprint (Adult Erasure, Data Retention & WCAG AA)

> Auto-generated documentation - Last updated: 2026-02-28 18:36

## Status

- **Branch**: `ralph/adult-player-phase9-compliance`
- **Progress**: 11 / 11 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-P9-001: Backend — Erasure Request Schema, Category Map & Core Mutations

As a backend developer, I need the schema, data category map, and core mutations for the adult erasure request system so that player requests can be submitted, reviewed, and executed with full GDPR Article 17 compliance.

**Acceptance Criteria:**
- CREATE packages/backend/convex/lib/erasureCategoryMap.ts:
-   Export a DATA_CATEGORY_CONFIG constant (TypeScript const object, not a Convex function) with one entry per category:
-   WELLNESS_DATA: { canErase: true, defaultRetentionDays: 730, tableNames: ['dailyPlayerHealthChecks'], playerIdField: 'playerIdentityId' }
-   ASSESSMENT_HISTORY: { canErase: true, defaultRetentionDays: 1825, tableNames: ['orgPlayerEnrollments assessments — see note'], playerIdField: 'playerIdentityId' }
-   INJURY_RECORDS: { canErase: false, retentionGrounds: 'Healthcare records — Ireland HSE 7-year retention standard (applicable where medical professional was involved)', defaultRetentionDays: 2555, minRetentionDays: 2555, tableNames: ['injuryReports if exists'], playerIdField: 'playerIdentityId' }
-   COACH_FEEDBACK: { canErase: true, defaultRetentionDays: 1825, tableNames: ['coachPlayerFeedback if exists'], playerIdField: 'playerIdentityId' }
-   PROFILE_DATA: { canErase: true, erasureMethod: 'anonymise', defaultRetentionDays: null, tableNames: ['orgPlayerEnrollments'] }
-   COMMUNICATION_DATA: { canErase: true, defaultRetentionDays: 365, tableNames: ['whatsappMessages', 'whatsappWellnessSessions'], playerIdField: 'playerIdentityId' }
-   AUDIT_LOGS: { canErase: false, retentionGrounds: 'GDPR Article 30 Records of Processing Activities — legal obligation of the controller', defaultRetentionDays: 1095, minRetentionDays: 1095 }
-   CHILD_AUTH_LOGS: { canErase: false, retentionGrounds: 'Child safeguarding records — Ireland Child First Act 7-year retention requirement', defaultRetentionDays: 2555, minRetentionDays: 2555 }
- ADD to packages/backend/convex/schema.ts:
-   erasureRequests table: playerId (v.id('orgPlayerEnrollments')), playerIdentityId (v.id('playerIdentities')), organizationId (v.string()), requestedByUserId (v.string()), submittedAt (v.number()), deadline (v.number() — submittedAt + 2592000000 which is 30 days in ms), status (v.union(v.literal('pending'), v.literal('in_review'), v.literal('completed'), v.literal('rejected'))), playerGrounds (v.optional(v.string())), categoryDecisions (v.optional(v.array(v.object({ category: v.string(), decision: v.union(v.literal('approved'), v.literal('rejected')), grounds: v.optional(v.string()), erasedAt: v.optional(v.number()) })))), adminUserId (v.optional(v.string())), processedAt (v.optional(v.number())), adminResponseNote (v.optional(v.string())). Indexes: by_player [playerIdentityId], by_org_and_status [organizationId, status], by_deadline [status, deadline].
-   orgRetentionConfig table: organizationId (v.string()), wellnessDays (v.number()), assessmentDays (v.number()), injuryDays (v.number()), coachFeedbackDays (v.number()), auditLogDays (v.number()), communicationDays (v.number()), updatedAt (v.number()), updatedByUserId (v.string()). Index: by_org [organizationId].
-   Add to dailyPlayerHealthChecks: retentionExpiresAt (v.optional(v.number())), retentionExpired (v.optional(v.boolean())), retentionExpiredAt (v.optional(v.number())). Add index: by_retention_expired [retentionExpired, retentionExpiredAt].
-   Add isDeleted (v.optional(v.boolean())), deletedAt (v.optional(v.number())) to orgPlayerEnrollments.
- CREATE packages/backend/convex/models/erasureRequests.ts with the following exported functions:
-   submitErasureRequest mutation: args { playerId: v.id('orgPlayerEnrollments'), organizationId: v.string(), playerGrounds: v.optional(v.string()) }. returns v.id('erasureRequests'). Handler: check no pending/in_review request already exists for this player+org (return error if so). Insert new erasureRequests record with status 'pending', submittedAt: Date.now(), deadline: Date.now() + 2592000000. Return new ID.
-   getMyErasureRequestStatus query: args { playerIdentityId: v.id('playerIdentities'), organizationId: v.string() }. returns v.union(v.object({ ... }), v.null()). Returns the most recent erasureRequests record for this player+org.
-   listPendingErasureRequests query (internal or admin-scoped): args { organizationId: v.string() }. Returns all requests with status 'pending' or 'in_review', ordered by deadline ascending (soonest deadline first).
-   updateErasureRequestStatus mutation (admin): args { requestId: v.id('erasureRequests'), status: v.string(), adminUserId: v.string(), categoryDecisions: v.array(...), adminResponseNote: v.optional(v.string()) }. Updates the request record.
-   markCategoryErased mutation (internal): args { requestId: v.id('erasureRequests'), category: v.string(), erasedAt: v.number() }. Patches the categoryDecisions array entry for this category with erasedAt timestamp.
- CREATE packages/backend/convex/models/retentionConfig.ts:
-   getOrgRetentionConfig query: args { organizationId: v.string() }. Returns orgRetentionConfig or default values if not yet configured. Default values: wellnessDays: 730, assessmentDays: 1825, injuryDays: 2555, coachFeedbackDays: 1825, auditLogDays: 1095, communicationDays: 365.
-   upsertOrgRetentionConfig mutation (admin): args { organizationId: v.string(), config: v.object({ wellnessDays: v.number(), assessmentDays: v.number(), injuryDays: v.number(), coachFeedbackDays: v.number(), auditLogDays: v.number(), communicationDays: v.number() }) }. Validation: auditLogDays must be >= 1095 (throw error if not). injuryDays must be >= 2555 (throw error if not). Upsert by organizationId index.
-   stampRetentionExpiry mutation (internal): args { tableName: v.string(), recordId: v.id(any), retentionDays: v.number() }. Patches retentionExpiresAt: Date.now() + retentionDays * 86400000 on the target record. This is called at record creation time to pre-stamp expiry.
- Run npx -w packages/backend convex codegen — all types pass.
- npm run check-types passes.

### US-P9-002: Backend — Erasure Execution Action (Per-Category Batch Soft-Delete)

As a backend developer, I need an internal action that executes the approved categories of an erasure request so that personal data is correctly soft-deleted across all relevant tables when an admin approves a request.

**Acceptance Criteria:**
- CREATE packages/backend/convex/actions/retentionEnforcement.ts ('use node' not required — this is a regular Convex action):
- executeApprovedErasureCategories internal action: args { requestId: v.id('erasureRequests'), approvedCategories: v.array(v.string()), organizationId: v.string(), playerIdentityId: v.id('playerIdentities'), playerId: v.id('orgPlayerEnrollments') }.
- For each approved category, execute the correct erasure operation:
- WELLNESS_DATA: query dailyPlayerHealthChecks by_player_and_org index for this playerIdentityId + organizationId. Process in pages of 100. For each record: call internal mutation to set retentionExpired: true, retentionExpiredAt: Date.now(). If more than 100 records: schedule continuation via ctx.scheduler.runAfter(0, ...) with a cursor offset. After all records processed: call markCategoryErased with category 'WELLNESS_DATA'.
- PROFILE_DATA: call internal anonymisePlayerProfile mutation: set playerName to 'Deleted Player', clear phone, set isDeleted: true, deletedAt: Date.now(). Do NOT delete the orgPlayerEnrollments record — preserve referential integrity. Call markCategoryErased with category 'PROFILE_DATA'.
- COMMUNICATION_DATA: query whatsappMessages by playerIdentityId index (if index exists). Soft-delete in pages of 100. Also soft-delete whatsappWellnessSessions by playerIdentityId. Call markCategoryErased.
- COACH_FEEDBACK: query coachPlayerFeedback (or equivalent table from P5) by playerIdentityId. Soft-delete in pages of 100. Call markCategoryErased. If the table does not exist (P5 not yet implemented in DB), log a warning and mark category as erased with a note.
- ASSESSMENT_HISTORY: query assessment-related tables by playerIdentityId. Soft-delete in pages of 100. If no assessment table exists yet, log and mark as erased with a note.
- After all approved categories are processed: call updateErasureRequestStatus mutation to set status 'completed', processedAt: Date.now().
- The action is idempotent: if a category has already been processed (markCategoryErased called), skip it and continue to the next.
- ADD anonymisePlayerProfile internal mutation to packages/backend/convex/models/adultPlayers.ts: args { playerId: v.id('orgPlayerEnrollments') }. Patches: playerName to 'Deleted Player', phone to null (if field exists), isDeleted: true, deletedAt: Date.now(). Returns void.
- ADD softDeleteRecord internal mutation to packages/backend/convex/models/retentionConfig.ts (or a new retentionHelpers.ts): args { table: v.union(v.literal('dailyPlayerHealthChecks'), v.literal('whatsappMessages'), v.literal('whatsappWellnessSessions')), recordId: v.id(any) }. Sets retentionExpired: true, retentionExpiredAt: Date.now() on the record. Only applies to tables with these schema fields.
- Run npx -w packages/backend convex codegen — all types pass.
- npm run check-types passes.

### US-P9-003: Player UI — Submit and Track Right to Erasure Request

As an adult player, I want to submit a GDPR right-to-erasure request and track its status so that I can exercise my legal data rights directly within the platform.

**Acceptance Criteria:**
- Add 'Your Data Rights' section to the player settings page (apps/web/src/app/orgs/[orgId]/player/settings/page.tsx). Place it as the last section on the page.
- Section header: 'Your Data Rights'. Body text: 'Under GDPR, you have the right to access, correct, and request deletion of your personal data held by [org name].'
- Show three rights as cards or list items:
-   Right 1 — Access: 'Download your data' — link to existing 'Download my data' feature (US-P5-005).
-   Right 2 — Rectification: 'Contact [org name] to correct inaccurate data.' (static text, no action required in this phase).
-   Right 3 — Erasure: 'Request deletion of your account and data' — described below.
- ERASURE REQUEST SUBSECTION (shown only if no active request):
-   Collapsible/accordion: 'Request account deletion'.
-   When expanded, show: (a) Clear explanation text: 'This submits a formal deletion request to the organisation admin. They have 30 days to respond. Some data (injury records, audit logs) may be retained for legal reasons — the admin will explain what can and cannot be deleted.' (b) Optional textarea: 'Reason for request (optional)' — max 500 characters. (c) Confirmation checkbox (not pre-ticked): 'I understand this request will be reviewed by the org admin and some data may be retained for legal reasons.' (d) 'Submit deletion request' button — disabled until checkbox ticked.
-   On submit: call submitErasureRequest mutation. Show success toast: 'Deletion request submitted. The organisation admin has 30 days to respond. You'll see the outcome here when it's processed.'
- REQUEST STATUS DISPLAY (shown instead of the request form when an active or completed request exists):
-   Status card showing: request date, deadline date (30 days from submission), current status (Pending / In Review / Completed / Rejected).
-   Status badge colours: Pending = yellow, In Review = blue, Completed = green, Rejected = red.
-   When status is 'completed' or 'rejected': show adminResponseNote (the admin's response text) below the status badge.
-   When status is 'completed': show list of category outcomes (e.g. 'Wellness data — deleted ✅', 'Injury records — retained (healthcare legal requirement) ℹ️').
-   Deadline warning: if deadline is within 7 days and status is still pending/in_review, show amber banner: 'Response due by [date] — the admin has been notified.'
- npm run check-types passes.

### US-P9-004: Admin UI — Erasure Request Review Dashboard & Execution

As an org admin, I want to review incoming GDPR erasure requests, make per-category decisions with documented grounds, and execute approved erasures so that I can fulfil the organisation's legal obligations under GDPR Article 17.

**Acceptance Criteria:**
- Add 'Data Rights Requests' page to admin navigation. Route: /orgs/[orgId]/admin/data-rights. Link in admin sidebar under 'Settings' or 'Compliance' group.
- LIST VIEW — show all erasureRequests for this org ordered by deadline ascending (most urgent first):
-   Table columns: Player Name, Submitted, Deadline, Status, Actions.
-   Deadline column: show date and a colour indicator — green if >14 days remaining, amber if 8–14 days, red if ≤7 days, dark red with 'OVERDUE' label if past deadline.
-   Status badge: Pending (yellow), In Review (blue), Completed (green), Rejected (red).
-   Actions: 'Review' button opens the detail view.
-   Empty state: 'No active data rights requests.'
- DETAIL VIEW — shown when admin clicks 'Review' on a request:
-   Player info: name, email, date request submitted, deadline.
-   Player's stated reason (if provided).
-   Per-category decision table. One row per DATA_CATEGORY_CONFIG entry. Columns: Category, Description (plain English), Can Erase (from category map), Admin Decision (dropdown: 'Approve erasure' / 'Retain with grounds'), Grounds (text input — required if retaining a category that canErase is true, pre-filled if canErase is false with the legal grounds from the category map).
-   Categories where canErase is false (AUDIT_LOGS, CHILD_AUTH_LOGS, INJURY_RECORDS): decision dropdown is locked to 'Retain with grounds', grounds field pre-filled with the legal text from erasureCategoryMap — admin cannot change these.
-   Categories where canErase is true: admin can set to 'Approve erasure' or 'Retain with grounds'. If 'Retain with grounds', a free-text grounds field is required (cannot be empty).
-   Admin response note (textarea): 'Message to player' — this will be shown to the player in their settings page. Required before processing.
-   'Process request' button: disabled until all categories have a decision and admin response note is filled in.
-   On 'Process request': confirm dialog 'This will execute the approved erasures and notify the player. This cannot be undone. Proceed?'. On confirm: call updateErasureRequestStatus then call executeApprovedErasureCategories action for all approved categories. Show progress indicator while action runs. On completion: redirect back to list view with success toast.
-   'Reject entire request' option: marks status as 'rejected', requires admin response note explaining grounds, does not execute any erasure.
- OVERDUE HANDLING: If any request has deadline < now() and status is still 'pending' or 'in_review', show a red banner at the top of the list view: '[N] request(s) are overdue — GDPR Article 12(3) requires response within 30 days. Overdue responses are a regulatory violation.'
- npm run check-types passes.

### US-P9-005: Admin UI & Backend — Data Retention Configuration

As an org admin, I want to configure data retention periods per category and understand what data will be automatically deleted, so that the organisation complies with GDPR Article 5 storage limitation.

**Acceptance Criteria:**
- Add 'Data Retention' section to admin settings page. Route: /orgs/[orgId]/admin/settings (add as a new section/tab) or a dedicated /orgs/[orgId]/admin/data-retention page.
- Section header: 'Data Retention Policy'. Sub-header: 'Personal data is automatically deleted after these periods. Legal minimum periods are enforced and cannot be reduced.'
- Retention configuration table — one row per category:
-   Columns: Data Category (plain English name), What it contains (1-line description), Retention Period (editable number input + unit selector 'days' or 'years'), Legal minimum (shown as read-only helper text if applicable).
-   Rows: Wellness check-ins (default 730d / 2 years), Assessment & passport history (default 1825d / 5 years), Injury records (default 2555d / 7 years — locked at minimum, show '7 years minimum (healthcare legal requirement)'), Coach feedback & notes (default 1825d / 5 years), WhatsApp & SMS communications (default 365d / 1 year), Activity & access logs (default 1095d / 3 years — locked at minimum, show '3 years minimum (GDPR Article 30)').
-   Rows with legal minimums: input is disabled if value equals or is below minimum; show lock icon and tooltip: 'This period cannot be reduced below [X] due to legal requirements.'
-   Allow input in days or years — convert on save. Minimum any category: 30 days.
- PREVIEW SECTION below the table:
-   'Upcoming automatic deletions in the next 90 days:' — query each table for records where retentionExpiresAt < Date.now() + 7776000000 (90 days). Show count per category: 'Wellness check-ins: 142 records expiring in the next 90 days.'
-   If counts are zero for all: 'No records are approaching expiry.'
-   Note: 'Deleted records are held for a 30-day grace period before permanent removal. Deletion can be reversed during this window by contacting [support].'
- Save button: calls upsertOrgRetentionConfig. Show validation errors inline (e.g. 'Injury records cannot be set below 2555 days'). Success toast: 'Retention policy saved.'
- ADD retentionExpiresAt stamping to record creation mutations:
-   In submitDailyHealthCheck (packages/backend/convex/models/playerHealthChecks.ts): after inserting the record, call stampRetentionExpiry with the org's wellnessDays config. Fetch org config via getOrgRetentionConfig. If config not found, use default 730 days.
-   Apply the same pattern to any coach feedback insertion and assessment insertion mutations. Reference the org's config at creation time.
- npm run check-types passes.

### US-P9-006: Backend — Retention Enforcement Cron (Nightly Soft-Delete & Hard-Delete Pipeline)

As a system, I need an automated nightly cron that enforces the data retention policy by soft-deleting expired records and hard-deleting records that have passed the 30-day grace period.

**Acceptance Criteria:**
- Add a nightly scheduled function to packages/backend/convex/jobs/ (read existing cron patterns in that directory and follow the same structure). Schedule: daily at 02:00 UTC.
- PHASE 1 — SOFT-DELETE (flag records as expired):
-   Query dailyPlayerHealthChecks for records where retentionExpiresAt is set, retentionExpiresAt < Date.now(), and retentionExpired is NOT true.
-   Use .withIndex('by_retention_expired') — add this index in schema.ts: [retentionExpired, retentionExpiredAt].
-   Process in batches of 200. For each record: patch retentionExpired: true, retentionExpiredAt: Date.now().
-   If more than 200 records processed, schedule a continuation run immediately via ctx.scheduler.runAfter(0, ...) with remaining count context.
-   Apply same logic to whatsappWellnessSessions and whatsappMessages tables (if they have retentionExpiresAt fields — add these to schema in US-P9-001 if not already added).
- PHASE 2 — HARD-DELETE (permanent removal after 30-day grace):
-   Query dailyPlayerHealthChecks for records where retentionExpired === true AND retentionExpiredAt < Date.now() - 2592000000 (30 days).
-   Process in batches of 200. For each record: ctx.db.delete(record._id).
-   Apply same logic to whatsappWellnessSessions and whatsappMessages.
- EXEMPT TABLES (never processed by this cron — enforced by not querying them):
-   erasureRequests, parentChildAuthorizationLogs, and any future auditEvents table.
- LOGGING: after each cron run, insert a summary record into a retentionCronLogs table (add to schema): runAt (number), softDeletedCount (number), hardDeletedCount (number), tablesProcessed (v.array(v.string())), errors (v.optional(v.array(v.string()))).
- ADMIN DIGEST (weekly, every Monday 08:00 UTC):
-   Separate scheduled function. Queries retentionCronLogs for the past 7 days. For each org with data: send an in-app notification to org admin (use existing notification pattern) with: 'Last 7 days: [N] records soft-deleted, [M] records permanently removed.' — if counts are both 0, skip the digest for that org.
-   Also query for upcoming expirations in next 30 days: 'Upcoming in 30 days: [K] wellness records, [J] communication records.'
- Run npx -w packages/backend convex codegen — all types pass.
- npm run check-types passes.

### US-P9-007: WCAG AA — axe-playwright Setup, Automated Audit & Critical Violations

As a developer, I want axe-playwright integrated into the E2E test suite so that WCAG 2.1 AA violations are automatically detected and failing tests prevent accessibility regressions from shipping.

**Acceptance Criteria:**
- Install @axe-core/playwright as a dev dependency in apps/web: update package.json in apps/web, run npm install.
- CREATE apps/web/uat/tests/accessibility.spec.ts:
-   Import: import { checkA11y, injectAxe } from 'axe-playwright' (or use the @axe-core/playwright direct API if axe-playwright package is not compatible — check package compatibility with the existing Playwright version first).
-   Configure axe: violations at impact 'critical' or 'serious' should fail the test assertion. Impact 'moderate' and 'minor' should be logged as console.warn but NOT fail the test in this initial phase.
-   Test each of the following pages (authenticated as test user neil.B@blablablak.com):
-     Player portal: /orgs/[orgId]/player
-     Player settings: /orgs/[orgId]/player/settings
-     Player health checks: /orgs/[orgId]/player/health-checks (if this route exists in the current implementation)
-     Admin dashboard: /orgs/[orgId]/admin
-     Admin player roster: /orgs/[orgId]/admin/players
-   For each page: navigate → await page.waitForLoadState('networkidle') → await injectAxe(page) → const results = await checkA11y(page, null, { axeOptions: { runOnly: ['wcag2a', 'wcag2aa'] } }, false) → assert results.
-   Output: generate an accessibility-report.md artifact (write to apps/web/uat/ directory) listing all violations found across all pages with: page, violation ID, description, impact, affected element selector, and fix guidance.
- FIX all 'critical' impact violations found during the audit inline in this story. Common critical violations to pre-empt:
-   img elements without alt: add alt='' for decorative images, alt='[description]' for content images.
-   Interactive elements without accessible name: add aria-label or visually-hidden text.
-   Form inputs without associated label: add htmlFor/id pair or aria-labelledby.
-   Links with no discernible text: add aria-label or sr-only span text.
- FIX all 'serious' impact violations found during the audit inline in this story.
- npm run check-types passes.
- The accessibility.spec.ts tests must pass (no critical or serious violations) on all audited pages before this story is marked complete.

### US-P9-008: WCAG AA — Emoji Scale, Focus Indicators & Org Theme Contrast

As a player using a screen reader or keyboard navigation, I want wellness rating buttons to have meaningful labels and all interactive elements to have visible focus indicators so that the platform is usable regardless of how I navigate.

**Acceptance Criteria:**
- EMOJI RATING SCALE (Phase 4 wellness check-in — locate the component in apps/web/src/app/orgs/[orgId]/player/health-checks/ or wherever the emoji rating buttons are rendered):
-   Wrap all emoji rating buttons for a single dimension in a div with role='radiogroup' and aria-labelledby pointing to the dimension question heading ID.
-   Each emoji button must have: role='radio', aria-checked={isSelected}, and aria-label describing the rating in plain text: '😢' → aria-label='Very Poor — 1 out of 5', '😕' → aria-label='Poor — 2 out of 5', '😐' → aria-label='Neutral — 3 out of 5', '🙂' → aria-label='Good — 4 out of 5', '😁' → aria-label='Great — 5 out of 5'.
-   Add a visually-hidden <span> inside each button (using sr-only Tailwind class) with the text equivalent, e.g. <span className='sr-only'>Very Poor</span>. This ensures screen readers that strip aria-labels still read the content.
-   Keyboard navigation: pressing ArrowRight/ArrowLeft within the radiogroup must move focus between emoji buttons. This is standard radiogroup keyboard interaction — implement an onKeyDown handler on the radiogroup div.
- FOCUS INDICATORS — audit all interactive elements in the player portal, player settings, and admin pages:
-   All interactive elements (buttons, links, inputs, selects, checkboxes, custom components) must show a visible focus ring when navigated to via keyboard.
-   Use Tailwind focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 (or --org-primary if contrast is sufficient) on any element missing focus styles.
-   shadcn/ui components generally include focus-visible styles — verify they are not being overridden by custom className props.
-   Do NOT use outline: none or :focus { outline: none } anywhere without a replacement focus indicator.
- ORG THEME CONTRAST SAFEGUARD:
-   Audit all places where --org-primary, --org-secondary, --org-tertiary CSS vars are used as text colours or icon colours on light backgrounds.
-   Where org-theme colours are used as text on white/light backgrounds: add a CSS fallback that ensures the colour is never lighter than #767676 (minimum contrast for large text) when used as a content colour. Use a CSS custom property with a contrast-safe fallback: if the org colour is used decoratively (borders, icons next to text), it is acceptable; if it is the only text colour, add a minimum contrast safeguard.
-   Document in a code comment any location where org-theme colours are used on backgrounds, so future theme customisation changes are flagged for contrast review.
- SCREEN READER LANDMARKS — verify the following exist on all major pages:
-   <header> or role='banner' wrapping the top navigation.
-   <main> or role='main' wrapping the primary page content.
-   <nav> or role='navigation' on the sidebar.
-   If any page uses a <div> wrapper for these structural sections without the correct semantic element, replace with the correct HTML5 landmark element.
- PREFERS-REDUCED-MOTION: wrap any CSS transitions and animations with @media (prefers-reduced-motion: reduce) { transition: none; animation: none; }. If any Tailwind animate-* classes are used, ensure they are conditionally applied based on the motion preference.
- npm run check-types passes.
- Re-run accessibility.spec.ts after these fixes — verify no new critical/serious violations introduced.

### US-P9-009: WCAG AA — Form Labels, Keyboard Navigation & Skip Links

As a keyboard-only user, I want to skip repetitive navigation and move through forms efficiently so that the platform is fully operable without a mouse.

**Acceptance Criteria:**
- SKIP-TO-MAIN-CONTENT LINK — add to the root layout (apps/web/src/app/orgs/[orgId]/layout.tsx or the highest shared layout that contains the nav):
-   First focusable element on every page: <a href='#main-content' className='sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded focus:shadow-lg'>Skip to main content</a>
-   Ensure the <main> element has id='main-content'.
-   Test: press Tab on any page — the first Tab press should reveal the 'Skip to main content' link. Pressing Enter should move focus to the main landmark.
- FORM INPUT LABELS — audit all form inputs across the player portal, player settings, admin pages, and coach views:
-   Every <input>, <select>, and <textarea> must have an associated <label> element (using htmlFor + id pair) OR aria-label OR aria-labelledby.
-   Placeholder text is NOT a substitute for a label — placeholder disappears on input and is not reliably announced by screen readers.
-   For icon-only inputs (e.g. search field with only a magnifying glass icon): add aria-label='Search' or a visually-hidden label.
-   shadcn/ui FormField/FormLabel components generally handle this correctly — verify that any custom form implementations outside shadcn also have labels.
- DIALOG / MODAL KEYBOARD INTERACTION — verify all shadcn Dialog/Sheet/AlertDialog components:
-   Focus must be trapped within the dialog when open — Tab should cycle through focusable elements inside the dialog only.
-   Pressing Escape must close the dialog.
-   When a dialog opens, initial focus must move to the first focusable element inside (or the dialog title if no actionable element precedes it).
-   When a dialog closes, focus must return to the element that triggered it.
-   shadcn/ui Dialog uses Radix UI under the hood which implements this correctly — verify no custom Dialog implementations bypass Radix. If any custom modals exist (not using shadcn Dialog), replace with shadcn Dialog.
- TOUCH TARGET AUDIT — verify 44×44px minimum across all interactive elements on mobile viewports:
-   Use browser DevTools at 375px width. Check that all buttons, links, checkbox hit areas, and radio buttons are at minimum 44×44px.
-   Apply min-h-[44px] min-w-[44px] to any interactive elements smaller than this.
-   The emoji rating buttons are high-risk for this — verify they meet the size requirement after the aria changes in US-P9-008.
- HEADING HIERARCHY — verify all pages use a logical heading structure:
-   One <h1> per page (the page title).
-   Section headings use <h2> or <h3> in logical order — no skipping from h1 to h4.
-   Visual heading styles (text-lg, font-bold) are not a substitute for semantic heading elements where structure is implied.
- npm run check-types passes.
- Re-run accessibility.spec.ts — all audited pages must pass with no critical or serious violations.

### US-P9-010: Data Breach Notification Procedure & Breach Register

As an org admin and data controller, I need a breach register to log data incidents and track GDPR Articles 33/34 notification obligations, so that the organisation can demonstrate compliance with mandatory 72-hour DPC notification requirements.

**Acceptance Criteria:**
- SCHEMA — add breachRegister table to packages/backend/convex/schema.ts: organizationId (v.string()), detectedAt (v.number()), detectedByUserId (v.string()), description (v.string()), affectedDataCategories (v.array(v.string()) — free-form list, e.g. ['wellness data', 'player profiles']), estimatedAffectedCount (v.optional(v.number())), severity (v.union(v.literal('low'), v.literal('medium'), v.literal('high'), v.literal('critical'))), status (v.union(v.literal('detected'), v.literal('under_assessment'), v.literal('dpc_notified'), v.literal('individuals_notified'), v.literal('closed'))), dpcNotifiedAt (v.optional(v.number())), individualsNotifiedAt (v.optional(v.number())), resolutionNotes (v.optional(v.string())), closedAt (v.optional(v.number())), createdAt (v.number()), updatedAt (v.number()). Indexes: by_org [organizationId], by_org_and_status [organizationId, status].
- BACKEND — create packages/backend/convex/models/breachRegister.ts:
-   logBreach mutation: args { organizationId, detectedAt, description, affectedDataCategories, estimatedAffectedCount?, severity }. Insert breachRegister record with status 'detected'. Returns new breach ID.
-   updateBreachStatus mutation: args { breachId, status, dpcNotifiedAt?, individualsNotifiedAt?, resolutionNotes?, closedAt? }. Patches the record.
-   listBreaches query: args { organizationId }. Returns all breachRegister records for this org, ordered by detectedAt descending. Include returns validator.
-   getBreachById query: args { breachId }. Returns single record or null.
- ADMIN UI — add 'Breach Register' page at /orgs/[orgId]/admin/breach-register. Link in admin sidebar under 'Compliance' group (same group as Data Rights Requests from Phase 9):
-   Page header: 'Data Breach Register'. Sub-header: 'GDPR Articles 33/34 require notification to the Data Protection Commission within 72 hours of becoming aware of a breach. This register is your Article 33(5) record of all incidents.'
-   'Log New Incident' button opens a dialog/sheet with: Date/time detected (datetime-local input, defaults to now), Description (textarea, required — 'Describe what happened, what data was involved, and how it was discovered'), Affected data categories (multi-select or comma-separated tags: wellness data / player profiles / injury records / coach feedback / communications / other), Estimated number of individuals affected (number input, optional), Severity (select: Low / Medium / High / Critical with descriptions: Low = no personal data at risk; Medium = personal data exposed but low risk to individuals; High = sensitive data exposed, moderate risk; Critical = special category health data or large-scale exposure).
-   72-HOUR WARNING BANNER: query all breaches with status 'detected' or 'under_assessment'. For each: if detectedAt < Date.now() - 259200000 (72 hours) AND status is not 'dpc_notified', 'individuals_notified', or 'closed': show a red banner at top of page: '⚠️ [N] incident(s) may require DPC notification — the 72-hour window has passed. Review and update status immediately.'
-   BREACH LIST TABLE: columns — Date Detected, Description (truncated to 80 chars), Severity (colour-coded badge), Status, DPC Notified (date or '—'), Actions ('Update' button).
-   UPDATE DIALOG: allows updating status, adding DPC notification date, adding individual notification date, adding resolution notes. 'Close Incident' sets status to 'closed' and requires resolution notes.
-   Severity colour codes: Low = grey, Medium = yellow, High = orange, Critical = red.
- CREATE docs/breach-notification-procedure.md (in the project docs/ folder):
-   Template incident response procedure covering: (1) Identification & containment — who to contact first, how to isolate the affected system; (2) Assessment — is personal data involved? What categories? How many individuals?; (3) Internal escalation — Data Controller (org admin) must be notified within 24h of detection; (4) DPC notification — if breach is likely to result in a risk to individuals, notify the Irish DPC (Data Protection Commission) within 72 hours via https://forms.dataprotection.ie/report-a-breach-of-personal-data; (5) Individual notification — if high risk to individuals, notify affected data subjects 'without undue delay'; (6) Documentation — log all incidents in the Breach Register regardless of severity.
- Run npx -w packages/backend convex codegen — all types pass.
- npm run check-types passes.

### US-P9-UAT: Phase 9 Compliance E2E Tests

As a developer, I want comprehensive tests for the adult erasure workflow, data retention configuration, and accessibility compliance so that all three compliance gaps are verifiably closed.

**Acceptance Criteria:**
- CREATE apps/web/uat/tests/compliance.spec.ts:
- ERASURE REQUEST — PLAYER FLOW:
-   UI Test: navigate to player settings page → scroll to 'Your Data Rights' section → verify section exists and shows three rights cards.
-   UI Test: expand 'Request account deletion' → verify textarea and checkbox are present → verify 'Submit deletion request' button is disabled before checkbox is ticked → tick checkbox → verify button enables.
-   UI Test: submit erasure request (with checkbox ticked) → verify success toast appears → verify the form is replaced by a status card showing 'Pending' status and deadline date.
-   UI Test: verify that submitting a second erasure request while one is pending is blocked (button or section not shown when active request exists).
- ERASURE REQUEST — ADMIN FLOW:
-   UI Test: log in as admin → navigate to /admin/data-rights → verify page loads with pending request from the player test above.
-   UI Test: click 'Review' on the pending request → verify per-category decision table is shown with correct rows → verify that AUDIT_LOGS and CHILD_AUTH_LOGS rows have locked decision fields.
-   UI Test: complete all category decisions → fill in admin response note → click 'Process request' → confirm dialog → verify redirect to list view → verify request shows as 'Completed'.
-   UI Test: navigate back to player settings as the player → verify status card now shows 'Completed' and the admin response note is visible.
- RETENTION CONFIGURATION:
-   UI Test: log in as admin → navigate to data retention settings page → verify all six category rows are shown with default values.
-   UI Test: attempt to set Injury records below 2555 days → verify validation error is shown.
-   UI Test: set Wellness check-ins to 365 days → save → refresh page → verify value persists as 365 days.
- ACCESSIBILITY (automated — these tests were created in US-P9-007 and should already be passing):
-   Verify apps/web/uat/tests/accessibility.spec.ts runs and passes without any critical or serious violations on all audited pages.
- MANUAL TESTS:
-   Manual test 1: Navigate the entire player settings page using keyboard only (Tab, Shift+Tab, Enter, Space). Verify skip-to-main-content link appears on first Tab press.
-   Manual test 2: Open Chrome with VoiceOver (macOS) or NVDA (Windows). Navigate to the wellness check-in page. Verify the emoji rating buttons are announced as radio buttons with meaningful labels (e.g. 'Very Poor, 1 out of 5, radio button, not checked').
-   Manual test 3: Open a browser with a high-contrast theme enabled. Verify all content on the player portal remains readable.
-   Manual test 4 (retention cron): On a test instance, manually set retentionExpiresAt to a past time on a wellness check-in record. Trigger the retention cron manually via Convex dashboard. Verify the record is soft-deleted (retentionExpired: true) and NOT hard-deleted. Wait the 30-day grace period simulation (or set retentionExpiredAt to 31+ days ago manually) and trigger again — verify hard-delete.
- All UI tests pass. accessibility.spec.ts passes. Manual tests documented as passed.


## Implementation Notes

### Key Patterns & Learnings

### Files Changed

- packages/backend/convex/lib/erasureCategoryMap.ts (new)
- packages/backend/convex/models/erasureRequests.ts (new)
- packages/backend/convex/models/retentionConfig.ts (new)
- packages/backend/convex/schema.ts (+~100 lines)
- ✅ Codegen: passed
- ✅ Type check: passed
- ✅ Linting: passed
- ✅ Browser verification: N/A (backend-only)
- Biome `useBlockStatements` requires braces on ALL if bodies (even single-line throws)
- Schema file is huge — grep for table names, then offset/limit to read
- Don't import `components` unless actually used — linter removes it and causes errors
---


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
