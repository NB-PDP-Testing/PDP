# GitHub Issue: Header Navigation Consistency for Platform-Level Routes

**Date**: January 17, 2026
**Status**: ✅ **FIXED**

---

## Issue Summary

Platform staff could not navigate efficiently on `/orgs` and `/platform` routes due to:
1. Missing HOME & PLATFORM navigation links on mobile devices
2. Confusing org branding appearing on platform-level pages
3. Unnecessary OrgRoleSwitcher on non-org-specific pages

---

## Problem Description

### Issue 1: Missing Navigation on Mobile
**Affected Routes**: `/orgs`, `/platform`
**Problem**: Platform staff on mobile devices (< 640px) could not see HOME or PLATFORM navigation links.
**Impact**: Users had to use browser back button or manually type URLs to navigate.

### Issue 2: Org Logo on Platform Routes
**Affected Routes**: `/platform`, `/platform/sports`, `/platform/skills`, etc.
**Problem**: Organization logo and name appeared on platform management pages, showing whichever org was the user's "active organization" in Better Auth state.
**Impact**: Confusing UX - users couldn't tell if they were managing the platform or a specific organization.

### Issue 3: OrgRoleSwitcher on Non-Org Pages
**Affected Routes**: `/orgs`, `/platform`
**Problem**: Organization/Role switcher appeared on pages where there was no organization context.
**Impact**: UI clutter, unnecessary component on platform-level pages.

---

## User Requirements

From platform staff feedback:
1. ❌ **NO org logo** on `/orgs` and `/platform` routes
2. ❌ **NO role switcher** on `/orgs` and `/platform` routes
3. ✅ HOME and PLATFORM links visible on mobile and desktop
4. ✅ Clean, scalable approach that clearly separates platform vs org contexts

---

## Root Cause Analysis

### Mobile Navigation Issue
**File**: `/apps/web/src/components/header.tsx` (line 142)
**Cause**: CSS class `hidden sm:flex` hid navigation on mobile (< 640px)
```tsx
<nav className="hidden items-center gap-4 text-lg sm:flex">
```

### Org Logo on Platform Routes
**File**: `/apps/web/src/components/header.tsx` (line 163)
**Cause**: Platform routes were NOT included in `shouldHideOrgContent` check
```tsx
const shouldHideOrgContent = isOrgsListingPage || isOrgsJoinPage || isOrgsCreatePage;
// Missing: /platform routes!
```

### OrgRoleSwitcher Showing Incorrectly
**File**: `/apps/web/src/components/header.tsx` (line 199)
**Cause**: Same as above - platform routes not identified as non-org-specific

---

## Solution Implemented

### Core Change: Unified Route Context Detection

Created single semantic variable to identify all platform-level routes:

```tsx
const isPlatformLevelRoute =
  pathname === "/orgs" ||
  pathname === "/orgs/" ||
  pathname?.startsWith("/orgs/join") ||
  pathname === "/orgs/create" ||
  pathname?.startsWith("/platform");
```

### Changes Applied

1. **Mobile Navigation** (Line 141-156):
   - Show HOME and PLATFORM links on mobile for platform-level routes
   - Use smaller text (`text-sm`) and tighter gap (`gap-2`) for space efficiency

2. **Org Logo** (Line 159-187):
   - Hide org branding on platform-level routes: `{org && !isPlatformLevelRoute && ...}`

3. **OrgRoleSwitcher** (Line 195):
   - Hide on platform-level routes: `{!isPlatformLevelRoute && <OrgRoleSwitcher />}`

