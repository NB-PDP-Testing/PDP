# Quick Actions System

**Status:** ✅ Implemented (January 2026)
**Feature Flag:** `ux_quick_actions_fab` (PostHog)
**Scope:** Coach section (`/orgs/[orgId]/coach/*`)

## Overview

The Quick Actions system provides a consistent, customizable menu of action buttons in the header bar across all coach pages. It uses React Context to share actions between the layout and individual pages, allowing for both default actions and page-specific customization.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    QuickActionsProvider                     │
│                  (React Context Provider)                   │
│                                                             │
│  State:                                                     │
│  - actions: QuickAction[]                                   │
│  - isMenuOpen: boolean                                      │
│                                                             │
│  Methods:                                                   │
│  - setActions(actions)                                      │
│  - clearActions()                                           │
│  - setIsMenuOpen(open)                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ provides context to
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Coach Layout                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Header Bar                                          │  │
│  │  ┌────────────────┐                                 │  │
│  │  │ Quick Actions  │ ← Reads actions from context    │  │
│  │  │    Button ⚡   │                                 │  │
│  │  └────────────────┘                                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Default Actions (if actions.length === 0):                │
│  - Sets 8 default navigation actions                       │
│  - Fires on layout mount if no actions registered          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ rendered inside layout
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 HeaderQuickActionsMenu                      │
│                  (Dropdown Component)                       │
│                                                             │
│  - Reads actions and isMenuOpen from context               │
│  - Renders dropdown menu when open                          │
│  - Displays icon + label + title for each action           │
│  - Tracks analytics when actions clicked                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ can be customized by
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Individual Coach Pages                         │
│                                                             │
│  Option 1: Use default actions (do nothing)                │
│  Option 2: Use usePageQuickActions hook to override        │
│                                                             │
│  usePageQuickActions([                                      │
│    { id, icon, label, title, onClick, color }              │
│  ]);                                                        │
│                                                             │
│  - Sets custom actions on mount                            │
│  - Clears actions on unmount (restores defaults)           │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
apps/web/src/
├── contexts/
│   └── quick-actions-context.tsx          # Context provider & types
├── hooks/
│   └── use-page-quick-actions.ts          # Hook for page-level customization
├── components/
│   └── quick-actions/
│       ├── header-quick-actions-menu.tsx  # Dropdown menu component
│       └── fab-variant.tsx                # (Legacy - removed in final version)
└── app/orgs/[orgId]/coach/
    ├── layout.tsx                         # Sets default actions
    ├── quick-actions-demo/page.tsx        # Demo of custom actions
    └── [other pages]/                     # Use defaults or override
```

## QuickAction Interface

```typescript
export interface QuickAction {
  id: string;                    // Unique identifier for the action
  icon: React.ElementType;       // Lucide icon component
  label: string;                 // Main action text (e.g., "Assess Players")
  title?: string;                // Optional description (e.g., "Rate player skills")
  onClick: () => void;           // Action handler
  color: string;                 // Tailwind classes for background color
}
```

### Field Guidelines

- **id**: Unique kebab-case identifier (e.g., `"assess-players"`)
- **icon**: Import from `lucide-react` (e.g., `Edit`, `Mic`, `Heart`)
- **label**: Action-oriented verb phrase (e.g., "Assess Players", "Generate Session Plan")
- **title**: Short description shown below label in menu (optional but recommended)
- **onClick**: Function that performs the action (navigate, open modal, trigger save, etc.)
- **color**: Tailwind background + hover classes (e.g., `"bg-blue-600 hover:bg-blue-700"`)

## Default Actions (Coach Layout)

The coach layout provides 8 default Quick Actions that appear on all pages unless overridden:

```typescript
const defaultActions = [
  {
    id: "assess",
    icon: Edit,
    label: "Assess Players",
    title: "Rate player skills & performance",
    onClick: () => router.push(`/orgs/${orgId}/coach/assess`),
    color: "bg-blue-600 hover:bg-blue-700",
  },
  {
    id: "session-plan",
    icon: Target,
    label: "Generate Session Plan",
    title: "AI-powered training session",
    onClick: () => router.push(`/orgs/${orgId}/coach`),
    color: "bg-purple-600 hover:bg-purple-700",
  },
  {
    id: "analytics",
    icon: FileText,
    label: "View Analytics",
    title: "Team performance insights",
    onClick: () => router.push(`/orgs/${orgId}/coach`),
    color: "bg-cyan-600 hover:bg-cyan-700",
  },
  {
    id: "voice-notes",
    icon: Mic,
    label: "Record Voice Note",
    title: "Quick audio observations",
    onClick: () => router.push(`/orgs/${orgId}/coach/voice-notes`),
    color: "bg-green-600 hover:bg-green-700",
  },
  {
    id: "injuries",
    icon: AlertCircle,
    label: "Report Injury",
    title: "Track player injuries",
    onClick: () => router.push(`/orgs/${orgId}/coach/injuries`),
    color: "bg-red-600 hover:bg-red-700",
  },
  {
    id: "goals",
    icon: Heart,
    label: "Manage Goals",
    title: "Development objectives",
    onClick: () => router.push(`/orgs/${orgId}/coach/goals`),
    color: "bg-pink-600 hover:bg-pink-700",
  },
  {
    id: "medical",
    icon: Stethoscope,
    label: "View Medical Info",
    title: "Health & emergency details",
    onClick: () => router.push(`/orgs/${orgId}/coach/medical`),
    color: "bg-amber-600 hover:bg-amber-700",
  },
  {
    id: "match-day",
    icon: Target,
    label: "View Match Day",
    title: "Emergency contacts & info",
    onClick: () => router.push(`/orgs/${orgId}/coach/match-day`),
    color: "bg-orange-600 hover:bg-orange-700",
  },
];
```

**Location:** `/apps/web/src/app/orgs/[orgId]/coach/layout.tsx` (lines 59-127)

## How to Customize Quick Actions on a Page

Individual pages can override the default actions using the `usePageQuickActions` hook:

### Example 1: Static Custom Actions

```tsx
import { usePageQuickActions } from "@/hooks/use-page-quick-actions";
import { Save, Download, Share } from "lucide-react";

