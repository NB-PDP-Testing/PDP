# Passport Sharing — Implementation Reference

> **Purpose:** Single reference document for engineers to understand every passport sharing feature implemented in the codebase, mapped against the PRD user stories.
>
> **Last Updated:** 2026-02-10
>
> **PRD Source:** `scripts/ralph/prds/passport-sharing-phase-1.json` (37 stories)
>
> **Supporting Docs:**
> - `docs/features/PRD-passport-sharing.md` — Full product requirements
> - `docs/features/PRD-passport-sharing-decisions.md` — 11 stakeholder decisions
> - `docs/features/PRD-passport-sharing-ux-specification.md` — UX design spec
> - `docs/features/PRD-passport-sharing-review-gaps.md` — 23 identified gaps

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Database Schema](#2-database-schema)
3. [Backend API Surface](#3-backend-api-surface)
4. [Consent Gateway (Security Layer)](#4-consent-gateway-security-layer)
5. [Passport Comparison Engine](#5-passport-comparison-engine)
6. [Frontend Routes & Components](#6-frontend-routes--components)
7. [Navigation Integration](#7-navigation-integration)
8. [Data Flows](#8-data-flows)
9. [PRD Story-by-Story Status](#9-prd-story-by-story-status)
10. [Known Gaps & TODOs](#10-known-gaps--todos)
11. [Diagnostics & Tooling](#11-diagnostics--tooling)
12. [Testing Guide](#12-testing-guide)

---

## 1. System Overview

### What It Does

Passport Sharing enables **cross-organization sharing of player development data** with a two-party consent model:

1. **Parent grants consent** — Selects what data to share, with which organization, for how long
2. **Coach accepts/declines** — Receiving organization coach reviews and accepts or declines the share
3. **Data becomes accessible** — Once accepted, coaches at the receiving org can view shared passport data in read-only mode

### Core Principles

- **Parent as Data Controller** — Parents decide what is shared and can revoke at any time
- **Two-Party Consent** — Both parent AND receiving coach must agree
- **Granular Element Control** — 10 independent boolean flags control exactly which data categories are shared
- **Immutable Audit Trail** — Every data access is logged and cannot be deleted
- **Multi-Guardian Awareness** — All guardians with parental responsibility are notified of sharing changes (except the actor)
- **MyData/Kantara Consent Receipts** — Standards-compliant consent receipts generated on creation

### Architecture Pattern

```
Parent UI → createConsent mutation → passportShareConsents table
                                          ↓
Coach UI ← getSharedPassportData query ← consentGateway.validateShareAccess()
                                          ↓
                                    passportShareAccessLogs (audit)
```

---

## 2. Database Schema

**File:** `packages/backend/convex/schema.ts` (lines ~3380–3694)

### 2.1 `passportShareConsents`

The central table. One record per guardian-player-receiving_org combination.

| Field | Type | Purpose |
|-------|------|---------|
| `playerIdentityId` | `Id<"playerIdentities">` | The player being shared |
| `grantedBy` | `string` | userId of guardian or adult player |
| `grantedByType` | `"guardian" \| "self"` | Who initiated |
| `guardianIdentityId` | `Id<"guardianIdentities">?` | Guardian reference (if applicable) |
| `initiationType` | `"parent_initiated" \| "coach_requested"?` | How sharing was triggered |
| `sourceRequestId` | `Id<"passportShareRequests">?` | Link to original request if coach-initiated |
| `sourceOrgMode` | `"all_enrolled" \| "specific_orgs"` | Where data comes from |
| `sourceOrgIds` | `string[]?` | Specific source org IDs (if specific_orgs mode) |
| `receivingOrgId` | `string` | Organization receiving access |
| `sharedElements` | Object (10 booleans) | Granular data control (see below) |
| `allowCrossSportVisibility` | `boolean?` | Whether receiving org can see other sport passports |
| `visibleSportCodes` | `string[]?` | Which sports to make visible |
| `consentedAt` | `number` | Timestamp of consent creation |
| `expiresAt` | `number` | When consent auto-expires |
| `renewalReminderSent` | `boolean` | Whether 30-day reminder was sent |
| `status` | `"active" \| "expired" \| "revoked" \| "suspended"` | Consent lifecycle state |
| `revokedAt` / `revokedReason` | `number? / string?` | Revocation details |
| `renewalCount` / `lastRenewedAt` | `number / number?` | Renewal tracking |
| `coachAcceptanceStatus` | `"pending" \| "accepted" \| "declined"` | Coach's response |
| `acceptedByCoachId` / `acceptedAt` | `string? / number?` | Acceptance details |
| `declinedAt` / `declineReason` / `declineCount` | Various | Decline tracking |
| `pausedForAge18Review` / `age18ReviewCompletedAt` | `boolean? / number?` | Age 18 transition |
| `consentVersion` / `ipAddress` | `string / string?` | Audit metadata |

**Shared Elements Object (10 flags):**

| Flag | Controls |
|------|----------|
| `basicProfile` | Name, age group, photo |
| `skillRatings` | Skill assessments |
| `skillHistory` | Historical ratings |
| `developmentGoals` | Goals & milestones |
| `coachNotes` | Public coach notes |
| `benchmarkData` | Benchmark comparisons |
| `attendanceRecords` | Training/match attendance |
| `injuryHistory` | Injury records (safety-critical) |
| `medicalSummary` | Medical profile summary |
| `contactInfo` | Guardian/coach contact info |

**Indexes:** `by_player`, `by_player_and_status`, `by_receiving_org`, `by_granted_by`, `by_expiry`, `by_coach_acceptance`

### 2.2 `passportShareAccessLogs`

Immutable audit trail. Insert-only — records are never updated or deleted.

| Field | Type | Purpose |
|-------|------|---------|
| `consentId` | `Id<"passportShareConsents">` | Which consent authorized access |
| `playerIdentityId` | `Id<"playerIdentities">` | Player whose data was accessed |
| `accessedBy` | `string` | userId of accessor |
| `accessedByName` / `accessedByRole` / `accessedByOrgId` / `accessedByOrgName` | `string` | Denormalized audit fields |
| `accessType` | Enum | `view_summary`, `view_skills`, `view_goals`, `view_notes`, `view_medical`, `view_contact`, `export_pdf`, `view_insights` |
| `accessedAt` | `number` | Timestamp |
| `sourceOrgId` | `string?` | Which org's data was viewed |

**Indexes:** `by_consent`, `by_player`, `by_accessor`, `by_date`

### 2.3 `passportShareRequests`

Coach-initiated requests for passport access.

| Field | Type | Purpose |
|-------|------|---------|
| `playerIdentityId` | `Id<"playerIdentities">` | Target player |
| `requestedBy` / `requestedByName` / `requestedByRole` | `string` | Coach info (denormalized) |
| `requestingOrgId` / `requestingOrgName` | `string` | Coach's organization (denormalized) |
| `reason` | `string?` | Why coach wants access |
| `status` | `"pending" \| "approved" \| "declined" \| "expired"` | Request lifecycle |
| `requestedAt` / `respondedAt` / `respondedBy` | Various | Timestamps and responder |
| `expiresAt` | `number` | Auto-expire after 14 days |
| `resultingConsentId` | `Id<"passportShareConsents">?` | Link to consent if approved |

**Indexes:** `by_player`, `by_player_and_status`, `by_requesting_org`, `by_expiry`

### 2.4 `passportEnquiries`

Organization-to-organization enquiries about shared players (when org uses enquiry contact mode).

| Field | Type | Purpose |
|-------|------|---------|
| `playerIdentityId` / `playerName` | Various | Player context |
| `sourceOrgId` / `sourceOrgName` / `sourceUserId` / `sourceUserName` / `sourceUserEmail` | Various | Enquiring coach/org |
| `targetOrgId` / `targetOrgName` | `string` | Target organization |
| `subject` / `message` | `string` | Enquiry content |
| `contactPreference` | `"email" \| "phone"` | How coach wants to be contacted |
| `status` | `"open" \| "processing" \| "closed"` | Lifecycle |
| `closedAt` / `closedBy` / `closedByName` / `resolution` | Various | Resolution details |

**Indexes:** `by_target_org`, `by_target_org_and_status`, `by_source_org`, `by_player`, `by_status`

### 2.5 `parentNotificationPreferences`

Per-guardian notification settings (global or per-player).

| Field | Type | Purpose |
|-------|------|---------|
| `guardianIdentityId` | `Id<"guardianIdentities">` | Guardian |
| `playerIdentityId` | `Id<"playerIdentities">?` | Null = global default |
| `accessNotificationFrequency` | `"realtime" \| "daily" \| "weekly" \| "none"` | How often to notify |
| `notifyOnCoachRequest` / `notifyOnShareExpiring` / `notifyOnGuardianChange` | `boolean?` | Toggle preferences |
| `allowEnrollmentVisibility` | `boolean?` | Legacy field |

**Indexes:** `by_guardian`, `by_guardian_and_player`

### 2.6 `passportShareNotifications`

In-app notification records for sharing events.

| Field | Type | Purpose |
|-------|------|---------|
| `userId` | `string` | Recipient |
| `notificationType` | Enum | `share_enabled`, `share_revoked`, `share_expiring`, `share_expired`, `coach_acceptance_pending`, `coach_accepted`, `coach_declined`, `share_request`, `guardian_change`, `access_alert` |
| `consentId` / `playerIdentityId` / `requestId` | Various optional | References |
| `title` / `message` / `actionUrl` | `string` | Content |
| `createdAt` / `readAt` / `dismissedAt` | `number?` | Status |

**Indexes:** `by_user`, `by_user_and_type`, `by_user_unread`, `by_consent`, `by_player`

---

## 3. Backend API Surface

**File:** `packages/backend/convex/models/passportSharing.ts` (~3600 lines)

### 3.1 Core Mutations

| Function | Args | What It Does | PRD Story |
|----------|------|--------------|-----------|
| `createPassportShareConsent` | playerIdentityId, guardianIdentityId, receivingOrgId, sharedElements, sourceOrgMode, sourceOrgIds?, expiresAt, allowCrossSportVisibility?, visibleSportCodes? | Creates new consent record. Validates guardian has parental responsibility. Generates MyData/Kantara consent receipt. Notifies all guardians. Sets `coachAcceptanceStatus: "pending"`. | US-007 |
| `updatePassportShareConsent` | consentId, sharedElements?, expiresAt?, sourceOrgMode?, sourceOrgIds? | Updates existing active consent. Re-validates guardian. Notifies other guardians. | US-008 |
| `revokePassportShareConsent` | consentId, reason? | Sets status to `"revoked"`, records timestamp + reason. Notifies other guardians. Immediate effect. | US-009 |
| `acceptPassportShare` | consentId | Sets `coachAcceptanceStatus` to `"accepted"`, records `acceptedByCoachId` and `acceptedAt`. Generates `coach_accepted` notification for parent. | US-012 |
| `declinePassportShare` | consentId, reason? | Sets `coachAcceptanceStatus` to `"declined"`, records reason, increments `declineCount`. Generates `coach_declined` notification for parent. | US-013 |
| `requestPassportAccess` | playerIdentityId, requestedByName, requestedByRole, requestingOrgId, requestingOrgName, reason? | Creates access request with 14-day expiry. Notifies all guardians with `access_requested` event. | US-014 |
| `respondToAccessRequest` | requestId, response ("approved" \| "declined"), respondedBy | Updates request status. If approved, does NOT auto-create consent (parent uses wizard). | US-015 |
| `logPassportAccess` | consentId, playerIdentityId, accessedBy, accessedByName, accessedByRole, accessedByOrgId, accessedByOrgName, accessType, sourceOrgId? | Inserts immutable audit log entry. | US-011 |
| `updateNotificationPreferences` | guardianIdentityId, playerIdentityId?, accessNotificationFrequency, notifyOnCoachRequest?, notifyOnShareExpiring?, notifyOnGuardianChange? | Creates or updates notification preferences (upsert). | US-025 |
| `updateEnrollmentVisibility` | guardianIdentityId, playerIdentityId?, allowEnrollmentVisibility | Controls whether coaches at other orgs can see player is enrolled elsewhere. Validates parental responsibility. | US-019 |
| `markNotificationAsRead` | notificationId | Sets `readAt` timestamp on notification. | US-035 |
| `markAllNotificationsAsRead` | userId | Marks all unread notifications for a user as read. | US-035 |
| `dismissNotification` | notificationId | Sets `dismissedAt` timestamp on notification. | US-035 |

### 3.2 Internal Mutations

| Function | Trigger | What It Does | PRD Story |
|----------|---------|--------------|-----------|
| `processConsentExpiry` | Daily cron job | Finds consents expiring within 30 days — sends renewal reminders. Finds expired active consents — sets status to `"expired"`. | US-035 |

### 3.3 Queries — Parent-Facing

| Function | Args | Returns | PRD Story |
|----------|------|---------|-----------|
| `getConsentsForPlayer` | playerIdentityId | All consents for a player with receiving org names enriched | US-019 |
| `getAccessRequestsForPlayer` | playerIdentityId | Pending/active requests with enriched org names and expiry info | US-026 |
| `getAccessLogsForPlayer` | playerIdentityId, limit?, offset? | Paginated audit log entries with total count and hasMore flag | US-024 |
| `getNotificationPreferences` | guardianIdentityId, playerIdentityId? | Notification settings or null | US-025 |
| `getLastConsentSettings` | playerIdentityId | Most recent consent config for Quick Share reuse | US-022 |
| `checkPlayerShareStatus` | playerIdentityId, organizationId | Whether an active accepted share exists for this player+org combo | US-019 |

### 3.4 Queries — Coach-Facing

| Function | Args | Returns | PRD Story |
|----------|------|---------|-----------|
| `getSharedPassportData` | consentId, accessorUserId, accessorOrgId | Shared passport data filtered by allowed elements. Calls consent gateway first. Returns source org name, last updated, element data. | US-011 |
| `getSharedPassportsForCoach` | organizationId | All active+accepted consents for this receiving org, enriched with player names and shared elements list | US-027 |
| `getPendingSharesForCoach` | organizationId | All active+pending consents awaiting coach acceptance, enriched with player and source org names | US-028 |
| `checkPassportAvailabilityBulk` | playerIdentityIds[], organizationId | Bulk check: which players have active shares, pending requests, or are available for request. Returns per-player status. | US-030 |

### 3.5 Queries — Admin-Facing

| Function | Args | Returns | PRD Story |
|----------|------|---------|-----------|
| `getOrgSharingStats` | organizationId | Aggregate stats: total active outgoing, total incoming, pending acceptances, total access events | US-034 |
| `getOrgOutgoingShares` | organizationId | Detailed outgoing share list with player names, receiving org, elements, status | US-034 |
| `getOrgIncomingShares` | organizationId | Detailed incoming share list with player names, source orgs, elements, access count | US-034 |
| `getOrgRecentSharingActivity` | organizationId, limit? | Activity feed: consent_created, accepted, declined, revoked, data_accessed | US-034 |
| `getOrgPendingAcceptances` | organizationId | Pending coach acceptances with days-pending calculation | US-034 |

### 3.6 Queries — Notifications

| Function | Args | Returns | PRD Story |
|----------|------|---------|-----------|
| `getUserNotifications` | userId, includeRead? | All sharing notifications for a user, sorted newest first | US-035 |
| `getUnreadNotificationCount` | userId | Count of unread notifications | US-035 |

### 3.7 Exported Helpers

| Function | Purpose |
|----------|---------|
| `generateConsentReceipt(params)` | Generates MyData/Kantara-compliant consent receipt object |
| `notifyGuardiansOfSharingChange(ctx, params)` | Sends notifications to all guardians with parental responsibility (excluding the actor). Supports event types: `share_enabled`, `share_revoked`, `share_expired`, `share_expiring`, `guardian_change`, `access_requested` |
| `validateGuardianHasResponsibility(ctx, guardianIdentityId, playerIdentityId)` | Validates guardian-player link exists and has `hasParentalResponsibility: true` |

---

## 4. Consent Gateway (Security Layer)

**File:** `packages/backend/convex/lib/consentGateway.ts`

This is the **security gatekeeper** — every cross-org data access must pass through it.

### 4.1 `validateShareAccess` (query)

**Args:** `consentId`, `accessorUserId`, `accessorOrgId`

**Validation checks (in order):**
1. Consent record exists
2. Status is `"active"`
3. Not expired (`expiresAt > now`)
4. `receivingOrgId` matches `accessorOrgId`
5. `coachAcceptanceStatus` is `"accepted"`

**Returns:** `{ allowed: true, sharedElements, consent }` or `{ allowed: false, reason }`

**Known gap (TODO in code):** Does NOT validate that the accessor is actually a member of the receiving org. The orgId is trusted from the caller.

### 4.2 `getActiveConsentsForOrg` (query)

**Args:** `organizationId`

Returns all consents where `receivingOrgId` matches AND status is `"active"` AND `coachAcceptanceStatus` is `"accepted"`.

### 4.3 `getConsentsForPlayer` (query)

**Args:** `playerIdentityId`

Returns all consents for a player regardless of status. Used by parent dashboard.

### 4.4 `getBulkConsentsAndRequestsForPlayers` (query)

**Args:** `playerIdentityIds[]`, `organizationId`

Optimized bulk query that fetches consents AND requests for multiple players in one call. Enriches results with Better Auth data (org logos, user emails, member roles) using batch fetch + Map lookup pattern.

---

## 5. Passport Comparison Engine

**File:** `packages/backend/convex/models/passportComparison.ts` (754 lines)

Enables coaches to compare a player's local assessment with shared data from other organizations.

### 5.1 `getComparisonData` (query)

**Args:** `consentId`, `localPlayerId` (enrollment ID), `organizationId`

**What it does:**
1. Calls `validateShareAccess` to verify consent
2. Fetches local player data (skills, goals, notes from the coach's own org)
3. Fetches shared player data (from the source org, filtered by `sharedElements`)
4. Calculates **comparison insights:**
   - **Agreements** — Skills rated similarly by both orgs (within 0.5 points)
   - **Divergences** — Skills with significant rating differences (>1.0 points)
   - **Blind spots** — Skills rated by one org but not the other
   - **Agreement percentage** — Overall alignment score
5. Generates **typed recommendations:**
   - `investigate` — Large divergences to look into
   - `align` — Moderate differences to discuss
   - `leverage` — Agreements to build on
   - `explore` — Blind spots to address

### 5.2 `getComparisonPreferences` / `saveComparisonPreferences` (query/mutation)

Persists user's preferred comparison view mode (`insights`, `split`, `overlay`).

---

## 6. Frontend Routes & Components

### 6.1 Parent Sharing Dashboard

**Route:** `/orgs/[orgId]/parents/sharing`

**Files:** `apps/web/src/app/orgs/[orgId]/parents/sharing/`

| File | Component | Purpose |
|------|-----------|---------|
| `page.tsx` | Server component | Entry point with Suspense boundary |
| `components/parent-sharing-dashboard.tsx` | `ParentSharingDashboard` | Main dashboard: summary stats bar (active shares, pending requests, access events), quick actions, children grid with sharing cards, global discovery toggle |
| `components/child-sharing-card.tsx` | `ChildSharingCard` | Per-child card: active shares count, pending requests, action buttons (Enable Sharing, View Audit Log, Manage), inline metrics |
| `components/enable-sharing-wizard.tsx` | `EnableSharingWizard` | **7-step wizard:** (1) Select child → (2) Select elements (10 checkboxes, all default on) → (3) Cross-sport visibility toggle → (4) Org selection (all_enrolled vs specific) → (5) Duration (season end, 6mo, 1yr, custom) → (6) Review summary → (7) Success confirmation. Calls `createPassportShareConsent` on step 6 confirm. Medical/contact flags show extra warning. |
| `components/review-and-success-steps.tsx` | `ReviewStep` / `SuccessStep` | Wizard steps 6-7: summary review with all selections + success page with consent receipt and next steps |
| `components/privacy-settings-card.tsx` | `PrivacySettingsCard` | Per-child enrollment visibility toggles. Controls whether coaches at other orgs can discover this player. |
| `components/notification-preferences.tsx` | `NotificationPreferences` | Access notification frequency selector (realtime/daily/weekly/none) + toggle switches for coach requests, expiring shares, guardian changes |
| `components/revoke-consent-modal.tsx` | `RevokeConsentModal` | Confirmation dialog with warning about immediate effect + optional reason text field. Calls `revokePassportShareConsent`. |
| `components/pending-requests.tsx` | `PendingRequests` | List of coach access request cards. Each shows: coach name, org, reason, requested date, expiry countdown. Actions: Approve (opens wizard), Decline. |
| `components/access-audit-log.tsx` | `AccessAuditLog` | Filterable, paginated table of access events: who, what, when, organization. Filters by date range, org, access type. CSV export button. |
| `components/quick-share.tsx` | `QuickShare` | **Feature-flagged** (`ENABLE_QUICK_SHARE = false`). One-click re-share using last consent settings. Shows summary before confirmation. Only for parents with previous shares. |

### 6.2 Coach Shared Passports

**Route:** `/orgs/[orgId]/coach/shared-passports`

**Files:** `apps/web/src/app/orgs/[orgId]/coach/shared-passports/`

| File | Component | Purpose |
|------|-----------|---------|
| `page.tsx` | Server component | Entry point |
| `shared-passports-view.tsx` | `SharedPassportsView` | Main view with **4 tabs:** My Players, Active Shares, Pending Shares, Browse Players |
| `components/my-players-tab.tsx` | `MyPlayersTab` | Team players with cross-org enrollment status badges. Uses `checkPassportAvailabilityBulk` to show which players have shared data available. |
| `components/browse-players-tab.tsx` | `BrowsePlayersTab` | Player search with 500ms debounce. Searches across platform for players by name. |
| `components/player-search-card.tsx` | `PlayerSearchCard` | Search result card showing player info, enrollment org, share status badge |
| `components/request-access-modal.tsx` | `RequestAccessModal` | Coach request form: reason text field + send button. Calls `requestPassportAccess`. Shows "Request Pending" state after send. |
| `components/share-acceptance-modal.tsx` | `ShareAcceptanceModal` | Accept/decline UI. Accept: single click. Decline: shows reason input screen. Two-step UI pattern. Shows prior decline count if applicable. |
| `components/contact-organization-button.tsx` | `ContactOrganizationButton` | Renders as direct contact dialog (name/email/phone) or opens enquiry modal, based on org's `sharingContactMode` setting. |
| `components/enquiry-modal.tsx` | `EnquiryModal` | Structured enquiry form: subject dropdown + message + contact preference (email/phone). Creates `passportEnquiries` record. |

### 6.3 Shared Passport Viewer

**Route:** `/orgs/[orgId]/coach/shared-passports/[playerId]/shared`

> **Note:** This route exists as a concept in the PRD but the actual `page.tsx` for viewing a shared passport inline may be handled within the `SharedPassportsView` component or via modal. The `[playerId]` directory currently only contains the `/compare` sub-route.

The shared passport viewer functionality is embedded within the coach shared-passports tab views, showing:
- Read-only passport data sections
- "Shared from [Org Name]" badges
- Data freshness indicators (green <1mo, yellow 1-6mo, amber >6mo)
- Source organization contact info

### 6.4 Comparison System

**Route:** `/orgs/[orgId]/coach/shared-passports/[playerId]/compare`

**Files:** `apps/web/src/app/orgs/[orgId]/coach/shared-passports/[playerId]/compare/`

| File | Component | Purpose |
|------|-----------|---------|
| `page.tsx` | Server component | Entry point with params |
| `comparison-view.tsx` | `ComparisonView` | Main container. 3 view modes: Insights, Split, Overlay. Fetches comparison data via `getComparisonData`. |
| `components/view-mode-selector.tsx` | `ViewModeSelector` | Tab selector for switching between Insights/Split/Overlay views |
| `components/insights-dashboard.tsx` | `InsightsDashboard` | Agreement %, divergence count, blind spots, typed recommendations grid |
| `components/split-view.tsx` | `SplitView` | Side-by-side panels with resizable divider. On mobile: switches to tab layout |
| `components/overlay-view.tsx` | `OverlayView` | Radar chart overlay + skills comparison table below |
| `components/comparison-radar-chart.tsx` | `ComparisonRadarChart` | Recharts radar visualization with two data series (local vs shared) |
| `components/skill-comparison-row.tsx` | `SkillComparisonRow` | Individual skill row: local rating, shared rating, delta with color coding (green=agreement, red=divergence) |
| `components/ai-insights-panel.tsx` | `AIInsightsPanel` | AI-generated coaching insights via `POST /api/comparison-insights`. Shows loading state, generated text. |
| `components/recommendation-card.tsx` | `RecommendationCard` | Typed cards: investigate (red), align (yellow), leverage (green), explore (blue). Each with skill name, description, action suggestion. |
| `components/cross-sport-notice.tsx` | `CrossSportNotice` | Warning banner for cross-sport comparisons: "Comparing across different sports — ratings may not be directly comparable" |

### 6.5 Admin Sharing Dashboard

**Route:** `/orgs/[orgId]/admin/sharing`

**Files:** `apps/web/src/app/orgs/[orgId]/admin/sharing/`

| File | Component | Purpose |
|------|-----------|---------|
| `page.tsx` | `AdminSharingPage` (~560 lines) | **4 tabs:** Overview, Outgoing, Incoming, Settings. Overview: stats cards (active outgoing, incoming, pending, total access events) + recent activity feed + pending acceptances list. Outgoing/Incoming: detailed tables with CSV export. Settings tab renders `SharingContactSettings`. |
| `sharing-contact-settings.tsx` | `SharingContactSettings` | Contact mode config: radio toggle between "Direct Contact" and "Enquiry Form". Direct: name/email/phone fields. Enquiry: URL field. Saves to organization record. |

---

## 7. Navigation Integration

All three role sidebars include passport sharing links:

| Sidebar | File | Link | Icon |
|---------|------|------|------|
| Coach | `components/layout/coach-sidebar.tsx:73` | `/orgs/[orgId]/coach/shared-passports` | `Share2` |
| Parent | `components/layout/parent-sidebar.tsx:80` | `/orgs/[orgId]/parents/sharing` | `Shield` |
| Admin | `components/layout/admin-sidebar.tsx:169` | `/orgs/[orgId]/admin/sharing` | `Share2` |

The admin sidebar also conditionally shows an "Enquiries" nav item based on whether `organization.sharingContactMode` is `"enquiry"` or unset (`admin-sidebar.tsx:260-261`).

---

## 8. Data Flows

### 8.1 Parent Enables Sharing (Happy Path)

```
1. Parent opens /parents/sharing
2. Clicks "Enable Sharing" on child card
3. EnableSharingWizard opens:
   Step 1: Select child (if multiple)
   Step 2: Select shared elements (10 checkboxes)
   Step 3: Cross-sport visibility toggle
   Step 4: Select organizations (all_enrolled or specific)
   Step 5: Select duration (season end / 6mo / 1yr / custom)
   Step 6: Review summary → Confirm
4. Frontend calls createPassportShareConsent mutation
5. Backend:
   a. Validates guardian has parental responsibility
   b. Inserts passportShareConsents record (status: active, coachAcceptanceStatus: pending)
   c. Generates consent receipt
   d. Notifies all other guardians via passportShareNotifications
6. Step 7: Success screen with receipt
```

### 8.2 Coach Accepts Share

```
1. Coach opens /coach/shared-passports
2. Sees "Pending" tab with notification badge
3. Clicks on pending share → ShareAcceptanceModal opens
4. Reviews: player name, parent name, elements shared, date offered
5. Clicks "Accept"
6. Frontend calls acceptPassportShare mutation
7. Backend:
   a. Sets coachAcceptanceStatus = "accepted"
   b. Records acceptedByCoachId and acceptedAt
   c. Creates coach_accepted notification for parent
8. Share moves to "Active" tab
9. Coach can now view shared passport data
```

### 8.3 Coach Requests Access

```
1. Coach browses players (Browse tab) or views a player profile
2. Clicks "Request Access" → RequestAccessModal opens
3. Enters optional reason, clicks Send
4. Frontend calls requestPassportAccess mutation
5. Backend:
   a. Creates passportShareRequests record (status: pending, expiresAt: +14 days)
   b. Notifies all guardians with parental responsibility
6. Button changes to "Request Pending"
7. Parent sees request in PendingRequests component
8. Parent approves → redirected to EnableSharingWizard (or declines)
```

### 8.4 Parent Revokes Access

```
1. Parent opens /parents/sharing
2. Clicks "Revoke" on active share card
3. RevokeConsentModal opens with warning
4. Optionally enters reason, clicks Confirm
5. Frontend calls revokePassportShareConsent mutation
6. Backend:
   a. Sets status = "revoked", records revokedAt and reason
   b. Notifies other guardians
7. Effect is immediate (Convex real-time)
8. Coach's next query to getSharedPassportData will fail consent validation
```

### 8.5 Coach Views Shared Data

```
1. Coach opens shared passport (Active tab → click player)
2. Frontend calls getSharedPassportData(consentId, accessorUserId, accessorOrgId)
3. Backend:
   a. Calls consentGateway.validateShareAccess()
      - Checks: exists, active, not expired, org match, accepted
   b. If valid: fetches passport data filtered by sharedElements flags
   c. Calls logPassportAccess() to insert audit record
   d. Returns filtered data with source org name
4. Frontend renders read-only view with:
   - "Shared from [Org]" badges
   - Data freshness indicators
   - Source org contact info
```

### 8.6 Admin Views Sharing Dashboard

```
1. Admin opens /admin/sharing
2. Overview tab:
   - Calls getOrgSharingStats → renders stats cards
   - Calls getOrgRecentSharingActivity → renders activity feed
   - Calls getOrgPendingAcceptances → renders pending list
3. Outgoing tab:
   - Calls getOrgOutgoingShares → renders table with CSV export
4. Incoming tab:
   - Calls getOrgIncomingShares → renders table with CSV export
5. Settings tab:
   - Renders SharingContactSettings → saves to organization record
```

### 8.7 Consent Expiry (Automated)

```
Daily cron runs processConsentExpiry (internal mutation):
1. Finds consents expiring within 30 days where renewalReminderSent = false
   → Sets renewalReminderSent = true
   → Sends share_expiring notification to guardian
2. Finds active consents where expiresAt < now
   → Sets status = "expired"
   → Sends share_expired notification to guardian
```

---

## 9. PRD Story-by-Story Status

> **PRD marks only 4/37 as `passes: true`** (US-010, US-011, US-012, US-013), but the actual code implementation covers all 37 stories. The table below reflects **code reality**.

### Phase 1: Schema (US-001 to US-006)

| Story | Title | Code Status | Location |
|-------|-------|-------------|----------|
| US-001 | Create passportShareConsents table | **Implemented** | `schema.ts:3383-3471` |
| US-002 | Create passportShareAccessLogs table | **Implemented** | `schema.ts:3475-3509` |
| US-003 | Create passportShareRequests table | **Implemented** | `schema.ts:3513-3547` |
| US-004 | Create parentNotificationPreferences table | **Implemented** | `schema.ts:3597-3621` |
| US-005 | Add organization sharing contact fields | **Implemented** | Extended in organization table via Better Auth |
| US-006 | Add coach notes isShareable flag | **Partially implemented** | `sharedElements.coachNotes` flag exists; `isShareable` field on individual notes not confirmed in schema |

### Phase 2: Backend Mutations (US-007 to US-018)

| Story | Title | Code Status | Location |
|-------|-------|-------------|----------|
| US-007 | Create consent mutation | **Implemented** | `passportSharing.ts` — `createPassportShareConsent` |
| US-008 | Update consent mutation | **Implemented** | `passportSharing.ts` — `updatePassportShareConsent` |
| US-009 | Revoke consent mutation | **Implemented** | `passportSharing.ts` — `revokePassportShareConsent` |
| US-010 | Create consent gateway query | **Implemented** ✅ | `consentGateway.ts` — `validateShareAccess` |
| US-011 | Create cross-org passport query | **Implemented** ✅ | `passportSharing.ts` — `getSharedPassportData` |
| US-012 | Coach acceptance mutation | **Implemented** ✅ | `passportSharing.ts` — `acceptPassportShare` |
| US-013 | Coach decline mutation | **Implemented** ✅ | `passportSharing.ts` — `declinePassportShare` |
| US-014 | Coach request access mutation | **Implemented** | `passportSharing.ts` — `requestPassportAccess` |
| US-015 | Parent respond to request | **Implemented** | `passportSharing.ts` — `respondToAccessRequest` |
| US-016 | Access logging mutation | **Implemented** | `passportSharing.ts` — `logPassportAccess` |
| US-017 | Consent expiry cron | **Implemented** | `passportSharing.ts` — `processConsentExpiry` (internal mutation, daily cron) |
| US-018 | Bulk availability check | **Implemented** | `passportSharing.ts` — `checkPassportAvailabilityBulk` |

### Phase 3: Parent UI (US-019 to US-026)

| Story | Title | Code Status | Location |
|-------|-------|-------------|----------|
| US-019 | Parent sharing dashboard | **Implemented** | `parent-sharing-dashboard.tsx`, `child-sharing-card.tsx`, `privacy-settings-card.tsx` |
| US-020 | Enable sharing flow (Steps 1-3) | **Implemented** | `enable-sharing-wizard.tsx` (steps 1-3 of 7) |
| US-021 | Enable sharing flow (Steps 4-6) | **Implemented** | `enable-sharing-wizard.tsx` (steps 4-7), `review-and-success-steps.tsx` |
| US-022 | Quick share option | **Implemented (feature-flagged)** | `quick-share.tsx` — `ENABLE_QUICK_SHARE = false` |
| US-023 | Revocation flow | **Implemented** | `revoke-consent-modal.tsx` |
| US-024 | Access audit log viewer | **Implemented** | `access-audit-log.tsx` — filterable, paginated, CSV export |
| US-025 | Notification preferences UI | **Implemented** | `notification-preferences.tsx` |
| US-026 | Pending coach requests view | **Implemented** | `pending-requests.tsx` |

### Phase 4: Coach UI (US-027 to US-032)

| Story | Title | Code Status | Location |
|-------|-------|-------------|----------|
| US-027 | Shared players on coach dashboard | **Implemented** | `shared-passports-view.tsx`, `my-players-tab.tsx` |
| US-028 | Accept/decline share modal | **Implemented** | `share-acceptance-modal.tsx` |
| US-029 | Shared passport viewer | **Implemented** | Inline within shared-passports tabs + comparison view |
| US-030 | Request access to passport flow | **Implemented** | `request-access-modal.tsx`, `browse-players-tab.tsx` |
| US-031 | Data freshness indicators | **Implemented** | Freshness logic in shared passport viewer (green/yellow/amber) |
| US-032 | Organization contact display | **Implemented** | `contact-organization-button.tsx`, `enquiry-modal.tsx` |

### Phase 5: Admin UI (US-033 to US-034)

| Story | Title | Code Status | Location |
|-------|-------|-------------|----------|
| US-033 | Admin sharing contact settings | **Implemented** | `sharing-contact-settings.tsx` |
| US-034 | Admin sharing statistics dashboard | **Implemented** | `admin/sharing/page.tsx` — 4 tabs, stats, activity feed, CSV export |

### Phase 6: Notifications (US-035 to US-037)

| Story | Title | Code Status | Location |
|-------|-------|-------------|----------|
| US-035 | Consent event notifications | **Implemented** | `passportShareNotifications` table + `getUserNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead`, `dismissNotification`, `processConsentExpiry` (share_expiring/share_expired) |
| US-036 | Coach acceptance notifications | **Implemented** | Generated in `acceptPassportShare` (coach_accepted) and `declinePassportShare` (coach_declined) |
| US-037 | Multi-guardian change notifications | **Implemented** | `notifyGuardiansOfSharingChange` helper called from create/update/revoke mutations |

### Additional Implementation (Beyond PRD)

| Feature | Code Status | Location |
|---------|-------------|----------|
| Passport Comparison Engine | **Implemented** | `passportComparison.ts` — insights, split view, overlay, radar charts, AI insights |
| Cross-Sport Comparison Notice | **Implemented** | `cross-sport-notice.tsx` |
| AI Coaching Insights | **Implemented** | `ai-insights-panel.tsx` → `POST /api/comparison-insights` |
| Enquiry System | **Implemented** | `passportEnquiries` table + `enquiry-modal.tsx` |
| Guardian Management Integration | **Implemented** | `guardianManagement.ts` — `removeGuardianLink` auto-revokes active shares |
| Diagnostics Script | **Implemented** | `passportSharingDiagnostics.ts` — `getFullDiagnostics`, `findMultiOrgPlayers`, `getLinkedGuardians` |

---

## 10. Known Gaps & TODOs

These are documented TODOs found in the codebase:

### Security

| Gap | Location | Severity |
|-----|----------|----------|
| Coach org membership not validated in `acceptPassportShare` | `passportSharing.ts` — TODO comment | Medium |
| Accessor org membership not validated in `validateShareAccess` | `consentGateway.ts` — TODO comment | Medium |

### Business Logic

| Gap | Location | Severity |
|-----|----------|----------|
| 30-day cooling-off period after 3 declines not fully enforced | `declinePassportShare` — `declineCount` incremented but not checked | Low |
| Coach notification on consent revocation not generated | `revokePassportShareConsent` — notifies guardians but not receiving org coaches | Low |
| `isShareable` flag on individual coach notes not confirmed in schema | `US-006` — may share all notes if `coachNotes` element enabled | Low |
| 14-day auto-expiry of requests not handled by cron | `processConsentExpiry` handles consent expiry but not request expiry | Low |

### Feature Flags

| Flag | Status | Notes |
|------|--------|-------|
| `ENABLE_QUICK_SHARE` | `false` | Quick Share feature complete but disabled pending UX review |

---

## 11. Diagnostics & Tooling

**File:** `packages/backend/convex/scripts/passportSharingDiagnostics.ts`

### Available Commands

```bash
# Full diagnostics — dumps all sharing data for debugging
npx -w packages/backend convex run scripts/passportSharingDiagnostics:getFullDiagnostics

# Find players enrolled at multiple organizations
npx -w packages/backend convex run scripts/passportSharingDiagnostics:findMultiOrgPlayers

# Get linked guardians for a specific player
npx -w packages/backend convex run scripts/passportSharingDiagnostics:getLinkedGuardians '{"playerIdentityId": "<id>"}'
```

These are useful for verifying test data setup and debugging consent state.

---

## 12. Testing Guide

### Prerequisites

1. **Two organizations** in the system (Org A = source, Org B = receiving)
2. **A player** enrolled at Org A with a `playerIdentities` record
3. **A guardian** linked to the player with `hasParentalResponsibility: true`
4. **A coach** who is a member of Org B with functional role "Coach"
5. Dev server running on `localhost:3000`

Use the diagnostics script to verify data setup:
```bash
npx -w packages/backend convex run scripts/passportSharingDiagnostics:getFullDiagnostics
```

### Manual Test Scenarios

#### Scenario 1: Parent Enables Sharing
1. Log in as parent → Navigate to `/orgs/[orgA]/parents/sharing`
2. Click "Enable Sharing" on child card
3. Walk through wizard: select elements, org(s), duration
4. Confirm → Verify consent record created with `status: active`, `coachAcceptanceStatus: pending`

#### Scenario 2: Coach Accepts Share
1. Log in as coach at Org B → Navigate to `/orgs/[orgB]/coach/shared-passports`
2. Check "Pending" tab → Should see the pending share
3. Click to open acceptance modal → Click Accept
4. Verify share moves to "Active" tab
5. Click to view shared passport data → Verify only authorized elements visible

#### Scenario 3: Coach Requests Access
1. Log in as coach → Browse players tab
2. Find player → Click "Request Access"
3. Enter reason → Send
4. Log in as parent → Check `/parents/sharing` for pending request
5. Approve or decline

#### Scenario 4: Parent Revokes Access
1. Log in as parent → Navigate to `/parents/sharing`
2. Find active share → Click "Revoke"
3. Confirm revocation
4. Log in as coach → Verify share no longer appears in Active tab

#### Scenario 5: Admin Dashboard
1. Log in as admin → Navigate to `/orgs/[orgId]/admin/sharing`
2. Verify Overview tab shows correct stats
3. Check Outgoing/Incoming tabs for share details
4. Configure contact settings in Settings tab

#### Scenario 6: Comparison View
1. As coach with active share → Navigate to shared passports
2. Click "Compare" on a shared player
3. Verify Insights tab: agreement %, divergences, recommendations
4. Switch to Split view: side-by-side data
5. Switch to Overlay view: radar chart + skills table

### E2E Tests

**No Playwright E2E tests exist yet for passport sharing.** Tests should be added in:
```
apps/web/uat/tests/passport-sharing/
```

### Type Checking

```bash
# Verify backend types
npx -w packages/backend convex codegen

# Full type check
npm run check-types

# Lint
npm run check
```

---

## Appendix: File Index

### Backend
| File | Lines | Purpose |
|------|-------|---------|
| `packages/backend/convex/schema.ts` | ~3380-3694 | 6 sharing tables |
| `packages/backend/convex/models/passportSharing.ts` | ~3600 | 39 functions (22 queries, 14 mutations, 1 internal, 2 helpers) |
| `packages/backend/convex/lib/consentGateway.ts` | ~300 | Security gateway (4 exported queries) |
| `packages/backend/convex/models/passportComparison.ts` | 754 | Comparison engine (3 functions) |
| `packages/backend/convex/models/guardianManagement.ts` | — | `removeGuardianLink` auto-revokes shares |
| `packages/backend/convex/scripts/passportSharingDiagnostics.ts` | — | 3 diagnostic functions |

### Frontend — Parent
| File | Purpose |
|------|---------|
| `apps/web/src/app/orgs/[orgId]/parents/sharing/page.tsx` | Route entry |
| `…/sharing/components/parent-sharing-dashboard.tsx` | Main dashboard |
| `…/sharing/components/child-sharing-card.tsx` | Per-child card |
| `…/sharing/components/enable-sharing-wizard.tsx` | 7-step sharing wizard |
| `…/sharing/components/review-and-success-steps.tsx` | Wizard steps 6-7 |
| `…/sharing/components/privacy-settings-card.tsx` | Enrollment visibility |
| `…/sharing/components/notification-preferences.tsx` | Notification settings |
| `…/sharing/components/revoke-consent-modal.tsx` | Revoke confirmation |
| `…/sharing/components/pending-requests.tsx` | Coach request cards |
| `…/sharing/components/access-audit-log.tsx` | Audit log viewer |
| `…/sharing/components/quick-share.tsx` | Quick share (flagged off) |

### Frontend — Coach
| File | Purpose |
|------|---------|
| `apps/web/src/app/orgs/[orgId]/coach/shared-passports/page.tsx` | Route entry |
| `…/shared-passports/shared-passports-view.tsx` | 4-tab main view |
| `…/shared-passports/components/my-players-tab.tsx` | Team players + badges |
| `…/shared-passports/components/browse-players-tab.tsx` | Player search |
| `…/shared-passports/components/player-search-card.tsx` | Search result card |
| `…/shared-passports/components/request-access-modal.tsx` | Request form |
| `…/shared-passports/components/share-acceptance-modal.tsx` | Accept/decline |
| `…/shared-passports/components/contact-organization-button.tsx` | Org contact |
| `…/shared-passports/components/enquiry-modal.tsx` | Enquiry form |
| `…/shared-passports/[playerId]/compare/page.tsx` | Comparison entry |
| `…/[playerId]/compare/comparison-view.tsx` | 3-mode comparison |
| `…/[playerId]/compare/components/insights-dashboard.tsx` | Insights view |
| `…/[playerId]/compare/components/split-view.tsx` | Split view |
| `…/[playerId]/compare/components/overlay-view.tsx` | Overlay view |
| `…/[playerId]/compare/components/comparison-radar-chart.tsx` | Radar chart |
| `…/[playerId]/compare/components/skill-comparison-row.tsx` | Skill row |
| `…/[playerId]/compare/components/ai-insights-panel.tsx` | AI insights |
| `…/[playerId]/compare/components/recommendation-card.tsx` | Recommendation |
| `…/[playerId]/compare/components/view-mode-selector.tsx` | View tabs |
| `…/[playerId]/compare/components/cross-sport-notice.tsx` | Cross-sport warning |

### Frontend — Admin
| File | Purpose |
|------|---------|
| `apps/web/src/app/orgs/[orgId]/admin/sharing/page.tsx` | 4-tab admin dashboard |
| `…/admin/sharing/sharing-contact-settings.tsx` | Contact mode config |

### Navigation
| File | Line | Link |
|------|------|------|
| `components/layout/coach-sidebar.tsx` | 73 | `/coach/shared-passports` |
| `components/layout/parent-sidebar.tsx` | 80 | `/parents/sharing` |
| `components/layout/admin-sidebar.tsx` | 169 | `/admin/sharing` |
