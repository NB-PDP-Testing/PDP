# M5 Dashboard UI - Architecture Review Notes

**Date:** 2026-02-17
**Phase:** M5 - Dashboard UI
**Story:** US-VNM-008 (Build Dashboard Overview UI)

---

## Critical Discoveries

### 1. Platform Layout is Client-Side (NOT Server-Side)

The PRD (`PHASE_M5.json`) suggests server-side auth:
```
authPattern: "import { authClient } from '@/lib/auth-client'; const session = await authClient.getSession(); if (!session?.user?.isPlatformStaff) redirect('/platform');"
```

**REALITY:** `apps/web/src/app/platform/layout.tsx` is a `"use client"` component that uses:
- `Authenticated` / `Unauthenticated` / `AuthLoading` guards from convex/react
- `useCurrentUser()` hook for `isPlatformStaff` check
- Client-side redirect via `router.push("/")`

**Guidance:** Voice-monitoring layout MUST follow this pattern. Cannot nest a server component inside a client component layout.

### 2. Tab Navigation Must Use Link, NOT shadcn/ui Tabs

The PRD says "Use shadcn/ui Tabs component" but this is incorrect for URL-based routing.

shadcn/ui `Tabs` is for in-page state management (`TabsContent` expects inline content).
For URL routing across separate `page.tsx` files, use `Link` + `usePathname()`.

**ADR-VNM-019 documents this decision.**

### 3. getRecentEvents Has Custom Pagination

The backend query does NOT use Convex's native `paginationOptsValidator`. It has:
```typescript
paginationOpts: v.object({
  numItems: v.number(),
  cursor: v.union(v.string(), v.null()),
})
```

`usePaginatedQuery` from convex/react may not work with this. Use regular `useQuery` with `cursor: null` for initial load.

### 4. getRecentEvents Returns v.any()

```typescript
returns: v.object({
  page: v.array(v.any()), // Full event objects
  isDone: v.boolean(),
  continueCursor: v.string(),
})
```

Frontend needs a local `PipelineEvent` interface for type safety.

### 5. M4 Used platformCostAlerts (NOT voicePipelineAlerts)

Despite ADR-VNM-008 recommending a new table, M4 implementation reused `platformCostAlerts`:
- Added PIPELINE_* alert types to existing alertType union
- getActiveAlerts filters for `alertType.startsWith("PIPELINE_")`
- JavaScript .filter() on collected array (not Convex .filter())

### 6. No usePaginatedQuery Anywhere in Codebase

Grep found zero uses of `usePaginatedQuery` in `apps/web/src/`. This confirms the project pattern of using `useQuery` with manual pagination.

---

## Backend Query Signatures for M5

### getRealTimeMetrics
- Args: `{ organizationId?: string }` (omit for platform-wide)
- Returns: 10 fields including all counter values and window bounds
- Auth: internal platform staff check (throws on unauthorized)
- Performance: < 50ms (8 counter reads)

### getRecentEvents
- Args: custom pagination + optional filters
- Returns: `{ page: any[], isDone: boolean, continueCursor: string }`
- Auth: checks `user?.isPlatformStaff` directly (slightly different pattern)
- Initial call: `{ paginationOpts: { numItems: 20, cursor: null }, filters: {} }`

### getActiveAlerts
- Args: `{}` (no args)
- Returns: array of alert objects with alertType, severity, message
- Auth: uses `verifyPlatformStaff()` helper
- Filters for PIPELINE_* alerts only, sorted by severity

---

## ADRs Generated

| ADR | Title | Key Decision |
|-----|-------|-------------|
| VNM-014 | Route Structure & Authorization | Client-side auth matching parent layout |
| VNM-015 | Real-Time Data Fetching | 3 x useQuery in page.tsx, skip when not staff |
| VNM-016 | Component Hierarchy | _components/ folder, props-only data flow |
| VNM-017 | Responsive Design | Tailwind mobile-first, two SVG variants |
| VNM-018 | SVG Flow Graph | Inline React SVG, 5 stages, color-coded |
| VNM-019 | Tab Navigation | Link + usePathname, NOT shadcn/ui Tabs |
| VNM-020 | Loading States | Progressive skeleton loading per component |

---

## Open Questions / Risks

1. **StatusCards 4 (Avg Latency) and 6 (Total Cost)**: Require additional queries (historical snapshots, event cost aggregation). Recommended: Show placeholder "--" in M5, implement fully in M7.

2. **Active Artifacts calculation**: `received - completed - failed` can go negative if counter windows differ. Must clamp to `Math.max(0, ...)`.

3. **AI Service Status card**: No direct `aiServiceHealth` query exposed. Infer from PIPELINE_CIRCUIT_BREAKER_OPEN alert presence.

4. **getRecentEvents auth pattern differs**: Uses `user?.isPlatformStaff` directly instead of the two-step `verifyPlatformStaff()` helper used in M3/M4. Not a blocker but inconsistent.

---

## Codebase Pattern References

| Pattern | Example File | Line/Location |
|---------|-------------|---------------|
| Platform staff auth | `apps/web/src/app/platform/layout.tsx` | Lines 13-55 |
| Query skip pattern | `apps/web/src/app/platform/v2-claims/page.tsx` | Lines 293-300 |
| Skeleton loading | `apps/web/src/app/platform/v2-claims/page.tsx` | Lines 246-258 |
| Card grid layout | `apps/web/src/app/platform/page.tsx` | Lines 60-253 |
| useCurrentUser hook | `apps/web/src/hooks/use-current-user.ts` | Full file |
| Breadcrumb usage | `apps/web/src/components/ui/breadcrumb.tsx` | Available |
