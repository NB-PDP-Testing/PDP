# `/orgs/current/coach` Route Analysis

## Overview

When users log in, they land on `https://www.playerarc.io/orgs/current/coach`. This document analyzes this route, how it works, and where it's used.

## Current State: Missing Route Handler ⚠️

**Problem**: The route `/orgs/current` is referenced in multiple places but **does not exist** as an actual Next.js route handler.

### Where `/orgs/current` is Referenced

1. **Sign-In Form** (`apps/web/src/components/sign-in-form.tsx`):
   - Line 27: `router.push("/orgs/current")` after email/password sign-in
   - Line 54: `callbackURL: "/orgs/current"` for Google OAuth
   - Line 83: `callbackURL: "/orgs/current"` for Microsoft OAuth

2. **Sign-Up Form** (`apps/web/src/components/sign-up-form.tsx`):
   - Line 29: `router.push("/orgs/current")` after email/password sign-up
   - Line 57: `callbackURL: "/orgs/current"` for Google OAuth
   - Line 77: `callbackURL: "/orgs/current"` for Microsoft OAuth

3. **Signup Page** (`apps/web/src/app/signup/page.tsx`):
   - Line 32: `router.push("/orgs/current" as Route)`

## How It Currently Works (Implicit Behavior)

Since `/orgs/current` doesn't exist, Next.js likely:
1. Returns a 404, OR
2. Better Auth redirects to a fallback, OR
3. The browser redirects to a default route

However, based on the codebase, the **intended behavior** is:

### Intended Flow

1. User signs in/signs up
2. Redirects to `/orgs/current`
3. **Should redirect to**: `/orgs/${activeOrganization.id}/coach`
4. If no active organization, redirect to `/orgs` (organizations list)

### Actual Implementation Pattern

Looking at `apps/web/src/app/page.tsx`, there's a similar pattern:

```typescript
function RedirectToOrgs() {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const router = useRouter();

  useEffect(() => {
    if (activeOrganization) {
      router.push(`/orgs/${activeOrganization.id}/coach` as Route);
    } else {
      router.push("/orgs");
    }
  }, [router, activeOrganization]);
}
```

This is what `/orgs/current` **should** do.

## The Actual Route: `/orgs/[orgId]/coach`

### Route Structure

**Path**: `apps/web/src/app/orgs/[orgId]/coach/page.tsx`

**File**: `apps/web/src/app/orgs/[orgId]/coach/page.tsx`

```typescript
import { Suspense } from "react";
import Loader from "@/components/loader";
import { CoachDashboard } from "./coach-dashboard";

export default function CoachPage() {
  return (
    <Suspense fallback={<Loader />}>
      <CoachDashboard />
    </Suspense>
  );
}
```

### Coach Dashboard Component

**File**: `apps/web/src/app/orgs/[orgId]/coach/coach-dashboard.tsx`

**Purpose**: Main coach dashboard showing players assigned to the coach's teams.

**Key Features**:
1. **Coach Assignment Filtering**: Only shows players from teams the coach is assigned to
2. **Player Management**: Search, filter, and view players
3. **Team Filtering**: Filter by team, age group, sport, gender, review status
4. **Smart Coach Dashboard**: AI-powered insights (optional)

**Data Queries**:
- `getCoachAssignments` - Gets teams assigned to the coach
- `getTeamsByOrganization` - Gets all teams in the organization
- `getPlayersByOrganization` - Gets all players in the organization
- `getTeamPlayerLinks` - Maps players to teams

**Filters**:
- Search term (player name)
- Team
- Age group
- Sport
- Gender
- Review status

**Layout**:
- Uses `apps/web/src/app/orgs/[orgId]/coach/layout.tsx` (if exists)
- Falls back to `apps/web/src/app/orgs/layout.tsx` (adds Header)

## Where `/orgs/[orgId]/coach` is Used

### 1. Direct Navigation

**Header Navigation** (`apps/web/src/components/header.tsx`):
```typescript
{hasCoachFull && (
  <Link href={`/orgs/${effectiveOrgId}/coach` as Route}>Coach</Link>
)}
```

Only shows if user has `coach: ["full"]` permission.

### 2. Redirects After Login

**Root Page** (`apps/web/src/app/page.tsx`):
```typescript
if (activeOrganization) {
  router.push(`/orgs/${activeOrganization.id}/coach` as Route);
}
```

**Organization Page** (`apps/web/src/app/orgs/[orgId]/page.tsx`):
```typescript
if (orgId) {
  router.push(`/orgs/${orgId}/coach` as Route);
}
```

