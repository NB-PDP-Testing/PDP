# ADR-VNM-024: Event Timeline Display Pattern

**Date:** 2026-02-17
**Status:** Accepted
**Context:** Phase M6, Story US-VNM-010

## Context and Problem Statement

The artifact detail page (US-VNM-010) needs a vertical event timeline showing every event for a specific artifact in chronological order. This is a display-only component that receives data from `getEventTimeline` query. The question is: what pattern for the vertical timeline UI, and how to handle event metadata display.

## Decision Drivers

- Timeline is chronological (oldest first) -- contrast with activity feed (newest first)
- Each event has different metadata shapes (claim count, duration, confidence, cost)
- Must display error context for failed events
- Must look distinct from activity feed component on overview page
- Mobile-responsive at 375px

## Decision Outcome

### Timeline Pattern: CSS vertical line with positioned nodes

Use a left-aligned vertical line with circular nodes at each event point:

```tsx
<div className="relative ml-4 border-l-2 border-muted pl-6 space-y-6">
  {events.map(event => (
    <div key={event._id} className="relative">
      {/* Timeline node */}
      <div className={cn(
        "absolute -left-[29px] h-4 w-4 rounded-full border-2 border-background",
        getNodeColor(event.eventType)
      )} />

      {/* Event content */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(event.timestamp)}
          </span>
          <Badge variant="outline">{formatEventType(event.eventType)}</Badge>
        </div>
        {event.durationMs && (
          <span className="text-xs text-muted-foreground">
            Duration: {(event.durationMs / 1000).toFixed(1)}s
          </span>
        )}
        {/* Event-specific metadata */}
        <EventMetadata event={event} />
      </div>
    </div>
  ))}
</div>
```

### Event Metadata Component

Different event types show different metadata:

| Event Type | Metadata Displayed |
|---|---|
| `artifact_received` | Source channel, audio duration |
| `transcription_completed` | Duration, word count, confidence |
| `claims_extracted` | Claim count, avg confidence, cost |
| `entity_resolution_completed` | Entity count, auto-resolved count, disambig count |
| `drafts_generated` | Draft count, avg confidence |
| `*_failed` | Error message, error code (red text) |
| `retry_initiated` | Retry attempt number, stage |
| `circuit_breaker_*` | State change |

### Node Colors

```typescript
function getNodeColor(eventType: string): string {
  if (eventType.includes("completed") || eventType.includes("generated") || eventType.includes("confirmed"))
    return "bg-green-500";
  if (eventType.includes("failed"))
    return "bg-red-500";
  if (eventType.includes("started"))
    return "bg-blue-500";
  if (eventType.includes("retry"))
    return "bg-yellow-500";
  if (eventType.includes("circuit_breaker"))
    return "bg-orange-500";
  return "bg-gray-400"; // Default
}
```

## Data Flow

```
page.tsx (artifact detail)
  |
  |-- useQuery(getEventTimeline, { artifactId }) --> events[]
  |-- useQuery(api.models.voiceNoteArtifacts.getArtifactById, { _id: artifactId }) --> artifact (NOT available as public query)
  |
  +-- <EventTimeline events={events} />  (pure display component, no queries)
```

**CRITICAL FINDING:** `getArtifactById` is an `internalQuery` -- it cannot be called from the frontend. A NEW public query is needed:

```typescript
// New query needed in voiceNoteArtifacts.ts
export const getPlatformArtifactById = query({
  args: { artifactId: v.id("voiceNoteArtifacts") },
  returns: v.union(artifactObjectValidator, v.null()),
  handler: async (ctx, args) => {
    // Platform staff auth
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.isPlatformStaff) throw new Error("Unauthorized");
    return ctx.db.get(args.artifactId);
  }
});
```

## Implementation Notes

1. Timeline component lives at `artifacts/[artifactId]/_components/event-timeline.tsx`
2. Event metadata component lives alongside as `event-metadata.tsx`
3. The `getEventTimeline` query already exists and is public (platform-staff only)
4. Need NEW `getPlatformArtifactById` query for artifact header data
5. Consider adding coach name to artifact header (batch fetch user by senderUserId)
6. Consider adding org name to artifact header (from orgContextCandidates)
7. No pagination needed -- artifact event count is bounded (5-15 events per artifact typically)
