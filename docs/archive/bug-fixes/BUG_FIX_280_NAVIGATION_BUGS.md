# Bug Fix Report: Issue #280 - Navigation and Dashboard Bugs

**Issue**: #280
**Date Fixed**: January 18, 2026
**Status**: Resolved

---

## Summary

Comprehensive fix for multiple navigation bugs affecting bottom nav, sidebar, role switching, and dashboard functionality across Parent, Coach, and Admin roles.

---

## Bugs Fixed

### 1. SmartCoachDashboard Infinite Loop

**File**: `apps/web/src/components/smart-coach-dashboard.tsx` (~line 200)

**Symptoms**:
- Console error: "Maximum update depth exceeded"
- Browser freeze/crash when loading coach dashboard
- Continuous re-renders

**Root Cause**:
The `useEffect` hook depended on callback functions (`calculateTeamAnalytics`, `generateCorrelationInsights`) that were recreated on every render, causing an infinite loop.

**Fix**:
Changed useEffect dependencies from callbacks to actual data values:

```typescript
// BEFORE (broken):
useEffect(() => {
  calculateTeamAnalytics();
  generateCorrelationInsights();
}, [calculateTeamAnalytics, generateCorrelationInsights]);

// AFTER (fixed):
useEffect(() => {
  calculateTeamAnalytics();
  generateCorrelationInsights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [players, coachTeams, isClubView]);
```

---

### 2. Parent Progress Button Not Navigating

**File**: `apps/web/src/app/orgs/[orgId]/parents/layout.tsx` (~line 45)

**Symptoms**:
- Clicking "Progress" in parent bottom nav did nothing
- No navigation occurred

**Root Cause**:
The Progress nav item had `isAction: true` which rendered it as a button without an onClick handler instead of a navigation link.

**Fix**:
Removed `isAction: true` from the Progress nav item:

```typescript
// BEFORE (broken):
{
  id: "progress",
  icon: TrendingUp,
  label: "Progress",
  href: `/orgs/${orgId}/parents/progress`,
  isAction: true,  // This made it a button, not a link
},

// AFTER (fixed):
{
  id: "progress",
  icon: TrendingUp,
  label: "Progress",
  href: `/orgs/${orgId}/parents/progress`,
},
```

---

### 3. Backend Validation Errors (orgPlayerEnrollments)

**File**: `packages/backend/convex/models/orgPlayerEnrollments.ts`

**Symptoms**:
- Console error: "ReturnsValidationError: Object contains extra field"
- Backend queries failing validation

**Root Cause**:
The `sport` field was being returned from the database but wasn't included in the returns validator.

**Fix**:
Added missing `sport` field to the validator:

```typescript
ageGroup: v.string(),
season: v.string(),
sport: v.optional(v.string()), // ADDED: kept for backwards compatibility
status: enrollmentStatusValidator,
```

---

### 4. Backend Validation Errors (passportGoals)

**File**: `packages/backend/convex/models/passportGoals.ts`

**Symptoms**:
- Console error: "ReturnsValidationError: Object contains extra field"
- Passport goals queries failing

**Root Cause**:
Missing sharing-related fields (`isShareable`, `markedShareableAt`, `markedShareableBy`) in the returns validator.

**Fix**:
Added missing fields to the validator:

```typescript
parentActions: v.optional(v.array(v.string())),
parentCanView: v.boolean(),
// ADDED: Cross-org sharing control (Passport Sharing Feature)
isShareable: v.optional(v.boolean()),
markedShareableAt: v.optional(v.number()),
markedShareableBy: v.optional(v.string()),
coachNotes: v.optional(v.string()),
```

---

### 5. Invalid teamId Crash in Sport Passports

**File**: `packages/backend/convex/models/sportPassports.ts` (~line 180)

**Symptoms**:
- Error: "Invalid argument 'id' for db.get"
- Sport passport page crashing for some players

**Root Cause**:
Better Auth adapter threw an error when `teamId` was invalid, corrupted, or malformed. No error handling existed.

**Fix**:
Added validation and try-catch with fallback handling:

```typescript
const teamAssignmentsRaw = await Promise.all(
  activeTeamMemberships.map(async (m) => {
    // Skip if teamId is missing or invalid
    if (!m.teamId || typeof m.teamId !== "string" || m.teamId.length < 10) {
      console.warn(
        `[sportPassports] Skipping invalid teamId: ${m.teamId} for player ${args.playerIdentityId}`
      );
      return null;
    }

    try {
      const teamResult = await ctx.runQuery(/*...*/);
      // ... return team data
    } catch (error) {
      console.warn(`[sportPassports] Error fetching team ${m.teamId}:`, error);
      return { teamId: m.teamId, name: "Unknown Team", /*...*/ };
    }
  })
);
// Filter out null entries
const teamAssignments = teamAssignmentsRaw.filter(
  (t): t is NonNullable<typeof t> => t !== null
);
```

