# Infinite Render Loop and PostHog Rate Limiting - Root Cause Analysis
**Date**: January 13, 2026
**Status**: CRITICAL BUG - Causes application crashes and unusability
**Affected Area**: Coach Dashboard → Session Plan Generation → Quick Actions System

---

## Executive Summary

The application is experiencing a **critical infinite render loop** in the Quick Actions system that causes:
1. **Maximum update depth exceeded** errors (React crashes)
2. **PostHog rate limiting** (53-91+ analytics events per second)
3. **Continuous re-rendering** of coach dashboard
4. **Unusable UI** with constant flickering and state resets

This was introduced when FABQuickActions was restored in commit `602ad6d` after being removed in `5a91341`.

---

## Error Messages Observed

```
Maximum update depth exceeded. This can happen when a component calls
setState inside useEffect, but useEffect either doesn't have a dependency
array, or one of the dependencies changes on every render.
```

```
[PostHog.js] This capture call is ignored due to client rate limiting.
```

**Stack Trace Origin**:
- `fab-variant.tsx:120` - `FABQuickActions[useEffect()]`
- `quick-actions-context.tsx:31` - `QuickActionsProvider[clearActions]`
- `analytics.ts:63` - PostHog `track()` call

---

## Root Cause: Two Competing Action Setters

The infinite loop is caused by **two components fighting over the Quick Actions state**:

### 1. Coach Layout (`apps/web/src/app/orgs/[orgId]/coach/layout.tsx` lines 57-131)

```typescript
useEffect(() => {
  // Only set default actions if no actions are currently registered
  if (actions.length === 0) {
    const defaultActions = [ /* ... */ ];
    setActions(defaultActions);
  }
}, [actions.length, orgId, router, setActions]);
```

**Problem**: Depends on `actions.length` - triggers whenever actions array changes.

### 2. FABQuickActions (`apps/web/src/components/quick-actions/fab-variant.tsx` lines 51-138)

```typescript
useEffect(() => {
  const quickActions = [ /* ... */ ];
  setActions(quickActions);
  track(UXAnalyticsEvents.QUICK_ACTIONS_VARIANT_VIEWED, {
    variant: "header-fab",
  });

  // Cleanup on unmount - clear actions so layout defaults show
  return () => clearActions();
}, [
  onAssessPlayers,
  onGenerateSessionPlan,
  onViewAnalytics,
  onVoiceNotes,
  onInjuries,
  onGoals,
  onMedical,
  onMatchDay,
  setActions,
  clearActions,
  track,
]);
```

**Problems**:
1. **All 8 callback props in dependency array** - even with useCallback, these change frequently
2. **clearActions() in cleanup function** - sets actions to `[]` on unmount
3. **PostHog track() called on EVERY render** - causes rate limiting

---

## The Infinite Loop Cycle

Here's the exact sequence of events:

1. **FABQuickActions mounts** on coach dashboard page
   - Registers 8 actions via `setActions(quickActions)`
   - Fires PostHog tracking event
   - `actions.length` changes from 0 → 8

2. **Something causes a re-render** (parent state change, props update, etc.)
   - Could be ANY state change in the coach dashboard
   - Session plan generation, team selection, player filtering, etc.

3. **Callback props get new references** (even if wrapped in useCallback)
   - Parent component's props change → `onAssessPlayers` gets new reference
   - This invalidates the useCallback in smart-coach-dashboard
   - New callback reference passed to FABQuickActions

4. **FABQuickActions useEffect triggers** (dependency changed)
   - Calls `setActions()` again (even though actions are the same)
   - Fires PostHog tracking event AGAIN
   - Context updates → triggers re-render

5. **Context update propagates**
   - QuickActionsProvider re-renders all consumers
   - Coach layout re-renders
   - FABQuickActions re-renders

6. **Go back to step 2** - INFINITE LOOP

7. **Eventually React detects infinite loop**
   - "Maximum update depth exceeded" error
   - Application crashes or becomes unusable

### Special Case: When FABQuickActions Unmounts

If the component unmounts (navigation, conditional rendering):
- Cleanup function calls `clearActions()`
- `actions.length` becomes 0
- **Coach layout detects `actions.length === 0`**
- Layout sets default actions → `setActions(defaultActions)`
- If FABQuickActions remounts, cycle repeats

---

## Why Previous Fixes Failed

### Commit `5a91341` - Removed FABQuickActions
**What it did**: Completely removed FABQuickActions component
**Result**: ✅ Fixed infinite loop, ❌ Broke Generate Session Plan functionality
**Why it failed**: The layout's default actions couldn't access the page-specific handlers

### Commit `602ad6d` - Restored FABQuickActions with useCallback
**What it did**: Wrapped all handlers in smart-coach-dashboard with useCallback
**Result**: ❌ Infinite loop returned after a few renders
**Why it failed**: useCallback dependencies (props from parent) still changed on every render

---

## Contributing Factors

### 1. **Unstable Callback Dependencies**
The callbacks in `smart-coach-dashboard.tsx` are wrapped in useCallback but depend on props:

```typescript
const handleAssessPlayers = useCallback(() => {
  onAssessPlayers?.();
}, [onAssessPlayers]);  // ← onAssessPlayers prop changes frequently
```

If `onAssessPlayers` prop changes (from parent page), this creates a new callback reference.

### 2. **Context Setter Functions in Dependencies**
`setActions` and `clearActions` are in FABQuickActions dependency array. While these SHOULD be stable from React.useState, they're being called frequently.

### 3. **Analytics Tracking on Every Render**
```typescript
track(UXAnalyticsEvents.QUICK_ACTIONS_VARIANT_VIEWED, {
  variant: "header-fab",
});
```
This fires on EVERY useEffect run, causing PostHog to rate limit after 10-20 rapid events.

