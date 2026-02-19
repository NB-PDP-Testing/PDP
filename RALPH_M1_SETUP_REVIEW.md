# Ralph Phase M1 Setup Review - Voice Flow Monitoring Harness

**Date:** 2026-02-15
**Phase:** M1 - Foundation (Backend Instrumentation)
**Branch:** ralph/voice-monitor-harness

---

## ✅ SETUP STATUS

### Files That Exist and Are Ready
- ✅ `scripts/ralph/prds/voice-monitor-harness/PRD.json` - Main PRD with 15 stories
- ✅ `scripts/ralph/prds/voice-monitor-harness/context/MAIN_CONTEXT.md` - Complete architecture overview
- ✅ `scripts/ralph/prds/voice-monitor-harness/context/PERFORMANCE_PATTERNS.md` - 7 mandatory patterns
- ✅ `scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M1.json` - Detailed M1 acceptance criteria
- ✅ `scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M2.json` - M2 details
- ✅ `scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M3.json` - M3 details
- ✅ `scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M4.json` - M4 details
- ✅ `scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M5.json` - M5 details
- ✅ `scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M6_M7_M8_M9.json` - M6-M9 combined
- ✅ `scripts/ralph/prds/voice-monitor-harness/test-scenarios.md` - 46 E2E test cases
- ✅ `scripts/ralph/prds/voice-monitor-harness/CRITICAL_FIXES_APPLIED.md` - All 22 fixes documented
- ✅ `.claude/agents/` - All agent definitions in place (12 agents)
- ✅ `scripts/ralph/ralph.sh` - Ralph orchestration script
- ✅ `scripts/ralph/prompt.md` - Ralph instructions
- ✅ `scripts/ralph/validate-prd.sh` - PRD validation script

---

## ❌ FILES THAT NEED TO BE CREATED/UPDATED

### 1. scripts/ralph/prd.json ❌ NEEDS UPDATE
**Current status:** Points to old "Phase 2.6 Progress Animations" project
**Required action:** Update to point to voice-monitor-harness

**Required fields:**
- `project`: "Voice Flow Monitoring Harness"
- `branchName`: "ralph/voice-monitor-harness"
- `description`: Full description
- `prdFile`: "scripts/ralph/prds/voice-monitor-harness/PRD.json"
- `contextFiles`: Array of context files
- `mandatoryPatterns`: Array of required patterns
- `successCriteria`: Array of success criteria
- `userStories`: Array with `passes: false` field for tracking

**Issue:** voice-monitor-harness PRD.json is missing the `passes` field that ralph.sh needs

### 2. scripts/ralph/progress.txt ❌ NEEDS CREATION
**Current status:** Contains old progress from previous projects
**Required action:** Create fresh progress.txt for voice-monitor-harness

**Required sections:**
```markdown
# Ralph Progress Log - Voice Flow Monitoring Harness
Started: [Date]
Branch: ralph/voice-monitor-harness
---

## Codebase Patterns
**Last Updated**: [Date] - Iteration 0 (Pre-launch)

### Voice Notes v2 Pipeline Architecture
- Pipeline stages: Ingestion → Transcription → Claims → Resolution → Drafts → Confirmation
- v2 tables: voiceNoteArtifacts, voiceNoteTranscripts, voiceNoteClaims, voiceNoteEntityResolutions, insightDrafts
- Artifacts use orgContextCandidates[] array (not flat organizationId field)
- Better Auth: user._id (not user.id), user.name (not user.firstName)

### Performance Patterns (MANDATORY)
- NEVER use .filter() - always .withIndex()
- Counter-based real-time metrics (O(1) reads, atomic increment)
- Snapshot-based historical queries (never scan raw events beyond current hour)
- Time-window partitioning: timeWindow field format 'YYYY-MM-DD-HH'
- Cursor-based pagination (.paginate() not .take())
- N+1 prevention: batch fetch + Map lookup
- Fire-and-forget event logging (ctx.scheduler.runAfter for mutations, await ctx.runMutation for actions)

### Phase M1 Specific
- 3 new tables: voicePipelineEvents, voicePipelineMetricsSnapshots, voicePipelineCounters
- 27 event types total (including entity_resolution_failed, draft_generation_failed)
- Event logging must NOT block pipeline execution
- Counter race condition handling with atomic patch operations
- Reference: scripts/ralph/prds/voice-monitor-harness/context/PERFORMANCE_PATTERNS.md

---
```

### 3. scripts/ralph/prds/voice-monitor-harness/PRD.json ❌ NEEDS UPDATE
**Issue:** Missing `passes` field on each userStory
**Required action:** Add `"passes": false` to all 15 user stories

### 4. Branch Verification ❌ NEEDS CHECK
**Current branch:** Need to verify we're on `ralph/voice-monitor-harness`
**Required action:** Ensure branch exists and matches PRD branchName

---

## 📋 PHASE M1 STORIES (3 stories)

