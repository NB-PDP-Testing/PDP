# ADR-VN2-017: Trust Level API Contract Alignment

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 5 (Entity Resolution & Disambiguation)
**Story**: US-VN-017 (Enhancement E1)

## Context and Problem Statement

Enhancement E1 (Trust-Adaptive Threshold) requires calling `getCoachTrustLevelInternal` from the entity resolution action. The Phase 5 implementation guide and PRD show calling it with `{ coachUserId, organizationId }`, but the actual function signature accepts `{ coachId }` (no organizationId). This is a contract mismatch that would cause a runtime error.

Additionally, the implementation guide references `insightConfidenceThreshold` as the threshold field. Inspection of the actual function confirms this field EXISTS in the return type, but it is populated by the weekly `adjustInsightThresholds` cron job (Phase 7.3) which looks at auto-applied insight undo rates. It is NOT the same as `personalizedThreshold` (populated by the `adjustPersonalizedThresholds` cron which looks at parent summary override patterns).

## Decision Drivers

- The PRD's API call pattern would fail at runtime -- must be corrected
- Trust levels are platform-wide (one record per coach, not per-org)
- The `insightConfidenceThreshold` field exists but may be undefined for coaches who haven't used the auto-apply feature
- A safe fallback is needed when no threshold data exists

## Decision Outcome

Use the correct `{ coachId }` argument (NOT `coachUserId`/`organizationId`) when calling `getCoachTrustLevelInternal`. The coachId value should be set to the `senderUserId` from the artifact.

For the threshold:
- Use `insightConfidenceThreshold` if available (this is the field designed for per-coach AI confidence tuning)
- Fall back to `personalizedThreshold` if `insightConfidenceThreshold` is undefined (legacy parent summary threshold)
- Fall back to 0.9 if neither exists (safe default for new coaches)

## Implementation Notes

```typescript
// CORRECT call (matches actual function signature)
const trustData = await ctx.runQuery(
  internal.models.coachTrustLevels.getCoachTrustLevelInternal,
  { coachId: coachUserId }  // coachId, NOT coachUserId
);

// Threshold cascade
const autoResolveThreshold = trustData?.insightConfidenceThreshold ?? 0.9;
```

## Consequences

**Positive**: Correct API contract. Reuses existing personalization infrastructure.
**Negative**: The `insightConfidenceThreshold` may be undefined for many coaches initially (only set after the Phase 7.3 cron has run with sufficient data). This means most coaches will use the 0.9 fallback initially, which is the safe conservative default.
