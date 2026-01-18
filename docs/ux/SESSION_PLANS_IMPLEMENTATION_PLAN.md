# Session Plans Feature - Implementation Plan

**Date**: January 17, 2026  
**Based on**: Deep UX Review & Interactive Mockup Decisions  
**Approved Design Decisions**:

- ✅ Pinterest-Style Masonry Grid (Library View)
- ✅ Top Filter Bar + Search (Discovery)
- ✅ Advanced Filter Panel Modal/Drawer
- ✅ Enhanced Admin View with Quality Signals

---

## Executive Summary

This implementation plan breaks down the approved Session Plans improvements into **4 phased deployments**, each building on the previous phase. Each phase is designed to be implementable with Claude assistance and includes detailed technical specifications.

**Total Estimated Timeline**: 8-10 weeks  
**Total Development Effort**: ~180 hours

---

## Phase 1: Foundation & Quick Wins (Weeks 1-2)

**Goal**: Polish existing UI, implement high-impact visual improvements  
**Effort**: ~40 hours  
**Dependencies**: None (can start immediately)

### 1.1 Visual Feedback System (3 hours)

**Files to Modify**:

```
apps/web/src/components/ui/toast.tsx (new)
apps/web/src/app/orgs/[orgId]/coach/session-plans/page.tsx
```

**Implementation Steps**:

1. **Create Toast Component** (1 hour)

   ```typescript
   // apps/web/src/components/ui/toast.tsx
   import { Toaster } from "sonner"

   export function Toast() {
     return <Toaster position="top-right" richColors />
   }
   ```

2. **Add Toast Notifications** (2 hours)
   - Import `toast` from "sonner"
   - Add to existing actions:
     - `toggleFavorite()` → "Plan favorited! ✓" / "Removed from favorites"
     - `updateVisibility()` → "Shared to club library ✓"
     - `duplicatePlan()` → "Plan duplicated ✓"
     - `archivePlan()` → "Plan archived"

**Acceptance Criteria**:

- [ ] Toast appears on all CRUD operations
- [ ] Toast auto-dismisses after 3 seconds
- [ ] Toast includes appropriate icon (✓ ⚠️ ❌)
- [ ] Multiple toasts stack properly

---

### 1.2 Quick Access Section (4 hours)

**Files to Modify**:

```
apps/web/src/app/orgs/[orgId]/coach/session-plans/page.tsx
apps/web/src/app/orgs/[orgId]/coach/session-plans/quick-access.tsx (new)
packages/backend/convex/models/sessionPlans.ts
```

**Implementation Steps**:

1. **Create Backend Queries** (2 hours)

   ```typescript
   // Add to sessionPlans.ts

   export const getRecentlyUsed = query({
     args: { orgId: v.string(), limit: v.optional(v.number()) },
     handler: async (ctx, args) => {
       const coach = await getCoachForOrg(ctx, args.orgId);
       return await ctx.db
         .query("sessionPlans")
         .withIndex("by_coach", (q) => q.eq("coachId", coach._id))
         .filter((q) =>
           q.gt(q.field("lastUsedAt"), Date.now() - 30 * 24 * 60 * 60 * 1000),
         )
         .order("desc")
         .take(args.limit ?? 4);
     },
   });

   export const getMostPopular = query({
     args: { orgId: v.string(), limit: v.optional(v.number()) },
     handler: async (ctx, args) => {
       // Return plans sorted by timesUsed
     },
   });

   export const getYourBest = query({
     args: { orgId: v.string(), limit: v.optional(v.number()) },
     handler: async (ctx, args) => {
       const coach = await getCoachForOrg(ctx, args.orgId);
       return await ctx.db
         .query("sessionPlans")
         .withIndex("by_coach", (q) => q.eq("coachId", coach._id))
         .filter((q) => q.gte(q.field("successRate"), 90))
         .order("desc")
         .take(args.limit ?? 4);
     },
   });

   export const getTopRated = query({
     args: { orgId: v.string(), limit: v.optional(v.number()) },
     handler: async (ctx, args) => {
       // Return highest rated plans from club library
     },
   });
   ```

2. **Create Quick Access Component** (2 hours)
   ```typescript
   // quick-access.tsx
   export function QuickAccessSection() {
     return (
       <div className="mb-8">
         <h2 className="text-lg font-semibold mb-4">🔥 Quick Access</h2>
         <div className="flex gap-4 overflow-x-auto pb-2">
           <QuickAccessCard
             title="Recently Used"
             icon="🕐"
             plans={recentlyUsed}
             gradient="from-purple-500 to-indigo-600"
           />
           {/* ... other cards */}
         </div>
       </div>
     );
   }
   ```

**Acceptance Criteria**:

- [ ] 4 quick access cards display horizontally
- [ ] Cards scroll horizontally on mobile
- [ ] Each card shows plan count
- [ ] Clicking card navigates to filtered view
- [ ] Empty state when no plans match category

---

### 1.3 Loading States (2 hours)

**Files to Modify**:

```
apps/web/src/app/orgs/[orgId]/coach/session-plans/generate-plan-dialog.tsx
apps/web/src/components/ui/skeleton.tsx (if not exists)
```

**Implementation Steps**:

1. **Add Loading UI to AI Generation** (1 hour)

   ```typescript
   {isGenerating && (
     <div className="space-y-3">
       <Progress value={progress} />
       <p className="text-sm text-muted-foreground text-center">
         {stage === "analyzing" && "Analyzing team..."}
         {stage === "selecting" && "Selecting drills..."}
         {stage === "formatting" && "Formatting plan..."}
       </p>
       <p className="text-xs text-center text-muted-foreground">
         ~{estimatedTime}s remaining
       </p>
     </div>
   )}
   ```

