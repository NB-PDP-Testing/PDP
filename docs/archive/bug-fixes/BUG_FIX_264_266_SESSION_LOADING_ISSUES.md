# Bug Fixes: Session Loading Issues (#264, #266, and #270)

**Date:** 2026-01-15
**Branch:** `jkobrien/session-loading-bug-for-coach`
**Issues:**
- [#264 - UAT - Session loading bug for coach](https://github.com/NB-PDP-Testing/PDP/issues/264)
- [#266 - UAT - Session view bug for admin](https://github.com/NB-PDP-Testing/PDP/issues/266)
- [#270 - UAT - Session loading bug for coach (Use button)](https://github.com/NB-PDP-Testing/PDP/issues/270)

---

## Issue #264: Maximum Update Depth Exceeded Error

### Problem Description
When coaches loaded the coach dashboard and selected sessions, the application would crash with a "Maximum update depth exceeded" error. This error occurred in the `SmartCoachDashboard` component and was causing infinite re-renders.

### Error Details
```
Error: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.

at SmartCoachDashboard.useCallback[calculateTeamAnalytics] (src/components/smart-coach-dashboard.tsx:360:5)
at SmartCoachDashboard.useEffect (src/components/smart-coach-dashboard.tsx:498:5)
```

### Root Cause Analysis

The infinite loop was caused by a dependency chain issue in React hooks:

1. **Helper Functions Not Memoized**: Four helper functions were defined as regular functions without `useCallback`:
   - `getPlayerTeams`
   - `calculateSkillAverages`
   - `calculatePlayerAvgSkill`
   - `formatSkillName`

2. **Functions Recreated on Every Render**: Because these functions weren't wrapped in `useCallback`, they were recreated with new references on every component render.

3. **useCallback Dependencies Changed**: The `calculateTeamAnalytics` and `generateCorrelationInsights` callbacks included these helper functions as dependencies, so they also got new references on every render.

4. **useEffect Triggered Infinitely**: The useEffect at line 497-503 depended on `calculateTeamAnalytics` and `generateCorrelationInsights`, so it ran on every render.

5. **State Updates Caused Re-renders**: The useEffect called these functions which updated state via `setTeamAnalytics()` and `setInsights()`, causing another render and restarting the cycle.

### Solution

Wrapped all helper functions in `useCallback` with empty dependency arrays (since they're pure functions that don't depend on props/state):

**File:** `apps/web/src/components/smart-coach-dashboard.tsx`

#### Before:
```typescript
const getPlayerTeams = (player: any): string[] => {
  // ... implementation
};

const calculateSkillAverages = (teamPlayers: any[]) => {
  // ... implementation
};

const calculatePlayerAvgSkill = (player: any): number => {
  // ... implementation
};

const formatSkillName = (key: string): string =>
  // ... implementation
;
```

#### After:
```typescript
const getPlayerTeams = useCallback((player: any): string[] => {
  // ... implementation
}, []);

const calculateSkillAverages = useCallback((teamPlayers: any[]) => {
  // ... implementation
}, []);

const calculatePlayerAvgSkill = useCallback((player: any): number => {
  // ... implementation
}, []);

const formatSkillName = useCallback(
  (key: string): string =>
    // ... implementation
  ,
  []
);
```

This ensures the helper functions maintain stable references across renders, preventing the infinite loop while still allowing the analytics to recalculate when actual data (`players`, `coachTeams`, `isClubView`) changes.

---

## Issue #266: Missing Admin Session Plan View Page

### Problem Description
When admins clicked "View session" from the session plans moderation page (`/orgs/[orgId]/admin/session-plans`), they received a 404 error. The application tried to navigate to `/orgs/[orgId]/admin/session-plans/[planId]`, but this route didn't exist.

### Root Cause Analysis

The admin session plans list page had a `handleViewPlan` function that routed to a detail page:

```typescript
const handleViewPlan = (planId: Id<"sessionPlans">) => {
  router.push(`/orgs/${orgId}/admin/session-plans/${planId}` as any);
};
```

However, the route file didn't exist:
- ✅ Existed: `/orgs/[orgId]/admin/session-plans/page.tsx` (list view)
- ❌ Missing: `/orgs/[orgId]/admin/session-plans/[planId]/page.tsx` (detail view)

### Solution

Created the missing admin session plan detail view page based on the existing coach version but adapted for admin use.

**File Created:** `apps/web/src/app/orgs/[orgId]/admin/session-plans/[planId]/page.tsx`

#### Key Features:

1. **Admin-Specific View**: Shows session plan details with admin moderation controls
2. **Pin/Unpin Functionality**: Admins can feature high-quality plans
3. **Reject from Library**: Admins can remove inappropriate plans with rejection reasons
4. **Status Badges**: Visual indicators for SHARED, FEATURED, and REJECTED status
5. **Rejection Notice Display**: Shows rejection information for previously rejected plans
6. **Session Metadata**: Displays coach, team, players, usage statistics
7. **Full Plan Content**: Shows AI-generated session plan and structured sections

#### Component Structure:
- Breadcrumb navigation back to session plans list
- Admin action buttons (Pin/Unpin, Reject)
- Status badges for visibility and moderation state
- Rejection notice card (if applicable)
- Session information card with metadata
- Full session plan content with prose styling
- Structured session sections with activities
- Rejection dialog with reason input

The page integrates with existing Convex mutations:
- `api.models.sessionPlans.getPlanById` - Fetch plan details
- `api.models.sessionPlans.pinPlan` - Pin as featured
- `api.models.sessionPlans.unpinPlan` - Remove from featured
- `api.models.sessionPlans.removeFromClubLibrary` - Reject plan

---

## Issue #270: Document ID Mismatch When Using Session Plan Template

### Problem Description
When coaches clicked the "Use" button on a session plan template (from the session plans library), the application crashed with a Convex server error about mismatched document IDs.

### Error Details
```
[CONVEX M(models/sessionPlans:duplicatePlan)] [Request ID: 13fdba82cd7c4b19] Server Error
Uncaught Error: Provided document ID "qx7ff84tb1z4xs5y43xj9es9qn7z89zh" doesn't match '_id' field "qx7cyqvx2e84hcf4f2g3r13p2s7z6qqq"
    at async handler (../../convex/models/sessionPlans.ts:342:9)
```

### Root Cause Analysis

The error occurred in the `duplicatePlan` mutation when coaches clicked "Use" on a session plan template:

1. **User Flow**: When clicking "Use" on a template, the code calls:
   - `incrementTimesUsed({ planId })` - Tracks usage statistics
   - `duplicatePlan({ planId })` - Creates a personal copy for the coach

2. **The Problem**: In the `duplicatePlan` mutation at line 342, the code was spreading all fields from the original plan:
   ```typescript
   const newPlanId = await ctx.db.insert("sessionPlans", {
     ...originalPlan,  // ❌ This includes _id and _creationTime
     // ... override fields
   });
   ```

3. **Convex System Fields**: Convex automatically manages two special fields:
   - `_id` - Unique document identifier
   - `_creationTime` - Timestamp when document was created

4. **The Conflict**: When spreading `...originalPlan`, these system-managed fields were included. Convex tried to create a new document with a new `_id`, but found an existing `_id` in the data, causing the mismatch error.

### Solution

Destructured the original plan to exclude Convex system-managed fields before spreading:

**File:** `packages/backend/convex/models/sessionPlans.ts`

#### Before:
```typescript
const now = Date.now();

// Create duplicate
const newPlanId = await ctx.db.insert("sessionPlans", {
  ...originalPlan,
  coachId: identity.subject,
  // ... other fields
});
```

#### After:
```typescript
const now = Date.now();

// Create duplicate - exclude _id and _creationTime as they are managed by Convex
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { _id, _creationTime, ...planData } = originalPlan;
const newPlanId = await ctx.db.insert("sessionPlans", {
  ...planData,
  coachId: identity.subject,
  // ... other fields
});
```

**Key Changes:**
- Destructured `_id` and `_creationTime` from `originalPlan`
- Spread only `planData` (which excludes system fields)
- Added comment explaining why these fields must be excluded
- Added eslint-disable for unused variables (we destructure but don't use them)

This ensures Convex can properly generate new system fields for the duplicate document while preserving all user data from the original plan.

---

## Testing

### Type Checking
```bash
npm run check-types
```
✅ **Result:** All types pass successfully

### Build
```bash
npm run build
```
✅ **Result:** Build successful, new route included in output:
```
├ ƒ /orgs/[orgId]/admin/session-plans/[planId]
```

### Manual Testing Recommended

#### Issue #264 - Coach Dashboard:
1. Log in as a coach
2. Navigate to coach dashboard
3. Click on "Session Plans" or similar navigation
4. Verify no "Maximum update depth exceeded" error appears
5. Verify team analytics load correctly
6. Check browser console for any errors

#### Issue #266 - Admin Session View:
1. Log in as an admin
2. Navigate to `/orgs/[orgId]/admin/session-plans`
3. Click "View" on any shared session plan
4. Verify the session plan detail page loads correctly
5. Test Pin/Unpin functionality
6. Test Reject functionality with rejection reason

#### Issue #270 - Use Session Plan Template:
1. Log in as a coach
2. Navigate to `/orgs/[orgId]/coach/session-plans`
3. Browse session plans in "Club Library" or "My Plans" tabs
4. Click "Use" button on any session plan template
5. Verify no Convex error appears
6. Verify a duplicate plan is created successfully
7. Verify navigation to the new duplicated plan
8. Confirm the duplicate has "(Copy)" appended to the title
9. Check browser console for any errors

---

## Files Modified

1. **apps/web/src/components/smart-coach-dashboard.tsx**
   - Wrapped `getPlayerTeams` in `useCallback` (lines 199-215)
   - Wrapped `calculateSkillAverages` in `useCallback` (lines 217-235)
   - Wrapped `calculatePlayerAvgSkill` in `useCallback` (lines 237-246)
   - Wrapped `formatSkillName` in `useCallback` (lines 248-255)
   - Updated `calculateTeamAnalytics` dependencies (lines 364-372)
   - Updated `generateCorrelationInsights` dependencies (lines 491-497)

2. **apps/web/src/app/orgs/[orgId]/admin/session-plans/[planId]/page.tsx** *(new file)*
   - Created complete admin session plan detail view
   - 415 lines of TypeScript/React code
   - Implements pin/unpin and rejection functionality

3. **packages/backend/convex/models/sessionPlans.ts**
   - Modified `duplicatePlan` mutation (lines 341-343)
   - Added destructuring to exclude `_id` and `_creationTime` fields
   - Prevents Convex document ID mismatch errors

---

## Impact Assessment

### Performance Impact
- ✅ **Positive:** Fixes infinite render loop, significantly improving performance
- ✅ **Positive:** Helper functions now have stable references, reducing unnecessary re-renders
- ✅ **Neutral:** `useCallback` overhead is minimal for these pure functions
- ✅ **Neutral:** Destructuring operation in duplicatePlan has negligible performance impact

### User Experience Impact
- ✅ **Fixed:** Coaches can now use the dashboard without crashes
- ✅ **Fixed:** Admins can now view and moderate session plans
- ✅ **Fixed:** Coaches can successfully use session plan templates
- ✅ **Improved:** Admin workflow is now complete for session plan moderation
- ✅ **Improved:** Template duplication workflow now works reliably

### Code Quality Impact
- ✅ **Improved:** Proper React hooks patterns now followed
- ✅ **Improved:** Dependencies correctly specified
- ✅ **Improved:** Proper handling of Convex system-managed fields
- ✅ **Consistent:** Admin view matches coach view architecture
- ✅ **Better Documentation:** Added comments explaining system field exclusion

---

## Related Documentation

- **Component:** SmartCoachDashboard component documentation
- **Feature:** Session Plans feature (docs/features/github-issues/feature-21-session-plans.md)
- **Architecture:** Multi-tenancy patterns in organization-scoped routes

---

## Notes

- The helper functions use empty dependency arrays because they are pure utility functions that don't depend on any props or state
- The useEffect for analytics now correctly only runs when actual data changes (`players`, `coachTeams`, `isClubView`), not when the component re-renders
- The admin session plan view maintains consistency with the coach version while adding admin-specific functionality
- **Convex Best Practice**: When duplicating documents, always exclude system-managed fields (`_id`, `_creationTime`) to prevent ID mismatch errors
- This pattern should be applied to any other duplicate/copy operations in the codebase
- Future consideration: Type safety could be improved by creating proper TypeScript interfaces for the player and plan data structures
- Future consideration: Create a utility function for safe document duplication that automatically excludes system fields
