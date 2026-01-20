# Issue #280 - Navigation Buttons UAT Report

**Date:** January 18, 2026
**Tester:** Claude (AI UAT)
**Environment:** Local dev (localhost:3000)
**Status:** BLOCKED - Critical bugs prevent testing

---

## Executive Summary

UAT testing of navigation buttons was **blocked** by two critical bugs that cause the application to crash immediately after login. These bugs were introduced as part of the recent stash integration work and must be fixed before navigation testing can proceed.

---

## Critical Bugs Found

### Bug #1: Missing Convex Function `getUserAuthMethod`

**Severity:** CRITICAL (P0)
**Impact:** App crashes immediately after login - completely unusable

**Error Message:**
```
[CONVEX Q(models/users:getUserAuthMethod)] Server Error
Could not find public function for 'models/users:getUserAuthMethod'.
Did you forget to run `npx convex dev` or `npx convex deploy`?
```

**Location:**
- Frontend: `src/components/profile/profile-settings-dialog.tsx:47-48`
- Backend: `packages/backend/convex/models/users.ts:630-677`

**Root Cause:**
The `getUserAuthMethod` query function exists in the source code (`users.ts` line 630) but is **not available** in the Convex runtime. The function is NOT present in the generated API (`packages/backend/convex/_generated/api.d.ts`).

**Call Stack:**
1. `ProfileSettingsDialog` (profile-settings-dialog.tsx:47)
2. `EnhancedUserMenu` (enhanced-user-menu.tsx:320)
3. `Header` (header.tsx:199)
4. `OrgLayout` (layout.tsx:80)

**Affected Code:**
```typescript
// profile-settings-dialog.tsx:47-48
const authMethod = useQuery(
  api.models.users.getUserAuthMethod,  // This function doesn't exist in Convex runtime
  user?._id ? { userId: user._id } : "skip"
);
```

**Fix Required:**
1. Investigate why the function isn't being deployed to Convex
2. Run `npx convex dev` or restart the Convex dev server
3. Verify function appears in generated API
4. If issue persists, check for bundling/export issues

---

### Bug #2: Mobile Coach Dashboard Infinite Loop

**Severity:** CRITICAL (P0)
**Impact:** Mobile coach view crashes completely with "Application error"

**Error Message:**
```
Maximum update depth exceeded. This can happen when a component calls setState
inside useEffect, but useEffect either doesn't have a dependency array, or one
of the dependencies changes on every render.
```

**Location:**
- `src/components/smart-coach-dashboard.tsx:360`

**Root Cause:**
The `calculateTeamAnalytics` callback contains `setTeamAnalytics(analytics)` at line 360. This callback is used in a `useEffect` at line 497-503 that depends on the callback itself. The callback's dependencies include other callbacks (`calculatePlayerAvgSkill`, `calculateSkillAverages`, `formatSkillName`, `getPlayerTeams`) which may not have stable references, causing an infinite re-render loop.

**Affected Code:**
```typescript
// smart-coach-dashboard.tsx:360
setTeamAnalytics(analytics);
}, [
  players,
  coachTeams,
  isClubView,
  calculatePlayerAvgSkill,    // Potentially unstable
  calculateSkillAverages,      // Potentially unstable
  formatSkillName,             // Potentially unstable
  getPlayerTeams,              // Potentially unstable
]);

// Line 497-503 - useEffect that triggers the loop
useEffect(() => {
  calculateTeamAnalytics();
  generateCorrelationInsights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [calculateTeamAnalytics, generateCorrelationInsights]);
```

**Fix Required:**
1. Ensure all callback dependencies are memoized with `useCallback`
2. Or remove callback functions from useEffect dependency array
3. Or use a ref to track whether analytics need recalculation

---

## Testing Status

| Test Area | Status | Notes |
|-----------|--------|-------|
| Coach - Desktop Sidebar | BLOCKED | Bug #1 crashes app |
| Coach - Mobile Bottom Nav | BLOCKED | Bug #1 + Bug #2 crash app |
| Parent - Navigation | NOT TESTED | Blocked |
| Admin - Navigation | NOT TESTED | Blocked |
| Platform Staff - Navigation | NOT TESTED | Blocked |

---

## Screenshots

### Desktop - getUserAuthMethod Error
![Desktop Error](../../../.claude/skills/dev-browser/tmp/local-11-after-reload.png)

### Mobile - Maximum Update Depth Error
![Mobile Error](../../../.claude/skills/dev-browser/tmp/local-08-mobile-loaded.png)

### Mobile - Application Crash
![Mobile Crash](../../../.claude/skills/dev-browser/tmp/local-09-mobile-after-escape.png)

---

## Recommendations

1. **Immediate:** Fix Bug #1 (getUserAuthMethod) to unblock app access
2. **Immediate:** Fix Bug #2 (infinite loop) to restore mobile functionality
3. **After fixes:** Re-run comprehensive navigation button UAT
4. **Consider:** Add error boundaries to prevent full app crashes
5. **Consider:** Add React StrictMode detection for development infinite loops

---

## Files to Investigate

1. `packages/backend/convex/models/users.ts` - getUserAuthMethod function
2. `src/components/profile/profile-settings-dialog.tsx` - useQuery call
3. `src/components/smart-coach-dashboard.tsx` - useCallback/useEffect pattern
4. Convex deployment configuration

---

## Related

- Original Issue: #280
- Recent stash integration work (stash@{6})
- Enhanced User Menu feature (#271)
- Passport Sharing feature (#260)
