# ADR-VN2-016: Review Analytics Event Type Extension for Disambiguation

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 5 (Entity Resolution & Disambiguation)
**Story**: US-VN-017, US-VN-018

## Context and Problem Statement

Enhancement E3 requires logging disambiguation analytics events (`disambiguate_accept`, `disambiguate_reject_all`, `disambiguate_skip`) through the existing `logReviewEvent` function. However, the current function signature has two blocking incompatibilities:

1. **`eventType` validator is closed**: Only accepts `apply`, `dismiss`, `edit`, `snooze`, `batch_apply`, `batch_dismiss`. The new disambiguation event types would fail validation.
2. **`linkCode` is required (`v.string()`)**: Disambiguation events originate from the web UI, not the review microsite, so there is no linkCode. The PRD shows `linkCode: null` which would fail the validator.

The `reviewAnalyticsEvents` table schema has the same constraints.

## Decision Drivers

- Must not break existing review analytics consumers (weekly cron, decision patterns query)
- The `linkCode` field is indexed (`by_linkCode`) and used by existing queries
- Disambiguation events need to flow into the same analytics pipeline for threshold tuning
- Schema changes to existing tables require care (Convex live schema enforcement)

## Considered Options

### Option A: Extend existing `logReviewEvent` function and schema

Add new event types to the `eventType` union. Make `linkCode` optional (`v.optional(v.string())`).

**Pros**: Single analytics pipeline. Disambiguation events automatically feed into `getCoachDecisionPatterns` and weekly threshold adjustment.
**Cons**: Requires schema migration (linkCode from required to optional). Existing code that assumes linkCode is present needs review.

### Option B: Create separate `logDisambiguationEvent` function and table

New `disambiguationAnalyticsEvents` table with its own schema.

**Pros**: No schema migration. Clean separation. No risk to existing analytics.
**Cons**: Duplicate infrastructure. Disambiguation events don't feed into existing threshold tuning without extra plumbing. Two places to query for coach patterns.

### Option C: Extend `logReviewEvent` but use a sentinel linkCode value

Keep `linkCode` required. Pass `linkCode: "disambiguation"` (or similar sentinel) for disambiguation events.

**Pros**: No schema change needed. Events still flow through existing pipeline.
**Cons**: Semantically incorrect -- "disambiguation" is not a real link code. Index queries on `by_linkCode` would return disambiguation events mixed with real link lookups. Fragile.

## Decision Outcome

**Option A** -- Extend the existing `logReviewEvent` function and schema. This is the correct architectural choice because the whole point of E3 is that disambiguation events feed into the same analytics pipeline that tunes personalized thresholds.

### Required Changes

1. **Schema (`schema.ts`)**: Add new event types to `reviewAnalyticsEvents.eventType` union. Change `linkCode` from `v.string()` to `v.optional(v.string())`.
2. **Model (`reviewAnalytics.ts`)**: Update `logReviewEvent` args to match schema. Update `eventType` validator to include `disambiguate_accept`, `disambiguate_reject_all`, `disambiguate_skip`. Change `linkCode` to `v.optional(v.string())`.
3. **Consumers**: Review `getCoachDecisionPatterns` -- currently counts `apply`/`dismiss`/`edit`. Should it also count disambiguation events? Decision: Yes, `disambiguate_accept` should be treated like `apply` and `disambiguate_reject_all` like `dismiss` for agreement rate calculation.

## Implementation Notes

```typescript
// Updated eventType validator
eventType: v.union(
  v.literal("apply"),
  v.literal("dismiss"),
  v.literal("edit"),
  v.literal("snooze"),
  v.literal("batch_apply"),
  v.literal("batch_dismiss"),
  // Phase 5: Disambiguation events
  v.literal("disambiguate_accept"),
  v.literal("disambiguate_reject_all"),
  v.literal("disambiguate_skip"),
),

// linkCode becomes optional
linkCode: v.optional(v.string()),
```

## Consequences

**Positive**: Single analytics pipeline. Disambiguation patterns feed directly into weekly threshold tuning. No new tables.
**Negative**: Schema migration required (linkCode from required to optional). Existing data will have linkCode populated; new disambiguation events will not.
**Risk**: The `by_linkCode` index will now have entries without linkCode. Queries using this index should handle undefined. Existing queries that filter by linkCode will naturally exclude disambiguation events (correct behavior).
