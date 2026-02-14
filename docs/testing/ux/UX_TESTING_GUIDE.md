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
9. [Phase 6: Skeleton Loaders](#phase-6-skeleton-loaders)
10. [Phase 7: Table Migration](#phase-7-table-migration)
11. [Phase 8: Touch Targets](#phase-8-touch-targets)
12. [Phase 9: AppShell & Unified Nav](#phase-9-appshell--unified-nav)
13. [Phase 10: Context Menu & Interactions](#phase-10-context-menu--interactions)
14. [Phase 11: PWA & Offline](#phase-11-pwa--offline)
15. [Phase 12: Accessibility](#phase-12-accessibility)
16. [Phase 13: Performance](#phase-13-performance)
17. [Testing Checklist](#testing-checklist)
18. [Troubleshooting](#troubleshooting)

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
| `ux_pwa_install_prompt` | 5 | PWA install prompt | Off |
| `ux_resizable_sidebar` | 5 | Resizable sidebar | Off |
| `ux_pinned_favorites` | 5 | Pinned favorites | Off |
| `ux_recent_items` | 5 | Recent items history | Off |
| `ux_enhanced_tables` | 7 | Enhanced table features | Off |
| `ux_swipe_cards` | 7 | Swipe actions on cards | Off |
| `ux_pull_to_refresh` | 7 | Pull to refresh on lists | Off |
| `ux_context_menu` | 10 | Context menus | Off |
| `ux_action_sheet` | 10 | Action sheets | Off |
| `ux_inline_edit` | 10 | Inline editing | Off |
| `ux_service_worker` | 11 | Service worker registration | Off |
| `ux_offline_support` | 11 | Offline support features | Off |
| `ux_pwa_update_prompt` | 11 | PWA update prompt | Off |
| `ux_skip_links` | 12 | Skip to main content links | Off |
| `ux_focus_visible` | 12 | Enhanced focus indicators | Off |
| `ux_reduced_motion` | 12 | Reduced motion support | Off |
| `ux_announcer` | 12 | Screen reader announcements | Off |
| `ux_lazy_components` | 13 | Lazy loading components | Off |
| `ux_web_vitals` | 13 | Web Vitals monitoring | Off |
| `ux_deferred_render` | 13 | Deferred rendering | Off |
| `ux_resource_hints` | 13 | Resource hints (preconnect) | Off |

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

## Phase 6: Skeleton Loaders

**Status:** ✅ Implemented

### 6.1 Skeleton Components

**Components:**
- `apps/web/src/components/loading/table-skeleton.tsx`
- `apps/web/src/components/loading/card-skeleton.tsx`
- `apps/web/src/components/loading/list-skeleton.tsx`
- `apps/web/src/components/loading/form-skeleton.tsx`
- `apps/web/src/components/loading/page-skeleton.tsx`

**How to Test:**

1. Navigate to admin pages
2. Use DevTools Network throttling (Slow 3G)
3. Refresh the page

**Verification:**
- [ ] Admin dashboard shows stat card skeletons
- [ ] Player list shows table/card skeletons
- [ ] Team list shows card skeletons
- [ ] Forms show field skeletons
- [ ] No layout shift when content loads
- [ ] Smooth transition from skeleton to content

**Test Each Variant:**
```
TableSkeleton: /admin/players (desktop)
CardGridSkeleton: /admin/players (mobile)
StatGridSkeleton: /admin (dashboard)
FormSkeleton: /admin/players/new
PageSkeleton: Any page refresh
```

---

## Phase 7: Table Migration

**Status:** ✅ Mostly Complete (90%)

### 7.1 Enhanced Tables

**Enable:** Set `ux_enhanced_tables` to `true` in PostHog

**Component:** `apps/web/src/components/data-display/data-table-enhanced.tsx`

**How to Test:**

1. Enable feature flag
2. Navigate to admin players list on desktop
3. Test enhanced features

**Verification:**
- [ ] Column visibility toggle works (hide/show columns)
- [ ] Bulk selection with checkboxes works
- [ ] Bulk delete action works
- [ ] CSV export functionality works
- [ ] Sorting by columns works
- [ ] Row hover states show

### 7.2 Swipeable Cards

**Enable:** Set `ux_swipe_cards` to `true` in PostHog

**Component:** `apps/web/src/components/data-display/swipeable-card.tsx`

**How to Test:**

1. Enable feature flag
2. Navigate to player list on mobile
3. Swipe cards left and right

**Verification:**
- [ ] Swipe left reveals delete action
- [ ] Swipe right reveals edit action
- [ ] Swipe animation is smooth (60fps)
- [ ] Swipe threshold feels natural (30% of width)
- [ ] Actions execute correctly

### 7.3 Pull to Refresh

**Enable:** Set `ux_pull_to_refresh` to `true` in PostHog

**Component:** `apps/web/src/components/data-display/data-card-list.tsx`

**How to Test:**

1. Enable feature flag
2. Navigate to any list page on mobile
3. Pull down on the list

**Verification:**
- [ ] Pull gesture is detected
- [ ] Refresh indicator appears
- [ ] Data refreshes after release
- [ ] Indicator disappears after refresh
- [ ] Works with touch events on mobile

---

## Phase 8: Touch Targets

**Status:** ✅ Complete

### 8.1 Base Component Updates

**Components Updated:**
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/input.tsx`
- `apps/web/src/components/ui/select.tsx`
- `apps/web/src/components/ui/checkbox.tsx`
- `apps/web/src/components/ui/radio-group.tsx`
- `apps/web/src/components/ui/switch.tsx`

**How to Test:**

1. Open DevTools
2. Enable device toolbar with touch simulation
3. Navigate to forms and check element sizes

**Verification:**
- [ ] Buttons are 44px+ on mobile, 36px on desktop
- [ ] Inputs are 48px on mobile, 40px on desktop
- [ ] Checkboxes are 20px on mobile, 16px on desktop
- [ ] Radio buttons are 20px on mobile, 16px on desktop
- [ ] Switches are 24px on mobile, 18px on desktop
- [ ] All touch targets are easily tappable

**Measurement Test:**
```javascript
// In browser console on mobile view
document.querySelectorAll('button').forEach(btn => {
  const rect = btn.getBoundingClientRect();
  console.log(`Button: ${rect.height}px height`);
  if (rect.height < 44) console.warn('Touch target too small!');
});
```

---

## Phase 9: AppShell & Unified Nav

**Status:** ✅ Complete

### 9.1 Role-Specific Sidebars

**Components:**
- `apps/web/src/components/layout/admin-sidebar.tsx`
- `apps/web/src/components/layout/coach-sidebar.tsx`
- `apps/web/src/components/layout/parent-sidebar.tsx`

**How to Test:**

1. Log in as each role (Admin, Coach, Parent)
2. View on desktop (>1024px)
3. Check sidebar navigation groups

**Verification Admin:**
- [ ] Shows 4 groups: People, Teams & Access, Data & Import, Settings
- [ ] All 16 items accessible
- [ ] Current page highlighted
- [ ] Groups collapsible

**Verification Coach:**
- [ ] Shows 3 groups: Players, Performance, Account
- [ ] Navigation items match coach role
- [ ] Theme colors applied

**Verification Parent:**
- [ ] Shows 3 groups: Children, Updates, Account
- [ ] Navigation items match parent role
- [ ] Theme colors applied

### 9.2 Mobile Navigation

**How to Test:**

1. View any role dashboard on mobile (<768px)
2. Check bottom nav and hamburger menu

**Verification:**
- [ ] Bottom nav shows role-appropriate items
- [ ] Hamburger opens full navigation sheet
- [ ] Mobile nav mirrors sidebar structure
- [ ] Smooth transitions between views

---

## Phase 10: Context Menu & Interactions

**Status:** ✅ Complete

### 10.1 Context Menu

**Enable:** Set `ux_context_menu` to `true` in PostHog

**Component:** `apps/web/src/components/interactions/context-menu.tsx`

**Hook:** `apps/web/src/hooks/use-long-press.ts`

**How to Test Desktop:**

1. Enable feature flag
2. Navigate to player list
3. Right-click on a player card/row

**How to Test Mobile:**

1. Enable feature flag
2. Navigate to player list on mobile
3. Long-press on a player card (hold 500ms+)

**Verification Desktop:**
- [ ] Right-click opens dropdown menu
- [ ] Menu positioned near cursor
- [ ] Actions are functional
- [ ] Click outside closes menu
- [ ] Escape closes menu

**Verification Mobile:**
- [ ] Long-press triggers after 500ms
- [ ] Bottom sheet appears with actions
- [ ] Haptic feedback (if supported)
- [ ] Swipe down dismisses sheet
- [ ] Actions execute correctly

**Test Cases:**
```
Scenario: Delete via context menu
Given: User right-clicks on player card
When: They select "Delete" from context menu
Then: Confirmation dialog appears
And: Player is deleted after confirmation
```

### 10.2 Action Sheet

**Enable:** Set `ux_action_sheet` to `true` in PostHog

**Component:** `apps/web/src/components/interactions/action-sheet.tsx`

**How to Test:**

1. Enable feature flag
2. Click "More actions" (⋮) button on any item
3. Test on both mobile and desktop

**Verification Mobile:**
- [ ] Opens as bottom sheet
- [ ] Cancel button at bottom
- [ ] Large touch targets
- [ ] Swipe down to dismiss

**Verification Desktop:**
- [ ] Opens as dropdown menu
- [ ] Positioned below trigger
- [ ] Keyboard accessible
- [ ] Arrow keys navigate options

### 10.3 Inline Edit

**Enable:** Set `ux_inline_edit` to `true` in PostHog

**Component:** `apps/web/src/components/interactions/inline-edit.tsx`

**How to Test Desktop:**

1. Enable feature flag
2. Double-click on an editable field
3. Edit and save/cancel

**How to Test Mobile:**

1. Enable feature flag
2. Tap on an editable field
3. Edit in drawer and save/cancel

**Verification Desktop:**
- [ ] Double-click activates edit mode
- [ ] Input appears inline
- [ ] Enter saves, Escape cancels
- [ ] Focus trapped in edit field
- [ ] Visual indicator of edit mode

**Verification Mobile:**
- [ ] Tap opens edit drawer
- [ ] Full-screen editor on mobile
- [ ] Save/Cancel buttons prominent
- [ ] Validation shown in drawer

---

## Phase 11: PWA & Offline

**Status:** ✅ Complete

### 11.1 PWA Installation

**Files:**
- `apps/web/public/manifest.json`
- `apps/web/public/sw.js`

**How to Test:**

1. Open app in Chrome on desktop
2. Look for install icon in address bar
3. Or open DevTools > Application > Manifest

**Verification:**
- [ ] Manifest loads correctly
- [ ] App name shows as "PlayerARC"
- [ ] Theme color matches branding
- [ ] Icons display at all sizes
- [ ] Install prompt appears (after multiple visits)

**Mobile Installation:**
1. Open app in Safari (iOS) or Chrome (Android)
2. "Add to Home Screen" option available
3. App icon appears on home screen
4. Opens in standalone mode (no browser chrome)

### 11.2 Service Worker

**Enable:** Set `ux_service_worker` to `true` in PostHog

**Component:** `apps/web/src/hooks/use-service-worker.ts`

**How to Test:**

1. Enable feature flag
2. Open DevTools > Application > Service Workers
3. Verify registration

**Verification:**
- [ ] Service worker registered
- [ ] Status shows "activated and running"
- [ ] Cache storage populated
- [ ] "Offline Ready" toast appears

### 11.3 Offline Support

**Enable:** Set `ux_offline_support` to `true` in PostHog

**Page:** `apps/web/src/app/offline/page.tsx`

**How to Test:**

1. Enable feature flag
2. Load app and navigate to several pages
3. Go offline (DevTools > Network > Offline)
4. Try navigating to cached and uncached pages

**Verification:**
- [ ] Cached pages load offline
- [ ] Uncached pages show offline page
- [ ] Offline page has retry button
- [ ] Reconnecting shows online toast
- [ ] Data syncs when back online

### 11.4 Update Prompt

**Enable:** Set `ux_pwa_update_prompt` to `true` in PostHog

**Component:** `apps/web/src/components/pwa/pwa-update-prompt.tsx`

**How to Test:**

1. Enable feature flag
2. Deploy a new version
3. Open existing tab with old version

**Verification:**
- [ ] Toast appears: "Update available"
- [ ] "Refresh" button updates app
- [ ] "Later" dismisses toast
- [ ] App updates after refresh

---

## Phase 12: Accessibility

**Status:** ✅ Complete

### 12.1 Skip Links

**Enable:** Set `ux_skip_links` to `true` in PostHog

**Component:** `apps/web/src/components/accessibility/skip-link.tsx`

**How to Test:**

1. Enable feature flag
2. Load any page
3. Press Tab immediately after load

**Verification:**
- [ ] "Skip to main content" link appears
- [ ] Link is first focusable element
- [ ] Pressing Enter skips to main content
- [ ] Focus moves to main content area
- [ ] Link hidden when not focused

### 12.2 Screen Reader Announcements

**Enable:** Set `ux_announcer` to `true` in PostHog

**Component:** `apps/web/src/components/accessibility/live-region.tsx`

**How to Test:**

1. Enable feature flag
2. Enable screen reader (VoiceOver, NVDA)
3. Perform actions that trigger announcements

**Verification:**
- [ ] Form saves announce "Changes saved"
- [ ] Errors announce error message
- [ ] Navigation announces page changes
- [ ] Loading states announced
- [ ] Announcements not visually disruptive

**Screen Reader Testing:**
```
macOS: Enable VoiceOver (⌘+F5)
Windows: Download NVDA (free)
Chrome: ChromeVox extension
```

### 12.3 Focus Management

**Enable:** Set `ux_focus_visible` to `true` in PostHog

**Component:** `apps/web/src/components/accessibility/focus-visible.tsx`

**How to Test:**

1. Enable feature flag
2. Navigate using only keyboard (Tab, Shift+Tab)
3. Open modals/dialogs

**Verification:**
- [ ] Focus ring visible on all interactive elements
- [ ] Focus order is logical (top to bottom, left to right)
- [ ] Modal focus is trapped inside
- [ ] Focus returns to trigger after modal closes
- [ ] No focus traps in regular content

### 12.4 Reduced Motion

**Enable:** Set `ux_reduced_motion` to `true` in PostHog

**Hook:** `apps/web/src/hooks/use-reduced-motion.ts`

**How to Test:**

1. Enable feature flag
2. Enable reduced motion in OS settings:
   - macOS: System Preferences > Accessibility > Display > Reduce motion
   - Windows: Settings > Ease of Access > Display > Show animations
3. Navigate through app

**Verification:**
- [ ] Animations are reduced or removed
- [ ] Page transitions instant
- [ ] No bouncing/sliding effects
- [ ] Loading spinners still work
- [ ] Essential motion preserved

### 12.5 Keyboard Navigation

**How to Test:**

1. Put away your mouse
2. Navigate entire app using only keyboard

**Verification:**
- [ ] Tab navigates forward through elements
- [ ] Shift+Tab navigates backward
- [ ] Enter activates buttons/links
- [ ] Space toggles checkboxes/switches
- [ ] Arrow keys work in dropdowns/menus
- [ ] Escape closes modals/menus
- [ ] All functionality accessible via keyboard

---

## Phase 13: Performance

**Status:** ✅ Complete

### 13.1 Lazy Loading Components

**Enable:** Set `ux_lazy_components` to `true` in PostHog

**Components:**
- `apps/web/src/components/performance/lazy-component.tsx`
- `apps/web/src/lib/performance.ts`

**How to Test:**

1. Enable feature flag
2. Open DevTools > Network
3. Navigate to page with lazy components
4. Scroll down to see components load

**Verification:**
- [ ] Components load only when in viewport
- [ ] Placeholder shown while loading
- [ ] No layout shift on load
- [ ] Preloading works on hover

### 13.2 Web Vitals Monitoring

**Enable:** Set `ux_web_vitals` to `true` in PostHog

**Hook:** `apps/web/src/hooks/use-performance.ts`

**How to Test:**

1. Enable feature flag
2. Open DevTools > Performance
3. Run Lighthouse audit
4. Check PostHog for Web Vitals events

**Verification:**
- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] FID (First Input Delay) < 100ms
- [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] FCP (First Contentful Paint) < 1.8s
- [ ] TTFB (Time to First Byte) < 800ms

**Lighthouse Testing:**
```bash
# Run Lighthouse CLI
npx lighthouse http://localhost:3000 --view

# Or use Chrome DevTools > Lighthouse tab
```

### 13.3 Deferred Rendering

**Enable:** Set `ux_deferred_render` to `true` in PostHog

**Component:** `apps/web/src/components/performance/lazy-component.tsx`

**How to Test:**

1. Enable feature flag
2. Navigate to dashboard page
3. Check rendering order in DevTools Performance

**Verification:**
- [ ] Critical content renders first
- [ ] Non-critical widgets render during idle
- [ ] No blocking of user interaction
- [ ] Smooth progressive loading

### 13.4 Resource Hints

**Enable:** Set `ux_resource_hints` to `true` in PostHog

**Utilities:** `apps/web/src/lib/performance.ts`

**How to Test:**

1. Enable feature flag
2. Check `<head>` for preconnect/prefetch links
3. Verify in Network tab

**Verification:**
- [ ] API domain preconnected
- [ ] CDN domain dns-prefetched
- [ ] Key routes prefetched
- [ ] Faster subsequent navigations

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

### Navigation Events (Phases 1, 9)
| Event | Description |
|-------|-------------|
| `ux_bottom_nav_used` | User tapped bottom nav item |
| `ux_app_shell_nav_used` | User navigated via AppShell |
| `ux_hover_action_used` | User clicked hover action |

### Data Display Events (Phases 2, 6, 7)
| Event | Description |
|-------|-------------|
| `ux_swipe_action_used` | User swiped on a card |
| `ux_pull_to_refresh_used` | User pulled to refresh |
| `ux_mobile_card_tapped` | User tapped a mobile card |

### Form Events (Phase 3)
| Event | Description |
|-------|-------------|
| `ux_form_shortcut_used` | User used form keyboard shortcut |
| `ux_sticky_submit_used` | User tapped sticky submit button |

### Interaction Events (Phases 4, 10)
| Event | Description |
|-------|-------------|
| `ux_command_menu_opened` | User opened command palette |
| `ux_command_menu_action` | User executed command |
| `ux_keyboard_shortcut_used` | User used keyboard shortcut |
| `ux_context_menu_opened` | User opened context menu |
| `ux_context_menu_action` | User selected context menu action |
| `ux_action_sheet_opened` | User opened action sheet |
| `ux_action_sheet_action` | User selected action sheet action |
| `ux_inline_edit_started` | User started inline edit |
| `ux_inline_edit_saved` | User saved inline edit |
| `ux_inline_edit_cancelled` | User cancelled inline edit |

### Polish Events (Phase 5)
| Event | Description |
|-------|-------------|
| `ux_shortcuts_overlay_opened` | User opened keyboard shortcuts |
| `ux_density_changed` | User changed density setting |
| `ux_offline_status_changed` | User went offline/online |
| `ux_pwa_install_prompted` | PWA install prompt shown |
| `ux_pwa_installed` | User installed PWA |
| `ux_sidebar_resized` | User resized sidebar |
| `ux_favorite_added` | User added favorite |
| `ux_favorite_removed` | User removed favorite |
| `ux_recent_item_clicked` | User clicked recent item |

### PWA Events (Phase 11)
| Event | Description |
|-------|-------------|
| `ux_service_worker_registered` | Service worker registered |
| `ux_service_worker_update_found` | New SW version found |
| `ux_service_worker_update_activated` | SW update activated |
| `ux_offline_page_viewed` | User viewed offline page |
| `ux_cache_hit` | Content served from cache |
| `ux_cache_miss` | Content fetched from network |

### Accessibility Events (Phase 12)
| Event | Description |
|-------|-------------|
| `ux_skip_link_used` | User used skip link |
| `ux_keyboard_navigation_detected` | Keyboard navigation detected |
| `ux_reduced_motion_detected` | Reduced motion preference detected |
| `ux_screen_reader_announcement` | Screen reader announcement made |
| `ux_focus_trap_activated` | Focus trap activated |

### Performance Events (Phase 13)
| Event | Description |
|-------|-------------|
| `ux_web_vitals_reported` | Web Vitals metrics reported |
| `ux_lazy_component_loaded` | Lazy component loaded |
| `ux_long_task_detected` | Long task (>50ms) detected |
| `ux_resource_preloaded` | Resource preloaded |
| `ux_performance_mark` | Custom performance mark |

Access analytics in PostHog dashboard under **Events**.

---

## Automated Testing

### Running Playwright Tests

```bash
# Run all UX-related tests
cd apps/web
npm run test:e2e -- --grep "ux"

# Run specific phase tests
npm run test:e2e -- --grep "navigation"
npm run test:e2e -- --grep "accessibility"
npm run test:e2e -- --grep "performance"
```

### Test File Locations

| Phase | Test File |
|-------|-----------|
| Navigation | `uat/tests/ux/navigation.spec.ts` |
| Data Display | `uat/tests/ux/data-display.spec.ts` |
| Forms | `uat/tests/ux/forms.spec.ts` |
| Interactions | `uat/tests/ux/interactions.spec.ts` |
| Accessibility | `uat/tests/ux/accessibility.spec.ts` |
| Performance | `uat/tests/ux/performance.spec.ts` |

### Lighthouse CI

```bash
# Run Lighthouse CI
npx lighthouse http://localhost:3000 \
  --output=json \
  --output-path=./lighthouse-report.json

# Performance budget checks
npx lighthouse http://localhost:3000 \
  --budget-path=./lighthouse-budget.json
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-08 | Initial guide covering Phases 0-5 |
| 2.0 | 2026-01-08 | Added Phases 6-13 testing procedures |
|     |            | Updated feature flags table with all 36 flags |
|     |            | Added comprehensive analytics tracking |
|     |            | Added automated testing section |
