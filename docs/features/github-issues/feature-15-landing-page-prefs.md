# User Landing Page Preferences & Role-Based Defaults

## Overview
Implement a system that allows users with multiple roles and/or multiple organizations to configure their default landing page. This ensures a consistent, predictable experience when logging in or navigating the platform.

## Current State
- Users with multiple roles may land on different pages inconsistently
- Users with multiple organizations may experience unpredictable landing behavior
- No user preference system for landing page
- Landing logic is likely determined by system defaults, not user choice

## Problem Statement

### Identified Behavior
Users with complex access profiles experience inconsistent landing pages:
- Same user may land on different pages across sessions
- No clear logic for which organization/role is shown by default
- Users must navigate to their preferred context every time
- Frustrating experience for multi-role or multi-org users

### Example Scenarios
1. **Coach + Parent in same org**
   - Sometimes lands on coach dashboard
   - Sometimes lands on parent dashboard
   - User wants to always start at coach dashboard

2. **Member of multiple organizations**
   - Member of Organization A (coach)
   - Member of Organization B (parent)
   - Sometimes lands in Org A, sometimes Org B
   - User wants to always start in Org A

3. **Admin across multiple clubs**
   - Platform staff or multi-club admin
   - Has access to 5+ organizations
   - Wants to default to primary organization

## Proposed Solution

### User Preferences System

**Settings Location**: User Profile → Preferences → Landing Page

**Configurable Options:**
1. **Default Organization**
   - If user is member of multiple orgs, which one to land in by default
   - Dropdown list of all organizations user has access to
   - Can be changed anytime

