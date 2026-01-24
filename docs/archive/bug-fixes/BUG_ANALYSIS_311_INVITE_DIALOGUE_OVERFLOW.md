# Bug Analysis: Issue #311 - Invite Member Dialogue Overflow

**Issue:** [#311 - Invite Member dialogue gets too big](https://github.com/NB-PDP-Testing/PDP/issues/311)

**Date:** 2026-01-23

**Status:** CONFIRMED BUG

---

## Summary

When inviting a member with Admin, Coach, AND Parent roles all selected, the Invite Member dialogue content exceeds the viewport height. Users cannot scroll within the dialogue to access the "Send Invitation" button.

---

## Root Cause

The `DialogContent` component at `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx` (line 1718) has **no height constraint or overflow handling**.

**DialogContent default styling** (from `apps/web/src/components/ui/dialog.tsx` line 60-61):
```typescript
className={cn(
  "bg-background ... fixed top-[50%] left-[50%] ... w-full max-w-[calc(100%-2rem)] ... sm:max-w-lg",
  className
)}
```

**Missing from defaults:**
- No `max-h-[...]` - No maximum height constraint
- No `overflow-y-auto` - No vertical scrolling capability

---

## Content Height Analysis

When all three roles are selected, the dialogue contains:

| Section | Approximate Height |
|---------|-------------------|
| DialogHeader (title + description) | ~60px |
| Email input field | ~80px |
| Roles selection (3 buttons + helper text) | ~120px |
| **Coach: Team Selection** (conditionally shown) | ~200px |
| **Parent: Player Linking** (conditionally shown) | ~240px |
| Form footer buttons | ~50px |
| Dialog padding (p-6 x2) | ~48px |
| **TOTAL** | **~800px** |

The Coach and Parent sections each have their own `max-h-40 overflow-y-auto` (lines 1813 and 1879), but this only constrains their internal lists - the parent DialogContent has no scroll capability.

---

## Affected Code Locations

### Invite Member Dialog Structure

**File:** `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx`

```
Lines 1717-1957: Dialog component
├── Line 1718: DialogContent (NO overflow handling)
│   ├── Lines 1719-1727: DialogHeader
│   └── Lines 1729-1955: ResponsiveForm
│       └── Lines 1735-1954: ResponsiveFormSection
│           ├── Lines 1736-1749: Email input
│           ├── Lines 1751-1803: Roles selection (admin/coach/parent buttons)
│           ├── Lines 1806-1862: Coach team selection (conditional)
│           │   └── Line 1813: max-h-40 overflow-y-auto (internal list only)
│           └── Lines 1864-1953: Parent player linking (conditional)
│               └── Line 1879: max-h-40 overflow-y-auto (internal list only)
```

### ResponsiveForm Component

**File:** `apps/web/src/components/forms/responsive-form.tsx`

The `ResponsiveForm` component provides:
- Mobile sticky footer (lines 182-186)
- Mobile padding bottom `pb-24` (line 163)

However, it does **not** add scrolling to its content container.

---

## Reproduction Steps

1. Navigate to Admin > Users page
2. Click "Invite Member" button
3. Select **all three roles**: Admin, Coach, AND Parent
4. Observe the dialogue expands beyond viewport
5. Cannot scroll to see "Send Invitation" button

---

## Impact

- **Desktop:** Button is clipped below visible area
- **Mobile:** Even with sticky footer, content cannot be scrolled to review all options before submitting

---

## Proposed Resolution

Add `max-h-[90vh] overflow-y-auto` to the DialogContent className:

**Option A - Inline fix (page-specific):**
```typescript
// Line 1718 in users/page.tsx
<DialogContent className="max-h-[90vh] overflow-y-auto">
```

**Option B - Update base component (global fix):**
Update `apps/web/src/components/ui/dialog.tsx` DialogContent defaults to include height constraints. This would affect all dialogs system-wide, which may or may not be desired.

**Recommended:** Option A for targeted fix, as other dialogs may not need this constraint.

---

## Additional Considerations

1. The ResponsiveForm's sticky footer on mobile may need adjustment if scroll is added
2. Consider adding `flex flex-col` to DialogContent if using with scrollable content
3. Test across various viewport sizes (mobile portrait, mobile landscape, tablet, desktop)
