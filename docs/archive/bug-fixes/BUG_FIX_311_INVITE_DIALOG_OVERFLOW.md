# Bug Fix: Issue #311 - Invite Member Dialog Overflow

**Issue:** [#311 - Invite Member dialogue gets too big](https://github.com/NB-PDP-Testing/PDP/issues/311)

**Date Fixed:** 2026-01-25

**Branch:** `fix/311-invite-dialog-overflow`

---

## Root Cause

Two related issues:

1. **Desktop:** The `DialogContent` component had no height constraints. When users selected multiple roles (Admin + Coach + Parent), conditional content sections expanded the dialog beyond viewport height with no way to scroll.

2. **Mobile:** The `ResponsiveForm` component uses `position: fixed` for its sticky footer, which positions the buttons relative to the **viewport** rather than the dialog. When combined with scrollable dialog content, the footer overlapped the form content and was inaccessible.

**Affected file:** `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx` (lines 1723-1965)

---

## Steps to Fix

1. Added flex column layout to `DialogContent` with max height constraint
2. Wrapped the form in a scrollable container (`min-h-0 flex-1 overflow-y-auto`)
3. Disabled `stickySubmit` on `ResponsiveForm` to prevent viewport-fixed footer positioning inside the dialog

---

## What Was Implemented

**DialogContent changes:**
```diff
- <DialogContent>
+ <DialogContent className="flex max-h-[90vh] flex-col">
```

**Added scrollable wrapper around form:**
```jsx
<div className="min-h-0 flex-1 overflow-y-auto">
  <ResponsiveForm ... />
</div>
```

**Disabled viewport-fixed sticky footer:**
```diff
  <ResponsiveForm
    isLoading={inviting}
    onCancel={() => setInviteDialogOpen(false)}
    onSubmit={handleInvite}
+   stickySubmit={false}
    submitText="Send Invitation"
  >
```

**Result:**
- Dialog header stays fixed at top
- Form content scrolls in the middle section
- Cancel/Submit buttons stay at the bottom of the dialog (not fixed to viewport)

---

## How to Test

### Prerequisites
- Access to an organization as an Admin
- At least one team exists in the organization
- At least one player exists in the organization

### Test Steps

1. **Navigate to the Users page**
   - Go to Admin > Users (or `/orgs/[orgId]/admin/users`)

2. **Open the Invite Member dialog**
   - Click the "Invite Member" button

3. **Select all three roles**
   - Click "Admin" role button (should highlight purple)
   - Click "Coach" role button (should highlight blue) - team selection appears
   - Click "Parent" role button (should highlight green) - player linking appears

4. **Verify scrolling works (Desktop)**
   - The dialog should NOT extend past the bottom of the screen
   - Scroll within the dialog to see all content
   - "Cancel" and "Send Invitation" buttons should be visible at the bottom
   - Buttons should NOT overlap with form content

5. **Test on mobile viewport**
   - Open DevTools (F12) → Toggle device toolbar → Select iPhone 12 or similar
   - Repeat steps 2-4
   - Verify the dialog content is scrollable
   - **Critical:** Buttons should be at the bottom of the dialog, NOT overlapping content
   - Both buttons should be fully visible and clickable

### Expected Results

| Scenario | Before Fix | After Fix |
|----------|------------|-----------|
| Desktop with all 3 roles | Button cut off, no scroll | Scrollable, buttons visible at bottom |
| Mobile with all 3 roles | Buttons overlap content, can't click | Buttons at bottom, content scrolls above |
| Single role selected | Dialog fits | Dialog fits (no change) |

---

## Files Changed

- `apps/web/src/app/orgs/[orgId]/admin/users/page.tsx` (lines 1723-1965)
