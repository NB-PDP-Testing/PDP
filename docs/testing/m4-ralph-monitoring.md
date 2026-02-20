# M4 Ralph Monitoring - Real-Time Status

**Date:** 2026-02-16 21:40
**Phase:** Pipeline Alerts - M4
**Status:** 🟡 READY TO START

---

## Current Status

### Ralph Setup
- **M3 Status:** ✅ COMPLETE (US-VNM-006 passes: true)
- **M4 Status:** 🟡 NOT STARTED (US-VNM-007 passes: false)
- **Dependencies:** M1 ✅ | M2 ✅ | M3 ✅
- **PRD:** /Users/neil/Documents/GitHub/PDP/scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M4.json

### Context Files Ready
- ✅ M1_LESSONS_LEARNED.md
- ✅ M2_LESSONS_LEARNED.md
- ✅ M3_LESSONS_LEARNED.md (just created)
- ✅ PHASE_M4.json (full implementation details)
- ✅ prd.json (configured for M4)
- ✅ progress.txt (M4 setup complete)
- ✅ m4-monitoring-guide.md (this file)

### Git Status
- **Branch:** ralph/voice-monitor-harness ✅
- **Last Commit:** 27e4a113 - feat: US-VNM-006 - Create voicePipelineRetry.ts with retry operations

---

## M4 Overview

### What We're Building

**Phase Goal:** Automated anomaly detection with health check cron

**Story:** US-VNM-007 - Build Pipeline Alerts Backend

**Files to Create:**
- `/Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/voicePipelineAlerts.ts`

**Files to Modify:**
- `/Users/neil/Documents/GitHub/PDP/packages/backend/convex/crons.ts` (add cron job)

**Functions to Implement:**
1. `checkPipelineHealth` (internalMutation) - 6 health checks, runs every 5 min
2. `getActiveAlerts` (query) - Platform staff only
3. `acknowledgeAlert` (mutation) - Platform staff only
4. `getAlertHistory` (query) - Platform staff only, paginated

**Cron Job to Add:**
- Name: `check-pipeline-health`
- Schedule: Every 5 minutes
- Action: Call `internal.models.voicePipelineAlerts.checkPipelineHealth`

---

## 6 Alert Types to Implement

### 1. PIPELINE_HIGH_FAILURE_RATE
- **Severity:** high
- **Threshold:** failures / (completed + failures) > 0.10 (10%)
- **Check:** Safe division (denominator > 0)
- **Message:** "Pipeline failure rate is XX% (threshold: 10%)"
- **Metadata:** { failureRate, threshold: 0.10 }

### 2. PIPELINE_HIGH_LATENCY
- **Severity:** medium
- **Threshold:** current latency > 2x 7-day average
- **Check:** Query last 168 hourly snapshots, calculate average
- **Message:** "End-to-end latency is XXms (2x normal)"
- **Metadata:** { currentLatency, avgLatency, threshold: 2.0 }

### 3. PIPELINE_HIGH_QUEUE_DEPTH
- **Severity:** medium
- **Threshold:** active artifacts > 50
- **Check:** Count artifacts with status in ['received', 'transcribing', 'transcribed', 'processing']
- **Message:** "XX artifacts queued (threshold: 50)"
- **Metadata:** { queueDepth, threshold: 50 }

### 4. PIPELINE_DISAMBIGUATION_BACKLOG
- **Severity:** low
- **Threshold:** needs_disambiguation > 100
- **Check:** Count entityResolutions with status='needs_disambiguation'
- **Message:** "XX entities awaiting manual review (threshold: 100)"
- **Metadata:** { backlogCount, threshold: 100 }

### 5. PIPELINE_CIRCUIT_BREAKER_OPEN
- **Severity:** critical
- **Threshold:** aiServiceHealth.circuitBreakerState = 'open' or 'half_open'
- **Check:** Query aiServiceHealth table
- **Message:** "AI service circuit breaker is open"
- **Metadata:** { state, recentFailureCount }

