# M3 Ralph Readiness Report

**Date:** 2026-02-16 21:00
**Phase:** Voice Monitor Harness - M3 (Retry Operations)
**Status:** 🟢 READY TO START

---

## Pre-Flight Checklist

### ✅ Prerequisites Complete

- [x] **M1 Complete:** Backend instrumentation (9 files instrumented, events logged)
- [x] **M2 Complete:** Metrics aggregation (8 functions + 4 crons implemented)
- [x] **Branch:** ralph/voice-monitor-harness (correct)
- [x] **Git Status:** Clean (M2 commits pushed)
- [x] **Agents Running:** 6/6 active (code-review-gate, documenter, prd-auditor, quality-monitor, security-tester, test-runner)

### ✅ Context Files Ready

- [x] `scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M3.json` (exists)
- [x] `scripts/ralph/prds/voice-monitor-harness/context/M1_LESSONS_LEARNED.md` (exists)
- [x] `scripts/ralph/prds/voice-monitor-harness/context/M2_LESSONS_LEARNED.md` (created)
- [x] `scripts/ralph/prds/voice-monitor-harness/context/MAIN_CONTEXT.md` (exists)
- [x] `scripts/ralph/prds/voice-monitor-harness/context/PERFORMANCE_PATTERNS.md` (exists)
- [x] `docs/architecture/voice-flow-monitoring-harness.md` (exists)
- [x] `docs/architecture/voice-notes-v2-technical-reference.md` (exists)
- [x] `CLAUDE.md` (exists)

### ✅ PRD Configuration

- [x] `scripts/ralph/prd.json` updated to M3
- [x] Project: "Voice Flow Monitoring Harness - Phase M3"
- [x] prdFile: points to PHASE_M3.json
- [x] contextFiles: includes M1 and M2 lessons learned
- [x] mandatoryPatterns: 15 M3-specific patterns
- [x] successCriteria: 13 M3 criteria
- [x] userStories: US-VNM-006 (passes: false, ready for implementation)

### ✅ Progress.txt Updated

- [x] Codebase Patterns section at top (as required by prompt.md)
- [x] M1 patterns documented
- [x] M2 patterns documented
- [x] M3 patterns documented
- [x] M2 completion entry added
- [x] M3 phase setup section added with:
  - Goals (6 items)
  - User stories (US-VNM-006)
  - Critical implementation details (5 function signatures)
  - Critical gotchas (6 gotchas)
  - Action scheduling reference
  - Testing strategy
  - Success criteria
  - Common pitfalls
  - Mandatory patterns
  - Execution order (12 steps)

---

## M3 Phase Overview

### Scope

**Duration:** 2-3 days (estimated)
**Complexity:** Medium
**File Count:** 1 new file (voicePipelineRetry.ts)
**Functions:** 5 (4 retry mutations + 1 history query)

### User Stories

**US-VNM-006: Build Retry Operations Backend**
- Create voicePipelineRetry.ts with 5 functions
- Platform staff authorization on all mutations
- Audit logging for all retry operations
- Fire-and-forget action scheduling
- Full pipeline retry (DESTRUCTIVE - deletes all derived data)

### Critical Requirements

1. **Authorization:** ALL retry mutations verify `isPlatformStaff`
2. **Event Logging:** Log `retry_initiated` BEFORE scheduling action
3. **Status Reset:** Reset artifact status BEFORE scheduling retry
4. **Retry Tracking:** Increment `metadata.retryAttempt` with each retry
5. **Fire-and-Forget:** Use `ctx.scheduler.runAfter(0, ...)` (NEVER `ctx.runAction`)
6. **transcribeAudio Gotcha:** Takes `noteId` (v1 voiceNotes), NOT `artifactId` (v2)
7. **Full Pipeline Retry:** Delete ALL derived data in try/catch, abort on any failure

---

## Critical Gotchas (MUST AVOID!)

### Gotcha #1: transcribeAudio Action Signature ⚠️ CRITICAL

**Problem:** transcribeAudio is a V1 action that takes `v.id("voiceNotes")` noteId, NOT v2 artifactId

**❌ WRONG:**
```typescript
await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, {
  artifactId: args.artifactId  // ❌ Wrong! This will fail
});
```

