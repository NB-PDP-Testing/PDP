# Role Switcher Issues - Combined Analysis and Fix Plan

**Issues**:
- [#226](https://github.com/NB-PDP-Testing/PDP/issues/226) - Role switcher out of sync with current page
- [#224](https://github.com/NB-PDP-Testing/PDP/issues/224) - Showing organizations with no roles

**Date**: January 14, 2026
**Status**: In Progress

## Problem Statement

### Issue #226: Role Switcher Out of Sync
The role switcher component sometimes shows the user in a different role than the page they are currently viewing. The `activeFunctionalRole` is not staying in real-time sync with the current page's role.

### Issue #224: Showing Organizations with No Roles
The role switcher displays ALL organizations the user is a Better Auth member of, even if they have NO functional roles assigned. These organizations show "No roles assigned" but should not appear in the switcher at all.

### Example Scenarios

**Issue #226 Scenario**:
1. User is on `/orgs/123/coach` - role switcher shows "Coach" ✅
2. User clicks a link to `/orgs/123/admin`
3. Admin page loads and renders correctly ✅
4. **BUG #226**: Role switcher still shows "Coach" instead of "Admin" ❌

**Issue #224 Scenario**:
1. User is a member of "Org A" with roles: Coach, Parent
2. User is a Better Auth member of "Org B" but has NO functional roles
3. User opens role switcher
4. **BUG #224**: "Org B" appears in the list with "No roles assigned" ❌
5. User shouldn't see "Org B" at all - they can't actually access it

## Root Cause Analysis

### How the System Currently Works

#### 1. Role Switcher Display Logic
Location: `apps/web/src/components/org-role-switcher.tsx` (Line 348)

```tsx
currentOrg && currentMembership?.activeFunctionalRole
```

The role switcher displays:
- **currentOrg**: Found from URL params `params.orgId` (Line 172-174)
- **currentMembership?.activeFunctionalRole**: Read from **database** (Line 175-177)

The query used:
```tsx
const allMemberships = useQuery(
  api.models.members.getMembersForAllOrganizations
);
```

#### 2. Role Switching Logic
Location: `apps/web/src/components/org-role-switcher.tsx` (Line 191-226)

```tsx
const handleSwitchRole = async (orgId: string, role: FunctionalRole) => {
  // ... validation logic ...

  // If different org, switch org first
  if (!isCurrentOrg) {
    await authClient.organization.setActive({
      organizationId: orgId,
    });
  }

  // Switch the active role IN DATABASE
  await switchActiveRole({
    organizationId: orgId,
    functionalRole: role,
  });

  // Redirect to appropriate dashboard
  router.push(getRoleDashboardRoute(orgId, role));
}
```

#### 3. Backend Mutation
Location: `packages/backend/convex/models/members.ts` (Line 2133-2221)

```ts
export const switchActiveFunctionalRole = mutation({
  handler: async (ctx, args) => {
    // ... validation ...

    // Update active functional role IN DATABASE
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "member",
        where: [{ field: "_id", value: memberResult._id, operator: "eq" }],
        update: {
          activeFunctionalRole: args.functionalRole, // ← Database field
        } as any,
      },
    });
  },
});
```

#### 4. Page Layouts (Admin, Coach, etc.)
Location:
- `apps/web/src/app/orgs/[orgId]/admin/layout.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/layout.tsx`

**Key Finding**: Layouts do NOT check or sync `activeFunctionalRole`

- **Admin layout** (Line 38-67): Only checks if user has `organization:update` permission
- **Coach layout**: No role checking at all, just renders

### The Core Problem: Issue #226

The `activeFunctionalRole` field in the database is **ONLY updated** when:
1. User explicitly clicks a role in the role switcher
2. The `switchActiveFunctionalRole` mutation is called

The `activeFunctionalRole` is **NOT updated** when:
1. User navigates via direct URL (`/orgs/123/admin`)
2. User clicks navigation links within a role dashboard
3. User uses browser back/forward buttons
4. User uses keyboard shortcuts or other navigation methods

This creates a **desync** between:
- **What the database thinks** (`activeFunctionalRole` field)
- **What page is actually shown** (URL path)

### The Core Problem: Issue #224

Location: `apps/web/src/components/org-role-switcher.tsx` (Line 322-334)

```tsx
// Build org-role structure for display
const orgRoleStructure = organizations.map((org: Organization) => {
  const membership = allMemberships?.find((m) => m.organizationId === org.id);
  return {
    org,
    membership,
    roles: (membership?.functionalRoles || []) as FunctionalRole[],  // ← Empty array if no membership
    activeRole: membership?.activeFunctionalRole || null,
    pendingRequests: (membership?.pendingRoleRequests || []) as Array<{...}>,
  };
});
```

The problem:
1. **`organizations`** comes from Better Auth: `authClient.useListOrganizations()` (line 152-153)
   - Returns ALL organizations the user is a Better Auth member of
   - Includes orgs where user has NO functional roles

2. **`allMemberships`** comes from Convex: `getMembersForAllOrganizations` (line 157-159)
   - Returns ONLY memberships with functional roles
   - May not include all organizations from Better Auth list

3. **The mapping** (line 322) iterates over ALL Better Auth organizations
   - If org not in `allMemberships`, `membership` is `undefined`
   - Results in `roles: []` and `pendingRequests: []`

4. **The display** (line 412-417) shows these empty orgs:
```tsx
{roles.length === 0 && pendingRequests.length === 0 ? (
  <CommandItem disabled>
    <span className="text-muted-foreground text-sm">
      No roles assigned
    </span>
  </CommandItem>
) : (
  ...
```

**Why this is a problem:**
- Users see organizations they can't actually access
- Clutters the role switcher UI
- Confusing user experience - "Why am I seeing this org?"
- These orgs exist in Better Auth from when user was added as a basic member, but never got functional roles assigned

## Navigation Patterns That Cause Desync

### 1. Direct Navigation Links
```tsx
// Common in layout sidebars and nav items
<Link href={`/orgs/${orgId}/admin`}>Admin Panel</Link>
```
**Result**: Page changes, database does NOT update

### 2. Router.push() Calls
```tsx
// Common in button onClick handlers
router.push(`/orgs/${orgId}/coach` as Route);
```
**Result**: Page changes, database does NOT update

### 3. Browser Navigation
- Back button
- Forward button
- Typing URL directly
**Result**: Page changes, database does NOT update

### 4. External Links
- Email links
- Bookmarks
- Shared URLs
**Result**: Page changes, database does NOT update

## Current URL Structure

Role pages follow this pattern:
```
/orgs/[orgId]/[role]/...

Examples:
/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/admin
/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/coach
/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/parents
/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/player
```

## Proposed Solutions

### Combined Fix (Recommended)

Fix both issues with minimal code changes to `org-role-switcher.tsx`:

**Fix #226 - Sync on Page Load**:
- Add `useEffect` that detects URL changes and syncs the database
- Extract role from URL pathname using `usePathname()` hook
- Compare with `activeFunctionalRole` and update if mismatched

**Fix #224 - Filter Empty Organizations**:
- Filter `orgRoleStructure` to exclude orgs with no roles and no pending requests
- One-line change after building the structure

**Pros**:
- Fixes both issues with minimal code changes
- No breaking changes to existing functionality
- Works for all navigation patterns
- Maintains real-time sync via Convex subscriptions

**Cons**:
- Extra database write on page navigation (only when role changes)
- Small performance overhead (mitigated by only syncing on mismatch)

**Implementation**:

**Part 1: Add pathname tracking and sync logic**
```tsx
// At the top of the component, add pathname
import { useParams, usePathname, useRouter } from "next/navigation";

export function OrgRoleSwitcher({ className }: OrgRoleSwitcherProps) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname(); // ← ADD THIS
  const urlOrgId = params.orgId as string | undefined;
  // ... rest of existing code

  // ADD THIS USEEFFECT - Fix for Issue #226
  useEffect(() => {
    const syncRoleFromURL = async () => {
      if (!urlOrgId || !currentMembership || !pathname) return;

      // Extract role from URL pathname
      const roleMatch = pathname.match(/\/orgs\/[^/]+\/(admin|coach|parents|player)/);
      if (!roleMatch) return; // Not on a role page

      const urlRole = roleMatch[1] === 'parents' ? 'parent' : roleMatch[1];
      const currentRole = currentMembership.activeFunctionalRole;

      // Only sync if there's a mismatch
      if (urlRole !== currentRole) {
        // Check if user has this role
        const hasRole = currentMembership.functionalRoles?.includes(urlRole);

        if (hasRole) {
          console.log(`[Role Sync] Syncing role from URL: ${urlRole} (was: ${currentRole})`);
          try {
            await switchActiveRole({
              organizationId: urlOrgId,
              functionalRole: urlRole as FunctionalRole,
            });
          } catch (error) {
            console.error('[Role Sync] Failed to sync role:', error);
          }
        }
      }
    };

    syncRoleFromURL();
  }, [urlOrgId, pathname, currentMembership, switchActiveRole]);
```

**Part 2: Filter organizations with no roles**
```tsx
// CHANGE THIS (around line 322-334):
const orgRoleStructure = organizations.map((org: Organization) => {
  const membership = allMemberships?.find((m) => m.organizationId === org.id);
  return {
    org,
    membership,
    roles: (membership?.functionalRoles || []) as FunctionalRole[],
    activeRole: membership?.activeFunctionalRole || null,
    pendingRequests: (membership?.pendingRoleRequests || []) as Array<{
      role: FunctionalRole;
      requestedAt: string;
    }>,
  };
});

// TO THIS - Fix for Issue #224:
const orgRoleStructure = organizations
  .map((org: Organization) => {
    const membership = allMemberships?.find((m) => m.organizationId === org.id);
    return {
      org,
      membership,
      roles: (membership?.functionalRoles || []) as FunctionalRole[],
      activeRole: membership?.activeFunctionalRole || null,
      pendingRequests: (membership?.pendingRoleRequests || []) as Array<{
        role: FunctionalRole;
        requestedAt: string;
      }>,
    };
  })
  .filter(({ roles, pendingRequests }) =>
    roles.length > 0 || pendingRequests.length > 0
  ); // ← ADD THIS FILTER to exclude orgs with no roles
```

### Option 2: Derive Role from URL (Alternative)
**Approach**: Don't use database `activeFunctionalRole` for display, derive from URL instead

**Pros**:
- No database writes needed
- Always accurate
- Simpler logic

**Cons**:
- Database field becomes stale/unused
- Need to refactor other code that relies on `activeFunctionalRole`
- Can't track "last used role" across sessions

### Option 3: Add Middleware (Overkill)
**Approach**: Use Next.js middleware to intercept all role page navigations

**Pros**:
- Centralized logic
- Works before page renders

**Cons**:
- Complex setup
- Server-side logic needed
- May impact performance

## Recommended Solution: Option 1

### Implementation Plan

1. **Add pathname tracking to role switcher**
   - Import `usePathname` from Next.js
   - Track pathname changes

2. **Add role extraction utility**
   ```ts
   function extractRoleFromPathname(pathname: string): FunctionalRole | null {
     const match = pathname.match(/\/orgs\/[^/]+\/(admin|coach|parents|player)/);
     if (!match) return null;
     return match[1] === 'parents' ? 'parent' : match[1];
   }
   ```

3. **Add sync useEffect**
   - Detect when URL role differs from database role
   - Only sync if user has the role
   - Add debouncing to prevent rapid updates

4. **Add loading state**
   - Show subtle indicator while syncing
   - Prevent race conditions

5. **Add error handling**
   - Handle permission errors gracefully
   - Fall back to current role if sync fails

### Edge Cases to Handle

1. **User doesn't have the role they're trying to access**
   - Redirect to appropriate dashboard
   - Show error message

2. **Multiple rapid navigations**
   - Debounce sync calls
   - Cancel in-flight requests

3. **Network errors during sync**
   - Retry logic
   - Don't break navigation

4. **Concurrent tabs**
   - Use Convex real-time subscriptions
   - Auto-update when other tab changes role

## Testing Plan

### Manual Testing Scenarios

1. **Direct Navigation**
   - Start on coach page
   - Type `/admin` in URL
   - Verify role switcher updates to "Admin"

2. **Link Navigation**
   - Click sidebar link to different role
   - Verify role switcher updates

3. **Browser Navigation**
   - Navigate forward/back
   - Verify role switcher stays synced

4. **Role Switcher Explicit Switch**
   - Use role switcher to change role
   - Verify no double-update occurs

5. **Permission Check**
   - Navigate to role user doesn't have
   - Verify graceful handling

### Visual Testing with dev-browser

```tsx
// Test script
const page = await client.page("role-test");
await page.goto("http://localhost:3000/orgs/[orgId]/coach");
await page.waitForTimeout(1000);

// Click link to admin
await page.click('a[href*="/admin"]');
await page.waitForTimeout(2000);

// Check role switcher text
const roleSwitcherText = await page.textContent('[role="button"]');
console.log("Role switcher shows:", roleSwitcherText);
// Should contain "Admin"
```

## Success Criteria

**Issue #226 - Role Sync:**
✅ Role switcher always shows the role matching the current page URL
✅ Works for all navigation methods (links, back/forward, direct URL, typing)
✅ Database syncs automatically when URL changes to different role
✅ No race conditions or flickering during sync
✅ Graceful error handling when sync fails
✅ Works across multiple tabs/windows (via Convex real-time updates)

**Issue #224 - Filter Empty Orgs:**
✅ Role switcher only shows organizations where user has at least one role
✅ Organizations with pending role requests still show up
✅ Organizations with no roles and no pending requests are hidden
✅ "Request a Role" option available for requesting roles in existing orgs
✅ Clean, uncluttered UI showing only accessible organizations

## Files to Modify

1. `apps/web/src/components/org-role-switcher.tsx` - **ONLY file that needs changes**
   - Add `usePathname` import
   - Add sync useEffect for issue #226
   - Add `.filter()` to `orgRoleStructure` for issue #224

## Next Steps

1. ✅ Complete analysis
2. ⏳ Get user approval on approach
3. ⏳ Test current behavior visually
4. ⏳ Implement Option 1
5. ⏳ Test implementation thoroughly
6. ⏳ Create PR and merge

---

**Analysis completed by**: Claude Sonnet 4.5
**Date**: 2026-01-14
