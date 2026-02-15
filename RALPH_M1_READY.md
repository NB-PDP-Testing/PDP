# ✅ Ralph Phase M1 Setup - READY TO LAUNCH

**Date:** 2026-02-15
**Phase:** M1 - Foundation (Backend Instrumentation)
**Branch:** ralph/voice-monitor-harness
**Status:** All setup complete - Ready for autonomous execution

---

## ✅ SETUP COMPLETE

All 4 critical issues have been resolved:

1. ✅ **scripts/ralph/prd.json** - Updated to point to voice-monitor-harness
2. ✅ **voice-monitor-harness/PRD.json** - Added `passes: false` to all 15 user stories
3. ✅ **scripts/ralph/progress.txt** - Fresh progress log with Codebase Patterns section
4. ✅ **Branch verification** - On ralph/voice-monitor-harness

---

## 📋 PHASE M1 SUMMARY

**3 User Stories - 4-5 day duration**

### US-VNM-001: Create Pipeline Event Log Schema (Priority 1)
- Add 3 new tables to schema.ts
- voicePipelineEvents (27 event types, 9 indexes)
- voicePipelineMetricsSnapshots (hourly/daily, 2 indexes)
- voicePipelineCounters (atomic counters, 2 indexes)
- **Critical:** timeWindow format 'YYYY-MM-DD-HH'

### US-VNM-002: Build Event Logging Infrastructure (Priority 2)
- Create voicePipelineEvents.ts with 6 functions
- logEvent internalMutation (atomic counter increment)
- Event queries with cursor pagination
- Platform staff authorization
- **Critical:** Counter increment in same transaction as event insert

### US-VNM-003: Instrument Pipeline with Event Emissions (Priority 3)
- Instrument 9 existing pipeline files
- Add event logging at all instrumentation points
- Fire-and-forget pattern (non-blocking)
- **Critical:** Atomic imports (add import + usage in same edit)

---

## 🎯 MANDATORY PATTERNS

### Performance (7 patterns in PERFORMANCE_PATTERNS.md)
1. Cursor-based pagination (.paginate() not .take())
2. N+1 prevention (batch fetch + Map lookup)
3. Counter-based metrics (O(1) reads)
4. Snapshot-based queries (never scan raw events)
5. Time-window partitioning ('YYYY-MM-DD-HH')
6. Query skip pattern (auth checks)
7. Fire-and-forget logging (non-blocking)

### Architecture
- Artifacts use orgContextCandidates[0]?.organizationId
- Better Auth: user._id (not user.id), user.name (not user.firstName)
- Actions: await ctx.runMutation() wrapped in try/catch
- Mutations: ctx.scheduler.runAfter(0, ...) for fire-and-forget

### Critical Gotcha: Atomic Imports
ALWAYS add import AND usage in SAME edit - linter removes unused imports between edits

---

## 🚀 LAUNCH COMMAND

```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/ralph.sh 10
```

**Monitor in another terminal:**
```bash
./scripts/ralph/monitor.sh
```

---

## 📚 CONTEXT FILES

Ralph will read these files automatically:

**Primary Context:**
- scripts/ralph/prds/voice-monitor-harness/context/MAIN_CONTEXT.md (architecture overview)
- scripts/ralph/prds/voice-monitor-harness/context/PERFORMANCE_PATTERNS.md (7 mandatory patterns)

**Detailed Implementation:**
- scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M1.json (FULL acceptance criteria)
- scripts/ralph/prds/voice-monitor-harness/CRITICAL_FIXES_APPLIED.md (22 architectural fixes)

**Architecture Reference:**
- docs/architecture/voice-flow-monitoring-harness.md (complete architecture)
- docs/architecture/voice-notes-v2-technical-reference.md (existing v2 pipeline)

---

## ✅ PRE-FLIGHT VERIFICATION

```bash
# Verify PRD
./scripts/ralph/validate-prd.sh scripts/ralph/prd.json
# Result: ⚠️ 3 warnings (expected - detailed stories), 0 errors

# Verify branch
git branch --show-current
# Result: ralph/voice-monitor-harness

# Verify context files exist
ls -la scripts/ralph/prds/voice-monitor-harness/context/
# Result: MAIN_CONTEXT.md, PERFORMANCE_PATTERNS.md

# Verify phase files exist
ls -la scripts/ralph/prds/voice-monitor-harness/phases/
# Result: PHASE_M1.json through PHASE_M6_M7_M8_M9.json
```

---

## 🎬 READY FOR AUTONOMOUS EXECUTION

Ralph is configured to:
1. Read scripts/ralph/prd.json (points to voice-monitor-harness)
2. Read scripts/ralph/progress.txt (fresh with Codebase Patterns)
3. Execute US-VNM-001, US-VNM-002, US-VNM-003 in priority order
4. Read detailed acceptance criteria from PHASE_M1.json
5. Follow mandatory patterns from PERFORMANCE_PATTERNS.md
6. Update progress.txt with learnings after each story
7. Commit with message: "feat: [Story ID] - [Story Title]"
8. Mark stories complete by setting passes: true in prd.json

---

**All systems ready. Ralph can now execute Phase M1 autonomously.**
