# ADR-002: Admin Dashboard Data Flow Pattern

**Status:** Accepted
**Date:** 2026-02-07
**Feature:** Injury Tracking Phase 3 - Analytics & Prevention (Issue #261)
**Deciders:** Architecture Review (post-implementation)

---

## Context

The admin Injury Analytics page (`apps/web/src/app/orgs/[orgId]/admin/injuries/page.tsx`) is a data-dense dashboard composed of:

- 4 summary cards with trend indicators
- 4 chart components (trends, body part, severity, context)
- 1 team comparison table
- 1 recent injuries table with status filter
- 1 CSV export function

These components consume data from 4 backend queries. The architectural question is: **where should data fetching live, and how should data flow between components?**

This is especially important given the project's Performance Crisis history (Issue #330), where 3.2M monthly Convex function calls were caused largely by `useQuery` calls inside list-item components.

## Decision Drivers

1. **Performance mandate:** `CLAUDE.md` explicitly requires lifting queries to parent components and passing data as props, not querying per-component.
2. **Convex reactive model:** Each `useQuery` call creates a subscription. Subscriptions in child components that render per-item are the primary anti-pattern.
3. **User experience:** Date range changes should update all components simultaneously. A status filter change should only affect the recent injuries table.
4. **Export flow:** CSV export needs all injuries (up to 1,000), not just the 50 shown in the table, and should be lazy-loaded.

## Considered Options

### Option A: Per-component data fetching

Each component (`InjuryTrendChart`, `TeamComparisonTable`, `RecentInjuriesTable`, etc.) fetches its own data via `useQuery` internally.

### Option B: Parent-level query lifting with props (CHOSEN)

The parent page component (`AdminInjuriesPage`) owns all `useQuery` subscriptions and passes data down as props.

### Option C: React Context provider

Create an `InjuryAnalyticsProvider` context that wraps the page and provides all query results to descendants.

## Decision Outcome

**Option B was chosen: all queries are lifted to the parent `AdminInjuriesPage` component.**

The implementation places exactly 4 `useQuery` calls (plus 1 conditional export query) at the page level and passes results to child components as props.

## Implementation Notes

### Query Structure in the Page Component

```
AdminInjuriesPage (parent)
  |-- useQuery(getOrgInjuryAnalytics)     --> analytics data
  |-- useQuery(getInjuryTrends)           --> trend comparison data
  |-- useQuery(getInjuriesByTeam)         --> teamData prop
  |-- useQuery(getRecentInjuriesForAdmin) --> recentInjuries prop
  |-- useQuery(getRecentInjuriesForAdmin) --> CSV export (conditional "skip")
  |
  +-- Summary Cards          <-- receives: analytics, trends
  +-- InjuryTrendChart        <-- receives: analytics.byMonth
  +-- BodyPartChart           <-- receives: analytics.byBodyPart
  +-- SeverityChart           <-- receives: analytics.bySeverity
  +-- InjuryContextChart      <-- receives: analytics.byOccurredDuring
  +-- TeamComparisonTable     <-- receives: teamData
  +-- RecentInjuriesTable     <-- receives: recentInjuries, statusFilter
```

### Date Range Filtering Pattern

Date range state is managed in the parent (`datePreset` state). The `getDateRange()` function converts presets ("30d", "90d", "season", "all") into `startDate`/`endDate` strings. These are passed as query arguments to `getOrgInjuryAnalytics` and `getInjuriesByTeam`.

When the user changes the date preset:
1. React state updates `datePreset`.
2. `getDateRange()` recomputes start/end dates.
3. Convex reactive queries automatically re-execute with new arguments.
4. All dependent chart components re-render with new data.

This is correct -- a single state change cascades to all components through the query arguments, not through multiple independent state updates.

### Status Filter Pattern

The status filter (`statusFilter` state) only affects `getRecentInjuriesForAdmin`. When "all" is selected, `status` is passed as `undefined` (showing all statuses). Otherwise, the specific status string is passed as a query argument.

This is efficient: changing the status filter triggers re-execution of only the recent injuries query, not the analytics or team queries.

### CSV Export Skip Pattern

The export query uses Convex's "skip" pattern:

```typescript
const allInjuriesForExport = useQuery(
  api.models.playerInjuries.getRecentInjuriesForAdmin,
  exportRequested ? { organizationId: orgId, limit: 1000 } : "skip"
);
```

This avoids subscribing to a 1,000-record query until the user explicitly requests an export. The `exportRequested` boolean is set on button click, which activates the subscription. Once the data loads, the CSV is generated and downloaded, and `exportRequested` is reset to `false`.

**Observation:** After `exportRequested` is set to `false`, the subscription remains active until the component unmounts or re-renders with "skip". The current implementation correctly resets the flag, which causes the query to skip on the next render, effectively unsubscribing.

### Loading States

The page uses `analytics === undefined` as the primary loading indicator. While analytics data is loading, full skeleton placeholders are shown for all sections. Individual components also handle `undefined` props gracefully:

- `TeamComparisonTable` shows `SkeletonChart` when `teamData` is `undefined`.
- `RecentInjuriesTable` shows skeleton rows when `injuries` is `undefined`.
- Trend indicators show `Skeleton` while `trends` is `undefined`.

### Empty State Handling

The page has a top-level empty state check: if `analytics.totalInjuries === 0`, a single card message is shown instead of rendering empty charts. Individual chart components also handle empty data arrays with their own empty state messages.

### Component Architecture

All chart and table components are defined in the same file as `page.tsx` rather than in separate files. This is consistent with the project convention documented in `CLAUDE.md`:

> Create feature-specific components in the same folder as `page.tsx`

For a page of this complexity (957 lines), this is at the upper boundary of single-file readability but still acceptable given that the components are tightly coupled to the page's data structure and unlikely to be reused elsewhere.

## Consequences

### Positive

- **Minimal query count:** Exactly 4 active subscriptions during normal use (5 during export). This is the theoretical minimum for this data model.
- **No query duplication:** No child component independently subscribes to the same data.
- **Coherent loading states:** The parent knows whether all data is loaded and can show appropriate skeletons.
- **Date range changes are atomic:** All components update together from the same query arguments.
- **Export is lazy:** The 1,000-record export query only runs when requested.

### Negative / Risks

- **Props threading:** Data flows through multiple levels of props. If the component tree deepens, this could become verbose (though currently it is only 1 level deep).
- **Monolithic page file:** At ~960 lines, the page file contains the entire dashboard. If more features are added (drill-down views, additional charts), this should be split into a components directory.
- **No memoization on charts:** Chart components re-render on any parent state change. For expensive Recharts renders, `React.memo` could be beneficial but is not currently used. At current data sizes this is not a performance issue.
- **Trend query does not respect date range filter:** `getInjuryTrends` uses its own `periodDays` parameter and always compares against "today". It does not respect the dashboard's date range filter, which could be confusing if a user selects "This season" but sees trend indicators comparing the last 30 days. This is a deliberate design choice (trends are always relative to now) but could be documented more explicitly in the UI.

### Recommendations for Phase 4+

1. **If adding drill-down views** (e.g., clicking a team row to see team-specific analytics), consider a React Context provider at the admin injuries layout level to share common data.
2. **If the page exceeds ~1,200 lines**, extract chart components to `apps/web/src/app/orgs/[orgId]/admin/injuries/components/`.
3. **Consider `React.memo`** for chart components if users report slow interactions when changing date filters.
4. **Add URL-based state** for date preset and status filter (using `searchParams`) so that dashboard state is shareable via URL and survives page refreshes.

---

*This ADR was created as part of the post-implementation architectural review of Issue #261, Phase 3.*
