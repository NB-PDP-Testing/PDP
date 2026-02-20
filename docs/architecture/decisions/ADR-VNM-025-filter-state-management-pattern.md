# ADR-VNM-025: Filter State Management Pattern

**Date:** 2026-02-17
**Status:** Accepted
**Context:** Phase M6/M7, Stories US-VNM-009, US-VNM-012

## Context and Problem Statement

Multiple pages need filter state management: artifacts grid (status, org, date range, source channel, search), event log (event type, pipeline stage, org, date range, artifact ID, errors-only toggle), and alert history (severity, type, date range). Need a consistent pattern for filter state, filter-to-query mapping, and URL synchronization.

## Decision Drivers

- Filters modify query arguments passed to Convex
- `usePaginatedQuery` resets automatically when args change (no manual cursor reset)
- Filters should be preserved on page navigation (optional, not required for MVP)
- Multiple filter types: select, multi-select, date range, search, toggle
- Mobile: filters should be collapsible on small screens

## Decision Outcome

### Pattern: React useState for filter state, derive query args

Use simple `useState` for each filter dimension. Derive query args as a computed value. When filter state changes, `usePaginatedQuery` or `useQuery` automatically re-executes.

```typescript
// Filter state
const [statusFilter, setStatusFilter] = useState<string | null>(null);
const [orgFilter, setOrgFilter] = useState<string | null>(null);
const [dateRange, setDateRange] = useState<{ start: number; end: number } | null>(null);
const [searchQuery, setSearchQuery] = useState("");

// Derive query args (changes trigger re-query)
const queryArgs = useMemo(() => {
  if (!isPlatformStaff) return "skip" as const;
  return {
    statusFilter: statusFilter || undefined,
    organizationId: orgFilter || undefined,
    startTime: dateRange?.start,
    endTime: dateRange?.end,
    searchArtifactId: searchQuery || undefined,
  };
}, [isPlatformStaff, statusFilter, orgFilter, dateRange, searchQuery]);
```

### Filter Components

Use shadcn/ui components for consistent styling:

| Filter Type | Component | Usage |
|---|---|---|
| Status select | `<Select>` | Artifacts grid, events page |
| Org select | `<Select>` | Artifacts, events, metrics |
| Date range | Two `<Input type="date">` | All filtered pages |
| Search | `<Input>` with debounce | Artifact ID search |
| Multi-select | `<DropdownMenuCheckboxItem>` | Event type filter |
| Toggle | `<Switch>` | Errors-only toggle |

### Mobile Pattern

On screens < 768px, wrap filters in a collapsible section:

```tsx
<div className="md:flex md:flex-wrap md:gap-2">
  <Button
    variant="outline"
    className="mb-2 w-full md:hidden"
    onClick={() => setShowFilters(!showFilters)}
  >
    {showFilters ? "Hide Filters" : "Show Filters"}
  </Button>
  <div className={cn("space-y-2 md:flex md:flex-wrap md:gap-2 md:space-y-0", !showFilters && "hidden md:flex")}>
    {/* Filter components */}
  </div>
</div>
```

### Filter-to-Backend Mapping

**Artifacts Grid (US-VNM-009):**
- Status filter -> `statusFilter` arg to `getPlatformArtifacts`
- Other filters (org, date, search) -> need backend support OR client-side filtering

**IMPORTANT BACKEND GAP:** The existing `voiceNoteArtifacts` table indexes only support:
- `by_status_and_createdAt` (status + date range)
- `by_senderUserId_and_createdAt` (user-scoped)
- `by_artifactId` (single artifact lookup)

There is NO index for org-filtered queries on `voiceNoteArtifacts`. The `orgContextCandidates` field is an array, so it cannot be indexed directly. Options:
1. Add an `organizationId` field to `voiceNoteArtifacts` (schema change)
2. Filter by org client-side after fetching page (works for small datasets)
3. Query via `voicePipelineEvents` which has `by_org_and_timestamp` (indirect)

**Recommendation:** For MVP, support status filter and search by artifactId via backend. Org filter can use the events table as a secondary lookup. Date range filter uses the `createdAt` part of the `by_status_and_createdAt` composite index.

## Implementation Notes

1. No URL query params for MVP (filter state is ephemeral)
2. Debounce search input (300ms delay before triggering query)
3. Date range defaults: no filter (show all) until user selects
4. Clear all filters button for UX
5. Show active filter count badge on mobile collapse button