### US-VNM-001: Create Pipeline Event Log Schema
- **Priority:** 1
- **Effort:** 1 day
- **Files:** packages/backend/convex/schema.ts
- **Key deliverables:**
  - voicePipelineEvents table (27 event types, timeWindow partitioning)
  - voicePipelineMetricsSnapshots table (hourly/daily snapshots)
  - voicePipelineCounters table (real-time atomic counters)
  - All proper indexes defined
- **Critical patterns:**
  - timeWindow format: 'YYYY-MM-DD-HH'
  - eventId is v.string() (UUID), not v.id()
  - Counter atomic increment in same transaction as event insert
- **Verification:** `npx -w packages/backend convex codegen` must pass

### US-VNM-002: Build Event Logging Infrastructure
- **Priority:** 2
- **Effort:** 2 days
- **Files:** packages/backend/convex/models/voicePipelineEvents.ts (create new)
- **Key deliverables:**
  - logEvent internalMutation (atomic counter increment)
  - getRecentEvents query (cursor pagination)
  - getEventsByArtifact internalQuery
  - getEventTimeline query (platform staff auth)
  - getActiveArtifacts query
  - getFailedArtifacts query
- **Critical patterns:**
  - ALWAYS use .paginate() - NEVER .take()
  - Platform staff authorization on all public queries
  - Counter increment MUST be atomic (same transaction as event insert)
  - Fire-and-forget pattern (logEvent catches errors internally)
- **Verification:**
  - Type check passes
  - Test logEvent via Convex dashboard
  - Verify counter increments

