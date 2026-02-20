# ADR-VNM-020: Loading States and Skeleton Pattern

**Date:** 2026-02-17
**Status:** Accepted
**Context:** Phase M5, Story US-VNM-008

## Context and Problem Statement

The dashboard makes three concurrent Convex queries. Each query returns `undefined` while loading. The UI must provide a good experience during the loading phase, which can take 100-500ms on initial page load. The question is how to handle loading states across the three data sources.

## Decision Drivers

- Convex useQuery returns `undefined` while loading (not null, not error)
- Three queries may resolve at different times
- shadcn/ui Skeleton component is available
- PRD requires skeleton loaders while data loading
- Existing v2-claims page uses Skeleton for loading states
- Avoid layout shift when data loads

## Decision Outcome

**Chosen Approach:** Component-level skeleton loaders with unified loading detection at the page level.

Each component (`PipelineFlowGraph`, `StatusCards`, `ActivityFeed`) accepts `undefined` props and renders its own skeleton variant internally. The page component does NOT gate rendering on all queries completing -- instead, each section independently transitions from skeleton to content as its data becomes available. This provides progressive loading where faster queries display first.

## Implementation Notes

### Page-Level Pattern

```typescript
// page.tsx -- NO unified loading gate
export default function VoiceMonitoringOverviewPage() {
  const user = useCurrentUser();
  const isPlatformStaff = user?.isPlatformStaff === true;

  const realTimeMetrics = useQuery(
    api.models.voicePipelineMetrics.getRealTimeMetrics,
    isPlatformStaff ? {} : "skip"
  );
  const recentEvents = useQuery(
    api.models.voicePipelineEvents.getRecentEvents,
    isPlatformStaff
      ? { paginationOpts: { numItems: 20, cursor: null }, filters: {} }
      : "skip"
  );
  const activeAlerts = useQuery(
    api.models.voicePipelineAlerts.getActiveAlerts,
    isPlatformStaff ? {} : "skip"
  );

  // Auth loading -- show full-page loader
  if (user === undefined) {
    return <DashboardSkeleton />;
  }

  // Each component handles its own undefined props
  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <PipelineFlowGraph metrics={realTimeMetrics} />
      <StatusCards metrics={realTimeMetrics} alerts={activeAlerts} />
      <ActivityFeed events={recentEvents?.page} />
    </div>
  );
}
```

### Component Skeleton Examples

**StatusCards:**
```tsx
function StatusCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**ActivityFeed:**
```tsx
function ActivityFeedSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-start gap-3 py-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

**PipelineFlowGraph:**
```tsx
function PipelineFlowGraphSkeleton() {
  return (
    <>
      {/* Desktop skeleton */}
      <div className="hidden md:flex items-center justify-between gap-4 py-8 px-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-24 w-44 rounded-lg" />
        ))}
      </div>
      {/* Mobile skeleton */}
      <div className="flex flex-col items-center gap-4 py-8 md:hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-20 w-64 rounded-lg" />
        ))}
      </div>
    </>
  );
}
```

### Key Rules

1. **undefined = loading** -- Convex queries return `undefined` before data arrives
2. **null = no data** -- queries return null/empty when authenticated but no records exist
3. **Progressive loading** -- each section loads independently (no unified gate)
4. **Layout stability** -- skeleton dimensions match final content dimensions to prevent layout shift
5. **Skeleton goes INSIDE the component** -- component handles its own loading state
6. **Auth loading is separate** -- page shows full skeleton only when `user === undefined`

## Consequences

**Positive:**
- Progressive loading (faster perceived performance)
- No layout shift (skeletons match content dimensions)
- Each component is self-contained (handles own loading)
- Consistent with existing v2-claims page pattern

**Negative:**
- Three sections may pop in at slightly different times (acceptable, < 500ms difference)

## References

- shadcn/ui Skeleton: `apps/web/src/components/ui/skeleton.tsx`
- Existing pattern: `apps/web/src/app/platform/v2-claims/page.tsx` (Skeleton usage)
- PRD: "Show skeleton loaders while queries loading"
