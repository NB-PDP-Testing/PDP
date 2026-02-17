# ADR-VNM-014: Frontend Route Structure and Authorization Pattern

**Date:** 2026-02-17
**Status:** Accepted
**Context:** Phase M5, Story US-VNM-008

## Context and Problem Statement

Phase M5 introduces the first frontend routes for the Voice Flow Monitoring Harness at `/platform/voice-monitoring`. The dashboard needs tab-based navigation across 8 sub-pages and must enforce platform staff authorization. The key decision is whether to use server-side or client-side authorization, and how to structure the nested route layout.

## Decision Drivers

- Existing `/platform/layout.tsx` uses client-side auth with `Authenticated`/`Unauthenticated` guards and `useCurrentUser` hook
- Convex queries use `useQuery` which requires client components
- Next.js App Router supports nested layouts for tab navigation
- Platform staff check must prevent unauthorized access without flash of content
- Tab navigation must persist across sub-page navigations

## Considered Options

### Option 1: Server Component Layout with authClient.getSession()

**Approach:** Use Next.js server component for layout.tsx with server-side auth check via `authClient.getSession()`.

**Pros:**
- No flash of unauthorized content
- Server-side redirect is faster

**Cons:**
- Incompatible with existing pattern (parent `/platform/layout.tsx` is already a client component)
- Cannot nest a server component layout inside a client component layout
- `authClient.getSession()` may not work in server components with Convex auth
- Would require restructuring the entire `/platform` route group

**Complexity:** High
**Performance:** Faster initial load
**Scalability:** Good

### Option 2: Client Component Layout Matching Existing Pattern

**Approach:** Use a client component layout matching the existing `/platform/layout.tsx` pattern. Leverage `useCurrentUser()` for auth check, show loader while checking, redirect if unauthorized. Add tab navigation with shadcn/ui Tabs using Next.js `usePathname` for active state.

**Pros:**
- Consistent with existing platform auth pattern
- Works within current client component hierarchy
- `useCurrentUser()` already cached in context (no additional query)
- Tab navigation integrates naturally with Next.js routing

**Cons:**
- Brief loading state while auth resolves (mitigated by parent layout already checking)
- Client-side redirect (not server-side)

**Complexity:** Low
**Performance:** Negligible overhead (parent layout already resolved auth)
**Scalability:** Good

### Option 3: Route Group with Middleware

**Approach:** Use Next.js middleware for auth check on `/platform/voice-monitoring/*` routes.

**Pros:**
- Edge-level auth check

**Cons:**
- Convex user data not available in middleware
- Cannot check `isPlatformStaff` without database query
- Middleware complexity for this use case is unjustified

**Complexity:** High
**Performance:** Fastest auth check
**Scalability:** Overkill

## Decision Outcome

**Chosen Option:** Option 2 -- Client Component Layout Matching Existing Pattern

**Rationale:**
The parent `/platform/layout.tsx` is already a client component that checks `isPlatformStaff`. By the time the voice-monitoring layout renders, the user is already authenticated and verified as platform staff. The voice-monitoring layout only needs to add tab navigation -- it can rely on the parent for auth and add a lightweight redundant check as defense-in-depth. This approach is consistent, low-risk, and avoids architectural restructuring.

## Implementation Notes

- Layout file: `apps/web/src/app/platform/voice-monitoring/layout.tsx`
- Must be `"use client"` to use `usePathname()` for active tab detection
- Auth check: `useCurrentUser()` from context (zero additional queries)
- Parent `/platform/layout.tsx` already handles `Authenticated`/`Unauthenticated`/`AuthLoading` guards
- Voice-monitoring layout adds defense-in-depth check (redirect if `!user?.isPlatformStaff`)
- Tab navigation uses `Link` components with `usePathname()` to determine active tab
- Do NOT use shadcn/ui `Tabs` component for routing (it manages internal state, not URL state). Instead, use styled `Link` elements that look like tabs.

### Route Structure

```
/platform/                              # Existing hub page
/platform/voice-monitoring/             # Overview (M5)
/platform/voice-monitoring/artifacts/   # Artifacts grid (M6)
/platform/voice-monitoring/metrics/     # Metrics charts (M7)
/platform/voice-monitoring/events/      # Event log (M7)
/platform/voice-monitoring/pipeline/    # Pipeline detail (M8)
/platform/voice-monitoring/alerts/      # Alert management (M9)
/platform/voice-monitoring/settings/    # Settings (deferred)
```

### Tab Configuration

```typescript
const TABS = [
  { label: "Overview", href: "/platform/voice-monitoring" },
  { label: "Artifacts", href: "/platform/voice-monitoring/artifacts" },
  { label: "Metrics", href: "/platform/voice-monitoring/metrics" },
  { label: "Events", href: "/platform/voice-monitoring/events" },
  { label: "Pipeline", href: "/platform/voice-monitoring/pipeline" },
  { label: "Alerts", href: "/platform/voice-monitoring/alerts" },
  { label: "Settings", href: "/platform/voice-monitoring/settings" },
] as const;
```

## Consequences

**Positive:**
- Consistent with existing platform auth pattern
- Zero additional auth queries (reads from context)
- Tab navigation persists across page transitions
- Future M6-M9 phases just add `page.tsx` files in sub-folders

**Negative:**
- Brief loading flash on direct URL navigation (mitigated by parent layout)

**Risks:**
- None significant. Parent layout already enforces auth.

## References

- Existing pattern: `apps/web/src/app/platform/layout.tsx`
- useCurrentUser hook: `apps/web/src/hooks/use-current-user.ts`
- PRD: `scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M5.json`
