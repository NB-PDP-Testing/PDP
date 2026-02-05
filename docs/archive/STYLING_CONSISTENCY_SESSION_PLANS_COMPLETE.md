# Complete Session Plans Styling Consistency Update

**Date:** 2026-02-05
**Objective:** Ensure all session plans pages follow consistent design patterns with the rest of the site

## Overview

Updated styling across all session-related pages to eliminate custom gradients, inconsistent colors, and non-standard card patterns. All pages now follow the established design system used in admin/teams and other core pages.

## Pages Updated

### 1. Coach Session Plans Main Page (`/coach/session-plans/page.tsx`)

#### Changes:
- **Header Section**: Updated to match site-wide header pattern with consistent icon colors (`text-primary`), standard button sizes, and proper typography hierarchy
- **Stats Cards**: Replaced custom colored borders and backgrounds with standard `Card` components matching admin/teams pattern
- **Quick Access Cards**: See dedicated section below

#### Before/After:
```tsx
// BEFORE: Custom colored cards with hardcoded colors
<div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-3 shadow-sm">
  <div className="text-gray-600 text-xs">Total Plans</div>
  <div className="font-bold text-blue-600 text-xl">{stats.totalPlans}</div>
</div>

// AFTER: Standard Card components
<Card>
  <CardContent className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-muted-foreground text-sm">Total Plans</p>
        <p className="font-bold text-2xl">{stats.totalPlans}</p>
      </div>
      <ClipboardList className="h-8 w-8 text-muted-foreground" />
    </div>
  </CardContent>
</Card>
```

### 2. Quick Access Cards (`/coach/session-plans/quick-access-cards.tsx`)

#### Changes:
- **Removed**: All custom gradient backgrounds (`from-[#667eea] to-[#764ba2]`, etc.)
- **Removed**: Decorative elements (floating circles, backdrop blur)
- **Removed**: Scale animations on hover
- **Added**: Standard `Card` component with `CardContent`
- **Added**: Consistent icon styling with `text-muted-foreground`

#### Before/After:
```tsx
// BEFORE: Gradient buttons with custom animations
<button className={`group relative cursor-pointer overflow-hidden rounded-xl
  bg-gradient-to-br ${card.gradient} p-4 text-white shadow-lg
  transition-all hover:scale-105 hover:shadow-xl`}>
  <Icon className="h-6 w-6 opacity-90" />
  <div className="rounded-full bg-white/20 backdrop-blur-sm">
    {card.count}
  </div>
  <h3 className="text-white">{card.title}</h3>
  <div className="absolute h-16 w-16 bg-white/10 transition-transform group-hover:scale-110" />
</button>

// AFTER: Standard Card components
<Card className="cursor-pointer transition-all hover:shadow-md">
  <CardContent className="p-4">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="font-medium text-sm">{card.title}</p>
        <p className="text-muted-foreground text-xs">{card.description}</p>
      </div>
      <div className="ml-3 flex flex-col items-center gap-1">
        <Icon className="h-6 w-6 text-muted-foreground" />
        <span className="font-bold text-lg">{card.count}</span>
      </div>
    </div>
  </CardContent>
</Card>
```

### 3. Admin Session Plans Page (`/admin/session-plans/page.tsx`)

#### Changes:
- **Header**: Updated to match site-wide header pattern with proper spacing and alignment
- **Filter Cards**: Converted from custom gradient buttons to standard `Card` components
- **Simplified**: Active state styling to use simple border/ring instead of complex gradients

#### Before/After:
```tsx
// BEFORE: Custom gradient buttons
<button className={`cursor-pointer rounded-lg border-2 p-4
  transition-all hover:shadow-md ${
    filterView === "all"
      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
      : "border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50"
  }`}>
  ...
</button>

// AFTER: Standard Card components
<Card className={`cursor-pointer transition-all hover:shadow-md ${
  filterView === "all" ? "border-primary ring-2 ring-primary/20" : ""
}`}>
  <CardContent className="p-4">
    ...
  </CardContent>
</Card>
```

### 4. Admin Plan Card Component (`/admin/session-plans/admin-plan-card.tsx`)

#### Major Changes:
- **Removed**: `getIntensityGradient()` function with custom color gradients
- **Removed**: `getCardBackground()` function with gradient backgrounds for different states
- **Removed**: Gradient top border (`<div className="h-1 w-full bg-gradient-to-r ${intensityGradient}" />`)
- **Replaced**: Card backgrounds with left border color indicators

