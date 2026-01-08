# TEST-UXTESTING-001: Phase 1 - Navigation Foundation

## Test Objective
Verify all navigation foundation components work correctly on mobile and desktop.

## Prerequisites
- [ ] Development environment running (`npm run dev`)
- [ ] Feature flags enabled in PostHog:
  - `ux_bottom_nav` = true
  - `ux_admin_nav_sidebar` = true
  - `ux_app_shell` = true
  - `ux_hover_actions` = true
  - `ux_responsive_inputs` = true
- [ ] Test user accounts for Admin, Coach, Parent roles

## Test Steps

### Step 1: Bottom Navigation (Mobile)
**Enable:** `ux_bottom_nav` = true

1. Open app on mobile device (< 768px)
2. Log in as Admin user
3. Verify bottom nav appears

**Verification:**
- [ ] Bottom nav visible at bottom of screen
- [ ] Shows 5 navigation items maximum
- [ ] Active item shows label, inactive show icon only
- [ ] Touch targets are 44px minimum height
- [ ] Tapping items navigates correctly

### Step 2: Admin Sidebar (Desktop)
**Enable:** `ux_admin_nav_sidebar` = true

1. Open app on desktop (> 1024px)
2. Log in as Admin user
3. Navigate to admin dashboard

**Verification:**
- [ ] Sidebar visible on left side
- [ ] Items grouped into 4 categories (People, Teams & Access, Data & Import, Settings)
- [ ] Current page highlighted
- [ ] Groups are collapsible
- [ ] Hover states show on items

### Step 3: AppShell Responsive Layout
**Enable:** `ux_app_shell` = true

Test at three breakpoints:

**Mobile (< 640px):**
- [ ] Shows bottom nav
- [ ] Shows minimal header
- [ ] Hamburger menu opens sheet with full nav

**Tablet (640-1024px):**
- [ ] Shows collapsible sidebar
- [ ] Can toggle sidebar open/closed

**Desktop (> 1024px):**
- [ ] Shows full sidebar always visible
- [ ] Full header with breadcrumbs and search

### Step 4: Hover Actions (Desktop)
**Enable:** `ux_hover_actions` = true

1. Navigate to admin players list on desktop
2. Hover over table rows

**Verification:**
- [ ] Action buttons appear on row hover
- [ ] Fade in animation is smooth
- [ ] Actions are functional (Edit, Delete, etc.)
- [ ] Actions disappear on hover leave

### Step 5: Responsive Inputs
**Enable:** `ux_responsive_inputs` = true

1. Navigate to any form page
2. Test at different breakpoints

**Verification:**
- [ ] Mobile: Inputs are 48px height
- [ ] Tablet: Inputs are 44px height
- [ ] Desktop: Inputs are 40px height
- [ ] All inputs remain functional

## Verification Checklist
- [ ] Bottom nav works on mobile
- [ ] Admin sidebar works on desktop
- [ ] AppShell switches layouts correctly
- [ ] Hover actions reveal on desktop
- [ ] Inputs are properly sized per breakpoint
- [ ] No console errors
- [ ] Analytics events fire correctly

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