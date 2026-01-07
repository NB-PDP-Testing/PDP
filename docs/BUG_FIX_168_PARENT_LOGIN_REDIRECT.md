# Bug Fix: Issue #168 - Parent First Login Goes to Org Screen

## Issue Summary

**GitHub Issue**: https://github.com/NB-PDP-Testing/PDP/issues/168

**Problem**: When a parent is invited and accepts the invite, they are prompted to login/signup. After signup/login, they are incorrectly taken to the organization selection/join screen (`/orgs/join`) instead of the parent dashboard (`/orgs/{orgId}/parents`).

**Additional Finding**: On subsequent logins, parents who are already members of an organization are also being sent to `/orgs/join` instead of their dashboard.

## Root Cause Analysis

### Location of Bug
`apps/web/src/app/page.tsx` - The `RedirectToOrgs` component

### Original Flawed Logic

```javascript
function RedirectToOrgs() {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const user = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    // ... pending invitation check ...

    if (activeOrganization) {
      router.push(`/orgs/${activeOrganization.id}/coach` as Route);
    } else {
      // Platform staff go to /orgs, regular users go to /orgs/join
      if (user?.isPlatformStaff) {
        router.push("/orgs" as Route);
      } else {
        router.push("/orgs/join" as Route);  // ← BUG HERE
      }
    }
  }, [router, activeOrganization, user]);
  // ...
}
```

### Three Key Problems

1. **No check for existing organization memberships**: The code only checked for `activeOrganization`. If no active org was set (common after first login or when session state is lost), it fell through to the else branch regardless of actual membership status.

2. **Incorrect fallback routing**: Non-platform-staff users without an `activeOrganization` were sent to `/orgs/join`, even if they were already members of an organization.

3. **Wrong dashboard routing**: When an active org WAS found, it always routed to `/orgs/${id}/coach`, ignoring the user's actual functional role (parent, admin, player).

## Fix Applied

### Updated Logic in `apps/web/src/app/page.tsx`

```javascript
function RedirectToOrgs() {
  const { data: activeOrganization, isPending: activeOrgPending } = authClient.useActiveOrganization();
  const { data: userOrganizations, isPending: orgsListPending } = authClient.useListOrganizations();
  const user = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    // Check for pending invitation FIRST (highest priority)
    const pendingInvitationId =
      typeof window !== "undefined"
        ? sessionStorage.getItem("pendingInvitationId")
        : null;

    if (pendingInvitationId) {
      console.log("[Home] Found pending invitation:", pendingInvitationId);
      sessionStorage.removeItem("pendingInvitationId");
      router.push(`/orgs/accept-invitation/${pendingInvitationId}` as Route);
      return;
    }

    // Wait for data to load before making routing decisions
    if (activeOrgPending || orgsListPending || user === undefined) {
      return;
    }

    // If user has an active organization, redirect to org root
    // The org-level router will determine the correct dashboard based on functional role
    if (activeOrganization) {
      console.log("[Home] Active organization found:", activeOrganization.id);
      router.push(`/orgs/${activeOrganization.id}` as Route);
      return;
    }

    // If user has organization memberships but no active organization,
    // set the first one as active and redirect there
    if (userOrganizations && userOrganizations.length > 0) {
      const firstOrg = userOrganizations[0];
      console.log("[Home] User has org memberships, setting first as active:", firstOrg.id);
      
      authClient.organization.setActive({ organizationId: firstOrg.id })
        .then(() => {
          router.push(`/orgs/${firstOrg.id}` as Route);
        })
        .catch((error) => {
          console.error("[Home] Error setting active organization:", error);
          router.push(`/orgs/${firstOrg.id}` as Route);
        });
      return;
    }

    // No organization memberships - route based on user type
    if (user?.isPlatformStaff) {
      console.log("[Home] Platform staff with no orgs, going to /orgs");
      router.push("/orgs" as Route);
    } else {
      console.log("[Home] Regular user with no orgs, going to /orgs/join");
      router.push("/orgs/join" as Route);
    }
  }, [router, activeOrganization, activeOrgPending, userOrganizations, orgsListPending, user]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}
```

### Key Changes

1. **Added organization membership check**: Now fetches `userOrganizations` using `authClient.useListOrganizations()` to check actual membership status.

2. **Wait for data to load**: Added `isPending` checks to prevent premature routing decisions while data is loading.

3. **Auto-set active organization**: If user has memberships but no active org, automatically sets the first one as active before redirecting.

4. **Route to org root**: Changed redirect from `/orgs/${id}/coach` to `/orgs/${id}` so the org-level router (`/orgs/[orgId]/page.tsx`) can determine the correct dashboard based on the user's `activeFunctionalRole`.

5. **Proper fallback**: `/orgs/join` is now only shown to users who genuinely have no organization memberships.

## User Flow After Fix

### Parent User Who Accepted Invitation

1. Parent logs in → redirected to `/` (home)
2. `RedirectToOrgs` component loads
3. Fetches organization list via `authClient.useListOrganizations()`
4. Finds existing membership → sets organization as active
5. Redirects to `/orgs/{orgId}`
6. `/orgs/[orgId]/page.tsx` checks user's `activeFunctionalRole`
7. If role is "parent" → redirects to `/orgs/{orgId}/parents` (parent dashboard) ✓

### Previously Broken Flow

1. Parent logs in → redirected to `/` (home)
2. `RedirectToOrgs` checks `activeOrganization` → undefined (not persisted)
3. Falls through to else branch
4. Parent is not platform staff → redirects to `/orgs/join` ✗

## Files Modified

- `apps/web/src/app/page.tsx` - Updated `RedirectToOrgs` component

## Testing Recommendations

1. **First-time parent login after invitation acceptance**:
   - Invite a new parent user
   - Have them accept invitation and sign up
   - Verify they are taken to parent dashboard, not `/orgs/join`

2. **Subsequent parent login**:
   - Log out a parent who is already a member
   - Log back in
   - Verify they are taken to parent dashboard

3. **Coach login**:
   - Log in as a coach
   - Verify they are taken to coach dashboard

4. **Admin login**:
   - Log in as an admin
   - Verify they are taken to admin dashboard

5. **New user without invitation**:
   - Sign up as a new user (not through invitation)
   - Verify they are taken to `/orgs/join` to find an organization

## Related Files

- `apps/web/src/app/orgs/[orgId]/page.tsx` - Org-level router that determines dashboard based on functional role
- `apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx` - Invitation acceptance flow
- `apps/web/src/app/login/page.tsx` - Login page that redirects to home after auth