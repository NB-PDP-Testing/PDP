# UX Integration Tasks for Implementer

**Updated:** January 9, 2026
**Source:** UX Audit Update Report
**Previous Quick Wins:** 7/7 COMPLETE (SkipLink, DensityProvider, KeyboardShortcutsOverlay, AnnouncerProvider, aria-labels, dialog widths)
**Remaining Estimated Effort:** 19-27 hours

---

## Priority Legend

- 🔴 **CRITICAL** - Blocking user experience, fix immediately
- 🟠 **HIGH** - Significant UX impact, fix this week
- 🟡 **MEDIUM** - Noticeable improvement, fix when possible
- 🟢 **LOW** - Polish, nice-to-have

---

## ✅ COMPLETED TASKS (January 9, 2026)

These tasks were completed in the quick wins session:

- [x] **Task 1.1:** Add DensityProvider ✅ `providers.tsx:26`
- [x] **Task 1.2:** Add SkipLink ✅ `layout.tsx:63`
- [x] **Task 1.3:** Add KeyboardShortcutsOverlay ✅ `layout.tsx:70`
- [x] **Task 1.4:** Add AnnouncerProvider ✅ `providers.tsx:27`
- [x] **Task 1.5:** Fix color input aria-labels ✅ (6 inputs)
- [x] **Task 1.6:** Fix dialog sm:max-w-md ✅ (4 dialogs)
- [x] **Task 1.7:** Add id="main-content" ✅ `layout.tsx:73`

---

## 🔴 REMAINING TASKS

### Task 2.1: Add PWAUpdatePrompt
**Priority:** 🟠 HIGH
**Effort:** 10 minutes
**File:** `apps/web/src/app/layout.tsx`

The `PWAUpdatePrompt` component exists but is not rendered. Users don't get notified when a new version is available.

```tsx
// Add import at top of file
import { PWAUpdatePrompt } from "@/components/pwa";

// Add inside FlowInterceptor, after PWAInstallPrompt:
<PWAUpdatePrompt />
```

**Acceptance Criteria:**
- [ ] PWAUpdatePrompt renders in root layout
- [ ] When service worker detects update, prompt appears
- [ ] User can dismiss or refresh to update

---

### Task 2.2: Create Error Boundaries
**Priority:** 🔴 CRITICAL
**Effort:** 30 minutes

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/error.tsx`
- `apps/web/src/app/orgs/[orgId]/admin/error.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/error.tsx`
- `apps/web/src/app/orgs/[orgId]/parents/error.tsx`
- `apps/web/src/app/orgs/[orgId]/player/error.tsx`

**Template:**
```tsx
"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-center text-muted-foreground max-w-md">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}
```

---

### Task 2.3: Fix Mobile Org/Role Switcher
**Priority:** 🔴 CRITICAL
**Effort:** 2 hours
**File:** `apps/web/src/components/org-role-switcher.tsx`

Uses `Popover` (320px) instead of full-screen sheet on mobile.

**Fix:** Replace `Popover` with `ResponsiveDialog`:
```tsx
import { ResponsiveDialog } from "@/components/interactions";

<ResponsiveDialog
  trigger={<Button variant="outline" size="sm">...</Button>}
  title="Switch Organization or Role"
  mobileFullScreen
>
  {/* Same Command content */}
</ResponsiveDialog>
```

---

### Task 2.4: Fix Fixed-Width Select Triggers
**Priority:** 🟠 HIGH
**Effort:** 1 hour

**11 Instances to Fix:**

| File | Line | Change |
|------|------|--------|
| `admin/players/page.tsx` | 626 | `w-[160px]` → `w-full sm:w-[160px]` |
| `admin/players/page.tsx` | 639 | `w-[160px]` → `w-full sm:w-[160px]` |
| `admin/players/page.tsx` | 652 | `w-[160px]` → `w-full sm:w-[160px]` |
| `admin/players/page.tsx` | 681 | `w-[180px]` → `w-full sm:w-[180px]` |
| `admin/teams/page.tsx` | 858 | `w-[180px]` → `w-full sm:w-[180px]` |
| `admin/teams/page.tsx` | 871 | `w-[180px]` → `w-full sm:w-[180px]` |
| `admin/analytics/page.tsx` | 337 | `w-[140px]` → `w-full sm:w-[140px]` |
| `admin/analytics/page.tsx` | 350 | `w-[140px]` → `w-full sm:w-[140px]` |
| `admin/analytics/page.tsx` | 364 | `w-[140px]` → `w-full sm:w-[140px]` |
| `admin/medical/page.tsx` | 1008 | `w-[180px]` → `w-full sm:w-[180px]` |
| `admin/medical/page.tsx` | 1021 | `w-[180px]` → `w-full sm:w-[180px]` |

---

### Task 2.5: Migrate to ResponsiveDialog
**Priority:** 🟠 HIGH
**Effort:** 2-4 hours

Replace all `<Dialog>` with `<ResponsiveDialog>` for mobile sheet behavior.

```tsx
// Before
import { Dialog, DialogContent } from "@/components/ui/dialog";

