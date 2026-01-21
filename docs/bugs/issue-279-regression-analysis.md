# GitHub Issue #279 - Regression Analysis

**Analyzed**: January 20, 2026
**Issue**: https://github.com/NB-PDP-Testing/PDP/issues/279
**Status**: CONFIRMED REGRESSION - Infinite loop bug discovered during Phase 4 UAT

---

## Issue #279 Summary

**Title**: "Improved role changer button and style has been saved from uncommitted code, but does not seem to be working consistently."

**State**: OPEN (high-priority)

**Reported Symptoms**:
1. When changing role within org via dropdown, it doesn't seem to be firing and goes back to the role it was at
2. When switching to another role in another org via the role switcher pop-up, it doesn't seem to be firing consistently

---

## Connection to Infinite Loop Bug

During Phase 4 UAT testing (January 20, 2026), I discovered an **infinite loop bug** in `org-role-switcher.tsx` that directly explains the symptoms in issue #279.

### What I Found

**Console Logs**:
```
[Role Sync] Syncing role from URL: parent (was: coach)
[CONVEX M] Switched to parent for user...
[Role Sync] ✅ Successfully synced role
[Role Sync] Syncing role from URL: parent (was: coach)
[CONVEX M] Switched to parent for user...
```

This repeats **continuously**, causing hundreds of mutations per minute.

### Root Cause (Confirmed)

**File**: `apps/web/src/components/org-role-switcher.tsx`
**Lines**: 247-254

**The Bug**:
```typescript
}, [
  urlOrgId,
  pathname,
  currentMembership?.activeFunctionalRole,
  currentMembership?.functionalRoles,
  switchActiveRole,
  currentMembership,  // ⚠️ BUG: Entire object triggers re-renders
]);
```

**Why It Causes Issue #279 Symptoms**:

1. **Role appears stuck/reverts**: User clicks role button → mutation fires → BUT the infinite loop immediately fires another mutation → role switches back/forth → user sees inconsistent state

2. **Doesn't fire consistently**: Race condition between:
   - User-initiated role switch (via button click)
   - Auto-sync role switch (via URL pathname detection)
   - Rapid-fire switches from infinite loop

   Result: Unpredictable which switch "wins"

3. **Performance degradation**: Hundreds of mutations cause:
   - UI lag
   - Network congestion
   - Delayed state updates
   - Stale data in UI

---

## Impact Assessment

**User Experience**:
- ❌ Role switching unreliable (primary functionality broken)
- ❌ Users confused when role reverts unexpectedly
- ❌ Performance lag during navigation

**System Impact**:
- ⚠️ Excessive Convex mutations (metered/cost impact)
- ⚠️ Database write load
- ⚠️ Network bandwidth waste
- ⚠️ Console spam (development impact)

**Severity**: **HIGH** (breaks core navigation functionality)

---

## The Fix

### Remove `currentMembership` from useEffect dependencies

**Change** (line 247-254):
```typescript
// BEFORE (buggy)
}, [
  urlOrgId,
  pathname,
  currentMembership?.activeFunctionalRole,
  currentMembership?.functionalRoles,
  switchActiveRole,
  currentMembership,  // ❌ This causes infinite loop
]);

// AFTER (fixed)
}, [
  urlOrgId,
  pathname,
  currentMembership?.activeFunctionalRole,  // ✅ Only depend on what we check
  currentMembership?.functionalRoles,
  switchActiveRole,
]);
// Note: Deliberately omit currentMembership - we already depend on the specific fields we need
```

**Why This Works**:
- We react to role changes (via `activeFunctionalRole`)
- We react to available roles changes (via `functionalRoles`)
- We DON'T trigger on irrelevant membership updates
- **Breaks the infinite loop** ✅

---

## Testing Plan

After applying fix:

1. **Within-org role switching**:
   - Login with multiple roles
   - Switch from Coach → Parent via dropdown
   - Verify switch happens exactly once
   - Check console shows max 1-2 log entries
   - Wait 30 seconds - should be silent

2. **Cross-org role switching**:
   - Switch from Org A (Coach) → Org B (Parent)
   - Verify navigation completes
   - Check correct org and role displayed
   - Monitor console for loops

3. **URL-based navigation**:
   - Manually navigate to `/orgs/[orgId]/coach`
   - Then to `/orgs/[orgId]/parents`
   - Verify role syncs from URL pathname
   - Check only ONE mutation per navigation

4. **Performance check**:
   - Open Network tab
   - Switch roles
   - Count mutation requests
   - Should see: 1-2 requests MAX (not hundreds)

---

## Relation to Phase 4

**Did Phase 4 cause this bug?** NO

**Did Phase 4 expose this bug?** YES

**Timeline**:
- Issue #279 opened before Phase 4
- Bug existed in `org-role-switcher.tsx` before Phase 4
- Phase 4 UAT testing (browser automation) discovered the console logs
- Phase 4 introduced `TabNotificationProvider` which uses `getMembersForAllOrganizations` query
- More queries → more re-renders → infinite loop became more visible

**Conclusion**: Pre-existing bug made worse by increased query activity in Phase 4.

---

## Recommendation

**Priority**: CRITICAL - Fix before merging Phase 4

**Action Items**:
1. ✅ Apply the dependency array fix (remove `currentMembership`)
2. ✅ Run full testing plan (within-org, cross-org, URL navigation)
3. ✅ Verify console silent after switches
4. ✅ Check Network tab shows minimal mutations
5. ✅ Update issue #279 with fix details
6. ✅ Add regression test to prevent recurrence

**Estimated Fix Time**: 5 minutes (one-line change + testing)

---

## Related Documentation

- [role-switcher-infinite-loop.md](./role-switcher-infinite-loop.md) - Detailed bug report
- [phase4-uat-results.md](../testing/phase4-uat-results.md) - How bug was discovered

---

*Analysis completed during Phase 4 UAT testing - January 20, 2026*
