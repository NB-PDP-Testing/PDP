# ADR-VNM-016: Component Hierarchy and Data Flow

**Date:** 2026-02-17
**Status:** Accepted
**Context:** Phase M5, Story US-VNM-008

## Context and Problem Statement

The M5 dashboard has three visual sections (PipelineFlowGraph, StatusCards, ActivityFeed) that consume data from three backend queries. The question is how to organize components, where to colocate them, and how data flows from queries to visual elements.

## Decision Drivers

- CLAUDE.md: "Feature-specific components should live alongside their page.tsx"
- CLAUDE.md: "Reusable components go in src/components/"
- Query lifting: all useQuery calls in page.tsx
- Components receive data as props only (no internal queries)
- Mobile-first responsive design
- Components may be reused across M5-M9 dashboard pages

## Considered Options

### Option 1: _components/ Directory Colocated with page.tsx

**Approach:** Create `_components/` folder inside the voice-monitoring route directory. All three dashboard components live there. Page.tsx queries data, passes as props.

**Pros:**
- Follows Next.js convention (`_` prefix excludes from routing)
- Components are colocated with their page
- Clear ownership
- Easy to find during development

**Cons:**
- Components not immediately reusable from other routes (but can be moved later)
- Need to ensure imports use relative paths

**Complexity:** Low

### Option 2: Shared Components in src/components/voice-monitoring/

**Approach:** Create shared component directory for all voice monitoring components.

**Pros:**
- Easily reusable across M5-M9 pages
- Single location for all monitoring components

**Cons:**
- Violates CLAUDE.md colocation principle for feature-specific components
- M6-M9 components mixed with M5 components prematurely
- Components in `src/components/` should be truly reusable (not page-specific)

**Complexity:** Low

## Decision Outcome

**Chosen Option:** Option 1 -- _components/ Directory Colocated with page.tsx

**Rationale:**
The PRD specifies this exact pattern: `apps/web/src/app/platform/voice-monitoring/_components/`. This follows Next.js convention where the `_` prefix prevents the folder from being treated as a route segment. Components are feature-specific to the monitoring dashboard and should live near their page. If components later need reuse across M6-M9 pages, they can import from the _components/ path using relative imports (all pages share the same parent directory).

## Implementation Notes

### File Structure

```
apps/web/src/app/platform/voice-monitoring/
  layout.tsx                      # Tab navigation + auth
  page.tsx                        # Overview dashboard (queries here)
  _components/
    PipelineFlowGraph.tsx         # SVG flow visualization
    StatusCards.tsx                # 6 metric cards grid
    ActivityFeed.tsx               # Recent events list
```

### Data Flow Diagram

```
layout.tsx (auth check, tab navigation)
    |
page.tsx (3 x useQuery)
    |
    +-- realTimeMetrics ──> PipelineFlowGraph (props: metrics)
    |                    └> StatusCards (props: metrics, alerts)
    +-- recentEvents ────> ActivityFeed (props: events)
    +-- activeAlerts ────> StatusCards (props: metrics, alerts)
```

### Component Props Interface

```typescript
// PipelineFlowGraph
interface PipelineFlowGraphProps {
  metrics: {
    artifactsReceived1h: number;
    transcriptionsCompleted1h: number;
    claimsExtracted1h: number;
    entitiesResolved1h: number;
    draftsGenerated1h: number;
    artifactsFailed1h: number;
  } | undefined;
}

// StatusCards
interface StatusCardsProps {
  metrics: {
    artifactsReceived1h: number;
    artifactsCompleted1h: number;
    artifactsFailed1h: number;
    // ... all counter fields
  } | undefined;
  alerts: Array<{
    alertType: string;
    severity: string;
    message: string;
  }> | undefined;
}

// ActivityFeed
interface ActivityFeedProps {
  events: Array<{
    eventType: string;
    artifactId?: string;
    timestamp: number;
    pipelineStage?: string;
    metadata?: Record<string, unknown>;
  }> | undefined;
}
```

### Loading State Pattern

All three components must handle `undefined` props (data loading):

```typescript
function PipelineFlowGraph({ metrics }: PipelineFlowGraphProps) {
  if (!metrics) {
    return <PipelineFlowGraphSkeleton />;
  }
  // Render actual content
}
```

### Key Rules

1. **NO useQuery in any _components/ file** -- data comes only from props
2. **Props can be `undefined`** -- components must render loading state
3. **TypeScript interfaces** define the contract between page and components
4. **Each component is a single file** with its own Skeleton component inline
5. **Components are "use client"** implicitly (page.tsx is client, components are imported)

## Consequences

**Positive:**
- Clean data flow: page queries, components display
- Zero N+1 risk (no queries in child components)
- Easy testing (components are pure render functions with props)
- Colocation follows CLAUDE.md guidance

**Negative:**
- If StatusCards and ActivityFeed are needed in M6+ pages, imports use relative paths (acceptable)

**Risks:**
- None. This is a well-established pattern in the codebase.

## References

- PRD component locations: `scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M5.json`
- CLAUDE.md: Component colocation rules
- Existing pattern: `apps/web/src/app/platform/v2-claims/page.tsx` (components in same file)