### 6. PIPELINE_INACTIVITY
- **Severity:** low
- **Threshold:** no artifacts received in 60+ minutes
- **Check:** Query last artifact_received event timestamp
- **Message:** "No voice notes received in XX minutes"
- **Metadata:** { minutesSinceLastArtifact, threshold: 60 }

---

## M4 Critical Patterns (Ralph Must Follow)

### 1. Safe Division (MANDATORY for Failure Rate)

**WRONG:**
```typescript
const failureRate = failures / (completed + failures);  // Can be NaN if both are 0
```

**CORRECT:**
```typescript
const total = completed + failures;
const failureRate = total > 0 ? failures / total : 0;
```

### 2. Alert Deduplication (MANDATORY)

**Pattern:**
```typescript
// Before creating alert, check if same alertType exists unacknowledged
const existingAlerts = await ctx.db
  .query("platformCostAlerts")
  .withIndex("by_acknowledged", (q) => q.eq("acknowledged", false))
  .collect();

const hasDuplicate = existingAlerts.some(
  (alert) => alert.alertType === "PIPELINE_HIGH_FAILURE_RATE"
);

if (!hasDuplicate) {
  // Only create alert if no existing unacknowledged alert of same type
  await ctx.db.insert("platformCostAlerts", {
    alertType: "PIPELINE_HIGH_FAILURE_RATE",
    severity: "high",
    message: `Pipeline failure rate is ${failureRate * 100}% (threshold: 10%)`,
    acknowledged: false,
    metadata: { failureRate, threshold: 0.10 },
    createdAt: Date.now(),
  });
}
```

**Why:** Without deduplication, health check creates duplicate alert every 5 minutes

### 3. Latency Baseline Calculation (7-day rolling average)

**Pattern:**
```typescript
// Query last 168 hourly snapshots (7 days)
const snapshots = await ctx.db
  .query("voicePipelineMetricsSnapshots")
  .withIndex("by_periodType_and_windowEnd", (q) =>
    q.eq("periodType", "hourly")
  )
  .order("desc")
  .collect();  // ✅ Use .collect(), NOT .take(168)

// Slice to 168 most recent
const recent = snapshots.slice(0, 168);

// Calculate average latency
const total = recent.reduce((sum, s) => sum + s.avgEndToEndLatency, 0);
const historicalAvg = recent.length > 0 ? total / recent.length : 0;

// Check if current latency > 2x historical
const currentLatency = realTimeMetrics.avgEndToEndLatency;
if (currentLatency > historicalAvg * 2 && historicalAvg > 0) {
  // Create latency alert
}
```

**CRITICAL:** Don't use `.take(168)` - not allowed by Convex. Use `.collect()` then `.slice(0, 168)`.

### 4. Platform Staff Authorization (ALL queries/mutations)

**Pattern (from M3):**
```typescript
async function verifyPlatformStaff(ctx: MutationCtx | QueryCtx): Promise<void> {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new Error("Not authenticated");

  const dbUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", value: user._id }],
  });

  if (!dbUser?.isPlatformStaff) {
    throw new Error("Not authorized: platform staff only");
  }
}

// Use in all queries/mutations:
export const getActiveAlerts = query({
  args: {},
  returns: v.array(...),
  handler: async (ctx, args) => {
    await verifyPlatformStaff(ctx);  // ✅ FIRST LINE
    // Implementation
  },
});
```

### 5. Severity Order (for getActiveAlerts sorting)

**Pattern:**
```typescript
const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

// Sort by severity first, then createdAt
alerts.sort((a, b) => {
  const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
  if (severityDiff !== 0) return severityDiff;
  return b.createdAt - a.createdAt;  // Newest first
});
```

### 6. Real-Time Metrics Query (Use Counters, NOT Event Scans)

**WRONG:**
```typescript
// ❌ Scanning events is slow
const events = await ctx.db
  .query("voicePipelineEvents")
  .withIndex("by_eventType", ...)
  .collect();
const failures = events.filter(e => e.eventType === "artifact_failed").length;
```

