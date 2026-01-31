# Bug #402: Quick Actions Dropdown Inconsistency in Coach Section

## Issue Summary

The Quick Actions dropdown was inconsistent across pages within the Coach section. Actions worked correctly on some pages but did nothing on others.

## Investigation Findings

### Architecture Overview

The Quick Actions system uses a React Context (`QuickActionsProvider`) that wraps the Coach layout. There are two ways actions get registered:

1. **Layout Defaults** (`coach/layout.tsx`): Sets 8 default actions using `router.push()` for navigation
2. **Page Overrides** (`FABQuickActions` component): Individual pages can override with custom actions

### Root Cause

The `session-plans/page.tsx` was using `<FABQuickActions />` **without any callback props**:

```tsx
// session-plans/page.tsx:586
<FABQuickActions />  // No callbacks passed!
```

The `FABQuickActions` component registers actions where each `onClick` handler calls a callback from props:

```tsx
// fab-variant.tsx:112
onClick: () => callbacksRef.current.onAssessPlayers?.(),  // undefined if not passed!
```

When no callbacks are passed, clicking most actions does **nothing** because the callbacks are `undefined`.

### Inconsistency Matrix

| Page | Action Source | Actions Work? |
|------|---------------|---------------|
| `/coach` (dashboard) | `FABQuickActions` with callbacks via `SmartCoachDashboard` | ✅ Yes |
| `/coach/session-plans` | `FABQuickActions` WITHOUT callbacks | ❌ No (most broken) |
| `/coach/voice-notes` | Layout defaults | ✅ Yes |
| `/coach/goals` | Layout defaults | ✅ Yes |
| `/coach/injuries` | Layout defaults | ✅ Yes |
| Other coach pages | Layout defaults | ✅ Yes |

### User Experience

1. **On main dashboard** → Click "Assess Players" → Navigates correctly ✅
2. **Navigate to Session Plans** → Click "Assess Players" → Nothing happens ❌
3. **Navigate to Voice Notes** → Click "Assess Players" → Navigates correctly ✅

## Resolution

**PR #405**: Removed the unnecessary `<FABQuickActions />` from `session-plans/page.tsx`.

The page now uses the coach layout's default actions which properly navigate using `router.push()`.

### Files Changed

- `apps/web/src/app/orgs/[orgId]/coach/session-plans/page.tsx`
  - Removed import of `FABQuickActions`
  - Removed `<FABQuickActions />` component usage

## Verification Steps

1. Navigate to `/orgs/[orgId]/coach/session-plans`
2. Click the Quick Actions button (⚡)
3. Verify all actions navigate correctly:
   - "Assess Players" → `/coach/assess`
   - "Record Voice Note" → `/coach/voice-notes`
   - "Report Injury" → `/coach/injuries`
   - "Manage Goals" → `/coach/goals`
   - "View Medical Info" → `/coach/medical`
   - "View Match Day" → `/coach/match-day`
4. Verify "Generate Session Plan" still opens the session plan modal

## Related Files

- `apps/web/src/app/orgs/[orgId]/coach/layout.tsx` - Layout with default actions
- `apps/web/src/components/quick-actions/fab-variant.tsx` - FABQuickActions component
- `apps/web/src/contexts/quick-actions-context.tsx` - Quick Actions context
- `docs/features/quick-actions-system.md` - Feature documentation

---

**Fixed in:** PR #405
**Date:** January 31, 2026
