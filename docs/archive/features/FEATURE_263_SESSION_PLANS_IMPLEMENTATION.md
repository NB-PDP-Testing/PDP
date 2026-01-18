# Feature #263: Session Plans Feature - Complete Implementation

## Overview
This document tracks the complete implementation of the F21 Session Plans feature, including bug fixes, UI/UX improvements, and filtering functionality.

## Related Issues

### Bugs Fixed
- **Issue #264**: Maximum update depth exceeded error in SmartCoachDashboard
- **Issue #266**: Missing admin session plan view page (404 error)
- **Issue #270**: Document ID mismatch when using "Use" button on session plans

### Feature Improvements
- UI/UX improvements for session plan interactions
- Featured filter implementation
- Admin filtering sidebar implementation

---

## Bug Fixes

### Issue #264: Infinite Render Loop in SmartCoachDashboard

**Problem**:
- Error: "Maximum update depth exceeded"
- Component was entering infinite render loop

**Root Cause**:
Helper functions (`getPlayerTeams`, `calculateSkillAverages`, `calculatePlayerAvgSkill`, `formatSkillName`) were being recreated on every render, causing `useEffect` dependencies to constantly change.

**Solution** (`apps/web/src/components/smart-coach-dashboard.tsx`):
```typescript
// Wrapped all helper functions in useCallback with stable dependencies
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
    key.replace(/([A-Z])/g, " $1")
       .replace(FIRST_CHAR_REGEX, (str) => str.toUpperCase())
       .trim(),
  []
);

// Updated useEffect to only depend on data, not callbacks
useEffect(() => {
  calculateTeamAnalytics();
  generateCorrelationInsights();
}, [players, coachTeams, isClubView]);
```

**Status**: ✅ Fixed

---

### Issue #266: Missing Admin Session Plan Detail Page

**Problem**:
- 404 error when admin tried to view session plan details
- Route `/orgs/[orgId]/admin/session-plans/[planId]` did not exist

**Solution**:
Created new file `apps/web/src/app/orgs/[orgId]/admin/session-plans/[planId]/page.tsx` (415 lines)

**Features Implemented**:
- Full session plan detail view for admins
- Pin/Unpin functionality (featured status)
- Reject plan with moderation reason
- Status badges (SHARED, FEATURED, REMOVED)
- Display of moderation history
- Full plan content display (objectives, activities, equipment)

**Key Mutations Used**:
```typescript
const removeFromClubLibrary = useMutation(api.models.sessionPlans.removeFromClubLibrary);
const pinPlan = useMutation(api.models.sessionPlans.pinPlan);
const unpinPlan = useMutation(api.models.sessionPlans.unpinPlan);
```

**Status**: ✅ Fixed

---

### Issue #270: Document ID Mismatch in Duplicate Plan

**Problem**:
- Error: `Provided document ID doesn't match '_id' field`
- Occurred when using "Use" button to duplicate a session plan

**Root Cause**:
The `duplicatePlan` mutation was spreading `...originalPlan` which included Convex system-managed fields (`_id`, `_creationTime`). These fields cannot be provided when inserting new documents.

**Solution** (`packages/backend/convex/models/sessionPlans.ts`):
```typescript
// Before:
const newPlanId = await ctx.db.insert("sessionPlans", {
  ...originalPlan,
  // ... other fields
});

// After:
const { _id, _creationTime, ...planData } = originalPlan;
const newPlanId = await ctx.db.insert("sessionPlans", {
  ...planData,
  // ... other fields
});
```

**Status**: ✅ Fixed

---

## UI/UX Improvements

### 1. Simplified Action Buttons

**Change**: Replaced two buttons ("Preview" and "Use") with single "View" button

**File**: `apps/web/src/app/orgs/[orgId]/coach/session-plans/template-card.tsx`

**Before**:
```typescript
<Button onClick={onPreview}>
  <Play />
  Preview
</Button>
<Button onClick={onUseTemplate}>
  Use Template
</Button>
```

**After**:
```typescript
<Button className="w-full" onClick={(e) => { onView(plan._id); }} size="sm">
  <Eye className="mr-1.5 h-4 w-4" />
  View
</Button>
```