**CORRECT:**
```typescript
// ✅ Read counters (O(1) lookup)
const counters = await ctx.db
  .query("voicePipelineCounters")
  .withIndex("by_windowEnd", (q) =>
    q.eq("windowEnd", currentWindow)
  )
  .first();

const failures = counters?.failures_1h || 0;
const completed = counters?.completed_1h || 0;
```

### 7. Cron Interval Pattern (Every 5 Minutes)

**Pattern:**
```typescript
// In crons.ts:
import { internal } from "./_generated/api";

crons.interval(
  "check-pipeline-health",
  { minutes: 5 },
  async (ctx) => {
    await ctx.runMutation(internal.models.voicePipelineAlerts.checkPipelineHealth, {});
  }
);
```

---

## M4 Gotchas to Avoid

### ❌ GOTCHA 1: Alert Spam Without Deduplication
**Problem:** Without deduplication, health check creates new alert every 5 minutes
**Solution:** Check for existing unacknowledged alert of same type before inserting

### ❌ GOTCHA 2: Using .take(168) for Latency Baseline
**Problem:** `.take()` is not allowed in Convex queries (use pagination instead)
**Solution:** Use `.collect()` then `.slice(0, 168)` to get last 168 snapshots

### ❌ GOTCHA 3: Divide-by-Zero in Failure Rate
**Problem:** `failures / (completed + failures)` is NaN when both are 0
**Solution:** ALWAYS check `denominator > 0` before dividing

### ❌ GOTCHA 4: Wrong Severity Levels
**Problem:** Using wrong severity for alert type
**Solution:**
- **critical:** Circuit breaker open (AI service unavailable)
- **high:** Failure rate > 10% (significant pipeline degradation)
- **medium:** Latency spike or queue depth (performance degradation)
- **low:** Disambiguation backlog or inactivity (operational issues)

### ❌ GOTCHA 5: Forgetting Platform Staff Auth
**Problem:** Alert queries accessible to all users
**Solution:** Call `verifyPlatformStaff(ctx)` at start of ALL query/mutation handlers

### ❌ GOTCHA 6: Scanning Events for Real-Time Metrics
**Problem:** Querying voicePipelineEvents to count failures (slow, inefficient)
**Solution:** Read voicePipelineCounters table (O(1) lookup, designed for this)

### ❌ GOTCHA 7: platformCostAlerts Schema Extension Issues
**Problem:** If alertType is union of literals, can't add new types without schema migration
**Solution:** Check schema first - if closed, create new voicePipelineAlerts table instead

---

## Expected Implementation Timeline

**Based on M3 Performance:**
- M3 estimated: 2-3 days
- M3 actual: 15 minutes (1 iteration)

**M4 Estimate:**
- PRD estimate: 2-3 days
- Likely actual: 60-90 minutes (1-2 iterations)
- Ralph has all context and patterns ready from M1/M2/M3

**Complexity Comparison:**
- M3: 5 functions, platform staff auth, fire-and-forget pattern (familiar)
- M4: 4 functions, similar auth pattern, 6 health checks (more logic but similar patterns)

---

## What Ralph Should Do Next

### Iteration 1 - Expected Actions

1. **Read Context Files** (5-10 minutes)
   - /Users/neil/Documents/GitHub/PDP/scripts/ralph/prds/voice-monitor-harness/context/M1_LESSONS_LEARNED.md
   - /Users/neil/Documents/GitHub/PDP/scripts/ralph/prds/voice-monitor-harness/context/M2_LESSONS_LEARNED.md
   - /Users/neil/Documents/GitHub/PDP/scripts/ralph/prds/voice-monitor-harness/context/M3_LESSONS_LEARNED.md
   - /Users/neil/Documents/GitHub/PDP/scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M4.json

