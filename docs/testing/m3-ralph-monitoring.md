# M3 Ralph Monitoring - Real-Time Status

**Date:** 2026-02-16 21:20
**Phase:** Voice Monitor Harness - M3 (Retry Operations)
**Status:** 🟡 STARTING UP

---

## Current Status

### ✅ Ralph is Running
- **Process:** ralph.sh active (PID 75875)
- **Started:** ~21:08 GMT (12 minutes ago)
- **Duration:** ~12 minutes
- **Iteration:** Not yet started (reading context)

### ✅ Agents Running (6/6)
1. ✅ code-review-gate (PID 75477)
2. ✅ documenter (PID 75366)
3. ✅ prd-auditor (PID 75342)
4. ✅ quality-monitor (PID 75295, 76044)
5. ✅ security-tester (PID 75423)
6. ✅ test-runner (PID 75399)

### 🟡 US-VNM-006: Build Retry Operations Backend
**Status:** NOT STARTED (passes: false)
**File Expected:** packages/backend/convex/models/voicePipelineRetry.ts
**File Status:** Does not exist yet

---

## M3 Setup Complete ✅

### Context Files Ready
- ✅ M1_LESSONS_LEARNED.md
- ✅ M2_LESSONS_LEARNED.md
- ✅ PHASE_M3.json
- ✅ prd.json (configured for M3)
- ✅ progress.txt (Codebase Patterns + M3 setup)
- ✅ m3-monitoring-guide.md

### Architecture Review Complete ✅
- ✅ 3 ADRs generated
- ✅ Implementation guidance written to feedback.md
- ✅ 4 critical findings documented
- ✅ Pre-implementation checklist ready

### Git Status
- **Branch:** ralph/voice-monitor-harness ✅
- **Modified:** 16 tracked files (configuration updates)
- **Untracked:** 51 new files (docs, ADRs, guides)
- **No conflicts**

---

## What Ralph Should Do Next

### Iteration 1 - Expected Actions

1. **Read Context Files** (5-10 minutes)
   - PHASE_M3.json (full implementation details)
   - M1_LESSONS_LEARNED.md (M1 patterns)
   - M2_LESSONS_LEARNED.md (M2 patterns)
   - m3-monitoring-guide.md (M3 gotchas)
   - ADR-VNM-005, ADR-VNM-006, ADR-VNM-007

2. **Create voicePipelineRetry.ts** (30-45 minutes)
   - 5 function signatures
   - Platform staff auth pattern
   - Fire-and-forget scheduling
   - Retry attempt tracking
   - Event logging
   - Status reset logic

3. **Test Functions** (15-20 minutes)
   - Run codegen
   - Type check
   - Manual test via Convex dashboard (optional)

4. **Commit** (5 minutes)
   - Message: "feat: US-VNM-006 - Build Retry Operations Backend"
   - Update prd.json: passes: true
   - Append learnings to progress.txt

**Total Estimated:** 55-80 minutes (1 iteration)

---

## Expected Timeline

**Based on M2 Performance:**
- M2 estimated: 3-4 days
- M2 actual: 15 minutes (1 iteration)
- M2 speedup: ~200x faster

**M3 Estimate:**
- PRD estimate: 2-3 days
- Likely actual: 60-90 minutes (1-2 iterations)
- Ralph has all context and patterns ready

---

## M3 Critical Patterns (Ralph Must Follow)

### 1. Platform Staff Authorization (MANDATORY)
```typescript
const user = await authComponent.safeGetAuthUser(ctx);
if (!user) throw new Error("Not authenticated");
const dbUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  model: "user",
  where: [{ field: "_id", value: user._id }]
});
if (!dbUser?.isPlatformStaff) throw new Error("Not authorized");
```

### 2. Fire-and-Forget Scheduling (MANDATORY)
```typescript
// ✅ CORRECT:
await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, {
  noteId: artifact.voiceNoteId
});

// ❌ WRONG:
await ctx.runAction(internal.actions.voiceNotes.transcribeAudio, { ... });
```

