# PlayerARC Comprehensive UX Improvement Plan

## Overview

Transform PlayerARC into a **responsive, intuitive, clean, light** experience that works beautifully on **both mobile AND desktop**. Mobile-first design approach, but with explicit desktop optimizations to ensure power users have an efficient experience.

---

## Implementation Progress Summary

### Completed Phases ✅

| Phase | Name | Status | Completion |
|-------|------|--------|------------|
| 0 | Testing Infrastructure | ✅ Complete | 100% |
| 1 | Navigation Foundation | ✅ Complete | 100% |
| 2 | Data Display Components | ✅ Complete | 100% |
| 3 | Forms & Inputs | ✅ Complete | 100% |
| 4 | Interactions & Feedback | ✅ Complete | 100% |
| 5 | Polish & Platform Features | ✅ Complete | 100% |
| 6 | Skeleton Loaders | ✅ Complete | 100% |
| 7 | Table Migration | ✅ Mostly Complete | 90% |
| 8 | Touch Targets (Base UI) | ✅ Complete | 100% |
| 9 | AppShell & Unified Nav | ✅ Complete | 100% |
| 10 | Context Menu & Advanced Interactions | ✅ Complete | 100% |

### Not Started Phases 🔴

| Phase | Name | Priority | Effort | Impact |
|-------|------|----------|--------|--------|
| 11 | PWA & Offline | 🟢 Low | 3-5 days | Low |
| 12 | Accessibility Audit | 🔴 High | 3-5 days | Medium |
| 13 | Performance | 🟡 Medium | 3-4 days | Medium |

### Feature Flags Implemented

| Flag | Description | Phase |
|------|-------------|-------|
| `adminNavStyle` | Admin nav style: sidebar/bottomsheet/tabs | 1 |
| `useBottomNav` | Mobile bottom navigation | 1 |
| `ux_skeleton_loaders` | Skeleton loading states | 6 |
| `ux_touch_targets_44px` | 44px touch targets | 8 |
| `ux_command_menu` | Command palette (⌘K) | 4 |
| `ux_responsive_dialogs` | Responsive dialogs | 4 |

---

## Core Principle: Responsive, Not Mobile-Only

| Aspect | Mobile (< 768px) | Tablet (768-1024px) | Desktop (> 1024px) |
|--------|------------------|---------------------|-------------------|
| Navigation | Bottom nav + hamburger | Collapsible sidebar | Full sidebar |
| Data Display | Cards with swipe | Cards or compact table | Full data tables |
| Touch Targets | 44-48px minimum | 40-44px | 36-40px (mouse precision) |
| Information Density | Progressive disclosure | Medium density | High density |
| Interactions | Touch, swipe, tap | Touch + hover | Hover, keyboard, click |

---

## User Decisions

| Decision | Choice |
|----------|--------|
| Starting Point | **Phase 0** - Testing infrastructure first |
| Admin Navigation | Test multiple options (grouped sidebar, bottom sheet, tabs) |
| Bottom Nav Labels | **Active only** - cleaner look |
| First Role Priority | **Admin** - most items to fix |

---

## Current State Assessment

| Area | Mobile | Desktop | Notes |
|------|--------|---------|-------|
| Navigation | 3/10 | 6/10 | Mobile: 16 horizontal items. Desktop: works but fragmented |
| Touch/Click Targets | 3/10 | 7/10 | Mobile too small. Desktop adequate |
| Data Tables | 4/10 | 7/10 | Mobile: overflow. Desktop: functional |
| Loading States | 5/10 | 5/10 | Same issues both platforms |
| Empty States | 7/10 | 7/10 | Component exists, underutilized |
| Forms | 5/10 | 7/10 | Mobile needs larger inputs |
| Keyboard Navigation | N/A | 5/10 | Missing shortcuts, focus states |
| Information Density | 4/10 | 6/10 | Mobile cramped, desktop could show more |
| **Org/Role Switching** | 5/10 | 6/10 | Functional but complex, needs UX improvement |

---

## Org/Role Switching UX Strategy

### Current Implementation Analysis

**Location:** `apps/web/src/components/org-role-switcher.tsx` (650 lines)

**Data Model:**
- Users can belong to multiple organizations
- Each org membership has:
  - Hierarchical role (owner, admin, member) - from Better Auth
  - Functional roles (coach, parent, admin, player) - custom system
- Users switch both org AND role frequently

**Current UX:**
- Popover trigger in header (right side, next to user avatar)
- Command menu pattern with search
- Shows: org name, avatar, roles per org, pending requests
- Accessible via: click only (no keyboard shortcut)

### Industry Best Practices Research

| Product | Pattern | Strengths | PlayerARC Applicability |
|---------|---------|-----------|------------------------|
| **Slack** | Workspace switcher (Cmd+Shift+S) | Fast keyboard access, recent workspaces, visual distinction | High - multi-org users need fast switching |
| **Notion** | Sidebar workspace toggle | Context always visible, smooth transition | Medium - could show current org in sidebar |
| **Linear** | Workspace → Team hierarchy | Clear context, keyboard-first | High - org → role is similar hierarchy |
| **Figma** | Account menu with org list | Simple, familiar pattern | Medium - current approach is similar |
| **Discord** | Server list sidebar | Visual icons, always visible | Low - too gaming-focused for sports |
| **GitHub** | Context menu in header | Dropdown with recent, search | Medium - good for many orgs |

### Design Options (Mockups 18-22)

#### Option A: Enhanced Popover (Evolutionary)
Improve current pattern:
- Add keyboard shortcut (Cmd+Shift+O)
- Show recent orgs/roles at top
- Better visual hierarchy
- Quick role toggle without full menu

| Platform | Implementation |
|----------|---------------|
| Mobile | Full-screen sheet with large touch targets |
| Desktop | Floating popover (current, enhanced) |

#### Option B: Two-Panel Split (Innovative)
Left panel: Organizations, Right panel: Roles for selected org

| Platform | Implementation |
|----------|---------------|
| Mobile | Step-by-step: Select org → Select role |
| Desktop | Side-by-side panels in popover |

