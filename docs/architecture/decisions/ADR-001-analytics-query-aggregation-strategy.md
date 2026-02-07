# ADR-001: Analytics Query Aggregation Strategy

**Status:** Accepted
**Date:** 2026-02-07
**Feature:** Injury Tracking Phase 3 - Analytics & Prevention (Issue #261)
**Deciders:** Architecture Review (post-implementation)

---

## Context

Phase 3 of the Injury Tracking feature introduces four analytics queries to power the admin dashboard:

- `getOrgInjuryAnalytics` -- aggregates total injuries, status counts, body part distribution, severity distribution, monthly trends, context breakdown, average recovery days, and recurrence rate.
- `getInjuriesByTeam` -- computes per-team injury statistics by resolving the player-team-injury relationship graph.
- `getInjuryTrends` -- compares current-period vs. previous-period injury statistics for trend indicators.
- `getRecentInjuriesForAdmin` -- returns enriched recent injuries with player names, team names, and age groups.

The key architectural question: **should these aggregations be computed in-memory from raw data at query time, or should we maintain pre-aggregated/materialized tables?**

Convex does not support SQL-style `GROUP BY`, `SUM()`, or `COUNT()` natively. All aggregation must be done either in application logic or via scheduled pre-computation.

## Decision Drivers

1. **Current data scale:** Typical organizations have 10-200 active players, with 0-50 injuries per season. Total historical injuries per org rarely exceed a few hundred.
2. **Convex pricing model:** Function execution time matters, but query call count is the primary cost driver (per the Performance Crisis of Jan 2026 -- Issue #330).
3. **Real-time requirements:** The admin dashboard uses `useQuery` subscriptions. Changes to injury data should be reflected immediately, not after a scheduled aggregation job runs.
4. **Complexity budget:** Pre-aggregated tables require triggers/scheduled jobs to keep them in sync, adding significant maintenance overhead and potential consistency bugs.
5. **No N+1:** The critical mandate from `CLAUDE.md` requires batch-fetch-and-map-lookup patterns regardless of aggregation strategy.

## Considered Options

### Option A: In-memory aggregation from raw data (CHOSEN)

Fetch all injuries for the organization's enrolled players, then compute aggregations in JavaScript within the query handler.

**Implementation pattern observed in code:**
1. Fetch `orgPlayerEnrollments` via `by_org_and_status` index (1 indexed query).
2. Deduplicate `playerIdentityId` values.
3. For each unique player, fetch injuries via `by_playerIdentityId` index (N indexed queries, where N = unique players).
4. Filter by org visibility and date range in-memory.
5. Compute all aggregations using pure functions (`computeInjuryAggregations`, `countByField`, `computeByMonth`, etc.).

### Option B: Pre-aggregated tables with scheduled updates

Create tables like `orgInjuryAnalyticsCache` that are updated by triggers on injury insert/update/delete operations.

### Option C: Convex aggregate component

Use the Convex aggregate component for real-time counts. This would require schema changes and additional component setup.

## Decision Outcome

**Option A was chosen: in-memory aggregation from raw data.**

The implementation correctly follows this pattern across all four analytics queries. Helper functions (`computeInjuryAggregations`, `countByField`, `computeByMonth`, `computeAvgRecoveryDays`, `computeRecurrenceRate`, `computeTeamInjuryStats`) are extracted as pure functions operating on already-fetched arrays.

## Implementation Notes

### What the code actually does

**`getOrgInjuryAnalytics` (lines 764-816):**
- Fetches enrollments via `by_org_and_status` index (1 query).
- Iterates unique player IDs, fetching injuries per player via `by_playerIdentityId` index.
- Applies visibility filter (`isInjuryVisibleToOrg`) and date range filter in-memory.
- Delegates to `computeInjuryAggregations()` for all metric computation.
- Total DB queries: 1 (enrollments) + N (injuries per player).

**`getInjuriesByTeam` (lines 887-1018):**
- Fetches teams via Better Auth adapter `findMany` (1 adapter query).
- Fetches `teamPlayerIdentities` via `by_org_and_status` index (1 query).
- Builds player-to-team mapping, then batch fetches all injuries.
- Total DB queries: 1 (teams) + 1 (team-player identities) + M (injuries per unique player across all teams).

**`getInjuryTrends` (lines 1040-1158):**
- Same enrollment + injury fetch pattern as `getOrgInjuryAnalytics`.
- Splits fetched injuries into current and previous period arrays.
- Computes stats for each period independently.

**`getRecentInjuriesForAdmin` (lines 1164-1341):**
- Fetches enrollments, injuries (with status filter), player identities, team-player identities, and team names.
- Uses batch `Promise.all` for player identity lookups.
- Uses Better Auth adapter for team name resolution.
- Total DB queries: 1 (enrollments) + N (injuries) + 1 (player batch via `Promise.all`) + 1 (team-player identities) + 1 (teams via adapter).

### N+1 Analysis

The queries do fetch injuries in a loop over player IDs (`for (const playerId of uniquePlayerIds)`), which is technically O(N) database reads where N is the number of unique players. However, this is **not** the classic N+1 anti-pattern described in `CLAUDE.md` because:

1. There is no composite index on `playerInjuries` that includes `organizationId` -- injuries are linked to players, not orgs directly. The only way to get "all injuries for an org" is through the enrollment indirection.
2. Each individual query uses an index (`by_playerIdentityId`), so each is O(log K) where K is total injuries.
3. The alternative would be a full table scan of `playerInjuries` (which has no org-level index).

**Risk assessment:** At 200 players, this means 200 indexed lookups per analytics query. In Convex, each of these is a fast indexed read, but at scale this could hit execution time limits. See "Scalability Thresholds" below.

### Index Usage Verification

All queries use `.withIndex()`:
- `orgPlayerEnrollments`: `by_org_and_status` -- correct composite index.
- `playerInjuries`: `by_playerIdentityId` -- correct single-field index.
- `teamPlayerIdentities`: `by_org_and_status` -- correct composite index.
- Better Auth adapter queries: use `where` clause with `field`/`value`/`operator`.

No `.filter()` calls in the analytics queries. Post-fetch filtering is done with JavaScript array `.filter()` on already-collected data, which is the correct pattern.

### Return Validators

All four analytics queries have explicit `returns` validators:
- `getOrgInjuryAnalytics`: `analyticsReturnValidator` (fully typed object).
- `getInjuriesByTeam`: `v.array(v.object({...}))` with all fields typed.
- `getInjuryTrends`: `v.object({ currentPeriod, previousPeriod, changes })`.
- `getRecentInjuriesForAdmin`: `v.array(v.object({...}))` with all fields typed.

## Consequences

### Positive

- **Real-time updates:** Any injury change immediately reflects in the dashboard (Convex reactive queries).
- **No synchronization bugs:** No risk of stale aggregated data.
- **Simple code:** Pure functions are easy to test, understand, and modify.
- **No additional tables or schema complexity.**
- **Good query count:** Each page load triggers exactly 4 `useQuery` subscriptions (analytics, trends, team data, recent injuries), regardless of dashboard component count.

### Negative / Risks

- **Scalability ceiling:** At ~500+ unique players per org, the per-player injury fetch loop will become expensive. Each analytics query makes 1 + N database reads.
- **Redundant data fetching:** `getOrgInjuryAnalytics` and `getInjuryTrends` both independently fetch the same enrollment and injury data. If these could be combined into a single query, it would halve the DB reads.
- **Execution time limits:** Convex functions have execution time limits. At high player/injury counts, in-memory aggregation could time out.

### Scalability Thresholds

| Metric | Safe Range | Warning | Action Required |
|--------|-----------|---------|-----------------|
| Unique players per org | < 300 | 300-500 | 500+ |
| Total injuries per org | < 2,000 | 2,000-5,000 | 5,000+ |
| DB reads per analytics query | < 300 | 300-500 | 500+ |

**When thresholds are exceeded, consider:**
1. Adding an `organizationId` or `occurredAtOrgId` index to `playerInjuries` to enable direct org-level queries without enrollment indirection.
2. Implementing a materialized view pattern with Convex scheduled functions that update `orgInjuryAnalyticsCache` on injury mutations.
3. Using the Convex aggregate component for real-time counters.

---

*This ADR was created as part of the post-implementation architectural review of Issue #261, Phase 3.*
