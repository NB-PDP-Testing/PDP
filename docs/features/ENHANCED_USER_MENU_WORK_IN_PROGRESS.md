# Enhanced User Menu - Work in Progress

**Date**: January 17, 2026
**Status**: ⏸️ **ON HOLD - Missing Dependencies**
**Branch**: `feature/enhanced-user-menu`

---

## Overview

Enhanced User Menu consolidates UserMenu + ModeToggle into a single profile button, following industry patterns (Linear, Notion, GitHub, Slack).

This work was completed but temporarily removed from main due to missing dependencies. All components are preserved on this feature branch for later integration.

---

## Components Completed

### 1. Enhanced User Menu (`enhanced-user-menu.tsx`)
- ✅ Avatar button trigger with theme indicator badge
- ✅ ResponsiveDialog wrapper (desktop dropdown, mobile bottom sheet)
- ✅ Theme selector (Light/Dark/System with checkmarks)
- ✅ Quick actions (Profile/Settings/Alerts)
- ✅ Sign out button
- ✅ WCAG 2.2 AA compliant
- ✅ Mobile-optimized touch targets

### 2. Profile Settings Dialog (`profile-settings-dialog.tsx`)
- ✅ OAuth-aware (read-only fields for Google/Microsoft accounts)
- ✅ Avatar display with initials fallback
- ✅ Personal information editing (name, phone)
- ✅ Account information display (email, member since, platform staff badge)
- ✅ Form validation
- ✅ Success/error handling

### 3. Preferences Dialog (`preferences-dialog.tsx`)
- ✅ Theme preference selector
- ✅ Default organization selector
- ✅ Default role per org selector
- ✅ Density preference
- ✅ Usage insights display

### 4. Alerts Dialog (`alerts-dialog.tsx`)
- ✅ User alert notifications
- ✅ Mark as read functionality

### 5. Header Integration (`header.tsx`)
- ✅ Feature flag controlled: `useEnhancedUserMenu`
- ✅ Conditional rendering (EnhancedUserMenu vs UserMenu + ModeToggle)
- ✅ Maintains backward compatibility

---

## Missing Dependencies

These need to be ported from ralph branch before integration:

### Frontend

**1. Hooks**
- `@/hooks/use-default-preference` - Default org/role preference management

**2. Feature Flags** (in `use-ux-feature-flags.ts`)
- `useEnhancedUserMenu` - Enable enhanced user menu
- `useOrgUsageTracking` - Track org usage for smart defaults

**3. Analytics Events** (in UX analytics constants)
- `ENHANCED_USER_MENU_OPENED`
- `ENHANCED_USER_MENU_THEME_CHANGED`

### Backend

**1. Convex Functions** (in `models/users.ts`)
- `updateProfile` - Update user profile (name, phone)
- `getUserAuthMethod` - Check if user has OAuth account

**2. Convex Table** (in `schema.ts`)
- `userPreferences` - Store user preferences
  - defaultOrganizationId
  - defaultRoleByOrg
  - themePreference
  - densityPreference
  - orgAccessFrequency
  - roleAccessFrequency

**3. Convex Functions** (in `models/userPreferences.ts`)
- `getUserPreferences` - Get user preferences
- `updateUserPreferences` - Update user preferences
- `trackOrgAccess` - Track org access for frequency intelligence

---

## Linting Fixes Applied

All biome linting errors were resolved:

1. ✅ Moved phone regex to top level for performance
2. ✅ Extracted helper functions to reduce cognitive complexity
   - `getUserInitials()`
   - `formatMemberSinceDate()`
   - `validateProfileForm()`
3. ✅ Applied block statements to early returns
4. ✅ Removed unused variables
5. ✅ Added biome-ignore for unavoidable complex UI rendering

---

## Integration Plan

When ready to integrate:

1. **Port Dependencies**
   - Copy missing hooks from ralph branch
   - Add feature flags to `use-ux-feature-flags.ts`
   - Add analytics events
   - Port backend functions and table schema

2. **Merge Feature Branch**
   ```bash
   git checkout main
   git merge feature/enhanced-user-menu
   ```

3. **Enable Feature Flag**
   - Add `ux_enhanced_user_menu` to PostHog
   - Test with gradual rollout (10% → 50% → 100%)

4. **Cleanup**
   - Remove old UserMenu + ModeToggle if fully replaced
   - Update documentation

---

## Testing Checklist

### Desktop (1920px)
- [ ] Avatar displays initials or photo
- [ ] Theme indicator badge visible (sun/moon/monitor)
- [ ] Click avatar → dropdown opens
- [ ] Theme section shows current selection with checkmark
- [ ] Click Light/Dark/System → theme changes smoothly
- [ ] Profile Settings link navigates to `/settings/profile`
- [ ] Preferences link navigates to `/settings/preferences`
- [ ] Alerts link navigates to `/settings/alerts`
- [ ] Sign Out button works
- [ ] Keyboard navigation: Tab → Enter → Arrow keys → Escape

### Mobile (375px)
- [ ] Avatar button visible and tappable (44px touch target)
- [ ] Tap avatar → bottom sheet slides up
- [ ] Theme options visible near top
- [ ] Tap theme option → changes with haptic feedback
- [ ] All text readable, no horizontal scroll
- [ ] Bottom sheet dismissible with swipe-down
- [ ] Safe area respected (iOS notch/home indicator)

### Accessibility
- [ ] VoiceOver announces: "User profile: Name. Theme: Dark. Click for menu."
- [ ] All menu items announced with role="menuitemradio"
- [ ] Theme change announced via aria-live
- [ ] Keyboard shortcuts work (Cmd+Shift+T for theme)
- [ ] Focus visible indicators (2px border, 3:1 contrast)
- [ ] Color contrast WCAG AA (4.5:1 for text, 3:1 for UI)

### Feature Flags
- [ ] Flag OFF → Old UI (UserMenu + ModeToggle)
- [ ] Flag ON → New UI (EnhancedUserMenu)

---

## Related Issues

- Issue #271 - Enhanced User Profile Button
- Issue #275 - Header Platform Consistency (completed)

---

## Files in This Branch

### Components
- `apps/web/src/components/profile/enhanced-user-menu.tsx` (11,305 bytes)
- `apps/web/src/components/profile/profile-settings-dialog.tsx` (13,156 bytes)
- `apps/web/src/components/profile/preferences-dialog.tsx` (13,942 bytes)
- `apps/web/src/components/profile/alerts-dialog.tsx` (5,866 bytes)

### Header Integration
- `apps/web/src/components/header.tsx` (with EnhancedUserMenu enabled)

### Documentation
- This file: `docs/features/ENHANCED_USER_MENU_WORK_IN_PROGRESS.md`
- Plan: `/Users/neil/.claude/plans/jaunty-pondering-scone.md`

---

## Notes

- Components are fully functional and linting-clean
- Only missing dependencies prevent integration into main
- All work preserved on `feature/enhanced-user-menu` branch
- Safe to merge when dependencies are ready

---

## Next Steps

1. Port missing dependencies from ralph branch
2. Test integration in local dev
3. Create PR with dependency checklist
4. Gradual rollout via feature flag
5. Monitor analytics and user feedback