#### Option C: Sidebar Dock (Always Visible)
Persistent org/role indicator in sidebar

| Platform | Implementation |
|----------|---------------|
| Mobile | Collapsible at top of mobile nav |
| Desktop | Top of sidebar with expandable details |

#### Option D: Context Strip (Mobile-First)
Horizontal strip showing current context, tap to change

| Platform | Implementation |
|----------|---------------|
| Mobile | Sticky strip below header |
| Desktop | Integrated into breadcrumbs |

### User Account Menu Options

#### Option 1: Simple Dropdown
- User avatar → dropdown with settings, logout
- Separate from org/role switcher

#### Option 2: Rich Profile Card
- Shows current user, current org, current role
- Quick access to profile, settings
- Integrates with org/role switching

#### Option 3: Combined Menu
- Single menu for both user account AND org/role
- Reduces cognitive load
- Risk: might be too complex

### Keyboard Shortcuts (Desktop)

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Shift + O` | Open org/role switcher |
| `Cmd/Ctrl + Shift + 1-9` | Switch to org 1-9 |
| `Cmd/Ctrl + Shift + R` | Cycle through roles in current org |
| `Cmd/Ctrl + ,` | Open settings |
| `Cmd/Ctrl + Shift + L` | Log out |

### Mobile Gestures

| Gesture | Action |
|---------|--------|
| Swipe down from header | Quick org/role picker |
| Long press avatar | Account menu |
| Two-finger swipe | Switch role |

### Responsive Considerations

| Aspect | Mobile | Tablet | Desktop |
|--------|--------|--------|---------|
| **Trigger** | Tap header context | Tap or sidebar | Click, hover, or keyboard |
| **Display** | Full-screen sheet | Half-screen sheet | Floating popover |
| **Layout** | Vertical list, large targets | Two-column optional | Two-panel split |
| **Search** | Fullscreen keyboard | Inline search | Inline search + fuzzy |
| **Recents** | Last 3 shown prominently | Last 5 | Last 10 + keyboard numbers |

### Implementation Priority

1. **Quick Win:** Add keyboard shortcut to existing switcher
2. **Phase 1:** Enhance current popover (Option A)
3. **Phase 2:** Test alternative patterns with users (Options B-D)
4. **Phase 3:** Implement winning pattern based on feedback

### Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to switch org/role | ~5s (multiple clicks) | <2s |
| Keyboard shortcut usage (desktop) | 0% | >30% |
| User confusion reports | Moderate | Minimal |
| Feature discoverability | Low | High |

---

## Phased Implementation Plan

### Phase 0: User Testing Infrastructure ✅ COMPLETE

**Status:** ✅ IMPLEMENTED

**Files Created:**
- `apps/web/src/hooks/use-ux-feature-flags.ts` ✅
- `apps/web/src/components/ux-testing/preference-voting.tsx`
- `apps/web/src/app/demo/ux-mockups/page.tsx` (22 interactive mockups)

**Mockups Include:**
1. Role-specific bottom navigation
2. Touch target sizes
3. Mobile player cards with swipe
4. Admin navigation options (3 variants)
5. Skeleton loading states
6. Actionable empty states
7. Admin players list
8. Coach assessment entry
9. Parent portal child progress
10. Touch-optimized forms
11. Pull-to-refresh & gestures
12. Team management
13. Mobile vs Desktop comparison
14. Desktop data table features
15. Command palette (Cmd+K)
16. Information density options
17. Desktop sidebar navigation
18. **Current Org/Role Switcher Analysis** (NEW)
19. **Org/Role Switcher Options** (4 design variants) (NEW)
20. **User Account Menu Options** (3 design variants) (NEW)
21. **Combined Header Patterns** (desktop layouts) (NEW)
22. **Mobile Org/Role Switching** (+ keyboard shortcuts) (NEW)

**Next:** Share `/demo/ux-mockups` with test users for feedback.

---

### Phase 1: Navigation Foundation ✅ COMPLETE

**Status:** ✅ FULLY IMPLEMENTED

**Implemented:**
- `apps/web/src/components/layout/bottom-nav.tsx` ✅
- `apps/web/src/components/layout/admin-sidebar.tsx` ✅
- `apps/web/src/components/layout/app-shell.tsx` ✅ (NEW)
- `apps/web/src/components/ui/hover-actions.tsx` ✅ (NEW)
- Feature flags for admin navigation styles ✅
- Mobile bottom navigation with role-specific items ✅
- Responsive `input.tsx` (48px mobile → 40px desktop) ✅
- Responsive `select.tsx` trigger sizing ✅
- Button.tsx already had responsive sizes ✅
- Desktop hover actions for table rows and cards ✅

**Feature Flags Added:**
- `ux_app_shell` - New AppShell responsive layout
- `ux_hover_actions` - Desktop hover-reveal actions
- `ux_responsive_inputs` - Responsive input/select sizing

#### 1.1 Responsive Navigation System

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| **Primary Nav** | Bottom nav (5 items) | Collapsible sidebar | Expanded sidebar |
| **Admin Nav** | Bottom sheet or tabs | Collapsible grouped sidebar | Full grouped sidebar |
| **Header** | Minimal (title + menu) | Title + search + actions | Full breadcrumbs + search + actions |

**New File:** `apps/web/src/components/layout/app-shell.tsx`
```tsx
<AppShell>
  {/* Automatically switches based on breakpoint */}
  <DesktopSidebar />      {/* lg: and up */}
  <TabletSidebar />       {/* md: collapsible */}
  <MobileBottomNav />     {/* sm: and down */}

  <Header>
    <Breadcrumbs className="hidden md:flex" />
    <SearchCommand className="hidden sm:flex" />
    <QuickActions />
  </Header>

  <MainContent>{children}</MainContent>
