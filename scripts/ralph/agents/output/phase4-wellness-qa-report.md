# QA Verification — Phase 4 Wellness — 2026-02-25

## Summary
- **Branch:** `ralph/adult-player-phase4-wellness`
- **Stories:** US-P4-001 through US-P4-010 + US-P4-UAT (11 stories)
- **Overall:** NEEDS FIXES (5 critical bugs, 7 warnings)

---

## CRITICAL BUGS (must fix)

### 1. [BUG] `sendWellnessReminders` ignores `reminderFrequency` setting
**File:** `packages/backend/convex/models/playerHealthChecks.ts:1163`

The cron checks `remindersEnabled` and `reminderType` but never reads `config.reminderFrequency`. When admin sets `match_day_only` or `training_day_only`, reminders still fire every day. The setting is stored and displayed correctly but has no effect.

### 2. [BUG] `reminderType === "email"` sends nothing but increments `sent` counter
**File:** `packages/backend/convex/models/playerHealthChecks.ts:1197-1215`

The function only runs `createNotification` when `reminderType === "in_app" || "both"`. When `reminderType === "email"`, the code falls through — no notification dispatched — but `sent += 1` still runs at line 1215. The email type is completely non-functional yet counts as "sent".

### 3. [BUG] Coach access request notification link is not org-scoped
**File:** `packages/backend/convex/models/playerHealthChecks.ts:516`

```ts
link: "/player/settings",  // BAD — will 404 or go to wrong page
```
All other notification links in the codebase use `/orgs/${organizationId}/...`. This one does not. The notification arrives but clicking it navigates to a broken route.

**Fix:** `link: \`/orgs/${args.organizationId}/player/settings\``

### 4. [BUG] `updateWellnessOrgConfig` stores orgId as `updatedBy` instead of userId
**File:** `apps/web/src/app/orgs/[orgId]/admin/settings/page.tsx:588`

```ts
updatedBy: orgId,   // WRONG — schema says this is a userId
```
The admin settings page never calls `authClient.useSession()` so has no user ID. It passes `orgId` as the `updatedBy` field.

### 5. [BUG] Admin wellness analytics missing two required panels
**File:** `apps/web/src/app/orgs/[orgId]/admin/analytics/wellness-analytics-tab.tsx`

Two named acceptance criteria in US-P4-009 are absent:

**A.** "list of players with 3+ consecutive low check-ins alongside any injury records in the same period" — the low-wellness panel exists but has NO injury records alongside it.

**B.** "aggregate heatmap of injury occurrences by cycle phase across female players (medical staff only)" — entirely absent (no query, no UI, no role check).

---

## WARNINGS (should fix)

### 6. [WARN] AI insight not in collapsible panel at top of trend charts section
**File:** `apps/web/src/app/orgs/[orgId]/player/health-check/page.tsx:782-798`

PRD US-P4-010: "On the trend chart view: show the most recent insight in a collapsible 'Latest Insight' panel at the **top** of the page."

Current: insight is a static div placed between the submit button and trend charts. Not collapsible. Not in `WellnessTrendCharts` component. Not at the top of the charts section.

### 7. [WARN] Cycle phase pills can trigger spurious GDPR modal while consent query loads
**File:** `apps/web/src/app/orgs/[orgId]/player/health-check/page.tsx:355-358`

`hasCycleConsent` is `false` when `cycleConsent === undefined` (loading). Tapping a pill during the loading window opens the GDPR modal even for users who already consented. Disable cycle phase pills while `cycleConsent === undefined`.

### 8. [WARN] Dead code: `_getRecentChecksInternal` is never referenced
**File:** `packages/backend/convex/models/playerHealthChecks.ts:732`

This `internalQuery` duplicates `getRecentChecksForInsight` (line 1229). The wellness action uses only `getRecentChecksForInsight`. Remove `_getRecentChecksInternal`.

### 9. [WARN] `sendWellnessReminders` full-table-scans `wellnessOrgConfig`
**File:** `packages/backend/convex/models/playerHealthChecks.ts:1161`

`ctx.db.query("wellnessOrgConfig").collect()` — no `.withIndex()`. Violates project performance rules. Acceptable for a cron that genuinely needs all records, but should be documented.

### 10. [WARN] N+1 query patterns in two wellness queries
**File:** `packages/backend/convex/models/playerHealthChecks.ts:248, 1128`

`getWellnessForCoach` and `getConsecutiveLowWellnessPlayers` both call `ctx.db.get(playerIdentityId)` inside a loop. Per `.ruler/performance-patterns.md`, should batch-fetch IDs then build a Map.

### 11. [WARN] `wellnessInsights.ts` does not follow the full AI service pattern
**File:** `packages/backend/convex/actions/wellnessInsights.ts:8`

PRD says "follow the exact same pattern as coachParentSummaries.ts". That pattern includes AI service health checks (`aiServiceHealth.getServiceHealth`), per-feature model config from DB, and fallback logic. `wellnessInsights.ts` hardcodes the model ID and calls the API directly, bypassing the platform's AI health monitoring.

### 12. [WARN] Under-18 gate skipped for players with no `dateOfBirth`
**File:** `apps/web/src/app/orgs/[orgId]/player/health-check/page.tsx:591`

`if (playerIdentity.dateOfBirth)` — gate only runs when DOB is present. A player with no DOB bypasses the under-18 check. Schema requires DOB so low-risk in practice, but should deny access when DOB is absent.

---

## Acceptance Criteria Results

| Story | Status | Key gaps |
|-------|--------|----------|
| US-P4-001 | PARTIAL | Dead code, N+1 patterns |
| US-P4-002 | PASS | — |
| US-P4-003 | PASS | — |
| US-P4-004 | PASS | — |
| US-P4-005 | PASS | Notification link unscoped (BUG #3) |
| US-P4-006 | PASS | — |
| US-P4-007 | PASS | — |
| US-P4-008 | PASS | — |
| US-P4-009 | PARTIAL | reminderFrequency ignored (BUG #1), email not sent (BUG #2), two analytics panels missing (BUG #5) |
| US-P4-010 | PARTIAL | Insight not in collapsible panel at top of trend section (WARN #6) |
| US-P4-UAT | PASS | 34 tests; offline sync and optional-dim-flow gaps are acceptable as manual-only |

---

## UAT Tests
- **File:** `apps/web/uat/tests/daily-wellness-phase4.spec.ts` — EXISTS
- **Test count:** 34 automated tests
- **Coverage gaps (minor):**
  - Optional dimension toggle → check-in form update: manual test 2 only
  - Offline sync flow: manual test 6 only (IndexedDB hard to automate in Playwright)

---

## VERDICT: NEEDS FIXES
5 critical bugs must be resolved. Stories US-P4-009 and US-P4-010 are partially complete.
