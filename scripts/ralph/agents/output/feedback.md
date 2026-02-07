# Injury Tracking Phase 3 -- Architectural Review Feedback

**Review Date:** 2026-02-07
**Branch:** `feature/261-injury-tracking-phase3-analytics`
**Reviewer:** Architecture Review (post-implementation)
**Scope:** US-ANA-001 through US-ANA-016 (all 16 user stories marked complete)

---

## What Went Well

### 1. Query Lifting to Parent Component
All four backend queries are called at the page level in `AdminInjuriesPage`, with data passed as props to child components. This directly follows the `CLAUDE.md` mandate against per-component queries and is consistent with the Performance Crisis learnings (Issue #330). The page creates exactly 4 active subscriptions during normal use.

### 2. Pure Function Extraction for Aggregation Logic
The analytics computation is cleanly separated into pure helper functions: `computeInjuryAggregations`, `countByField`, `computeByMonth`, `computeAvgRecoveryDays`, `computeRecurrenceRate`, `computeTeamInjuryStats`. These are testable, composable, and reusable. The `filterByDateRange` helper is also reused across multiple queries.

### 3. Index Usage Compliance
All database queries use `.withIndex()` -- no `.filter()` violations found. The queries correctly leverage existing composite indexes (`by_org_and_status` on both `orgPlayerEnrollments` and `teamPlayerIdentities`, `by_playerIdentityId` on `playerInjuries`).

### 4. Return Validators on All Queries
Every analytics query has an explicit `returns` validator with full type definitions. The shared `analyticsReturnValidator` and `periodStatsValidator` reduce duplication.

### 5. Better Auth Adapter Usage
The `getInjuriesByTeam` and `getRecentInjuriesForAdmin` queries correctly use `ctx.runQuery(components.betterAuth.adapter.findMany, ...)` for team data, not direct table access. This follows the critical pattern documented in `CLAUDE.md`.

### 6. CSV Export with Skip Pattern
The export query uses `"skip"` until the user clicks the Export button, avoiding an unnecessary 1,000-record subscription. The `escapeCsvField` function properly handles commas, quotes, and newlines in CSV data.

### 7. Responsive Layout and Empty States
All charts are wrapped in `ResponsiveContainer`. The grid uses proper responsive breakpoints (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`). Every component handles empty data with a meaningful message.

### 8. Injury Visibility Enforcement
The `isInjuryVisibleToOrg` helper correctly implements the three-tier visibility model (visible to all, restricted list, occurred-at-org). This ensures guardian-configured privacy is respected in analytics.

---

## Risks Identified

### RISK-1: No Backend Role Authorization (MEDIUM-HIGH)

**Finding:** All four analytics queries only check `authComponent.safeGetAuthUser(ctx)` -- they verify the caller is authenticated but do not verify the caller is an admin/owner in the target organization.

**Impact:** An authenticated user who belongs to Organization A could call `getRecentInjuriesForAdmin({ organizationId: orgB })` and receive player names, injury details, and medical information from Organization B.

**Current mitigation:** The frontend admin layout checks role membership and redirects non-admins. This is client-side only and can be bypassed.

**Recommendation:** Add a `requireOrgAdmin(ctx, organizationId)` helper that verifies membership and role via the Better Auth adapter, and call it at the top of each analytics query. See ADR-003 for implementation details.

**Note:** This is a project-wide pattern, not specific to Phase 3. All admin queries in the project follow the same auth-only backend pattern.

### RISK-2: Per-Player Injury Fetch Loop (MEDIUM)

**Finding:** Analytics queries iterate over unique player IDs and make one indexed database read per player. For `getOrgInjuryAnalytics`, this means 1 + N reads (where N = unique players in the org). Both `getOrgInjuryAnalytics` and `getInjuryTrends` independently perform this same fetch pattern.

**Impact at current scale:** Negligible. Typical orgs have 10-200 players.

**Impact at 500+ players:** Each analytics query would make 500+ database reads. Combined with 4 queries per page load, this is 2,000+ reads per dashboard view. At Convex pricing tiers, this could become costly and may approach execution time limits.

**Recommendation:** Consider adding an `occurredAtOrgId` index to `playerInjuries` that would allow direct org-level queries without the enrollment indirection. Alternatively, merge `getOrgInjuryAnalytics` and `getInjuryTrends` into a single query that fetches data once and computes both analytics and trend comparisons.

### RISK-3: Duplicate Data Fetching Between Queries (LOW-MEDIUM)

**Finding:** `getOrgInjuryAnalytics` and `getInjuryTrends` both independently fetch all enrollments and all injuries for the same organization. On every page load, the injury data is fetched twice.

**Impact:** Double the database reads for enrollment + injury data. At 200 players, this means ~400 extra reads per page load.

**Recommendation for Phase 4:** Consider a combined query (e.g., `getOrgInjuryDashboard`) that returns both the analytics aggregation and the trend comparison in a single query handler, fetching the data only once.

### RISK-4: No Pagination for Large Organizations (LOW)

**Finding:** `getRecentInjuriesForAdmin` has a default limit of 50 records. However, `getInjuriesByTeam` and `getOrgInjuryAnalytics` fetch ALL injuries for the org with no limit.

**Impact at current scale:** Negligible.

**Impact at 5,000+ historical injuries:** These queries would collect and process thousands of records in memory. The `computeByMonth` function only bucketing the last 12 months helps limit the trend chart data, but severity/body part/context aggregations process all records.

**Recommendation:** For Phase 4, consider time-bounding the analytics queries (e.g., default to last 2 years) or implementing cursor-based pagination for the underlying injury fetch.

### RISK-5: Better Auth Team Pagination Limit (LOW)

**Finding:** `getInjuriesByTeam` and `getRecentInjuriesForAdmin` fetch teams via the Better Auth adapter with `numItems: 500`. If an organization has more than 500 teams, some teams will be missing from the analytics.

**Impact:** Very unlikely at current scale (organizations typically have 5-30 teams).

**Recommendation:** Document the 500-team limit. If multi-sport organizations grow beyond this, implement pagination of the adapter results.

---

## Recommendations for Phase 4+

### Performance Thresholds to Watch

| Metric | Current | Watch Threshold | Action Threshold |
|--------|---------|----------------|-----------------|
| Players per org | ~10-200 | 300 | 500+ |
| Total injuries per org | ~0-200 | 1,000 | 3,000+ |
| DB reads per page load (4 queries) | ~50-800 | 1,500 | 3,000+ |
| Analytics query execution time | <500ms | 2s | 5s |
| Page file line count | 957 | 1,200 | 1,500+ |

### Architectural Recommendations

1. **Add backend role checks (RISK-1):** Create a shared `requireOrgAdmin` utility and apply it to all admin-facing queries project-wide, not just injury analytics. This should be a priority for the next sprint.

2. **Merge analytics + trends into single query (RISK-3):** A `getOrgInjuryDashboard` query could return `{ analytics, trends }` from a single data fetch, eliminating redundant enrollment and injury reads.

3. **Add org-level index to playerInjuries (RISK-2):** If the `occurredAtOrgId` field is reliably populated, adding `.index("by_occurredAtOrgId", ["occurredAtOrgId"])` would enable direct org-level injury queries without enrollment indirection. This would change the analytics query from O(N) reads to O(1) indexed reads.

4. **URL-based filter state:** Currently, date preset and status filter are React state. If users share dashboard links or refresh the page, filters reset to defaults. Moving these to URL search params would improve UX.

5. **Component file splitting:** At 957 lines, the page is manageable but approaching the threshold for splitting. If Phase 4 adds drill-down views, heat maps, or additional tables, extract chart components to a `components/` subdirectory.

6. **Consider React.memo for charts:** Recharts components can be expensive to re-render. Wrapping `InjuryTrendChart`, `BodyPartChart`, `SeverityChart`, and `InjuryContextChart` in `React.memo` would prevent unnecessary re-renders when unrelated state changes (like `statusFilter`).

### What to Monitor in Production

- **Convex function call count:** Track how many calls the 4 analytics queries generate per org per day. If this exceeds expectations, the per-player loop is the primary optimization target.
- **Convex function execution time:** Monitor P95 execution time for `getOrgInjuryAnalytics` and `getInjuriesByTeam`, as these are the most data-intensive queries.
- **Error rates on auth checks:** Track how often `safeGetAuthUser` returns null for analytics queries -- this could indicate unauthorized access attempts.

---

## Summary

The Phase 3 implementation is architecturally sound for the current scale. It correctly follows the project's established patterns for query lifting, index usage, return validators, and Better Auth adapter usage. The in-memory aggregation strategy is the right choice at this data scale.

The primary gap is the lack of backend role authorization (RISK-1), which is a project-wide pattern rather than a Phase 3-specific issue. The secondary concern is the per-player fetch loop (RISK-2), which will need attention if organizations grow beyond ~300 active players.

Three ADRs have been created documenting these decisions:
- `docs/architecture/decisions/ADR-001-analytics-query-aggregation-strategy.md`
- `docs/architecture/decisions/ADR-002-admin-dashboard-data-flow-pattern.md`
- `docs/architecture/decisions/ADR-003-injury-analytics-security-model.md`
