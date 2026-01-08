# UX Feature Flags Guide

This guide explains how to enable, disable, and manage UX experimental features in the PDP platform.

## Overview

UX experimental features are controlled through **PostHog Feature Flags**:

- **Who can enable/disable features**: Only Platform Staff (with PostHog admin access)
- **Who sees enabled features**: ALL users (not restricted to staff)
- **Default state**: All features OFF until explicitly enabled

This ensures controlled rollout while allowing platform-wide testing when features are enabled.

---

## Prerequisites

Before enabling UX features, ensure you have:

- [ ] **Platform Staff status** in PDP (to access PostHog)
- [ ] **PostHog dashboard access** (posthog.com or eu.posthog.com)
- [ ] **Admin permissions** in PostHog to create/edit feature flags

> **Note**: Regular users cannot enable/disable features themselves. Only Platform Staff with PostHog access control the feature flags.

---

## Step 1: Get PostHog Access (Platform Staff Only)

Only Platform Staff users can access PostHog to enable/disable UX features.

### Becoming Platform Staff

1. Log in to PDP as an existing Platform Staff user
2. Navigate to **Platform** → **Staff Management** (`/platform/staff`)
3. Find the user who needs feature flag control
4. Click **Add as Platform Staff**
5. Share PostHog credentials with the new staff member

### First-Time Setup (No Existing Staff)

The first user to register on a new PDP instance is automatically granted Platform Staff status.

### PostHog Access

Once you're Platform Staff, you need PostHog credentials:
1. Contact your team lead for PostHog login details
2. Or request access at posthog.com to your organization's project

---

## Step 2: Configure PostHog Feature Flags

### Accessing PostHog

