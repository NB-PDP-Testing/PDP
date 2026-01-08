# TEST-UXTESTING-010: Phase 10 - Context Menu & Advanced Interactions

## Test Objective
Verify context menus, action sheets, and inline edit work correctly on mobile and desktop.

## Prerequisites
- [ ] Development environment running (`npm run dev`)
- [ ] Feature flags enabled in PostHog:
  - `ux_context_menu` = true
  - `ux_action_sheet` = true
  - `ux_inline_edit` = true
- [ ] Test data: At least 5 players in the system

## Test Steps

### Step 1: Context Menu (Desktop - Right Click)
**Enable:** `ux_context_menu` = true

1. Navigate to `/orgs/[orgId]/admin/players` on desktop
2. Right-click on a player row/card

**Verification:**
- [ ] Dropdown menu appears near cursor
- [ ] Menu shows relevant actions (View, Edit, Delete)
- [ ] Icons display correctly
- [ ] Destructive actions styled in red
- [ ] Click action → action executes
- [ ] Click outside → menu closes
- [ ] Press Escape → menu closes

### Step 2: Context Menu (Mobile - Long Press)
**Enable:** `ux_context_menu` = true

1. Navigate to player list on mobile (< 768px)
2. Long-press on a player card (hold for 500ms+)

**Verification:**
- [ ] Long-press triggers after ~500ms
- [ ] Haptic feedback (if device supports)
- [ ] Bottom sheet appears with actions
- [ ] Title shows item name
- [ ] Large touch targets (44px+)
- [ ] Swipe down dismisses sheet
- [ ] Tap action → action executes

### Step 3: Action Sheet (Desktop)
**Enable:** `ux_action_sheet` = true

1. Find "More actions" button (⋮ icon) on any item
2. Click the button

**Verification:**
- [ ] Dropdown menu appears below button
- [ ] Menu positioned correctly (not off-screen)
- [ ] Arrow keys navigate options
- [ ] Enter selects highlighted option
- [ ] Escape closes menu
- [ ] Actions execute correctly

### Step 4: Action Sheet (Mobile)
**Enable:** `ux_action_sheet` = true

1. Find "More actions" button on mobile
2. Tap the button

**Verification:**
- [ ] Bottom sheet appears
- [ ] Cancel button at bottom
- [ ] Large touch targets (44px+)
- [ ] Swipe down dismisses
- [ ] Tap action executes

### Step 5: Inline Edit (Desktop - Double Click)
**Enable:** `ux_inline_edit` = true

1. Find an inline-editable field (if enabled on a page)
2. Double-click the text

**Verification:**
- [ ] Field becomes editable input
- [ ] Original value pre-filled
- [ ] Input is focused
- [ ] Type to edit value
- [ ] Press Enter → saves and closes
- [ ] Press Escape → cancels and closes
- [ ] Click outside → saves and closes
- [ ] Visual indicator of edit mode

### Step 6: Inline Edit (Mobile - Tap)
**Enable:** `ux_inline_edit` = true

1. Tap on an inline-editable field on mobile
2. Observe edit experience

**Verification:**
- [ ] Edit drawer/sheet opens
- [ ] Field label shown
- [ ] Current value pre-filled
- [ ] Full-width input
- [ ] Save button prominent (44px+)
- [ ] Cancel button available
- [ ] Virtual keyboard opens
- [ ] Validation errors shown in drawer

### Step 7: Long Press Hook Behavior
Test the `useLongPress` hook:

**Timing:**
- [ ] Short tap (< 500ms) doesn't trigger
- [ ] Long press (~500ms) triggers
- [ ] Release after trigger is clean

**Edge Cases:**
- [ ] Moving finger cancels long press
- [ ] Multiple touches don't cause issues
- [ ] Works with mouse on desktop

## Verification Checklist
- [ ] Right-click context menu works (desktop)
- [ ] Long-press context menu works (mobile)
- [ ] Action sheet dropdown works (desktop)
- [ ] Action sheet bottom sheet works (mobile)
- [ ] Inline edit double-click works (desktop)
- [ ] Inline edit drawer works (mobile)
- [ ] All actions execute correctly
- [ ] Analytics events fire
- [ ] No console errors

## Analytics Events to Verify
Check PostHog for these events:
- [ ] `CONTEXT_MENU_OPENED` - fires on open
- [ ] `CONTEXT_MENU_ACTION` - fires on action select
- [ ] `ACTION_SHEET_OPENED` - fires on open
- [ ] `ACTION_SHEET_ACTION` - fires on action select
- [ ] `INLINE_EDIT_STARTED` - fires on edit start
- [ ] `INLINE_EDIT_SAVED` - fires on save
- [ ] `INLINE_EDIT_CANCELLED` - fires on cancel

## Devices Tested
| Device | Browser | Result |
|--------|---------|--------|
| iPhone SE (375px) | Safari | ⬜ Pass / ⬜ Fail |
| iPhone 14 (393px) | Safari | ⬜ Pass / ⬜ Fail |
| iPad (768px) | Safari | ⬜ Pass / ⬜ Fail |
| Desktop (1280px) | Chrome | ⬜ Pass / ⬜ Fail |
| Desktop (1280px) | Firefox | ⬜ Pass / ⬜ Fail |

## Test Result
- [ ] **PASS** - All verification items checked
- [ ] **FAIL** - Issues found (document below)

## Issues Found
<!-- Document any issues found during testing -->

## Sign-off
- **Tester:** 
- **Date:** 
- **Build/Commit:**