</AppShell>
```

#### 1.2 Touch/Click Target Sizes

**Modify:** `apps/web/src/components/ui/button.tsx`

```tsx
size: {
  // Responsive sizes - larger on mobile, standard on desktop
  default: "h-11 sm:h-10 md:h-9 px-4",     // 44px mobile → 36px desktop
  sm: "h-10 sm:h-9 md:h-8 px-3",           // 40px mobile → 32px desktop
  lg: "h-12 sm:h-11 md:h-10 px-6",         // 48px mobile → 40px desktop

  // Fixed sizes for specific use cases
  touch: "h-11 px-5",                       // Always 44px (mobile-optimized)
  compact: "h-8 px-3",                      // Always 32px (desktop-optimized)
  icon: "size-11 sm:size-10 md:size-9",    // Responsive icon button
}
```

#### 1.3 Desktop Enhancements

**Keyboard Navigation:**
- `Cmd/Ctrl + K` - Global search
- `Cmd/Ctrl + N` - New player/team (context-aware)
- Arrow keys for list navigation
- `Tab` focus management

**Hover States:**
- Table row hover with action buttons reveal
- Card hover with elevation change
- Button hover with scale/color transition

**Information Density:**
- Show more columns on desktop tables
- Inline editing on desktop (modal on mobile)
- Split-pane views for detail pages

---

### Phase 2: Data Display Components ✅ COMPLETE

**Status:** ✅ FULLY IMPLEMENTED

**Components Created:**
- `responsive-data-view.tsx` ✅
- `data-table-enhanced.tsx` ✅
- `data-card-list.tsx` ✅
- `swipeable-card.tsx` ✅

#### 2.1 ResponsiveDataView

**New File:** `apps/web/src/components/data-display/responsive-data-view.tsx`

```tsx
<ResponsiveDataView
  data={players}
  columns={columns}
  // Mobile: Cards with swipe actions
  mobileCard={({ item }) => <PlayerCard player={item} />}
  // Desktop: Full table with sorting, filtering
  desktopTable={{
    sortable: true,
    filterable: true,
    selectable: true,
    columnVisibility: true,  // Toggle columns
    rowActions: true,        // Hover-reveal actions
    stickyHeader: true,
  }}
  // Tablet: Compact table or cards based on preference
  tabletView="compact-table" // or "cards"
/>
```

#### 2.2 Desktop Table Enhancements

| Feature | Implementation |
|---------|---------------|
| Column Resizing | Drag to resize columns |
| Column Visibility | Toggle which columns to show |
| Row Selection | Checkbox selection with bulk actions |
| Inline Editing | Double-click to edit cell |
| Keyboard Navigation | Arrow keys to move between rows |
| Context Menu | Right-click for actions |
| Export | CSV/Excel export button |

#### 2.3 Mobile Card Enhancements

| Feature | Implementation |
|---------|---------------|
| Swipe Actions | Left: View/Edit. Right: Primary action |
| Pull to Refresh | Native-feeling refresh |
| Expandable | Tap to expand details |
| Avatar Stack | Show team members inline |

---

### Phase 3: Forms & Inputs ✅ COMPLETE

**Status:** ✅ IMPLEMENTED

**Files Created:**
- `apps/web/src/components/forms/responsive-form.tsx` ✅
- `apps/web/src/components/forms/responsive-input.tsx` ✅
- `apps/web/src/components/forms/responsive-textarea.tsx` ✅
- `apps/web/src/components/forms/responsive-select.tsx` ✅
- `apps/web/src/components/forms/index.ts` ✅

**Features Implemented:**
- Mobile-optimized 48px input heights
- Sticky submit button on mobile
- Keyboard shortcuts (⌘S to save, Esc to cancel) on desktop
- Inline validation support
- ResponsiveFormSection and ResponsiveFormRow components

**Feature Flag:** `ux_responsive_forms`

#### 3.1 Responsive Form Sizing

```tsx
// Input heights: larger on mobile for touch
<Input className="h-12 sm:h-11 md:h-10" />

// Labels: larger on mobile for readability
<Label className="text-base sm:text-sm" />

