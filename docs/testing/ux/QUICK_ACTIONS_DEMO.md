# Quick Actions Demo Page

Demo page showing how to implement custom Quick Actions on coach pages.

## Access

**URL:** `/orgs/[orgId]/coach/quick-actions-demo`

**Example:** `http://localhost:3000/orgs/jh7f6k14jw7j4sj9rr9dfzekr97xm9j7/coach/quick-actions-demo`

## Prerequisites

Enable the `ux_quick_actions_fab` feature flag in PostHog to see the Quick Actions button in the header.

## What It Demonstrates

### 1. Dynamic Actions Based on State
The page has two modes:
- **Draft Mode**: Shows Save, Publish, Delete actions
- **Published Mode**: Shows Edit, Share, Download actions

Actions change automatically when you toggle between modes.

### 2. Action States
- Actions can be disabled (Save button when no changes)
- Actions can change appearance based on state
- Actions can trigger alerts, navigation, or state changes

### 3. Real-World Pattern
Demonstrates a realistic content editing workflow:
- Make changes → Save as draft
- Publish draft → Switches to published mode
- Edit published → Returns to draft mode

## Features Shown

### Interactive Controls
- **Make Changes** - Enables the Save button
- **Toggle Draft/Published** - Switches between modes and action sets

### Visual Feedback
- Status badges (Draft/Published)
- Change indicators (Saved/Unsaved)
- Current actions displayed in cards

### Code Examples
- Inline code showing implementation
- Comments explaining each part
- Copy-paste ready examples

## Implementation Patterns

### Pattern 1: Static Actions
```tsx
usePageQuickActions([
  {
    id: "save",
    icon: Save,
    label: "Save",
    onClick: () => alert("Saved!"),
    color: "bg-blue-600 hover:bg-blue-700",
  },
  // ... more actions
]);
```

### Pattern 2: Dynamic Actions (Shown in Demo)
```tsx
usePageQuickActions(
  isDraft ? draftActions : publishedActions
);
```

### Pattern 3: Conditional Actions
```tsx
usePageQuickActions([
  {
    id: "save",
    icon: Save,
    label: hasChanges ? "Save" : "Saved",
    onClick: handleSave,
    color: hasChanges
      ? "bg-blue-600 hover:bg-blue-700"
      : "bg-gray-400 hover:bg-gray-500",
  },
]);
```

## Testing the Demo

1. **Enable feature flag** in PostHog: `ux_quick_actions_fab`
2. **Navigate to demo page** via URL
3. **Click buttons** to change page state
4. **Watch Quick Actions** update in the header
5. **Navigate away and back** to see actions restore

## Educational Value

This demo helps developers understand:
- ✅ How to register custom Quick Actions
- ✅ How actions change with component state
- ✅ How cleanup works automatically
- ✅ How to choose appropriate colors
- ✅ How actions integrate with page logic

## Next Steps

After understanding this demo:
1. Create custom actions on your own pages
2. Use similar patterns for workflow-based UIs
3. Leverage state-based action visibility
4. Implement context-aware toolbars

## Related Files

- `/apps/web/src/hooks/use-page-quick-actions.ts` - Hook implementation
- `/apps/web/src/contexts/quick-actions-context.tsx` - Context definition
- `/apps/web/src/app/orgs/[orgId]/coach/layout.tsx` - Default actions
- `/apps/web/src/components/quick-actions/header-quick-actions-menu.tsx` - Menu component
