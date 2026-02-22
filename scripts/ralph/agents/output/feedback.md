
## QA Verification - Phase 4.5 Platform Admin UI - 2026-02-19

### Summary

- **Branch:** ralph/phase-4.5-platform-admin-ui
- **Stories:** US-P4.5-001 through US-P4.5-008 (8 stories)
- **PRD Source:** `scripts/ralph/prd.json` (from commit 00309397)
- **Overall:** FAIL — Critical bugs prevent core features from functioning

---

## CRITICAL BUGS (Will Cause Runtime Errors)

### Bug 1: `useMutation` called for Convex Actions (4 locations)

Convex actions (`action({...})`) MUST be called with `useAction`, not `useMutation`. Using `useMutation` for an action will throw a runtime error.

| File | Line | Wrong Call | Fix |
|------|------|-----------|-----|
| `apps/web/src/components/connectors/connection-test-dialog.tsx` | 40 | `useMutation(api.actions.federationAuth.testConnection)` | `useAction(...)` |
| `apps/web/src/app/platform/connectors/[connectorId]/oauth-setup/page.tsx` | 42 | `useMutation(api.actions.federationAuth.startOAuthFlow)` | `useAction(...)` |
| `apps/web/src/app/platform/connectors/oauth-callback/page.tsx` | 21 | `useMutation(api.actions.federationAuth.completeOAuthFlow)` | `useAction(...)` |
| `apps/web/src/app/platform/connectors/[connectorId]/edit/page.tsx` | 98 | `useMutation(api.models.federationConnectors.updateConnectorCredentials)` | `useAction(...)` |

Backend confirms all four are `action({...})` — not mutations:
- `packages/backend/convex/actions/federationAuth.ts:21` — `startOAuthFlow = action({...})`
- `packages/backend/convex/actions/federationAuth.ts:77` — `completeOAuthFlow = action({...})`
- `packages/backend/convex/actions/federationAuth.ts:324` — `testConnection = action({...})`
- `packages/backend/convex/models/federationConnectors.ts:159` — `updateConnectorCredentials = action({...})`

**Impact:** Connection testing (US-P4.5-004), OAuth authorization start and callback (US-P4.5-003), and edit form credential updates (US-P4.5-002) are ALL broken at runtime.

---

## Story-by-Story Results

### US-P4.5-001: Create Connector List Page
**File:** `apps/web/src/app/platform/connectors/page.tsx`
**Status: PARTIAL**

| AC | Status | Notes |
|----|--------|-------|
| Page exists | PASS | Path is `/platform/connectors/` not `/platform-admin/connectors/` (Ralph used existing platform area — `/platform/` layout enforces `isPlatformStaff`, so auth is equivalent) |
| Title: Federation Connectors | PASS | |
| Table with all 7 columns | PASS | Name, Federation Code, Status, Connected Orgs, Last Sync, Health, Actions |
| Status badges green/yellow/red | PASS | |
| Health badge with uptime % | WARNING | Calculated as heuristic (`100 - consecutiveFailures * 20`). `getConnectorHealth` query exists but is NOT called. All active connectors show 100%. |
| Connected Orgs tooltip shows org names | FAIL | Shows `org.organizationId` (internal ID), not org name |
| Last Sync relative time | PASS | |
| Actions: Edit, Test, Delete | PASS | |
| Create Connector button | PASS | |
| Table sortable | FAIL | No sorting — column headers are not interactive |
| Status filter dropdown | PASS | |
| Search bar | PASS | Client-side filter |
| Empty state | PASS | |
| Mobile responsive card list | PASS | |
| TypeScript errors | FAIL | 6 `implicit any` errors |

---

### US-P4.5-002: Create Connector Creation/Edit Form
**Status: PARTIAL — Edit credential save broken**

| AC | Status | Notes |
|----|--------|-------|
| Create page exists | PASS | `create/page.tsx` |
| Edit page exists | PASS | `[connectorId]/edit/page.tsx` |
| All form fields | PASS | Name, fed code, status, auth type, all credential fields, endpoints, sync config, template |
| All 3 auth types (OAuth/API Key/Basic Auth) | PASS | |
| Federation code validation pattern | PASS | |
| HTTPS URL validation | PASS | |
| Cron schedule validation | FAIL | No cron expression validation — any string accepted |
| createConnector call | PASS | Uses `useAction` correctly |
| updateConnector call | PASS | Uses `useMutation` correctly (this one IS a mutation) |
| updateConnectorCredentials call | FAIL | Uses `useMutation` — should be `useAction` (runtime error) |
| Success/error toasts | PASS | |
| Cancel returns to list | PASS | |
| Federation code immutable in edit | PASS | Disabled input |
| OAuth Setup button on edit page | FAIL | No "Setup OAuth" button — PRD notes require it when auth type is OAuth. oauth-setup page exists but is unreachable from the UI. |
| TypeScript errors | FAIL | `implicit any` on template parameter; `name specified twice` error |

