# Voice Flow Monitoring Harness - Performance Patterns

**CRITICAL:** This document contains **mandatory performance patterns** that MUST be followed throughout all phases of the Voice Flow Monitoring Harness implementation. Violating these patterns will cause performance degradation and billing overages.

---

## 🔴 MANDATORY PATTERN 1: Cursor-Based Pagination

### Rule
**ALWAYS use `.paginate(paginationOpts)` for list queries - NEVER use `.take(limit)`**

### Why
- `.take(limit)` has no continuation mechanism → data beyond limit is lost
- `.paginate()` returns a cursor for "load more" functionality
- Convex's pagination is optimized for performance and consistency

### Code Examples

```typescript
// ❌ BAD: Using .take() - NO CONTINUATION
export const getRecentEvents = query({
  args: {},
  returns: v.array(v.object({...})),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("voicePipelineEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(50);  // ❌ Can't load more, loses data beyond 50
  }
});

// ✅ GOOD: Using .paginate() - HAS CONTINUATION
export const getRecentEvents = query({
  args: {
    paginationOpts: paginationOptsValidator  // ✅ Accept pagination options
  },
  returns: v.object({
    page: v.array(v.object({...})),
    isDone: v.boolean(),
    continueCursor: v.string()
  }),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("voicePipelineEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .paginate(args.paginationOpts);  // ✅ Returns cursor for next page
  }
});
```

### Frontend Usage

```typescript
// ✅ GOOD: usePaginatedQuery hook
const { results, status, loadMore } = usePaginatedQuery(
  api.models.voicePipelineEvents.getRecentEvents,
  {},
  { initialNumItems: 20 }
);

// Infinite scroll or "Load More" button
<button onClick={() => loadMore(20)}>Load More</button>
```

### Applicability
- **getRecentEvents** (Phase M1)
- **getActiveArtifacts** (Phase M1)
- **getFailedArtifacts** (Phase M1)
- **getAlertHistory** (Phase M4)
- **Artifacts grid** (Phase M6)
- **Event log viewer** (Phase M7)

---

## 🔴 MANDATORY PATTERN 2: N+1 Query Prevention

### Rule
**NEVER query in a loop - ALWAYS batch fetch with Map lookup**

### Why
- Query-per-item pattern causes N database calls (expensive, slow)
- Batch fetch + Map lookup is O(1) lookup after initial fetch
- Critical for org breakdown, user name lookups, team name lookups

### Code Examples

```typescript
// ❌ BAD: N+1 Query Pattern
export const getOrgBreakdown = query({
  args: { ... },
  returns: v.array(v.object({ orgName: v.string(), ... })),
  handler: async (ctx, args) => {
    const snapshots = await ctx.db.query("voicePipelineMetricsSnapshots")
      .withIndex("by_periodType_and_start", q => ...)
      .collect();

    // ❌ Query per snapshot - N+1 anti-pattern
    const enriched = await Promise.all(
      snapshots.map(async (snapshot) => {
        const org = await adapter.findOne({
          model: "organization",
          where: { field: "_id", value: snapshot.organizationId }
        });  // ❌ Database call inside map!
        return { ...snapshot, orgName: org?.name };
      })
    );

    return enriched;
  }
});

// ✅ GOOD: Batch Fetch + Map Pattern
export const getOrgBreakdown = query({
  args: { ... },
  returns: v.array(v.object({ orgName: v.string(), ... })),
  handler: async (ctx, args) => {
    const snapshots = await ctx.db.query("voicePipelineMetricsSnapshots")
      .withIndex("by_periodType_and_start", q => ...)
      .collect();

    // ✅ Step 1: Collect unique org IDs
    const uniqueOrgIds = [...new Set(
      snapshots.map(s => s.organizationId).filter(Boolean)
    )];

    // ✅ Step 2: Batch fetch all orgs at once
    const orgs = await Promise.all(
      uniqueOrgIds.map(id => adapter.findOne({
        model: "organization",
        where: { field: "_id", value: id }
      }))
    );

    // ✅ Step 3: Create Map for O(1) lookup
    const orgMap = new Map();
    for (const org of orgs) {
      if (org) orgMap.set(org._id, org.name);
    }

    // ✅ Step 4: Synchronous map using pre-fetched data (no await!)
    const enriched = snapshots.map(snapshot => ({
      ...snapshot,
      orgName: orgMap.get(snapshot.organizationId) || "Unknown"
    }));

    return enriched;
  }
});
```