### 3. After Accepting Invitation

**Accept Invitation Page** (`apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx`):
```typescript
if (result.data?.invitation?.organizationId) {
  router.push(`/orgs/${result.data.invitation.organizationId}`);
}
// Then /orgs/[orgId]/page.tsx redirects to /orgs/[orgId]/coach
```

## Route Hierarchy

```
/orgs/
├── layout.tsx                    # Adds Header, requires auth
├── page.tsx                       # Organizations list (platform staff only)
├── create/
│   └── page.tsx                   # Create organization (platform staff)
├── join/
│   ├── page.tsx                   # Join organization search
│   └── [orgId]/
│       └── page.tsx               # Join request form
├── accept-invitation/
│   └── [invitationId]/
│       └── page.tsx               # Accept invitation
└── [orgId]/
    ├── page.tsx                   # Redirects to /orgs/[orgId]/coach
    ├── coach/
    │   ├── layout.tsx             # Coach-specific layout (if exists)
    │   ├── page.tsx               # Coach dashboard wrapper
    │   ├── coach-dashboard.tsx    # Main coach dashboard component
    │   └── voice-notes/
    │       ├── page.tsx
    │       └── voice-notes-dashboard.tsx
    ├── admin/
    │   ├── layout.tsx             # Admin layout with sidebar
    │   ├── page.tsx               # Admin dashboard
    │   ├── coaches/
    │   ├── players/
    │   ├── teams/
    │   ├── users/
    │   └── settings/
    └── players/
        └── [playerId]/
            └── page.tsx           # Player passport
```

## Recommended Fix: Create `/orgs/current` Route

### ✅ Implementation: Role-Based Routing

**File**: `apps/web/src/app/orgs/current/page.tsx`

The route handler now intelligently redirects based on user's roles:

**Priority Order**:
1. **Admin** (org role `owner`/`admin` OR functional role `"admin"`) → `/orgs/${orgId}/admin`
2. **Coach** (functional role `"coach"`) → `/orgs/${orgId}/coach`
3. **Parent** (functional role `"parent"`) → `/orgs/${orgId}/parents`
4. **Default** (no specific role) → `/orgs` (organizations list)

**Role Checking**:
- **Better Auth Org Role**: `member.role` (owner/admin/member) - checked via `checkRolePermission`
- **Functional Roles**: `member.functionalRoles` (array of "coach" | "parent" | "admin")

**Scenarios**:
- User is **coach AND admin** → Redirects to `/admin` (admin takes priority)
- User is **only coach** → Redirects to `/coach`
- User is **only admin** → Redirects to `/admin`
- User is **only parent** → Redirects to `/parents`
- User has **no roles** → Redirects to `/orgs`

### Option 2: Create `/orgs/current/coach` Route

**File**: `apps/web/src/app/orgs/current/coach/page.tsx`

Direct coach route that always redirects to `/orgs/${activeOrganization.id}/coach` (bypasses role checking).

## Current User Experience

### What Happens Now

1. User signs in → Redirects to `/orgs/current`
2. **Problem**: Route doesn't exist → 404 or undefined behavior
3. **Expected**: Should redirect to `/orgs/${activeOrgId}/coach`

### What Should Happen

1. User signs in → Redirects to `/orgs/current`
2. Route handler checks for active organization
3. If active org exists → Redirects to `/orgs/${activeOrgId}/coach`
4. If no active org → Redirects to `/orgs` (organizations list)
5. If not authenticated → Redirects to `/login`

## Related Routes

- `/orgs/[orgId]` → Redirects to `/orgs/[orgId]/coach`
- `/orgs/[orgId]/coach` → Coach dashboard (actual destination)
- `/orgs/[orgId]/admin` → Admin dashboard
- `/orgs` → Organizations list (platform staff only)

## Testing Checklist

- [ ] `/orgs/current` route exists and works
- [ ] Redirects to `/orgs/${orgId}/coach` when active org exists
- [ ] Redirects to `/orgs` when no active org
- [ ] Redirects to `/login` when not authenticated
- [ ] Works after email/password sign-in
- [ ] Works after Google OAuth sign-in
- [ ] Works after Microsoft OAuth sign-in
- [ ] Works after sign-up

## Summary

**Current Issue**: `/orgs/current` is referenced but doesn't exist as a route.

**Solution**: Create `apps/web/src/app/orgs/current/page.tsx` that redirects to the active organization's coach dashboard.

**Actual Destination**: `/orgs/[orgId]/coach` - The coach dashboard showing players from assigned teams.