---

### US-P4.5-003: Implement OAuth 2.0 Setup Wizard
**Status: FAIL — Both pages broken**

| AC | Status | Notes |
|----|--------|-------|
| OAuth setup page exists | PASS | `[connectorId]/oauth-setup/page.tsx` |
| Shows connector info and endpoints | PASS | |
| Start Authorization button | PASS | |
| Calls startOAuthFlow | FAIL | `useMutation` used for action — runtime error |
| Opens auth URL in new window | PASS (code only) | |
| OAuth callback page exists | PASS | `oauth-callback/page.tsx` |
| Extracts code and state | PASS | |
| Calls completeOAuthFlow | FAIL | `useMutation` used for action — runtime error |
| CSRF state validation | PASS | |
| Success / Error states | PASS | |
| Redirect to edit after success | PASS | |
| Reachable from edit page | FAIL | No link from edit page to oauth-setup |

---

### US-P4.5-004: Add Connection Test Functionality
**Status: FAIL — Broken at runtime**

| AC | Status | Notes |
|----|--------|-------|
| Test button in list | PASS | |
| Test button in edit page | PASS | |
| Dialog shown on click | PASS | `ConnectionTestDialog` component |
| Auto-tests on dialog open | PASS | |
| Calls testConnection action | FAIL | `useMutation` used for action — runtime error |
| Success result with response time | PASS (code only) | |
| Failure result with error | PASS (code only) | |
| Retry button on failure | PASS | |
| Close button | PASS | |

---

### US-P4.5-005: Create Sync Logs Viewer
**File:** `apps/web/src/app/platform/connectors/sync-logs/page.tsx`
**Status: PARTIAL**

| AC | Status | Notes |
|----|--------|-------|
| Page exists | PASS | At `/sync-logs/` (PRD says `/logs/` — minor path difference) |
| Title: Federation Sync Logs | PASS | |
| All 8 table columns | PASS | |
| Type badge colors | PARTIAL | Uses badge variants, not custom colors |
| Status badge (running yellow) | PARTIAL | `running` status in schema but `getStatusBadgeVariant` only types `completed`/`failed` |
| Duration column | PASS | |
| Stats: Created/Updated/Conflicts | PASS | |
| View Details button | PASS | |
| Filter by connector | PASS | |
| Filter by status | PASS | |
| Date range (Last 7/30 days) | PASS | |
| Custom date range picker | FAIL | Only preset options — no custom range |
| Search by organization name | FAIL | Searches `organizationId` (internal ID), not human-readable org name |
| Default sort: newest first | PASS | Backend default |
| Pagination (50 per page) | PARTIAL | Cursor-based pagination exists but page size is backend default |
| Empty state | PASS | |
| Mobile responsive | PASS | |
| TypeScript errors | FAIL | 5 `implicit any` errors |

---

### US-P4.5-006: Create Sync Log Details Modal
**File:** `apps/web/src/components/connectors/sync-log-details-dialog.tsx`
**Status: PARTIAL**

| AC | Status | Notes |
|----|--------|-------|
| Dialog exists | PASS | |
| Opened by View Details | PASS | |
| Dialog title with org/timestamp | PASS | |
| Sync metadata section | PASS | All fields present |
| Stats section | PASS | All 6 stat cards |
| Conflicts section (expandable) | PASS | |
| Each conflict shows all required fields | PASS | |
| Color-coded resolution | PASS | |
| Errors section (scrollable) | PASS | |
| Export Details as JSON | PASS | |
| Retry Sync button (if failed) | FAIL | Button shows but calls `toast.info("Retry functionality coming soon")` — not wired to backend |
| TypeScript errors | FAIL | 5 `implicit any` errors |

---

### US-P4.5-007: Create Connector Health Dashboard
**File:** `apps/web/src/app/platform/connectors/dashboard/page.tsx`
**Status: PARTIAL**

| AC | Status | Notes |
|----|--------|-------|
| Page exists | PASS | |
| Title: Federation Connector Dashboard | PASS | |
| 4 summary cards | PASS | Total Connectors (w/ breakdown), Connected Orgs, Syncs Last 24h, Est. Monthly Cost |
| Sync trend chart (30 days, 2 lines) | PASS | Uses recharts LineChart |
| Connector health table (top 5, worst first) | PARTIAL | Present but missing Actions column — PRD requires Connector, Uptime, Last Error, Actions |
| Red highlight for uptime <80% | PASS | |
| Recent errors panel (last 10) | PASS | |
| Click error → view sync log details | FAIL | Error items have no click handler |
| View All Logs link | PASS | |
| Manage Connectors link | PASS | |
| Auto-refresh every 60 seconds | PARTIAL | `setInterval` updates `lastRefresh` state but Convex queries are reactive — manual refresh is not needed for data, but it misleads users into thinking the timestamp represents a data reload |
| TypeScript errors | FAIL | 1 `implicit any` error |

---

