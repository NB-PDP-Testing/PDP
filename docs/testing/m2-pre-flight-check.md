# M2 Pre-Flight Check - Ready for Ralph Execution

**Date:** 2026-02-16
**Phase:** Voice Monitor Harness - M2 (Metrics & Aggregation)
**Status:** ✅ ALL SYSTEMS GO

---

## Pre-Flight Checklist

### ✅ 1. Configuration Files
- [x] **prd.json** - Points to Phase M2
  - Project: "Voice Flow Monitoring Harness - Phase M2" ✅
  - Branch: ralph/voice-monitor-harness ✅
  - PRD File: scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M2.json ✅
  - Context files: 6 files including M1_LESSONS_LEARNED.md ✅
  - Mandatory patterns: 16 patterns (M2-specific) ✅
  - Success criteria: 14 criteria ✅
  - User stories: US-VNM-004, US-VNM-005 (both passes: false) ✅
  - ralphGuidance section: Present ✅
  - testingStrategy section: Present ✅

### ✅ 2. progress.txt - Learning Context
- [x] **Codebase Patterns section at top** (lines 5-95) ✅
  - M1 patterns documented ✅
  - M2 critical patterns (7 patterns) ✅
  - Convex patterns ✅
  - Code quality patterns ✅
- [x] **M1 completion documented** ✅
  - US-VNM-001: Complete ✅
  - US-VNM-002: Complete ✅
  - US-VNM-003: Complete (all 9 files) ✅
- [x] **M2 phase setup** (lines 230-446) ✅
  - Goals, stories, pitfalls, success indicators ✅
  - "What to do next" checklist ✅
- [x] **M1 learnings preserved** ✅
  - All iteration entries kept ✅
  - Mistakes documented ✅
  - Gotchas noted ✅

### ✅ 3. Context Files
- [x] MAIN_CONTEXT.md - Present ✅
- [x] PERFORMANCE_PATTERNS.md - Present ✅
- [x] **M1_LESSONS_LEARNED.md** - Present ✅ (10 critical patterns)
- [x] voice-flow-monitoring-harness.md - Present ✅
- [x] voice-notes-v2-technical-reference.md - Present ✅
- [x] CLAUDE.md - Present ✅

### ✅ 4. Architectural Reviews
- [x] **.claude/agent-memory/architecture-reviewer/voice-monitor-m2-review.md** ✅
  - Function-by-function analysis (8 functions, 4 crons)
  - Risk assessment
  - Performance targets
  - Data flow verification

### ✅ 5. Git Status
- [x] **Branch:** ralph/voice-monitor-harness ✅
- [x] **Clean working directory:** No uncommitted M1 work ✅
- [x] **Latest commit:** Merged main into branch ✅

### ✅ 6. Code Quality
- [x] **Codegen passes:** npx -w packages/backend convex codegen ✅
- [x] **Type checks pass:** npm run check-types ✅
- [x] **M1 dependencies met:** All 3 tables exist ✅

### ✅ 7. Agents Status
- [x] **6 agents running:** ✅
  1. code-review-gate ✅
  2. documenter ✅
  3. prd-auditor ✅
  4. quality-monitor ✅
  5. security-tester ✅
  6. test-runner ✅
- [x] **Agent PIDs exist:** 6 PID files ✅
- [x] **Feedback file ready:** feedback.md exists ✅

### ✅ 8. M2 User Stories Ready
- [x] **US-VNM-004:** Build Metrics Aggregation System
  - Priority: 4 ✅
  - Status: passes: false (ready to start) ✅
  - 15 acceptance criteria ✅
  - Notes reference M1_LESSONS_LEARNED.md ✅

- [x] **US-VNM-005:** Add Metrics Aggregation Crons
  - Priority: 5 ✅
  - Status: passes: false (ready to start) ✅
  - 12 acceptance criteria ✅
  - Critical timing requirements documented ✅

### ✅ 9. M1 Prerequisites
- [x] voicePipelineEvents table exists ✅
- [x] voicePipelineCounters table exists ✅
- [x] voicePipelineMetricsSnapshots table exists ✅
- [x] All 9 pipeline files instrumented ✅
- [x] Event logging working ✅
- [x] Counter rotation implemented ✅

