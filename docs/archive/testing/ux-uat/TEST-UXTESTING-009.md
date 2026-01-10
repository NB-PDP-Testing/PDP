# TEST-UXTESTING-009: Phase 9 - AppShell & Unified Navigation

## Test Objective
Verify AppShell provides correct responsive navigation for all user roles.

## Prerequisites
- [ ] Development environment running (`npm run dev`)
- [ ] Feature flags enabled in PostHog:
  - `ux_app_shell` = true
  - `ux_bottom_nav` = true
- [ ] Test accounts for: Admin, Coach, Parent

## Test Steps

### Step 1: Admin Navigation (Desktop)
**Login as:** Admin user
**View:** Desktop (> 1024px)

1. Navigate to `/orgs/[orgId]/admin`
2. Check sidebar navigation

**Verification:**
- [ ] Sidebar visible on left side
- [ ] 4 groups visible: People, Teams & Access, Data & Import, Settings
- [ ] People group: Players, Coaches, Guardians, Users, Approvals
- [ ] Teams group: Teams, Overrides, Player Access
- [ ] Data group: Analytics, Benchmarks, Import Players, GAA
- [ ] Settings group: Settings, Announcements, Dev Tools
- [ ] Current page highlighted
- [ ] Groups are collapsible
- [ ] Org theme colors applied

### Step 2: Admin Navigation (Mobile)
**Login as:** Admin user
**View:** Mobile (< 768px)

1. Navigate to admin dashboard
2. Check bottom nav and mobile drawer

**Bottom Nav Verification:**
- [ ] 5 items visible: Home, Players, Add (+), Teams, More
- [ ] Active item highlighted
- [ ] Touch targets are 44px+
- [ ] Tapping navigates correctly

**Mobile Drawer Verification:**
- [ ] Hamburger menu opens drawer
- [ ] Drawer shows full navigation
- [ ] Same groups as desktop sidebar
- [ ] Tap to navigate, drawer closes

### Step 3: Coach Navigation (Desktop)
**Login as:** Coach user
**View:** Desktop (> 1024px)

1. Navigate to `/orgs/[orgId]/coach`
2. Check sidebar navigation

**Verification:**
- [ ] 3 groups visible: Players, Performance, Account
- [ ] Players group: Overview, My Players, Assessments
- [ ] Performance group: Reports, Benchmarks, Progress
- [ ] Account group: Profile, Settings
- [ ] Current page highlighted
- [ ] Org theme colors applied

### Step 4: Coach Navigation (Mobile)
**Login as:** Coach user
**View:** Mobile (< 768px)

**Bottom Nav Verification:**
- [ ] Role-appropriate items visible
- [ ] Assess (+ icon) for quick assessment entry
- [ ] Touch targets are 44px+

**Mobile Drawer Verification:**
- [ ] Shows coach navigation groups
- [ ] All items accessible

### Step 5: Parent Navigation (Desktop)
**Login as:** Parent user
**View:** Desktop (> 1024px)

1. Navigate to `/orgs/[orgId]/parents`
2. Check sidebar navigation

**Verification:**
- [ ] 3 groups visible: Children, Updates, Account
- [ ] Children group: Overview, My Children, Progress
- [ ] Updates group: Achievements, Messages, Announcements
- [ ] Account group: Profile, Settings
- [ ] Current page highlighted
- [ ] Org theme colors applied

### Step 6: Parent Navigation (Mobile)
**Login as:** Parent user
**View:** Mobile (< 768px)

**Bottom Nav Verification:**
- [ ] Role-appropriate items visible
- [ ] Children-focused navigation
- [ ] Touch targets are 44px+

### Step 7: Responsive Breakpoints
Test navigation transitions:

**Resize from Desktop → Mobile:**
- [ ] Sidebar collapses at 1024px
- [ ] Bottom nav appears at 768px
- [ ] Smooth transition, no flicker

**Resize from Mobile → Desktop:**
- [ ] Bottom nav hides at 768px
- [ ] Sidebar appears at 1024px
- [ ] Navigation state preserved

### Step 8: Navigation State Persistence
1. Navigate to a sub-page
2. Refresh the browser

**Verification:**
- [ ] URL preserved after refresh
- [ ] Correct navigation highlighted
- [ ] Back button works correctly

## Verification Checklist
- [ ] Admin sidebar shows all 4 groups
- [ ] Coach sidebar shows all 3 groups
- [ ] Parent sidebar shows all 3 groups
- [ ] Bottom nav shows role-appropriate items
- [ ] Mobile drawer works correctly
- [ ] Responsive transitions smooth
- [ ] Theme colors applied
- [ ] No console errors

## Devices Tested
| Device | Role | Browser | Result |
|--------|------|---------|--------|
| iPhone SE (375px) | Admin | Safari | ⬜ Pass / ⬜ Fail |
| iPhone SE (375px) | Coach | Safari | ⬜ Pass / ⬜ Fail |
| iPhone SE (375px) | Parent | Safari | ⬜ Pass / ⬜ Fail |
| iPad (768px) | Admin | Safari | ⬜ Pass / ⬜ Fail |
| Desktop (1280px) | Admin | Chrome | ⬜ Pass / ⬜ Fail |
| Desktop (1280px) | Coach | Chrome | ⬜ Pass / ⬜ Fail |
| Desktop (1280px) | Parent | Chrome | ⬜ Pass / ⬜ Fail |

## Test Result
- [ ] **PASS** - All verification items checked
- [ ] **FAIL** - Issues found (document below)

## Issues Found
<!-- Document any issues found during testing -->

## Sign-off
- **Tester:** 
- **Date:** 
- **Build/Commit:**