2. **Create voicePipelineAlerts.ts** (40-50 minutes)
   - Copy verifyPlatformStaff helper from voicePipelineRetry.ts
   - Implement checkPipelineHealth with 6 health checks
   - Implement alert deduplication logic
   - Implement getActiveAlerts query
   - Implement acknowledgeAlert mutation
   - Implement getAlertHistory query with pagination

3. **Add Cron Job** (5 minutes)
   - Update /Users/neil/Documents/GitHub/PDP/packages/backend/convex/crons.ts
   - Add check-pipeline-health cron (every 5 minutes)

4. **Test Functions** (15-20 minutes)
   - Run codegen: `npx -w packages/backend convex codegen`
   - Run type check: `npm run check-types`
   - Manual test via Convex dashboard (force conditions, verify alerts created)

5. **Commit** (5 minutes)
   - Message: "feat: US-VNM-007 - Build Pipeline Alerts Backend"
   - Update prd.json: passes: true
   - Append learnings to progress.txt

**Total Estimated:** 70-90 minutes (1-2 iterations)

---

## Success Indicators

### File Created
- [ ] /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/voicePipelineAlerts.ts exists
- [ ] File size ~400-600 lines (4 functions + helpers)

### Functions Implemented
- [ ] checkPipelineHealth (internalMutation)
- [ ] getActiveAlerts (query)
- [ ] acknowledgeAlert (mutation)
- [ ] getAlertHistory (query)

### Cron Job Added
- [ ] check-pipeline-health cron in crons.ts
- [ ] Schedule: Every 5 minutes
- [ ] Visible in Convex dashboard

### Quality Checks
- [ ] Platform staff auth in ALL queries/mutations
- [ ] Safe division in failure rate calculation
- [ ] Alert deduplication implemented
- [ ] Latency baseline uses 168 hourly snapshots
- [ ] Real-time metrics read from voicePipelineCounters (not events)
- [ ] Severity levels correct (critical/high/medium/low)
- [ ] All 6 alert types can be triggered
- [ ] Codegen passes
- [ ] Type check passes

### Commit
- [ ] Commit message: "feat: US-VNM-007 - Build Pipeline Alerts Backend"
- [ ] prd.json updated: passes: true
- [ ] progress.txt updated with learnings

---

## Agent Monitoring

### What Agents Should Flag

**Security Reviewer:**
- Missing isPlatformStaff check
- Error messages exposing sensitive info

**Code Reviewer:**
- Using .take(168) instead of .collect().slice(0, 168)
- Missing safe division check (denominator > 0)
- Missing alert deduplication logic
- Using event scans instead of counter reads
- Wrong severity levels
- Missing platform staff auth

**Quality Auditor:**
- console.log statements
- Missing error handling
- TypeScript any types
- Duplicate code

---

## Monitoring Commands

### Check Ralph Progress
```bash
# Recent commits
git log --oneline -5

# Progress log
tail -100 /Users/neil/Documents/GitHub/PDP/scripts/ralph/progress.txt

# PRD status
cat /Users/neil/Documents/GitHub/PDP/scripts/ralph/prd.json | jq -r '.userStories[] | "\(.id): \(.passes)"'

# File created?
ls -la /Users/neil/Documents/GitHub/PDP/packages/backend/convex/models/voicePipelineAlerts.ts

# Ralph running?
ps aux | grep ralph.sh | grep -v grep
```

### Check Agent Feedback
```bash
# Latest feedback
tail -100 /Users/neil/Documents/GitHub/PDP/scripts/ralph/agents/output/feedback.md

# Agent PIDs
ls -la /Users/neil/Documents/GitHub/PDP/scripts/ralph/agents/output/*.pid
```

### Check Code Quality
```bash
# Codegen
npx -w packages/backend convex codegen

# Type check
npm run check-types

# Lint
npx ultracite fix
```

---

**Monitoring Status:** 🟢 ACTIVE
**Ralph Status:** 🟡 READY TO START M4
**M4 Progress:** 0% (not yet started)
**Agents Status:** 🟢 6/6 RUNNING
**Estimated Completion:** 70-90 minutes from start
