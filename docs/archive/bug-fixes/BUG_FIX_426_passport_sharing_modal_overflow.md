# Bug Fix: Passport Sharing Modal Overflows Screen

**Issue:** #426
**Title:** UAT Testing — passport sharing screen too large
**Branch:** `jkobrien/426_Fix_PassportSharing_screenlength`

---

## Problem

The passport sharing dialog goes off the top and bottom of the screen on shorter viewports (laptops, smaller monitors) with no ability to scroll.

---

## Root Cause

The `<DialogContent>` in the coach share modal used only `max-w-2xl` with no height constraint:

```tsx
<DialogContent className="max-w-2xl">
```

The base `DialogContent` component (`components/ui/dialog.tsx`) has no `max-h` or `overflow-y` built in. The modal content is tall — PDF section, separator, four share options, and an info box — so it exceeds viewport height and clips without scrolling.

---

## Fix

Added `max-h-[90vh] overflow-y-auto` to the `DialogContent` class:

```tsx
<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
```

This caps the modal height at 90% of the viewport and makes the interior scrollable when content overflows.

---

## Files Modified

| File | Change |
|---|---|
| `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/share-modal.tsx` | Add `max-h-[90vh] overflow-y-auto` to `DialogContent` |