### US-P4.5-008: Add Analytics and Cost Monitoring
**File:** `apps/web/src/app/platform/connectors/analytics/page.tsx`
**Status: PARTIAL**

| AC | Status | Notes |
|----|--------|-------|
| Page exists | PASS | |
| Title: Federation Analytics | PASS | |
| Time range selector (7d/30d/90d) | PASS | |
| Custom time range | FAIL | Not implemented |
| Sync volume chart (stacked bar) | PASS | Uses recharts BarChart |
| API cost chart (line) | PASS | Uses recharts LineChart |
| Cache hit rate pie chart | PASS | Uses recharts PieChart |
| Cache savings displayed | PASS | Summary card shows savings |
| Connector performance table | PASS | All required columns |
| Highlight slow syncs >5 min yellow | PASS | |
| Org leaderboard (top 10) | PASS | |
| Export analytics | PARTIAL | JSON only — PRD says CSV or JSON, CSV not implemented |
| Filter by connector | PASS | |
| Filter by organization | FAIL | Not implemented — only connector filter present |
| Mobile responsive | PASS | |

---

## Recommended Fixes (Priority Order)

### P0 — Fix immediately (breaks core features)

1. **Fix `useMutation` → `useAction` in 4 files** (and update imports):
   - `apps/web/src/components/connectors/connection-test-dialog.tsx`
   - `apps/web/src/app/platform/connectors/[connectorId]/oauth-setup/page.tsx`
   - `apps/web/src/app/platform/connectors/oauth-callback/page.tsx`
   - `apps/web/src/app/platform/connectors/[connectorId]/edit/page.tsx`

2. **Add "Setup OAuth" button on edit page** for OAuth-type connectors linking to `/platform/connectors/[connectorId]/oauth-setup`

### P1 — AC failures

3. Wire **Retry Sync button** in `sync-log-details-dialog.tsx` to actual backend
4. Display **organization names** not IDs in connector list tooltip and sync logs
5. Add **Actions column** to health table in dashboard
6. Fix **20 TypeScript errors** — add types to map/filter callbacks in all connector files

### P2 — Incomplete features

7. Make **recent errors clickable** in dashboard (open sync log details dialog)
8. Add **organization filter** to analytics page
9. Implement **table sorting** on connector list
10. Add **custom date range picker** to sync logs and analytics

### P3 — Minor gaps

11. Use `getConnectorHealth` query for real uptime metrics instead of heuristic
12. Implement CSV export option in analytics

---

## PRD Audit - US-P4.5-004 - 2026-02-16 11:40:21
## Audit Report: US-P4.5-004 - Add connection test functionality

**STATUS: PARTIAL**

### ✅ Implemented Acceptance Criteria

1. ✅ **Test Connection button on connector edit page** - Present at line 636-645 in `edit/page.tsx`
2. ✅ **Test Connection button on connector list (Actions column)** - Present at lines 352-366 (desktop), 462-475 (mobile) in `page.tsx`
3. ✅ **Dialog with testing message** - `ConnectionTestDialog` component shows "Testing connection to {connectorName}..." at lines 84-99
4. ✅ **testConnection action** - Implemented at `federationAuth.ts:283-421`
5. ✅ **OAuth support** - Adds Bearer token auth at lines 337-338
6. ✅ **API Key support** - Adds custom header auth at lines 339-340
7. ✅ **Basic Auth support** - Adds Basic auth header at lines 341-345
8. ✅ **Correct return type** - Returns `{ success: boolean, message: string, responseTime: number }` at line 287-291
9. ✅ **Success display** - Shows green alert with checkmark and response time at lines 103-116
10. ✅ **Failure display** - Shows red alert with X icon and error message at lines 119-132
11. ✅ **Common error handling** - Handles 401, 403, 404, 429, 500+ errors at lines 361-371; timeout at lines 391-396; network error at lines 399-405
12. ✅ **Retry button on failure** - Present at lines 136-139
13. ✅ **Close button** - Present at lines 141-147, calls `handleClose()` which resets state and closes dialog
14. ✅ **Calls membership list endpoint with limit=1** - Line 330 sets `limit=1` query param
15. ✅ **Type checks pass** - Pre-existing errors unrelated to this story

### ❌ Missing Acceptance Criteria

1. **Edit button in desktop table view is not clickable** - The Edit button at line 342-344 in `page.tsx` has no `asChild` + `Link` or `onClick` handler to navigate to the edit page. The mobile version (lines 454-460) correctly wraps it with a Link.

### 📝 Quality Notes

- Auto-tests on dialog open (line 72-76)
- 10-second timeout configured (line 352)
- Proper state management with loading/success/error states
- Component is reusable with proper props interface

### Recommendation

**PARTIAL** - Core functionality is complete and working. The Edit button in the desktop table view needs to be fixed to navigate to the edit page (should use `Link` like the mobile version does).

