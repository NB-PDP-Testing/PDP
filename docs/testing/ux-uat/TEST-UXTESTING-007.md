# TEST-UXTESTING-007: Phase 7 - Table Migration & Enhanced Tables

## Test Objective
Verify enhanced table features, swipeable cards, and pull-to-refresh work correctly.

## Prerequisites
- [ ] Development environment running (`npm run dev`)
- [ ] Feature flags enabled in PostHog:
  - `ux_enhanced_tables` = true
  - `ux_swipe_cards` = true
  - `ux_pull_to_refresh` = true
- [ ] Test data: At least 10 players in the system

## Test Steps

### Step 1: Enhanced Tables (Desktop)
**Enable:** `ux_enhanced_tables` = true

1. Navigate to `/orgs/[orgId]/admin/players` on desktop
2. Test enhanced table features

**Column Visibility:**
- [ ] Click column visibility toggle
- [ ] Hide a column → column disappears
- [ ] Show a column → column reappears
- [ ] Preference persists after reload

**Bulk Selection:**
- [ ] Click header checkbox → selects all
- [ ] Click row checkboxes → selects individual
- [ ] Selected count shows in toolbar
- [ ] Bulk action buttons appear

**Bulk Actions:**
- [ ] Select multiple rows
- [ ] Click "Delete Selected"
- [ ] Confirmation dialog appears
- [ ] Action completes successfully

**Export:**
- [ ] Click Export button
- [ ] CSV file downloads
- [ ] Data is correct in CSV

**Sorting:**
- [ ] Click column header → sorts ascending
- [ ] Click again → sorts descending
- [ ] Sort indicator shows direction

### Step 2: Swipeable Cards (Mobile)
**Enable:** `ux_swipe_cards` = true

1. Navigate to player list on mobile (< 768px)
2. Test swipe gestures

**Swipe Left:**
- [ ] Swipe left reveals delete action (red)
- [ ] Animation is smooth (60fps)
- [ ] Swipe threshold feels natural (~30%)
- [ ] Tapping delete triggers confirmation
- [ ] Swipe back hides action

**Swipe Right:**
- [ ] Swipe right reveals edit action (blue)
- [ ] Animation is smooth (60fps)
- [ ] Tapping edit navigates to form
- [ ] Swipe back hides action

**Edge Cases:**
- [ ] Partial swipes snap back
- [ ] Cannot swipe both directions at once
- [ ] Scrolling doesn't trigger swipe

### Step 3: Pull to Refresh (Mobile)
**Enable:** `ux_pull_to_refresh` = true

1. Navigate to any list page on mobile
2. Pull down on the list

**Verification:**
- [ ] Pull gesture detected at top of list
- [ ] Refresh indicator appears (spinner)
- [ ] Data reloads after release
- [ ] Indicator disappears after refresh
- [ ] Works with touch events
- [ ] Doesn't trigger while scrolling up

### Step 4: ResponsiveDataView Integration
Test the integrated component:

**Mobile:**
- [ ] Shows cards by default
- [ ] Swipe actions work
- [ ] Pull to refresh works
- [ ] Selection via long-press or checkbox

**Desktop:**
- [ ] Shows table by default
- [ ] Enhanced features available
- [ ] Hover actions work
- [ ] Keyboard navigation works

## Verification Checklist
- [ ] Column visibility works
- [ ] Bulk selection works
- [ ] Bulk delete works
- [ ] CSV export works
- [ ] Sorting works
- [ ] Swipe left/right works on mobile
- [ ] Pull to refresh works on mobile
- [ ] No console errors

## Devices Tested
| Device | Browser | Result |
|--------|---------|--------|
| iPhone SE (375px) | Safari | ⬜ Pass / ⬜ Fail |
| iPhone 14 (393px) | Safari | ⬜ Pass / ⬜ Fail |
| iPad (768px) | Safari | ⬜ Pass / ⬜ Fail |
| Desktop (1280px) | Chrome | ⬜ Pass / ⬜ Fail |

## Test Result
- [ ] **PASS** - All verification items checked
- [ ] **FAIL** - Issues found (document below)

## Issues Found
<!-- Document any issues found during testing -->

## Sign-off
- **Tester:** 
- **Date:** 
- **Build/Commit:**