# Session Plans Styling Consistency Update

**Date:** 2026-02-05
**Pages Updated:** `/coach/session-plans` and `/admin/session-plans`
**Objective:** Make session plans pages consistent with the rest of the site's design system

## Changes Made

### Coach Session Plans Page (`/coach/session-plans/page.tsx`)

#### 1. Header Section
**Before:**
- Inconsistent spacing and layout
- Icon used hardcoded `text-blue-600` color
- Button sizes were non-standard (`h-8 w-8` with custom padding)
- Heading used responsive sizing that didn't match site pattern

**After:**
- Consistent with site-wide header pattern (matches admin/teams page)
- Icon uses `text-primary` for theme consistency
- Standard button sizes with `size="icon"` and `variant="ghost"`
- Consistent heading with `font-bold text-3xl tracking-tight`
- Description aligned with site pattern using `ml-16` offset

**Code Changes:**
```tsx
// Before
<ClipboardList className="h-6 w-6 text-blue-600 sm:h-8 sm:w-8" />
<h1 className="font-bold text-foreground text-xl sm:text-3xl">

// After
<ClipboardList className="h-8 w-8 text-primary" />
<h1 className="font-bold text-3xl tracking-tight">
```

#### 2. Stats Cards
**Before:**
- Used custom colored borders (border-blue-200, border-green-200, etc.)
- Custom background colors (bg-blue-50, bg-green-50, etc.)
- Inconsistent with site's Card component pattern
- Used `shadow-sm` instead of standard card shadows

**After:**
- Standard `Card` and `CardContent` components
- Consistent layout matching admin/teams stats pattern
- Icons use `text-muted-foreground` or semantic colors (green for success)
- Proper spacing with `p-4` content padding
- Uniform card appearance across the site

**Code Changes:**
```tsx
// Before
<div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-3 shadow-sm sm:p-4">
  <div className="text-gray-600 text-xs sm:text-sm">Total Plans</div>
  <div className="mt-1 font-bold text-blue-600 text-xl sm:text-2xl">
    {stats.totalPlans}
  </div>
</div>

// After
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

#### 3. Imports Added
- `Calendar` - for "This Month" stat icon
- `CheckCircle` - for "Used Plans" stat icon

### Admin Session Plans Page (`/admin/session-plans/page.tsx`)

#### 1. Header Section
**Before:**
- Wrapped heading and icon in nested divs
- Inconsistent spacing

**After:**
- Matches coach session plans and admin/teams header pattern
- Consistent hierarchy and spacing
- Description offset with `ml-16` to align with heading

**Code Changes:**
```tsx
// Before
<div className="flex items-center gap-2">
  <Shield className="h-8 w-8 text-primary" />
  <h1 className="font-bold text-3xl">Session Plans Moderation</h1>
</div>
<p className="text-muted-foreground">Review and moderate...</p>

// After
<div className="mb-2 flex items-center gap-3">
  <Button ... size="icon" variant="ghost">
    <ArrowLeft className="h-5 w-5" />
  </Button>
  <Shield className="h-8 w-8 text-primary" />
  <h1 className="font-bold text-3xl tracking-tight">Session Plans Moderation</h1>
</div>
<p className="ml-16 text-muted-foreground">Review and moderate...</p>
```

#### 2. Filter Cards (All / Rejected)
**Before:**
- Used `<button>` elements with complex conditional styling
- Custom gradient backgrounds (`bg-gradient-to-br from-slate-50 to-gray-50`)
- Non-standard border colors and transitions
- Active state used custom colors (border-primary with bg-primary/5)

**After:**
- Standard `Card` and `CardContent` components
- Consistent with stats cards pattern site-wide
- Simplified active state using `border-primary ring-2 ring-primary/20`
- Hover effect uses standard `hover:shadow-md`
- Grid layout uses `md:grid-cols-2` for responsive design

**Code Changes:**
```tsx
// Before
<button
  className={`cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${
    filterView === "all"
      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
      : "border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50"
  }`}
  onClick={() => setFilterView("all")}
>
  ...
</button>

// After
<Card
  className={`cursor-pointer transition-all hover:shadow-md ${
    filterView === "all" ? "border-primary ring-2 ring-primary/20" : ""
  }`}
  onClick={() => setFilterView("all")}
>
  <CardContent className="p-4">
    ...
  </CardContent>
</Card>
```

## Design Principles Applied

1. **Consistent Card Usage:** All stat displays use the site's standard `Card` component
2. **Theme Colors:** Icons use `text-primary` or `text-muted-foreground` instead of hardcoded colors
3. **Semantic Colors:** Only use custom colors (like `text-red-600`) for semantic meaning (errors, warnings)
4. **Standard Spacing:** Use consistent padding (`p-4`) and gaps (`gap-4`)
5. **Typography Hierarchy:** Consistent heading sizes and weights across all admin/coach pages
6. **Icon Sizing:** Standard `h-8 w-8` for header icons, `h-5 w-5` for button icons
7. **Responsive Design:** Use standard breakpoints (`md:grid-cols-4`, `sm:flex-row`)

## Testing Checklist

- [x] Type-check passes with no errors
- [ ] Visual review in browser
- [ ] Test responsiveness on mobile/tablet/desktop
- [ ] Verify stats cards display correctly
- [ ] Verify filter cards work and show active state
- [ ] Check dark mode consistency (if applicable)

## Files Modified

1. `/apps/web/src/app/orgs/[orgId]/coach/session-plans/page.tsx`
2. `/apps/web/src/app/orgs/[orgId]/admin/session-plans/page.tsx`

## Impact

**Before:** Session plans pages had custom styling that didn't match the rest of the application, making them feel inconsistent and potentially confusing for users.

**After:** Session plans pages now follow the exact same design patterns as other admin and coach pages, creating a cohesive user experience throughout the application.

## Next Steps

1. Visual testing in browser to verify appearance
2. Consider extending these patterns to other pages that may have inconsistent styling
3. Document these patterns in a design system guide for future development