// Spacing: more on mobile for thumb zones
<div className="space-y-6 sm:space-y-4" />
```

#### 3.2 Desktop Form Enhancements

| Feature | Implementation |
|---------|---------------|
| Inline Validation | Show errors as you type |
| Autofocus | Focus first field on mount |
| Tab Order | Logical tab progression |
| Form Shortcuts | `Cmd+S` to save, `Esc` to cancel |
| Split Layout | Side-by-side fields on wide screens |

#### 3.3 Mobile Form Enhancements

| Feature | Implementation |
|---------|---------------|
| Sticky Submit | Always visible save button |
| Step Wizard | Break long forms into steps |
| Large Inputs | 48px height minimum |
| Numeric Keyboard | Show number pad for numeric fields |

---

### Phase 4: Interactions & Feedback ✅ COMPLETE

**Status:** ✅ IMPLEMENTED

**Files Created:**
- `apps/web/src/components/interactions/command-menu.tsx` ✅
- `apps/web/src/components/interactions/responsive-dialog.tsx` ✅
- `apps/web/src/components/interactions/index.ts` ✅

**Features Implemented:**
- Command palette (⌘K) with search and navigation
- Responsive dialogs (bottom sheet on mobile, modal on desktop)
- Confirmation dialogs with destructive mode
- Global keyboard shortcuts hook

**Feature Flags:** `ux_command_menu`, `ux_responsive_dialogs`

#### 4.1 Platform-Specific Interactions

| Interaction | Mobile | Desktop |
|-------------|--------|---------|
| Delete Item | Swipe left + confirm | Hover reveal delete + confirm |
| Quick Edit | Tap → modal | Double-click → inline |
| Multi-select | Long press + checkboxes | Click checkboxes or Shift+click |
| Context Menu | Long press | Right-click |
| Search | Tap search icon → fullscreen | Always visible in header |
| Refresh | Pull down | Click refresh or `Cmd+R` |

#### 4.2 Loading States

| State | Mobile | Desktop |
|-------|--------|---------|
| Page Load | Full-screen skeleton | Skeleton in content area |
| Data Fetch | Card skeletons | Table row skeletons |
| Action | Button spinner | Button spinner + toast |
| Background | Subtle indicator | Status bar indicator |

#### 4.3 Feedback Patterns

| Pattern | Mobile | Desktop |
|---------|--------|---------|
| Success | Toast + haptic | Toast |
| Error | Toast + shake | Toast + inline error |
| Confirmation | Bottom sheet | Modal dialog |
| Progress | Full-width bar | Corner indicator |

---

### Phase 5: Polish & Platform Features ✅ COMPLETE

**Status:** ✅ FULLY IMPLEMENTED

**Files Created:**
- `apps/web/src/components/polish/keyboard-shortcuts-overlay.tsx` ✅
- `apps/web/src/components/polish/density-toggle.tsx` ✅
- `apps/web/src/components/polish/offline-indicator.tsx` ✅
- `apps/web/src/components/polish/pwa-install-prompt.tsx` ✅
- `apps/web/src/components/polish/resizable-sidebar.tsx` ✅
- `apps/web/src/components/polish/pinned-favorites.tsx` ✅
- `apps/web/src/components/polish/recent-items.tsx` ✅
- `apps/web/src/components/polish/index.ts` ✅

**Feature Flags:** `ux_keyboard_shortcuts_overlay`, `ux_density_toggle`, `ux_offline_indicator`, `ux_pwa_install_prompt`, `ux_resizable_sidebar`, `ux_pinned_favorites`, `ux_recent_items`

#### 5.1 PWA (Mobile)
| Feature | Status |
|---------|--------|
| Add to homescreen prompt | ✅ Implemented |
| Offline indicator | ✅ Implemented |
| Push notifications | ⏳ Future phase |
| App-like navigation | ✅ Via AppShell |

#### 5.2 Desktop Power Features
| Feature | Status |
|---------|--------|
| Keyboard shortcut overlay (`?`) | ✅ Implemented |
| Density toggle (compact/comfortable/spacious) | ✅ Implemented |
| Resizable sidebar | ✅ Implemented |
| Pinned favorites | ✅ Implemented |
| Recent items | ✅ Implemented |
| Multi-tab support | ⏳ Future phase |

#### 5.3 Cross-Platform
| Feature | Status |
|---------|--------|
| Dark mode polish | ⏳ Future phase |
| Performance optimization | ⏳ Phase 13 |
| Accessibility audit (WCAG AA) | ⏳ Phase 12 |
| Print stylesheets | ⏳ Future phase |

---

## Component Summary

### New Components

| Component | Mobile | Desktop | Status |
|-----------|--------|---------|--------|
| `AppShell` | Bottom nav + header | Sidebar + header | ⏳ Planned |
| `ResponsiveDataView` | Swipeable cards | Interactive table | ⏳ Planned |
| `ResponsiveForm` | Large inputs, sticky submit | Inline validation, shortcuts | ✅ Implemented |
| `CommandMenu` | Fullscreen search | Floating palette (Cmd+K) | ✅ Implemented |
| `ContextMenu` | Long-press sheet | Right-click menu | ⏳ Planned |
| `ResponsiveDialog` | Bottom sheet | Centered modal | ✅ Implemented |
| `KeyboardShortcutsOverlay` | N/A (desktop only) | Press ? to show | ✅ Implemented |
| `DensityToggle` | N/A | ⌘D to cycle | ✅ Implemented |
| `OfflineIndicator` | Banner when offline | Banner when offline | ✅ Implemented |

### Modified Components

| Component | Change | Status |
|-----------|--------|--------|
| `Button` | Responsive sizes (larger mobile, standard desktop) | ⏳ Planned |
| `Input` | Responsive heights | ⏳ Planned |
| `Table` | Add hover actions, keyboard nav, column controls | ⏳ Planned |
| `Card` | Add swipe actions (mobile), hover states (desktop) | ⏳ Planned |
| `Tabs` | Scrollable on mobile, full on desktop | ⏳ Planned |
| `Dialog` | Sheet on mobile, modal on desktop | ✅ Via ResponsiveDialog |

---

## Success Metrics

| Metric | Mobile Target | Desktop Target |
|--------|---------------|----------------|
| Lighthouse Performance | >90 | >95 |
| Touch/Click Target Compliance | >95% at 44px | >95% at 36px |
| Task Completion Time | -30% | -20% |
| Error Rate | -40% | -30% |
| User Satisfaction | >4.5/5 | >4.5/5 |

---

## Testing Strategy

### User Testing
1. **Mobile testers**: Coaches on sideline, parents on commute
2. **Desktop testers**: Admins doing bulk operations, power users
3. **Tablet testers**: Mixed use cases

### Automated Testing
- Playwright tests at mobile (375px), tablet (768px), desktop (1280px)
- Visual regression for both breakpoints
- Keyboard navigation tests (desktop)
- Touch simulation tests (mobile)

---

## Migration Strategy

### Feature Flags
```typescript
const {
  useResponsiveNav,      // New navigation system
  useResponsiveTable,    // Cards on mobile, table on desktop
  useEnhancedKeyboard,   // Desktop keyboard shortcuts
  useTouchOptimized,     // Mobile touch optimizations
} = useUXFeatureFlags();
```

### Gradual Rollout
1. Internal testing (both platforms)
2. Beta: 10 mobile users + 10 desktop users
3. Gradual: 10% → 50% → 100%

### Rollback
Feature flags allow instant reversion per platform if needed.

---

## Files Summary

### New Files Created
```
apps/web/src/
  components/
    layout/
      app-shell.tsx           # ⏳ Planned
      bottom-nav.tsx          # ✅ Implemented
      admin-sidebar.tsx       # ✅ Implemented
      responsive-header.tsx   # ⏳ Planned
    data-display/
      responsive-data-view.tsx  # ⏳ Planned
      data-table-enhanced.tsx   # ⏳ Planned
      data-card-list.tsx        # ⏳ Planned
    forms/
      responsive-form.tsx       # ✅ Implemented
      responsive-input.tsx      # ✅ Implemented
      responsive-textarea.tsx   # ✅ Implemented
      responsive-select.tsx     # ✅ Implemented
      index.ts                  # ✅ Implemented
    interactions/
      command-menu.tsx          # ✅ Implemented
      responsive-dialog.tsx     # ✅ Implemented
      index.ts                  # ✅ Implemented
      context-menu.tsx          # ⏳ Planned
      swipe-actions.tsx         # ⏳ Planned
      pull-to-refresh.tsx       # ⏳ Planned
    polish/
      keyboard-shortcuts-overlay.tsx  # ✅ Implemented
      density-toggle.tsx              # ✅ Implemented
      offline-indicator.tsx           # ✅ Implemented
      index.ts                        # ✅ Implemented
  hooks/
    use-ux-feature-flags.ts     # ✅ Implemented
    use-keyboard-shortcuts.ts   # ⏳ Planned
    use-swipe-actions.ts        # ⏳ Planned
    use-responsive-breakpoint.ts # ⏳ Planned