export default function MyPage() {
  usePageQuickActions([
    {
      id: "save",
      icon: Save,
      label: "Save Changes",
      title: "Save current work",
      onClick: () => handleSave(),
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      id: "download",
      icon: Download,
      label: "Download Report",
      title: "Export as PDF",
      onClick: () => handleDownload(),
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      id: "share",
      icon: Share,
      label: "Share",
      title: "Share with team",
      onClick: () => handleShare(),
      color: "bg-purple-600 hover:bg-purple-700",
    },
  ]);

  return <div>Page content</div>;
}
```

### Example 2: Dynamic Actions Based on State

```tsx
import { useState } from "react";
import { usePageQuickActions } from "@/hooks/use-page-quick-actions";
import { Save, Upload, Trash } from "lucide-react";

export default function EditorPage() {
  const [isDraft, setIsDraft] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Actions change based on state
  usePageQuickActions(
    isDraft
      ? [
          {
            id: "save",
            icon: Save,
            label: hasChanges ? "Save Draft" : "Saved",
            title: hasChanges ? "Save your changes" : "All changes saved",
            onClick: () => {
              handleSave();
              setHasChanges(false);
            },
            color: hasChanges
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 hover:bg-gray-500",
          },
          {
            id: "publish",
            icon: Upload,
            label: "Publish",
            title: "Make content live",
            onClick: () => {
              handlePublish();
              setIsDraft(false);
            },
            color: "bg-green-600 hover:bg-green-700",
          },
        ]
      : [
          {
            id: "edit",
            icon: Edit,
            label: "Edit",
            title: "Return to draft mode",
            onClick: () => setIsDraft(true),
            color: "bg-purple-600 hover:bg-purple-700",
          },
        ]
  );

  return <div>Editor content</div>;
}
```

### How It Works

1. **On Mount**: `usePageQuickActions` calls `setActions()` with your custom actions
2. **During Lifecycle**: Actions are available in the header menu
3. **On Unmount**: Hook cleanup calls `clearActions()`, which triggers layout to restore defaults
4. **On Navigate**: When you navigate to another page without custom actions, defaults appear

## Demo Page

A comprehensive demo page shows all customization patterns:

**URL:** `/orgs/[orgId]/coach/quick-actions-demo`

**Features:**
- Interactive state toggles (Draft/Published mode)
- Real-time action updates
- Code examples with comments
- Visual feedback for different states

**See:** `/docs/ux/QUICK_ACTIONS_DEMO.md` for full demo documentation

## Feature Flag

The Quick Actions button appears in the header only when the feature flag is enabled:

**Flag Name:** `ux_quick_actions_fab`
**Platform:** PostHog
**Default:** Disabled (control group)

### Enabling the Flag

1. Log into PostHog dashboard
2. Navigate to Feature Flags
3. Find `ux_quick_actions_fab`
4. Enable for your user/organization/cohort

### Code Implementation

```tsx
// In coach layout (layout.tsx)
const { quickActionsVariant } = useUXFeatureFlags();