### Better Auth User Lookups

```typescript
// ✅ Batch fetch user names from Better Auth
const uniqueUserIds = [...new Set(artifacts.map(a => a.senderUserId))];

const users = await Promise.all(
  uniqueUserIds.map(id => adapter.findOne({
    model: "user",
    where: { field: "_id", value: id }  // ✅ Use _id (not id, not userId)
  }))
);

const userMap = new Map();
for (const user of users) {
  if (user) {
    userMap.set(user._id, user.name || user.email || "Unknown");  // ✅ Use user.name
  }
}

const enriched = artifacts.map(a => ({
  ...a,
  coachName: userMap.get(a.senderUserId) || "Unknown"
}));
```

### Applicability
- **getOrgBreakdown** (Phase M2) - Org name lookups
- **Artifacts grid** (Phase M6) - Coach names, org names
- **Activity feed** (Phase M5) - User names
- Any query that needs to enrich data with related records

---

## 🔴 MANDATORY PATTERN 3: Counter-Based Real-Time Metrics

### Rule
**ALWAYS read counters for real-time metrics - NEVER scan voicePipelineEvents**

### Why
- Scanning events is O(n) on event count (slow, expensive)
- Reading counters is O(1) on counter count (fast, cheap)
- Target: Real-time metrics query < 50ms

### Code Examples

```typescript
// ❌ BAD: Scanning events for real-time count
export const getRealTimeMetrics = query({
  args: {},
  returns: v.object({ artifactsReceived1h: v.number() }),
  handler: async (ctx, args) => {
    const oneHourAgo = Date.now() - 3600000;

    const events = await ctx.db
      .query("voicePipelineEvents")
      .withIndex("by_eventType_and_timestamp", q =>
        q.eq("eventType", "artifact_received")
         .gte("timestamp", oneHourAgo)
      )
      .collect();  // ❌ Scans all events in last hour

    return { artifactsReceived1h: events.length };  // ❌ Slow
  }
});

// ✅ GOOD: Reading counter document
export const getRealTimeMetrics = query({
  args: { organizationId: v.optional(v.string()) },
  returns: v.object({
    artifactsReceived1h: v.number(),
    artifactsCompleted1h: v.number(),
    artifactsFailed1h: v.number(),
    // ... other counters
  }),
  handler: async (ctx, args) => {
    // ✅ Read counter documents directly (O(1))
    const receivedCounter = await ctx.db
      .query("voicePipelineCounters")
      .withIndex("by_counterType_and_org", q =>
        q.eq("counterType", "artifacts_received_1h")
         .eq("organizationId", args.organizationId ?? null)
      )
      .first();

    const completedCounter = await ctx.db
      .query("voicePipelineCounters")
      .withIndex("by_counterType_and_org", q =>
        q.eq("counterType", "artifacts_completed_1h")
         .eq("organizationId", args.organizationId ?? null)
      )
      .first();

    // ✅ Fast: reads 7-8 counter documents total
    return {
      artifactsReceived1h: receivedCounter?.currentValue || 0,
      artifactsCompleted1h: completedCounter?.currentValue || 0,
      // ... (< 50ms total)
    };
  }
});
```

### Atomic Counter Increment

```typescript
// ✅ Counter incremented atomically with event insert
export const logEvent = internalMutation({
  args: { eventType: v.union(...), ... },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Insert event
    const eventId = await ctx.db.insert("voicePipelineEvents", {
      eventId: crypto.randomUUID(),
      eventType: args.eventType,
      timestamp: Date.now(),
      timeWindow: computeTimeWindow(Date.now()),
      // ...
    });

    // ✅ Increment counter in SAME TRANSACTION
    const counterType = getCounterTypeForEvent(args.eventType);
    if (counterType) {
      const counter = await ctx.db
        .query("voicePipelineCounters")
        .withIndex("by_counterType_and_org", q =>
          q.eq("counterType", counterType)
           .eq("organizationId", args.organizationId ?? null)
        )
        .first();

      if (counter && Date.now() < counter.windowEnd) {
        // ✅ Increment existing counter
        await ctx.db.patch(counter._id, {
          currentValue: counter.currentValue + 1
        });
      } else if (counter && Date.now() >= counter.windowEnd) {
        // ✅ Window expired - reset counter
        await ctx.db.patch(counter._id, {
          currentValue: 1,
          windowStart: Date.now(),
          windowEnd: Date.now() + 3600000
        });
      } else {
        // ✅ Create new counter
        await ctx.db.insert("voicePipelineCounters", {
          counterType,
          organizationId: args.organizationId ?? null,
          currentValue: 1,
          windowStart: Date.now(),
          windowEnd: Date.now() + 3600000
        });
      }
    }

    return eventId;
  }
});
```

