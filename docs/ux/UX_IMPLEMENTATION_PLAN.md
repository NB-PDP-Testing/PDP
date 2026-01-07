# PlayerARC Comprehensive UX Improvement Plan

## Overview

Transform PlayerARC into a **responsive, intuitive, clean, light** experience that works beautifully on **both mobile AND desktop**. Mobile-first design approach, but with explicit desktop optimizations to ensure power users have an efficient experience.

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

### Phase 1: Navigation Foundation ✅ PARTIALLY COMPLETE

**Status:** ✅ PARTIALLY IMPLEMENTED

**Implemented:**
- `apps/web/src/components/layout/bottom-nav.tsx` ✅
- `apps/web/src/components/layout/admin-sidebar.tsx` ✅
- Feature flags for admin navigation styles ✅
- Mobile bottom navigation with role-specific items ✅

**Remaining:**
- Full `AppShell` component for responsive switching
- Touch target size updates to button.tsx
- Desktop hover states

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

### Phase 2: Data Display Components ⏳ PLANNED

**Status:** ⏳ NOT STARTED

**Components to Create:**
- `responsive-data-view.tsx`
- `data-table-enhanced.tsx`
- `data-card-list.tsx`

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

### Phase 5: Polish & Platform Features ✅ PARTIALLY COMPLETE

**Status:** ✅ PARTIALLY IMPLEMENTED

**Files Created:**
- `apps/web/src/components/polish/keyboard-shortcuts-overlay.tsx` ✅
- `apps/web/src/components/polish/density-toggle.tsx` ✅
- `apps/web/src/components/polish/offline-indicator.tsx` ✅
- `apps/web/src/components/polish/index.ts` ✅

**Feature Flags:** `ux_keyboard_shortcuts_overlay`, `ux_density_toggle`, `ux_offline_indicator`

#### 5.1 PWA (Mobile)
| Feature | Status |
|---------|--------|
| Add to homescreen prompt | ⏳ Not started |
| Offline indicator | ✅ Implemented |
| Push notifications | ⏳ Not started |
| App-like navigation | ⏳ Not started |

#### 5.2 Desktop Power Features
| Feature | Status |
|---------|--------|
| Keyboard shortcut overlay (`?`) | ✅ Implemented |
| Density toggle (compact/comfortable/spacious) | ✅ Implemented |
| Resizable sidebar | ⏳ Not started |
| Pinned favorites | ⏳ Not started |
| Recent items | ⏳ Not started |
| Multi-tab support | ⏳ Not started |

#### 5.3 Cross-Platform
| Feature | Status |
|---------|--------|
| Dark mode polish | ⏳ Not started |
| Performance optimization | ⏳ Not started |
| Accessibility audit (WCAG AA) | ⏳ Not started |
| Print stylesheets | ⏳ Not started |

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
| Phase 1 | Navigation Foundation | ✅ Partial | 60% |
| Phase 2 | Data Display Components | ⏳ Planned | 0% |
| Phase 3 | Forms & Inputs | ✅ Complete | 100% |
| Phase 4 | Interactions & Feedback | ✅ Complete | 100% |
| Phase 5 | Polish & Platform Features | ✅ Partial | 50% |

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

## Next Steps

### Immediate (High Priority)
1. ⬜ Complete Phase 2: Data Display Components
   - Create `ResponsiveDataView` component
   - Add swipe actions for mobile cards
   - Enhance desktop table features

### Short-term (Medium Priority)
2. ⬜ Complete Phase 1: Navigation
   - Update `button.tsx` with responsive sizes
   - Create full `AppShell` component
   - Add touch target compliance

### Long-term (Lower Priority)
3. ⬜ Complete Phase 5: Polish
   - PWA features (push notifications, add to homescreen)
   - Resizable sidebar
   - Accessibility audit
   - Performance optimization

### Testing
4. ⬜ Share `/demo/ux-mockups` with test users
5. ⬜ Collect feedback on implemented features
6. ⬜ Run Playwright tests at multiple breakpoints