2. **Add Skeleton Loaders for Plan Cards** (1 hour)
   ```typescript
   {isLoading ? (
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
       {Array.from({ length: 6 }).map((_, i) => (
         <Skeleton key={i} className="h-48 w-full" />
       ))}
     </div>
   ) : (
     // ... actual plans
   )}
   ```

**Acceptance Criteria**:

- [ ] Progress indicator during AI generation
- [ ] Stage text updates ("Analyzing...", "Selecting...", "Formatting...")
- [ ] Estimated time remaining shown
- [ ] Skeleton cards while loading plan list
- [ ] Cancel button to abort generation

---

### 1.4 Empty State Improvements (1 hour)

**Files to Modify**:

```
apps/web/src/app/orgs/[orgId]/coach/session-plans/empty-state.tsx (new)
```

**Implementation**:

```typescript
export function EmptyState({ type }: { type: "no-plans" | "no-results" | "no-favorites" }) {
  const config = {
    "no-plans": {
      icon: "📋",
      title: "No session plans yet",
      description: "Create your first AI-powered training session",
      action: "Generate New Plan",
    },
    "no-results": {
      icon: "🔍",
      title: "No plans match your filters",
      description: "Try adjusting your search or filters",
      action: "Clear Filters",
    },
    "no-favorites": {
      icon: "⭐",
      title: "No favorite plans yet",
      description: "Favorite plans to quick-access them later",
      action: "Browse Plans",
    },
  };

  return <EmptyStateUI {...config[type]} />;
}
```

**Acceptance Criteria**:

- [ ] Different empty states for different scenarios
- [ ] Clear call-to-action for each state
- [ ] Helpful guidance text
- [ ] Appropriate icon/illustration

---

## Phase 2: Top Filter Bar + Search (Weeks 3-4)

**Goal**: Implement search-first discovery with mobile-friendly filters  
**Effort**: ~50 hours  
**Dependencies**: Phase 1 complete

### 2.1 Search Bar Component (6 hours)

**Files to Modify**:

```
apps/web/src/app/orgs/[orgId]/coach/session-plans/search-bar.tsx (new)
apps/web/src/app/orgs/[orgId]/coach/session-plans/page.tsx
packages/backend/convex/models/sessionPlans.ts
```

**Implementation Steps**:

1. **Backend: Full-Text Search** (3 hours)

   ```typescript
   // Add search index to schema.ts
   .searchIndex("search_plans", {
     searchField: "searchableText",
     filterFields: ["organizationId", "coachId", "ageGroup", "sport"],
   })

   // In sessionPlans.ts
   export const searchPlans = query({
     args: {
       orgId: v.string(),
       searchQuery: v.string(),
       filters: v.optional(v.object({
         ageGroup: v.optional(v.string()),
         duration: v.optional(v.object({ min: v.number(), max: v.number() })),
         intensity: v.optional(v.string()),
         focusAreas: v.optional(v.array(v.string())),
       })),
     },
     handler: async (ctx, args) => {
       const coach = await getCoachForOrg(ctx, args.orgId);

       const results = await ctx.db
         .query("sessionPlans")
         .withSearchIndex("search_plans", (q) =>
           q.search("searchableText", args.searchQuery)
            .eq("organizationId", args.orgId)
         )
         .collect();

       // Apply additional filters client-side
       return applyFilters(results, args.filters);
     },
   });
   ```

2. **Frontend: Search Bar with Debounce** (3 hours)
   ```typescript
   export function SearchBar() {
     const [searchQuery, setSearchQuery] = useState("");
     const debouncedSearch = useDebounce(searchQuery, 300);

     const results = useQuery(
       api.models.sessionPlans.searchPlans,
       debouncedSearch ? { orgId, searchQuery: debouncedSearch, filters } : "skip"
     );

     return (
       <div className="relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
         <Input
           placeholder="🔍 Search by title, focus, or drills..."
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           className="pl-10 pr-24 h-12 text-base"
         />
         <Button
           variant="default"
           size="sm"
           className="absolute right-2 top-1/2 -translate-y-1/2"
           onClick={() => setShowFilters(true)}
         >
           Filters
         </Button>
       </div>
     );
   }
   ```

**Acceptance Criteria**:

- [ ] Search input with icon and filter button
- [ ] Debounced search (300ms delay)
- [ ] Search across title, description, focus areas, tags
- [ ] Clear button (X) when search has text
- [ ] Loading indicator while searching
- [ ] Results count displayed

---

### 2.2 Quick Filter Pills (4 hours)

**Files to Modify**:

```
apps/web/src/app/orgs/[orgId]/coach/session-plans/filter-pills.tsx (new)
```

**Implementation**:

```typescript
export function FilterPills() {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const pills = [
    { id: "favorites", label: "⭐ Favorites", filter: { favorited: true } },
    { id: "recent", label: "🕐 Recent", filter: { recent: true } },
    { id: "u12", label: "U12", filter: { ageGroup: "U12" } },
    { id: "u14", label: "U14", filter: { ageGroup: "U14" } },
    { id: "60min", label: "60 min", filter: { duration: 60 } },
    { id: "high", label: "High Intensity", filter: { intensity: "high" } },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {pills.map((pill) => (
        <Button
          key={pill.id}
          variant={activeFilters.has(pill.id) ? "default" : "outline"}
          size="sm"
          className="whitespace-nowrap rounded-full"
          onClick={() => toggleFilter(pill.id)}
        >
          {pill.label}
        </Button>
      ))}
    </div>
  );
}
```

**Acceptance Criteria**:

- [ ] Pills displayed horizontally with scroll
- [ ] Active pill has filled background
- [ ] Clicking pill toggles filter on/off
- [ ] Pills respond to screen size (more on desktop)
- [ ] Touch-friendly on mobile (48px+ touch targets)

---

### 2.3 Sort Dropdown (2 hours)

**Files to Modify**:

```
apps/web/src/app/orgs/[orgId]/coach/session-plans/sort-dropdown.tsx (new)
```

