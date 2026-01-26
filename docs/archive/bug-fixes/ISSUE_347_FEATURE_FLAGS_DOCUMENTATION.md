# PostHog Feature Flags - Complete Documentation

This document provides comprehensive documentation of all PostHog feature flags used in PlayerARC, including their purpose, usage, and implementation status.

---

## Table of Contents

1. [Overview](#overview)
2. [How Feature Flags Work](#how-feature-flags-work)
3. [Feature Flags by Phase](#feature-flags-by-phase)
4. [A/B Testing Flags](#ab-testing-flags)
5. [Feature Flag Usage Examples](#feature-flag-usage-examples)
6. [Administration](#administration)

---

## Overview

| Metric | Count |
|--------|-------|
| **Total Feature Flags** | 51 |
| **Phases** | 18 |
| **A/B Test Variants** | 6 |
| **Access Hook** | `useUXFeatureFlags()` |
| **Location** | `apps/web/src/hooks/use-ux-feature-flags.ts` |

### Access Control
- **Who can toggle flags:** Platform Staff only (via PostHog dashboard)
- **Who sees flags:** ALL users when enabled (not scoped)
- **Default state:** All flags default to `false` until explicitly enabled

---

## How Feature Flags Work

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEATURE FLAG FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SERVER-SIDE BOOTSTRAP (proxy.ts)                           │
│     ┌─────────────────────────────────────────────────────┐    │
│     │  • Runs on every page request                       │    │
│     │  • Fetches ALL flags from PostHog server-side       │    │
│     │  • Stores in cookie: ph-bootstrap-flags (5 min TTL) │    │
│     │  • Eliminates client-side loading flicker           │    │
│     └─────────────────────────────────────────────────────┘    │
│                           │                                    │
│                           ▼                                    │
│  2. CLIENT-SIDE INITIALIZATION (posthog-provider.tsx)          │
│     ┌─────────────────────────────────────────────────────┐    │
│     │  • Reads flags from cookie on page load             │    │
│     │  • Bootstraps PostHog with pre-fetched flags        │    │
│     │  • Refreshes flags in background for next navigation│    │
│     └─────────────────────────────────────────────────────┘    │
│                           │                                    │
│                           ▼                                    │
│  3. FLAG CONSUMPTION (useUXFeatureFlags hook)                  │
│     ┌─────────────────────────────────────────────────────┐    │
│     │  • Components call useUXFeatureFlags()              │    │
│     │  • Returns typed object with all flag values        │    │
│     │  • Values available immediately (no loading state)  │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Usage in Components

```typescript
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";

function MyComponent() {
  const { useEnhancedTables, usePWAInstallPrompt } = useUXFeatureFlags();

  if (useEnhancedTables) {
    return <EnhancedTable />;
  }
  return <BasicTable />;
}
```

---

## Feature Flags by Phase

### Phase 1: Navigation Foundation (8 flags)

| Flag | Type | Purpose | Used In |
|------|------|---------|---------|
| `ux_bottom_nav` | boolean | Enable bottom navigation bar on mobile devices | Mobile layouts |
| `ux_touch_targets_44px` | boolean | Use 44px minimum touch targets (Apple HIG compliant) | All interactive elements |
| `ux_admin_nav_sidebar` | boolean | A/B test: Sidebar navigation for admin section | Admin layout |
| `ux_admin_nav_bottomsheet` | boolean | A/B test: Bottom sheet navigation for admin | Admin layout |
| `ux_admin_nav_tabs` | boolean | A/B test: Tab-based navigation for admin | Admin layout |
| `ux_app_shell` | boolean | Use new AppShell responsive layout wrapper | Page layouts |
| `ux_hover_actions` | boolean | Enable desktop hover-reveal actions on rows/cards | Data tables, cards |
| `ux_responsive_inputs` | boolean | Use responsive input sizing (48px mobile → 40px desktop) | Form inputs |

**Implementation Details:**

```typescript
// Admin navigation A/B test logic
function getAdminNavStyle(isFeatureEnabled): AdminNavStyle {
  if (isFeatureEnabled("ux_admin_nav_sidebar")) return "sidebar";
  if (isFeatureEnabled("ux_admin_nav_bottomsheet")) return "bottomsheet";
  if (isFeatureEnabled("ux_admin_nav_tabs")) return "tabs";
  return "current"; // Default
}
```

---

### Phase 2: Data Display (5 flags)

| Flag | Type | Purpose | Used In |
|------|------|---------|---------|
| `ux_mobile_cards` | boolean | Use card-based display on mobile instead of tables | `ResponsiveDataView` |
| `ux_skeleton_loaders` | boolean | Show skeleton loading states during data fetch | Loading components |
| `ux_enhanced_tables` | boolean | Enable DataTableEnhanced with column visibility, bulk actions, export | `SmartDataView` |
| `ux_swipe_cards` | boolean | Enable swipe actions on mobile cards | `ResponsiveDataView` |
| `ux_pull_to_refresh` | boolean | Enable pull-to-refresh gesture on card lists | `ResponsiveDataView` |

**Implementation Details:**

```typescript
// SmartDataView automatically selects component based on flag
function SmartDataView<T>(props) {
  const { useEnhancedTables } = useUXFeatureFlags();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Desktop + flag enabled = Enhanced table
  if (isDesktop && useEnhancedTables) {
    return <DataTableEnhanced {...props} />;
  }
  // Otherwise = Responsive cards/basic table
  return <ResponsiveDataView {...props} />;
}
```

---

### Phase 3: Forms (1 flag)

| Flag | Type | Purpose | Used In |
|------|------|---------|---------|
| `ux_responsive_forms` | boolean | Use mobile-optimized form components with larger touch targets | Form components |

---

### Phase 4: Interactions (2 flags)

| Flag | Type | Purpose | Used In |
|------|------|---------|---------|
| `ux_command_menu` | boolean | Enable Cmd+K (Mac) / Ctrl+K (Win) command palette | Global keyboard shortcut |
| `ux_responsive_dialogs` | boolean | Use responsive dialogs - sheet on mobile, modal on desktop | Dialog components |

---

### Phase 5: Polish (7 flags)

| Flag | Type | Purpose | Used In |
|------|------|---------|---------|
| `ux_keyboard_shortcuts_overlay` | boolean | Show keyboard shortcuts help overlay (? key) | `KeyboardShortcutsOverlay` |
| `ux_density_toggle` | boolean | Enable UI density toggle (compact/comfortable/spacious) | `DensityProvider` |
| `ux_offline_indicator` | boolean | Show offline status indicator when connection lost | `OfflineIndicator` |
| `ux_pwa_install_prompt` | boolean | Show PWA install prompt after 5+ visits | `PWAInstallPrompt` |
| `ux_resizable_sidebar` | boolean | Enable resizable sidebar with drag handle | Sidebar component |
| `ux_pinned_favorites` | boolean | Enable pinned favorites in sidebar | Sidebar component |
| `ux_recent_items` | boolean | Enable recent items history in navigation | Navigation component |

**Implementation Details (PWA Install):**

```typescript
// PWA prompt only shows when flag enabled AND conditions met
function PWAInstallPrompt() {
  const { usePWAInstallPrompt: featureFlagEnabled } = useUXFeatureFlags();

  // Don't render if flag disabled
  if (!featureFlagEnabled) return null;

  // Additional conditions: 5+ visits, not already installed, etc.
  // ...
}
```

---

### Phase 10: Context Menu & Advanced Interactions (3 flags)

| Flag | Type | Purpose | Used In |
|------|------|---------|---------|
| `ux_context_menu` | boolean | Enable responsive context menus (long-press mobile, right-click desktop) | Data rows, cards |
| `ux_action_sheet` | boolean | Enable action sheets (bottom sheet mobile, dropdown desktop) | Action menus |
| `ux_inline_edit` | boolean | Enable inline editing (modal mobile, in-place desktop) | Editable fields |

---

### Phase 11: PWA & Offline (3 flags)

| Flag | Type | Purpose | Used In |
|------|------|---------|---------|
| `ux_service_worker` | boolean | Enable service worker registration for PWA | `ServiceWorkerProvider` |
| `ux_offline_support` | boolean | Enable offline support features (cached pages) | Service worker |
| `ux_pwa_update_prompt` | boolean | Show "update available" prompt when new version deployed | `PWAUpdatePrompt` |

---

### Phase 12: Accessibility (4 flags)

| Flag | Type | Purpose | Used In |
|------|------|---------|---------|
| `ux_skip_links` | boolean | Enable "skip to main content" links for keyboard users | `SkipLink` component |
| `ux_focus_visible` | boolean | Enhanced visible focus indicators for keyboard navigation | Global CSS |
| `ux_reduced_motion` | boolean | Respect `prefers-reduced-motion` system preference | Animations |
| `ux_announcer` | boolean | Enable screen reader announcements for dynamic content | `AnnouncerProvider` |

---

### Phase 13: Performance (4 flags)

| Flag | Type | Purpose | Used In |
|------|------|---------|---------|
| `ux_lazy_components` | boolean | Enable lazy loading for non-critical components | Component imports |
| `ux_web_vitals` | boolean | Enable Web Vitals monitoring (LCP, FID, CLS) | Analytics |
| `ux_deferred_render` | boolean | Enable deferred rendering for below-fold content | Page layouts |
| `ux_resource_hints` | boolean | Enable resource hints (preconnect, prefetch, preload) | Document head |

---

### Phase 14: Theme & Accessibility (5 flags)

| Flag | Type | Purpose | Used In |
|------|------|---------|---------|
| `ux_theme_enhanced` | boolean | Enhanced theme toggle with checkmark indicator, ARIA attributes | `ModeToggle` |
| `ux_theme_contrast_colors` | boolean | Auto-contrast text colors on org-colored backgrounds (WCAG) | `useOrgTheme` |
| `ux_theme_dark_variants` | boolean | Adaptive org colors for dark mode (lightens dark colors) | `useOrgTheme` |
| `ux_theme_smooth_transitions` | boolean | Smooth 200ms transitions when changing themes | `ThemeTransitionManager` |
| `ux_header_nav_minimal` | boolean | Hide header nav links (Home, Platform, Coach, Parent, Admin) | Header component |

**Implementation Details (Theme Contrast):**

```typescript
// useOrgTheme calculates contrast colors based on flag
function useOrgTheme() {
  const { useThemeContrastColors, useThemeDarkVariants } = useUXFeatureFlags();

  // When enabled, calculates black/white for WCAG compliance
  const primaryContrast = useThemeContrastColors
    ? getContrastColor(primaryColor)  // Returns #000000 or #ffffff
    : "#ffffff";  // Default white for backwards compatibility

  // When enabled in dark mode, lightens dark org colors
  const primaryAdaptive = useThemeDarkVariants && isDarkMode
    ? adjustForDarkMode(primaryColor)
    : primaryColor;
}
```

**Implementation Details (Enhanced Theme Toggle):**

```typescript
// ModeToggle shows enhanced UI when flag enabled
function ModeToggle() {
  const { useEnhancedThemeToggle } = useUXFeatureFlags();

  if (useEnhancedThemeToggle) {
    // Enhanced: checkmarks, ARIA attributes, icons in dropdown
    return <EnhancedDropdown />;
  }
  // Default: simple dropdown
  return <BasicDropdown />;
}
```

---

### Phase 15: Enhanced User Menu (2 flags)

| Flag | Type | Purpose | Used In |
|------|------|---------|---------|
| `ux_enhanced_user_menu` | boolean | Enhanced user menu with profile settings, preferences, alerts | `EnhancedUserMenu` |
| `ux_org_usage_tracking` | boolean | Show organization usage statistics in user menu | User menu component |

---

### Phase 16: Logo Visibility (1 flag)

| Flag | Type | Purpose | Used In |
|------|------|---------|---------|
| `ux_logo_adaptive_visibility` | boolean | WCAG-based logo box contrast calculation using org colors | Logo component |

---

### Phase 17: Parent Features (1 flag)

| Flag | Type | Purpose | Used In |
|------|------|---------|---------|
| `parent_summary_share_image` | boolean | Enable shareable image generation for parent summaries (WASM PNG) | `ParentSummaryCard` |

**Implementation Details:**

```typescript
// Parent summary card shows share image option when flag enabled
function ParentSummaryCard({ summary }) {
  const { useParentSummaryShareImage } = useUXFeatureFlags();

  return (
    <Card>
      {/* ... summary content ... */}
      {useParentSummaryShareImage && (
        <Button onClick={handleShareImage}>
          Share as Image
        </Button>
      )}
    </Card>
  );
}
```

---

### Phase 18: Voice Notes Features (2 flags)

| Flag | Type | Purpose | Used In |
|------|------|---------|---------|
| `voice_notes_whatsapp` | boolean | Enable WhatsApp integration for voice notes via Twilio | Voice notes feature |
| `voice_notes_ai_model_display` | boolean | Show coaches which AI models are used for transcription/insights | Voice notes UI |

---

## A/B Testing Flags

### Quick Actions Variants (3 flags)

These flags are mutually exclusive - only one should be enabled at a time for A/B testing.

| Flag | Variant | Description |
|------|---------|-------------|
| `ux_quick_actions_fab` | FAB (Header) | Floating action button in header with dropdown menu |
| `ux_quick_actions_horizontal` | Horizontal Scroll | Icon-only horizontal scroll (~70px height, iOS Control Center style) |
| `ux_quick_actions_two_tier` | Two-Tier | 3 large primary actions + "More Actions" bottom sheet |
| *(none enabled)* | Control | Collapsible grid (current default) |

**Implementation Details:**

```typescript
function getQuickActionsVariant(isFeatureEnabled): QuickActionsVariant {
  if (isFeatureEnabled("ux_quick_actions_fab")) return "fab";
  if (isFeatureEnabled("ux_quick_actions_horizontal")) return "horizontal";
  if (isFeatureEnabled("ux_quick_actions_two_tier")) return "two-tier";
  return "control"; // Default collapsible grid
}
```

**Analytics Events:**
- `ux_quick_actions_variant_viewed` - Tracked on component mount
- `ux_quick_actions_action_clicked` - Tracked with variant and action name

### Admin Navigation Variants (3 flags)

These flags are mutually exclusive - only one should be enabled at a time.

| Flag | Variant | Description |
|------|---------|-------------|
| `ux_admin_nav_sidebar` | Sidebar | Collapsible sidebar navigation |
| `ux_admin_nav_bottomsheet` | Bottom Sheet | Mobile-style bottom sheet navigation |
| `ux_admin_nav_tabs` | Tabs | Tab-based navigation at top |
| *(none enabled)* | Current | Existing navigation style |

---

## Feature Flag Usage Examples

### Example 1: Simple Boolean Flag

```typescript
function MyComponent() {
  const { useMobileCards } = useUXFeatureFlags();

  if (useMobileCards) {
    return <CardView data={data} />;
  }
  return <TableView data={data} />;
}
```

### Example 2: Conditional Rendering

```typescript
function Dashboard() {
  const { usePWAInstallPrompt, useOfflineIndicator } = useUXFeatureFlags();

  return (
    <div>
      {useOfflineIndicator && <OfflineIndicator />}
      {usePWAInstallPrompt && <PWAInstallPrompt />}
      <MainContent />
    </div>
  );
}
```

### Example 3: Style Variations

```typescript
function ThemedButton() {
  const { useThemeContrastColors } = useUXFeatureFlags();

  return (
    <button
      style={{
        backgroundColor: 'var(--org-primary)',
        color: useThemeContrastColors
          ? 'var(--org-primary-contrast)'  // Auto black/white
          : 'white'                         // Legacy default
      }}
    >
      Click me
    </button>
  );
}
```

### Example 4: A/B Test Variant Selection

```typescript
function QuickActions(props) {
  const { quickActionsVariant } = useUXFeatureFlags();

  switch (quickActionsVariant) {
    case "fab":
      return <FABQuickActions {...props} />;
    case "horizontal":
      return <HorizontalScrollQuickActions {...props} />;
    case "two-tier":
      return <TwoTierQuickActions {...props} />;
    default:
      return <CollapsibleGridQuickActions {...props} />;
  }
}
```

---

## Administration

### Enabling/Disabling Flags

1. Log in to PostHog dashboard (https://eu.i.posthog.com)
2. Navigate to **Feature Flags**
3. Find the flag by name (e.g., `ux_enhanced_tables`)
4. Toggle the flag on/off
5. Changes take effect within 5 minutes (cookie TTL)

### Creating New Flags

1. In PostHog, click **New Feature Flag**
2. Use naming convention: `ux_feature_name` or `category_feature_name`
3. Set rollout percentage (100% for full rollout)
4. Add to `use-ux-feature-flags.ts`:

```typescript
// In UXFeatureFlags type
export type UXFeatureFlags = {
  // ...existing flags...
  useNewFeature: boolean;
};

// In useUXFeatureFlags hook
export function useUXFeatureFlags(): UXFeatureFlags {
  const { isFeatureEnabled } = useAnalytics();

  return {
    // ...existing flags...
    useNewFeature: isFeatureEnabled("ux_new_feature"),
  };
}
```

### Monitoring Flag Usage

Use PostHog's **Insights** to track:
- How many users have each flag enabled
- Feature adoption rates
- A/B test conversion metrics

---

## Complete Flag Reference Table

| # | Flag Name | Phase | Type | Default | Purpose |
|---|-----------|-------|------|---------|---------|
| 1 | `ux_bottom_nav` | 1 | boolean | false | Mobile bottom navigation |
| 2 | `ux_touch_targets_44px` | 1 | boolean | false | 44px touch targets |
| 3 | `ux_admin_nav_sidebar` | 1 | boolean | false | Admin sidebar nav A/B |
| 4 | `ux_admin_nav_bottomsheet` | 1 | boolean | false | Admin bottom sheet nav A/B |
| 5 | `ux_admin_nav_tabs` | 1 | boolean | false | Admin tabs nav A/B |
| 6 | `ux_app_shell` | 1 | boolean | false | New AppShell layout |
| 7 | `ux_hover_actions` | 1 | boolean | false | Desktop hover actions |
| 8 | `ux_responsive_inputs` | 1 | boolean | false | Responsive input sizing |
| 9 | `ux_mobile_cards` | 2 | boolean | false | Card-based mobile display |
| 10 | `ux_skeleton_loaders` | 2 | boolean | false | Skeleton loading states |
| 11 | `ux_enhanced_tables` | 2 | boolean | false | Enhanced data tables |
| 12 | `ux_swipe_cards` | 2 | boolean | false | Swipe actions on cards |
| 13 | `ux_pull_to_refresh` | 2 | boolean | false | Pull-to-refresh gesture |
| 14 | `ux_responsive_forms` | 3 | boolean | false | Mobile-optimized forms |
| 15 | `ux_command_menu` | 4 | boolean | false | Cmd+K command palette |
| 16 | `ux_responsive_dialogs` | 4 | boolean | false | Responsive dialogs |
| 17 | `ux_keyboard_shortcuts_overlay` | 5 | boolean | false | Keyboard shortcuts help |
| 18 | `ux_density_toggle` | 5 | boolean | false | UI density toggle |
| 19 | `ux_offline_indicator` | 5 | boolean | false | Offline status indicator |
| 20 | `ux_pwa_install_prompt` | 5 | boolean | false | PWA install prompt |
| 21 | `ux_resizable_sidebar` | 5 | boolean | false | Resizable sidebar |
| 22 | `ux_pinned_favorites` | 5 | boolean | false | Pinned favorites |
| 23 | `ux_recent_items` | 5 | boolean | false | Recent items history |
| 24 | `ux_context_menu` | 10 | boolean | false | Responsive context menus |
| 25 | `ux_action_sheet` | 10 | boolean | false | Action sheets |
| 26 | `ux_inline_edit` | 10 | boolean | false | Inline editing |
| 27 | `ux_service_worker` | 11 | boolean | false | Service worker |
| 28 | `ux_offline_support` | 11 | boolean | false | Offline support |
| 29 | `ux_pwa_update_prompt` | 11 | boolean | false | PWA update prompt |
| 30 | `ux_skip_links` | 12 | boolean | false | Skip to content links |
| 31 | `ux_focus_visible` | 12 | boolean | false | Enhanced focus indicators |
| 32 | `ux_reduced_motion` | 12 | boolean | false | Reduced motion support |
| 33 | `ux_announcer` | 12 | boolean | false | Screen reader announcements |
| 34 | `ux_lazy_components` | 13 | boolean | false | Lazy loading components |
| 35 | `ux_web_vitals` | 13 | boolean | false | Web Vitals monitoring |
| 36 | `ux_deferred_render` | 13 | boolean | false | Deferred rendering |
| 37 | `ux_resource_hints` | 13 | boolean | false | Resource hints |
| 38 | `ux_theme_enhanced` | 14 | boolean | false | Enhanced theme toggle |
| 39 | `ux_theme_contrast_colors` | 14 | boolean | false | Auto-contrast text colors |
| 40 | `ux_theme_dark_variants` | 14 | boolean | false | Dark mode adaptive colors |
| 41 | `ux_theme_smooth_transitions` | 14 | boolean | false | Smooth theme transitions |
| 42 | `ux_header_nav_minimal` | 14 | boolean | false | Minimal header nav |
| 43 | `ux_enhanced_user_menu` | 15 | boolean | false | Enhanced user menu |
| 44 | `ux_org_usage_tracking` | 15 | boolean | false | Org usage in user menu |
| 45 | `ux_logo_adaptive_visibility` | 16 | boolean | false | WCAG logo contrast |
| 46 | `parent_summary_share_image` | 17 | boolean | false | Share summary as image |
| 47 | `voice_notes_whatsapp` | 18 | boolean | false | WhatsApp voice notes |
| 48 | `voice_notes_ai_model_display` | 18 | boolean | false | Show AI models used |
| 49 | `ux_quick_actions_fab` | A/B | boolean | false | FAB quick actions |
| 50 | `ux_quick_actions_horizontal` | A/B | boolean | false | Horizontal quick actions |
| 51 | `ux_quick_actions_two_tier` | A/B | boolean | false | Two-tier quick actions |

---

## Related Files

| File | Purpose |
|------|---------|
| `apps/web/src/hooks/use-ux-feature-flags.ts` | Main feature flags hook (446 lines) |
| `apps/web/src/lib/analytics.ts` | `isFeatureEnabled()` wrapper |
| `apps/web/src/proxy.ts` | Server-side flag bootstrap |
| `apps/web/src/providers/posthog-provider.tsx` | Client-side PostHog init with bootstrap |