```

### Modified Files
```
apps/web/src/
  components/ui/
    button.tsx              # ⏳ Planned - Responsive sizes
    input.tsx               # ⏳ Planned - Responsive heights
    dialog.tsx              # ⏳ Planned - Sheet on mobile
    table.tsx               # ⏳ Planned - Enhanced features
  app/
    layout.tsx              # ✅ Fixed - Changed grid to flex for mobile
  app/orgs/[orgId]/
    admin/layout.tsx        # ✅ Modified - New nav system, responsive layout
    admin/page.tsx          # ✅ Modified - Responsive stat cards
    admin/stat-card.tsx     # ✅ Modified - Compact mobile sizing
    coach/layout.tsx        # ⏳ Planned
    parents/layout.tsx      # ⏳ Planned
```

---

## Implementation Progress Summary

### By Phase

| Phase | Description | Status | Completion |
|-------|-------------|--------|------------|
| Phase 0 | Testing Infrastructure | ✅ Complete | 100% |
| Phase 1 | Navigation Foundation | ✅ Complete | 100% |
| Phase 2 | Data Display Components | ✅ Complete | 100% |
| Phase 3 | Forms & Inputs | ✅ Complete | 100% |
| Phase 4 | Interactions & Feedback | ✅ Complete | 100% |
| Phase 5 | Polish & Platform Features | ✅ Complete | 100% |

### Feature Flags Implemented

| Flag | Description | Phase |
|------|-------------|-------|
| `ux_bottom_nav` | Mobile bottom navigation | 1 |
| `ux_admin_nav_sidebar` | Grouped admin sidebar | 1 |
| `ux_admin_nav_bottomsheet` | Bottom sheet admin nav | 1 |
| `ux_admin_nav_tabs` | Tabs admin nav | 1 |
| `ux_touch_targets_44px` | 44px touch targets | 1 |
| `ux_mobile_cards` | Card-based mobile display | 2 |
| `ux_skeleton_loaders` | Skeleton loading states | 2 |
| `ux_responsive_forms` | Mobile-optimized forms | 3 |
| `ux_command_menu` | Command palette (⌘K) | 4 |
| `ux_responsive_dialogs` | Responsive dialogs | 4 |
| `ux_keyboard_shortcuts_overlay` | Keyboard shortcuts help | 5 |
| `ux_density_toggle` | Density toggle | 5 |
| `ux_offline_indicator` | Offline status indicator | 5 |

### Additional Fixes Applied

| Fix | Description | Files |
|-----|-------------|-------|
| Mobile Dashboard Cards | Stat cards now display at proper compact size on mobile | `layout.tsx`, `admin/layout.tsx`, `admin/page.tsx`, `stat-card.tsx` |
| Root Layout Grid | Changed from fixed grid to flexible column to prevent content stretching | `app/layout.tsx` |

---

## Next Implementation Phases

Based on the UX Review, here are the remaining phases with detailed implementation plans:

---

### Phase 6: Skeleton Loaders & Loading States ✅ COMPLETE

**Status:** ✅ FULLY IMPLEMENTED

**Files Created:**
- `apps/web/src/components/loading/table-skeleton.tsx` ✅
- `apps/web/src/components/loading/card-skeleton.tsx` ✅
- `apps/web/src/components/loading/list-skeleton.tsx` ✅
- `apps/web/src/components/loading/form-skeleton.tsx` ✅
- `apps/web/src/components/loading/page-skeleton.tsx` ✅
- `apps/web/src/components/loading/index.ts` ✅

**Route Loading Files Created:**
- `apps/web/src/app/orgs/[orgId]/admin/loading.tsx` ✅
- `apps/web/src/app/orgs/[orgId]/admin/players/loading.tsx` ✅
- `apps/web/src/app/orgs/[orgId]/admin/teams/loading.tsx` ✅
- `apps/web/src/app/orgs/[orgId]/admin/users/loading.tsx` ✅

**Feature Flag:** `ux_skeleton_loaders`

#### Components Implemented

| Component | Description | Status |
|-----------|-------------|--------|
| `TableSkeleton` | Configurable rows/columns, header, checkbox, actions | ✅ |
| `CardSkeleton` | Variants: default, horizontal, compact | ✅ |
| `CardGridSkeleton` | Grid of card skeletons | ✅ |
| `StatCardSkeleton` | Dashboard stat card skeleton | ✅ |
| `StatGridSkeleton` | Grid of stat card skeletons | ✅ |
| `ListSkeleton` | List items with avatar, secondary text | ✅ |
| `NavListSkeleton` | Navigation menu skeleton | ✅ |
| `TimelineSkeleton` | Activity timeline skeleton | ✅ |
| `FormSkeleton` | Form fields with multiple layouts | ✅ |
| `FormSectionSkeleton` | Form section with title | ✅ |
| `PageSkeleton` | Full page layouts (dashboard, list, detail, form, settings) | ✅ |

#### Usage

```tsx
// Import skeleton components
import { TableSkeleton, PageSkeleton, CardGridSkeleton } from "@/components/loading";

// Use in loading.tsx files
export default function Loading() {
  return <PageSkeleton variant="list" />;
}