**Implementation**:

```typescript
export function SortDropdown() {
  const [sortBy, setSortBy] = useState<SortOption>("mostUsed");

  const options: { value: SortOption; label: string }[] = [
    { value: "mostUsed", label: "Sort: Most Used" },
    { value: "highestRated", label: "Sort: Highest Rated" },
    { value: "recentlyCreated", label: "Sort: Recently Created" },
    { value: "duration", label: "Sort: Duration (Short to Long)" },
    { value: "alphabetical", label: "Sort: A-Z" },
  ];

  return (
    <Select value={sortBy} onValueChange={setSortBy}>
      <SelectTrigger className="w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

**Acceptance Criteria**:

- [ ] Dropdown accessible via keyboard
- [ ] Current sort option displayed
- [ ] Results update immediately on selection
- [ ] Sort persists across page reloads (localStorage)

---

### 2.4 Results Header (1 hour)

**Implementation**:

```typescript
export function ResultsHeader({ count, searchQuery, activeFilters }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="text-sm text-muted-foreground">
        <strong className="text-foreground">{count} plans</strong> match your search
        {activeFilters.length > 0 && (
          <span> with {activeFilters.length} active filters</span>
        )}
      </div>
      <SortDropdown />
    </div>
  );
}
```

**Acceptance Criteria**:

- [ ] Count updates reactively
- [ ] Clear messaging about active filters
- [ ] Sort dropdown aligned right

---

## Phase 3: Advanced Filter Panel (Week 5)

**Goal**: Implement comprehensive filter modal with all options  
**Effort**: ~35 hours  
**Dependencies**: Phase 2 complete

### 3.1 Filter Modal/Drawer Structure (4 hours)

**Files to Create**:

```
apps/web/src/app/orgs/[orgId]/coach/session-plans/advanced-filters.tsx
apps/web/src/app/orgs/[orgId]/coach/session-plans/filter-sections/
  ├── age-group-filter.tsx
  ├── duration-filter.tsx
  ├── intensity-filter.tsx
  ├── focus-areas-filter.tsx
  └── success-rate-filter.tsx
