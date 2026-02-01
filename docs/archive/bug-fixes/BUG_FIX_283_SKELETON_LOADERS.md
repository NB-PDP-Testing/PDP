# Bug #283: Loading State Inconsistency - Skeleton vs Spinner

## Bug Description
Several pages in the application were using inconsistent loading states. While `loading.tsx` route files use `PageSkeleton` components (skeleton loaders), the corresponding `page.tsx` files were using `<Loader />` (spinner) in their Suspense fallbacks and internal loading states.

This created a jarring UX where users would see:
1. A skeleton loader (from loading.tsx) during route loading
2. Then a spinner (from Suspense fallback) during component loading

## Root Cause
The `PageSkeleton` loading component system was added in Phase 6 for better UX, but not all pages were updated to use it. The Suspense fallbacks and internal `isLoading` checks in the following pages still used the old `<Loader />` spinner component:

### Content Pages (needed PageSkeleton)
- `apps/web/src/app/orgs/[orgId]/coach/page.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/page.tsx`
- `apps/web/src/app/orgs/[orgId]/parents/page.tsx`
- `apps/web/src/app/orgs/[orgId]/parents/injuries/page.tsx`
- `apps/web/src/app/orgs/[orgId]/parents/medical/page.tsx`

### Auth/Transition Pages (needed a minimal skeleton)
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/signup/page.tsx`
- `apps/web/src/app/orgs/current/page.tsx`

## Solution

### For Content Pages
Replaced `<Loader />` with `<PageSkeleton variant="..." />` using the appropriate variant:
- Dashboard pages → `variant="dashboard"`
- List pages → `variant="list"`
- Detail pages → `variant="detail"`
- Voice notes (with tabs) → `variant="dashboard" showTabs`

### For Auth/Transition Pages
Created a new `CenteredSkeleton` component at `apps/web/src/components/loading/centered-skeleton.tsx`.

This component shows a minimal centered pulsing skeleton (avatar circle + text bar) that is appropriate for brief auth transitions and redirects, where a full page skeleton would be excessive and jarring.

```tsx
// CenteredSkeleton shows:
// - A centered pulsing circle (12x12)
// - A centered pulsing text bar below it
// Perfect for auth loading, redirects, and transition states
```

## Files Changed
1. `apps/web/src/components/loading/centered-skeleton.tsx` (new)
2. `apps/web/src/components/loading/index.ts` (added export)
3. `apps/web/src/app/login/page.tsx`
4. `apps/web/src/app/signup/page.tsx`
5. `apps/web/src/app/orgs/current/page.tsx`
6. `apps/web/src/app/orgs/[orgId]/coach/page.tsx`
7. `apps/web/src/app/orgs/[orgId]/coach/voice-notes/page.tsx`
8. `apps/web/src/app/orgs/[orgId]/parents/page.tsx`
9. `apps/web/src/app/orgs/[orgId]/parents/injuries/page.tsx`
10. `apps/web/src/app/orgs/[orgId]/parents/medical/page.tsx`

## Testing Steps
1. **Login page**: Navigate to `/login` while logged out - verify skeleton appears instead of spinner during auth loading
2. **Signup page**: Navigate to `/signup` - verify skeleton appears during auth loading and redirect
3. **Org routing**: Log in and verify `/orgs/current` shows skeleton during redirect determination
4. **Parent dashboard**: Navigate to parent dashboard - verify dashboard skeleton during load
5. **Coach dashboard**: Navigate to coach dashboard - verify dashboard skeleton during load
6. **Voice notes**: Navigate to voice notes page - verify skeleton with tabs during load
7. **Injuries page**: Navigate to injuries page (as parent) - verify list skeleton during load
8. **Medical page**: Navigate to medical page (as parent) - verify detail skeleton during load

## PR
https://github.com/NB-PDP-Testing/PDP/pull/398