### Applicability
- **getRealTimeMetrics** (Phase M2)
- **Dashboard status cards** (Phase M5)
- **Health check thresholds** (Phase M4)

---

## 🔴 MANDATORY PATTERN 4: Snapshot-Based Historical Queries

### Rule
**ALWAYS use snapshots for historical metrics - NEVER aggregate raw events**

### Why
- Aggregating raw events for 30 days is expensive (thousands of events)
- Snapshots pre-compute aggregations (hourly cron does the work)
- Query snapshots instead: O(n) on number of time buckets (7-90), not events (1000s)

### Code Examples

```typescript
// ❌ BAD: Aggregating raw events for historical data
export const getHistoricalMetrics = query({
  args: { startTime: v.number(), endTime: v.number() },
  returns: v.array(v.object({ ... })),
  handler: async (ctx, args) => {
    // ❌ Scan all events in time range
    const events = await ctx.db
      .query("voicePipelineEvents")
      .withIndex("by_timestamp", q =>
        q.gte("timestamp", args.startTime)
         .lte("timestamp", args.endTime)
      )
      .collect();  // ❌ Could be thousands of events

    // ❌ Manual aggregation is expensive
    const metrics = aggregateEvents(events);  // ❌ Slow
    return metrics;
  }
});

// ✅ GOOD: Querying pre-aggregated snapshots
export const getHistoricalMetrics = query({
  args: {
    periodType: v.union(v.literal("hourly"), v.literal("daily")),
    startTime: v.number(),
    endTime: v.number(),
    organizationId: v.optional(v.string())
  },
  returns: v.array(v.object({ ... })),
  handler: async (ctx, args) => {
    // ✅ Query snapshots (already aggregated by cron)
    let query = ctx.db
      .query("voicePipelineMetricsSnapshots")
      .withIndex("by_periodType_and_start", q =>
        q.eq("periodType", args.periodType)
         .gte("periodStart", args.startTime)
         .lte("periodStart", args.endTime)
      );

    if (args.organizationId) {
      query = query.filter(q => q.eq(q.field("organizationId"), args.organizationId));
    }

    // ✅ Returns 7-90 snapshot documents (fast)
    return await query.order("asc", "periodStart").collect();
  }
});
```

### Time Range to Period Type Mapping

```typescript
// ✅ Use correct periodType based on time range
function getPeriodType(startTime: number, endTime: number): "hourly" | "daily" {
  const durationMs = endTime - startTime;
  const sevenDaysMs = 7 * 24 * 3600000;

  // Last 7 days: use hourly snapshots
  if (durationMs <= sevenDaysMs) {
    return "hourly";
  }

  // > 7 days: use daily snapshots
  return "daily";
}
```

### Applicability
- **getHistoricalMetrics** (Phase M2)
- **Metrics dashboard charts** (Phase M7)
- **Org breakdown** (Phase M2)
- Any query for data older than 1 hour

---

## 🔴 MANDATORY PATTERN 5: Time-Window Cleanup

### Rule
**ALWAYS delete events by timeWindow - NEVER scan by timestamp**

### Why
- Deleting by timestamp requires full table scan
- Deleting by timeWindow uses index (efficient)
- Enables batch deletion of entire hourly buckets

### Code Examples