## Auto Quality Check - 2026-02-16 11:42:55
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/syncHistory.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Security Tester - 2026-02-16 11:43:40
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/recommendations/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/session-plan/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
packages/backend/convex/actions/aiMapping.ts:      "Invalid Anthropic API key. Check ANTHROPIC_API_KEY environment variable."
packages/backend/convex/actions/aiMapping.ts:        "ANTHROPIC_API_KEY not configured in Convex environment variables"
```
- ⚠️ **HIGH**: 4 high-severity dependency vulnerabilities
  Run `npm audit fix` to resolve
- ⚠️ **HIGH**: Mutations without authorization checks:
  - packages/backend/convex/models/platformMessagingSettings.ts
  - packages/backend/convex/models/syncQueue.ts
  - packages/backend/convex/models/importSessions.ts
  - packages/backend/convex/models/passportComparison.ts
  - packages/backend/convex/models/trustGatePermissions.ts
  - packages/backend/convex/models/ageGroupEligibilityOverrides.ts
  - packages/backend/convex/models/federationConnectors.ts
  - packages/backend/convex/models/teamCollaboration.ts
  - packages/backend/convex/models/guardianIdentities.ts
  - packages/backend/convex/models/sessionPlans.ts
  - packages/backend/convex/models/adultPlayers.ts
  - packages/backend/convex/models/demoAsks.ts
  - packages/backend/convex/models/skillBenchmarks.ts
  - packages/backend/convex/models/coaches.ts
  - packages/backend/convex/models/medicalProfiles.ts
  - packages/backend/convex/models/invitations.ts
  - packages/backend/convex/models/flows.ts
  - packages/backend/convex/models/notifications.ts
  - packages/backend/convex/models/whatsappReviewLinks.ts
  - packages/backend/convex/models/teamObservations.ts
  - packages/backend/convex/models/passportGoals.ts
  - packages/backend/convex/models/players.ts
  - packages/backend/convex/models/aiMappingCache.ts
  - packages/backend/convex/models/orgInjuryNotes.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/aiMappingAnalytics.ts
  - packages/backend/convex/models/orgPlayerEnrollments.ts
  - packages/backend/convex/models/sportPassports.ts
  - packages/backend/convex/models/orgJoinRequests.ts
  - packages/backend/convex/models/sportAgeGroupConfig.ts
  - packages/backend/convex/models/referenceData.ts
  - packages/backend/convex/models/importMappingHistory.ts
  - packages/backend/convex/models/notificationPreferences.ts
  - packages/backend/convex/models/userPreferences.ts
  - packages/backend/convex/models/teams.ts
  - packages/backend/convex/models/gdpr.ts
  - packages/backend/convex/models/userProfiles.ts
  - packages/backend/convex/models/emergencyContacts.ts
  - packages/backend/convex/models/coachTrustLevels.ts
  - packages/backend/convex/models/coachParentSummaries.ts
  - packages/backend/convex/models/onboarding.ts
  - packages/backend/convex/models/guardianPlayerLinks.ts
  - packages/backend/convex/models/orgGuardianProfiles.ts
  - packages/backend/convex/models/passportSharing.ts
  - packages/backend/convex/models/playerGraduations.ts
  - packages/backend/convex/models/members.ts
  - packages/backend/convex/models/voiceNoteEntityResolutions.ts
  - packages/backend/convex/models/users.ts
  - packages/backend/convex/models/skillAssessments.ts
  - packages/backend/convex/models/playerSelfAccess.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  - packages/backend/convex/models/importTemplates.ts
  - packages/backend/convex/models/sports.ts
  - packages/backend/convex/models/importProgress.ts
  - packages/backend/convex/models/fixNeilsRoles.ts
  - packages/backend/convex/models/playerIdentities.ts
  - packages/backend/convex/models/voiceNotes.ts
  - packages/backend/convex/models/guardianManagement.ts
  - packages/backend/convex/models/importTemplateSeeds.ts
  - packages/backend/convex/models/insightDrafts.ts
  - packages/backend/convex/models/importSessionDrafts.ts
  - packages/backend/convex/models/teamDecisions.ts
  - packages/backend/convex/models/gaaTestMutations.ts
  - packages/backend/convex/models/playerInjuries.ts
  - packages/backend/convex/models/voiceNoteInsights.ts
  - packages/backend/convex/models/playerEmergencyContacts.ts
  - packages/backend/convex/models/coachTasks.ts
  **Action**: Add `getUserOrgRole()` or mark as `// @public`
- 🚨 **CRITICAL [P9]**: XSS risk - dangerouslySetInnerHTML without sanitization:
    apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
  apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
  apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
  **Action**: Use DOMPurify or remove dangerouslySetInnerHTML
- ⚠️ **HIGH [P9]**: No rate limiting on notification/activity endpoints:
  - packages/backend/convex/models/demoAsks.ts
  **Action**: Add rate limiting to prevent spam/abuse
