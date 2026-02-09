# ADR-VN2-039: Drafts Tab Data Flow Pattern

**Status**: Accepted
**Date**: 2026-02-08
**Phase**: 7B
**Story**: US-VN-024

## Context

Phase 7B adds a Drafts tab to the voice notes dashboard. The PRD specifies lifting `useQuery` to the parent (voice-notes-dashboard.tsx) and passing `pendingDrafts` as props to `DraftsTab`. This is the correct pattern per CLAUDE.md's "Frontend Query Patterns" section.

However, examining the existing codebase reveals that **all other tab components** (InsightsTab, ParentsTab, TeamInsightsTab, HistoryTab, AutoApprovedTab, MyImpactTab) contain their own `useQuery` calls internally. The parent dashboard only queries lightweight data for badge counts and auto-switch logic, not the full data each tab displays.

This creates a tension: follow the documented best practice (lift query), or follow the established codebase convention (query inside tab).

## Decision

**Follow the PRD's lift-to-parent pattern for DraftsTab.** Rationale:

1. **The draft data is already needed in the parent** for badge count (`pendingDrafts?.length`) and auto-switch logic (`pendingDrafts?.length > 0`). Unlike other tabs, there is no separate "lightweight count" query -- the same `getPendingDraftsForCoach` query returns the full objects needed for display.

2. **Single subscription**: Convex deduplicates identical `useQuery` calls, so querying in both parent and child would not double the function calls. But lifting avoids any risk of the parent and child having momentarily inconsistent views of the same data (e.g., parent badge showing 3 while child renders 2 after a confirm).

3. **The draft dataset is small**: `getPendingDraftsForCoach` already filters to pending status + 7-day expiry. A coach is unlikely to have more than 20-30 pending drafts at any time. Passing the full array as props is reasonable.

4. **Mutation calls stay in DraftsTab**: Only the query is lifted. `useMutation` for `confirmDraft`, `rejectDraft`, `confirmAllDrafts`, `rejectAllDrafts` lives in `DraftsTab` since only that component needs them.

## Trade-offs

**Risk**: Future developers may see the inconsistency (DraftsTab receives props; other tabs query internally) and either (a) refactor other tabs to match, or (b) move the DraftsTab query inside. Both are acceptable outcomes. The code should include a brief comment explaining why the query is lifted.

**Alternative considered**: Query inside DraftsTab (matching existing pattern). Rejected because it would require a separate count query in the parent for the badge, creating two subscriptions to essentially the same data.

## Consequences

- `pendingDrafts` is queried once in `voice-notes-dashboard.tsx` with skip condition: `coachId ? { organizationId: orgId } : 'skip'`
- Badge count derived from `pendingDrafts?.length` (no separate query)
- Auto-switch check derived from `(pendingDrafts?.length ?? 0) > 0`
- `DraftsTab` component receives `pendingDrafts` as a prop (not undefined -- parent passes `pendingDrafts || []`)
- `useMutation` calls remain inside `DraftsTab`
- Convex reactivity propagates through props: when a draft is confirmed/rejected, the backend updates its status, the `useQuery` re-fires, the parent re-renders with updated array, and `DraftsTab` re-renders with the draft removed