**Status**: ✅ Complete

---

### 2. Changed Favorite Icon from Heart to Star

**Rationale**: Star icon is more appropriate for sporting context ("star player", "star performance")

**File**: `apps/web/src/app/orgs/[orgId]/coach/session-plans/template-card.tsx`

**Change**:
```typescript
// Changed from Heart to Star icon
<Star className={`h-5 w-5 ${
  plan.favorited
    ? "fill-yellow-500 text-yellow-500"
    : "text-muted-foreground"
}`} />
```

**Status**: ✅ Complete

---

### 3. Added Featured Filter for Coaches

**Feature**: Added "Featured" filter option in coach session plans sidebar

**Files Modified**:
1. `apps/web/src/app/orgs/[orgId]/coach/session-plans/filter-sidebar.tsx`
   - Added `featuredOnly` to `FilterState` type
   - Added Featured checkbox with TrendingUp icon

2. `apps/web/src/app/orgs/[orgId]/coach/session-plans/page.tsx`
   - Added `featuredOnly` to filter state initialization
   - Passed `featuredOnly` to backend queries

3. `packages/backend/convex/models/sessionPlans.ts`
   - Added `featuredOnly: v.optional(v.boolean())` parameter to `getFilteredPlans` query (line 839)
   - Added `featuredOnly` parameter to `getClubLibrary` query (line 963)
   - Added filtering logic:
   ```typescript
   if (args.featuredOnly && !plan.pinnedByAdmin) {
     return false;
   }
   ```

**Status**: ✅ Complete

---

### 4. Added Metadata Display on Admin Cards

**Feature**: Display intensity badges and skills on admin session plan cards (matching coach view)

**File**: `apps/web/src/app/orgs/[orgId]/admin/session-plans/page.tsx`

**Added**:
- `extractedTags` field to `SessionPlan` type
- `getIntensityColor()` helper function
- Intensity badge display with color coding:
  - Low: green
  - Medium: yellow
  - High: red
- Skills display (showing first 3 skills with "+N more" badge)

**Status**: ✅ Complete

---

## Admin Filtering Implementation

### Feature: Complete Filtering Sidebar for Admin Moderation Page

**Requirement**: Admin session plans moderation page needed filtering sidebar matching coach functionality

### Frontend Changes

**File**: `apps/web/src/app/orgs/[orgId]/admin/session-plans/page.tsx`

**Changes Made**:
1. **Imports**:
   ```typescript
   import { FilterSidebar } from "../../coach/session-plans/filter-sidebar";
   import type {
     AvailableFilters,
     FilterState,
   } from "../../coach/session-plans/filter-sidebar";
   ```

2. **Filter State Management**:
   ```typescript
   const [filters, setFilters] = useState<FilterState>({
     search: "",
     ageGroups: [],
     sports: [],
     intensities: [],
     skills: [],
     categories: [],
     favoriteOnly: false,
     featuredOnly: false,
     templateOnly: false,
   });
   ```

3. **Backend Query Integration**:
   ```typescript
   const plans = useQuery(
     api.models.sessionPlans.listForAdmin,
     userId ? {
       organizationId: orgId,
       search: filters.search || undefined,
       ageGroups: filters.ageGroups.length > 0 ? filters.ageGroups : undefined,
       sports: filters.sports.length > 0 ? filters.sports : undefined,
       intensities: filters.intensities.length > 0 ? filters.intensities : undefined,
       categories: filters.categories.length > 0 ? filters.categories : undefined,
       skills: filters.skills.length > 0 ? filters.skills : undefined,
       featuredOnly: filters.featuredOnly || undefined,
     } : "skip"
   );
   ```

4. **Filter Aggregation**:
   - Added separate `allPlans` query for unfiltered data
   - Built `availableFilters` object with counts for:
     - Age groups
     - Sports
     - Categories
     - Skills

5. **Layout Update**:
   ```typescript
   <div className="flex h-screen">
     <FilterSidebar
       availableFilters={availableFilters}
       filters={filters}
       onFilterChange={setFilters}
     />
     <div className="flex-1 overflow-y-auto">
       {/* Main content */}
     </div>
   </div>
   ```