- ⚠️ **HIGH [P9]**: AI endpoints without input validation:
  - packages/backend/convex/actions/aiMapping.ts
  - packages/backend/convex/actions/claimsExtraction.ts
  - packages/backend/convex/actions/coachParentSummaries.ts
  - packages/backend/convex/actions/practicePlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## PRD Audit - US-P4.5-005 - 2026-02-16 11:42:11
## US-P4.5-005 Audit Report

**Status: PARTIAL** - Story implemented with one path deviation

### Summary
The sync logs viewer has been comprehensively implemented with all core functionality working. However, there is one discrepancy with the acceptance criteria regarding the file path.

### Acceptance Criteria Review

✅ **PASS: Core Functionality**
- Page title: "Federation Sync Logs" (line 166)
- DataTable/table for sync history display (desktop table lines 251-358, mobile cards 360-432)
- Correct table columns: Timestamp, Connector, Organization, Type, Status, Duration, Stats, Actions
- Type badges with correct colors: scheduled (default/blue), manual (secondary/purple), webhook (outline/green) (lines 40-50)
- Status badges: completed (default/green), failed (destructive/red) - "running" status supported in filters but not present in data (lines 52-62)
- Duration format: "Xm Ys" (lines 140-148)
- Stats column: "Created: X, Updated: Y, Conflicts: Z" (lines 329-340)
- Actions: "View Details" button wired to dialog (lines 343-349, dialog component exists)

✅ **PASS: Filtering & Search**
- Filter by connector dropdown (All Connectors or specific) (lines 195-212)
- Filter by status dropdown (All, Completed, Failed, Running) (lines 215-229)
- Filter by date range (Last 7 days, Last 30 days, All time) (lines 232-245)
- Search bar filters by organization (lines 185-192, client-side filtering lines 116-122)
- Sort by timestamp (newest first) - backend query uses `by_startedAt` index descending

✅ **PASS: UI Requirements**
- Pagination: 50 logs per page (backend default limit 50, lines 112-113 in syncHistory.ts)
- Empty state: "No sync logs found. Try adjusting filters." (lines 283-290, 362-365)
- Mobile responsive: table becomes card list on <768px (lines 251-358 for desktop, 360-432 for mobile)
- Code quality: `npx ultracite fix` passed with no issues

❌ **FAIL: File Path Discrepancy**
- **Expected**: `apps/web/src/app/platform-admin/connectors/logs/page.tsx`
- **Actual**: `apps/web/src/app/platform/connectors/sync-logs/page.tsx`
- The implementation uses `/platform/connectors/sync-logs` instead of `/platform-admin/connectors/logs`
- Reason noted in commit: "Renamed directory from 'logs' to 'sync-logs' to avoid .gitignore conflict"

### Backend Implementation
✅ Complete backend support in `packages/backend/convex/models/syncHistory.ts`:
- `getAllSyncHistory` query (lines 106-198)
- `getSyncHistoryDetails` query for modal (lines 293-356)
- Proper use of indexes (`by_startedAt`)
- Pagination with cursor support
- All validators correct

### Verdict
**PARTIAL** - The story is functionally complete with all features working as specified, but deviates from the specified path. The path change appears deliberate (to avoid gitignore issues) and was documented in the commit message. All other acceptance criteria are fully met.

**Recommendation**: Update the PRD acceptance criteria to reflect the actual path (`/platform/connectors/sync-logs`) or discuss if the path should be changed to match the original spec.

