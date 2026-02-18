# M5 Implementation Guide - Dashboard UI

**Phase:** M5 - Dashboard UI
**Story:** US-VNM-008 (Build Dashboard Overview UI)
**Date:** 2026-02-17
**ADRs:** VNM-014 through VNM-020

---

## Executive Summary

M5 creates the frontend foundation for the Voice Flow Monitoring Harness. It implements a single user story (US-VNM-008) that delivers:
1. A route structure at `/platform/voice-monitoring` with tab navigation
2. A dashboard overview page with three real-time sections
3. An update to the platform hub page

All backend queries needed (M1-M4) are already implemented. M5 is purely frontend work.

---

## CRITICAL: Read Before Implementing

### Architectural Decisions (MUST follow)

| ADR | Decision | Key Rule |
|-----|----------|----------|
| VNM-014 | Route structure uses client-side auth | Match existing `/platform/layout.tsx` pattern, NOT server-side auth |
| VNM-015 | Three `useQuery` calls in page.tsx | ALL queries in page.tsx, components receive props ONLY |
| VNM-016 | _components/ directory colocated | Components in `_components/` folder, no queries inside |
| VNM-017 | Tailwind responsive breakpoints | Mobile-first, two SVG variants toggled via CSS |
| VNM-018 | Inline SVG for flow graph | React JSX SVG, no external charting libraries |
| VNM-019 | Link-based tab navigation | Do NOT use shadcn/ui Tabs for routing, use Link + usePathname |
| VNM-020 | Progressive skeleton loading | Each component handles own loading, no unified gate |

### Lessons from M1-M4 (MUST read)

1. **Counter schema**: Query by `counterType`, access `currentValue` -- NOT named fields
2. **Platform staff auth**: Use `useCurrentUser()` from context (zero queries)
3. **Query skipping**: Pass `"skip"` when `isPlatformStaff` is falsy
4. **Atomic imports**: Add import + usage in SAME edit (linter removes unused)
5. **getRecentEvents pagination**: Custom `paginationOpts` with `numItems` and `cursor: null`
6. **JavaScript .filter() is OK**: Only Convex `.filter()` after `.withIndex()` is forbidden

---

## File-by-File Implementation Guide

### File 1: layout.tsx

**Path:** `apps/web/src/app/platform/voice-monitoring/layout.tsx`
**Type:** Client component (`"use client"`)

**Purpose:** Tab navigation bar + breadcrumb + defense-in-depth auth check

**Implementation:**

```typescript
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Skeleton } from "@/components/ui/skeleton";

const TABS = [
  { label: "Overview", href: "/platform/voice-monitoring" },
  { label: "Artifacts", href: "/platform/voice-monitoring/artifacts" },
  { label: "Metrics", href: "/platform/voice-monitoring/metrics" },
  { label: "Events", href: "/platform/voice-monitoring/events" },
  { label: "Pipeline", href: "/platform/voice-monitoring/pipeline" },
  { label: "Alerts", href: "/platform/voice-monitoring/alerts" },
  { label: "Settings", href: "/platform/voice-monitoring/settings" },
] as const;

export default function VoiceMonitoringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();

  // Defense-in-depth: redirect if not platform staff
  // (Parent /platform/layout.tsx already checks, but verify here too)
  useEffect(() => {
    if (user !== undefined && user !== null && !user.isPlatformStaff) {
      router.push("/platform");
    }
  }, [user, router]);

  if (user === undefined) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === "/platform/voice-monitoring") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b bg-background px-4 py-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/platform">Platform</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Voice Monitoring</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Tab Navigation */}
      <nav className="overflow-x-auto border-b bg-background">
        <div className="flex min-w-max gap-1 px-4">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                isActive(tab.href)
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Page Content */}
      {children}
    </div>
  );
}
```

**Key Points:**
- `"use client"` required for `usePathname()` and `useCurrentUser()`
- Auth check is defense-in-depth (parent already checks)
- Tab active state: exact match for Overview, prefix match for sub-routes
- `overflow-x-auto` + `min-w-max` enables horizontal scroll on mobile
- `useCurrentUser()` reads from context (zero additional queries)

