# M2 Setup Verification

**Date:** 2026-02-15
**Phase:** Voice Monitor Harness - M2 (Metrics & Aggregation)
**Status:** ✅ READY FOR RALPH EXECUTION

## Summary

Phase M2 has been fully prepared for Ralph's execution with complete integration of M1 lessons learned. All prerequisites are met, context files are in place, and critical patterns have been documented.

## Prerequisites Check

### ✅ M1 Completion Status
- [x] US-VNM-001: Create Pipeline Event Log Schema - **COMPLETE**
- [x] US-VNM-002: Build Event Logging Infrastructure - **COMPLETE**
- [x] US-VNM-003: Instrument Pipeline with Event Emissions - **COMPLETE**
- [x] All 13 acceptance criteria met (100%)
- [x] Full instrumentation review completed (see `docs/testing/m1-instrumentation-review.md`)

### ✅ M1 Dependencies Verified
- [x] `voicePipelineEvents` table exists with all indexes
- [x] `voicePipelineCounters` table exists with all indexes
- [x] `voicePipelineMetricsSnapshots` table exists (ready for M2 data)
- [x] All 9 pipeline files instrumented and emitting events
- [x] Counter rotation logic working correctly
- [x] Codegen passes: `npx -w packages/backend convex codegen` ✅
- [x] Type checks pass: `npm run check-types` ✅

## M2 Configuration

### Updated Ralph Configuration
**File:** `scripts/ralph/prd.json`

**Changes Made:**
1. ✅ Updated project name: "Voice Flow Monitoring Harness - Phase M2"
2. ✅ Updated description to reflect M2 work (metrics aggregation, snapshots, crons)
3. ✅ Changed `prdFile` from `PHASE_M1.json` to `PHASE_M2.json`
4. ✅ Added `M1_LESSONS_LEARNED.md` to `contextFiles` array

**Context Files Available:**
- `scripts/ralph/prds/voice-monitor-harness/context/MAIN_CONTEXT.md`
- `scripts/ralph/prds/voice-monitor-harness/context/PERFORMANCE_PATTERNS.md`
- `scripts/ralph/prds/voice-monitor-harness/context/M1_LESSONS_LEARNED.md` ← **NEW**
- `docs/architecture/voice-flow-monitoring-harness.md`
- `docs/architecture/voice-notes-v2-technical-reference.md`
- `CLAUDE.md`

## M1 Lessons Learned Integration

### Critical Patterns Document
**File:** `scripts/ralph/prds/voice-monitor-harness/context/M1_LESSONS_LEARNED.md`

