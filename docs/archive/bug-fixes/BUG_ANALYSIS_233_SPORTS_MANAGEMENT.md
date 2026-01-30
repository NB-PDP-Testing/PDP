# Bug #233: Platform Sports Management Issues

## Issue Description
Two related issues in the Platform Sports Management page (`/platform/sports`):

1. **Long descriptions push buttons off screen** - When a sport has a long description, it expands the Description column and pushes the Action buttons (Edit, Age Groups, Delete) off the visible area.

2. **Empty description doesn't save** - When editing a sport and clearing the description field, leaving it blank, the change is not persisted.

## Root Cause Analysis

### Issue 1: Long Description Layout Problem

**Location:** `apps/web/src/app/platform/sports/page.tsx` (lines 454-456)

```tsx
<TableCell className="text-muted-foreground text-sm">
  {sport.description || "—"}
</TableCell>
```

**Problem:** The Description `TableCell` has no width constraints, `max-width`, or text truncation. In a table with 4 columns (Code, Name, Description, Actions), a long description will expand to accommodate all text, pushing the Actions column off the right edge of the screen.

**Fix:** Add CSS classes to constrain the description column width and truncate long text:
```tsx
<TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
  {sport.description || "—"}
</TableCell>
```
Or use `line-clamp-2` for multi-line truncation with ellipsis.

### Issue 2: Empty Description Not Saving

**Location:** 
- Frontend: `apps/web/src/app/platform/sports/page.tsx` (line 167)
- Backend: `packages/backend/convex/models/sports.ts` (lines 141-143)

**Frontend code:**
```typescript
await updateSport({
  code: editingSport.code,
  name: sportName.trim(),
  description: sportDescription.trim() || undefined,  // <-- Empty string becomes undefined
});
```

**Backend code:**
```typescript
if (args.description !== undefined) {  // <-- undefined is NOT processed
  updates.description = args.description;
}
```

**Problem:** When the description is cleared (empty string), the frontend converts it to `undefined`. The backend checks `if (args.description !== undefined)` - since it IS undefined, the description is never updated. The old value persists.

**Fix Options:**

**Option A (Recommended):** Change frontend to pass empty string instead of undefined:
```typescript
description: sportDescription.trim(),  // Empty string will be processed
```
And update backend to handle empty string as clearing the value:
```typescript
if (args.description !== undefined) {
  updates.description = args.description || undefined;  // Empty string becomes undefined
}
```

**Option B:** Add a separate `clearDescription` boolean flag.

## Bug Status
**CONFIRMED ACTIVE** - Both issues are still present in the codebase.

## Files to Modify
1. `apps/web/src/app/platform/sports/page.tsx` - UI layout fix + frontend description handling
2. `packages/backend/convex/models/sports.ts` - Backend description clearing logic
