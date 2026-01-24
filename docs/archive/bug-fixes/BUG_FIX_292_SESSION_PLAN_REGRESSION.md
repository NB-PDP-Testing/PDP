# Bug Fix Analysis: Issue #292 - Session Plan Regression

## Issue Summary
**GitHub Issue:** [#292 - Regression of regen alerts within the generate session pop-up](https://github.com/NB-PDP-Testing/PDP/issues/292)

**Related Issue:** [#234 - Generate Session Plan Popup Window Behaviour Consistency](https://github.com/NB-PDP-Testing/PDP/issues/234)

**Priority:** High

**Type:** Regression Bug

---

## Problem Description

Two features in the "Generate Session Plan" quick action modal have regressed:

### 1. Blue Alert Box for Regeneration (Missing)
When a coach generates a session plan and later returns (within 1 hour), the modal should:
- Display the cached plan
- Show a blue alert: "You generated this X ago"
- Allow dismissal of the alert
- Track events in PostHog for analytics

**Current State:** No caching, no blue alert, no PostHog tracking. Every click generates a new plan.

### 2. Save to Library Button (Missing)
The modal should have a "Save to Library" button that allows coaches to:
- Review the generated plan
- Regenerate if not satisfied
- Save only when they're happy with the result

**Current State:** Modal only has Share, Regenerate, and Close buttons. No save functionality.

---

## Root Cause Analysis

### Timeline of Events

| Date | Commit | Description |
|------|--------|-------------|
| Jan 13, 2026 | `ddbb1af` | Added analytics, caching, and auto-save to `smart-coach-dashboard.tsx` |
| Jan 19, 2026 | `dbf3204` | Merged `ralph/coach-parent-messaging` branch - **REGRESSION INTRODUCED** |

### How the Regression Occurred

The branch `ralph/coach-parent-messaging` was based on an **older version** of `smart-coach-dashboard.tsx` that predated the analytics/caching implementation. When this branch was merged into main at commit `dbf3204`, it replaced the newer code with the older version.

**Git merge history:**
```
*   dbf3204 Merge ralph/coach-parent-messaging into main
|\
| * 2172bef fix: Restore Generate Session Plan functionality in coach dashboard
* ddbb1af feat: Add session plan share analytics and UI enhancements  <-- Lost code
```

### Code Removed by Regression

**Imports removed:**
- `api` from Convex backend
- `Id` type from Convex
- `useConvex`, `useQuery` from `convex/react`
- `trackPlanCached`, `trackPlanGenerated`, `trackPlanRegenerated`, `trackPlanShared` from analytics-tracker
- `sessionPlanConfig` from session-plan-config

**State variables removed:**
- `currentPlanId` - Track the saved plan ID
- `showCachedBadge` - Control blue alert visibility
- `cachedBadgeDismissed` - Track if user dismissed the alert
- `cachedPlanAge` - Store formatted age string

**Functionality removed:**
- Cache check before generating new plan
- Blue alert UI component
- PostHog event tracking
- Database save/update mutations
- View/share/regenerate count tracking

### Orphaned Infrastructure (Still Exists)
The following files were created but are now unused:
- `apps/web/src/lib/analytics-tracker.ts` - All tracking functions
- `apps/web/src/lib/session-plan-config.ts` - Cache configuration (1 hour)
- `packages/backend/convex/models/sessionPlans.ts` - Backend mutations for save/update

---

## Agreed Fix Implementation

### Approach
Reference commit `ddbb1af` to restore the exact implementation with one modification:
- **Original:** Auto-save plan to database on generation
- **New:** Manual "Save to Library" button allowing coaches to regenerate before saving

### Changes Required

#### 1. Restore Imports (`smart-coach-dashboard.tsx`)
```typescript
import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useConvex } from "convex/react";
import {
  trackPlanCached,
  trackPlanGenerated,
  trackPlanRegenerated,
  trackPlanShared,
} from "@/lib/analytics-tracker";
import { sessionPlanConfig } from "@/lib/session-plan-config";
```

#### 2. Restore State Variables
```typescript
const [currentPlanId, setCurrentPlanId] = useState<Id<"sessionPlans"> | null>(null);
const [showCachedBadge, setShowCachedBadge] = useState(false);
const [cachedBadgeDismissed, setCachedBadgeDismissed] = useState(false);
const [cachedPlanAge, setCachedPlanAge] = useState<string | null>(null);
const [planSaved, setPlanSaved] = useState(false);

const convex = useConvex();
```

#### 3. Restore Cache Check in `handleGenerateSessionPlan`
- Check for existing cached plan (within 1 hour)
- If cached, display it and show blue alert
- Track `session_plan_cached` event
- If generating new, track `session_plan_generated` event

#### 4. Restore Blue Alert UI
```tsx
{showCachedBadge && cachedPlanAge && !cachedBadgeDismissed && (
  <div className="mt-2 flex items-center gap-2 rounded-md bg-blue-50/80 px-2.5 py-1.5 text-xs">
    <Clock className="flex-shrink-0 text-blue-600" size={14} />
    <div className="flex-1 text-blue-700">
      <div className="font-semibold text-[13px] leading-tight">
        You generated this {cachedPlanAge} ago
      </div>
      <div className="mt-0.5 text-[11px] leading-tight opacity-85">
        Tap Regenerate to create a fresh plan
      </div>
    </div>
    <button onClick={() => setCachedBadgeDismissed(true)}>
      <X size={14} />
    </button>
  </div>
)}
```

#### 5. Add Manual "Save to Library" Button (NEW)
```tsx
<Button
  className="flex h-10 w-full items-center justify-center gap-2 bg-purple-600 font-medium text-sm shadow-sm transition-colors hover:bg-purple-700 sm:flex-1"
  onClick={handleSaveToLibrary}
  disabled={planSaved}
>
  <Save className="flex-shrink-0" size={18} />
  <span>{planSaved ? "Saved!" : "Save to Library"}</span>
</Button>
```

#### 6. Implement Save Handler
```typescript
const handleSaveToLibrary = async () => {
  const team = teamAnalytics.find((t) => t.playerCount > 0);
  if (!team || !sessionPlan) return;

  const planId = await convex.mutation(api.models.sessionPlans.savePlan, {
    teamId: team.teamId,
    teamName: team.teamName,
    sessionPlan,
    // ... team data
  });

  setCurrentPlanId(planId);
  setPlanSaved(true);
  toast.success("Session plan saved to your library!");
};
```

#### 7. Restore PostHog Tracking
- `trackPlanCached()` - When showing cached plan
- `trackPlanGenerated()` - When generating new plan
- `trackPlanRegenerated()` - When regenerating (with count increment)
- `trackPlanShared()` - When sharing plan

---

## Testing Checklist

- [ ] Generate session plan - verify modal opens and plan displays
- [ ] Close modal, reopen within 1 hour - verify cached plan shows with blue alert
- [ ] Dismiss blue alert - verify it stays dismissed for that session
- [ ] Click Regenerate - verify new plan generated, blue alert clears
- [ ] Click Save to Library - verify plan saved, button shows "Saved!"
- [ ] Navigate to Session Plans library - verify saved plan appears
- [ ] Check PostHog - verify all events tracked correctly
- [ ] Test on mobile - verify responsive layout works

---

## Files Modified

- `apps/web/src/components/smart-coach-dashboard.tsx` - Main changes

## Files Referenced (no changes needed)
- `apps/web/src/lib/analytics-tracker.ts` - Tracking functions (already exists)
- `apps/web/src/lib/session-plan-config.ts` - Cache config (already exists)
- `packages/backend/convex/models/sessionPlans.ts` - Backend mutations (already exists)

---

## Branch
`fix/issue-292-session-plan-regression`

## Related Documentation
- Original implementation: Commit `ddbb1af`
- Feature specification: Issue #234