### US-VNM-003: Instrument Pipeline with Event Emissions
- **Priority:** 3
- **Effort:** 2 days
- **Files:** 9 existing pipeline files (see PHASE_M1.json)
- **Key deliverables:**
  - Instrument voiceNoteArtifacts.ts (createArtifact, updateArtifactStatus)
  - Instrument voiceNoteTranscripts.ts (createTranscript)
  - Instrument voiceNoteClaims.ts (storeClaims)
  - Instrument voiceNoteEntityResolutions.ts (storeResolutions)
  - Instrument insightDrafts.ts (createDrafts, confirmDraft, rejectDraft)
  - Instrument actions/*.ts (start events for transcription, claims, resolution, drafts)
- **Critical patterns:**
  - Mutations: ctx.scheduler.runAfter(0, internal.models.voicePipelineEvents.logEvent, {...})
  - Actions: await ctx.runMutation(internal.models.voicePipelineEvents.logEvent, {...}) wrapped in try/catch
  - NEVER block pipeline on event logging
  - organizationId extraction: artifact.orgContextCandidates[0]?.organizationId
  - ATOMIC IMPORTS: Add import + usage in SAME edit (linter removes unused imports between edits)
- **Verification:**
  - Create test voice note → verify full pipeline events logged
  - Check voicePipelineCounters incremented
  - Verify timeWindow format correct
  - Performance: event logging < 10ms overhead

---

## 🎯 MANDATORY PATTERNS FOR PHASE M1

### From PERFORMANCE_PATTERNS.md:
1. **Cursor-based pagination** - Use .paginate(paginationOpts), never .take()
2. **N+1 prevention** - Batch fetch + Map lookup pattern
3. **Counter-based metrics** - Read counters (O(1)), never scan events
4. **Snapshot-based queries** - Query snapshots, not raw events
5. **Time-window cleanup** - Delete by timeWindow index, not timestamp scan
6. **Query skip pattern** - Skip queries when user not platform staff
7. **Fire-and-forget logging** - Non-blocking event emission

### From CRITICAL_FIXES_APPLIED.md:
- Fix #1: organizationId extraction uses orgContextCandidates[0]?.organizationId
- Fix #2: Actions must await ctx.runMutation(), mutations use ctx.scheduler.runAfter()
- Fix #3: Counter race condition handling with atomic patch
- Fix #4: Include entity_resolution_failed, draft_generation_failed event types

---

## 🚨 CRITICAL GOTCHAS FOR PHASE M1

### Organization ID Extraction
```typescript
// ❌ WRONG: Artifacts don't have flat organizationId
organizationId: args.organizationId

// ✅ CORRECT: Extract from orgContextCandidates
organizationId: newArtifact.orgContextCandidates[0]?.organizationId
```

### Fire-and-Forget Pattern
```typescript
// ✅ In mutations (voiceNoteArtifacts.ts, etc.):
await ctx.scheduler.runAfter(0,
  internal.models.voicePipelineEvents.logEvent,
  { eventType: "artifact_received", ... }
); // Returns immediately

// ✅ In actions (voiceNotes.ts, etc.):
try {
  await ctx.runMutation(internal.models.voicePipelineEvents.logEvent, {
    eventType: "transcription_started",
    artifactId,
    ...
  });
} catch (logError) {
  console.error("Event logging failed:", logError);
  // Don't throw - continue pipeline
}
```

### Counter Race Condition
```typescript
// ✅ CORRECT: Atomic reset at window boundary
if (counter && Date.now() >= counter.windowEnd) {
  await ctx.db.patch(counter._id, {
    currentValue: 1,  // Reset to 1, not increment
    windowStart: Date.now(),
    windowEnd: Date.now() + 3600000
  });
} else if (counter) {
  await ctx.db.patch(counter._id, {
    currentValue: counter.currentValue + 1
  });
}
```

### Atomic Imports (CRITICAL)
```typescript
// ❌ WRONG: Two separate edits
// Edit 1: Add import
import { internal } from "./_generated/api";
// [Linter runs, removes unused import]
// Edit 2: Add usage
await ctx.scheduler.runAfter(...);  // Error: 'internal' not defined

// ✅ CORRECT: Single edit with both
import { internal } from "./_generated/api";

await ctx.scheduler.runAfter(0,
  internal.models.voicePipelineEvents.logEvent, {...}
);
```

---

## ✅ PRE-FLIGHT CHECKLIST

Before starting Ralph:

- [ ] Update scripts/ralph/prd.json to point to voice-monitor-harness
- [ ] Add "passes": false to all userStories in voice-monitor-harness/PRD.json
- [ ] Create fresh scripts/ralph/progress.txt with Codebase Patterns section
- [ ] Verify on branch ralph/voice-monitor-harness
- [ ] Read MAIN_CONTEXT.md for architecture overview
- [ ] Read PERFORMANCE_PATTERNS.md for mandatory patterns
- [ ] Read PHASE_M1.json for detailed acceptance criteria
- [ ] Verify all context files exist and are accessible
- [ ] Check that existing v2 pipeline files are understood
- [ ] Review CRITICAL_FIXES_APPLIED.md for architectural fixes

---

## 📊 SUCCESS CRITERIA FOR PHASE M1

From PHASE_M1.json successCriteria:

- ✅ All 3 tables added to schema with correct validators and indexes
- ✅ Codegen passes: `npx -w packages/backend convex codegen`
- ✅ logEvent mutation inserts events and increments counters atomically
- ✅ All list queries use .paginate() - zero .take() usage
- ✅ All 9 pipeline files emit events at correct points
- ✅ Event emissions use ctx.scheduler.runAfter / ctx.runMutation (non-blocking)
- ✅ voicePipelineCounters table shows incremented values after emissions
- ✅ timeWindow field format verified: 'YYYY-MM-DD-HH'
- ✅ Event metadata includes counts, costs, confidence, duration where applicable
- ✅ Platform staff can query events, non-staff get 'Unauthorized' error
- ✅ Event logging adds < 10ms overhead to pipeline execution

---

## 📁 FILE REFERENCE MAP

### Context Files (Must Read Before Starting)
- `scripts/ralph/prds/voice-monitor-harness/context/MAIN_CONTEXT.md` - Architecture, tables, patterns
- `scripts/ralph/prds/voice-monitor-harness/context/PERFORMANCE_PATTERNS.md` - 7 mandatory patterns
- `docs/architecture/voice-flow-monitoring-harness.md` - Full architecture doc
- `docs/architecture/voice-notes-v2-technical-reference.md` - Existing v2 pipeline

### Phase M1 Implementation Guide
- `scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M1.json` - FULL detailed acceptance criteria
- `scripts/ralph/prds/voice-monitor-harness/CRITICAL_FIXES_APPLIED.md` - 22 architectural fixes

### Existing V2 Pipeline Files (To Be Instrumented in US-VNM-003)
- `packages/backend/convex/models/voiceNoteArtifacts.ts`
- `packages/backend/convex/models/voiceNoteTranscripts.ts`
- `packages/backend/convex/models/voiceNoteClaims.ts`
- `packages/backend/convex/models/voiceNoteEntityResolutions.ts`
- `packages/backend/convex/models/insightDrafts.ts`
- `packages/backend/convex/actions/voiceNotes.ts`
- `packages/backend/convex/actions/claimsExtraction.ts`
- `packages/backend/convex/actions/entityResolution.ts`
- `packages/backend/convex/actions/draftGeneration.ts`

### Files To Be Created
- `packages/backend/convex/models/voicePipelineEvents.ts` (US-VNM-002)

### Files To Be Modified
- `packages/backend/convex/schema.ts` (US-VNM-001)
- All 9 existing pipeline files listed above (US-VNM-003)

---

## 🎬 READY TO LAUNCH

Once the pre-flight checklist is complete, Ralph can be launched with:

```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/ralph.sh 10
```

**Monitoring:**
```bash
# In another terminal
./scripts/ralph/monitor.sh
```

**Manual validation after setup:**
```bash
./scripts/ralph/validate-prd.sh scripts/ralph/prd.json
```

---

**Next Action:** Fix the 4 items in the "FILES THAT NEED TO BE CREATED/UPDATED" section above.