**✅ CORRECT:**
```typescript
const artifact = await ctx.db.get(args.artifactId);
if (!artifact) return { success: false, message: "Artifact not found" };

await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, {
  noteId: artifact.voiceNoteId  // ✅ Correct! Use linked noteId
});
```

### Gotcha #2: Retry Attempt Tracking

**Problem:** Must count previous retry attempts to increment retryAttempt

**✅ CORRECT:**
```typescript
// Count previous retries
const previousRetries = await ctx.db
  .query("voicePipelineEvents")
  .withIndex("by_artifactId", q => q.eq("artifactId", args.artifactId))
  .collect();

const retryCount = previousRetries.filter(e => e.eventType === "retry_initiated").length;
const retryAttempt = retryCount + 1;

// Log with retryAttempt
await ctx.scheduler.runAfter(0, internal.models.voicePipelineEvents.logEvent, {
  eventType: "retry_initiated",
  artifactId: args.artifactId,
  metadata: { retryAttempt, retryType: "transcription" }
});
```

### Gotcha #3: Full Pipeline Delete Order

**Problem:** If ANY delete fails, must abort entire operation (no partial cleanup)

**✅ CORRECT:**
```typescript
try {
  // Delete transcripts
  const transcript = await ctx.db
    .query("voiceNoteTranscripts")
    .withIndex("by_artifactId", q => q.eq("artifactId", args.artifactId))
    .first();
  if (transcript) await ctx.db.delete(transcript._id);

  // Delete claims
  const claims = await ctx.db
    .query("voiceNoteClaims")
    .withIndex("by_artifactId", q => q.eq("artifactId", args.artifactId))
    .collect();
  for (const claim of claims) {
    await ctx.db.delete(claim._id);
  }

  // Delete resolutions
  const resolutions = await ctx.db
    .query("voiceNoteEntityResolutions")
    .withIndex("by_artifactId", q => q.eq("artifactId", args.artifactId))
    .collect();
  for (const res of resolutions) {
    await ctx.db.delete(res._id);
  }

  // Delete drafts
  const drafts = await ctx.db
    .query("insightDrafts")
    .withIndex("by_artifactId", q => q.eq("artifactId", args.artifactId))
    .collect();
  for (const draft of drafts) {
    await ctx.db.delete(draft._id);
  }

  // Only if ALL deletes succeed: reset status
  await ctx.db.patch(args.artifactId, { status: "received" });

  // Schedule retry
  const artifact = await ctx.db.get(args.artifactId);
  await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, {
    noteId: artifact.voiceNoteId
  });

  return { success: true, message: "Full pipeline retry initiated" };
} catch (error) {
  console.error("Full retry cleanup failed:", error);
  return { success: false, message: `Cleanup failed: ${error.message}` };
}
```

### Gotcha #4: Fire-and-Forget Pattern

**❌ WRONG:**
```typescript
await ctx.runAction(internal.actions.voiceNotes.transcribeAudio, { noteId });
// ❌ Blocks mutation, causes timeout
```

**✅ CORRECT:**
```typescript
await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, { noteId });
// ✅ Fire-and-forget, mutation returns immediately
```

### Gotcha #5: Event Logging BEFORE Scheduling

**Order matters!**

**✅ CORRECT:**
```typescript
// 1. Log retry_initiated FIRST
await ctx.scheduler.runAfter(0, internal.models.voicePipelineEvents.logEvent, {
  eventType: "retry_initiated",
  artifactId: args.artifactId,
  metadata: { retryAttempt }
});

// 2. Reset status
await ctx.db.patch(args.artifactId, { status: "transcribing" });

// 3. THEN schedule action
await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, { noteId });
```

### Gotcha #6: Status Reset BEFORE Scheduling

**Status must be reset before action runs**

**Retry Type → Status Mapping:**
- retryTranscription → `status: "transcribing"`
- retryClaimsExtraction → `status: "transcribed"`
- retryEntityResolution → (no status change, just delete resolutions)
- retryFullPipeline → `status: "received"`

---

## Function Implementation Reference

### 1. retryTranscription