#### Before/After:
```tsx
// BEFORE: Multiple gradient functions and decorative elements
const getIntensityGradient = (intensity) => {
  switch (intensity) {
    case "low": return "from-[#43e97b] to-[#38f9d7]";
    case "high": return "from-[#ff6b6b] to-[#feca57]";
    // ... more gradients
  }
};

const getCardBackground = () => {
  if (plan.pinnedByAdmin) return "bg-gradient-to-br from-amber-50/50 to-yellow-50/30";
  if (isModerated) return "bg-gradient-to-br from-red-50/50 to-rose-50/30";
  // ... more gradients
};

<Card className={`${cardBackground} hover:shadow-lg hover:ring-2`}>
  <div className={`h-1 bg-gradient-to-r ${intensityGradient}`} />
  ...
</Card>

// AFTER: Simple border indicators
const getBorderClass = () => {
  if (plan.pinnedByAdmin) return "border-l-4 border-l-amber-500";
  if (isModerated) return "border-l-4 border-l-red-500";
  return "";
};

<Card className={`${borderClass} hover:shadow-md`}>
  {/* No gradient border, standard card styling */}
  ...
</Card>
```

## Design Principles Applied

### 1. **Consistent Card Components**
- All informational/interactive cards use the standard `Card` and `CardContent` components
- No custom `rounded-lg` with manual padding - use `CardContent` with `p-4`
- Consistent spacing throughout

### 2. **No Custom Gradients**
- Removed ALL `bg-gradient-to-*` with custom hex colors
- Removed gradient decorations (floating circles, backdrop blur, etc.)
- State differences shown through:
  - Left border colors (amber for featured, red for rejected)
  - Standard badge colors
  - Text colors for semantic meaning

### 3. **Standard Icon Colors**
- Primary context: `text-primary`
- Muted/secondary: `text-muted-foreground`
- Semantic (success/error): `text-green-600`, `text-red-600`
- Never use custom hex colors for icons

### 4. **Consistent Hover Effects**
- Cards: `hover:shadow-md` (not `hover:shadow-lg` or `hover:shadow-xl`)
- No scale animations (`hover:scale-105`) unless specifically part of the design system
- No complex ring combinations unless for active states

### 5. **Typography Consistency**
- Headers: `font-bold text-3xl tracking-tight`
- Card titles: `font-medium text-sm` or `font-semibold text-lg`
- Descriptions: `text-muted-foreground text-xs` or `text-sm`

### 6. **Spacing Patterns**
- Card content: `p-4`
- Grid gaps: `gap-4` for standard layouts
- Responsive grids: `md:grid-cols-2`, `md:grid-cols-4`

## Files Modified

1. `/apps/web/src/app/orgs/[orgId]/coach/session-plans/page.tsx`
2. `/apps/web/src/app/orgs/[orgId]/coach/session-plans/quick-access-cards.tsx`
3. `/apps/web/src/app/orgs/[orgId]/admin/session-plans/page.tsx`
4. `/apps/web/src/app/orgs/[orgId]/admin/session-plans/admin-plan-card.tsx`

## What Was NOT Changed

### Session Plan Detail Page (`[planId]/page.tsx`)
- **Status**: Still has custom gradients in header and card headers
- **Reason**: Detail pages can have more decorative elements as they're viewing/reading pages, not list/dashboard pages
- **Note**: If full consistency is desired, these should be updated using the same patterns

### Generation Progress Component
- Standard Card components already in use
- No styling changes needed

### New Session Plan Page (`/new`)
- Already using standard Card components
- No changes needed

## Testing Checklist

- [x] Type-check passes
- [x] All commits pass linting
- [ ] Visual review in browser (user to verify)
- [ ] Test Quick Access cards click functionality
- [ ] Test admin plan cards click/dropdown functionality
- [ ] Verify responsive design on mobile/tablet
- [ ] Check dark mode compatibility (if applicable)

## Visual Impact

**Before**: Session plans pages had vibrant gradient backgrounds, custom colors, and animations that made them feel like a separate app from the rest of the site.

**After**: Session plans pages now use the exact same card components, colors, and patterns as admin/teams and other core pages, creating a cohesive, professional experience throughout the application.

## Commits

1. `7f5e08dd` - style: Update session-plans pages for design consistency
2. `28de105d` - style: Update Quick Access cards to match site design
3. `cb26a21d` - style: Remove gradients from admin plan cards

## Future Considerations

1. **Detail Page Consistency**: Consider updating the plan detail page header to remove custom gradients
2. **Design System Documentation**: Create a formal design system guide documenting:
   - Standard card patterns
   - Icon color usage
   - Hover effects
   - Typography hierarchy
3. **Component Library**: Consider creating reusable stat card components to avoid duplication