---

### 6. Hooks Error in Parents/Sharing Page

**File**: `apps/web/src/app/orgs/[orgId]/parents/sharing/components/parent-sharing-dashboard.tsx`

**Symptoms**:
- Error: "Rendered fewer hooks than expected. This may be caused by an accidental early return statement."
- Parents sharing page crashing

**Root Cause**:
`useQuery` hooks were being called inside a `.map()` function, which violates React's rules of hooks (hooks must be called at the top level, not conditionally or in loops).

**Fix**:
Restructured to call hooks at component top level with conditional `"skip"`:

```typescript
// BEFORE (broken - hooks inside map):
const consentsData = identityChildren.map((child) => ({
  playerIdentityId: child.player._id,
  consents: useQuery(api.lib.consentGateway.getConsentsForPlayer, {...}),
  requests: useQuery(api.models.passportSharing.getPendingRequestsForPlayer, {...}),
}));

// AFTER (fixed - hooks at top level):
const playerIdentityIds = useMemo(
  () => identityChildren.map((child) => child.player._id),
  [identityChildren]
);
const allConsentsQuery = useQuery(
  api.lib.consentGateway.getConsentsForPlayer,
  playerIdentityIds.length > 0
    ? { playerIdentityId: playerIdentityIds[0] }
    : "skip"
);
```

---

### 7. DialogTitle Accessibility Warning

**File**: `apps/web/src/app/orgs/[orgId]/parents/sharing/components/enable-sharing-wizard.tsx`

**Symptoms**:
- Console warning: "DialogContent requires a DialogTitle for the component to be accessible for screen reader users"

**Root Cause**:
The `ResponsiveDialog` component wasn't being passed a `title` prop, so no `DialogTitle` was rendered for accessibility.

**Fix**:
Added `title` and `description` props to ResponsiveDialog:

```typescript
// BEFORE:
<ResponsiveDialog
  contentClassName="sm:max-w-lg"
  onOpenChange={handleOpenChange}
  open={open}
>

// AFTER:
<ResponsiveDialog
  contentClassName="sm:max-w-lg"
  description={`Step ${currentStepNumber} of ${totalSteps}`}
  onOpenChange={handleOpenChange}
  open={open}
  title={getStepTitle(currentStep)}
>
```

---

## Known Non-Issues

### React DevTools Suspense Error

**Error**: "We are cleaning up async info that was not on the parent Suspense boundary. This is a bug in React."

**Status**: NOT an application bug

**Explanation**: This error originates from the React DevTools Chrome extension (`chrome-extension://...`), not from the application code. It's a known incompatibility between React DevTools and React 19's async rendering/Suspense features.

**Workaround**:
- Disable React DevTools extension temporarily
- Use incognito mode (extensions disabled)
- This error does not affect application functionality

---

## Testing Performed

### Test Accounts Used:
1. `neil.b@blablablak.com` (coach & parent)
2. `neiltest2@skfjkadsfdgsjdgsj.com` (admin & coach)
3. `neiltest3@skfjkadsfdgsjdgsj.com` (parent only)
4. `neiltesting@example.com` (admin, coach & parent)

### Test Cases Verified:
- [x] Bottom nav buttons work for Parent role (Home, Sharing, Progress)
- [x] Bottom nav buttons work for Coach role (Home, Teams, Notes, Analytics)
- [x] Bottom nav buttons work for Admin role (Home, Teams, Members, Settings)
- [x] Sidebar navigation works on desktop for all roles
- [x] Role switching works correctly (Admin ↔ Coach ↔ Parent)
- [x] Coach dashboard loads without infinite loop
- [x] Parent sharing page loads without hooks error
- [x] Sport passport page handles invalid teamIds gracefully
- [x] Backend validation errors resolved

---

## Files Modified

1. `apps/web/src/components/smart-coach-dashboard.tsx`
2. `apps/web/src/app/orgs/[orgId]/parents/layout.tsx`
3. `packages/backend/convex/models/orgPlayerEnrollments.ts`
4. `packages/backend/convex/models/passportGoals.ts`
5. `packages/backend/convex/models/sportPassports.ts`
6. `apps/web/src/app/orgs/[orgId]/parents/sharing/components/parent-sharing-dashboard.tsx`
7. `apps/web/src/app/orgs/[orgId]/parents/sharing/components/enable-sharing-wizard.tsx`
