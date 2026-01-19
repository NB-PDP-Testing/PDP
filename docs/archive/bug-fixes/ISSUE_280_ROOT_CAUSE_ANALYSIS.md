# Issue #280 - Root Cause Analysis

**Date:** January 18, 2026
**Analyst:** Claude (AI Code Review)
**Method:** 100% code-based analysis - no assumptions

---

## Executive Summary

After comprehensive review of the frontend components, backend mutations, schema definitions, and route structures, this document identifies the verified root causes for the bugs documented in Issue #280 UAT reports (Parts 1-3).

---

## Bug #6: Role Switcher Click Handler Doesn't Navigate

### Symptom
Clicking a role button (e.g., "Parent") in the role switcher dialog closes the dialog but does not navigate to the role's dashboard.

### Root Cause: Silent Error Handling with No User Feedback

**File:** `apps/web/src/components/org-role-switcher.tsx`
**Lines:** 302-348

```typescript
const handleSwitchRole = async (orgId: string, role: FunctionalRole) => {
  // ... validation ...

  setOpen(false);  // Dialog closes immediately (line 313)
  setSwitching(true);

  try {
    // If different org, switch org first
    if (!isCurrentOrg) {
      await authClient.organization.setActive({
        organizationId: orgId,
      });
    }

    // Switch the active role (LINE 325-328)
    await switchActiveRole({
      organizationId: orgId,
      functionalRole: role,
    });

    // ... track access ...

    // Redirect to appropriate dashboard (LINE 342)
    router.push(getRoleDashboardRoute(orgId, role));
  } catch (error) {
    console.error("Error switching role:", error);  // ERROR LOGGED BUT NOT SHOWN
  } finally {
    setSwitching(false);
  }
};
```

**Issue Flow:**
1. User clicks role button → Dialog closes immediately (line 313)
2. `switchActiveRole` mutation is called (lines 325-328)
3. If mutation FAILS (throws error), catch block only logs to console (line 344)
4. User sees nothing - dialog is already closed
5. `router.push` (line 342) is NEVER reached because it's inside the try block

### Backend Validation That Can Throw

**File:** `packages/backend/convex/models/members.ts`
**Lines:** 2209-2216

```typescript
const functionalRoles: ("coach" | "parent" | "admin" | "player")[] =
  (memberResult as any).functionalRoles || [];

if (!functionalRoles.includes(args.functionalRole)) {
  throw new Error(
    `You don't have the ${args.functionalRole} role in this organization`
  );
}
```

**The mutation throws if:**
- User's `functionalRoles` array doesn't include the requested role
- `functionalRoles` is undefined/null (defaults to empty array)

### Verification
The test user's membership record may not have "parent" in the `functionalRoles` array, despite what's displayed in the UI. The role button visibility might be based on different logic than the backend validation.

### Fix Required
1. Add error handling with user feedback (toast notification)
2. Verify role button visibility matches backend `functionalRoles` array
3. Consider showing loading state on the button instead of closing dialog immediately

---

## Bug #7: Parent Route Redirects to /coach

### Symptom
Navigating directly to `/orgs/{orgId}/parents` briefly shows the URL then redirects to `/coach`.

### Root Cause: URL-to-Role Sync Only Works If User Has Role

**File:** `apps/web/src/components/org-role-switcher.tsx`
**Lines:** 198-280

The `useEffect` syncs `activeFunctionalRole` with the URL pathname:

```typescript
useEffect(() => {
  const syncRoleFromURL = async () => {
    // ... validation ...

    // Extract role from URL pathname (line 215-223)
    const roleMatch = pathname.match(ROLE_PATHNAME_REGEX);
    const urlRole = (
      roleMatch[1] === "parents" ? "parent" : roleMatch[1]
    ) as FunctionalRole;

    // Check if user has this role (LINE 227)
    const hasRole = currentMembership.functionalRoles?.includes(urlRole);

    if (hasRole) {
      // Sync only happens if user has the role
      await switchActiveRole({...});
    }
    // If user doesn't have role, NOTHING HAPPENS
    // activeFunctionalRole stays as "coach"
  };

  syncRoleFromURL();
}, [...]);
```

**Issue Flow:**
1. User is on `/coach` with `activeFunctionalRole = "coach"`
2. User navigates directly to `/parents`
3. URL sync useEffect runs
4. Checks if user has "parent" role - returns FALSE
5. No sync happens, `activeFunctionalRole` stays as "coach"
6. Meanwhile, the parents page loads and may encounter issues

### Additional Factor: Parents Page Access Check

**File:** `apps/web/src/app/orgs/[orgId]/parents/page.tsx`
**Lines:** 60-70, 104-137

```typescript
const hasParentRole = useMemo(() => {
  if (!roleDetails) {
    return false;
  }
  return (
    roleDetails.functionalRoles.includes("parent") ||
    roleDetails.functionalRoles.includes("admin") ||
    roleDetails.betterAuthRole === "owner" ||
    roleDetails.betterAuthRole === "admin"
  );
}, [roleDetails]);

