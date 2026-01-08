# PlayerARC UX Components Testing Guide

This guide provides step-by-step instructions for enabling, testing, and verifying all UX components in the PlayerARC Comprehensive UX Improvement Plan.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Feature Flag Configuration](#feature-flag-configuration)
3. [Phase 0: Testing Infrastructure](#phase-0-testing-infrastructure)
4. [Phase 1: Navigation Foundation](#phase-1-navigation-foundation)
5. [Phase 2: Data Display Components](#phase-2-data-display-components)
6. [Phase 3: Forms & Inputs](#phase-3-forms--inputs)
7. [Phase 4: Interactions & Feedback](#phase-4-interactions--feedback)
8. [Phase 5: Polish & Platform Features](#phase-5-polish--platform-features)
9. [Testing Checklist](#testing-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Development Environment Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/NB-PDP-Testing/PDP.git
   cd PDP
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   - Local: http://localhost:3000
   - Mobile testing: Use your local IP (e.g., http://192.168.1.x:3000)

### Required Accounts

- PostHog account with admin access (for feature flag management)
- Test user accounts for each role: Admin, Coach, Parent, Player

### Testing Devices

- Desktop browser (Chrome, Firefox, Safari)
- Mobile device or emulator (iOS Safari, Android Chrome)
- Tablet device or emulator

---

## Feature Flag Configuration

### Accessing PostHog Feature Flags

1. Log in to PostHog at https://app.posthog.com
2. Navigate to **Feature Flags** in the left sidebar
3. Select the appropriate project (PDP/PlayerARC)

### Available Feature Flags

| Flag Name | Phase | Description | Default |
|-----------|-------|-------------|---------|
| `ux_bottom_nav` | 1 | Mobile bottom navigation | Off |
| `ux_admin_nav_sidebar` | 1 | Grouped admin sidebar | Off |
| `ux_admin_nav_bottomsheet` | 1 | Bottom sheet admin nav | Off |
| `ux_admin_nav_tabs` | 1 | Tabs admin nav | Off |
| `ux_touch_targets_44px` | 1 | 44px touch targets | Off |
| `ux_app_shell` | 1 | AppShell responsive layout | Off |
| `ux_hover_actions` | 1 | Desktop hover-reveal actions | Off |
| `ux_responsive_inputs` | 1 | Responsive input/select sizing | Off |
| `ux_mobile_cards` | 2 | Card-based mobile display | Off |
| `ux_skeleton_loaders` | 2 | Skeleton loading states | Off |
| `ux_responsive_forms` | 3 | Mobile-optimized forms | Off |
| `ux_command_menu` | 4 | Command palette (⌘K) | Off |
| `ux_responsive_dialogs` | 4 | Responsive dialogs | Off |
| `ux_keyboard_shortcuts_overlay` | 5 | Keyboard shortcuts help | Off |
| `ux_density_toggle` | 5 | Density toggle | Off |
| `ux_offline_indicator` | 5 | Offline status indicator | Off |

### Creating/Enabling Feature Flags

1. Click **New feature flag** or edit existing flag
2. Set flag key (e.g., `ux_bottom_nav`)
3. Under **Release conditions**, set to:
   - **100%** for all users testing
   - **Specific users** for limited testing
   - **User property** for role-based testing
4. Click **Save**

### Testing Feature Flag Status in Code

```typescript
// In any component
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";

function MyComponent() {
  const flags = useUXFeatureFlags();
  
  console.log("Feature flags:", flags);
  // {
  //   useBottomNav: boolean,
  //   useAppShell: boolean,
  //   useHoverActions: boolean,
  //   ...
  // }
}
```

---

## Phase 0: Testing Infrastructure

### UX Mockups Demo Page

**Location:** `/demo/ux-mockups`

**How to Test:**

1. Navigate to `/demo/ux-mockups` in your browser
2. Review all 22 interactive mockups:
   - Role-specific bottom navigation
   - Touch target sizes
   - Mobile player cards with swipe
   - Admin navigation options (3 variants)
   - And more...

3. **Preference Voting:**
   - Each mockup has a voting mechanism
   - Click "Prefer this" or "Prefer alternative"
   - Votes are tracked in analytics

**Verification Checklist:**
- [ ] All 22 mockups render correctly
- [ ] Voting buttons are functional
- [ ] Mobile view displays properly
- [ ] Desktop view displays properly

---

## Phase 1: Navigation Foundation

### 1.1 Bottom Navigation

**Enable:** Set `ux_bottom_nav` to `true` in PostHog

**Location:** Mobile views of authenticated pages

**Component:** `apps/web/src/components/layout/bottom-nav.tsx`

**How to Test:**

1. Enable the feature flag
2. Open the app on a mobile device (< 768px width)
3. Log in as any user role

**Verification:**
- [ ] Bottom nav appears at bottom of screen on mobile
- [ ] Shows 5 navigation items maximum
- [ ] Active item shows label, inactive items show icon only
- [ ] Tapping navigates to correct page
- [ ] Bottom nav hides on desktop view
- [ ] Touch targets are 44px minimum

**Test Cases:**
```
Scenario: Admin user sees admin-specific nav items
Given: User is logged in as admin
When: They view the admin dashboard on mobile
Then: Bottom nav shows: Home, Players, Add (+), Teams, Settings

Scenario: Coach user sees coach-specific nav items
Given: User is logged in as coach
When: They view the coach dashboard on mobile
Then: Bottom nav shows: Home, Players, Assess (+), Reports, Profile
```

### 1.2 Admin Sidebar

**Enable:** Set `ux_admin_nav_sidebar` to `true` in PostHog

**Location:** Admin panel on desktop

**Component:** `apps/web/src/components/layout/admin-sidebar.tsx`

**How to Test:**

1. Enable the feature flag
2. Log in as an admin user
3. Navigate to `/orgs/[orgId]/admin`
4. View on desktop (> 1024px width)

**Verification:**
- [ ] Sidebar appears on left side
- [ ] Navigation items are grouped by category
- [ ] Current page is highlighted
- [ ] Collapsible groups work
- [ ] Hover states show on items
- [ ] Mobile view shows hamburger menu instead

### 1.3 AppShell

**Enable:** Set `ux_app_shell` to `true` in PostHog

**Location:** All authenticated pages

**Component:** `apps/web/src/components/layout/app-shell.tsx`

**How to Test:**

1. Enable the feature flag
2. Log in as any user
3. Test at different breakpoints:
   - Mobile: < 640px
   - Tablet: 640-1024px
   - Desktop: > 1024px

**Verification:**
- [ ] Mobile: Shows bottom nav + minimal header
- [ ] Mobile: Hamburger opens sheet with sidebar content
- [ ] Tablet: Collapsible sidebar
- [ ] Desktop: Full sidebar always visible
- [ ] Header adapts content per breakpoint
- [ ] Back button appears on nested pages
- [ ] Search appears where configured

### 1.4 Hover Actions

**Enable:** Set `ux_hover_actions` to `true` in PostHog

**Location:** Table rows, cards on desktop

**Component:** `apps/web/src/components/ui/hover-actions.tsx`

**How to Test:**

1. Enable the feature flag
2. Navigate to any page with data lists (e.g., admin players)
3. Test on desktop

**Verification:**
- [ ] Hovering over row reveals action buttons
- [ ] Actions fade in smoothly
- [ ] Actions fade out when hover leaves
- [ ] On mobile, actions are always visible (or use alternative pattern)
- [ ] Actions are clickable and functional

### 1.5 Responsive Inputs

**Enable:** Set `ux_responsive_inputs` to `true` in PostHog

**Components:**
- `apps/web/src/components/ui/input.tsx`
- `apps/web/src/components/ui/select.tsx`

**How to Test:**

1. Enable the feature flag
2. Navigate to any form page
3. Test at different breakpoints

**Verification:**
- [ ] Mobile: Inputs are 48px height (comfortable touch)
- [ ] Tablet: Inputs are 44px height
- [ ] Desktop: Inputs are 40px height
- [ ] Select triggers follow same responsive sizing
- [ ] All inputs remain functional

---

## Phase 2: Data Display Components

### 2.1 Mobile Cards

**Enable:** Set `ux_mobile_cards` to `true` in PostHog

**Location:** Data lists on mobile

**Component:** `apps/web/src/components/data-display/responsive-data-view.tsx`

**How to Test:**

1. Enable the feature flag
2. Navigate to admin players list on mobile
3. Verify card view displays

**Verification:**
- [ ] Mobile shows card layout instead of table
- [ ] Cards show key information (name, avatar, status)
- [ ] Tapping card navigates to detail
- [ ] Desktop still shows table

### 2.2 Swipeable Cards

**Component:** `apps/web/src/components/data-display/swipeable-card.tsx`

**How to Test:**

1. On mobile device
2. Swipe left on a card
3. Swipe right on a card

**Verification:**
- [ ] Swipe left reveals delete/secondary action
- [ ] Swipe right reveals edit/primary action
- [ ] Swipe animation is smooth
- [ ] Actions are functional

### 2.3 Skeleton Loaders

**Enable:** Set `ux_skeleton_loaders` to `true` in PostHog

**How to Test:**

1. Enable feature flag
2. Navigate to any data-fetching page
3. Use network throttling (DevTools > Network > Slow 3G)
4. Refresh the page

**Verification:**
- [ ] Skeleton shapes match final content layout
- [ ] No layout shift when content loads
- [ ] Smooth fade transition to content
- [ ] Works on both mobile and desktop

---

## Phase 3: Forms & Inputs

### 3.1 Responsive Forms

**Enable:** Set `ux_responsive_forms` to `true` in PostHog

**Components:**
- `apps/web/src/components/forms/responsive-form.tsx`
- `apps/web/src/components/forms/responsive-input.tsx`

**How to Test:**

1. Enable feature flag
2. Navigate to any form (e.g., create player, edit profile)
3. Test on mobile and desktop

**Verification Mobile:**
- [ ] Input heights are 48px
- [ ] Labels are appropriately sized
- [ ] Submit button is sticky at bottom
- [ ] Adequate spacing between fields
- [ ] Numeric inputs show number keyboard

**Verification Desktop:**
- [ ] Input heights are comfortable (40px)
- [ ] Side-by-side fields on wide screens
- [ ] Inline validation shows as you type
- [ ] `⌘S` saves the form
- [ ] `Esc` cancels/closes form

---

## Phase 4: Interactions & Feedback

### 4.1 Command Menu

**Enable:** Set `ux_command_menu` to `true` in PostHog

**Component:** `apps/web/src/components/interactions/command-menu.tsx`

**How to Test:**

1. Enable feature flag
2. On desktop, press `⌘K` (Mac) or `Ctrl+K` (Windows)
3. On mobile, tap search icon in header

**Verification:**
- [ ] Command menu opens with animation
- [ ] Search input is focused
- [ ] Typing filters results
- [ ] Arrow keys navigate results
- [ ] Enter selects current result
- [ ] Escape closes menu
- [ ] Actions are functional (navigation, create, etc.)

**Test Commands:**
```
Type "play" → Should show "Go to Players", "Create Player"
Type "set" → Should show "Settings", "Team Settings"
Type "/" → Should show available slash commands
```

### 4.2 Responsive Dialogs

**Enable:** Set `ux_responsive_dialogs` to `true` in PostHog

**Component:** `apps/web/src/components/interactions/responsive-dialog.tsx`

**How to Test:**

1. Enable feature flag
2. Trigger any dialog (delete confirmation, edit modal)
3. Test on mobile and desktop

**Verification Mobile:**
- [ ] Dialog appears as bottom sheet
- [ ] Sheet slides up from bottom
- [ ] Can drag down to dismiss
- [ ] Full width of screen
- [ ] Large touch targets on buttons

**Verification Desktop:**
- [ ] Dialog appears as centered modal
- [ ] Standard modal appearance
- [ ] Click outside to dismiss
- [ ] Escape key closes
- [ ] Focus trapped inside modal

---

## Phase 5: Polish & Platform Features

### 5.1 Keyboard Shortcuts Overlay

**Enable:** Set `ux_keyboard_shortcuts_overlay` to `true` in PostHog

**Component:** `apps/web/src/components/polish/keyboard-shortcuts-overlay.tsx`

**How to Test:**

1. Enable feature flag
2. On desktop, press `?` key
3. Review shortcuts list

**Verification:**
- [ ] Overlay appears with all shortcuts
- [ ] Organized by category
- [ ] Press `?` again or `Esc` to close
- [ ] All listed shortcuts are functional

**Expected Shortcuts:**
```
Navigation:
  g h → Go to Home
  g p → Go to Players
  g t → Go to Teams

Actions:
  n → New (context-aware)
  ⌘K → Command palette
  ⌘S → Save (in forms)

View:
  ⌘D → Toggle density
  ? → Show shortcuts
```

### 5.2 Density Toggle

**Enable:** Set `ux_density_toggle` to `true` in PostHog

**Component:** `apps/web/src/components/polish/density-toggle.tsx`

**How to Test:**

1. Enable feature flag
2. Look for density toggle in header/settings
3. Or press `⌘D` (if keyboard shortcuts enabled)

**Verification:**
- [ ] Toggle shows current density level
- [ ] Three options: Compact, Comfortable, Spacious
- [ ] Changing density updates UI immediately
- [ ] Preference persists across sessions
- [ ] Table rows change height
- [ ] Card padding changes
- [ ] Form spacing changes

### 5.3 Offline Indicator

**Enable:** Set `ux_offline_indicator` to `true` in PostHog

**Component:** `apps/web/src/components/polish/offline-indicator.tsx`

**How to Test:**

1. Enable feature flag
2. Open browser DevTools
3. Go to Network tab
4. Select "Offline" preset
5. Observe the indicator

**Verification:**
- [ ] Banner appears when offline
- [ ] Shows "You're offline" message
- [ ] Positioned consistently (top or bottom)
- [ ] Disappears when back online
- [ ] Smooth transition animations

---

## Testing Checklist

### Per-Component Testing

Before marking any component as verified, complete these checks:

#### Responsive Testing
- [ ] iPhone SE (375px width)
- [ ] iPhone 14 Pro (393px width)
- [ ] iPad (768px width)
- [ ] Desktop (1280px+ width)

#### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Focus states are visible
- [ ] Color contrast passes WCAG AA

#### Performance Testing
- [ ] Component renders under 100ms
- [ ] No layout shift on load
- [ ] Animations run at 60fps
- [ ] Bundle size is reasonable

#### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Full System Testing

After enabling multiple features:

- [ ] Features don't conflict with each other
- [ ] Feature flags can be toggled independently
- [ ] Performance remains acceptable
- [ ] No console errors
- [ ] Analytics events fire correctly

---

## Troubleshooting

### Common Issues

#### Feature flag not working

1. **Clear browser cache and cookies**
2. **Check PostHog connection:**
   ```typescript
   import { useAnalytics } from "@/lib/analytics";
   const { isFeatureEnabled } = useAnalytics();
   console.log("PostHog connected:", !!window.posthog);
   ```
3. **Verify flag is enabled for your user/group**
4. **Check browser console for PostHog errors**

#### Component not rendering

1. **Check import path is correct:**
   ```typescript
   // Correct
   import { BottomNav } from "@/components/layout";
   
   // Verify file exists
   // apps/web/src/components/layout/bottom-nav.tsx
   ```

2. **Verify component is exported from index:**
   ```typescript
   // apps/web/src/components/layout/index.ts
   export { BottomNav } from "./bottom-nav";
   ```

3. **Check for TypeScript errors:**
   ```bash
   cd apps/web && npx tsc --noEmit
   ```

#### Mobile testing issues

1. **Use real device when possible** - Emulators miss touch nuances
2. **Connect to same network** as dev server
3. **Use ngrok for remote testing:**
   ```bash
   npx ngrok http 3000
   ```

#### Styles not applying

1. **Check Tailwind classes are valid**
2. **Verify responsive breakpoints:**
   ```
   sm: 640px
   md: 768px
   lg: 1024px
   xl: 1280px
   ```
3. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

### Getting Help

- Check existing GitHub issues: https://github.com/NB-PDP-Testing/PDP/issues
- Review UX Implementation Plan: `docs/ux/UX_IMPLEMENTATION_PLAN.md`
- Contact the development team via Slack

---

## Analytics Tracking

All UX features track usage analytics. Key events to monitor:

| Event | Description |
|-------|-------------|
| `ux_bottom_nav_used` | User tapped bottom nav item |
| `ux_app_shell_nav_used` | User navigated via AppShell |
| `ux_hover_action_used` | User clicked hover action |
| `ux_command_menu_opened` | User opened command palette |
| `ux_command_menu_action` | User executed command |
| `ux_keyboard_shortcut_used` | User used keyboard shortcut |
| `ux_density_changed` | User changed density setting |
| `ux_offline_status_changed` | User went offline/online |

Access analytics in PostHog dashboard under **Events**.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-08 | Initial guide covering Phases 0-5 |