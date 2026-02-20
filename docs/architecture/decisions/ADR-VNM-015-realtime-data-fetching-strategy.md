# ADR-VNM-015: Real-Time Data Fetching Strategy

**Date:** 2026-02-17
**Status:** Accepted
**Context:** Phase M5, Story US-VNM-008

## Context and Problem Statement

The M5 dashboard displays three data sources: real-time pipeline metrics (from counters), recent pipeline events (paginated), and active alerts. All three must update in real-time as the pipeline processes voice notes. The key decisions are: which Convex query hooks to use, where to place queries (page vs component), and how to handle the paginated events query.

## Decision Drivers

- CLAUDE.md mandates query lifting to page level (no `useQuery` in child components)
- Real-time metrics must update within 10 seconds of pipeline events
- Activity feed needs the last 20 events with pagination for "load more"
- `getRecentEvents` uses a custom pagination object (not Convex's native `paginationOptsValidator`)
- No existing `usePaginatedQuery` usage in the codebase
- Performance: dashboard page load < 2 seconds

## Considered Options

### Option 1: useQuery for All Three Data Sources

**Approach:** Use `useQuery` for metrics, events (first page only), and alerts. Pass data as props to child components.

**Pros:**
- Simple, consistent pattern
- All data lifted to page level
- Real-time updates via Convex reactive subscriptions
- No new hook patterns to introduce

**Cons:**
- Events query returns first page only (no "load more" without additional state)
- Must manually manage cursor for pagination

**Complexity:** Low
**Performance:** Good (3 reactive queries)

### Option 2: useQuery + usePaginatedQuery

**Approach:** Use `useQuery` for metrics and alerts, `usePaginatedQuery` for events.

**Pros:**
- Built-in "load more" support for events

**Cons:**
- `getRecentEvents` uses custom pagination args (not native Convex pagination) -- `usePaginatedQuery` may not work with the custom `paginationOpts` validator
- Introduces new hook pattern not used elsewhere in codebase
- Additional complexity

**Complexity:** Medium
**Performance:** Good

### Option 3: useQuery for Metrics/Alerts + Manual Pagination State for Events

**Approach:** Use `useQuery` for metrics and alerts. For events, use `useQuery` with cursor state managed in the page component. Initial load fetches 20 items, "load more" refetches with new cursor.

**Pros:**
- Compatible with custom pagination args in `getRecentEvents`
- Explicit control over pagination
- Data still lifted to page level

**Cons:**
- Manual cursor management
- Activity feed in M5 only needs last 20 events (no "load more" until M7)

**Complexity:** Medium
**Performance:** Good

## Decision Outcome

**Chosen Option:** Option 1 -- useQuery for All Three Data Sources

**Rationale:**
For M5, the activity feed only needs the last 20 events. There is no "load more" requirement until M7 (Events page). Using `useQuery` with a fixed `numItems: 20` and `cursor: null` is the simplest approach. The `getRecentEvents` query uses a custom pagination validator, so `usePaginatedQuery` would require refactoring the backend query. Since we only need the first page, `useQuery` is correct and sufficient.

The three `useQuery` calls in page.tsx create three Convex reactive subscriptions, all of which update automatically when backend data changes. This satisfies the "< 10 second update" requirement with zero additional infrastructure.

## Implementation Notes

### Query Pattern in page.tsx

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@pdp/backend/convex/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function VoiceMonitoringOverviewPage() {
  const user = useCurrentUser();
  const isPlatformStaff = user?.isPlatformStaff === true;

  // Query 1: Real-time metrics (O(1) counter reads)
  const realTimeMetrics = useQuery(
    api.models.voicePipelineMetrics.getRealTimeMetrics,
    isPlatformStaff ? {} : "skip"
  );

  // Query 2: Recent events (last 20, first page only)
  const recentEvents = useQuery(
    api.models.voicePipelineEvents.getRecentEvents,
    isPlatformStaff
      ? { paginationOpts: { numItems: 20, cursor: null }, filters: {} }
      : "skip"
  );

  // Query 3: Active alerts
  const activeAlerts = useQuery(
    api.models.voicePipelineAlerts.getActiveAlerts,
    isPlatformStaff ? {} : "skip"
  );

  // Pass ALL data as props to child components
  return (
    <>
      <PipelineFlowGraph metrics={realTimeMetrics} />
      <StatusCards
        metrics={realTimeMetrics}
        alerts={activeAlerts}
      />
      <ActivityFeed events={recentEvents?.page} />
    </>
  );
}
```

### Critical Rules

1. **ALL useQuery calls MUST be in page.tsx** -- child components receive data as props only
2. **Skip pattern REQUIRED** -- pass `"skip"` when `isPlatformStaff` is falsy
3. **Loading state** -- when any query returns `undefined`, show Skeleton loaders
4. **No useQuery in _components/** -- this is the project's most critical performance rule
5. **`cursor: null`** for initial page load (not `undefined`)

### Query Skip Rationale

Even though the parent `/platform/layout.tsx` checks auth, queries must still skip when `isPlatformStaff` is not confirmed because:
- `useCurrentUser()` returns `undefined` during initial load
- Queries would fire before auth state resolves
- Backend throws errors for non-platform-staff users

## Consequences

**Positive:**
- Three reactive subscriptions provide real-time updates
- All data lifted to page level (CLAUDE.md compliance)
- Simple, consistent pattern
- Skip pattern prevents wasted queries during auth loading

**Negative:**
- No "load more" for activity feed in M5 (deferred to M7)
- Three concurrent subscriptions (acceptable, all are lightweight)

**Risks:**
- `getRecentEvents` returns `v.any()` for page items. TypeScript types will need assertion or a type helper on the frontend.
- Mitigation: Create a local `PipelineEvent` type in the page file based on the known event shape.

## References

- Performance patterns: `scripts/ralph/prds/voice-monitor-harness/context/PERFORMANCE_PATTERNS.md`
- Backend query: `packages/backend/convex/models/voicePipelineMetrics.ts` getRealTimeMetrics
- Backend query: `packages/backend/convex/models/voicePipelineEvents.ts` getRecentEvents
- Existing pattern: `apps/web/src/app/platform/v2-claims/page.tsx`
- CLAUDE.md: Query lifting rules