```

**Implementation**:

```typescript
export function AdvancedFiltersDialog({ open, onOpenChange }) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);

  const handleApply = () => {
    setAppliedFilters(filters);
    onOpenChange(false);
    toast.success(`Showing ${matchCount} plans`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filter Session Plans</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <AgeGroupFilter value={filters.ageGroup} onChange={/* */} />
          <DurationFilter value={filters.duration} onChange={/* */} />
          <IntensityFilter value={filters.intensity} onChange={/* */} />
          <FocusAreasFilter value={filters.focusAreas} onChange={/* */} />
          <SuccessRateFilter value={filters.successRate} onChange={/* */} />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Show {matchCount} Plans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Acceptance Criteria**:

- [ ] Modal opens from "Filters" button
- [ ] Modal closes on backdrop click or ESC
- [ ] Mobile: Full-screen drawer from bottom
- [ ] Desktop: Centered modal
- [ ] Scroll if content exceeds viewport

---

### 3.2 Age Group Filter (3 hours)

**Implementation**:

```typescript
export function AgeGroupFilter({ value, onChange }) {
  const ageGroups = ["U8", "U10", "U12", "U14", "U16", "U18", "Senior"];
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set(value));

  const counts = useQuery(api.models.sessionPlans.getCountsByAgeGroup, { orgId });

  return (
    <div>
      <Label className="text-base font-semibold">Age Group</Label>
      <div className="grid grid-cols-4 gap-2 mt-3">
        {ageGroups.map((group) => (
          <Button
            key={group}
            variant={selectedGroups.has(group) ? "default" : "outline"}
            className="font-semibold"
            onClick={() => toggleGroup(group)}
          >
            {group}
            {counts?.[group] && (
              <span className="ml-1 text-xs opacity-70">
                ({counts[group]})
              </span>
            )}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        {matchCount} plans match
      </p>
    </div>
  );
}
```

**Acceptance Criteria**:

- [ ] Multi-select (can select multiple age groups)
- [ ] Shows count for each age group
- [ ] Selected buttons have filled style
- [ ] Live count updates as selections change
- [ ] Grid layout (4 columns on desktop, 2 on mobile)

---

### 3.3 Duration Filter (2 hours)

**Implementation**:

```typescript
export function DurationFilter({ value, onChange }) {
  const [duration, setDuration] = useState(value || 60);

  return (
    <div>
      <Label className="text-base font-semibold">Duration</Label>
      <div className="flex items-center gap-4 mt-3">
        <Slider
          value={[duration]}
          onValueChange={([val]) => setDuration(val)}
          min={30}
          max={120}
          step={15}
          className="flex-1"
        />
        <span className="font-semibold text-primary min-w-[70px]">
          {duration} min
        </span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>30 min</span>
        <span>120 min</span>
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:

- [ ] Slider from 30-120 minutes
- [ ] 15-minute increments
- [ ] Live value display updates
- [ ] Accessible (keyboard navigation)
- [ ] Touch-friendly on mobile

---

### 3.4 Intensity Filter (2 hours)

**Implementation**:

```typescript
export function IntensityFilter({ value, onChange }) {
  const intensities = [
    { value: "low", label: "🟢 Low", color: "bg-green-500" },
    { value: "medium", label: "🟡 Medium", color: "bg-yellow-500" },
    { value: "high", label: "🔴 High", color: "bg-red-500" },
  ];

  return (
    <div>
      <Label className="text-base font-semibold">Intensity</Label>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {intensities.map((intensity) => (
          <Button
            key={intensity.value}
            variant={value === intensity.value ? "default" : "outline"}
            onClick={() => onChange(intensity.value)}
          >
            {intensity.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:

- [ ] Single-select (radio button behavior)
- [ ] Color-coded indicators
- [ ] Clear visual feedback for selected state

---

### 3.5 Focus Areas Filter (3 hours)

**Implementation**:

```typescript
export function FocusAreasFilter({ value, onChange }) {
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set(value));

  const focusAreas = [
    { id: "passing", label: "⚽ Passing" },
    { id: "shooting", label: "🎯 Shooting" },
    { id: "dribbling", label: "🏃 Dribbling" },
    { id: "tactical", label: "🧠 Tactical" },
    { id: "fitness", label: "💪 Fitness" },
    { id: "games", label: "🎮 Games" },
    { id: "defending", label: "🛡️ Defending" },
    { id: "possession", label: "🔄 Possession" },
  ];

  return (
    <div>
      <Label className="text-base font-semibold">
        Focus Areas <span className="text-sm font-normal">(multi-select)</span>
      </Label>
      <div className="flex flex-wrap gap-2 mt-3">
        {focusAreas.map((area) => (
          <Button
            key={area.id}
            variant={selectedAreas.has(area.id) ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => toggleArea(area.id)}
          >
            {area.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:

- [ ] Multi-select pill buttons
- [ ] Icons for visual identification
- [ ] Wraps to multiple rows on small screens
- [ ] Selected pills have filled background

---

### 3.6 Success Rate & Favorites Filter (1 hour)

**Implementation**:

```typescript
export function SuccessRateFilter({ showHighRated, showFavoritesOnly, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id="highRated"
          checked={showHighRated}
          onCheckedChange={(checked) => onChange({ showHighRated: checked })}
        />
        <Label htmlFor="highRated" className="font-semibold cursor-pointer">
          Only show highly rated plans (80%+)
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="favoritesOnly"
          checked={showFavoritesOnly}
          onCheckedChange={(checked) => onChange({ showFavoritesOnly: checked })}
        />
        <Label htmlFor="favoritesOnly" className="font-semibold cursor-pointer">
          Only favorites
        </Label>
      </div>
    </div>
  );
}
```

**Acceptance Criteria**:

- [ ] Checkboxes are keyboard accessible
- [ ] Labels are clickable
- [ ] Clear visual feedback for checked state

---

## Phase 4: Pinterest-Style Masonry + Enhanced Admin (Weeks 6-8)

**Goal**: Implement visual library layout and admin moderation improvements  
**Effort**: ~55 hours  
**Dependencies**: Phases 1-3 complete

### 4.1 Masonry Grid Layout (8 hours)

**Files to Modify**:

```
apps/web/src/app/orgs/[orgId]/coach/session-plans/masonry-grid.tsx (new)
apps/web/src/app/orgs/[orgId]/coach/session-plans/session-plan-card.tsx (update)
```

**Implementation**:

1. **Install Masonry Library** (1 hour)

   ```bash
   npm install react-masonry-css
   ```

2. **Create Masonry Grid Component** (4 hours)

   ```typescript
   import Masonry from "react-masonry-css";

   export function MasonryGrid({ plans }) {
     const breakpointColumns = {
       default: 3,
       1024: 2,
       640: 1,
     };

     return (
       <Masonry
         breakpointCols={breakpointColumns}
         className="flex gap-4 w-auto"
         columnClassName="space-y-4"
       >
         {plans.map((plan) => (
           <SessionPlanCard key={plan._id} plan={plan} variant="masonry" />
         ))}
       </Masonry>
     );
   }
   ```

3. **Update Session Plan Card for Variable Heights** (3 hours)
   ```typescript
   export function SessionPlanCard({ plan, variant = "default" }) {
     const showPreview = variant === "masonry";

     return (
       <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
         <CardHeader>
           <div className="flex justify-between items-start">
             <div className="flex-1">
               <CardTitle className="text-base line-clamp-2">
                 {plan.favorited && "❤️ "}{plan.title}
               </CardTitle>
               <CardDescription className="mt-1">
                 {plan.duration} min • {plan.intensity} • {plan.sport}
               </CardDescription>
             </div>
             <div className="opacity-0 group-hover:opacity-100 transition-opacity">
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="icon">
                     <MoreVertical className="h-4 w-4" />
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                   <DropdownMenuItem onClick={() => toggleFavorite()}>
                     {plan.favorited ? "Unfavorite" : "Favorite"}
                   </DropdownMenuItem>
                   <DropdownMenuItem>Share to Club</DropdownMenuItem>
                   <DropdownMenuItem>Duplicate</DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
             </div>
           </div>
         </CardHeader>

         {showPreview && plan.sections?.[0] && (
           <CardContent className="pt-0">
             <div className="text-sm text-muted-foreground space-y-1">
               <p className="font-medium">{plan.sections[0].type}</p>
               <ul className="list-disc list-inside space-y-0.5">
                 {plan.sections[0].activities.slice(0, 2).map((activity, i) => (
                   <li key={i} className="line-clamp-1">{activity.name}</li>
                 ))}
               </ul>
             </div>
           </CardContent>
         )}

         <CardFooter className="text-xs text-muted-foreground">
           {plan.timesUsed > 0 && <span>Used {plan.timesUsed}x</span>}
           {plan.successRate && <span> • {plan.successRate}% ⭐</span>}
           {plan.feedbackSubmitted && <span> • Feedback submitted</span>}
         </CardFooter>
       </Card>
     );
   }
   ```

**Acceptance Criteria**:

- [ ] Cards arranged in masonry grid (no gaps)
- [ ] Responsive (3 cols desktop, 2 tablet, 1 mobile)
- [ ] Variable heights based on content
- [ ] Preview shows first section of plan
- [ ] Hover shows action menu
- [ ] Smooth transitions on hover
- [ ] Cards clickable to open detail view

---

### 4.2 Enhanced Admin Dashboard (12 hours)

**Files to Create**:

```
apps/web/src/app/orgs/[orgId]/admin/session-plans/admin-dashboard.tsx (new)
apps/web/src/app/orgs/[orgId]/admin/session-plans/metrics-cards.tsx (new)
apps/web/src/app/orgs/[orgId]/admin/session-plans/status-tabs.tsx (new)
packages/backend/convex/models/sessionPlans.ts (update)
```

**Implementation**:

1. **Backend: Admin Queries** (4 hours)

   ```typescript
   // Add to sessionPlans.ts

   export const getAdminMetrics = query({
     args: { orgId: v.string() },
     handler: async (ctx, args) => {
       const allPlans = await ctx.db
         .query("sessionPlans")
         .withIndex("by_organization", (q) =>
           q.eq("organizationId", args.orgId),
         )
         .filter((q) => q.eq(q.field("visibility"), "club"))
         .collect();

       return {
         total: allPlans.length,
         pendingReview: allPlans.filter((p) => !p.moderatedAt).length,
         flagged: allPlans.filter((p) => p.flaggedCount > 0).length,
         featured: allPlans.filter((p) => p.pinnedByAdmin).length,
       };
     },
   });

   export const getQualityScore = query({
     args: { planId: v.id("sessionPlans") },
     handler: async (ctx, args) => {
       const plan = await ctx.db.get(args.planId);
       if (!plan) return null;

       // Calculate quality score based on:
       // - Content completeness
       // - Usage stats
       // - Success rate
       // - Feedback submitted
       let score = 0;

       if (plan.sections?.length >= 4) score += 20;
       if (plan.extractedTags?.categories?.length > 0) score += 15;
       if (plan.timesUsed > 3) score += 20;
       if (plan.successRate && plan.successRate > 80) score += 25;
       if (plan.feedbackSubmitted) score += 20;

       return Math.min(score, 100);
     },
   });
   ```

2. **Frontend: Metrics Dashboard** (4 hours)

   ```typescript
   export function MetricsCards({ orgId }) {
     const metrics = useQuery(api.models.sessionPlans.getAdminMetrics, { orgId });

     return (
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
         <Card>
           <CardHeader className="pb-2">
             <CardDescription>Total Shared</CardDescription>
             <CardTitle className="text-3xl">{metrics?.total ?? 0}</CardTitle>
           </CardHeader>
         </Card>

         <Card className="border-2 border-blue-500">
           <CardHeader className="pb-2">
             <CardDescription>Pending Review</CardDescription>
             <CardTitle className="text-3xl text-blue-600">
               {metrics?.pendingReview ?? 0}
             </CardTitle>
           </CardHeader>
         </Card>

         <Card className="border-2 border-red-500">
           <CardHeader className="pb-2">
             <CardDescription>Flagged</CardDescription>
             <CardTitle className="text-3xl text-red-600">
               {metrics?.flagged ?? 0}
             </CardTitle>
           </CardHeader>
         </Card>

         <Card className="border-2 border-green-500">
           <CardHeader className="pb-2">
             <CardDescription>Featured</CardDescription>
             <CardTitle className="text-3xl text-green-600">
               {metrics?.featured ?? 0}
             </CardTitle>
           </CardHeader>
         </Card>
       </div>
     );
   }
   ```

3. **Frontend: Status Tabs** (2 hours)

   ```typescript
   export function StatusTabs({ activeTab, onTabChange }) {
     return (
       <Tabs value={activeTab} onValueChange={onTabChange}>
         <TabsList>
           <TabsTrigger value="all">All ({metrics?.total})</TabsTrigger>
           <TabsTrigger value="pending">Pending ({metrics?.pendingReview})</TabsTrigger>
           <TabsTrigger value="featured">Featured ({metrics?.featured})</TabsTrigger>
           <TabsTrigger value="high-usage">High Usage</TabsTrigger>
         </TabsList>
       </Tabs>
     );
   }
   ```

4. **Frontend: Quality Score Display** (2 hours)
   ```typescript
   export function QualityScoreIndicator({ planId }) {
     const score = useQuery(api.models.sessionPlans.getQualityScore, { planId });

     if (!score) return null;

     const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";

     return (
       <div className="flex items-center gap-2">
         <span className="text-sm text-muted-foreground">Quality Score:</span>
         <div className="flex-1 max-w-[200px] h-2 bg-muted rounded-full overflow-hidden">
           <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
         </div>
         <span className="text-sm font-semibold" style={{ color: score >= 80 ? "green" : score >= 60 ? "orange" : "red" }}>
           {score}%
         </span>
       </div>
     );
   }
   ```

**Acceptance Criteria**:

- [ ] Metrics cards show at top of admin view
- [ ] Cards color-coded by urgency
- [ ] Status tabs filter plans
- [ ] Quality score calculated and displayed
- [ ] Visual progress bar for quality
- [ ] Pending plans highlighted prominently

---

### 4.3 Enhanced Plan Cards (Admin View) (4 hours)

**Implementation**:

```typescript
export function AdminSessionPlanCard({ plan }) {
  const qualityScore = useQuery(api.models.sessionPlans.getQualityScore, { planId: plan._id });

  const borderColor =
    plan.pinnedByAdmin ? "border-l-green-500" :
    plan.flaggedCount > 0 ? "border-l-red-500" :
    !plan.moderatedAt ? "border-l-yellow-500" :
    "";

  const badge =
    plan.pinnedByAdmin ? { text: "📌 PINNED", color: "bg-green-100 text-green-800" } :
    plan.flaggedCount > 0 ? { text: "⚠️ FLAGGED", color: "bg-red-100 text-red-800" } :
    !plan.moderatedAt ? { text: "⏳ NEW", color: "bg-yellow-100 text-yellow-800" } :
    null;

  return (
    <Card className={`${borderColor} border-l-4`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {badge && (
              <Badge className={`${badge.color} text-xs font-bold mb-2`}>
                {badge.text}
              </Badge>
            )}
            <CardTitle className="text-base">{plan.title}</CardTitle>
            <CardDescription>
              By {plan.coachName} • Shared {formatDistanceToNow(plan.sharedAt)} ago
              • Used {plan.timesUsed}x by {plan.uniqueCoaches || 0} coaches
            </CardDescription>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!plan.pinnedByAdmin && (
                <DropdownMenuItem onClick={() => pinPlan(plan._id)}>
                  ⭐ Feature Plan
                </DropdownMenuItem>
              )}
              {plan.pinnedByAdmin && (
                <DropdownMenuItem onClick={() => unpinPlan(plan._id)}>
                  Unpin Plan
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => openRemoveDialog(plan)}>
                🗑️ Remove from Library
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View Full Plan</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {qualityScore !== null && (
          <div className="mt-3">
            <QualityScoreIndicator planId={plan._id} />
          </div>
        )}

        {plan.flaggedCount > 0 && (
          <Alert variant="destructive" className="mt-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              🚩 Flagged by {plan.flaggedCount} coach{plan.flaggedCount > 1 ? "es" : ""}
              {plan.flagReasons && `: ${plan.flagReasons.join(", ")}`}
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
    </Card>
  );
}
```

**Acceptance Criteria**:

- [ ] Status badge visible (PINNED, FLAGGED, NEW)
- [ ] Color-coded left border
- [ ] Quality score displayed
- [ ] Usage stats shown (times used, unique coaches)
- [ ] Quick actions in dropdown
- [ ] Flag reasons displayed if flagged

---

### 4.4 Removal Dialog with Notification (6 hours)

**Files to Create**:

```
apps/web/src/app/orgs/[orgId]/admin/session-plans/remove-plan-dialog.tsx (new)
packages/backend/convex/models/sessionPlans.ts (update)
```

**Implementation**:

1. **Backend: Enhanced Removal** (2 hours)

   ```typescript
   export const removeFromClubLibraryEnhanced = mutation({
     args: {
       planId: v.id("sessionPlans"),
       reason: v.string(),
       message: v.optional(v.string()),
       notifyCoach: v.boolean(),
     },
     handler: async (ctx, args) => {
       // ... existing permission checks

       await ctx.db.patch(args.planId, {
         visibility: "private",
         moderatedAt: Date.now(),
         moderatedBy: admin._id,
         moderationReason: args.reason,
         moderationNote: args.message,
       });

       if (args.notifyCoach) {
         await ctx.db.insert("notifications", {
           userId: plan.coachId,
           type: "plan_removed",
           title: "Session plan removed from club library",
           message:
             args.message ||
             "Your plan was removed. Please review our guidelines.",
           planId: args.planId,
           createdAt: Date.now(),
         });
       }

       return { success: true };
     },
   });
   ```

2. **Frontend: Removal Dialog** (4 hours)
   ```typescript
   export function RemovePlanDialog({ plan, open, onOpenChange }) {
     const [reason, setReason] = useState("");
     const [message, setMessage] = useState("");
     const [notifyCoach, setNotifyCoach] = useState(true);
     const removePlan = useMutation(api.models.sessionPlans.removeFromClubLibraryEnhanced);

     const reasons = [
       "Inappropriate content",
       "Safety concerns",
       "Poor quality",
       "Duplicate content",
       "Violates guidelines",
       "Other",
     ];

     const handleRemove = async () => {
       await removePlan({
         planId: plan._id,
         reason,
         message,
         notifyCoach,
       });

       toast.success("Plan removed from club library");
       onOpenChange(false);
     };

     return (
       <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2 text-red-600">
               <AlertTriangle className="h-5 w-5" />
               Remove from Club Library
             </DialogTitle>
           </DialogHeader>

           <div className="space-y-4 py-4">
             <div className="bg-muted p-3 rounded-lg">
               <p className="font-semibold">{plan.title}</p>
               <p className="text-sm text-muted-foreground">by {plan.coachName}</p>
             </div>

             <div>
               <Label htmlFor="reason">Reason for Removal *</Label>
               <Select value={reason} onValueChange={setReason}>
                 <SelectTrigger id="reason">
                   <SelectValue placeholder="Select a reason..." />
                 </SelectTrigger>
                 <SelectContent>
                   {reasons.map((r) => (
                     <SelectItem key={r} value={r}>{r}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>

             <div>
               <Label htmlFor="message">Message to Coach (optional)</Label>
               <Textarea
                 id="message"
                 value={message}
                 onChange={(e) => setMessage(e.target.value)}
                 placeholder="Explain why this plan was removed and how they can improve..."
                 rows={3}
               />
             </div>

             <Alert className="bg-yellow-50 border-yellow-200">
               <div className="flex items-center gap-2">
                 <Checkbox
                   id="notify"
                   checked={notifyCoach}
                   onCheckedChange={setNotifyCoach}
                 />
                 <Label htmlFor="notify" className="cursor-pointer">
                   Notify {plan.coachName} about removal
                 </Label>
               </div>
             </Alert>
           </div>

           <DialogFooter>
             <Button variant="outline" onClick={() => onOpenChange(false)}>
               Cancel
             </Button>
             <Button
               variant="destructive"
               onClick={handleRemove}
               disabled={!reason}
             >
               Remove Plan
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     );
   }
   ```

**Acceptance Criteria**:

- [ ] Reason dropdown required
- [ ] Optional message field
- [ ] Notify coach checkbox (default checked)
- [ ] Coach receives notification if checked
- [ ] Dialog shows plan details
- [ ] Cannot submit without reason
- [ ] Success toast on removal
- [ ] Plan reverts to private visibility

---

### 4.5 Feature/Pin Plan Action (2 hours)

**Implementation**:

```typescript
export const featurePlan = mutation({
  args: { planId: v.id("sessionPlans") },
  handler: async (ctx, args) => {
    const admin = await getAdminForOrg(ctx, orgId);

    await ctx.db.patch(args.planId, {
      pinnedByAdmin: true,
      moderatedAt: Date.now(),
      moderatedBy: admin._id,
    });

    // Notify coach their plan was featured
    await ctx.db.insert("notifications", {
      userId: plan.coachId,
      type: "plan_featured",
      title: "Your session plan was featured! 🎉",
      message: "Your plan has been featured by an admin for its quality.",
      planId: args.planId,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
```

**Acceptance Criteria**:

- [ ] Pin button in admin card dropdown
- [ ] Plan gets "PINNED" badge
- [ ] Plan appears in "Featured" tab
- [ ] Coach receives positive notification
- [ ] Unpin option available for pinned plans

---

## Phase 5: Polish & Testing (Week 8)

**Goal**: Bug fixes, performance optimization, comprehensive testing  
**Effort**: ~20 hours

### 5.1 Performance Optimization (6 hours)

**Tasks**:

1. Add pagination to plan lists (20 plans per page)
2. Implement virtual scrolling for large lists
3. Optimize search queries (add indexes)
4. Add image lazy loading for plan cards
5. Debounce filter changes (avoid excessive queries)
6. Cache frequently accessed data (React Query)

**Implementation Example**:

```typescript
// Pagination
export const listPlansWithPagination = query({
  args: {
    orgId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessionPlans")
      .withIndex("by_coach", (q) => q.eq("organizationId", args.orgId))
      .paginate(args.paginationOpts);
  },
});

// Frontend usage
const { results, status, loadMore } = usePaginatedQuery(
  api.models.sessionPlans.listPlansWithPagination,
  { orgId },
  { initialNumItems: 20 },
);
```

**Acceptance Criteria**:

- [ ] Initial load <2 seconds
- [ ] Pagination working smoothly
- [ ] Search responds <300ms
- [ ] No layout shift during load
- [ ] Smooth scrolling on mobile

---

### 5.2 Mobile Optimization (4 hours)

**Tasks**:

1. Test all features on mobile devices
2. Ensure touch targets ≥48px
3. Test swipe gestures
4. Optimize modal/drawer transitions
5. Test filter panel on small screens
6. Verify masonry grid on mobile

**Key Areas**:

```css
/* Ensure touch-friendly spacing */
@media (max-width: 640px) {
  .filter-pill {
    min-height: 48px;
    padding: 0.75rem 1rem;
  }

  .plan-card {
    min-height: 120px;
  }

  /* Bottom action bar on mobile */
  .plan-actions {
    position: sticky;
    bottom: 0;
    padding: 1rem;
    background: white;
    border-top: 1px solid #e5e7eb;
  }
}
```

**Acceptance Criteria**:

- [ ] All buttons easily tappable
- [ ] Filter drawer slides from bottom
- [ ] Masonry grid single column on mobile
- [ ] Search bar prominent on mobile
- [ ] No horizontal scroll issues

---

### 5.3 Accessibility Audit (4 hours)

**Tasks**:

1. Test with screen reader (NVDA/VoiceOver)
2. Ensure keyboard navigation works
3. Add ARIA labels where needed
4. Test color contrast (WCAG AA)
5. Add focus indicators
6. Test form validation messages

**Key Implementations**:

```typescript
// Add ARIA labels
<Button
  aria-label={plan.favorited ? "Remove from favorites" : "Add to favorites"}
  onClick={toggleFavorite}
>
  {plan.favorited ? "❤️" : "🤍"}
</Button>

// Keyboard shortcuts
useHotkeys("ctrl+f", () => searchInputRef.current?.focus());
useHotkeys("ctrl+n", () => openCreateDialog());
useHotkeys("esc", () => closeModals());

// Screen reader announcements
const announce = useAnnouncer();
announce(`${plans.length} plans found`);
```

**Acceptance Criteria**:

- [ ] Can navigate entire app with keyboard
- [ ] Screen reader announces important changes
- [ ] All form fields have labels
- [ ] Error messages read aloud
- [ ] Color contrast passes WCAG AA
- [ ] Focus indicators visible

---

### 5.4 User Acceptance Testing (6 hours)

**Testing Scenarios**:

1. **Scenario 1: New Coach Creates First Plan**
   - Navigate to Session Plans
   - Click "Generate New Plan"
   - Fill form and submit
   - Wait for generation
   - Review generated plan
   - Mark as used
   - **Success Criteria**: Plan created, no errors, clear guidance

2. **Scenario 2: Coach Searches for Plan**
   - Open Session Plans
   - Type search query
   - Apply filters
   - Sort results
   - Find relevant plan
   - **Success Criteria**: Found plan in <30 seconds

3. **Scenario 3: Coach Shares Plan to Club**
   - Select a plan
   - Click "Share to Club"
   - Confirm dialog
   - Verify plan in Club Library
   - **Success Criteria**: Plan visible to others immediately

4. **Scenario 4: Admin Moderates Plan**
   - Navigate to Admin → Session Plans
   - Review pending plans
   - Feature a high-quality plan
   - Remove an inappropriate plan
   - Verify coach notifications
   - **Success Criteria**: Actions complete, coaches notified

5. **Scenario 5: Mobile Coach Uses Filters**
   - Open Session Plans on mobile
   - Tap Filters button
   - Select multiple filters
   - Apply filters
   - View results
   - **Success Criteria**: Smooth experience, no layout issues

**Test Checklist**:

- [ ] All scenarios pass on desktop
- [ ] All scenarios pass on mobile
- [ ] All scenarios pass on tablet
- [ ] No console errors
- [ ] Toast notifications appear
- [ ] Data persists correctly
- [ ] Permissions enforced
- [ ] Loading states work
- [ ] Empty states display
- [ ] Error handling graceful

---

## Deployment Strategy

### Pre-Deployment Checklist

**Environment Setup**:

- [ ] Feature flags configured
- [ ] Convex indexes deployed
- [ ] Environment variables set
- [ ] Analytics tracking added
- [ ] Error monitoring configured (Sentry)

**Code Quality**:

- [ ] All TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] Unit tests passing
- [ ] E2E tests passing
- [ ] Bundle size acceptable (<500KB added)
- [ ] Performance benchmarks met

**Documentation**:

- [ ] Update user documentation
- [ ] Add coach onboarding guide
- [ ] Document admin features
- [ ] Update API documentation
- [ ] Create release notes

---

### Phased Rollout

**Week 1-2: Beta Testing (10% of users)**

- Enable for selected beta orgs
- Monitor error rates
- Collect feedback
- Fix critical bugs

**Week 3: Gradual Rollout (50% of users)**

- Enable for half of orgs
- Monitor performance metrics
- Address reported issues
- Refine based on usage patterns

**Week 4: Full Rollout (100% of users)**

- Enable for all users
- Monitor adoption rates
- Celebrate launch 🎉
- Plan iteration based on analytics

---

## Success Metrics

### Phase 1 Targets

- [ ] Time-to-find plan: <2 minutes (from 5+ minutes)
- [ ] Support tickets: -30%
- [ ] User satisfaction: >8/10

### Phase 2 Targets

- [ ] Search usage: 70% of sessions
- [ ] Filter usage: 50% of sessions
- [ ] Mobile engagement: +40%

### Phase 3 Targets

- [ ] Advanced filter usage: 30% of searches
- [ ] Filter satisfaction: >7/10

### Phase 4 Targets

- [ ] Plans shared: 3x increase
- [ ] Plan discovery: +50%
- [ ] Admin moderation time: -50%

### Overall Success Metrics

- [ ] Monthly active coaches using feature: 80%+
- [ ] Plans created per coach: 2+ per month
- [ ] Success rate of plans: >85%
- [ ] NPS for feature: >40

---

## Risk Mitigation

### Technical Risks

**Risk 1: Performance Degradation**

- **Mitigation**: Pagination, caching, indexes
- **Monitoring**: Query timing, bundle size
- **Rollback Plan**: Feature flag to disable

**Risk 2: Data Migration Issues**

- **Mitigation**: Test on staging with prod data clone
- **Monitoring**: Error logs, data consistency checks
- **Rollback Plan**: Maintain backward compatibility

**Risk 3: Mobile Layout Issues**

- **Mitigation**: Extensive mobile testing
- **Monitoring**: Error rates by device
- **Rollback Plan**: Serve desktop layout to mobile if needed

### UX Risks

**Risk 1: User Confusion with New UI**

- **Mitigation**: Onboarding tour, tooltips, help docs
- **Monitoring**: Support tickets, user feedback
- **Rollback Plan**: Provide "classic view" toggle

**Risk 2: Feature Overload**

- **Mitigation**: Progressive disclosure, smart defaults
- **Monitoring**: Feature usage analytics
- **Rollback Plan**: Simplify interface based on usage

---

## Support & Training

### Coach Training Materials

1. **Video Tutorial** (3-5 minutes)
   - Overview of new features
   - How to search and filter
   - How to share plans

2. **Quick Start Guide** (PDF)
   - One-page cheat sheet
   - Common tasks
   - Keyboard shortcuts

3. **In-App Tour**
   - Interactive walkthrough
   - Triggered on first visit
   - Dismissible and re-accessible

### Admin Training

1. **Admin Guide** (documentation)
   - Moderation best practices
   - How to feature plans
   - Handling flags and reports

2. **Admin Workshop** (webinar)
   - Live demo of features
   - Q&A session
   - Best practices sharing

---

## Iteration Plan

### Post-Launch (Months 2-3)

**Based on Analytics**:

- Identify underused features
- Find friction points
- Optimize conversion funnels

**Quick Iterations**:

- Adjust filter defaults
- Refine search relevance
- Improve onboarding
- Add missing features

### Long-Term (Months 4-6)

**Advanced Features**:

- AI recommendations
- Collaborative plans
- Plan templates marketplace
- Video integration
- Mobile app

---

## Appendix

### Useful Commands

```bash
# Start development
npm run dev

# Run tests
npm run test
npm run test:e2e

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build

# Deploy Convex functions
npx convex deploy

# Deploy to production
vercel --prod
```

### File Structure Reference

```
apps/web/src/app/orgs/[orgId]/
├── coach/
│   └── session-plans/
│       ├── page.tsx (main)
│       ├── quick-access.tsx
│       ├── search-bar.tsx
│       ├── filter-pills.tsx
│       ├── sort-dropdown.tsx
│       ├── advanced-filters.tsx
│       ├── masonry-grid.tsx
│       ├── session-plan-card.tsx
│       ├── empty-state.tsx
│       └── filter-sections/
│           ├── age-group-filter.tsx
│           ├── duration-filter.tsx
│           ├── intensity-filter.tsx
│           ├── focus-areas-filter.tsx
│           └── success-rate-filter.tsx
└── admin/
    └── session-plans/
        ├── page.tsx
        ├── admin-dashboard.tsx
        ├── metrics-cards.tsx
        ├── status-tabs.tsx
        ├── admin-plan-card.tsx
        └── remove-plan-dialog.tsx
```

### Key Dependencies

```json
{
  "dependencies": {
    "react-masonry-css": "^1.0.16",
    "sonner": "^1.3.1",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "date-fns": "^3.0.0",
    "react-hotkeys-hook": "^4.4.1"
  }
}
```

---

**End of Implementation Plan**

This plan provides a comprehensive roadmap for implementing the approved Session Plans improvements. Each phase builds on the previous, with clear acceptance criteria and testing requirements.

For implementation assistance with any phase, provide Claude with:

1. The phase number and section
2. The specific files mentioned
3. Any customizations needed

Good luck with the implementation! 🚀
