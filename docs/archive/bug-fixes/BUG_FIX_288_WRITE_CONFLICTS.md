# Bug Fix: Write Conflicts in Role Sync (#288)

## Issue Summary
Convex health dashboard reported critical write conflicts:
- `switchActiveFunctionalRole`: 84 failed + 1,500 retries in `member` table
- `trackOrgAccess`: 129+ retries in `userPreferences` table

## Root Cause Analysis

The issue was in `apps/web/src/components/org-role-switcher.tsx`.

### The Problem

A `useEffect` hook (lines 203-282) was designed to sync the active role when navigating to role-specific pages. However, it was calling mutations on **every navigation** instead of only when the role actually changed.

**Original code comments:**
```typescript
// Always call switchActiveRole to update lastAccessedOrgs timestamp
// Even if the role hasn't changed, this ensures "recently accessed" is up to date
```

This caused:
1. Every page navigation within the same org/role triggered BOTH mutations
2. `switchActiveRole` was called even when `urlRole === currentRole`
3. `trackOrgAccess` was called redundantly from the useEffect
4. Multiple browser tabs or users hitting the same records caused Convex retry storms

### Why 1,500+ Retries?
- The useEffect dependencies included `pathname`, which changes on every navigation
- Even clicking between pages within the same role (e.g., `/coach/dashboard` → `/coach/players`) would trigger the mutations
- Convex retries on write conflicts, compounding the issue

## Fix Applied

**Commit:** `3d84b57` on branch `ralph/coach-parent-summaries-phase1`

### Changes:

1. **Only sync when role actually changes:**
```typescript
const needsSync = urlRole !== currentRole;

if (hasRole && needsSync) {
  // Only call mutation when needed
  await switchActiveRole({ ... });
}
```

2. **Removed `trackOrgAccess` from useEffect entirely:**
   - It was redundant - user switching is already tracked in `handleSwitchRole`
   - No need to track on every navigation

3. **Added feature flag check in `handleSwitchRole`:**
```typescript
if (useOrgUsageTracking && user?._id) {
  await trackOrgAccess({ ... });
}
```

4. **Cleaned up dependencies:**
   - Removed unnecessary dependencies that caused extra re-runs
   - Removed verbose console.log statements

### Before vs After

| Scenario | Before | After |
|----------|--------|-------|
| Navigate to different page, same role | 2 mutations | 0 mutations |
| Navigate to different role | 2 mutations | 1 mutation |
| Switch org/role via dropdown | 2 mutations | 1-2 mutations (if tracking enabled) |

## Verification

After deployment, check Convex health dashboard. The write conflict issues should resolve within minutes.

## Files Changed

- `apps/web/src/components/org-role-switcher.tsx`

## Related

- Original issue: https://github.com/NB-PDP-Testing/PDP/issues/288
- Issue #226: Sync activeFunctionalRole with URL pathname (the feature this fix modifies)