// Only render button if FAB variant is active
{quickActionsVariant === "fab" && actions.length > 0 && (
  <Button onClick={() => setIsMenuOpen(!isMenuOpen)}>
    <Zap className="h-4 w-4" />
    <span>Quick Actions</span>
  </Button>
)}
```

## Analytics & Tracking

Quick Actions automatically track two events using PostHog:

### 1. Variant Viewed
**Event:** `UXAnalyticsEvents.QUICK_ACTIONS_VARIANT_VIEWED`
**When:** Quick Actions menu component mounts
**Properties:**
- `variant: "header-fab"`

### 2. Action Clicked
**Event:** `UXAnalyticsEvents.QUICK_ACTIONS_ACTION_CLICKED`
**When:** User clicks any Quick Action
**Properties:**
- `variant: "header-fab"`
- `action: string` (label of clicked action)

**Implementation:** `/apps/web/src/components/quick-actions/header-quick-actions-menu.tsx`

## Development History

### Phase 1: Initial Implementation (Jan 2026)
- Created React Context for shared state (`QuickActionsContext`)
- Built header dropdown menu component (`HeaderQuickActionsMenu`)
- Added feature flag integration (`ux_quick_actions_fab`)
- Positioned button in header next to "Back to App" placeholder

### Phase 2: Layout Defaults
- Added 8 default navigation actions in coach layout
- Implemented automatic restoration when pages unmount
- Created `usePageQuickActions` hook for easy customization
- Built demo page showing all patterns

### Phase 3: Action-Oriented Design
- Updated all labels to use action verbs (e.g., "Assess Players" not "Assess")
- Added optional `title` field for descriptions
- Made actions consistent across all coach pages
- Removed dashboard-specific action variants

### Phase 4: Refinement
- Changed from navigation actions (View Dashboard, View Players) to feature actions
- Restored dashboard-style actions across all pages
- Ensured all 8 actions use clear, action-oriented language
- Matched icon set to original dashboard design

### Final State (be7225d)
All coach pages show identical Quick Actions:
1. Assess Players
2. Generate Session Plan
3. View Analytics
4. Record Voice Note
5. Report Injury
6. Manage Goals
7. View Medical Info
8. View Match Day

## Future Enhancement: User-Customizable Actions

**Status:** 📋 Planned (Not Implemented)

### Vision

Allow users to customize which Quick Actions appear in their menu:
- Select which actions to show/hide
- Reorder actions via drag-and-drop
- Set a maximum number of visible actions (e.g., 5 most-used)
- Save preferences per user in their profile

### Implementation Approach

#### 1. Data Model

Add user preferences table:

```typescript
// Convex schema
quickActionPreferences: defineTable({
  userId: v.id("user"),
  organizationId: v.id("organization"),
  role: v.string(), // "coach", "admin", etc.
  selectedActionIds: v.array(v.string()), // Ordered list of action IDs
  maxVisible: v.number(), // Max actions to show (default 8)
  updatedAt: v.number(),
}).index("by_user_org_role", ["userId", "organizationId", "role"]),
```

#### 2. Settings UI

Create settings page at `/orgs/[orgId]/coach/settings/quick-actions`:

- Checkbox list of available actions
- Drag handle for reordering
- "Max visible actions" slider (3-10)
- "Reset to defaults" button
- "Save preferences" button

#### 3. Layout Integration

Update coach layout to:

```typescript
// Fetch user preferences
const preferences = useQuery(
  api.models.quickActionPreferences.getUserPreferences,
  { userId, organizationId: orgId, role: "coach" }
);

// Filter and order actions based on preferences
const visibleActions = useMemo(() => {
  if (!preferences) return defaultActions;

  const { selectedActionIds, maxVisible } = preferences;

  return defaultActions
    .filter(action => selectedActionIds.includes(action.id))
    .sort((a, b) =>
      selectedActionIds.indexOf(a.id) - selectedActionIds.indexOf(b.id)
    )
    .slice(0, maxVisible);
}, [preferences, defaultActions]);