// After
import { ResponsiveDialog } from "@/components/interactions";
```

---

### Task 2.6: Migrate to ResponsiveForm
**Priority:** 🟠 HIGH
**Effort:** 4-8 hours

Migrate forms to use `ResponsiveForm` for sticky submit buttons and keyboard shortcuts.

**Key Forms:**
- Add Player dialog
- Add Team dialog
- Settings forms
- Organization create page

---

### Task 2.7: Fix Small Button Touch Targets
**Priority:** 🟡 MEDIUM
**Effort:** 1 hour

Add responsive sizing to buttons using `size="sm"`:
```tsx
<Button size="sm" className="h-11 sm:h-9">Edit</Button>
```

---

### Task 2.8: Use Dedicated Skeleton Components
**Priority:** 🟡 MEDIUM
**Effort:** 2 hours

Replace inline `<Skeleton>` with `PageSkeleton`, `TableSkeleton`, etc.

---

## Phase 2: Error Handling (1 hour total)

Add graceful error handling to prevent white screens.

### Task 2.1: Create Reusable Error Component (15 minutes)
**File:** `/apps/web/src/components/error-boundary-fallback.tsx` (new file)

```tsx
"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorBoundaryFallback({ error, reset }: ErrorBoundaryFallbackProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            An error occurred while loading this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === "development" && (
            <div className="rounded-md bg-muted p-3">
              <pre className="text-xs overflow-auto">
                {error.message}
              </pre>
            </div>
          )}
          <Button onClick={reset} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Task 2.2: Add error.tsx to Admin Routes (10 minutes each)
Create these files:

**`/apps/web/src/app/orgs/[orgId]/admin/error.tsx`**
```tsx
"use client";

import { ErrorBoundaryFallback } from "@/components/error-boundary-fallback";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorBoundaryFallback error={error} reset={reset} />;
}
```

Repeat for:
- `/apps/web/src/app/orgs/[orgId]/coach/error.tsx`
- `/apps/web/src/app/orgs/[orgId]/parents/error.tsx`
- `/apps/web/src/app/orgs/[orgId]/player/error.tsx`

---

### Task 2.3: Test Phase 2 (5 minutes)
1. Temporarily break a query in admin page
2. Verify error boundary shows friendly message
3. Click "Try again" - should recover
4. Remove the break

---

## Phase 3: Loading States (2 hours total)

Add loading indicators to all major routes.

### Task 3.1: Add loading.tsx to Coach Routes (30 minutes)

**`/apps/web/src/app/orgs/[orgId]/coach/loading.tsx`**
```tsx
import { PageSkeleton } from "@/components/loading";

export default function CoachLoading() {
  return <PageSkeleton variant="dashboard" />;
}
```

**`/apps/web/src/app/orgs/[orgId]/coach/voice-notes/loading.tsx`**
```tsx
import { PageSkeleton } from "@/components/loading";

export default function VoiceNotesLoading() {
  return <PageSkeleton variant="list" />;
}
```

Repeat for:
- `/coach/assess/loading.tsx` (variant="form")
- `/coach/goals/loading.tsx` (variant="list")
- `/coach/injuries/loading.tsx` (variant="list")
- `/coach/medical/loading.tsx` (variant="list")

---

### Task 3.2: Add loading.tsx to Parent Routes (30 minutes)

**`/apps/web/src/app/orgs/[orgId]/parents/loading.tsx`**
```tsx
import { PageSkeleton } from "@/components/loading";

export default function ParentsLoading() {
  return <PageSkeleton variant="dashboard" />;
}
```

---

### Task 3.3: Add loading.tsx to Player Routes (30 minutes)

**`/apps/web/src/app/orgs/[orgId]/player/loading.tsx`**
```tsx
import { PageSkeleton } from "@/components/loading";

export default function PlayerLoading() {
  return <PageSkeleton variant="dashboard" />;
}
```

**`/apps/web/src/app/orgs/[orgId]/players/[playerId]/loading.tsx`**
```tsx
import { PlayerDetailSkeleton } from "@/components/loading";

export default function PlayerDetailLoading() {
  return <PlayerDetailSkeleton />;
}
```

---

### Task 3.4: Test Phase 3 (30 minutes)
1. Navigate to each route
2. Verify skeleton appears during loading
3. Verify content loads correctly
4. Test on slow 3G connection

---

## Phase 4: Empty States (2 hours total)

Standardize empty state handling across the app.

### Task 4.1: Refactor Admin Players Empty State (30 minutes)
**File:** `/apps/web/src/app/orgs/[orgId]/admin/players/page.tsx`

Replace inline empty state with:
```tsx
import { EmptyState } from "@/components/feedback/empty-state";

// Replace the inline empty div with:
<EmptyState
  icon={Users}
  title={hasFilters ? "No players found" : "No players yet"}
  description={
    hasFilters
      ? "No players match your search criteria"
      : "Import your first players to get started"
  }
  action={
    !hasFilters && (
      <Button asChild>
        <Link href={`/orgs/${orgId}/admin/player-import`}>
          Import Players
        </Link>
      </Button>
    )
  }
/>
```

---