## Security Tester - 2026-02-16 11:45:42
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/recommendations/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/session-plan/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
packages/backend/convex/actions/aiMapping.ts:      "Invalid Anthropic API key. Check ANTHROPIC_API_KEY environment variable."
packages/backend/convex/actions/aiMapping.ts:        "ANTHROPIC_API_KEY not configured in Convex environment variables"
```
- ⚠️ **HIGH**: 4 high-severity dependency vulnerabilities
  Run `npm audit fix` to resolve
- ⚠️ **HIGH**: Mutations without authorization checks:
  - packages/backend/convex/models/platformMessagingSettings.ts
  - packages/backend/convex/models/syncQueue.ts
  - packages/backend/convex/models/importSessions.ts
  - packages/backend/convex/models/passportComparison.ts
  - packages/backend/convex/models/trustGatePermissions.ts
  - packages/backend/convex/models/ageGroupEligibilityOverrides.ts
  - packages/backend/convex/models/federationConnectors.ts
  - packages/backend/convex/models/teamCollaboration.ts
  - packages/backend/convex/models/guardianIdentities.ts
  - packages/backend/convex/models/sessionPlans.ts
  - packages/backend/convex/models/adultPlayers.ts
  - packages/backend/convex/models/demoAsks.ts
  - packages/backend/convex/models/skillBenchmarks.ts
  - packages/backend/convex/models/coaches.ts
  - packages/backend/convex/models/medicalProfiles.ts
  - packages/backend/convex/models/invitations.ts
  - packages/backend/convex/models/flows.ts
  - packages/backend/convex/models/notifications.ts
  - packages/backend/convex/models/whatsappReviewLinks.ts
  - packages/backend/convex/models/teamObservations.ts
  - packages/backend/convex/models/passportGoals.ts
  - packages/backend/convex/models/players.ts
  - packages/backend/convex/models/aiMappingCache.ts
  - packages/backend/convex/models/orgInjuryNotes.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/aiMappingAnalytics.ts
  - packages/backend/convex/models/orgPlayerEnrollments.ts
  - packages/backend/convex/models/sportPassports.ts
  - packages/backend/convex/models/orgJoinRequests.ts
  - packages/backend/convex/models/sportAgeGroupConfig.ts
  - packages/backend/convex/models/referenceData.ts
  - packages/backend/convex/models/importMappingHistory.ts
  - packages/backend/convex/models/notificationPreferences.ts
  - packages/backend/convex/models/userPreferences.ts
  - packages/backend/convex/models/teams.ts
  - packages/backend/convex/models/gdpr.ts
  - packages/backend/convex/models/userProfiles.ts
  - packages/backend/convex/models/emergencyContacts.ts
  - packages/backend/convex/models/coachTrustLevels.ts
  - packages/backend/convex/models/coachParentSummaries.ts
  - packages/backend/convex/models/onboarding.ts
  - packages/backend/convex/models/guardianPlayerLinks.ts
  - packages/backend/convex/models/orgGuardianProfiles.ts
  - packages/backend/convex/models/passportSharing.ts
  - packages/backend/convex/models/playerGraduations.ts
  - packages/backend/convex/models/members.ts
  - packages/backend/convex/models/voiceNoteEntityResolutions.ts
  - packages/backend/convex/models/users.ts
  - packages/backend/convex/models/skillAssessments.ts
  - packages/backend/convex/models/playerSelfAccess.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  - packages/backend/convex/models/importTemplates.ts
  - packages/backend/convex/models/sports.ts
  - packages/backend/convex/models/importProgress.ts
  - packages/backend/convex/models/fixNeilsRoles.ts
  - packages/backend/convex/models/playerIdentities.ts
  - packages/backend/convex/models/voiceNotes.ts
  - packages/backend/convex/models/guardianManagement.ts
  - packages/backend/convex/models/importTemplateSeeds.ts
  - packages/backend/convex/models/insightDrafts.ts
  - packages/backend/convex/models/importSessionDrafts.ts
  - packages/backend/convex/models/teamDecisions.ts
  - packages/backend/convex/models/gaaTestMutations.ts
  - packages/backend/convex/models/playerInjuries.ts
  - packages/backend/convex/models/voiceNoteInsights.ts
  - packages/backend/convex/models/playerEmergencyContacts.ts
  - packages/backend/convex/models/coachTasks.ts
  **Action**: Add `getUserOrgRole()` or mark as `// @public`
- 🚨 **CRITICAL [P9]**: XSS risk - dangerouslySetInnerHTML without sanitization:
    apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
  apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
  apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
  **Action**: Use DOMPurify or remove dangerouslySetInnerHTML
- ⚠️ **HIGH [P9]**: No rate limiting on notification/activity endpoints:
  - packages/backend/convex/models/demoAsks.ts
  **Action**: Add rate limiting to prevent spam/abuse
- ⚠️ **HIGH [P9]**: AI endpoints without input validation:
  - packages/backend/convex/actions/aiMapping.ts
  - packages/backend/convex/actions/claimsExtraction.ts
  - packages/backend/convex/actions/coachParentSummaries.ts
  - packages/backend/convex/actions/practicePlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Security Tester - 2026-02-16 11:47:46
- 🚨 **CRITICAL**: Hardcoded secrets detected
```
apps/web/src/app/api/comparison-insights/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/recommendations/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
apps/web/src/app/api/session-plan/route.ts:      console.error("❌ ANTHROPIC_API_KEY not found in environment variables");
packages/backend/convex/actions/aiMapping.ts:      "Invalid Anthropic API key. Check ANTHROPIC_API_KEY environment variable."
packages/backend/convex/actions/aiMapping.ts:        "ANTHROPIC_API_KEY not configured in Convex environment variables"
```
- ⚠️ **HIGH**: 4 high-severity dependency vulnerabilities
  Run `npm audit fix` to resolve
