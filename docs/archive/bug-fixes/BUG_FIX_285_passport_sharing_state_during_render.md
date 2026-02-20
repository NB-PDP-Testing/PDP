# Bug Fix #285: Passport Sharing — setState During Render Error

## Issue
**GitHub:** [#285](https://github.com/NB-PDP-Testing/PDP/issues/285)
**Title:** UAT testing of passport sharing

## Root Cause

`ChildSelectionStep` (inside `enable-sharing-wizard.tsx`) called `onSelectChild(child._id)` directly in the render function body — not inside an effect or event handler. When a parent has only one child, this code path ran immediately during render, triggering a state update in the parent component (`EnableSharingWizard`) while `ChildSelectionStep` was still rendering. React forbids this and throws:

> Cannot update a component (`EnableSharingWizard`) while rendering a different component (`ChildSelectionStep`).

## What Was Changed

**File:** `apps/web/src/app/orgs/[orgId]/parents/sharing/components/enable-sharing-wizard.tsx`

Moved the auto-select call from the render body into a `useEffect`, which defers it until after the render completes:

```tsx
// Before (called during render — illegal in React)
if (childrenList.length === 1) {
  const child = childrenList[0];
  if (!selectedChildId) {
    onSelectChild(child._id);  // ← state update during render
  }
  return ( ... );
}

// After (called after render — correct)
useEffect(() => {
  if (childrenList.length === 1 && !selectedChildId) {
    onSelectChild(childrenList[0]._id);
  }
}, [childrenList, selectedChildId, onSelectChild]);

if (childrenList.length === 1) {
  const child = childrenList[0];
  return ( ... );
}
```

Also added `useEffect` to the React import.

## Files Modified

- `apps/web/src/app/orgs/[orgId]/parents/sharing/components/enable-sharing-wizard.tsx`