// Lines 104-137: Shows "Access Required" message but NO REDIRECT
```

The parents page does NOT redirect - it shows an access denied message. However, if an error is thrown during render, Next.js error handling could cause fallback behavior.

### Potential Redirect Source

The most likely redirect path is:
1. Parents page throws an error during render (possibly from a query failure)
2. Error propagates up, page fails to load
3. User ends up back at previous page or Next.js handles the error

**Note:** There is NO explicit redirect code from `/parents` to `/coach` in the codebase.

---

## Bugs #3-5: Sidebar and Quick Actions Navigation Fails

### Symptom
- Sidebar links don't navigate
- Quick Actions menu items don't navigate
- Direct URL navigation to sub-routes redirects back to `/coach`

### Component Analysis

#### Coach Sidebar
**File:** `apps/web/src/components/layout/coach-sidebar.tsx`
**Lines:** 198-219

```typescript
<Link href={item.href as Route} key={item.href}>
  <Button
    className="w-full justify-start gap-2"
    size="sm"
    style={active && primaryColor ? {...} : undefined}
    variant={active ? "secondary" : "ghost"}
  >
    <ItemIcon className="h-4 w-4" />
    {item.label}
  </Button>
</Link>
```

**Link hrefs are correct:**
- `/orgs/${orgId}/coach/players`
- `/orgs/${orgId}/coach/assess`
- `/orgs/${orgId}/coach/shared-passports`

#### Quick Actions
**File:** `apps/web/src/app/orgs/[orgId]/coach/layout.tsx`
**Lines:** 111-177

```typescript
const defaultActions = [
  {
    id: "assess",
    icon: Edit,
    label: "Assess Players",
    onClick: () => router.push(`/orgs/${orgId}/coach/assess` as Route),
    color: "bg-blue-600 hover:bg-blue-700",
  },
  // ... more actions ...
];
```

**Navigation is correct:** Uses `router.push` with proper routes.

### Route Files Verification

All route files exist:
```
apps/web/src/app/orgs/[orgId]/coach/
├── players/page.tsx       ✅ EXISTS
├── assess/page.tsx        ✅ EXISTS
├── shared-passports/page.tsx  ✅ EXISTS
├── voice-notes/page.tsx   ✅ EXISTS
├── goals/page.tsx         ✅ EXISTS
├── injuries/page.tsx      ✅ EXISTS
├── medical/page.tsx       ✅ EXISTS
├── session-plans/page.tsx ✅ EXISTS
├── match-day/             ❓ NEEDS VERIFICATION
└── layout.tsx             ✅ EXISTS
```

### Root Cause: Coach Layout Access Check Re-Running

**File:** `apps/web/src/app/orgs/[orgId]/coach/layout.tsx`
**Lines:** 51-88

```typescript
useEffect(() => {
  const checkAccess = async () => {
    try {
      // Set the active organization first
      await authClient.organization.setActive({ organizationId: orgId });

      // Get the user's membership in this organization
      const { data: member } =
        await authClient.organization.getActiveMember();

      if (!member) {
        setHasAccess(false);  // Will trigger redirect to /orgs
        return;
      }

      // Check if user has coach functional role
      const functionalRoles = (member as any).functionalRoles || [];
      const hasCoachRole = functionalRoles.includes("coach");
      const isOrgAdmin = member.role === "admin" || member.role === "owner";

      setHasAccess(hasCoachRole || isOrgAdmin);
    } catch (error) {
      console.error("Error checking coach access:", error);
      setHasAccess(false);  // Error = no access = redirect
    }
  };

  checkAccess();
}, [orgId]);

