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

**File**: `apps/web/src/components/layout/org-role-switcher.tsx` (line 230-238)

**Likely Issue**: useEffect dependency array causing re-renders

The role sync logic runs on every render and:
1. Detects URL role is "parent"
2. Current role state shows "coach" (stale)
3. Calls switchActiveFunctionalRole mutation
4. Mutation completes
5. Component re-renders
6. Role state somehow still shows "coach" OR comparison logic broken
7. Loop repeats

**Possible Causes**:
1. Session state not updating synchronously after mutation
2. useEffect dependencies triggering on every render
3. Role comparison logic using stale closure values
4. Missing memoization causing false-positive mismatches

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

### Option 1: Add Switch Guard (Quick Fix)

```typescript
// Track last successful switch to prevent loops
const lastSwitchRef = useRef<{role: string, timestamp: number} | null>(null);

useEffect(() => {
  if (urlRole && urlRole !== currentRole) {
    const now = Date.now();
    const lastSwitch = lastSwitchRef.current;
    
    // Debounce: Don't switch again if we switched in last 2 seconds
    if (lastSwitch && 
        lastSwitch.role === urlRole && 
        now - lastSwitch.timestamp < 2000) {
      return;
    }
    
    switchRole(urlRole);
    lastSwitchRef.current = { role: urlRole, timestamp: now };
  }
}, [urlRole, currentRole]);
```

### Option 2: Fix Root Cause (Proper Fix)

1. **Investigate session state updates**:
   - Check if `currentMembership.activeFunctionalRole` updates immediately after mutation
   - Add logging to see when state changes

2. **Review useEffect dependencies**:
   - Ensure currentRole is properly memoized
   - Check if session query is causing re-renders

3. **Add comparison guard**:
   - Use a ref to track "switching in progress" state
   - Skip switch if already switching

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

- `apps/web/src/components/layout/org-role-switcher.tsx` (main component)
- `packages/backend/convex/models/members.ts` (switchActiveFunctionalRole mutation)
- `apps/web/src/lib/auth-client.ts` (session management)

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
