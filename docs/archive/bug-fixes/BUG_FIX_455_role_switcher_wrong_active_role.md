# Bug Fix: Role Switcher Shows Wrong Active Role

**Issue:** #455 — Bug: Role Switcher sometimes not showing correctly Role Pages
**Branch:** jkobrien/455_role_Switcher

---

## Root Cause

The `syncRoleFromURL` useEffect in `org-role-switcher.tsx` is responsible for keeping the database's `activeFunctionalRole` in sync with the current URL path. This ensures that when a user navigates directly to `/coach`, the role switcher updates to show "Coach ✓" even if the DB still has a different role stored.

The bug was that the sync **never ran on initial page load**.

`prevPathnameRef` is initialized to the current `pathname`:

```typescript
const prevPathnameRef = useRef(pathname); // initialized to CURRENT path
```

So on the very first useEffect run, `pathnameChanged = (pathname !== pathname) = false` and the effect returned early without syncing.

When Convex membership data loaded asynchronously (changing `currentMembership` from `undefined`), the effect fired again — but `prevPathnameRef.current` had already been set to the current path, so `pathnameChanged` was still `false`.

**Result:** A user arriving at `/coach` with `activeFunctionalRole = "admin"` stored in the DB (via bookmark, direct URL, browser back button, or header nav click) would see "Admin ✓" in the role switcher indefinitely.

---

## What Was Changed

**File:** `apps/web/src/components/org-role-switcher.tsx`

Added a `hasInitialSyncedRef` boolean ref to track whether the initial URL sync has been performed. On the first run where `currentMembership` is available, the sync proceeds regardless of whether the pathname "changed" from React's perspective.

```typescript
const hasInitialSyncedRef = useRef(false);

// In the effect:
const isFirstLoad = !hasInitialSyncedRef.current && !!currentMembership;
if (isFirstLoad) {
  hasInitialSyncedRef.current = true;
}

if (!(pathnameChanged || isFirstLoad)) {
  return; // Membership changed from a manual switch - skip sync
}
```

The existing race-condition protection (preventing sync-back after a manual role switch where membership updates before navigation completes) is preserved: subsequent membership-only changes still skip the sync because `isFirstLoad` becomes `false` after the first sync and `pathnameChanged` remains `false`.

Also removed a misleading comment that stated `currentMembership` was "deliberately omitted" from the dependency array when it was in fact included.

---

## Files Modified

- `apps/web/src/components/org-role-switcher.tsx`
- `docs/archive/bug-fixes/BUG_FIX_455_role_switcher_wrong_active_role.md` (this file)
