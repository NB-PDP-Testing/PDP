# TEST-UXTESTING-004: Phase 4 - Interactions & Feedback

## Test Objective
Verify command menu and responsive dialogs work correctly on all devices.

## Prerequisites
- [ ] Development environment running (`npm run dev`)
- [ ] Feature flags enabled in PostHog:
  - `ux_command_menu` = true
  - `ux_responsive_dialogs` = true
- [ ] Test user account logged in

## Test Steps

### Step 1: Command Menu (Desktop)
**Enable:** `ux_command_menu` = true

1. Open app on desktop
2. Press `⌘K` (Mac) or `Ctrl+K` (Windows)

**Verification:**
- [ ] Command menu opens with animation
- [ ] Search input is auto-focused
- [ ] Typing filters results in real-time
- [ ] Arrow keys navigate through results
- [ ] Enter selects current result
- [ ] Escape closes the menu
- [ ] Commands execute correctly

**Test Commands:**
- [ ] Type "play" → Shows "Go to Players", "Create Player"
- [ ] Type "set" → Shows "Settings"
- [ ] Type "team" → Shows team-related commands

### Step 2: Command Menu (Mobile)
1. Open app on mobile (< 768px)
2. Tap search icon in header (if visible)

**Verification:**
- [ ] Search opens as full-screen overlay
- [ ] Virtual keyboard opens automatically
- [ ] Results update as you type
- [ ] Easy to dismiss with back/cancel

### Step 3: Responsive Dialogs (Desktop)
**Enable:** `ux_responsive_dialogs` = true

1. Trigger a confirmation dialog (e.g., delete a player)
2. Observe dialog appearance

**Verification:**
- [ ] Dialog appears as centered modal
- [ ] Backdrop dims the background
- [ ] Click outside to dismiss works
- [ ] Escape key closes dialog
- [ ] Focus is trapped inside dialog
- [ ] Buttons are functional

### Step 4: Responsive Dialogs (Mobile)
1. Trigger a confirmation dialog on mobile
2. Observe dialog appearance

**Verification:**
- [ ] Dialog appears as bottom sheet
- [ ] Sheet slides up from bottom
- [ ] Can drag down to dismiss
- [ ] Full width of screen
- [ ] Large touch targets on buttons (44px+)
- [ ] Actions are functional

### Step 5: Loading & Feedback States
1. Perform actions that trigger loading states
2. Observe feedback

**Verification:**
- [ ] Button shows spinner during action
- [ ] Success toast appears after save
- [ ] Error toast appears on failure
- [ ] Toasts are dismissible
- [ ] Toasts auto-dismiss after timeout

## Verification Checklist
- [ ] Command menu opens with ⌘K/Ctrl+K
- [ ] Command search filters correctly
- [ ] Commands execute properly
- [ ] Desktop dialogs show as modals
- [ ] Mobile dialogs show as sheets
- [ ] Loading states display correctly
- [ ] Toast notifications work
- [ ] No console errors

## Devices Tested
| Device | Browser | Result |
|--------|---------|--------|
| iPhone SE (375px) | Safari | ⬜ Pass / ⬜ Fail |
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