### ✅ 10. Testing Documentation
- [x] M1 instrumentation review complete ✅
- [x] M2 setup verification complete ✅
- [x] M2 readiness report complete ✅
- [x] progress.txt update documented ✅

---

## Critical Reminders for Ralph

### BEFORE Starting Any M2 Work:
1. ✅ Read scripts/ralph/prds/voice-monitor-harness/context/M1_LESSONS_LEARNED.md
2. ✅ Read .claude/agent-memory/architecture-reviewer/voice-monitor-m2-review.md
3. ✅ Review "Codebase Patterns" section at top of progress.txt

### Implementation Order (from ralphGuidance):
1. **US-VNM-004: Create voicePipelineMetrics.ts**
   - a. getRealTimeMetrics first (test with M1 counter data)
   - b. aggregateHourlyMetrics (test with manual call)
   - c. getHistoricalMetrics (test with snapshots from step b)
   - d. getStageBreakdown and getOrgBreakdown (CRITICAL: batch fetch pattern)
   - e. aggregateDailyMetrics
   - f. cleanupOldSnapshots and cleanupOldEvents
   - g. Test all cleanup functions

2. **US-VNM-005: Add cron jobs to crons.ts**
   - a. Add all 4 cron definitions (CORRECT timing!)
   - b. Deploy to Convex
   - c. Verify crons visible and manually trigger each

### Top 7 Critical Patterns for M2:
1. **UTC Time Handling** - getUTCHours() NOT getHours()
2. **N+1 Prevention** - Batch fetch org names (see M1_LESSONS_LEARNED.md)
3. **Safe Division** - Check denominator > 0 before dividing
4. **No Event Scanning** - getRealTimeMetrics ONLY reads counters
5. **Platform-Wide Data** - OMIT organizationId field (not null)
6. **Cron Timing** - :30 for hourly, 1:30 AM for daily
7. **Error Handling** - Log errors but return successfully in crons

### Common Pitfalls to AVOID:
❌ Scanning voicePipelineEvents for real-time metrics
❌ Unbounded queries on snapshots
❌ Divide-by-zero in rate calculations
❌ Hourly cron at :00 (should be :30)
❌ Daily cron at 12:00 AM (should be 1:30 AM)
❌ N+1 queries for org names

### Performance Targets:
- getRealTimeMetrics: < 50ms
- aggregateHourlyMetrics: < 30s
- aggregateDailyMetrics: < 10s

---

## M2 Success Criteria

Ralph should mark stories complete when:

### US-VNM-004 Complete When:
- [x] voicePipelineMetrics.ts created with 8 functions
- [x] getRealTimeMetrics returns counter values in < 50ms
- [x] getHistoricalMetrics returns snapshots (no event scanning)
- [x] aggregateHourlyMetrics creates platform + org snapshots (< 30s)
- [x] aggregateDailyMetrics creates daily snapshots (< 10s)
- [x] No N+1 queries in getOrgBreakdown (batch fetch used)
- [x] All rate calculations use safe division (no NaN/Infinity)
- [x] UTC time handling throughout
- [x] Platform-wide data omits organizationId
- [x] Manual testing completed and documented
- [x] Codegen passes
- [x] Type checks pass

### US-VNM-005 Complete When:
- [x] All 4 cron jobs added to crons.ts
- [x] Hourly cron at :30 (NOT :00)
- [x] Daily cron at 1:30 AM UTC (NOT 12:00 AM)
- [x] Cleanup crons on Sunday (4:30 AM and 5:00 AM)
- [x] Crons visible in Convex dashboard
- [x] Manual trigger test passed for all 4 crons
- [x] Codegen passes
- [x] Deployment successful

---

## Ralph Execution Commands

### Option 1: Start Ralph (Recommended)
```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/ralph.sh 10
```

This will:
- Run up to 10 iterations
- Ralph reads progress.txt for context
- Ralph implements US-VNM-004 then US-VNM-005
- Ralph appends learnings to progress.txt
- Ralph commits and updates prd.json
- Stops when both stories complete