### Task 4.2: Refactor Other Empty States (30 minutes each)
Apply the same pattern to:
- Admin teams page
- Admin users page
- Coach dashboard (no teams)
- Parent dashboard (no children)
- Player edit page (no teams)

---

## Phase 5: Responsive Forms (4 hours total)

Refactor forms to use ResponsiveForm for better mobile UX.

### Task 5.1: Refactor Team Creation Form (1 hour)
**File:** `/apps/web/src/app/orgs/[orgId]/admin/teams/page.tsx`

```tsx
import { ResponsiveForm, ResponsiveFormSection, ResponsiveFormRow } from "@/components/forms";

// Replace current form with:
<ResponsiveForm onSubmit={handleSubmit}>
  <ResponsiveFormSection title="Basic Information">
    <ResponsiveFormRow columns={2}>
      <FormField name="name" label="Team Name" />
      <FormField name="sport" label="Sport" />
    </ResponsiveFormRow>
    {/* ... more fields */}
  </ResponsiveFormSection>
  
  <ResponsiveFormSection title="Details">
    {/* ... */}
  </ResponsiveFormSection>
</ResponsiveForm>
```

---

### Task 5.2: Refactor Other Forms (1 hour each)
Apply to:
- Player creation form
- User invitation form
- Organization settings form

---

## Phase 6: Responsive Dialogs (4 hours total)

Replace Dialog with ResponsiveDialog for better mobile UX.

### Task 6.1: Audit Dialog Usage (30 minutes)
```bash
grep -r "Dialog>" apps/web/src/app/orgs --include="*.tsx" -l
```

List all files using Dialog component.

---

### Task 6.2: Replace Dialogs (30 minutes each)
For each dialog found:

```tsx
import { ResponsiveDialog } from "@/components/interactions";

// Replace:
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* content */}
  </DialogContent>
</Dialog>

// With:
<ResponsiveDialog
  open={open}
  onOpenChange={setOpen}
  title="Title"
>
  {/* content */}
</ResponsiveDialog>
```

---

## Phase 7: Performance Optimization (6 hours total)

Add virtualization to large lists.

### Task 7.1: Add VirtualizedList to Admin Players (2 hours)
**File:** `/apps/web/src/app/orgs/[orgId]/admin/players/page.tsx`

```tsx
import { VirtualizedList } from "@/components/performance/virtualized-list";

// Replace map() with:
<VirtualizedList
  items={filteredPlayers}
  itemHeight={72}
  renderItem={(player) => <PlayerCard player={player} />}
  className="h-[600px]"
/>
```

---

### Task 7.2: Add to Other Large Lists (2 hours each)
Apply to:
- Admin teams page
- Admin users page
- Coach player list

---

## Completion Checklist

### Phase 1: Quick Wins (30 min)
- [ ] DensityProvider added to providers.tsx
- [ ] SkipLink added to layout.tsx
- [ ] KeyboardShortcutsOverlay added to layout.tsx
- [ ] Phase 1 tested and working

### Phase 2: Error Handling (1 hour)
- [ ] ErrorBoundaryFallback component created
- [ ] error.tsx added to admin routes
- [ ] error.tsx added to coach routes
- [ ] error.tsx added to parent routes
- [ ] error.tsx added to player routes
- [ ] Phase 2 tested and working

### Phase 3: Loading States (2 hours)
- [ ] loading.tsx added to all coach routes
- [ ] loading.tsx added to all parent routes
- [ ] loading.tsx added to all player routes
- [ ] Phase 3 tested and working

### Phase 4: Empty States (2 hours)
- [ ] Admin players empty state refactored
- [ ] Admin teams empty state refactored
- [ ] Coach dashboard empty state refactored
- [ ] Parent dashboard empty state refactored
- [ ] Phase 4 tested and working

### Phase 5: Responsive Forms (4 hours)
- [ ] Team creation form refactored
- [ ] Player creation form refactored
- [ ] User invitation form refactored
- [ ] Phase 5 tested on mobile and desktop

### Phase 6: Responsive Dialogs (4 hours)
- [ ] Dialog usage audited
- [ ] All dialogs replaced with ResponsiveDialog
- [ ] Phase 6 tested on mobile and desktop

### Phase 7: Performance (6 hours)
- [ ] VirtualizedList added to admin players
- [ ] VirtualizedList added to admin teams
- [ ] VirtualizedList added to coach players
- [ ] Phase 7 performance tested

---

## Total Estimated Time
- Phase 1: 30 minutes (PRIORITY - DO FIRST)
- Phase 2: 1 hour
- Phase 3: 2 hours
- Phase 4: 2 hours
- Phase 5: 4 hours
- Phase 6: 4 hours
- Phase 7: 6 hours

**GRAND TOTAL: ~20 hours**

---

## Success Metrics

After completing all phases:
- ✅ 19/19 UX components integrated
- ✅ All feature flags functional
- ✅ WCAG 2.1 Level AA compliance
- ✅ Loading states on all routes
- ✅ Error handling on all routes
- ✅ Consistent empty states
- ✅ Mobile-optimized forms and dialogs
- ✅ Performance-optimized large lists

---

*Start with Phase 1 for immediate impact. Each phase is independently deployable.*
