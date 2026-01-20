# Bug: Role Switcher Infinite Loop

**Discovered**: January 20, 2026 during Phase 4 UAT testing  
**Severity**: Medium (Performance impact, not blocking functionality)  
**Component**: `org-role-switcher.tsx`

---

## Symptoms

Console shows repeated role switching logs in rapid succession:

```
[Role Sync] Syncing role from URL: parent (was: coach)
[CONVEX M] Switched to parent for user...
[Role Sync] ✅ Successfully synced role
[Role Sync] Syncing role from URL: parent (was: coach)
[CONVEX M] Switched to parent for user...
```

This repeats continuously, causing:
- Excessive Convex mutations
- Console log spam
- Potential performance degradation
- Unnecessary network requests

---

## Root Cause Analysis

**File**: `apps/web/src/components/org-role-switcher.tsx` (lines 206-254)

**CONFIRMED ROOT CAUSE**: useEffect dependency array includes entire `currentMembership` object

**The Bug** (line 247-254):
```typescript
}, [
  urlOrgId,
  pathname,
  currentMembership?.activeFunctionalRole,
  currentMembership?.functionalRoles,
  switchActiveRole,
  currentMembership,  // ⚠️ ENTIRE OBJECT - causes infinite loop!
]);
```

**Why It Loops**:
1. Effect runs, detects `urlRole !== currentRole`
2. Calls `switchActiveRole` mutation (line 234)
3. Convex updates membership in database
4. React query receives updated `allMemberships` array
5. `currentMembership` object reference changes (new object from Convex)
6. useEffect triggers because `currentMembership` dependency changed
7. Effect runs again → **INFINITE LOOP**

**The Problem**: We're already depending on specific fields (`currentMembership?.activeFunctionalRole`, `currentMembership?.functionalRoles`), but we ALSO included the entire `currentMembership` object. Every Convex update creates a new object reference, triggering the effect even when the actual role values haven't changed.

**Related to Issue #279**: This infinite loop causes:
- Role switches to appear "stuck" (rapidly switching back/forth)
- Inconsistent switching behavior (race conditions)
- Roles reverting to previous state unexpectedly

---

## Reproduction Steps

1. Login as user with multiple roles (coach, parent, admin)
2. Switch from Coach to Parent role
3. Navigate to /parents page
4. Open console
5. Observe repeated role sync logs

---

## Impact

**Performance**:
- Hundreds of unnecessary Convex mutations per minute
- Database writes for each switch attempt
- Network bandwidth waste

**User Experience**:
- No visible UI impact (works correctly despite loop)
- May cause slight performance lag

**Development**:
- Console spam makes debugging difficult
- Hides other important log messages

---

## Recommended Fix

### **PROPER FIX: Remove `currentMembership` from dependency array**

**Change line 247-254 from:**
```typescript
}, [
  urlOrgId,
  pathname,
  currentMembership?.activeFunctionalRole,
  currentMembership?.functionalRoles,
  switchActiveRole,
  currentMembership,  // ❌ REMOVE THIS
]);
```

**To:**
```typescript
}, [
  urlOrgId,
  pathname,
  currentMembership?.activeFunctionalRole,  // ✅ Keep - this is what we check
  currentMembership?.functionalRoles,       // ✅ Keep - this is what we check
  switchActiveRole,                         // ✅ Keep - stable function reference
]);
// Note: We deliberately omit currentMembership from deps since we already
// depend on the specific fields we need (activeFunctionalRole, functionalRoles)
```

**Why This Works**:
- We still react to role changes (via `activeFunctionalRole`)
- We still react to available roles changes (via `functionalRoles`)
- We DON'T react to irrelevant membership updates (timestamps, metadata, etc.)
- Breaks the infinite loop

### Alternative: Add "Switching in Progress" Guard

If removing the dependency causes ESLint warnings, add a guard:

```typescript
const [isSwitching, setIsSwitching] = useState(false);

useEffect(() => {
  const syncRoleFromURL = async () => {
    if (!(urlOrgId && currentMembership && pathname)) return;
    if (isSwitching) return; // ✅ Prevent concurrent switches

    // ... rest of logic

    if (hasRole && needsSync) {
      setIsSwitching(true);
      try {
        await switchActiveRole({ /* ... */ });
      } finally {
        setIsSwitching(false);
      }
    }
  };

  syncRoleFromURL();
}, [ /* keep all deps */ ]);
```

---

## Workaround

For immediate relief, can disable console logging in development:

```typescript
if (process.env.NODE_ENV !== 'production') {
  // Comment out or remove console.log statements
}
```

---

## Related Files

- `apps/web/src/components/org-role-switcher.tsx` (main component - lines 206-254)
- `packages/backend/convex/models/members.ts` (switchActiveFunctionalRole mutation)
- `packages/backend/convex/models/members.ts` (getMembersForAllOrganizations query - line 177)

---

## Testing After Fix

1. Switch roles multiple times
2. Verify only ONE mutation call per switch
3. Check console shows maximum 1-2 log entries per switch
4. Monitor for 30 seconds after switch - should be silent

---

## Priority

**Medium Priority**:
- Not blocking any functionality
- No user-visible issues
- Can be addressed in next sprint

**Should fix before production** to avoid:
- Excessive Convex costs (mutations are metered)
- Database load
- Log noise

---

*Discovered during automated Phase 4 UAT testing*
