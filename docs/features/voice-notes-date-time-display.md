# Voice Notes - Date/Time Display Enhancement

**Date:** 2026-01-22
**Feature:** Add consistent date/time display across all voice notes tabs

---

## Overview

Added date and time display to all insights and parent summaries in the coach voice notes page. Format matches across all tabs showing day name, date, and time (e.g., "Mon Jan 22, 10:30 PM").

## Changes Made

### 1. Date Formatting Utilities

Created inline date formatting functions in each tab component:

**Format:** `weekday (short) + month (short) + day + time (12-hour)`
**Example:** "Mon Jan 22, 10:30 PM"

```typescript
function formatDate(date: Date | string | number): string {
  const d = typeof date === "string" || typeof date === "number"
    ? new Date(date)
    : date;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
```

### 2. Insights Tab (`insights-tab.tsx`)

**Changes:**
- ✅ Added `formatInsightDate()` function
- ✅ **Sorted insights by most recent first** (line 377-387)
- ✅ Added date/time display below badges (line 513-516)

**Display Location:**
Below the title/badges, above the description

**Sorting:**
```typescript
.sort((a, b) => new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime())
```

### 3. Parents Tab (`parents-tab.tsx`)

**Changes:**
- ✅ Added `formatSummaryDate()` function
- ✅ **Sorted summaries by most recent first** (primary), sensitivity (secondary) (line 135-151)
- ✅ Added `dateTime` prop to commonProps (line 188)
- ✅ Passed to all approval cards (InjuryApprovalCard, BehaviorApprovalCard, SummaryApprovalCard)

**Sorting:**
```typescript
// Primary: Most recent first
const timeA = a._creationTime;
const timeB = b._creationTime;
if (timeB !== timeA) {
  return timeB - timeA;
}

// Secondary: injury > behavior > normal
return (priority[a.sensitivityCategory] ?? 2) - (priority[b.sensitivityCategory] ?? 2);
```

### 4. Summary Approval Cards

Updated all three approval card components to display date/time:

#### `summary-approval-card.tsx`
- ✅ Added optional `dateTime` prop
- ✅ Display below sport name in card header (line 125-127)

#### `injury-approval-card.tsx`
- ✅ Added optional `dateTime` prop
- ✅ Display below sport name in card header (line 184-186)

#### `behavior-approval-card.tsx`
- ✅ Added optional `dateTime` prop
- ✅ Display below sport name in card header (line 173-175)

**Display Format:**
```tsx
{dateTime && (
  <p className="text-muted-foreground text-xs">{dateTime}</p>
)}
```

### 5. History Tab (`history-tab.tsx`)

**Changes:**
- ✅ Added `formatHistoryDate()` function
- ✅ Updated date display to use new format with weekday (line 258-260)
- ✅ Already sorted by most recent first (no change needed)

---

## Visual Impact

### Before
- **Insights Tab:** No date shown, unsorted
- **Parents Tab:** No date shown, sorted by sensitivity only
- **History Tab:** "Jan 22, 10:30 AM" (no day name)

### After
- **Insights Tab:** "Mon Jan 22, 10:30 PM" shown, sorted by most recent
- **Parents Tab:** "Mon Jan 22, 10:30 PM" shown, sorted by most recent (then sensitivity)
- **History Tab:** "Mon Jan 22, 10:30 PM" shown (with day name)

---

## Files Changed

1. `/apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx`
   - Added date formatter
   - Added sorting by most recent
   - Added date display

2. `/apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/parents-tab.tsx`
   - Added date formatter
   - Updated sorting (most recent first)
   - Added dateTime to commonProps

3. `/apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/summary-approval-card.tsx`
   - Added dateTime prop
   - Added date display

4. `/apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/injury-approval-card.tsx`
   - Added dateTime prop
   - Added date display

5. `/apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/behavior-approval-card.tsx`
   - Added dateTime prop
   - Added date display

6. `/apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/history-tab.tsx`
   - Added date formatter
   - Updated date display format

7. `/apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/date-utils.ts` (Created)
   - Utility functions for date formatting (for reference, though inlined in components)

---

## User Benefits

1. **Better Context:** Users can see when each insight or summary was created
2. **Easier Navigation:** Most recent items appear first
3. **Consistent UX:** Same date format across all tabs
4. **Mobile Friendly:** Short day names (Mon, Tue) save space

---

## Testing Checklist

- [ ] History tab shows date with day name
- [ ] Insights tab shows date for each insight, sorted by most recent
- [ ] Parents tab shows date for each summary, sorted by most recent
- [ ] Date format is consistent across all tabs
- [ ] Mobile view displays dates correctly (responsive text sizes)

---

**Status:** ✅ Implemented and ready for testing
