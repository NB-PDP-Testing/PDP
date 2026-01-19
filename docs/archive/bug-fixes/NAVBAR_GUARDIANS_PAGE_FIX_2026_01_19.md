# Admin Guardians Page Fix - January 19, 2026

## Issue Summary

**Test:** `NAVBAR-ADMIN-006: Guardians link`
**Status Before Fix:** ❌ Failing (navigation failed + React hydration errors)
**Status After Fix:** ✅ Passing (loads in ~16-17 seconds)

## Root Causes Identified

### 1. Invalid Convex ID Error ("current" vs Real ID)

**Location:** `apps/web/src/hooks/use-org-theme.ts:68`

**Problem:**
- When navigating to `/orgs/current/admin/guardians`, the `orgId` param is the literal string `"current"` (7 characters)
- The `useOrgTheme` hook was passing this directly to the Convex `getOrganization` query
- Convex IDs are much longer (32+ chars), so `"current"` is invalid
- This caused the query to fail with: `Invalid argument 'id' for 'db.get': Unable to decode ID: Invalid ID length 7`

**Fix:**
```typescript
// Before
const orgId = params?.orgId as string | undefined;
const org = useQuery(
  api.models.organizations.getOrganization,
  !skip && orgId ? { organizationId: orgId } : "skip"
);

// After
const orgIdParam = params?.orgId as string | undefined;

// Handle "current" org ID - use Better Auth's active organization
const { data: activeOrg } = authClient.useActiveOrganization();
const orgId = orgIdParam === "current" ? (activeOrg as any)?.id : orgIdParam;

const org = useQuery(
  api.models.organizations.getOrganization,
  !skip && orgId && orgId !== "current" ? { organizationId: orgId } : "skip"
);
```

**Why This Happens:**
- The `/orgs/current/page.tsx` is designed to REDIRECT from `/orgs/current` to `/orgs/{real-id}`
- But when navigating directly to `/orgs/current/admin/guardians`, Next.js skips the redirect page and goes straight to the guardians page
- The layout and header components still run with `orgId = "current"`

### 2. React Hydration Error (Nested Buttons)

**Location:** `apps/web/src/app/orgs/[orgId]/admin/guardians/page.tsx`

**Problem:**
- HTML doesn't allow `<button>` elements inside other `<button>` elements
- This causes React hydration mismatch errors
- Found in TWO places in the guardians page:
  1. **Player View** (line 788-794): Chevron icon inside clickable player row
  2. **Guardian View** (line 898-904): Chevron icon inside clickable guardian row

**Error Message:**
```
In HTML, <button> cannot be a descendant of <button>.
This will cause a hydration error.
```

**Fix:**
Changed the inner `<button>` elements to `<div>` since they're just decorative (the outer button handles all clicks):

```typescript
// Before (INVALID HTML)
<button onClick={() => toggleRow(id)}>
  <div className="flex items-center gap-4">
    <button className="text-muted-foreground">  {/* ❌ Nested button */}
      <ChevronDown className="h-5 w-5" />
    </button>
    ...
  </div>
</button>

// After (VALID HTML)
<button onClick={() => toggleRow(id)}>
  <div className="flex items-center gap-4">
    <div className="text-muted-foreground">  {/* ✅ Non-interactive div */}
      <ChevronDown className="h-5 w-5" />
    </div>
    ...
  </div>
</button>
```

## Files Modified

1. **apps/web/src/hooks/use-org-theme.ts**
   - Added import for `authClient`
   - Handle "current" orgId by resolving to active organization
   - Skip Convex query if orgId is still "current"

2. **apps/web/src/app/orgs/[orgId]/admin/guardians/page.tsx**
   - Line 788: Changed `<button>` to `<div>` (player view chevron)
   - Line 898: Changed `<button>` to `<div>` (guardian view chevron)

3. **apps/web/uat/tests/navigation/navbar-comprehensive.spec.ts**
   - Line 411-414: Moved error logging before assertion (debugging improvement)

## Test Results

### Before Fix
```
❌ NAVBAR-ADMIN-006: Guardians link
- Navigation failed (redirected back to /admin)
- Console errors: Invalid Convex ID + React hydration error
```

### After Fix (3 consecutive runs)
```
✅ NAVBAR-ADMIN-006: Guardians link - 17.1s
✅ NAVBAR-ADMIN-006: Guardians link - 16.3s
✅ NAVBAR-ADMIN-006: Guardians link - 16.6s

Average: 16.7 seconds (well under 30s timeout)
Pass rate: 100% (3/3)
```

## Related Issues

This fix also benefits ANY page under `/orgs/current/*` routes:
- `/orgs/current/admin/*`
- `/orgs/current/coach/*`
- `/orgs/current/parents/*`
- etc.

All these routes will now properly resolve the organization ID instead of passing the literal string "current" to Convex queries.

## Prevention

To prevent similar issues:

1. **For "current" routes:** Always use Better Auth's `useActiveOrganization()` hook rather than directly using URL params
2. **For nested buttons:** Use semantic HTML - if an element is purely decorative, use `<div>` or `<span>` instead of `<button>`
3. **For testing:** The navbar comprehensive tests now catch these issues early

## Commits

- Fix: Handle "current" orgId in useOrgTheme hook
- Fix: Remove nested buttons from guardians page (React hydration error)
- Test: Improve error logging in navbar tests

## Related Documentation

- `/orgs/current` redirect logic: `apps/web/src/app/orgs/current/page.tsx`
- Organization theming: `docs/features/organization-theming.md`
- Better Auth hooks: https://www.better-auth.com/docs/plugins/organization