**Implementation Checklist:**
- [ ] Verify platform staff auth (isPlatformStaff)
- [ ] Fetch artifact by ID
- [ ] Verify transcription failure (check status or error)
- [ ] Count previous retry attempts (query voicePipelineEvents)
- [ ] Log retry_initiated with metadata.retryAttempt
- [ ] Reset artifact status to 'transcribing'
- [ ] Get artifact.voiceNoteId (NOT artifactId!)
- [ ] Schedule transcribeAudio with noteId
- [ ] Return { success: true, message: 'Transcription retry initiated' }

### 2. retryClaimsExtraction

**Implementation Checklist:**
- [ ] Verify platform staff auth
- [ ] Fetch artifact, verify claims extraction failed
- [ ] Log retry_initiated with retryAttempt
- [ ] Reset status to 'transcribed'
- [ ] Schedule extractClaims action
- [ ] Return success

### 3. retryEntityResolution

**Implementation Checklist:**
- [ ] Verify platform staff auth
- [ ] Fetch artifact, verify resolution failed or needs manual review
- [ ] Log retry_initiated with retryAttempt
- [ ] **DELETE existing voiceNoteEntityResolutions for this artifact** (clean slate)
- [ ] Schedule resolveEntities action
- [ ] Return success

### 4. retryFullPipeline (DESTRUCTIVE)

**Implementation Checklist:**
- [ ] Verify platform staff auth
- [ ] Fetch artifact
- [ ] Log retry_initiated with metadata: { retryType: 'full_pipeline' }
- [ ] Wrap deletion in try/catch:
  - [ ] Delete voiceNoteTranscripts (by_artifactId index)
  - [ ] Delete voiceNoteClaims (by_artifactId index)
  - [ ] Delete voiceNoteEntityResolutions (by_artifactId index)
  - [ ] Delete insightDrafts (by_artifactId index)
- [ ] Only if ALL deletes succeed: reset status to 'received'
- [ ] Get artifact.voiceNoteId
- [ ] Schedule transcribeAudio with noteId
- [ ] Return success
- [ ] On error: return { success: false, message: 'Cleanup failed - aborted' }

### 5. getRetryHistory

**Implementation Checklist:**
- [ ] Verify platform staff auth
- [ ] Query voicePipelineEvents by_artifactId index
- [ ] Filter eventType in ['retry_initiated', 'retry_succeeded', 'retry_failed']
- [ ] Order by timestamp ascending
- [ ] Map to simplified format: { timestamp, eventType, retryAttempt, succeeded, errorMessage }
- [ ] Return array

---

## Action Scheduling Reference

**Pipeline Actions:**
- Transcription: `internal.actions.voiceNotes.transcribeAudio`
  - Args: `{ noteId: v.id("voiceNotes") }` ⚠️ NOT artifactId!
- Claims Extraction: `internal.actions.claimsExtraction.extractClaims`
- Entity Resolution: `internal.actions.entityResolution.resolveEntities`
- Draft Generation: `internal.actions.draftGeneration.generateDrafts`

**Event Logging:**
- `internal.models.voicePipelineEvents.logEvent`

---

## Testing Plan (Manual - Convex Dashboard)

### Test 1: Retry Transcription
1. Create artifact with transcription failure (or manually set status to 'failed')
2. Open Convex dashboard → Functions tab
3. Call retryTranscription({ artifactId: "..." })
4. Verify:
   - Returns { success: true, message: '...' }
   - retry_initiated event logged in voicePipelineEvents
   - Artifact status reset to 'transcribing'
   - transcribeAudio action scheduled (check logs)
   - If transcription succeeds: retry_succeeded event appears

### Test 2: Retry Claims Extraction
1. Create artifact with claims extraction failure
2. Call retryClaimsExtraction({ artifactId: "..." })
3. Verify similar to Test 1

### Test 3: Retry Entity Resolution
1. Create artifact with entity resolution failure
2. Call retryEntityResolution({ artifactId: "..." })
3. Verify:
   - Existing voiceNoteEntityResolutions deleted
   - Action scheduled

### Test 4: Full Pipeline Retry
1. Create artifact with complete pipeline failure
2. Call retryFullPipeline({ artifactId: "..." })
3. Verify:
   - ALL derived data deleted (transcripts, claims, resolutions, drafts)
   - Artifact status reset to 'received'
   - Pipeline starts fresh from beginning
   - retry_initiated event logged with retryType: 'full_pipeline'