useEffect(() => {
  if (actions.length === 0) {
    setActions(visibleActions);
  }
}, [actions.length, visibleActions, setActions]);
```

#### 4. Migration Strategy

- Keep `defaultActions` as fallback if no preferences exist
- Provide in-menu "Customize" link that goes to settings
- Show onboarding tooltip first time user sees Quick Actions
- Track adoption via PostHog

#### 5. Advanced Features (Future)

- **Role-based defaults**: Different defaults for coaches vs admins
- **Action suggestions**: ML-based recommendations based on usage
- **Pinned actions**: Always-visible actions that can't be hidden
- **Quick presets**: "Assessment Mode", "Match Day Mode", etc.
- **Team-wide presets**: Org admins can set defaults for all coaches

### Architecture Notes for Future Work

The current implementation is designed to support user customization:

✅ **Already Supported:**
- Actions are defined as plain objects (easily serializable)
- Action IDs are stable and won't change
- Context pattern allows filtering/ordering without breaking pages
- Hook pattern allows pages to still override for specific workflows

⚠️ **Needs Consideration:**
- Page-specific actions (via `usePageQuickActions`) vs user preferences - which takes precedence?
- Should preferences apply globally or per-section (coach vs admin)?
- How to handle new actions added in future releases?
- Should there be a "default" preset users can return to?

### Recommended Next Steps

1. **UX Research**: Survey coaches to understand which actions they use most
2. **Design**: Create settings page mockups showing customization UI
3. **Data Layer**: Add preferences table to Convex schema
4. **Backend**: Implement CRUD mutations for preferences
5. **Frontend**: Build settings page with drag-and-drop
6. **Integration**: Update layout to respect preferences
7. **Analytics**: Track which actions are hidden/reordered most
8. **Documentation**: Update this doc with customization guide

## Testing

### Manual Testing Checklist

- [ ] Enable `ux_quick_actions_fab` feature flag in PostHog
- [ ] Navigate to `/orgs/[orgId]/coach`
- [ ] Verify Quick Actions button appears in header
- [ ] Click button - verify menu opens with 8 actions
- [ ] Click each action - verify navigation works
- [ ] Navigate to different coach pages - verify actions stay consistent
- [ ] Navigate to demo page (`/coach/quick-actions-demo`)
- [ ] Test state changes (Draft/Published) - verify actions update
- [ ] Navigate away from demo - verify default actions restore
- [ ] Disable feature flag - verify button disappears

### Analytics Verification

- [ ] Check PostHog for `QUICK_ACTIONS_VARIANT_VIEWED` events
- [ ] Check PostHog for `QUICK_ACTIONS_ACTION_CLICKED` events
- [ ] Verify event properties include `variant` and `action` fields

## Troubleshooting

### Actions Not Appearing
- Check feature flag is enabled: `ux_quick_actions_fab`
- Verify `QuickActionsProvider` wraps coach layout
- Check browser console for React errors

### Actions Not Updating
- Verify `usePageQuickActions` dependencies array includes state variables
- Check that actions array is changing (not mutating same array)
- Ensure cleanup function is running on unmount

### Wrong Actions Showing
- Check page isn't calling `usePageQuickActions` with empty array
- Verify layout's `actions.length === 0` check is working
- Confirm no other code is calling `setActions()` unexpectedly

### Button Not Clickable
- Check z-index of header vs other elements
- Verify button isn't disabled in code
- Ensure `setIsMenuOpen` is working in context

## Related Documentation

- **Demo Page:** `/docs/ux/QUICK_ACTIONS_DEMO.md`
- **Architecture Map:** `/QUICK_ACTIONS_MAP.md` (root directory)
- **Mobile Research:** `/docs/research/mobile-quick-actions-research-2025.md`
- **UX Feature Flags:** `/docs/features/ux-feature-flags.md`

## Commit History

Key commits implementing this feature:

1. **be7225d** - "fix: Make all Quick Actions labels action-oriented"
2. **7f2dcf4** - "refactor: Restore dashboard-style Quick Actions across all coach pages"
3. **51053e6** - "refactor: Unify Quick Actions across all coach pages"
4. **0e31996** - "feat: Add optional title/description field to Quick Actions"
5. Earlier commits implementing context, hook, and menu components

## Questions or Issues

For questions about this feature, contact the development team or file an issue in GitHub referencing this documentation.

---

**Last Updated:** January 10, 2026
**Maintainer:** Development Team
**Status:** ✅ Production Ready