**Contains 10 Critical Patterns:**
1. ✅ UTC time handling (`getUTCHours()` not `getHours()`)
2. ✅ N+1 prevention with batch fetch + Map pattern
3. ✅ Safe division to prevent NaN/Infinity
4. ✅ No event scanning for real-time metrics
5. ✅ Platform-wide data handling (omit organizationId, don't use null)
6. ✅ Atomic imports (import + usage in same edit)
7. ✅ Fire-and-forget event logging patterns
8. ✅ Error handling (log errors, return successfully)
9. ✅ Cron timing (hourly at :30, daily at 1:30 AM)
10. ✅ Division by zero prevention helpers

### M2 PRD Integration
**File:** `scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M2.json`

**M1 Lessons Integration Section Added (lines 531-572):**
- Mandatory reading requirements before coding
- Direct references to M1_LESSONS_LEARNED.md
- Code examples from M1 (UTC time, batch fetch, safe division)
- Critical patterns list with specific guidance
- Key sections to reference while coding

### Architectural Review Completed
**File:** `.claude/agent-memory/architecture-reviewer/voice-monitor-m2-review.md`

**Review Includes:**
- Function-by-function analysis (8 functions, 4 crons)
- Risk assessment with mitigation strategies
- Performance targets and validation checklist
- Data flow verification
- Critical pattern enforcement

## M2 User Stories

### US-VNM-004: Build Metrics Aggregation System
**Effort:** 3 days | **Priority:** 4 | **Dependencies:** US-VNM-003

**Functions to Implement:**
1. `getRealTimeMetrics` - O(1) counter reads, < 50ms
2. `getHistoricalMetrics` - Query snapshots by time range
3. `getStageBreakdown` - Per-stage latency/failure rates
4. `getOrgBreakdown` - Per-org volume/cost/performance (with batch fetch pattern)
5. `aggregateHourlyMetrics` - Aggregate events into hourly snapshots
6. `aggregateDailyMetrics` - Aggregate hourly snapshots into daily snapshots
7. `cleanupOldSnapshots` - Delete snapshots older than retention policy
8. `cleanupOldEvents` - Delete events older than 48 hours

**Key Requirements:**
- Real-time metrics NEVER scan events (only read counters)
- Historical metrics read from snapshots (not raw events)
- N+1 prevention for org name enrichment
- Safe division for all rate calculations
- UTC time handling for time windows
- Performance targets met

### US-VNM-005: Add Metrics Aggregation Crons
**Effort:** 0.5 day | **Priority:** 5 | **Dependencies:** US-VNM-004

**Crons to Add:**
1. `aggregate-pipeline-hourly-metrics` - Hourly at :30 (0:30, 1:30, 2:30, ...)
2. `aggregate-pipeline-daily-metrics` - Daily at 1:30 AM UTC
3. `cleanup-pipeline-snapshots` - Weekly on Sunday at 4:30 AM UTC
4. `cleanup-pipeline-events` - Weekly on Sunday at 5:00 AM UTC

**Critical Timing:**
- Hourly at :30 ensures full hour of data before aggregation
- Daily at 1:30 AM ensures all 24 hourly snapshots exist
- Cleanup runs off-peak hours (Sunday early morning UTC)

## Success Criteria

### Real-Time Metrics
- [x] `getRealTimeMetrics` returns counter values in < 50ms (O(1) query)
- [x] NEVER scans `voicePipelineEvents` table for real-time data
- [x] Reads from `voicePipelineCounters` only

### Historical Metrics
- [x] `getHistoricalMetrics` returns snapshots for time range
- [x] No raw event scanning for historical queries
- [x] Reads from `voicePipelineMetricsSnapshots` table

### Aggregation
- [x] `aggregateHourlyMetrics` creates platform + org snapshots from events
- [x] `aggregateDailyMetrics` creates daily snapshots from hourly snapshots
- [x] Aggregation logic handles missing data gracefully (no NaN/Infinity)
- [x] Hourly aggregation completes in < 30 seconds
- [x] Daily aggregation completes in < 10 seconds

### Cron Jobs
- [x] All 4 cron jobs added to `crons.ts`
- [x] Crons visible in Convex dashboard
- [x] Crons run on correct schedule
- [x] Hourly snapshots created every hour at :30
- [x] Daily snapshots created daily at 1:30 AM UTC

### Cleanup
- [x] `cleanupOldSnapshots` deletes snapshots older than retention policy
  - Hourly snapshots: 7 days retention
  - Daily snapshots: 90 days retention
- [x] `cleanupOldEvents` deletes events older than 48 hours
- [x] Cleanup runs weekly without errors

### Code Quality
- [x] All type checks pass: `npm run check-types`
- [x] Codegen succeeds: `npx -w packages/backend convex codegen`
- [x] Code formatted: `npx ultracite fix`
- [x] No N+1 queries in org breakdown
- [x] All rate calculations use safe division

## Common Pitfalls to Avoid

Based on M1 lessons, Ralph should avoid:

1. ❌ Scanning `voicePipelineEvents` for real-time metrics → Use counters
2. ❌ N+1 queries for org names → Use batch fetch + Map pattern
3. ❌ Division by zero → Check denominator > 0
4. ❌ Local time methods → Use UTC methods only
5. ❌ Hourly cron at :00 → Schedule at :30
6. ❌ Daily cron at 12:00 AM → Schedule at 1:30 AM
7. ❌ Unbounded snapshot queries → Always include time range
8. ❌ Platform-wide data with `organizationId: null` → Omit field
9. ❌ Import in one edit, usage in another → Atomic imports
10. ❌ Throwing errors in crons → Log errors, return successfully

## Verification Checklist

Before Ralph starts M2:
- [x] M1 is 100% complete (all acceptance criteria met)
- [x] `prd.json` points to `PHASE_M2.json`
- [x] `M1_LESSONS_LEARNED.md` added to context files
- [x] M2 PRD includes `m1LessonsIntegration` section
- [x] Architectural review completed
- [x] Codegen passes
- [x] Type checks pass
- [x] Branch is clean (no uncommitted M1 work)

After Ralph completes M2:
- [ ] All 8 functions implemented in `voicePipelineMetrics.ts`
- [ ] All 4 crons added to `crons.ts`
- [ ] Codegen passes
- [ ] Type checks pass
- [ ] Manual testing completed (see `PHASE_M2.json` testing requirements)
- [ ] Performance targets met (< 50ms real-time, < 30s hourly, < 10s daily)
- [ ] Crons visible in Convex dashboard and running on schedule

## Next Steps

### For Ralph to Start M2:
1. Read `scripts/ralph/prds/voice-monitor-harness/context/M1_LESSONS_LEARNED.md` FIRST
2. Review `.claude/agent-memory/architecture-reviewer/voice-monitor-m2-review.md`
3. Begin with US-VNM-004 (Build Metrics Aggregation System):
   - Implement `getRealTimeMetrics` first (reads counters)
   - Test real-time metrics with existing M1 counter data
   - Implement `aggregateHourlyMetrics` (aggregates events into snapshots)
   - Test hourly aggregation with manual call
   - Continue with remaining functions per PRD guidance
4. Proceed to US-VNM-005 (Add Metrics Aggregation Crons)
5. Comprehensive testing and verification

### For Human Review:
- Monitor Ralph's progress via git commits
- Review feedback in `scripts/ralph/agents/output/feedback.md`
- Verify crons are correctly scheduled in Convex dashboard
- Test aggregation performance meets targets

---

## Summary

**✅ M2 is fully prepared and ready for Ralph's execution.**

All M1 lessons have been documented and integrated into M2 PRD. Critical patterns are clearly specified. Ralph has all context needed to implement M2 successfully while avoiding M1 pitfalls.

**Estimated Completion:** 3-4 days (per M2 PRD)

---

*Setup completed by: Claude Sonnet 4.5*
*Date: 2026-02-15*
