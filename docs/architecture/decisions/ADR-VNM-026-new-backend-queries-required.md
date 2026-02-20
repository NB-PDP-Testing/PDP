# ADR-VNM-026: New Backend Queries Required for M6-M9

**Date:** 2026-02-17
**Status:** Accepted
**Context:** Phases M6-M9, All Frontend Stories

## Context and Problem Statement

The M6-M9 frontend pages need several backend queries that either don't exist or exist in a form that is not compatible with the frontend requirements. This ADR catalogs ALL new/modified backend queries needed.

## New Queries Required

### 1. `getPlatformArtifacts` (NEW -- voiceNoteArtifacts.ts)

**Needed by:** US-VNM-009 (Artifacts Grid)

**Why:** Existing `getRecentArtifacts` is user-scoped (by `senderUserId`) and uses `.take()`. Need platform-wide, paginated, filterable query.

```typescript
export const getPlatformArtifacts = query({
  args: {
    paginationOpts: paginationOptsValidator,
    statusFilter: v.optional(v.string()),
  },
  returns: /* paginationResultValidator */,
  handler: async (ctx, args) => {
    await verifyPlatformStaff(ctx);

    if (args.statusFilter) {
      return ctx.db.query("voiceNoteArtifacts")
        .withIndex("by_status_and_createdAt", q => q.eq("status", args.statusFilter))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return ctx.db.query("voiceNoteArtifacts")
      .order("desc")
      .paginate(args.paginationOpts);
  }
});
```

### 2. `getPlatformArtifactById` (NEW -- voiceNoteArtifacts.ts)

**Needed by:** US-VNM-010 (Artifact Detail)

**Why:** Existing `getArtifactById` is `internalQuery` -- cannot be called from frontend.

```typescript
export const getPlatformArtifactById = query({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.union(artifactObjectValidator, v.null()),
  handler: async (ctx, args) => {
    await verifyPlatformStaff(ctx);
    return ctx.db.get(args.artifactId);
  }
});
```

### 3. `getClaimsByArtifactPlatform` (NEW -- voiceNoteClaims.ts)

**Needed by:** US-VNM-009, US-VNM-010 (Claims in expanded rows and detail page)

**Why:** Existing `getClaimsByArtifact` is `internalQuery`. Need public version with platform staff auth.

```typescript
export const getClaimsByArtifactPlatform = query({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.array(claimObjectValidator),
  handler: async (ctx, args) => {
    await verifyPlatformStaff(ctx);
    return ctx.db.query("voiceNoteClaims")
      .withIndex("by_artifactId", q => q.eq("artifactId", args.artifactId))
      .collect();
  }
});
```

### 4. `getResolutionsByArtifactPlatform` (NEW -- voiceNoteEntityResolutions.ts)

**Needed by:** US-VNM-009, US-VNM-010 (Entity resolution details)

**Why:** Existing `getDisambiguationForArtifact` is `internalQuery` and only returns `needs_disambiguation` items. Need all resolutions.

```typescript
export const getResolutionsByArtifactPlatform = query({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.array(v.any()), // resolution objects
  handler: async (ctx, args) => {
    await verifyPlatformStaff(ctx);
    return ctx.db.query("voiceNoteEntityResolutions")
      .withIndex("by_artifactId", q => q.eq("artifactId", args.artifactId))
      .collect();
  }
});
```

### 5. `getDraftsByArtifactPlatform` (NEW -- insightDrafts.ts)

**Needed by:** US-VNM-009, US-VNM-010 (Draft status in expanded rows)

**Why:** Need to show insight draft status per artifact for monitoring purposes.

```typescript
export const getDraftsByArtifactPlatform = query({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    await verifyPlatformStaff(ctx);
    return ctx.db.query("insightDrafts")
      .withIndex("by_artifactId_and_status", q => q.eq("artifactId", args.artifactId))
      .collect();
  }
});
```

## Existing Queries (No Changes Needed)

These backend queries already exist and work for M6-M9:

| Query | File | Used By |
|---|---|---|
| `getRecentEvents` | voicePipelineEvents.ts | M7 Events Page, M5 Overview |
| `getEventTimeline` | voicePipelineEvents.ts | M6 Artifact Detail |
| `getActiveArtifacts` | voicePipelineEvents.ts | M8 Pipeline View |
| `getFailedArtifacts` | voicePipelineEvents.ts | M8 Pipeline View |
| `getRealTimeMetrics` | voicePipelineMetrics.ts | M7 Metrics, M8 Pipeline |
| `getHistoricalMetrics` | voicePipelineMetrics.ts | M7 Metrics |
| `getStageBreakdown` | voicePipelineMetrics.ts | M7 Metrics, M8 Pipeline |
| `getOrgBreakdown` | voicePipelineMetrics.ts | M7 Metrics |
| `getActiveAlerts` | voicePipelineAlerts.ts | M8 Alerts |
| `acknowledgeAlert` | voicePipelineAlerts.ts | M8 Alerts |
| `getAlertHistory` | voicePipelineAlerts.ts | M8 Alerts |
| `retryTranscription` | voicePipelineRetry.ts | M6 Retry Buttons |
| `retryClaimsExtraction` | voicePipelineRetry.ts | M6 Retry Buttons |
| `retryEntityResolution` | voicePipelineRetry.ts | M6 Retry Buttons |
| `retryFullPipeline` | voicePipelineRetry.ts | M6 Retry Buttons |
| `getRetryHistory` | voicePipelineRetry.ts | M6 Artifact Detail |

## Existing Queries with Issues

### `getActiveArtifacts` (voicePipelineEvents.ts, line 376)
**Issue:** Uses `.take()` inside with manual pagination. Returns `continueCursor: ""`.
**Impact:** Not a blocking issue for M8 pipeline view (which shows a fixed number of active items). However, if M8 needs proper pagination, this query should be rewritten.
**Recommendation:** Leave as-is for M8 (active artifacts count is naturally bounded). Flag for future cleanup.

### `getAlertHistory` (voicePipelineAlerts.ts, line 522)
**Issue:** Collects ALL `platformCostAlerts` then filters in JavaScript for `PIPELINE_*` prefix. Full table scan.
**Impact:** Acceptable at current scale (< 100 alerts total). Will need index-based filtering if alerts grow significantly.
**Recommendation:** Leave as-is for MVP. Add `by_alertType_prefix` index if performance degrades.

### `countPreviousRetries` (voicePipelineRetry.ts, line 55)
**Issue:** Collects ALL events for artifact then `.filter()` for `retry_initiated`. Queries potentially many events when only retry events are needed.
**Impact:** Low (retry count is small, events per artifact < 20).
**Recommendation:** Leave as-is. Could use `by_artifactId_and_eventType` composite index in future.

## Implementation Priority

1. **MUST HAVE before M6:** `getPlatformArtifacts`, `getPlatformArtifactById`, `getClaimsByArtifactPlatform`
2. **SHOULD HAVE for M6:** `getResolutionsByArtifactPlatform`, `getDraftsByArtifactPlatform`
3. **No new queries for M7:** Uses existing metrics/events queries
4. **No new queries for M8:** Uses existing alerts/pipeline queries
5. **No new queries for M9:** Cleanup only