```typescript
// ❌ BAD: Scanning by timestamp for cleanup
export const cleanupOldEvents = internalMutation({
  args: {},
  returns: v.object({ eventsDeleted: v.number() }),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (48 * 3600000);  // 48 hours ago

    // ❌ Full table scan to find old events
    const oldEvents = await ctx.db
      .query("voicePipelineEvents")
      .withIndex("by_timestamp", q => q.lt("timestamp", cutoff))
      .collect();  // ❌ Scans entire table

    for (const event of oldEvents) {
      await ctx.db.delete(event._id);  // ❌ Delete one by one
    }

    return { eventsDeleted: oldEvents.length };
  }
});

// ✅ GOOD: Deleting by timeWindow (indexed)
export const cleanupOldEvents = internalMutation({
  args: {},
  returns: v.object({ eventsDeleted: v.number() }),
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - (48 * 3600000);  // 48 hours ago
    const cutoffDate = new Date(cutoffTime);

    // ✅ Compute expired timeWindows
    const expiredWindows: string[] = [];
    let currentTime = cutoffTime;
    const twoWeeksAgo = Date.now() - (14 * 24 * 3600000);

    while (currentTime >= twoWeeksAgo) {
      const date = new Date(currentTime);
      const timeWindow = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}-${date.getHours().toString().padStart(2,'0')}`;
      expiredWindows.push(timeWindow);
      currentTime -= 3600000;  // Go back 1 hour
    }

    // ✅ Delete by timeWindow (uses index)
    let totalDeleted = 0;
    for (const window of expiredWindows) {
      const events = await ctx.db
        .query("voicePipelineEvents")
        .withIndex("by_timeWindow", q => q.eq("timeWindow", window))
        .collect();  // ✅ Uses index, efficient

      for (const event of events) {
        await ctx.db.delete(event._id);
      }
      totalDeleted += events.length;
    }

    return { eventsDeleted: totalDeleted };
  }
});
```

### TimeWindow Computation

```typescript
// ✅ Helper function for timeWindow format
function computeTimeWindow(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');

  return `${year}-${month}-${day}-${hour}`;  // "2026-02-15-14"
}
```

### Applicability
- **logEvent** (Phase M1) - Compute timeWindow on insert
- **cleanupOldEvents** (Phase M2) - Delete by timeWindow
- **Event queries** (Phase M1) - Query by timeWindow for time-bounded searches

---

## 🔴 MANDATORY PATTERN 6: Query Skip Pattern

### Rule
**ALWAYS skip queries when user not authorized - prevents errors**

### Why
- Non-platform-staff users should never trigger monitoring queries
- Skipping prevents 401 errors and wasted database calls
- Improves performance by avoiding unnecessary authorization checks

### Code Examples

```typescript
// Frontend - skip query if user not platform staff
function DashboardPage() {
  const { user } = useCurrentUser();  // From context

  // ✅ Skip query if user not platform staff
  const metrics = useQuery(
    api.models.voicePipelineMetrics.getRealTimeMetrics,
    user?.isPlatformStaff ? {} : "skip"
  );

  // ✅ Skip paginated query
  const { results: events } = usePaginatedQuery(
    api.models.voicePipelineEvents.getRecentEvents,
    user?.isPlatformStaff ? {} : "skip",
    { initialNumItems: 20 }
  );

  // Show loading or redirect
  if (!user) return <LoadingSpinner />;
  if (!user.isPlatformStaff) {
    redirect("/platform");
    return null;
  }

  // Render dashboard
  return <Dashboard metrics={metrics} events={events} />;
}
```

### Server-Side Authorization

```typescript
// Backend - verify platform staff in ALL public queries
export const getRealTimeMetrics = query({
  args: {},
  returns: v.object({ ... }),
  handler: async (ctx, args) => {
    // ✅ First thing: verify authorization
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user?.isPlatformStaff) {
      throw new Error("Unauthorized: Platform staff only");
    }

    // Proceed with query
    // ...
  }
});
```

### Applicability
- **ALL monitoring queries** (all phases)
- **Frontend route protection** (Phase M5 layout)
- **Mutations** (retry, acknowledge, etc.)

---

## 🔴 MANDATORY PATTERN 7: Fire-and-Forget Event Logging

### Rule
**ALWAYS use non-blocking event logging - NEVER await in pipeline functions**

### Why
- Event logging should never slow down or block pipeline execution
- Target overhead: < 10ms
- Failure to log should not crash the pipeline

### Code Examples

```typescript
// ✅ GOOD: Fire-and-forget from mutations
export const createArtifact = mutation({
  args: { ... },
  returns: v.id("voiceNoteArtifacts"),
  handler: async (ctx, args) => {
    // Create artifact
    const artifactId = await ctx.db.insert("voiceNoteArtifacts", {
      artifactId: crypto.randomUUID(),
      status: "received",
      // ...
    });

    // ✅ Fire-and-forget event logging (non-blocking)
    ctx.scheduler.runAfter(0,
      internal.models.voicePipelineEvents.logEvent,
      {
        eventType: "artifact_received",
        artifactId,
        organizationId: args.orgContextCandidates[0]?.organizationId,
        pipelineStage: "ingestion",
        metadata: { sourceChannel: args.sourceChannel }
      }
    );
    // Returns immediately, logEvent runs in background

    return artifactId;
  }
});