### Test 5: Retry History
1. After running multiple retries on same artifact
2. Call getRetryHistory({ artifactId: "..." })
3. Verify:
   - Returns all retry attempts chronologically
   - Shows timestamps, eventType, retryAttempt
   - Includes retry_initiated, retry_succeeded, retry_failed events

### Test 6: Multiple Retry Attempts
1. Retry same artifact multiple times
2. Verify retryAttempt increments: 1, 2, 3, ...
3. Check metadata.retryAttempt in retry_initiated events

---

## Success Criteria (from PHASE_M3.json)

- [ ] voicePipelineRetry.ts created with 5 functions
- [ ] All retry mutations verify isPlatformStaff authorization
- [ ] retry_initiated, retry_succeeded, retry_failed events logged correctly
- [ ] Retry mutations successfully schedule pipeline actions
- [ ] getRetryHistory returns complete retry timeline for artifact
- [ ] retryFullPipeline deletes all derived data (transcripts, claims, resolutions, drafts)
- [ ] Artifact status reset to appropriate stage before action scheduled
- [ ] Each retry increments metadata.retryAttempt counter
- [ ] Codegen passes: npx -w packages/backend convex codegen
- [ ] Type check passes: npm run check-types

---

## Common Pitfalls (from PHASE_M3.json)

❌ Forgetting platform staff authorization check
❌ Not logging retry_initiated event before scheduling
❌ Not resetting artifact status before retry
❌ Not incrementing retryAttempt in event metadata
❌ Not deleting derived data on full pipeline retry (leaves corrupt state)
❌ Using ctx.runAction instead of ctx.scheduler.runAfter (blocks mutation)
❌ Passing artifactId to transcribeAudio (should be noteId)
❌ Not wrapping full pipeline deletes in try/catch (partial cleanup on error)

---

## Ralph Execution Order (from prd.json)

1. Read PHASE_M3.json detailedAcceptanceCriteria (MANDATORY)
2. Create voicePipelineRetry.ts file
3. Implement retryTranscription first
4. CRITICAL: transcribeAudio takes noteId (artifact.voiceNoteId), NOT artifactId
5. Implement retryClaimsExtraction, retryEntityResolution
6. Implement retryFullPipeline (DESTRUCTIVE - wrap deletes in try/catch)
7. Implement getRetryHistory
8. Test each retry type end-to-end via Convex dashboard
9. Run codegen and type check
10. Commit with learnings
11. Update prd.json: US-VNM-006 passes: true

---

## Mandatory Patterns to Apply (from M1 & M2)

1. **Platform Staff Auth:**
   ```typescript
   const user = await authComponent.safeGetAuthUser(ctx);
   if (!user) throw new Error("Not authenticated");
   const dbUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
     model: "user",
     where: [{ field: "_id", value: user._id }]
   });
   if (!dbUser?.isPlatformStaff) throw new Error("Not authorized");
   ```

2. **Better Auth Adapter Queries:**
   - Use `ctx.runQuery(adapter.findOne, ...)` (NOT direct call)
   - where clause is ARRAY: `[{ field: "_id", value: id }]`

3. **Atomic Imports:**
   - Add import + first usage in SAME edit
   - Linter removes unused imports between edits

4. **Convex Query Patterns:**
   - ALWAYS use .withIndex() (NEVER .filter())
   - Use cursor-based pagination for lists

5. **Error Handling:**
   - Log errors but return successfully (UI-called mutations)
   - Don't throw unless critical auth/validation error

---

## Agent Feedback Pending

**Status:** 4,475 lines of feedback in scripts/ralph/agents/output/feedback.md
**Action:** Ralph should review feedback after M3 completion

---

## Next Phase After M3

**Phase M4: Pipeline Alerts**
- Automated anomaly detection
- Health check cron (every 5 minutes)
- Alert management backend
- Reuse platformCostAlerts table
- Dependencies: M1, M2 (M3 not required for M4)

---

**Readiness Status:** 🟢 READY TO START M3
**Confidence:** 🟢 HIGH
**Blockers:** None
**Estimated Completion:** 2-3 days (1-2 iterations for Ralph)