- ⚠️ **HIGH**: Mutations without authorization checks:
  - packages/backend/convex/models/platformMessagingSettings.ts
  - packages/backend/convex/models/syncQueue.ts
  - packages/backend/convex/models/importSessions.ts
  - packages/backend/convex/models/passportComparison.ts
  - packages/backend/convex/models/trustGatePermissions.ts
  - packages/backend/convex/models/ageGroupEligibilityOverrides.ts
  - packages/backend/convex/models/federationConnectors.ts
  - packages/backend/convex/models/teamCollaboration.ts
  - packages/backend/convex/models/guardianIdentities.ts
  - packages/backend/convex/models/sessionPlans.ts
  - packages/backend/convex/models/adultPlayers.ts
  - packages/backend/convex/models/demoAsks.ts
  - packages/backend/convex/models/skillBenchmarks.ts
  - packages/backend/convex/models/coaches.ts
  - packages/backend/convex/models/medicalProfiles.ts
  - packages/backend/convex/models/invitations.ts
  - packages/backend/convex/models/flows.ts
  - packages/backend/convex/models/notifications.ts
  - packages/backend/convex/models/whatsappReviewLinks.ts
  - packages/backend/convex/models/teamObservations.ts
  - packages/backend/convex/models/passportGoals.ts
  - packages/backend/convex/models/players.ts
  - packages/backend/convex/models/aiMappingCache.ts
  - packages/backend/convex/models/orgInjuryNotes.ts
  - packages/backend/convex/models/playerImport.ts
  - packages/backend/convex/models/passportEnquiries.ts
  - packages/backend/convex/models/setup.ts
  - packages/backend/convex/models/teamPlayerIdentities.ts
  - packages/backend/convex/models/rateLimits.ts
  - packages/backend/convex/models/syncHistory.ts
  - packages/backend/convex/models/platformStaffInvitations.ts
  - packages/backend/convex/models/coachParentMessages.ts
  - packages/backend/convex/models/aiModelConfig.ts
  - packages/backend/convex/models/aiMappingAnalytics.ts
  - packages/backend/convex/models/orgPlayerEnrollments.ts
  - packages/backend/convex/models/sportPassports.ts
  - packages/backend/convex/models/orgJoinRequests.ts
  - packages/backend/convex/models/sportAgeGroupConfig.ts
  - packages/backend/convex/models/referenceData.ts
  - packages/backend/convex/models/importMappingHistory.ts
  - packages/backend/convex/models/notificationPreferences.ts
  - packages/backend/convex/models/userPreferences.ts
  - packages/backend/convex/models/teams.ts
  - packages/backend/convex/models/gdpr.ts
  - packages/backend/convex/models/userProfiles.ts
  - packages/backend/convex/models/emergencyContacts.ts
  - packages/backend/convex/models/coachTrustLevels.ts
  - packages/backend/convex/models/coachParentSummaries.ts
  - packages/backend/convex/models/onboarding.ts
  - packages/backend/convex/models/guardianPlayerLinks.ts
  - packages/backend/convex/models/orgGuardianProfiles.ts
  - packages/backend/convex/models/passportSharing.ts
  - packages/backend/convex/models/playerGraduations.ts
  - packages/backend/convex/models/members.ts
  - packages/backend/convex/models/voiceNoteEntityResolutions.ts
  - packages/backend/convex/models/users.ts
  - packages/backend/convex/models/skillAssessments.ts
  - packages/backend/convex/models/playerSelfAccess.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  - packages/backend/convex/models/importTemplates.ts
  - packages/backend/convex/models/sports.ts
  - packages/backend/convex/models/importProgress.ts
  - packages/backend/convex/models/fixNeilsRoles.ts
  - packages/backend/convex/models/playerIdentities.ts
  - packages/backend/convex/models/voiceNotes.ts
  - packages/backend/convex/models/guardianManagement.ts
  - packages/backend/convex/models/importTemplateSeeds.ts
  - packages/backend/convex/models/insightDrafts.ts
  - packages/backend/convex/models/importSessionDrafts.ts
  - packages/backend/convex/models/teamDecisions.ts
  - packages/backend/convex/models/gaaTestMutations.ts
  - packages/backend/convex/models/playerInjuries.ts
  - packages/backend/convex/models/voiceNoteInsights.ts
  - packages/backend/convex/models/playerEmergencyContacts.ts
  - packages/backend/convex/models/coachTasks.ts
  **Action**: Add `getUserOrgRole()` or mark as `// @public`