### Option 2: Monitor Ralph (Separate Terminal)
```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/monitor.sh
```

This shows:
- Real-time progress updates
- Story completion status
- Agent feedback
- Commit history

### Option 3: Manual Iteration (Alternative)
```bash
cd /Users/neil/Documents/GitHub/PDP
claude "$(cat scripts/ralph/prompt.md)"
```

This runs one iteration manually.

---

## Monitoring M2 Progress

### Check Ralph's Progress:
```bash
# View recent commits
git log --oneline -10

# Check progress.txt
tail -50 scripts/ralph/progress.txt

# Check PRD status
cat scripts/ralph/prd.json | jq '.userStories[] | "\(.id): \(.passes)"'

# Check agent feedback
tail -100 scripts/ralph/agents/output/feedback.md
```

### Expected M2 Output:
1. **Commit 1:** feat: US-VNM-004 - Build Metrics Aggregation System
   - File: packages/backend/convex/models/voicePipelineMetrics.ts
   - Functions: 8 (getRealTimeMetrics, getHistoricalMetrics, etc.)
   - Tests: Manual testing documented in progress.txt

2. **Commit 2:** feat: US-VNM-005 - Add Metrics Aggregation Crons
   - File: packages/backend/convex/crons.ts
   - Crons: 4 (hourly, daily, cleanup snapshots, cleanup events)
   - Deployment: Convex dashboard verification

### Agent Activity During M2:
- **code-review-gate:** Reviews code quality, patterns
- **documenter:** Documents implementation
- **prd-auditor:** Verifies acceptance criteria
- **quality-monitor:** Checks for anti-patterns
- **security-tester:** Security review
- **test-runner:** Runs tests if applicable

---

## Estimated Timeline

**US-VNM-004: Build Metrics Aggregation System**
- Estimated: 3 days (per PRD)
- Functions: 8 total
- Complexity: High (batch fetch, aggregation logic, UTC handling)

**US-VNM-005: Add Metrics Aggregation Crons**
- Estimated: 0.5 day (per PRD)
- Crons: 4 total
- Complexity: Medium (timing requirements critical)

**Total M2 Duration: 3-4 days**

---

## If Ralph Encounters Issues

### Common Issues & Solutions:

**Issue:** Ralph gets stuck on N+1 queries
**Solution:** Progress.txt has batch fetch code example, M1_LESSONS_LEARNED.md has detailed pattern

**Issue:** Cron timing incorrect
**Solution:** Progress.txt emphasizes :30 for hourly, 1:30 AM for daily with rationale

**Issue:** NaN/Infinity in rate calculations
**Solution:** Safe division pattern in Codebase Patterns section

**Issue:** Event scanning in getRealTimeMetrics
**Solution:** Pattern #4 in M2 Critical Patterns explicitly forbids this

**Issue:** organizationId: null not working
**Solution:** Pattern #5 explains to OMIT field, not use null

### If Ralph Needs Help:
1. Check progress.txt - Ralph's own learnings
2. Check feedback.md - Agent feedback
3. Check M1_LESSONS_LEARNED.md - Code examples
4. Check M2 architectural review - Function details

---

## Final Verification Before Starting

✅ **All configuration files ready**
✅ **All context files present**
✅ **Agents running (6/6)**
✅ **Branch correct (ralph/voice-monitor-harness)**
✅ **M1 complete (100%)**
✅ **M2 stories ready (2 stories, passes: false)**
✅ **progress.txt optimized for learning**
✅ **Code quality checks pass**
✅ **No blockers identified**

---

## GO/NO-GO Decision

**Status:** ✅ **GO FOR M2 EXECUTION**

**All systems are ready. Ralph has:**
- Full M1 context and learnings
- Clear M2 goals and implementation order
- 7 critical patterns to apply
- Detailed function specifications
- Common pitfalls documented
- Success criteria defined
- Agent support active

**Recommendation:** Execute `./scripts/ralph/ralph.sh 10` to start M2 implementation.

---

**Pre-Flight Check Completed:** 2026-02-16
**Ready for Launch:** ✅ YES
**Expected Completion:** 3-4 days
**Confidence:** HIGH (comprehensive preparation, all learnings captured)

