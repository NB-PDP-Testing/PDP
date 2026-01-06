# Organization Theming System

This system allows each organization to have a custom-branded interface using their three defined colors (primary, secondary, tertiary).

## Overview

When users navigate to organization-specific pages (`/orgs/[orgId]/*`), the interface automatically adapts to use that organization's brand colors.

## How It Works

### 1. Color Storage

Colors are stored in the `organization` table in Convex:
```typescript
{
  colors: ["#16a34a", "#0ea5e9", "#f59e0b"] // [primary, secondary, tertiary]
}
```

### 2. Theme Hook (`useOrgTheme`)

The `useOrgTheme` hook:
- Loads organization data when on org-scoped routes
- Extracts the three colors
- Converts hex colors to RGB for Tailwind
- Applies CSS custom properties to the document root

**Usage:**
```typescript
import { useOrgTheme } from "@/hooks/use-org-theme";

function MyComponent() {
  const { theme, org, loading, hasTheme } = useOrgTheme();
  
  // theme.primary - Hex color like "#16a34a"
  // theme.primaryRgb - RGB string like "22, 163, 74"
  // hasTheme - true if on org page with colors set
}
```

### 3. CSS Custom Properties

The hook sets these CSS variables globally:
```css
--org-primary: #16a34a
--org-primary-rgb: 22, 163, 74
--org-secondary: #0ea5e9
--org-secondary-rgb: 14, 165, 233
--org-tertiary: #f59e0b
--org-tertiary-rgb: 245, 158, 11
```

## Using Organization Colors

### Option 1: Themed Components

**OrgThemedButton:**
```tsx
import { OrgThemedButton } from "@/components/org-themed-button";

<OrgThemedButton variant="primary" size="md">
  Primary Action
</OrgThemedButton>

<OrgThemedButton variant="secondary">
  Secondary Action
</OrgThemedButton>

<OrgThemedButton variant="outline">
  Outlined
</OrgThemedButton>
```

**StatCard:**
```tsx
import { StatCard } from "@/app/orgs/[orgId]/admin/stat-card";
import { Users } from "lucide-react";

<StatCard
  title="Active Users"
  value={125}
  description="Up 12% from last month"
  icon={Users}
  variant="default"  // Uses primary org color
/>

<StatCard
  title="Teams"
  value={8}
  icon={Shield}
  variant="secondary"  // Uses secondary org color
/>
```

### Option 2: Inline Styles with Theme Object

```tsx
const { theme } = useOrgTheme();

<div style={{ backgroundColor: theme.primary, color: "white" }}>
  Custom branded element
</div>

<button style={{
  backgroundColor: theme.secondary,
  color: "white",
  border: `2px solid ${theme.secondary}`
}}>
  Secondary Button
</button>
```

### Option 3: CSS Variables (Best for Tailwind + Dynamic)

```tsx
<div 
  className="rounded-lg p-4"
  style={{
    backgroundColor: `rgb(var(--org-primary-rgb) / 0.1)`,
    color: 'var(--org-primary)'
  }}
>
  Light primary background with primary text
</div>

<div style={{
  backgroundColor: 'var(--org-secondary)',
  color: 'white'
}}>
  Secondary colored background
</div>
```

### Option 4: Utility Functions

```tsx
import { getOrgThemeStyles, getOrgBorderStyles } from "@/hooks/use-org-theme";

<button style={getOrgThemeStyles("primary")}>
  Automatically styled with primary color
</button>

<div style={getOrgBorderStyles("secondary")}>
  Border uses secondary color
</div>
```

## Examples in the Codebase

### 1. Header (`components/header.tsx`)
- Uses primary color for background when on org pages
- Text changes to white for contrast

### 2. Admin Layout (`app/orgs/[orgId]/admin/layout.tsx`)
- Settings icon uses primary color
- Active nav items have primary color background/border

### 3. Stat Cards (`app/orgs/[orgId]/admin/stat-card.tsx`)
- Default variant uses primary color
- Secondary variant uses secondary color
- Tertiary variant uses tertiary color

## Color Contrast

The theme system assumes:
- **Primary/Secondary/Tertiary** backgrounds → white text
- **Light backgrounds** (`rgb(var(--org-primary-rgb) / 0.1)`) → org color text

Always test with different color combinations to ensure readability.

## Fallback Behavior

If an organization doesn't have colors set:
- **Primary:** #16a34a (green)
- **Secondary:** #0ea5e9 (blue)
- **Tertiary:** #f59e0b (amber)

When not on an org page, CSS variables are removed and components fall back to default Tailwind colors.

## Best Practices

1. **Use semantic variants:** "primary", "secondary", "tertiary" instead of hardcoding colors
2. **Test with light and dark mode:** Ensure colors work in both themes
3. **Provide contrast:** Always pair org colors with appropriate text colors
4. **Use RGB format for transparency:** `rgb(var(--org-primary-rgb) / 0.5)` for 50% opacity
5. **Keep accessibility in mind:** Ensure sufficient contrast ratios (WCAG AA minimum 4.5:1)

## Adding Theme Support to New Components

1. **Import the hook:**
   ```tsx
   import { useOrgTheme } from "@/hooks/use-org-theme";
   ```

2. **Get theme object:**
   ```tsx
   const { theme } = useOrgTheme();
   ```

3. **Apply styles:**
   ```tsx
   style={{ backgroundColor: theme.primary }}
   // or
   style={{ color: `var(--org-primary)` }}
   ```

## Future Enhancements

- [ ] Dark mode variants of org colors
- [ ] Automatic text color calculation for accessibility
- [ ] Theme preview in settings
- [ ] Export theme as CSS file
- [ ] Support for custom fonts per organization