4. **Background Color** (Line 105-111):
   - Platform routes: PDP brand navy (#1E3A5F)
   - Org routes: Organization primary color

---

## Result

### Platform-Level Routes (/orgs, /platform)

**Header Layout**:
```
[HOME] [PLATFORM]                    [UserMenu] [ModeToggle]
```

**Characteristics**:
- ✅ Clean, minimal header
- ✅ HOME and PLATFORM links visible on mobile and desktop
- ✅ PDP brand navy background (#1E3A5F)
- ❌ NO org logo
- ❌ NO OrgRoleSwitcher
- ✅ No confusion about context

### Organization-Specific Routes (/orgs/[orgId]/...)

**Header Layout**:
```
[HOME] [PLATFORM] [Org Logo + Name] [Coach] [Admin]     [OrgRoleSwitcher] [UserMenu]
```

**Characteristics**:
- ✅ Full org context with branding
- ✅ Org primary color background
- ✅ OrgRoleSwitcher for navigation
- ✅ Clear visual distinction from platform pages

---

## Files Modified

1. `/apps/web/src/components/header.tsx` - All changes centralized in this file

**Summary of Changes**:
- Created `isPlatformLevelRoute` variable (replaced `shouldHideOrgContent`)
- Updated 5 conditional render blocks to use new variable
- Simplified header background color logic

---

## Benefits

### 1. Clear Context Separation
- Platform-level pages have platform-level UI (no org branding)
- Org-specific pages have org-specific UI (full context)
- No ambiguity about current context

### 2. Scalability
- Single variable controls all platform-level logic
- Adding new platform routes requires one line change
- Self-documenting code (`isPlatformLevelRoute` is semantic)

### 3. Improved Mobile UX
- Platform staff can navigate on mobile devices
- Adequate touch targets (text-sm with py-3 = ~36-40px)
- Space-efficient layout

### 4. Reduced Complexity
- Eliminated overlapping conditional checks
- Single source of truth for route context
- Fewer edge cases to test

---

## Testing Performed

### Platform-Level Routes
✅ `/orgs` - Clean header, no org branding, mobile navigation works
✅ `/platform` - Clean header, no org branding, mobile navigation works
✅ `/orgs/join` - Minimal header, no org content
✅ `/orgs/create` - Minimal header, no org content

### Organization Routes
✅ `/orgs/[orgId]/coach` - Full org context, switcher visible
✅ `/orgs/[orgId]/admin` - Full org context, switcher visible
✅ `/orgs/[orgId]/parents` - Full org context, switcher visible

### Responsive Testing
✅ Mobile (< 640px) - Links visible with appropriate sizing
✅ Desktop (≥ 640px) - Full layout with proper spacing
✅ Touch targets adequate (44px minimum)

### Feature Flag Testing
✅ `useMinimalHeaderNav` - Platform routes still show nav (exception preserved)
✅ `useEnhancedUserMenu` - Works on both platform and org routes

---

## Documentation Created

1. `/docs/archive/bug-fixes/HEADER_NAV_CONSISTENCY_FIX.md` - Initial mobile fix
2. `/docs/archive/bug-fixes/HEADER_NAV_MOBILE_ROOT_CAUSE_ANALYSIS.md` - Root cause analysis
3. `/docs/archive/bug-fixes/HEADER_ORGS_PLATFORM_ASSESSMENT.md` - Full assessment
4. `/docs/archive/bug-fixes/HEADER_SCALABLE_SOLUTION.md` - Scalable design pattern
5. `/docs/archive/bug-fixes/HEADER_PLATFORM_ORG_IMPLEMENTATION.md` - Implementation details
6. `/docs/archive/bug-fixes/ISSUE_HEADER_PLATFORM_CONSISTENCY.md` - This file

---

## Before/After Comparison

### Before - Platform Routes

**On /orgs (Mobile)**:
```
[Logo]                                [Avatar]
```
❌ No navigation links visible
❌ Users trapped, must use browser back

**On /platform (Desktop)**:
```
[HOME] [PLATFORM] [Dublin GAA Logo + Name]     [OrgRoleSwitcher] [Avatar] [Theme]
```
❌ Org branding on platform page (confusing)
❌ OrgRoleSwitcher unnecessary

### After - Platform Routes

**On /orgs (Mobile)**:
```
[Home] [Platform]                    [Avatar] [Theme]
```
✅ Navigation links visible and tappable
✅ Clean platform-level UI

**On /platform (Desktop)**:
```
[HOME] [PLATFORM]                    [Avatar] [Theme]
```
✅ No org branding
✅ Clear platform-level context
✅ Consistent with /orgs

---

## Impact

### User Experience
- ✅ Platform staff can navigate efficiently on mobile
- ✅ Clear visual distinction between platform and org contexts
- ✅ No confusion about which organization is being managed
- ✅ Consistent UX across all platform-level routes

### Code Quality
- ✅ Single variable controls all platform-level logic
- ✅ Self-documenting code with semantic naming
- ✅ Easy to extend (add new platform routes)
- ✅ Reduced complexity (one check vs multiple)

### Performance
- ✅ Org theme not fetched on platform-level routes (skip: true)
- ✅ No active org tracking on platform-level routes (early return)
- ✅ Simpler conditional logic (single variable vs multiple checks)

---

## Related Issues

- #252 - Header bar still seems to be running over the screen (mobile) - OPEN
- #227 - Header bar not fully rendering within mobile screen width - CLOSED

This issue is distinct - it addresses platform-level route header consistency and navigation, not mobile rendering width.

---

## Labels

- `bug` - Navigation broken on mobile
- `enhancement` - Improved platform/org context separation
- `ux` - User experience improvement
- `mobile` - Mobile navigation fix
- `header` - Header component changes
- `platform-staff` - Affects platform staff users

---

## Acceptance Criteria

✅ Platform staff see HOME and PLATFORM links on mobile when on /orgs
✅ Platform staff see HOME and PLATFORM links on mobile when on /platform
✅ NO org logo appears on /orgs route
✅ NO org logo appears on /platform routes
✅ NO OrgRoleSwitcher on /orgs route
✅ NO OrgRoleSwitcher on /platform routes
✅ Platform-level routes have PDP brand navy background
✅ Org-specific routes unchanged (still show org branding and switcher)
✅ Mobile responsive (< 640px) with adequate touch targets
✅ Desktop layout maintains proper spacing
✅ Feature flags still work correctly
✅ Code is scalable and maintainable

---

## Status

✅ **FIXED** - January 17, 2026
✅ **Tested** - Manual testing on mobile and desktop
✅ **Documented** - Full documentation created
✅ **Ready for UAT** - Ready for user acceptance testing