// Or inline for sections
{isLoading ? <TableSkeleton rows={5} columns={4} /> : <DataTable data={data} />}
```

---

### Phase 7: Table Migration & Data Display ✅ MOSTLY COMPLETE

**Status:** ✅ MOSTLY IMPLEMENTED (key admin pages already mobile-friendly)

**Objective:** Convert all admin tables to use ResponsiveDataView with mobile card views.

#### 7.1 Admin Pages Analysis

| Page | Current Implementation | Mobile-Friendly? | Status |
|------|------------------------|------------------|--------|
| Admin Players | `ResponsiveDataView` component | ✅ Yes | ✅ Complete |
| Admin Teams | Collapsible Card list | ✅ Yes (inherently) | ✅ N/A |
| Admin Users | Expandable Card list | ✅ Yes (inherently) | ✅ N/A |
| Coach Player List | TBD | ⏳ | Phase 2 |

**Key Finding:** Teams and Users pages already use card-based expandable layouts which are inherently mobile-friendly. They don't use traditional tables, so no migration needed.

#### 7.2 Completed Features

- [x] `ResponsiveDataView` component - Full implementation with:
  - [x] Mobile card view with avatars
  - [x] Desktop table view with sorting
  - [x] Selection checkboxes
  - [x] Row actions dropdown
  - [x] Loading skeletons
  - [x] Empty state
- [x] `DataTableEnhanced` component with:
  - [x] Column visibility controls
  - [x] Bulk selection
  - [x] Export functionality (CSV)
  - [x] Enhanced sorting
- [x] `SwipeableCard` component for mobile gestures
- [x] `DataCardList` component with pull-to-refresh

#### 7.3 Admin Players Page Integration ✅

The `/admin/players` page now uses `ResponsiveDataView`:
- Mobile: Shows cards with avatar, name, team, age group
- Desktop: Shows sortable table with all columns
- Selection: Bulk delete functionality
- Actions: View, Edit, Delete per row

#### 7.4 Feature Flags (Already Exist)

```typescript
ux_mobile_cards: boolean;      // Mobile card display
ux_enhanced_tables: boolean;   // Desktop table enhancements
ux_swipe_cards: boolean;       // Swipe actions on mobile
ux_pull_to_refresh: boolean;   // Pull to refresh on lists
```

**Remaining Work:**
- [ ] Coach Player List migration (Phase 2 priority)
- [ ] Add swipe-to-delete on player cards (nice-to-have)

---

### Phase 8: Touch Target & Base Component Updates ✅ COMPLETE

**Status:** ✅ FULLY IMPLEMENTED

**Objective:** Update base shadcn/ui components to have responsive sizes.

#### 8.1 Components Modified

| Component | Mobile | Tablet | Desktop | Status |
|-----------|--------|--------|---------|--------|
| Button | `h-11` (44px) | `h-10` (40px) | `h-9` (36px) | ✅ Already implemented |
| Input | `h-12` (48px) | `h-11` (44px) | `h-10` (40px) | ✅ Already implemented |
| Select trigger | `h-12` (48px) | `h-11` (44px) | `h-10` (40px) | ✅ Already implemented |
| Checkbox | `size-5` (20px) | `size-[18px]` | `size-4` (16px) | ✅ Updated |
| Radio | `size-5` (20px) | `size-[18px]` | `size-4` (16px) | ✅ Updated |
| Switch | `h-6 w-11` | `h-[22px] w-10` | `h-[18px] w-8` | ✅ Updated |

#### 8.2 Implementation Summary

**Previously Implemented (found during audit):**
- [x] `button.tsx` - Already has responsive sizes: `h-11 sm:h-10 md:h-9`
- [x] `input.tsx` - Already has responsive sizes: `h-12 sm:h-11 md:h-10`
- [x] `select.tsx` - Already has responsive sizes with `size` prop

**Newly Updated:**
- [x] `checkbox.tsx` - Added responsive sizing: `size-5 sm:size-[18px] md:size-4`
- [x] `radio-group.tsx` - Added responsive sizing: `size-5 sm:size-[18px] md:size-4`
- [x] `switch.tsx` - Added responsive sizing: `h-6 w-11 sm:h-[22px] sm:w-10 md:h-[18px] md:w-8`

**Size Variants Available (Button):**
```tsx
size: {
  default: "h-11 sm:h-10 md:h-9 px-4",     // Responsive
  sm: "h-10 sm:h-9 md:h-8 px-3",            // Responsive small
  lg: "h-12 sm:h-11 md:h-10 px-6",          // Responsive large
  icon: "size-11 sm:size-10 md:size-9",     // Responsive icon
  touch: "h-11 px-5",                        // Always 44px
  "touch-lg": "h-12 px-6",                   // Always 48px
  compact: "h-8 px-3",                       // Always 32px
}
```

**Estimated Effort:** 2-3 days → **Actual: < 1 day** (most was already done)

---

### Phase 9: AppShell & Unified Navigation ✅ COMPLETE

**Status:** ✅ FULLY IMPLEMENTED

**Objective:** Create a unified responsive shell for all authenticated pages.

#### 9.1 Components Created/Updated

| Component | Description | Status |
|-----------|-------------|--------|
| `AppShell` | Main wrapper with responsive nav switching | ✅ Already existed |
| `AdminSidebar` | Grouped admin navigation | ✅ Already existed |
| `AdminMobileNav` | Mobile drawer for admin | ✅ Already existed |
| `CoachSidebar` | Grouped coach navigation | ✅ NEW |
| `CoachMobileNav` | Mobile drawer for coach | ✅ NEW |
| `ParentSidebar` | Grouped parent navigation | ✅ NEW |
| `ParentMobileNav` | Mobile drawer for parent | ✅ NEW |

#### 9.2 Implementation Summary

**Already Existed (found during audit):**
- [x] `app-shell.tsx` - Full responsive shell with mobile/tablet/desktop support
- [x] `admin-sidebar.tsx` - Grouped sidebar (16 items → 4 groups) + mobile nav
- [x] Admin layout.tsx - Fully integrated with sidebar + bottom nav

**Newly Created:**
- [x] `coach-sidebar.tsx` - Coach navigation with 3 groups (Players, Performance, Account)
- [x] `parent-sidebar.tsx` - Parent navigation with 3 groups (Children, Updates, Account)
- [x] Updated `coach/layout.tsx` - Now uses CoachSidebar + CoachMobileNav + BottomNav
- [x] Updated `parents/layout.tsx` - Now uses ParentSidebar + ParentMobileNav + BottomNav
- [x] Updated `index.ts` - Exports all sidebar components

#### 9.3 Layout Features (All Roles)

| Feature | Admin | Coach | Parent |
|---------|-------|-------|--------|
| Desktop Sidebar | ✅ | ✅ | ✅ |
| Mobile Drawer | ✅ | ✅ | ✅ |
| Bottom Navigation | ✅ | ✅ | ✅ |
| Theme Color Support | ✅ | ✅ | ✅ |
| Grouped Navigation | ✅ 4 groups | ✅ 3 groups | ✅ 3 groups |
| Feature Flag Control | ✅ | ✅ | ✅ |

#### 9.4 Navigation Groups

**Admin (16 items → 4 groups):**
- People: Players, Coaches, Guardians, Users, Approvals
- Teams & Access: Teams, Overrides, Player Access
- Data & Import: Analytics, Benchmarks, Import Players, GAA
- Settings: Settings, Announcements, Dev Tools

**Coach (8 items → 3 groups):**
- Players: Overview, My Players, Assessments
- Performance: Reports, Benchmarks, Progress
- Account: Profile, Settings

**Parent (8 items → 3 groups):**
- Children: Overview, My Children, Progress
- Updates: Achievements, Messages, Announcements
- Account: Profile, Settings

#### 9.5 Feature Flags

```typescript
adminNavStyle: "sidebar" | "bottomsheet" | "tabs";  // Controls nav style
useBottomNav: boolean;  // Mobile bottom navigation
```

**Estimated Effort:** 4-5 days → **Actual: < 1 day** (most was already done)

---

### Phase 10: Context Menu & Advanced Interactions ✅ COMPLETE

**Status:** ✅ FULLY IMPLEMENTED

**Objective:** Add context menus and advanced interaction patterns.

#### 10.1 Files Created

**Hook:**
- `apps/web/src/hooks/use-long-press.ts` ✅ - Long-press detection hook (500ms threshold)

**Components:**
- `apps/web/src/components/interactions/context-menu.tsx` ✅ - Responsive context menu
- `apps/web/src/components/interactions/action-sheet.tsx` ✅ - Responsive action sheet
- `apps/web/src/components/interactions/inline-edit.tsx` ✅ - Responsive inline editor
- `apps/web/src/components/interactions/index.ts` ✅ - Updated with new exports

#### 10.2 Components Implemented

| Component | Mobile | Desktop | Status |
|-----------|--------|---------|--------|
| `ResponsiveContextMenu` | Long-press → bottom sheet | Right-click → dropdown menu | ✅ |
| `ActionSheet` | Bottom sheet with cancel | Dropdown menu | ✅ |
| `InlineEdit` | Tap → drawer editor | Double-click → in-place edit | ✅ |
| `useLongPress` | Touch events (500ms) | Mouse events | ✅ |

#### 10.3 Feature Flags Added

| Flag | Description |
|------|-------------|
| `ux_context_menu` | Enable responsive context menus |
| `ux_action_sheet` | Enable action sheets |
| `ux_inline_edit` | Enable inline editing |

#### 10.4 Analytics Events Added

| Event | Description |
|-------|-------------|
| `CONTEXT_MENU_OPENED` | Context menu opened |
| `CONTEXT_MENU_ACTION` | Action selected from context menu |
| `ACTION_SHEET_OPENED` | Action sheet opened |
| `ACTION_SHEET_ACTION` | Action selected from action sheet |
| `INLINE_EDIT_STARTED` | Inline editing started |
| `INLINE_EDIT_SAVED` | Inline edit saved |
| `INLINE_EDIT_CANCELLED` | Inline edit cancelled |

#### 10.5 Usage Examples

```tsx
// Context Menu - right-click on desktop, long-press on mobile
<ResponsiveContextMenu
  title="Player Options"
  items={[
    { key: 'view', label: 'View Profile', icon: <Eye />, onSelect: handleView },
    { key: 'edit', label: 'Edit', icon: <Pencil />, onSelect: handleEdit },
    { key: 'delete', label: 'Delete', icon: <Trash />, destructive: true, onSelect: handleDelete },
  ]}