2. **Default Role** (within organization)
   - If user has multiple roles in default org, which role's dashboard to see
   - Options: Coach, Parent, Player, Admin (based on user's roles)
   - Can be changed anytime

3. **Default Page** (within role)
   - Specific page within role context
   - Examples:
     - Coach: Dashboard, Teams, Players, Action Centre
     - Parent: Dashboard, My Children, Schedule
     - Admin: Dashboard, Teams, Users, Settings
   - Can be changed anytime

### Landing Page Logic

**On Login (New Session):**
```typescript
function determineeLandingPage(user) {
  // 1. Check if user has saved preferences
  const prefs = getUserPreferences(user.id)

  if (prefs?.defaultOrganizationId && prefs?.defaultRole && prefs?.defaultPage) {
    // User has full preferences set
    return `/orgs/${prefs.defaultOrganizationId}${prefs.defaultPage}`
  }

  // 2. Fallback to most recently accessed org
  const recentOrg = getMostRecentlyAccessedOrg(user.id)

  if (recentOrg) {
    return `/orgs/${recentOrg}/dashboard`
  }

  // 3. Fallback to user's first organization
  const firstOrg = user.organizations[0]

  if (firstOrg) {
    return `/orgs/${firstOrg.id}/dashboard`
  }

  // 4. No organizations - send to platform welcome
  return `/welcome`
}
```

**On App Navigation:**
- Within a session, respect user's current context
- Breadcrumbs and navigation preserve current org/role
- Only apply default landing on fresh login or session timeout

## User Workflows

### Scenario 1: User Sets Landing Preferences
1. Sarah is a coach at Club A and parent at Club B
2. Logs in, sometimes lands in Club A, sometimes Club B
3. Navigates to Profile → Settings → Landing Page Preferences
4. Sees:
   ```
   Default Organization: [Dropdown]
   - Club A (Coach)
   - Club B (Parent)
   [Select Club A]

   Default Role: [Dropdown]
   - Coach
   [Already selected]

   Default Page: [Dropdown]
   - Dashboard
   - My Teams
   - Action Centre
   [Select Dashboard]
   ```
5. Saves preferences
6. Next login: Always lands at Club A Coach Dashboard
7. Consistent experience every time

### Scenario 2: User Changes Primary Organization
1. John is active in 3 clubs
2. Previously set default to Club A
3. Becomes more active in Club B (new season)
4. Goes to settings, changes default to Club B
5. Saves
6. Next login: Lands in Club B
7. Can still access Club A and C via org switcher

### Scenario 3: User with No Preferences (First Time)
1. New user logs in for first time
2. No preferences set
3. System shows: "Welcome! Let's set up your preferences"
4. Quick wizard:
   - "Which organization do you spend most time in?"
   - "What's your primary role?"
   - "Where would you like to start each day?"
5. Preferences saved
6. User lands on their chosen page
7. Can change later in settings

### Scenario 4: Platform Staff with Many Orgs
1. Platform staff has access to 50+ organizations
2. Sets default to "Platform Dashboard" (not an org)
3. Saves preferences
4. Logs in → Lands on `/platform/dashboard`
5. Can navigate to any organization as needed
6. Doesn't get randomly dropped into an organization

## Feature Details

### Settings Page UI

**Location**: Profile Dropdown → Settings → Landing Page

```
Landing Page Preferences

Choose where you want to land when you log in.

Default Organization
[Dropdown: Select organization...]
- Organization A (Coach, Parent)
- Organization B (Admin)
- Organization C (Member)
- Platform Dashboard (Platform Staff only)

Default Role (in Organization A)
[Dropdown: Select role...]
- Coach (5 teams)
- Parent (2 children)

Default Page
[Dropdown: Select page...]
- Dashboard
- Teams
- Players
- Schedule
- Action Centre

[Save Preferences] [Reset to System Defaults]
```

**Preview Feature:**
- "Preview landing page" button
- Opens new tab showing where they'll land
- Helps user confirm their choice

### Org Switcher Enhancement

**Current Org Indicator:**
- Show current organization in navbar
- "Organization A ▾"
- Dropdown shows all accessible orgs
- Indicates default org with star icon ★

**Quick Switch:**
- User can switch orgs from dropdown
- Switching orgs should respect role preference
- E.g., Switch to Org B → Land on Org B dashboard as Parent (if that's their role in Org B)

### Role Switcher Enhancement (related to Feature #13)

**Role Indicator:**
- Show current role badge
- "Coach" or "Parent" or "Admin"
- Click to switch roles (if multi-role user)
- Switching role navigates to appropriate dashboard

**Role-Specific Landing:**
- Coach role → Coach dashboard
- Parent role → Parent dashboard
- Admin role → Admin dashboard
- Player role → Player dashboard

## Technical Implementation

### Database Schema

```typescript
userPreferences {
  id: string
  userId: Id<"user">

  // Landing page preferences
  defaultOrganizationId?: string // Organization ID or "platform"
  defaultRole?: string // "coach" | "parent" | "admin" | "player" | "staff"
  defaultPage?: string // "/dashboard" | "/teams" | "/players" | "/action-centre"

  // Recently accessed (for smart defaults)
  recentlyAccessedOrgs: {
    organizationId: string
    lastAccessedAt: number
  }[]

  // Other preferences
  notificationPreferences?: object
  uiPreferences?: object

  createdAt: number
  updatedAt: number
}
```

### Middleware Implementation

```typescript
// apps/web/src/middleware.ts
export async function middleware(request: NextRequest) {
  const user = await getUser(request)

  // If user is navigating to root or after login
  if (request.nextUrl.pathname === "/" || request.nextUrl.searchParams.get("login") === "true") {

    const prefs = await getUserPreferences(user.id)

    if (prefs) {
      // Redirect to user's preferred landing page
      const landingUrl = constructLandingUrl(prefs)
      return NextResponse.redirect(new URL(landingUrl, request.url))
    } else {
      // First-time user, show onboarding
      return NextResponse.redirect(new URL("/onboarding", request.url))
    }
  }

  return NextResponse.next()
}
```

### Smart Defaults

**Track Recent Activity:**
- Log which organizations user accesses
- Track which roles user uses most
- Use this data to suggest good defaults if not set

**Onboarding Wizard:**
- First-time users go through quick preference setup
- "Let's personalize your experience!"
- 3-step wizard:
  1. Choose main organization
  2. Choose primary role
  3. Choose starting page
- Skippable (use smart defaults if skipped)

### URL Structure

**Consistent URL patterns:**
- `/orgs/[orgId]/[role]/[page]`
- Examples:
  - `/orgs/123/coach/dashboard`
  - `/orgs/123/parent/children`
  - `/orgs/123/admin/teams`

**Role-agnostic URLs (current):**
- `/orgs/[orgId]/dashboard` → Adapts to user's current role
- Preferences determine which role to use

## Edge Cases

### User Removed from Default Org
- User sets default to Org A
- Later removed from Org A membership
- Next login: System detects default org is no longer accessible
- Falls back to most recently accessed org
- Shows notification: "Your default organization has changed because..."

### Default Role No Longer Applicable
- User sets default role as "Coach"
- Coach assignment is removed
- Next login: Falls back to next available role
- Shows notification: "Your default role has changed..."

### Platform Staff Mode
- Platform staff can set default to "Platform Dashboard"
- Special case: Not an organization, but platform-level view
- Staff can still set default org if they also work in clubs

### Multi-Browser/Device Sync
- User sets preferences on desktop
- Preferences stored in database (not localStorage)
- User logs in on mobile → Same preferences apply
- Consistent experience across devices

## Success Criteria
- Users with multiple roles land consistently on their chosen page
- Users with multiple orgs land in their default org
- 90%+ of users set landing preferences
- Reduced navigation clicks after login (users land where they want)
- User satisfaction with login experience improves
- Support tickets about "wrong landing page" decrease significantly

## Implementation Phases

### Phase 1: Preferences Infrastructure
- Build userPreferences database table
- Create settings page UI
- Implement basic default org selection
- Test preference saving and loading

### Phase 2: Landing Logic
- Implement middleware for login redirect
- Build landing page determination logic
- Handle fallbacks and edge cases
- Test multi-org and multi-role scenarios

### Phase 3: Onboarding Wizard
- Build first-time user preference wizard
- Implement smart defaults based on activity
- Guide new users through setup
- Make skippable with intelligent fallbacks

### Phase 4: Org & Role Switcher Integration
- Enhance org switcher to show default org
- Integrate with role switcher (Feature #13)
- Add "Make this my default" quick action
- Polish UI and interactions

## References
- Adult Multi-Role Workflows (Feature #13) - Role switching
- Better Auth organization membership
- Current routing structure in `apps/web/src/app/orgs/[orgId]`

## Open Questions
1. Should preferences be per-device or global (database)?
2. How often should users be reminded they can change their landing page?
3. Should there be a "quick switch" shortcut (Cmd+K) to change defaults?
4. Can admins set default landing pages for specific roles org-wide?
5. Should landing preference be part of initial onboarding or separate?
6. What if user's default page doesn't exist in a new organization?