### 4. **Competing Action Registration**
Two different sources trying to manage the same Quick Actions state:
- Layout: "If no actions, set defaults"
- FABQuickActions: "Always set my actions, clear on unmount"

This creates a feedback loop.

---

## Solutions Considered

### ❌ Option 1: Keep useEffect dependencies as-is, fix parent
**Problem**: Parent props will always change during normal operation
**Verdict**: Not feasible - would require rewriting entire parent component chain

### ❌ Option 2: Remove callback functions from dependencies
**Problem**: Violates React hooks rules, ESLint errors, stale closures
**Verdict**: Not acceptable - causes bugs and linting issues

### ✅ Option 3: Use refs for callbacks instead of state dependencies
**Solution**: Store callbacks in refs, only trigger useEffect when component mounts
**Verdict**: Best solution - stable references, no infinite loop

### ✅ Option 4: Conditional action registration
**Solution**: Only register actions on mount, don't clear on unmount
**Verdict**: Good compromise - simpler than refs, prevents feedback loop

### ✅ Option 5: Restructure Quick Actions to use event system
**Solution**: Emit events instead of setting state, decouple components
**Verdict**: Ideal long-term solution - requires significant refactoring

---

## Recommended Fix (Immediate)

**Approach**: Combination of Options 3 and 4

### 1. Store callbacks in refs in FABQuickActions

```typescript
// Store stable references to callbacks
const callbacksRef = useRef({
  onAssessPlayers,
  onGenerateSessionPlan,
  onViewAnalytics,
  onVoiceNotes,
  onInjuries,
  onGoals,
  onMedical,
  onMatchDay,
});

// Update refs when callbacks change (without triggering effects)
useEffect(() => {
  callbacksRef.current = {
    onAssessPlayers,
    onGenerateSessionPlan,
    onViewAnalytics,
    onVoiceNotes,
    onInjuries,
    onGoals,
    onMedical,
    onMatchDay,
  };
});

// Register actions ONCE on mount
useEffect(() => {
  const quickActions = [
    {
      id: "assess",
      icon: Edit,
      label: "Assess Players",
      title: "Rate player skills & performance",
      onClick: () => callbacksRef.current.onAssessPlayers(),  // ← Use ref
      color: "bg-blue-600 hover:bg-blue-700",
    },
    // ... other actions using callbacksRef.current.xxx()
  ];

  setActions(quickActions);

  // Track ONCE on mount
  track(UXAnalyticsEvents.QUICK_ACTIONS_VARIANT_VIEWED, {
    variant: "header-fab",
  });

  // DON'T clear on unmount - let layout handle defaults
  // return () => clearActions();  // ← Remove this
}, []); // ← Empty dependency array - only run on mount
```

### 2. Fix layout to not fight with FABQuickActions

```typescript
// Coach layout: Only set defaults if NO page-specific actions AND not loading
useEffect(() => {
  // Use a flag to prevent fighting with FABQuickActions
  const hasCustomActions = actions.some(
    (action) => action.id === "session-plan" && action.onClick.toString().includes("handleGenerateSessionPlan")
  );

  if (actions.length === 0 && !hasCustomActions) {
    const defaultActions = [ /* ... */ ];
    setActions(defaultActions);
  }
}, [orgId, router, setActions]); // ← Remove actions.length dependency
```

### 3. Add tracking throttle to prevent rate limiting

```typescript
// Use a ref to track last tracking time
const lastTrackTime = useRef<number>(0);

useEffect(() => {
  const now = Date.now();
  // Only track if 5 seconds have passed since last track
  if (now - lastTrackTime.current > 5000) {
    track(UXAnalyticsEvents.QUICK_ACTIONS_VARIANT_VIEWED, {
      variant: "header-fab",
    });
    lastTrackTime.current = now;
  }
}, []);
```

---

## Testing Plan

After implementing the fix, verify:

1. ✅ **No console errors** on coach dashboard load
2. ✅ **No PostHog rate limiting** warnings
3. ✅ **Quick Actions button appears** in header
4. ✅ **Generate Session Plan clickable** and functional
5. ✅ **Modal opens** and generates plan successfully
6. ✅ **No infinite re-renders** when:
   - Selecting teams
   - Generating session plans
   - Filtering players
   - Navigating between coach pages
7. ✅ **Actions clear properly** when navigating away from dashboard
8. ✅ **Default actions appear** on other coach pages (voice notes, injuries, etc.)

---

## Long-Term Improvements

1. **Refactor Quick Actions to use event system** instead of context state
2. **Create a QuickActionsRegistry** that components register with on mount
3. **Use React.memo** on FABQuickActions to prevent unnecessary re-renders
4. **Add developer warnings** if infinite loop is detected (component mount/unmount cycles)
5. **Implement PostHog tracking middleware** with automatic throttling/debouncing

---

## Related Files

- `apps/web/src/components/quick-actions/fab-variant.tsx` (PRIMARY)
- `apps/web/src/contexts/quick-actions-context.tsx`
- `apps/web/src/components/smart-coach-dashboard.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/layout.tsx`
- `apps/web/src/lib/analytics.ts`

---

## Related Commits

- `5a91341` - fix: Remove FABQuickActions and fix infinite render loop
- `602ad6d` - fix: Restore FABQuickActions with stable callbacks
- `ddbb1af` - feat: Add session plan share analytics and UI enhancements

---

**Priority**: 🔴 CRITICAL - Must be fixed before deployment
**Estimated Fix Time**: 30-45 minutes
**Risk**: Low - Changes isolated to Quick Actions system
**Impact**: High - Fixes critical usability issue