>
  <PlayerCard player={player} />
</ResponsiveContextMenu>

// Action Sheet - dropdown on desktop, sheet on mobile
<ActionSheet
  trigger={<Button variant="ghost" size="icon"><MoreVertical /></Button>}
  title="Actions"
  items={[
    { key: 'edit', label: 'Edit', icon: <Pencil />, onSelect: handleEdit },
    { key: 'delete', label: 'Delete', icon: <Trash />, destructive: true, onSelect: handleDelete },
  ]}
/>

// Inline Edit - in-place on desktop, drawer on mobile
<InlineEdit
  value={player.name}
  label="Player Name"
  onSave={(name) => updatePlayer({ name })}
/>
```

**Estimated Effort:** 3-4 days → **Actual: < 1 day**

---

### Phase 11: PWA & Offline Features 🔴 NOT STARTED

**Priority:** LOW - Nice to have for mobile users

**Objective:** Make the app installable and partially functional offline.

#### 11.1 Features to Implement

| Feature | Description | Priority |
|---------|-------------|----------|
| Manifest | PWA manifest for installation | High |
| Add to Homescreen | Prompt to install | High |
| Service Worker | Cache static assets | Medium |
| Offline Data | Cache critical data | Low |
| Push Notifications | Notify of updates | Low |

#### 11.2 Implementation Tasks

- [ ] Create `apps/web/public/manifest.json`
- [ ] Add PWA meta tags to root layout
- [ ] Create service worker for static caching
- [ ] Add "Add to Homescreen" prompt component
- [ ] Enhance offline indicator with "cached" state
- [ ] Cache organization data for offline viewing
- [ ] Setup push notification infrastructure

**Estimated Effort:** 3-5 days

---

### Phase 12: Accessibility Audit 🔴 NOT STARTED

**Priority:** HIGH for compliance, but can run parallel

**Objective:** Achieve WCAG AA compliance across the application.

#### 12.1 Audit Areas

| Area | Current State | Target |
|------|---------------|--------|
| Color Contrast | Unknown | 4.5:1 minimum |
| Focus States | Basic | Visible, consistent |
| Screen Reader | Untested | Full compatibility |
| Keyboard Nav | Partial | Complete |
| ARIA Labels | Inconsistent | Complete |
| Skip Links | Missing | Implemented |

#### 12.2 Implementation Tasks

- [ ] Run automated audit (axe-core, Lighthouse)
- [ ] Fix color contrast issues
- [ ] Add visible focus states to all interactive elements
- [ ] Add skip links to main content
- [ ] Add ARIA labels to all interactive elements
- [ ] Test with screen reader (VoiceOver, NVDA)
- [ ] Add keyboard navigation to all components
- [ ] Test and fix form error announcements
- [ ] Add reduced motion support

**Estimated Effort:** 3-5 days

---

### Phase 13: Performance Optimization 🔴 NOT STARTED

**Priority:** MEDIUM - Important for mobile users on slow connections

**Objective:** Achieve Lighthouse performance score >90 on mobile.

#### 13.1 Optimization Areas

| Area | Actions |
|------|---------|
| Bundle Size | Analyze and reduce |
| Code Splitting | Lazy load routes |
| Images | Optimize, use next/image |
| Fonts | Subset, preload |
| Third-party | Defer non-critical |
| Caching | Leverage browser cache |

#### 13.2 Implementation Tasks

- [ ] Run bundle analyzer
- [ ] Implement route-based code splitting
- [ ] Lazy load heavy components (charts, editors)
- [ ] Optimize all images with next/image
- [ ] Add font subsetting
- [ ] Defer analytics scripts
- [ ] Add resource hints (prefetch, preconnect)
- [ ] Implement stale-while-revalidate patterns

**Estimated Effort:** 3-4 days

---

## Implementation Priority Matrix

### Completed Phases ✅

| Phase | Name | Status | Completion |
|-------|------|--------|------------|
| 0 | Testing Infrastructure | ✅ Complete | 100% |
| 1 | Navigation Foundation | ✅ Complete | 100% |
| 3 | Forms & Inputs | ✅ Complete | 100% |
| 4 | Interactions & Feedback | ✅ Complete | 100% |

### All Core Phases Complete ✅

Phases 0-5 are now fully implemented. Remaining phases (6-13) focus on:
- Skeleton loaders & loading states
- Table migration to new components
- Touch target updates
- Accessibility audit
- Performance optimization

### Completed Phases (Updated) ✅

| Phase | Name | Status | Completion |
|-------|------|--------|------------|
| 0 | Testing Infrastructure | ✅ Complete | 100% |
| 1 | Navigation Foundation | ✅ Complete | 100% |
| 2 | Data Display Components | ✅ Complete | 100% |
| 3 | Forms & Inputs | ✅ Complete | 100% |
| 4 | Interactions & Feedback | ✅ Complete | 100% |
| 5 | Polish & Platform Features | ✅ Complete | 100% |
| 6 | Skeleton Loaders | ✅ Complete | 100% |
| 7 | Table Migration | ✅ Mostly Complete | 90% |
| 8 | Touch Targets (Base UI) | ✅ Complete | 100% |
| 9 | AppShell & Unified Nav | ✅ Complete | 100% |

### Not Started Phases 🔴

| Phase | Name | Priority | Effort | Impact | Order |
|-------|------|----------|--------|--------|-------|
| 10 | Context Menus | 🟡 Medium | 3-4 days | Low | 1 |
| 11 | PWA & Offline | 🟢 Low | 3-5 days | Low | 2 |
| 12 | Accessibility Audit | 🔴 High | 3-5 days | Medium | 3 |
| 13 | Performance | 🟡 Medium | 3-4 days | Medium | 4 |

### Remaining Items from Phases 0-5

#### Phase 1 ✅ COMPLETE
All navigation foundation items have been implemented:
- [x] Create full `AppShell` component for responsive nav switching
- [x] Update `input.tsx` with responsive sizes (48px mobile → 40px desktop)
- [x] Update `select.tsx` with responsive sizes
- [x] Add desktop hover states component (`hover-actions.tsx`)
- [x] Button.tsx already had responsive sizes

#### Phase 2 ✅ COMPLETE
All data display components have been implemented:
- [x] Complete `ResponsiveDataView` with sorting, selection, mobile cards
- [x] Create `data-table-enhanced.tsx` with column visibility, bulk actions, export
- [x] Create `data-card-list.tsx` with swipe actions, pull-to-refresh, infinite scroll
- [x] Create `swipeable-card.tsx` for mobile swipe gestures

#### Phase 5 ✅ COMPLETE
All polish & platform features have been implemented:
- [x] Add to homescreen PWA prompt
- [x] Offline indicator
- [x] Keyboard shortcuts overlay
- [x] Density toggle
- [x] Resizable sidebar with persistence
- [x] Pinned favorites system
- [x] Recent items history
- [ ] Push notifications (deferred to future phase)
- [ ] Multi-tab support (deferred to future phase)
- [ ] Dark mode polish (deferred to future phase)

**Total Estimated Remaining Effort:** 33-47 days (including partial phases)

---

## Quick Wins (Can be done anytime)

These can be implemented independently without blocking other work:

1. **Back Buttons** - Add consistent back navigation (1 day)
2. **Empty State Audit** - Add actionable CTAs to empty states (1 day)
3. **Toast Consistency** - Standardize success/error messages (0.5 days)
4. **Hover States** - Add hover effects to cards and rows (1 day)
5. **Focus Indicators** - Improve keyboard focus visibility (1 day)

---

## Testing Checklist

Before each phase is considered complete:

- [ ] Tested on iPhone SE (375px)
- [ ] Tested on iPad (768px)
- [ ] Tested on Desktop (1280px+)
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Lighthouse performance >80
- [ ] Feature flag works correctly
- [ ] No regressions in existing features