// ✅ GOOD: Await from actions (must await, but wrap in try/catch)
export const transcribeAudio = internalAction({
  args: { noteId: v.id("voiceNotes") },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      // Transcription logic
      const transcript = await callWhisperAPI(...);

      // ✅ Log success (must await in actions, but lightweight < 10ms)
      await ctx.runMutation(
        internal.models.voicePipelineEvents.logEvent,
        {
          eventType: "transcription_completed",
          artifactId,
          pipelineStage: "transcription",
          stageCompletedAt: Date.now(),
          durationMs: Date.now() - startTime,
          metadata: { transcriptDuration: transcript.duration }
        }
      );

    } catch (error) {
      // ✅ Log failure (wrapped in try/catch, won't crash action)
      try {
        await ctx.runMutation(
          internal.models.voicePipelineEvents.logEvent,
          {
            eventType: "transcription_failed",
            artifactId,
            pipelineStage: "transcription",
            errorMessage: error.message
          }
        );
      } catch (logError) {
        // Silently fail logging (don't crash pipeline)
        console.error("Failed to log event:", logError);
      }

      throw error;  // Re-throw original error
    }
  }
});
```

### Error Handling in logEvent

```typescript
// ✅ logEvent should catch errors internally
export const logEvent = internalMutation({
  args: { ... },
  returns: v.string(),
  handler: async (ctx, args) => {
    try {
      // Event insert
      const eventId = await ctx.db.insert("voicePipelineEvents", {
        eventId: crypto.randomUUID(),
        // ...
      });

      // Counter increment
      // ...

      return eventId;
    } catch (error) {
      // ✅ Log to console but don't throw
      console.error("[voicePipelineEvents.logEvent] Failed:", error);
      // Return empty string or error ID
      return "";
    }
  }
});
```

### Applicability
- **All pipeline mutations** (Phase M1 instrumentation)
- **All pipeline actions** (Phase M1 instrumentation)
- **logEvent mutation** (Phase M1)

---

## 📊 Performance Targets Summary

| Operation | Target | Pattern to Use |
|-----------|--------|----------------|
| Dashboard page load | < 2s | Cursor pagination + query skip + lift queries to parent |
| Real-time metrics query | < 50ms | Counter-based metrics (Pattern 3) |
| Artifact list query | < 200ms | Cursor pagination (Pattern 1) |
| Event timeline query | < 100ms | Index by artifactId |
| Event logging | < 10ms | Fire-and-forget (Pattern 7) |
| Hourly aggregation cron | < 30s | Snapshot-based (Pattern 4) + time-window query |
| Alert health check | < 10s | Counter-based reads |

---

## 🚨 Anti-Patterns to Avoid

| Anti-Pattern | Problem | Correct Pattern |
|-------------|---------|-----------------|
| `.take(limit)` | No continuation | `.paginate(paginationOpts)` |
| `Promise.all(items.map(async => query))` | N+1 queries | Batch fetch + Map lookup |
| Scan events for real-time metrics | Slow O(n) | Read counters O(1) |
| Aggregate raw events for historical data | Expensive | Query snapshots |
| Delete by timestamp scan | Full table scan | Delete by timeWindow |
| Not skipping queries for non-staff | Wasted calls + errors | Skip pattern |
| Awaiting event logging in mutations | Blocks pipeline | Fire-and-forget |

---

## 🎯 Checklist (Before Every PR)

- [ ] All list queries use `.paginate()` (not `.take()`)
- [ ] No `Promise.all` with queries inside map callback
- [ ] Real-time metrics read counters (not events)
- [ ] Historical queries use snapshots (not raw events)
- [ ] Cleanup uses timeWindow index (not timestamp scan)
- [ ] Frontend queries skip when user not platform staff
- [ ] Event logging uses fire-and-forget pattern
- [ ] All queries verify `isPlatformStaff` authorization
- [ ] Org queries include time bounds (not unbounded)
- [ ] Counter increment is atomic with event insert

---

**Last Updated:** February 15, 2026
**For:** Ralph (Automated Project Management System)