---

### File 2: page.tsx

**Path:** `apps/web/src/app/platform/voice-monitoring/page.tsx`
**Type:** Client component (`"use client"`)

**Purpose:** Dashboard overview with three sections, all queries lifted here

**Critical Pattern:** ALL `useQuery` calls go in this file. Components receive data via props.

**Implementation:**

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@pdp/backend/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PipelineFlowGraph } from "./_components/PipelineFlowGraph";
import { StatusCards } from "./_components/StatusCards";
import { ActivityFeed } from "./_components/ActivityFeed";

export default function VoiceMonitoringOverviewPage() {
  const user = useCurrentUser();
  const isPlatformStaff = user?.isPlatformStaff === true;

  // Query 1: Real-time metrics from counters (O(1))
  const realTimeMetrics = useQuery(
    api.models.voicePipelineMetrics.getRealTimeMetrics,
    isPlatformStaff ? {} : "skip"
  );

  // Query 2: Recent pipeline events (last 20)
  const recentEvents = useQuery(
    api.models.voicePipelineEvents.getRecentEvents,
    isPlatformStaff
      ? { paginationOpts: { numItems: 20, cursor: null }, filters: {} }
      : "skip"
  );

  // Query 3: Active pipeline alerts
  const activeAlerts = useQuery(
    api.models.voicePipelineAlerts.getActiveAlerts,
    isPlatformStaff ? {} : "skip"
  );

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      {/* Section 1: Pipeline Flow Graph */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <PipelineFlowGraph metrics={realTimeMetrics} />
        </CardContent>
      </Card>

      {/* Section 2: Status Cards */}
      <StatusCards metrics={realTimeMetrics} alerts={activeAlerts} />

      {/* Section 3: Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed events={recentEvents?.page} />
        </CardContent>
      </Card>
    </div>
  );
}
```

**Key Points:**
- Three `useQuery` calls with skip pattern
- `recentEvents` uses custom pagination: `{ numItems: 20, cursor: null }`
- `recentEvents?.page` extracts the page array from the paginated response
- Components handle their own undefined/loading states
- `isPlatformStaff` is a boolean guard (not truthy check) to ensure proper skip

---

### File 3: PipelineFlowGraph.tsx

**Path:** `apps/web/src/app/platform/voice-monitoring/_components/PipelineFlowGraph.tsx`
**Type:** Client component (implicitly, imported from client page)

**Purpose:** SVG-based 5-stage pipeline visualization with real-time counts

**Implementation Pattern:**

```typescript
import { Skeleton } from "@/components/ui/skeleton";

// Stage configuration
const PIPELINE_STAGES = [
  { id: "ingestion", label: "Ingestion", counterKey: "artifactsReceived1h" },
  { id: "transcription", label: "Transcription", counterKey: "transcriptionsCompleted1h" },
  { id: "claims", label: "Claims", counterKey: "claimsExtracted1h" },
  { id: "resolution", label: "Resolution", counterKey: "entitiesResolved1h" },
  { id: "drafts", label: "Drafts", counterKey: "draftsGenerated1h" },
] as const;

// Type for metrics from getRealTimeMetrics
interface RealTimeMetrics {
  artifactsReceived1h: number;
  artifactsCompleted1h: number;
  artifactsFailed1h: number;
  transcriptionsCompleted1h: number;
  claimsExtracted1h: number;
  entitiesResolved1h: number;
  draftsGenerated1h: number;
  failures1h: number;
  windowStart: number;
  windowEnd: number;
}

interface PipelineFlowGraphProps {
  metrics: RealTimeMetrics | undefined;
}

function getStageColor(count: number, failCount: number): string {
  if (failCount > 0) return "#ef4444"; // red-500
  if (count === 0) return "#9ca3af";   // gray-400
  return "#22c55e";                     // green-500
}

export function PipelineFlowGraph({ metrics }: PipelineFlowGraphProps) {
  if (!metrics) {
    return <PipelineFlowGraphSkeleton />;
  }

  const failCount = metrics.artifactsFailed1h;

  return (
    <>
      {/* Desktop/Tablet: Horizontal */}
      <div className="hidden md:block">
        <svg
          viewBox="0 0 1200 240"
          className="w-full h-auto"
          role="img"
          aria-label="Voice pipeline flow with 5 stages"
        >
          <title>Pipeline Flow Graph</title>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7"
              refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
          </defs>
          {PIPELINE_STAGES.map((stage, i) => {
            const x = 20 + i * 240;
            const count = metrics[stage.counterKey];
            const color = getStageColor(count, failCount);
            return (
              <g key={stage.id}>
                {/* Stage box */}
                <rect x={x} y={50} width="200" height="100" rx="12"
                  fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2" />
                {/* Stage label */}
                <text x={x + 100} y={85} textAnchor="middle"
                  className="fill-foreground text-sm font-medium"
                  fontSize="14">{stage.label}</text>
                {/* Count */}
                <text x={x + 100} y={115} textAnchor="middle"
                  className="fill-foreground font-bold"
                  fontSize="24">{count}</text>
                {/* Subtitle */}
                <text x={x + 100} y={138} textAnchor="middle"
                  fill="#6b7280" fontSize="11">last hour</text>
                {/* Arrow to next stage */}
                {i < PIPELINE_STAGES.length - 1 && (
                  <line x1={x + 200} y1={100} x2={x + 240} y2={100}
                    stroke="#94a3b8" strokeWidth="2"
                    markerEnd="url(#arrowhead)" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Mobile: Vertical */}
      <div className="block md:hidden">
        <svg
          viewBox="0 0 300 800"
          className="w-full h-auto"
          role="img"
          aria-label="Voice pipeline flow with 5 stages"
        >
          <title>Pipeline Flow Graph</title>
          <defs>
            <marker id="arrowhead-v" markerWidth="7" markerHeight="10"
              refX="3.5" refY="10" orient="auto">
              <polygon points="0 0, 7 0, 3.5 10" fill="#94a3b8" />
            </marker>
          </defs>
          {PIPELINE_STAGES.map((stage, i) => {
            const y = 10 + i * 160;
            const count = metrics[stage.counterKey];
            const color = getStageColor(count, failCount);
            return (
              <g key={stage.id}>
                <rect x={20} y={y} width="260" height="110" rx="12"
                  fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2" />
                <text x={150} y={y + 35} textAnchor="middle"
                  className="fill-foreground font-medium"
                  fontSize="15">{stage.label}</text>
                <text x={150} y={y + 70} textAnchor="middle"
                  className="fill-foreground font-bold"
                  fontSize="28">{count}</text>
                <text x={150} y={y + 95} textAnchor="middle"
                  fill="#6b7280" fontSize="12">last hour</text>
                {i < PIPELINE_STAGES.length - 1 && (
                  <line x1={150} y1={y + 110} x2={150} y2={y + 160}
                    stroke="#94a3b8" strokeWidth="2"
                    markerEnd="url(#arrowhead-v)" />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}

function PipelineFlowGraphSkeleton() {
  return (
    <>
      <div className="hidden md:flex items-center justify-between gap-4 py-8 px-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 w-44 rounded-lg" />
        ))}
      </div>
      <div className="flex flex-col items-center gap-4 py-8 md:hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 w-64 rounded-lg" />
        ))}
      </div>
    </>
  );
}
```

**Key Points:**
- Two SVG variants: horizontal (md:) and vertical (mobile)
- Color logic: green for active, gray for zero, red if any failures
- `as const` on PIPELINE_STAGES for type safety
- Skeleton loader inline (not a separate file)
- `role="img"` and `aria-label` for accessibility
- Arrow markers defined in `<defs>` (separate IDs for horizontal vs vertical)

---

### File 4: StatusCards.tsx

**Path:** `apps/web/src/app/platform/voice-monitoring/_components/StatusCards.tsx`
**Type:** Client component (implicitly)

**Purpose:** Grid of 6 metric cards with responsive layout

**Card Definitions:**

| # | Title | Icon | Value Source | Subtitle | Color Logic |
|---|-------|------|-------------|----------|-------------|
| 1 | Active Artifacts | Activity | received+transcribing+processing count | "Currently processing" | Default |
| 2 | Completed (1h) | CheckCircle | `artifactsCompleted1h` | "Last hour" | Default |
| 3 | Failed (1h) | XCircle | `artifactsFailed1h` | "Failure rate: X%" | Red if rate > 10% |
| 4 | Avg Latency | Clock | From historical snapshot (deferred) | "End-to-end" | Default |
| 5 | AI Status | Cpu | Circuit breaker state from alerts | "Circuit breaker" | Green/Yellow/Red |
| 6 | Total Cost | DollarSign | From events metadata (deferred) | "Pipeline AI costs" | Default |

**Note on Cards 4 and 6:** These require historical snapshot data and event cost aggregation which are complex queries. For M5, show placeholder values ("--") with a tooltip "Available after first aggregation cycle." Full implementation comes in M7 (Metrics page).

**Implementation Pattern:**

```typescript
import { Activity, CheckCircle, Clock, Cpu, DollarSign, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ... interface definitions ...

export function StatusCards({ metrics, alerts }: StatusCardsProps) {
  if (!metrics) {
    return <StatusCardsSkeleton />;
  }

  const totalProcessed = metrics.artifactsCompleted1h + metrics.artifactsFailed1h;
  const failureRate = totalProcessed > 0
    ? metrics.artifactsFailed1h / totalProcessed
    : 0;

  // Circuit breaker state from alerts
  const circuitBreakerAlert = alerts?.find(
    (a) => a.alertType === "PIPELINE_CIRCUIT_BREAKER_OPEN"
  );
  const circuitBreakerState = circuitBreakerAlert ? "open" : "closed";

  const cards = [
    {
      title: "Active Artifacts",
      icon: Activity,
      value: metrics.artifactsReceived1h - metrics.artifactsCompleted1h - metrics.artifactsFailed1h,
      subtitle: "Currently processing",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    // ... 5 more cards
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className={cn("rounded-lg p-3", card.bgColor)}>
              <card.icon className={cn("h-6 w-6", card.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.subtitle}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Key Points:**
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Safe division for failure rate (guard against zero denominator)
- Circuit breaker state inferred from active alerts (no additional query)
- Active artifacts = received - completed - failed (can be negative if counter windows differ, clamp to 0)
- Cards 4/6: placeholder values for M5, full data in M7

---

### File 5: ActivityFeed.tsx

**Path:** `apps/web/src/app/platform/voice-monitoring/_components/ActivityFeed.tsx`
**Type:** Client component (implicitly)

**Purpose:** Chronological list of last 20 pipeline events with icons and relative timestamps

**Event Type to Icon Mapping:**

```typescript
import {
  CheckCircle, Edit, FileText, Inbox, Mic, RotateCw, Users, XCircle, Zap
} from "lucide-react";

const EVENT_ICONS: Record<string, typeof Inbox> = {
  artifact_received: Inbox,
  artifact_completed: CheckCircle,
  artifact_failed: XCircle,
  transcription_started: Mic,
  transcription_completed: Mic,
  transcription_failed: XCircle,
  claims_extraction_started: FileText,
  claims_extracted: FileText,
  claims_extraction_failed: XCircle,
  entity_resolution_started: Users,
  entity_resolution_completed: Users,
  entity_needs_disambiguation: Users,
  draft_generation_started: Edit,
  drafts_generated: Edit,
  draft_confirmed: CheckCircle,
  draft_rejected: XCircle,
  retry_initiated: RotateCw,
  circuit_breaker_opened: Zap,
  circuit_breaker_closed: Zap,
};
```

**Relative Timestamp Helper:**

```typescript
function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
```

**Event Message Helper:**

```typescript
function eventMessage(event: PipelineEvent): string {
  const id = event.artifactId?.slice(0, 8) ?? "unknown";
  switch (event.eventType) {
    case "artifact_received": return `Artifact ${id} received`;
    case "artifact_completed": return `Artifact ${id} completed successfully`;
    case "artifact_failed": return `Artifact ${id} failed`;
    case "transcription_completed": return `Transcription complete for ${id}`;
    case "claims_extracted": return `Claims extracted from ${id}`;
    case "entity_resolution_completed": return `Entities resolved for ${id}`;
    case "drafts_generated": return `Drafts generated for ${id}`;
    case "retry_initiated": return `Retry initiated for ${id}`;
    default: return `${event.eventType.replace(/_/g, " ")} - ${id}`;
  }
}
```

**Key Points:**
- ScrollArea with fixed height (`h-[400px] md:h-[500px]`)
- Events from `recentEvents?.page` (already typed as `any[]` from backend)
- Create local `PipelineEvent` interface for type safety
- Group by time sections: "Today", "Yesterday", "This Week" (group header with date divider)
- Empty state: icon + "No recent activity" message
- Metadata badges for claim count, cost, duration (conditional rendering)
- Auto-scroll: NOT needed for M5 (useQuery re-renders the whole list on update)

---

### File 6: Platform Hub Update

**Path:** `apps/web/src/app/platform/page.tsx`
**Type:** Modify existing file

**Changes:**

1. **Add Voice Monitoring card** (after existing cards, before "coming soon" cards):

```tsx
{/* Voice Monitoring */}
<Link href="/platform/voice-monitoring">
  <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-[#1E3A5F]/20">
    <CardContent className="flex items-center gap-3 p-4">
      <div className="rounded-lg bg-rose-100 p-3">
        <Activity className="h-6 w-6 text-rose-600" />
      </div>
      <CardTitle className="text-base">Voice Monitoring</CardTitle>
    </CardContent>
  </Card>
</Link>
```

2. **Remove v2 Claims Viewer link** (lines 161-171 in current file):
   - Delete the entire `<Link href="/platform/v2-claims">` block
   - v2 Claims functionality moves to Artifacts grid in M6

3. **Add `Activity` to imports** from lucide-react (same edit as adding the card)

**ATOMIC IMPORT RULE:** Add the `Activity` import AND the Voice Monitoring card JSX in the SAME edit operation. Do NOT add the import first, then the usage separately.

---

### File 7-12: Placeholder Pages for Future Tabs

Create minimal placeholder pages so all tabs are navigable:

**Paths:**
- `apps/web/src/app/platform/voice-monitoring/artifacts/page.tsx`
- `apps/web/src/app/platform/voice-monitoring/metrics/page.tsx`
- `apps/web/src/app/platform/voice-monitoring/events/page.tsx`
- `apps/web/src/app/platform/voice-monitoring/pipeline/page.tsx`
- `apps/web/src/app/platform/voice-monitoring/alerts/page.tsx`
- `apps/web/src/app/platform/voice-monitoring/settings/page.tsx`

**Template (all 6 are identical except title/phase):**

```typescript
export default function ArtifactsPage() {
  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <h2 className="text-lg font-semibold text-muted-foreground">
        Artifacts Grid
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Coming in Phase M6
      </p>
    </div>
  );
}
```

**Note:** These are server components (no `"use client"`) since they have no interactivity.

---

## Backend Query Reference

### Query 1: getRealTimeMetrics

**File:** `packages/backend/convex/models/voicePipelineMetrics.ts`
**Signature:** `api.models.voicePipelineMetrics.getRealTimeMetrics`
**Args:** `{ organizationId?: string }` (omit for platform-wide)
**Returns:**
```typescript
{
  artifactsReceived1h: number;
  artifactsCompleted1h: number;
  artifactsFailed1h: number;
  transcriptionsCompleted1h: number;
  claimsExtracted1h: number;
  entitiesResolved1h: number;
  draftsGenerated1h: number;
  failures1h: number;
  windowStart: number;
  windowEnd: number;
}
```
**Performance:** < 50ms (reads ~8 counter documents)
**Auth:** Verifies platform staff internally (throws if unauthorized)

### Query 2: getRecentEvents

**File:** `packages/backend/convex/models/voicePipelineEvents.ts`
**Signature:** `api.models.voicePipelineEvents.getRecentEvents`
**Args:**
```typescript
{
  paginationOpts: { numItems: number; cursor: string | null };
  filters?: {
    eventType?: string;
    pipelineStage?: string;
    organizationId?: string;
    startTime?: number;
    endTime?: number;
  }
}
```
**Returns:**
```typescript
{
  page: any[]; // Array of event objects
  isDone: boolean;
  continueCursor: string;
}
```
**Note:** Returns `v.any()` for page items. Create a local TypeScript interface:
```typescript
interface PipelineEvent {
  _id: string;
  eventId: string;
  eventType: string;
  artifactId?: string;
  voiceNoteId?: string;
  organizationId?: string;
  pipelineStage?: string;
  timestamp: number;
  timeWindow: string;
  metadata?: {
    claimCount?: number;
    entityCount?: number;
    aiCost?: number;
    retryAttempt?: number;
    sourceChannel?: string;
    draftCount?: number;
  };
}
```

### Query 3: getActiveAlerts

**File:** `packages/backend/convex/models/voicePipelineAlerts.ts`
**Signature:** `api.models.voicePipelineAlerts.getActiveAlerts`
**Args:** `{}` (no args)
**Returns:**
```typescript
Array<{
  _id: string;
  alertType: string;
  severity: string;
  message: string;
  metadata?: any;
  createdAt?: number;
  acknowledged: boolean;
}>
```
**Note:** Returns unacknowledged PIPELINE_* alerts sorted by severity (critical first)

---

## Responsive Design Reference

### Breakpoints

| Viewport | Tailwind | StatusCards | FlowGraph | ActivityFeed |
|----------|----------|-------------|-----------|-------------|
| Mobile (< 768px) | default | 1 column | Vertical SVG | Full width, h-400px |
| Tablet (768-1023px) | `md:` | 2 columns | Horizontal SVG | Full width, h-500px |
| Desktop (>= 1024px) | `lg:` | 3 columns | Horizontal SVG | Full width, h-500px |

### Mobile Test Checklist (375px)

- [ ] Tab bar scrolls horizontally
- [ ] Flow graph displays vertically (5 stages stacked)
- [ ] Status cards stack in single column
- [ ] Activity feed is full width
- [ ] No horizontal overflow on any section
- [ ] Text is readable (minimum 12px font)
- [ ] Cards have adequate padding (p-4 minimum)

---

## shadcn/ui Components Used

All components are already installed:

| Component | Import Path | Usage |
|-----------|-------------|-------|
| Card, CardHeader, CardTitle, CardContent | `@/components/ui/card` | Status cards, section wrappers |
| Skeleton | `@/components/ui/skeleton` | Loading states |
| Badge | `@/components/ui/badge` | Event metadata tags |
| ScrollArea | `@/components/ui/scroll-area` | Activity feed scroll container |
| Breadcrumb, BreadcrumbItem, etc. | `@/components/ui/breadcrumb` | Navigation breadcrumb |

**Do NOT use:**
- `Tabs` / `TabsList` / `TabsTrigger` -- these are for in-page tab switching, not URL routing (see ADR-VNM-019)

---

## Execution Order

1. Create `layout.tsx` with auth check and tab navigation
2. Create `_components/PipelineFlowGraph.tsx`
3. Create `_components/StatusCards.tsx`
4. Create `_components/ActivityFeed.tsx`
5. Create `page.tsx` with useQuery calls importing all three components
6. Create 6 placeholder pages for future tabs
7. Update `platform/page.tsx` (add Voice Monitoring, remove v2-claims)
8. Run `npm run check-types` and `npx ultracite fix`
9. Test at 375px, 768px, 1024px viewports
10. Test with real voice note data (verify real-time updates)

---

## Common Pitfalls (From M1-M4)

| Pitfall | What Goes Wrong | Prevention |
|---------|-----------------|------------|
| Missing `"use client"` on page.tsx | `useQuery` fails at runtime | First line must be `"use client"` |
| `useQuery` in _components/ | N+1 queries, performance regression | ALL queries in page.tsx only |
| `isPlatformStaff` not checked before skip | Queries fire before auth resolves | Always: `isPlatformStaff ? {} : "skip"` |
| shadcn/ui `Tabs` for routing | State fights URL, content not in routes | Use `Link` + `usePathname()` instead |
| Import in one edit, usage in another | Linter removes "unused" import | Add import + usage in SAME edit |
| `cursor: undefined` in pagination | Type error | Must be `cursor: null` (not undefined) |
| `.filter()` on query results | Quality hook false positive | OK for JavaScript arrays, add comment |
| SVG without viewBox | Not responsive | Always include viewBox + `w-full h-auto` |
| Forgetting to clamp active artifacts | Negative numbers if counters desync | `Math.max(0, received - completed - failed)` |
| Not handling `undefined` props | Runtime error in components | Always check `if (!metrics) return <Skeleton />` |

---

## Pre-Implementation Checklist

Before Ralph starts M5:

- [ ] Read ADR-VNM-014 through ADR-VNM-020
- [ ] Read M1_LESSONS_LEARNED.md, M2_LESSONS_LEARNED.md, M3_LESSONS_LEARNED.md, M4_LESSONS_LEARNED.md
- [ ] Verify M1-M4 backend functions exist: `getRealTimeMetrics`, `getRecentEvents`, `getActiveAlerts`
- [ ] Verify shadcn/ui components installed: Card, Skeleton, Badge, ScrollArea, Breadcrumb
- [ ] Verify `useCurrentUser` hook exists and returns `isPlatformStaff`
- [ ] Verify existing `/platform/layout.tsx` auth pattern
- [ ] Verify existing `/platform/page.tsx` card grid pattern
- [ ] Note: `getRecentEvents` returns `v.any()` for page items (need local interface)
- [ ] Note: Tab navigation uses Link, NOT shadcn/ui Tabs
- [ ] Note: `cursor: null` (not undefined) for initial pagination
- [ ] Note: Two SVG variants toggled via Tailwind hidden/block

---

## Post-Implementation Checklist

After completing M5:

- [ ] `npm run check-types` passes
- [ ] `npx ultracite fix` applied
- [ ] Route `/platform/voice-monitoring` loads for platform staff
- [ ] Non-platform-staff redirected to `/platform`
- [ ] Tab navigation shows 7 tabs, all clickable
- [ ] Flow graph shows 5 stages with real-time counts
- [ ] Status cards show 6 metrics
- [ ] Activity feed shows recent events (or empty state)
- [ ] Skeleton loaders appear during loading
- [ ] Mobile layout works at 375px
- [ ] Tablet layout works at 768px
- [ ] Desktop layout works at 1024px
- [ ] Platform hub has Voice Monitoring link
- [ ] v2 Claims link removed from platform hub
- [ ] Real-time updates work (create voice note, dashboard updates)

---

## ADRs Generated

| ADR | Title |
|-----|-------|
| ADR-VNM-014 | Frontend Route Structure and Authorization Pattern |
| ADR-VNM-015 | Real-Time Data Fetching Strategy |
| ADR-VNM-016 | Component Hierarchy and Data Flow |
| ADR-VNM-017 | Responsive Design Breakpoints and Mobile-First |
| ADR-VNM-018 | SVG Pipeline Flow Graph Architecture |
| ADR-VNM-019 | Tab Navigation with Next.js Routing |
| ADR-VNM-020 | Loading States and Skeleton Pattern |

**Total VNM ADRs (M1-M5):** 20

---

*Generated by Architecture Reviewer agent, 2026-02-17*
*For Ralph automated implementation of Phase M5*
