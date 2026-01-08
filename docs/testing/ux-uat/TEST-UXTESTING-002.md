# TEST-UXTESTING-002: Phase 2 - Data Display Components

## Test Objective
Verify all data display components render correctly on mobile and desktop.

## Prerequisites
- [ ] Development environment running (`npm run dev`)
- [ ] Feature flags enabled in PostHog:
  - `ux_mobile_cards` = true
  - `ux_skeleton_loaders` = true
- [ ] Test data: At least 10 players in the system

## Test Steps

### Step 1: Mobile Cards View
**Enable:** `ux_mobile_cards` = true

1. Navigate to `/admin/players` on mobile (< 768px)
2. Verify card layout displays

**Verification:**
- [ ] Cards display instead of table on mobile
- [ ] Each card shows: avatar, name, team, status
- [ ] Cards are tappable and navigate to detail
- [ ] Touch targets are 44px minimum
- [ ] Desktop still shows table layout

### Step 2: Skeleton Loaders
**Enable:** `ux_skeleton_loaders` = true

1. Enable Network throttling (Slow 3G in DevTools)
2. Navigate to admin dashboard
3. Refresh and observe loading states

**Verification:**
- [ ] Dashboard shows stat card skeletons
- [ ] Player list shows table/card skeletons
- [ ] Skeleton shapes match final content layout
- [ ] No layout shift when content loads
- [ ] Smooth fade transition to real content

### Step 3: ResponsiveDataView Component
Test on admin players page:

**Mobile View:**
- [ ] Shows card layout
- [ ] Selection checkboxes work
- [ ] Row actions accessible via menu

**Desktop View:**
- [ ] Shows table layout
- [ ] Sortable columns work
- [ ] Selection checkboxes work
- [ ] Row actions on hover

## Verification Checklist
- [ ] Mobile cards display correctly
- [ ] Desktop tables display correctly
- [ ] Skeleton loaders match content layout
- [ ] No layout shift on data load
- [ ] Selection and actions work
- [ ] No console errors

## Devices Tested
| Device | Browser | Result |
|--------|---------|--------|
| iPhone SE (375px) | Safari | ⬜ Pass / ⬜ Fail |
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