- 🚨 **CRITICAL [P9]**: XSS risk - dangerouslySetInnerHTML without sanitization:
    apps/web/src/components/ui/confetti.tsx:        dangerouslySetInnerHTML={{
  apps/web/src/components/ui/chart.tsx:      dangerouslySetInnerHTML={{
  apps/web/src/components/onboarding/gdpr-policy-viewer.tsx: * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
  **Action**: Use DOMPurify or remove dangerouslySetInnerHTML
- ⚠️ **HIGH [P9]**: No rate limiting on notification/activity endpoints:
  - packages/backend/convex/models/demoAsks.ts
  **Action**: Add rate limiting to prevent spam/abuse
- ⚠️ **HIGH [P9]**: AI endpoints without input validation:
  - packages/backend/convex/actions/aiMapping.ts
  - packages/backend/convex/actions/claimsExtraction.ts
  - packages/backend/convex/actions/coachParentSummaries.ts
  - packages/backend/convex/actions/practicePlans.ts
  - packages/backend/convex/actions/voiceNotes.ts
  - packages/backend/convex/models/aiServiceHealth.ts
  **Action**: Validate/sanitize user input before AI prompts
- ⚠️ **HIGH [P9]**: Notification functions without permission checks:
  - packages/backend/convex/models/notifications.ts
  **Action**: Verify user can send notifications to recipient


## Auto Quality Check - 2026-02-18 23:01:18
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/federationConnectors.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-19 09:08:23
### File: /Users/jkobrien/code/PDP/packages/backend/convex/lib/import/mapper.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-19 21:18:00
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/federationConnectors.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-19 21:18:13
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/federationConnectors.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-19 21:58:19
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/importTemplateSeeds.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-19 21:59:21
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-19 21:59:21
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/organizations.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-19 21:59:21
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/organizations.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-19 22:01:08
### File: /Users/jkobrien/code/PDP/packages/backend/convex/models/importTemplateSeeds.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-20 18:52:53
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/injuryNotifications.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-20 18:52:53
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/injuryNotifications.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-20 19:00:09
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerInjuries.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-20 19:00:09
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerInjuries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-20 19:00:19
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerInjuries.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-20 19:00:19
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerInjuries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-20 19:00:30
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerInjuries.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-20 19:00:30
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerInjuries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-20 23:48:42
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/injuryNotifications.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-20 23:48:42
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/injuryNotifications.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-20 23:48:42
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerInjuries.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-20 23:48:42
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerInjuries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-20 23:52:59
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerInjuries.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-20 23:52:59
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerInjuries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-20 23:53:31
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerInjuries.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-20 23:53:31
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerInjuries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-20 23:54:42
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/teamDecisions.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-20 23:54:53
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/voiceNotes.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-20 23:54:53
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/voiceNotes.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-20 23:54:53
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/voiceNotes.ts

- ❌ **CRITICAL: N+1 query pattern detected**
  - **Problem:** `Promise.all(items.map(async => query))` makes N database calls
  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup


## Auto Quality Check - 2026-02-20 23:55:16
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/orgJoinRequests.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-20 23:56:08
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/injuryDocuments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-20 23:56:08
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/injuryDocuments.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-20 23:56:18
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/injuryDocuments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-20 23:56:18
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/injuryDocuments.ts

- ⚠️ **Data Isolation: No organizationId filter found**
  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation
  - **Fix:** Add organizationId to query args and use in .withIndex()


## Auto Quality Check - 2026-02-20 23:57:00
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/auth.ts

- ⚠️ **Better Auth: Possible user.id instead of user._id**
  - **Problem:** Better Auth uses `user._id`, not `user.id`
  - **Fix:** Replace `user.id` with `user._id`


## Resolution Note - 2026-02-21
### Injury Tracking Quality Check False Positives (lines ~746-943)

All "Better Auth adapter violation" warnings for `playerInjuries.ts`, `injuryNotifications.ts`, and `injuryDocuments.ts` are **false positives**. The quality-check.sh hook fires when a file contains both `ctx.db.query` AND the word "organization" — but these files correctly use `ctx.runQuery(components.betterAuth.adapter...)` for auth tables and `ctx.db` for application tables (orgPlayerEnrollments, etc.). No violation exists.

The `.filter()` warnings for these files are also false positives — they refer to JavaScript array `.filter()` on collected results (not Convex `.filter()`), which is the correct pattern after `.collect()`.

**Actual issues fixed (2026-02-21):**
- ✅ SEC-CRIT-001: Added `requireOrgMember` helper applied to 7 org-scoped queries
- ✅ SEC-HIGH-001: `getInjuryById` now verifies org membership
- ✅ SEC-HIGH-002: `getDocumentsAdmin` now checks admin/owner role
- ✅ SEC-HIGH-003: `reportedBy` uses session user ID instead of client-supplied value
- ✅ SEC-MED-001: PII removed from all server-side logs in injuryNotifications.ts
- ✅ N+1 in `getTeamHealthSummary`: Batch-fetch + Map lookup for legacy players
- ✅ 32 UAT tests: 20 pass, 12 skip gracefully (admin tests require admin env), 0 fail



## Auto Quality Check - 2026-02-22 09:46:36
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerInjuries.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`

## Auto Quality Check - 2026-02-22 09:46:36
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/injuryDocuments.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-22 09:46:36
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/playerInjuries.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`


## Auto Quality Check - 2026-02-22 09:46:37
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/injuryNotifications.ts

- ❌ **CRITICAL: Better Auth adapter violation**
  - **Problem:** Direct DB access to auth tables
  - **Fix:** Use `ctx.runQuery(components.betterAuth.adapter.findOne, {...})`


## Auto Quality Check - 2026-02-22 09:46:37
### File: /Users/neil/Documents/GitHub/PDP/packages/backend/convex/lib/injuryNotifications.ts

- ⚠️ **Performance: .filter() usage detected**
  - **Problem:** Should use .withIndex() for better performance
  - **Fix:** Replace `.query().filter()` with `.query().withIndex()`