1. Go to [PostHog](https://app.posthog.com) and log in
2. Select your PDP project
3. Navigate to **Feature Flags** in the left sidebar

### Available Feature Flags by Phase

#### Phase 0 & 1: Navigation & Touch Targets

| Flag Name | Description | Effect |
|-----------|-------------|--------|
| `ux_admin_nav_sidebar` | Grouped sidebar navigation | Replaces 16 horizontal tabs with 4 collapsible groups in Admin Panel |
| `ux_admin_nav_bottomsheet` | Bottom sheet admin nav (mobile) | Opens admin sections in a bottom sheet on mobile |
| `ux_admin_nav_tabs` | Scrollable tabs for admin nav | Uses horizontally scrollable tabs for admin navigation |
| `ux_bottom_nav` | Mobile bottom navigation | Adds persistent bottom navigation bar on mobile |
| `ux_touch_targets_44px` | 44px touch targets | Enforces minimum 44px touch targets (Apple/Google standard) |

#### Phase 2: Data Display Components

| Flag Name | Description | Effect |
|-----------|-------------|--------|
| `ux_mobile_cards` | Card-based mobile display | Uses cards instead of tables for data on mobile |
| `ux_skeleton_loaders` | Skeleton loading states | Shows skeleton UI while content loads |

#### Phase 3: Forms & Inputs

| Flag Name | Description | Effect |
|-----------|-------------|--------|
| `ux_responsive_forms` | Responsive form components | Mobile-optimized forms with 48px inputs, sticky submit, keyboard shortcuts (⌘S, Esc) |

#### Phase 4: Interactions & Feedback

| Flag Name | Description | Effect |
|-----------|-------------|--------|
| `ux_command_menu` | Command palette (Cmd+K) | Global search and navigation via keyboard shortcut |
| `ux_responsive_dialogs` | Responsive dialogs | Bottom sheet on mobile, centered modal on desktop |

#### Phase 5: Polish & Platform Features

| Flag Name | Description | Effect |
|-----------|-------------|--------|
| `ux_keyboard_shortcuts_overlay` | Keyboard shortcuts help | Press ? to show all keyboard shortcuts (desktop only) |
| `ux_density_toggle` | Density toggle | Compact/comfortable/spacious density options (⌘D to cycle) |
| `ux_offline_indicator` | Offline indicator | Shows banner when offline, "reconnected" when back online |
| `ux_pwa_install_prompt` | PWA install prompt | Shows "Add to Home Screen" prompt |
| `ux_resizable_sidebar` | Resizable sidebar | Allow dragging sidebar edge to resize |
| `ux_pinned_favorites` | Pinned favorites | Pin pages to quick access list |
| `ux_recent_items` | Recent items | Track and show recently visited pages |

#### Phase 7: Table Migration

| Flag Name | Description | Effect |
|-----------|-------------|--------|
| `ux_enhanced_tables` | Enhanced table features | Column visibility, bulk selection, export, sorting |
| `ux_swipe_cards` | Swipe actions on cards | Swipe left/right to reveal actions on mobile |
| `ux_pull_to_refresh` | Pull to refresh | Pull down on lists to refresh data |

#### Phase 10: Context Menu & Interactions

| Flag Name | Description | Effect |
|-----------|-------------|--------|
| `ux_context_menu` | Context menus | Right-click (desktop) / long-press (mobile) context menus |
| `ux_action_sheet` | Action sheets | Bottom sheet (mobile) / dropdown (desktop) action menus |
| `ux_inline_edit` | Inline editing | Double-click (desktop) / tap (mobile) to edit in place |

#### Phase 11: PWA & Offline

| Flag Name | Description | Effect |
|-----------|-------------|--------|
| `ux_service_worker` | Service worker | Enable service worker registration and caching |
| `ux_offline_support` | Offline support | Cache pages for offline access |
| `ux_pwa_update_prompt` | PWA update prompt | Show toast when new app version available |

#### Phase 12: Accessibility

| Flag Name | Description | Effect |
|-----------|-------------|--------|
| `ux_skip_links` | Skip links | "Skip to main content" link for keyboard users |
| `ux_focus_visible` | Focus indicators | Enhanced visible focus rings on all elements |
| `ux_reduced_motion` | Reduced motion | Respect prefers-reduced-motion setting |
| `ux_announcer` | Screen reader announcements | Programmatic announcements for screen readers |

#### Phase 13: Performance

| Flag Name | Description | Effect |
|-----------|-------------|--------|
| `ux_lazy_components` | Lazy loading | Load components only when visible |
| `ux_web_vitals` | Web Vitals monitoring | Track LCP, FID, CLS, FCP, TTFB |
| `ux_deferred_render` | Deferred rendering | Defer non-critical content to idle time |
| `ux_resource_hints` | Resource hints | Preconnect, DNS prefetch, prefetch hints |

#### Phase 14: Theme & Org Colors

| Flag Name | Description | Effect |
|-----------|-------------|--------|
| `ux_theme_enhanced` | Enhanced theme toggle | Theme toggle with checkmark indicator, ARIA attributes, icons |
| `ux_theme_contrast_colors` | Auto-contrast text colors | Automatically picks black/white text based on org background luminance (WCAG) |
| `ux_theme_dark_variants` | Dark mode color adaptation | Lightens dark org colors in dark mode for better visibility |

#### Quick Reference: All Flags (39 Total)

| Phase | Flag Name | Default | Description |
|-------|-----------|---------|-------------|
| 1 | `ux_admin_nav_sidebar` | OFF | Grouped sidebar navigation |
| 1 | `ux_admin_nav_bottomsheet` | OFF | Bottom sheet admin nav |
| 1 | `ux_admin_nav_tabs` | OFF | Tabs admin nav |
| 1 | `ux_bottom_nav` | OFF | Mobile bottom navigation |
| 1 | `ux_touch_targets_44px` | OFF | 44px touch targets |
| 1 | `ux_app_shell` | OFF | AppShell responsive layout |
| 1 | `ux_hover_actions` | OFF | Desktop hover-reveal actions |
| 1 | `ux_responsive_inputs` | OFF | Responsive input sizing |
| 2 | `ux_mobile_cards` | OFF | Card-based mobile display |
| 2 | `ux_skeleton_loaders` | OFF | Skeleton loading states |
| 3 | `ux_responsive_forms` | OFF | Mobile-optimized forms |
| 4 | `ux_command_menu` | OFF | Command palette (⌘K) |
| 4 | `ux_responsive_dialogs` | OFF | Responsive dialogs |
| 5 | `ux_keyboard_shortcuts_overlay` | OFF | Keyboard shortcuts help |
| 5 | `ux_density_toggle` | OFF | Density toggle |
| 5 | `ux_offline_indicator` | OFF | Offline status indicator |
| 5 | `ux_pwa_install_prompt` | OFF | PWA install prompt |
| 5 | `ux_resizable_sidebar` | OFF | Resizable sidebar |
| 5 | `ux_pinned_favorites` | OFF | Pinned favorites |
| 5 | `ux_recent_items` | OFF | Recent items history |
| 7 | `ux_enhanced_tables` | OFF | Enhanced table features |
| 7 | `ux_swipe_cards` | OFF | Swipe actions on cards |
| 7 | `ux_pull_to_refresh` | OFF | Pull to refresh |
| 10 | `ux_context_menu` | OFF | Context menus |
| 10 | `ux_action_sheet` | OFF | Action sheets |
| 10 | `ux_inline_edit` | OFF | Inline editing |
| 11 | `ux_service_worker` | OFF | Service worker |
| 11 | `ux_offline_support` | OFF | Offline support |
| 11 | `ux_pwa_update_prompt` | OFF | PWA update prompt |
| 12 | `ux_skip_links` | OFF | Skip links |
| 12 | `ux_focus_visible` | OFF | Focus indicators |
| 12 | `ux_reduced_motion` | OFF | Reduced motion |
| 12 | `ux_announcer` | OFF | Screen reader announcements |
| 13 | `ux_lazy_components` | OFF | Lazy loading |
| 13 | `ux_web_vitals` | OFF | Web Vitals monitoring |
| 13 | `ux_deferred_render` | OFF | Deferred rendering |
| 13 | `ux_resource_hints` | OFF | Resource hints |
| 14 | `ux_theme_enhanced` | OFF | Enhanced theme toggle |
| 14 | `ux_theme_contrast_colors` | OFF | Auto-contrast text colors |
| 14 | `ux_theme_dark_variants` | OFF | Dark mode color adaptation |

---

## Automated Setup: Create All Flags with Script

Instead of creating flags manually, use the provided script to create all 36 UX feature flags at once.

### Prerequisites

1. **Get your PostHog Personal API Key**:
   - Go to PostHog → Settings → Personal API Keys
   - Create a new key with "Feature Flags" write permission
   - Copy the key (starts with `phx_`)

2. **Get your Project ID**:
   - Go to PostHog → Settings → Project Settings
   - The Project ID is in the URL: `https://eu.posthog.com/project/{PROJECT_ID}/...`

### Run the Script

```bash
# Dry run first (no changes made)
POSTHOG_API_KEY=phx_xxx POSTHOG_PROJECT_ID=12345 node scripts/create-posthog-feature-flags.mjs --dry-run

# Create all flags (disabled by default)
POSTHOG_API_KEY=phx_xxx POSTHOG_PROJECT_ID=12345 node scripts/create-posthog-feature-flags.mjs

# Create and enable all flags at 100% rollout
POSTHOG_API_KEY=phx_xxx POSTHOG_PROJECT_ID=12345 node scripts/create-posthog-feature-flags.mjs --enable-all
```

### Script Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Show what would be created without making API calls |
| `--enable-all` | Enable all flags at 100% rollout (default: disabled) |
| `--host <url>` | PostHog host URL (default: https://eu.posthog.com) |
| `--project-id <id>` | PostHog project ID (alternative to env var) |

### Expected Output

```
═══════════════════════════════════════════════════════════════
  PostHog UX Feature Flags Setup
═══════════════════════════════════════════════════════════════

  Host:        https://eu.posthog.com
  Project ID:  12345
  Enable All:  No (0% rollout)
  Total Flags: 37

Phase 1 (8 flags)
──────────────────────────────────────────────────────
  ✅ ux_admin_nav_sidebar - created (ID: 123)
  ✅ ux_bottom_nav - created (ID: 124)
  ...

═══════════════════════════════════════════════════════════════
  Summary
═══════════════════════════════════════════════════════════════
  Created:  37
  Skipped:  0 (already exist)
  Errors:   0
```

---

## Step 3: Create a Feature Flag in PostHog (Manual)

### 3.1 Create New Flag

1. Click **+ New feature flag**
2. Enter the **Key** (e.g., `ux_admin_nav_sidebar`)
3. Add a **Description** (optional but recommended)

### 3.2 Configure Rollout

Choose how the flag is distributed:

#### Option A: Enable for All Platform Staff (Recommended for Internal Testing)
```
Release conditions:
└── Match: 100% of users
```
The platform staff check happens in-app, so all staff will see the feature.

#### Option B: Gradual Rollout to Staff
```
Release conditions:
└── Match: 25% of users
```
Only 25% of platform staff will see the feature (useful for A/B testing).

#### Option C: Specific Users Only
```
Release conditions:
└── User property: email
    └── matches: john@example.com, jane@example.com
```
Only these specific users will see the feature.

### 3.3 Enable the Flag

1. Toggle **Enabled** to ON
2. Click **Save**

---

## Step 4: Verify the Feature is Active

### Check in the Application

1. Log in as **any user** (features apply to all users when enabled)
2. Navigate to the relevant section:
   - For `ux_admin_nav_sidebar`: Go to any organization's Admin Panel
3. The new UI should be visible to everyone

### Debug via Browser Console

Open browser DevTools and check for PostHog logs:
```javascript
// In browser console
posthog.getFeatureFlag('ux_admin_nav_sidebar')
// Returns: true (enabled) or false (disabled)
```

---

## Step 5: Disable a Feature

### Temporary Disable (Keep Configuration)

1. Go to **Feature Flags** in PostHog
2. Find the flag
3. Toggle **Enabled** to OFF
4. Click **Save**

### Permanent Removal

1. Go to **Feature Flags** in PostHog
2. Find the flag
3. Click the **...** menu → **Delete**

---

## Troubleshooting

### Feature Not Appearing

| Issue | Solution |
|-------|----------|
| Feature flag not enabled | Enable the flag in PostHog and set 100% rollout |
| Rollout percentage too low | Increase rollout to 100% for full visibility |
| PostHog not loading | Check browser network tab for PostHog requests |
| Caching issue | Hard refresh the page (Ctrl+Shift+R) |

### Can't Access PostHog

| Issue | Solution |
|-------|----------|
| Not Platform Staff | Get added via `/platform/staff` by existing staff |
| No PostHog credentials | Request from team lead or existing admin |

### Check Platform Staff Status

```sql
-- In Convex Dashboard > Data
-- Check users table for isPlatformStaff = true
```

Or in the app, check if the user can access `/platform` routes.

---

## Feature Flag Combinations

Some features work best together:

### Recommended: Mobile UX Bundle
```
Enable all:
├── ux_bottom_nav
├── ux_mobile_cards
└── ux_touch_targets_44px
```

### Recommended: Admin Navigation Update
```
Enable:
└── ux_admin_nav_sidebar
```

---

## Rollout Process

### Phase 1: Internal Testing
1. Enable flags for 100% of users in PostHog
2. **All users** (not just staff) will see the feature
3. Platform Staff collect feedback from users

### Phase 2: A/B Testing (Optional)
1. Set rollout to 50%
2. Compare metrics between groups
3. Use PostHog analytics to measure impact

### Phase 3: Full Rollout (Make Permanent)
1. Keep flags enabled at 100%
2. Or update code to make the feature the default (remove flag check)
3. Archive the feature flag in PostHog

---

## Code Reference

### Phase 2 Data Display Components

Located in `apps/web/src/components/data-display/`:

| Component | Description | Usage |
|-----------|-------------|-------|
| `ResponsiveDataView` | Shows cards on mobile, table on desktop | Main data display component |
| `SwipeableCard` | Card with swipe-to-reveal actions | Mobile list items |

Located in `apps/web/src/hooks/`:

| Hook | Description | Usage |
|------|-------------|-------|
| `usePullToRefresh` | Pull-to-refresh gesture handling | Mobile list refresh |

### Phase 3 Form Components

Located in `apps/web/src/components/forms/`:

| Component | Description | Usage |
|-----------|-------------|-------|
| `ResponsiveForm` | Form wrapper with sticky submit (mobile) and keyboard shortcuts (desktop) | Wrap form fields |
| `ResponsiveFormSection` | Section with title/description | Group related fields |
| `ResponsiveFormRow` | Side-by-side fields on desktop | Layout 2-4 fields in a row |
| `ResponsiveInput` | 48px height on mobile, 40px on desktop, inline validation | Text inputs |
| `ResponsiveTextarea` | Larger on mobile, auto-grow option | Multi-line text |
| `ResponsiveSelect` | Wrapper for Select with responsive sizing | Dropdowns |

#### Usage Example

```tsx
import {
  ResponsiveForm,
  ResponsiveFormSection,
  ResponsiveFormRow,
  ResponsiveInput,
  ResponsiveTextarea,
} from "@/components/forms";
```

### Phase 4 Interaction Components

Located in `apps/web/src/components/interactions/`:

| Component | Description | Usage |
|-----------|-------------|-------|
| `CommandMenu` | Global command palette (Cmd+K) | Search, navigation, actions |
| `ResponsiveDialog` | Sheet on mobile, modal on desktop | Confirmations, forms |
| `ConfirmationDialog` | Pre-built confirm/cancel dialog | Delete actions, warnings |
| `ResponsiveDialogClose` | Close button for responsive dialogs | Inside dialog footer |

| Hook | Description | Usage |
|------|-------------|-------|
| `useGlobalShortcuts` | Register global keyboard shortcuts | Custom shortcuts |

#### Command Menu Usage

```tsx
import { CommandMenu } from "@/components/interactions";

// In your layout or header component
<CommandMenu
  orgId={orgId}
  showDefaultItems={true}
  items={[
    {
      id: "custom-action",
      label: "My Custom Action",
      icon: <Star className="mr-2 h-4 w-4" />,
      shortcut: "⌘M",
      onSelect: () => doSomething(),
      group: "Actions",
    },
  ]}
/>
```

#### Responsive Dialog Usage

```tsx
import { ResponsiveDialog, ConfirmationDialog } from "@/components/interactions";
import { Button } from "@/components/ui/button";

// Simple responsive dialog
<ResponsiveDialog
  trigger={<Button>Open Dialog</Button>}
  title="Edit Player"
  description="Update player information"
  footer={
    <Button onClick={handleSave}>Save Changes</Button>
  }
>
  <form>
    {/* Form content */}
  </form>
</ResponsiveDialog>

// Confirmation dialog (delete, etc.)
const [showConfirm, setShowConfirm] = useState(false);

<ConfirmationDialog
  open={showConfirm}
  onOpenChange={setShowConfirm}
  title="Delete Player"
  description="Are you sure you want to delete this player? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  destructive={true}
  onConfirm={async () => {
    await deletePlayer(playerId);
  }}
/>
```

#### Global Keyboard Shortcuts

```tsx
import { useGlobalShortcuts } from "@/components/interactions";

// Register custom shortcuts
useGlobalShortcuts({
  "cmd+n": () => router.push("/new"),
  "cmd+s": () => handleSave(),
  "?": () => setShowHelp(true),
});
```

### Phase 5 Polish Components

Located in `apps/web/src/components/polish/`:

| Component | Description | Usage |
|-----------|-------------|-------|
| `KeyboardShortcutsOverlay` | Shows all keyboard shortcuts when ? is pressed | Add to root layout |
| `DensityProvider` | Context provider for density settings | Wrap app root |
| `DensityToggle` | Toggle button/dropdown for density | Add to header/toolbar |
| `OfflineIndicator` | Banner when offline/reconnected | Add to root layout |
| `OfflineBadge` | Small offline badge for headers | Compact offline indicator |
| `OfflineWrapper` | Wrapper that disables content when offline | Wrap network-dependent content |
| `OfflineContent` | Default "you're offline" placeholder | Show when content unavailable |

| Hook | Description | Usage |
|------|-------------|-------|
| `useDensity` | Access current density and setter | Density-aware components |
| `useDensityClasses` | Get density-specific CSS classes | Styling |
| `useOnlineStatus` | Track online/offline status | Custom offline handling |
| `useKeyboardShortcutsOverlay` | Control overlay programmatically | Custom trigger |

#### Keyboard Shortcuts Overlay Usage

```tsx
import { KeyboardShortcutsOverlay } from "@/components/polish";

// In your root layout - automatically listens for ? key
<KeyboardShortcutsOverlay />

// With custom shortcuts
<KeyboardShortcutsOverlay
  shortcuts={[
    {
      name: "Navigation",
      shortcuts: [
        { keys: ["⌘", "K"], description: "Open command palette" },
        { keys: ["G", "P"], description: "Go to Players" },
      ],
    },
    // ... more categories
  ]}
/>
```

#### Density Toggle Usage

```tsx
import { DensityProvider, DensityToggle, useDensityClasses } from "@/components/polish";

// In your root layout - wrap the app
<DensityProvider defaultDensity="comfortable" persist={true}>
  <App />
</DensityProvider>

// In your header/toolbar - add the toggle
<DensityToggle variant="dropdown" /> {/* or variant="cycle" */}

// In components - use density-aware classes
function MyList() {
  const { spacing, rowHeight, cardPadding } = useDensityClasses();
  
  return (
    <div className={spacing}>
      {items.map(item => (
        <div className={cn("flex items-center", rowHeight)}>
          {item.name}
        </div>
      ))}
    </div>
  );
}
```

#### Offline Indicator Usage

```tsx
import { 
  OfflineIndicator, 
  OfflineBadge, 
  OfflineWrapper, 
  OfflineContent,
  useOnlineStatus 
} from "@/components/polish";

// In root layout - shows banner when offline
<OfflineIndicator position="top" />

// In header - shows small badge when offline
<OfflineBadge />

// Wrap content that needs network
<OfflineWrapper
  offlineContent={<OfflineContent title="Can't load players" />}
>
  <PlayerList />
</OfflineWrapper>

// Custom offline handling
function MyComponent() {
  const { isOnline, wasOffline } = useOnlineStatus();
  
  if (!isOnline) {
    return <OfflineContent />;
  }
  
  return <div>Online content here</div>;
}
```

#### Phase 3 Form Example

```tsx
import {
  ResponsiveForm,
  ResponsiveFormSection,
  ResponsiveFormRow,
  ResponsiveInput,
  ResponsiveTextarea,
} from "@/components/forms";

<ResponsiveForm
  onSubmit={handleSubmit}
  isLoading={isSaving}
  submitText="Save Player"
  onCancel={() => router.back()}
  enableShortcuts  // Enables Cmd+S and Esc
>
  <ResponsiveFormSection title="Personal Info">
    <ResponsiveFormRow columns={2}>
      <ResponsiveInput
        label="First Name"
        required
        error={errors.firstName}
        value={form.firstName}
        onChange={handleChange}
      />
      <ResponsiveInput
        label="Last Name"
        required
        error={errors.lastName}
        value={form.lastName}
        onChange={handleChange}
      />
    </ResponsiveFormRow>
    
    <ResponsiveInput
      type="email"
      label="Email"
      helpText="Optional contact email"
    />
    
    <ResponsiveTextarea
      label="Notes"
      autoGrow
      placeholder="Additional notes..."
    />
  </ResponsiveFormSection>
</ResponsiveForm>
```

### Feature Flag Hook Location
```
apps/web/src/hooks/use-ux-feature-flags.ts
```

### How It Works in Code
```typescript
// In any component
const { adminNavStyle, useBottomNav } = useUXFeatureFlags();

// When flag is OFF (default):
// { adminNavStyle: "current", useBottomNav: false, ... }

// When flag is ON (enabled in PostHog):
// { adminNavStyle: "sidebar", useBottomNav: true, ... }

// Features apply to ALL users when enabled
```

### Admin Layout Integration
```
apps/web/src/app/orgs/[orgId]/admin/layout.tsx
```

---

## Quick Reference Commands

### Enable Sidebar Navigation for Testing
1. PostHog → Feature Flags → New
2. Key: `ux_admin_nav_sidebar`
3. Rollout: 100%
4. Enable → Save

### Disable All Experimental Features
1. PostHog → Feature Flags
2. Disable all `ux_*` flags

### Check Current User Status
Navigate to `/platform/staff` to see all platform staff members.

---

## Verifying Phase 0, 1 & 2 Changes

### Phase 0 & 1: Navigation & Touch Targets

#### Verify Grouped Sidebar Navigation
1. Enable `ux_admin_nav_sidebar` in PostHog (100% rollout)
2. Log in to any organization
3. Navigate to **Admin Panel**
4. **Expected**: 4 collapsible groups instead of 16 horizontal tabs:
   - People (Players, Coaches, Guardians, Users)
   - Teams & Data (Teams, Overrides, Import)
   - Insights (Dashboard Analytics)
   - Settings (Settings, Danger Zone)

#### Verify Bottom Navigation (Mobile)
1. Enable `ux_bottom_nav` in PostHog
2. Open app in Chrome DevTools mobile view (F12 → Ctrl+Shift+M)
3. Select iPhone or any device < 768px width
4. Refresh the page
5. **Expected**: Bottom navigation bar appears with role-specific icons

#### Verify 44px Touch Targets
1. Enable `ux_touch_targets_44px` in PostHog
2. View any page in mobile viewport
3. Inspect button elements
4. **Expected**: Buttons have `min-h-[44px]` on mobile

### Phase 2: Data Display Components

#### Verify ResponsiveDataView
1. Enable `ux_mobile_cards` in PostHog
2. Navigate to Admin → Players (or any list page using ResponsiveDataView)
3. **Desktop view**: Should show data table with sortable columns
4. **Mobile view**: Should show card-based layout

#### Test Mobile Cards
1. Open DevTools mobile view (< 768px)
2. View any data list
3. **Expected on mobile**:
   - Card layout with key info
   - Dropdown menu for actions (⋮ button)
   - Loading shows card skeletons

#### Test Desktop Table
1. View same page in desktop width (> 768px)
2. **Expected on desktop**:
   - Full table with all columns
   - Sortable column headers (click to sort)
   - Row hover reveals action button
   - Checkbox selection (if enabled)

### Phase 3: Responsive Forms

#### Verify Responsive Form Components
1. Enable `ux_responsive_forms` in PostHog (100% rollout)
2. Navigate to any form page (e.g., Add Player, Edit Player)
3. **Mobile view** (< 768px):
   - Input fields should be 48px tall
   - Labels should be larger (text-base)
   - Spacing between fields should be larger
   - Submit button should be sticky at bottom of screen
4. **Desktop view** (> 768px):
   - Input fields should be 40px tall
   - Should see keyboard shortcut hints (⌘S to save, Esc to cancel)
   - Press `Cmd+S` (Mac) or `Ctrl+S` (Windows) to submit form
   - Press `Esc` to cancel/close form

#### Test Mobile Form Features
1. Open DevTools mobile view (< 768px)
2. Navigate to a form
3. **Expected on mobile**:
   - 48px tall inputs (easy touch targets)
   - Sticky save button at bottom (fixed position)
   - Full-width buttons
   - Larger label text

#### Test Desktop Form Features
1. View same form in desktop width (> 768px)
2. **Expected on desktop**:
   - 40px tall inputs (standard size)
   - Side-by-side fields where applicable
   - Keyboard shortcut hints shown below form
   - First field auto-focused on page load

### Phase 4: Interactions & Feedback

#### Verify Command Menu (Cmd+K)
1. Enable `ux_command_menu` in PostHog (100% rollout)
2. Navigate to any page in the application
3. **Desktop**: Press `Cmd+K` (Mac) or `Ctrl+K` (Windows)
4. **Expected**:
   - Command palette opens with search input
   - Shows navigation options (Home, Players, Settings, etc.)
   - Shows actions (Add Player, Toggle Theme)
   - Keyboard shortcuts displayed next to items
   - Press Enter or click to navigate

#### Test Command Menu on Mobile
1. Open DevTools mobile view (< 768px)
2. Tap the search button in the header
3. **Expected on mobile**:
   - Full-screen search experience
   - Larger touch targets for items
   - No keyboard shortcut hints (mobile-appropriate)

#### Verify Responsive Dialogs
1. Enable `ux_responsive_dialogs` in PostHog (100% rollout)
2. Trigger any confirmation dialog (e.g., delete action)
3. **Mobile view** (< 768px):
   - Dialog appears as bottom sheet
   - Drag handle at top
   - Full-width buttons (48px tall)
   - Easy to dismiss by swiping down
4. **Desktop view** (> 768px):
   - Dialog appears as centered modal
   - Close button in corner
   - Standard button sizes
   - Keyboard accessible (Esc to close)

### Phase 5: Polish & Platform Features

#### Verify Keyboard Shortcuts Overlay
1. Enable `ux_keyboard_shortcuts_overlay` in PostHog (100% rollout)
2. Navigate to any page in the application
3. **Desktop only**: Press `?` key (without Shift)
4. **Expected**:
   - Modal overlay opens showing all keyboard shortcuts
   - Grouped by category: Navigation, Actions, Data & Selection, View
   - Press `Esc` to close
5. **Note**: This feature is desktop-only, hidden on mobile

#### Verify Density Toggle
1. Enable `ux_density_toggle` in PostHog (100% rollout)
2. Add `<DensityProvider>` wrapper to your app (see code reference)
3. Add `<DensityToggle />` component in your header/toolbar
4. **Test**:
   - Click toggle to see dropdown with 3 options
   - Or press `Cmd+D` (Mac) / `Ctrl+D` (Windows) to cycle
5. **Expected per density**:
   - **Compact**: Tight spacing, smaller fonts, 32px rows
   - **Comfortable**: Balanced spacing, 40px rows (default)
   - **Spacious**: More breathing room, larger fonts, 48px rows
6. **Persistence**: Preference saved in localStorage

#### Verify Offline Indicator
1. Enable `ux_offline_indicator` in PostHog (100% rollout)
2. Add `<OfflineIndicator />` to your root layout
3. **Test offline**:
   - Open DevTools → Network tab
   - Select "Offline" from throttle dropdown
   - **Expected**: Yellow banner appears "You're offline"
4. **Test reconnect**:
   - Disable "Offline" in DevTools
   - **Expected**: Green banner appears "You're back online!" (disappears after 3s)

### Quick Verification Checklist

| Feature | PostHog Flag | How to Test | Expected Result |
|---------|--------------|-------------|-----------------|
| Grouped Sidebar | `ux_admin_nav_sidebar` | Admin Panel | 4 collapsible groups |
| Bottom Nav | `ux_bottom_nav` | Mobile viewport | Nav bar at bottom |
| 44px Touch | `ux_touch_targets_44px` | Inspect buttons on mobile | min-h-[44px] |
| Mobile Cards | `ux_mobile_cards` | Data list on mobile | Card layout |
| Skeleton Loaders | `ux_skeleton_loaders` | Slow network (DevTools) | Skeleton animation |
| Responsive Forms | `ux_responsive_forms` | Any form on mobile | 48px inputs, sticky submit |
| Command Menu | `ux_command_menu` | Press Cmd+K | Command palette opens |
| Responsive Dialogs | `ux_responsive_dialogs` | Trigger delete confirmation | Sheet on mobile, modal on desktop |
| Keyboard Shortcuts | `ux_keyboard_shortcuts_overlay` | Press ? on desktop | Shortcuts overlay opens |
| Density Toggle | `ux_density_toggle` | Press Cmd+D | Cycles compact/comfortable/spacious |
| Offline Indicator | `ux_offline_indicator` | Go offline in DevTools | Yellow "offline" banner |

### Browser DevTools Quick Reference

1. **Open DevTools**: `F12` or `Ctrl+Shift+I`
2. **Toggle Mobile View**: `Ctrl+Shift+M`
3. **Select Device**: Use dropdown to pick iPhone, Pixel, etc.
4. **Simulate Slow Network**: Network tab → Throttle → Slow 3G
5. **Clear Cache**: Network tab → Right-click → "Clear browser cache"

### Verify Feature Flag Status in Code

```javascript
// Open browser console and run:
posthog.getFeatureFlag('ux_admin_nav_sidebar')  // true or false
posthog.getFeatureFlag('ux_mobile_cards')       // true or false
posthog.getFeatureFlag('ux_bottom_nav')         // true or false
```

---

## Support

For issues with feature flags:
1. Check this guide's troubleshooting section
2. Verify PostHog configuration
3. Check browser console for errors
4. Review the `use-ux-feature-flags.ts` hook logic
