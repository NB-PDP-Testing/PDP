# Bug Fix Analysis: Issue #234 - Generate Session Plan Popup Behavior Consistency

## Issue Summary
The "Generate Session Plan" feature in Quick Actions behaved inconsistently across different coach pages. On the dashboard, clicking the action would show the modal with caching/blue badge functionality, but on other pages the behavior was different or broken.

## Root Cause Analysis

### The Two-Tier Architecture Problem

The Quick Actions system had a **two-tier architecture** that caused behavioral inconsistency:

#### Tier 1: Layout Defaults (`coach/layout.tsx`)
- Defined default actions for ALL coach pages
- Actions were registered once on mount via `useEffect`
- The "Generate Session Plan" action navigated to a URL or called a context method

#### Tier 2: Page-Specific Overrides (`FABQuickActions` in `smart-coach-dashboard.tsx`)
- Only existed on the **dashboard page**
- Completely **replaced** the layout defaults with its own actions
- Had its own "Generate Session Plan" action with inline callback logic
- Contained the caching logic (blue badge) that checked for recent plans

### Why This Caused Problems

| Page | What Happened |
|------|--------------|
| **Dashboard** | FABQuickActions registered callback handlers → caching/blue badge worked |
| **All Other Pages** | Used layout defaults → different modal, no caching, inconsistent behavior |

The problem was that **two completely separate implementations** of the session plan modal existed:
1. Inline modal in `smart-coach-dashboard.tsx` (used by FABQuickActions on dashboard only)
2. Layout default actions (used on all other pages)

### Additional Issue: "Save to Library" Button State

When a plan was cached (auto-saved for the blue badge), the button incorrectly showed "Saved!" even though the plan wasn't explicitly saved to the library. This was because:
- Plans were auto-saved for caching purposes
- The `planSaved` state was set to `true` when loading any cached plan
- No distinction existed between "cached for quick access" and "saved to library"

## Solution Implemented

### 1. Created Single Source of Truth: `SessionPlanContext`

Created a new context (`apps/web/src/contexts/session-plan-context.tsx`) that:
- Contains all session plan modal logic, state, and UI
- Provides `openSessionPlanModal()` function for all Quick Actions to call
- Handles caching, blue badge display, and plan generation
- Manages share modal functionality
- Lives at the layout level, available to all coach pages

### 2. Updated All Quick Actions Variants

Modified all three Quick Actions variants to use the context:

- **`fab-variant.tsx`**: Removed `onGenerateSessionPlan` prop, now uses `useSessionPlanContext().openSessionPlanModal()`
- **`horizontal-variant.tsx`**: Same change
- **`two-tier-variant.tsx`**: Same change

### 3. Removed Duplicate Code from Dashboard

Removed from `smart-coach-dashboard.tsx`:
- All session plan state variables (`showSessionPlan`, `sessionPlan`, `loadingSessionPlan`, `currentPlanId`, `showCachedBadge`, etc.)
- `handleGenerateSessionPlan` function
- `handleSaveToLibrary` function
- Session Plan Modal JSX
- Share Practice Plan Modal JSX

### 4. Added `savedToLibrary` Field for Library vs Cache Distinction

**Schema change** (`packages/backend/convex/schema.ts`):
```typescript
savedToLibrary: v.optional(v.boolean()),
```

**Backend changes** (`packages/backend/convex/models/sessionPlans.ts`):
- Updated `savePlan` mutation to accept `savedToLibrary` parameter (default `false`)
- Added `markSavedToLibrary` mutation to explicitly save to library
- Updated `listForCoach` to filter by `savedToLibrary === true`
- Updated `getFilteredPlans` to filter by `savedToLibrary === true`
- Updated `getRecentPlanForTeam` to return `savedToLibrary` field

**Frontend changes** (`session-plan-context.tsx`):
- Auto-cache passes `savedToLibrary: false`
- "Save to Library" button calls `markSavedToLibrary` mutation
- Button state correctly shows "Save to Library" vs "Saved!" based on actual `savedToLibrary` value

## Files Changed

### New Files
- `apps/web/src/contexts/session-plan-context.tsx` - Single source of truth for session plan functionality

### Modified Files
- `apps/web/src/app/orgs/[orgId]/coach/layout.tsx` - Added SessionPlanProvider, uses context for actions
- `apps/web/src/app/orgs/[orgId]/coach/session-plans/page.tsx` - Removed `onGenerateSessionPlan` prop
- `apps/web/src/components/quick-actions/fab-variant.tsx` - Uses context instead of prop
- `apps/web/src/components/quick-actions/horizontal-variant.tsx` - Uses context instead of prop
- `apps/web/src/components/quick-actions/two-tier-variant.tsx` - Uses context instead of prop
- `apps/web/src/components/smart-coach-dashboard.tsx` - Removed all duplicate session plan logic
- `packages/backend/convex/schema.ts` - Added `savedToLibrary` field
- `packages/backend/convex/models/sessionPlans.ts` - Added mutations and updated queries

## Testing Checklist

- [x] Open Quick Actions from coach dashboard → Generate Session Plan works
- [x] Open Quick Actions from any other coach page → Generate Session Plan works
- [x] Generate a plan → Close modal → Reopen → Blue badge appears showing "You generated this X minutes ago"
- [x] Generate a plan → Button shows "Save to Library" (not "Saved!")
- [x] Click "Save to Library" → Button changes to "Saved!"
- [x] Check Session Plans library → Only plans with "Save to Library" clicked appear

## PR Information

**PR:** https://github.com/NB-PDP-Testing/PDP/pull/320
**Branch:** `fix/issue-234-quick-actions-session-plan-consistency`
**Closes:** #234