### 3. transcribeAudio Gotcha (CRITICAL)
```typescript
// ✅ CORRECT:
const artifact = await ctx.db.get(args.artifactId);
if (!artifact?.voiceNoteId) {
  return { success: false, message: "Artifact has no linked voice note" };
}
await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, {
  noteId: artifact.voiceNoteId  // noteId, NOT artifactId!
});

// ❌ WRONG:
await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, {
  artifactId: args.artifactId  // Wrong! transcribeAudio doesn't accept artifactId
});
```

### 4. Event Logging BEFORE Scheduling (MANDATORY)
```typescript
// 1. Log retry_initiated FIRST
await ctx.scheduler.runAfter(0, internal.models.voicePipelineEvents.logEvent, { ... });

// 2. Reset status
await ctx.db.patch(args.artifactId, { status: "transcribing" });

// 3. THEN schedule action
await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, { noteId });
```

### 5. Full Pipeline Cleanup (CRITICAL)
```typescript
try {
  // Delete ALL derived data in order
  // transcripts → claims → resolutions → drafts
  // ...

  // Only if ALL succeed:
  await ctx.db.patch(args.artifactId, { status: "received" });
  await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, { noteId });
} catch (error) {
  console.error("Full retry cleanup failed:", error);
  return { success: false, message: `Cleanup failed: ${error.message}` };
}
```

---

## Monitoring Commands

### Check Ralph Progress
```bash
# Recent commits
git log --oneline -5

# Progress log
tail -100 scripts/ralph/progress.txt

# PRD status
cat scripts/ralph/prd.json | jq -r '.userStories[] | "\(.id): \(.passes)"'

# File created?
ls -la packages/backend/convex/models/voicePipelineRetry.ts

# Ralph running?
ps aux | grep ralph.sh | grep -v grep
```

### Check Agent Feedback
```bash
# Latest feedback
tail -100 scripts/ralph/agents/output/feedback.md

# Agent PIDs
ls -la scripts/ralph/agents/output/*.pid
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

## Success Indicators

### File Created
- [ ] packages/backend/convex/models/voicePipelineRetry.ts exists
- [ ] File size ~500-800 lines (5 functions + helpers)

### Functions Implemented
- [ ] retryTranscription mutation
- [ ] retryClaimsExtraction mutation
- [ ] retryEntityResolution mutation
- [ ] retryFullPipeline mutation
- [ ] getRetryHistory query

### Quality Checks
- [ ] Platform staff auth in ALL retry mutations
- [ ] Fire-and-forget scheduling (ctx.scheduler.runAfter)
- [ ] transcribeAudio called with noteId (not artifactId)
- [ ] Event logging BEFORE scheduling
- [ ] Full pipeline cleanup wrapped in try/catch
- [ ] Retry attempt tracking implemented
- [ ] Codegen passes
- [ ] Type check passes

### Commit
- [ ] Commit message: "feat: US-VNM-006 - Build Retry Operations Backend"
- [ ] prd.json updated: passes: true
- [ ] progress.txt updated with learnings

---

## Agent Monitoring

### What Agents Should Flag

**Security Reviewer:**
- Missing isPlatformStaff check
- Error messages exposing sensitive info

**Code Reviewer:**
- Using ctx.runAction instead of ctx.scheduler.runAfter
- Using artifactId instead of noteId for transcribeAudio
- Event logging AFTER scheduling (wrong order)
- Missing try/catch on full pipeline cleanup
- Any .filter() usage (should be JavaScript filter, not Convex)

**Quality Auditor:**
- console.log statements
- Missing error handling
- TypeScript any types
- Duplicate code

---

## Current Waiting State

**Ralph is likely:**
- Reading PHASE_M3.json (detailed requirements)
- Reading M1/M2 lessons learned
- Reading architecture ADRs
- Planning implementation approach

**Next Expected Action:**
- Create voicePipelineRetry.ts file
- Start implementing retryTranscription first

**Check Again In:** 5-10 minutes

---

**Monitoring Status:** 🟢 ACTIVE
**Ralph Status:** 🟡 READING CONTEXT
**M3 Progress:** 0% (not yet started)
**Agents Status:** 🟢 ALL RUNNING
**Estimated Completion:** 60-90 minutes from now
