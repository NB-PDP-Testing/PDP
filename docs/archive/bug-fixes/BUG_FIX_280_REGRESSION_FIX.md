# Bug Fix Report: Issue #280 - Regression Fix

**Issue**: #280
**Date Fixed**: January 20, 2026
**Commit**: `a8fdc68`

---

## Regression Identified and Fixed

### Summary

A comprehensive code review identified that **1 of 7 fixes** from the original #280 fix (commit `7cc5b6c`, Jan 18) was accidentally reverted by commit `964b3b69` (Jan 19) titled "fix: Enquiry system defaults and type error fixes".

### The Regression

**File**: `apps/web/src/components/smart-coach-dashboard.tsx`

**What was reverted**: The SmartCoachDashboard infinite loop fix

The commit `964b3b69` moved the useEffect hook from line 148 to line 448 but used the **broken dependencies** instead of the fixed ones:

```typescript
// BROKEN (what was in the code):
useEffect(() => {
  calculateTeamAnalytics();
  generateCorrelationInsights();
}, [calculateTeamAnalytics, generateCorrelationInsights]);  // ← Functions recreated every render!

// FIXED (what it should be):
useEffect(() => {
  calculateTeamAnalytics();
  generateCorrelationInsights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [players, coachTeams, isClubView]);  // ← Stable data dependencies
```

### Impact

- Coach dashboard could experience infinite render loop
- Browser freeze or crash when loading coach dashboard
- Console error: "Maximum update depth exceeded"

---

## Full Code Review Results

### Issue #257 Status: FULLY IMPLEMENTED

| Component | Status |
|-----------|--------|
| Backend (`userPreferences.ts`) | ✅ Present |
| Schema (`userPreferences` table) | ✅ Present |
| Frontend (`preferences-dialog.tsx`) | ✅ Present |

### Issue #280 Status: All 7 Fixes Now Restored

| Bug | Status |
|-----|--------|
| 1. SmartCoachDashboard Infinite Loop | ✅ **FIXED** (this commit) |
| 2. Parent Progress Button | ✅ Still intact |
| 3. orgPlayerEnrollments sport field | ✅ Still intact |
| 4. passportGoals sharing fields | ✅ Still intact |
| 5. sportPassports invalid teamId | ✅ Still intact |
| 6. parent-sharing-dashboard hooks | ✅ Still intact |
| 7. enable-sharing-wizard DialogTitle | ✅ Still intact |

---

## Files Verified

1. `packages/backend/convex/models/userPreferences.ts` - ✅
2. `packages/backend/convex/schema.ts` (userPreferences table) - ✅
3. `apps/web/src/components/profile/preferences-dialog.tsx` - ✅
4. `apps/web/src/components/smart-coach-dashboard.tsx` - ✅ **FIXED**
5. `apps/web/src/app/orgs/[orgId]/parents/layout.tsx` - ✅
6. `apps/web/src/app/orgs/[orgId]/parents/sharing/components/parent-sharing-dashboard.tsx` - ✅
7. `apps/web/src/app/orgs/[orgId]/parents/sharing/components/enable-sharing-wizard.tsx` - ✅
8. `packages/backend/convex/models/orgPlayerEnrollments.ts` - ✅
9. `packages/backend/convex/models/passportGoals.ts` - ✅
10. `packages/backend/convex/models/sportPassports.ts` - ✅

---

## Commit Details

```
fix: Restore infinite loop fix for SmartCoachDashboard (#280)

The fix from commit 7cc5b6c was accidentally reverted in commit 964b3b69.
This restores the correct useEffect dependencies to prevent infinite
re-renders on the coach dashboard.

Changed dependencies from [calculateTeamAnalytics, generateCorrelationInsights]
(which are recreated every render) to [players, coachTeams, isClubView]
(stable data values that actually trigger recalculation).
```