// Redirect if no access (lines 84-88)
useEffect(() => {
  if (hasAccess === false) {
    router.replace("/orgs");  // Redirects to /orgs, NOT /coach
  }
}, [hasAccess, router]);
```

**Key Observations:**
1. The layout redirects to `/orgs` (not `/coach`) if access denied
2. Access check runs on every navigation within `/coach/*` routes
3. If `authClient.organization.getActiveMember()` fails temporarily, access is denied

### Potential Issue: Race Condition or Async Auth State

The access check is async and runs on every mount. If:
1. User navigates to `/coach/players`
2. Layout mounts and runs access check
3. Auth state is briefly unavailable during navigation
4. `getActiveMember()` returns null temporarily
5. `hasAccess` is set to false
6. Redirect to `/orgs` triggers
7. `/orgs/[orgId]/page.tsx` sees `activeFunctionalRole = "coach"` and redirects to `/coach`

This would create a loop where:
- `/coach/players` → check fails → `/orgs` → auto-redirect to `/coach`

---

## Schema Verification

**File:** `packages/backend/convex/betterAuth/schema.ts`
**Lines:** 127-146

```typescript
// Custom field: functional roles for sports club capabilities
functionalRoles: v.optional(
  v.array(
    v.union(
      v.literal("coach"),
      v.literal("parent"),
      v.literal("admin"),
      v.literal("player")
    )
  )
),

// Active functional role - which role the user is currently operating as
activeFunctionalRole: v.optional(
  v.union(
    v.literal("coach"),
    v.literal("parent"),
    v.literal("admin"),
    v.literal("player")
  )
),
```

Schema is correct. Both fields properly defined.

---

## Recommended Fixes

### Bug #6 Fix
```typescript
// In handleSwitchRole function (org-role-switcher.tsx)
} catch (error) {
  console.error("Error switching role:", error);
  toast.error("Failed to switch role", {
    description: error instanceof Error ? error.message : "Please try again",
  });
  setOpen(true); // Re-open dialog so user can retry
} finally {
```

### Bug #7 Fix
1. Add explicit access check in parents page that redirects appropriately
2. Or: Show proper "No Access" UI instead of silent failure

### Bugs #3-5 Fix
1. Add loading state protection in coach layout access check
2. Don't set `hasAccess = false` on temporary auth unavailability
3. Add retry logic for access check
4. Consider caching access check result to avoid re-running on every navigation

---

## Files Involved Summary

| File | Lines | Issue |
|------|-------|-------|
| `apps/web/src/components/org-role-switcher.tsx` | 302-348, 198-280 | Silent error handling, URL sync |
| `apps/web/src/app/orgs/[orgId]/coach/layout.tsx` | 51-88 | Access check race condition |
| `packages/backend/convex/models/members.ts` | 2209-2216 | Role validation throws |
| `apps/web/src/app/orgs/[orgId]/page.tsx` | 79-93 | Auto-redirect based on activeFunctionalRole |

---

## Next Steps

1. Verify test user's actual `functionalRoles` array in database
2. Add console logging to track auth state during navigation
3. Implement suggested fixes with proper error handling
4. Re-run UAT after fixes applied