### Backend Changes

**File**: `packages/backend/convex/models/sessionPlans.ts`

**Updated Query**: `listForAdmin` (lines 1145-1263)

**Added Parameters**:
```typescript
args: {
  organizationId: v.string(),
  search: v.optional(v.string()),
  ageGroups: v.optional(v.array(v.string())),
  sports: v.optional(v.array(v.string())),
  intensities: v.optional(
    v.array(v.union(v.literal("low"), v.literal("medium"), v.literal("high")))
  ),
  categories: v.optional(v.array(v.string())),
  skills: v.optional(v.array(v.string())),
  featuredOnly: v.optional(v.boolean()),
}
```

**Filtering Logic** (lines 1188-1258):

1. **Search Filter**:
   ```typescript
   if (args.search) {
     const searchLower = args.search.toLowerCase();
     const matchesSearch =
       plan.title?.toLowerCase().includes(searchLower) ||
       plan.coachName?.toLowerCase().includes(searchLower) ||
       plan.teamName?.toLowerCase().includes(searchLower);
     if (!matchesSearch) return false;
   }
   ```

2. **Exact Match Filters** (ageGroups, sports, intensities):
   - Plan must match at least one selected value
   - Uses `includes()` check

3. **"Any Match" Filters** (categories, skills):
   - Plan matches if it has ANY of the selected values
   - Uses `some()` to check for intersection

4. **Featured Filter**:
   ```typescript
   if (args.featuredOnly && !plan.pinnedByAdmin) {
     return false;
   }
   ```

**Status**: ✅ Complete

---

## Technical Details

### Files Modified

**Frontend**:
- `apps/web/src/components/smart-coach-dashboard.tsx` - Fixed infinite loop
- `apps/web/src/app/orgs/[orgId]/admin/session-plans/[planId]/page.tsx` - Created detail page
- `apps/web/src/app/orgs/[orgId]/admin/session-plans/page.tsx` - Added filtering
- `apps/web/src/app/orgs/[orgId]/coach/session-plans/template-card.tsx` - UI improvements
- `apps/web/src/app/orgs/[orgId]/coach/session-plans/filter-sidebar.tsx` - Added Featured filter
- `apps/web/src/app/orgs/[orgId]/coach/session-plans/page.tsx` - Connected Featured filter

**Backend**:
- `packages/backend/convex/models/sessionPlans.ts` - Fixed duplicatePlan, added filter parameters

### Verification

✅ TypeScript compilation passes
✅ Convex codegen completed successfully
✅ All filters working correctly
✅ HMR cache issue resolved (requires dev server restart)

---

## Testing Checklist

### Bug Fixes
- [x] SmartCoachDashboard renders without infinite loop
- [x] Admin can view session plan detail page
- [x] Duplicate plan works without ID mismatch error

### UI/UX
- [x] Single "View" button displays with Eye icon
- [x] Star icon used for favorites
- [x] Featured filter appears in coach sidebar
- [x] Featured filter correctly shows only pinned plans

### Admin Filtering
- [x] FilterSidebar renders on admin page
- [x] Search filter works (searches title, coach, team)
- [x] Age group filter works
- [x] Sports filter works
- [x] Intensity filter works (low/medium/high)
- [x] Categories filter works
- [x] Skills filter works
- [x] Featured filter works on admin page
- [x] Filter counts display correctly
- [x] Clear All button works
- [x] Multiple filters can be combined

---

## Known Issues

### HMR Cache Issue
When changing imports (like removing the `Play` icon), Turbopack's HMR cache may cause errors:
```
Module was instantiated because it was required from module, but the module factory is not available
```

**Solution**: Restart the dev server to clear HMR cache

---

## Summary

All features and bug fixes for issue #263 have been completed:

✅ **3 bugs fixed** (#264, #266, #270)
✅ **4 UI/UX improvements** implemented
✅ **Complete admin filtering** functionality added
✅ **All TypeScript checks** passing

The session plans feature is now fully functional for both coaches and admins with comprehensive filtering, proper error handling, and improved user experience.
