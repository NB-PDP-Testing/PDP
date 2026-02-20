# M3 Monitoring Guide for Agents

**Phase:** Voice Monitor Harness M3 - Retry Operations
**Active:** 2026-02-16 to completion
**Target File:** packages/backend/convex/models/voicePipelineRetry.ts

---

## Purpose

This guide helps monitoring agents (code-reviewer, security-reviewer, quality-auditor) know what to watch for during M3 implementation.

---

## M3 Overview

**Goal:** Enable platform staff to manually retry failed pipeline stages

**Functions to Implement:**
1. `retryTranscription` - mutation
2. `retryClaimsExtraction` - mutation
3. `retryEntityResolution` - mutation
4. `retryFullPipeline` - mutation (DESTRUCTIVE)
5. `getRetryHistory` - query

---

## Critical Patterns to Enforce

### 1. Platform Staff Authorization (MANDATORY)

**ALL retry mutations MUST verify isPlatformStaff:**

```typescript
// ✅ CORRECT:
const user = await authComponent.safeGetAuthUser(ctx);
if (!user) throw new Error("Not authenticated");

const dbUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  model: "user",
  where: [{ field: "_id", value: user._id }]
});

if (!dbUser?.isPlatformStaff) {
  throw new Error("Not authorized: platform staff only");
}

// ❌ WRONG: Missing auth check
export const retryTranscription = mutation({
  handler: async (ctx, args) => {
    // No auth check - CRITICAL SECURITY ISSUE!
    await ctx.scheduler.runAfter(...);
  }
});
```

**Agent Action:** Block merge if ANY retry mutation lacks isPlatformStaff check.

---

### 2. Fire-and-Forget Action Scheduling (MANDATORY)

**Use ctx.scheduler.runAfter(0, ...) NOT ctx.runAction:**

```typescript
// ✅ CORRECT:
await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, {
  noteId: artifact.voiceNoteId
});

// ❌ WRONG: Blocks mutation
await ctx.runAction(internal.actions.voiceNotes.transcribeAudio, {
  noteId: artifact.voiceNoteId
});
```

**Why:** ctx.runAction blocks the mutation until action completes (can timeout). Fire-and-forget is non-blocking.

**Agent Action:** Flag any `ctx.runAction` usage in retry mutations as HIGH severity.

---

### 3. transcribeAudio Action Signature (CRITICAL GOTCHA)

**transcribeAudio takes noteId (v1 voiceNotes), NOT artifactId (v2):**

```typescript
// ✅ CORRECT:
const artifact = await ctx.db.get(args.artifactId);
if (!artifact) return { success: false, message: "Artifact not found" };

await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, {
  noteId: artifact.voiceNoteId  // ✅ Correct field!
});

// ❌ WRONG: Will fail
await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, {
  artifactId: args.artifactId  // ❌ Wrong - transcribeAudio doesn't have artifactId arg!
});
```

**Agent Action:** Block merge if transcribeAudio called with artifactId instead of noteId.

---

### 4. Event Logging BEFORE Scheduling (MANDATORY)

**ALWAYS log retry_initiated BEFORE scheduling action:**

```typescript
// ✅ CORRECT ORDER:
// 1. Log retry_initiated FIRST
await ctx.scheduler.runAfter(0, internal.models.voicePipelineEvents.logEvent, {
  eventType: "retry_initiated",
  artifactId: args.artifactId,
  metadata: { retryAttempt, retryType: "transcription" }
});

// 2. Reset status
await ctx.db.patch(args.artifactId, { status: "transcribing" });

// 3. THEN schedule action
await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, {
  noteId: artifact.voiceNoteId
});

// ❌ WRONG ORDER: Scheduling before logging
await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, { noteId });
await ctx.scheduler.runAfter(0, internal.models.voicePipelineEvents.logEvent, { ... });
```

**Agent Action:** Flag if retry action scheduled before retry_initiated event logged.

---

### 5. Retry Attempt Tracking (MANDATORY)

**Must count previous retries and increment retryAttempt:**

```typescript
// ✅ CORRECT:
const previousRetries = await ctx.db
  .query("voicePipelineEvents")
  .withIndex("by_artifactId", q => q.eq("artifactId", args.artifactId))
  .collect();

const retryCount = previousRetries.filter(e => e.eventType === "retry_initiated").length;
const retryAttempt = retryCount + 1;

await ctx.scheduler.runAfter(0, internal.models.voicePipelineEvents.logEvent, {
  eventType: "retry_initiated",
  metadata: { retryAttempt }  // ✅ Include attempt number
});

// ❌ WRONG: Missing retryAttempt
await ctx.scheduler.runAfter(0, internal.models.voicePipelineEvents.logEvent, {
  eventType: "retry_initiated",
  metadata: {}  // ❌ No retryAttempt tracking!
});
```

**Agent Action:** Flag if retry_initiated event missing metadata.retryAttempt.

---

### 6. Status Reset BEFORE Scheduling (MANDATORY)

**Reset artifact status BEFORE scheduling retry action:**

**Status Mapping:**
- retryTranscription → `status: "transcribing"`
- retryClaimsExtraction → `status: "transcribed"`
- retryEntityResolution → (no status change, just delete resolutions)
- retryFullPipeline → `status: "received"`

```typescript
// ✅ CORRECT:
await ctx.db.patch(args.artifactId, { status: "transcribing" });
await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, { noteId });

// ❌ WRONG: Scheduling before status reset
await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, { noteId });
await ctx.db.patch(args.artifactId, { status: "transcribing" });
```

**Agent Action:** Verify status reset happens before action scheduling.

---

### 7. Full Pipeline Retry - Safe Cleanup (CRITICAL)

**retryFullPipeline MUST wrap deletes in try/catch:**

```typescript
// ✅ CORRECT:
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

  // Only if ALL deletes succeed: reset status and schedule
  await ctx.db.patch(args.artifactId, { status: "received" });
  const artifact = await ctx.db.get(args.artifactId);
  await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, {
    noteId: artifact.voiceNoteId
  });

  return { success: true, message: "Full pipeline retry initiated" };
} catch (error) {
  console.error("Full retry cleanup failed:", error);
  return { success: false, message: `Cleanup failed: ${error.message}` };
}

// ❌ WRONG: No try/catch - partial cleanup on error
const transcript = await ctx.db.query(...).first();
if (transcript) await ctx.db.delete(transcript._id);  // Could fail here
const claims = await ctx.db.query(...).collect();     // Would never run if above fails
// Leaves partial state!
```

**Agent Action:** Block merge if retryFullPipeline missing try/catch around deletes.

---

### 8. Delete Entity Resolutions on Retry (retryEntityResolution)

**retryEntityResolution MUST delete existing resolutions:**

```typescript
// ✅ CORRECT:
const resolutions = await ctx.db
  .query("voiceNoteEntityResolutions")
  .withIndex("by_artifactId", q => q.eq("artifactId", args.artifactId))
  .collect();

for (const res of resolutions) {
  await ctx.db.delete(res._id);
}

// Then schedule resolution action
await ctx.scheduler.runAfter(0, internal.actions.entityResolution.resolveEntities, {
  artifactId: args.artifactId
});

// ❌ WRONG: Not deleting old resolutions (leaves stale data)
await ctx.scheduler.runAfter(0, internal.actions.entityResolution.resolveEntities, {
  artifactId: args.artifactId
});
```

**Agent Action:** Verify retryEntityResolution deletes existing resolutions before retry.

---

## Index Usage Verification

**ALL queries MUST use .withIndex():**

```typescript
// ✅ CORRECT:
const events = await ctx.db
  .query("voicePipelineEvents")
  .withIndex("by_artifactId", q => q.eq("artifactId", args.artifactId))
  .collect();

// ❌ WRONG: Using .filter()
const events = await ctx.db
  .query("voicePipelineEvents")
  .filter(q => q.eq(q.field("artifactId"), args.artifactId))
  .collect();
```

**Agent Action:** Block merge if ANY .filter() usage found (performance issue).

---

## Better Auth Pattern Verification

**Better Auth adapter queries:**

```typescript
// ✅ CORRECT:
const dbUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  model: "user",
  where: [{ field: "_id", value: user._id }]  // Array of objects!
});

// ❌ WRONG:
const dbUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  model: "user",
  where: { _id: user._id }  // Object, not array!
});
```

**Agent Action:** Verify Better Auth queries use array where clause.

---

## Function Signature Verification

**Expected Function Signatures (from PHASE_M3.json):**

```typescript
// 1. retryTranscription
export const retryTranscription = mutation({
  args: { artifactId: v.id("voiceNoteArtifacts") },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => { ... }
});

// 2. retryClaimsExtraction
export const retryClaimsExtraction = mutation({
  args: { artifactId: v.id("voiceNoteArtifacts") },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => { ... }
});

// 3. retryEntityResolution
export const retryEntityResolution = mutation({
  args: { artifactId: v.id("voiceNoteArtifacts") },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => { ... }
});

// 4. retryFullPipeline
export const retryFullPipeline = mutation({
  args: { artifactId: v.id("voiceNoteArtifacts") },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => { ... }
});

// 5. getRetryHistory
export const getRetryHistory = query({
  args: { artifactId: v.id("voiceNoteArtifacts") },
  returns: v.array(v.object({
    timestamp: v.number(),
    eventType: v.string(),
    retryAttempt: v.optional(v.number()),
    succeeded: v.optional(v.boolean()),
    errorMessage: v.optional(v.string())
  })),
  handler: async (ctx, args) => { ... }
});
```

**Agent Action:** Verify all functions have correct signatures (args + returns validators).

---

## Code Quality Checklist

### Security Reviewer
- [ ] All retry mutations verify isPlatformStaff
- [ ] No hardcoded test artifacts or IDs
- [ ] Error messages don't expose sensitive info
- [ ] No SQL injection (N/A for Convex, but check string interpolation)

### Code Reviewer
- [ ] All queries use .withIndex() (NO .filter())
- [ ] Fire-and-forget pattern used (ctx.scheduler.runAfter)
- [ ] transcribeAudio called with noteId, NOT artifactId
- [ ] Event logging happens BEFORE action scheduling
- [ ] Status reset happens BEFORE action scheduling
- [ ] retryFullPipeline has try/catch around deletes
- [ ] retryEntityResolution deletes existing resolutions
- [ ] Retry attempt tracking implemented
- [ ] All functions have returns validators

### Quality Auditor
- [ ] Error handling returns user-friendly messages
- [ ] No console.log statements (console.error OK)
- [ ] Atomic imports (import + usage in same edit)
- [ ] TypeScript types are correct (no `any`)
- [ ] Functions are focused and single-responsibility
- [ ] Code follows M1/M2 patterns from lessons learned

---

## Testing Verification

**After implementation, Ralph should:**
1. Test retryTranscription via Convex dashboard
2. Test retryClaimsExtraction
3. Test retryEntityResolution
4. Test retryFullPipeline (verify all derived data deleted)
5. Test getRetryHistory (verify shows all attempts)
6. Verify retryAttempt increments on multiple retries

**Agents should verify:**
- Manual testing documented in progress.txt
- Success criteria from PHASE_M3.json met
- Codegen passes
- Type check passes

---

## Feedback Format

When providing feedback to Ralph, use this format:

```markdown
## M3 Review - voicePipelineRetry.ts

### 🚨 CRITICAL
- [Line X] Missing isPlatformStaff check in retryTranscription
- [Line Y] Using ctx.runAction instead of ctx.scheduler.runAfter

### ⚠️ HIGH
- [Line Z] transcribeAudio called with artifactId instead of noteId

### ✅ PASS
- All queries use .withIndex()
- Event logging before action scheduling
- Retry attempt tracking implemented
```

---

## Reference Files

- **PRD:** scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M3.json
- **Lessons:** scripts/ralph/prds/voice-monitor-harness/context/M1_LESSONS_LEARNED.md
- **Lessons:** scripts/ralph/prds/voice-monitor-harness/context/M2_LESSONS_LEARNED.md
- **Progress:** scripts/ralph/progress.txt (Codebase Patterns section)
- **Readiness:** docs/testing/m3-ralph-readiness-report.md

---

**Agent Reminder:** M3 retry operations are SECURITY-CRITICAL (platform staff only). Block merge on missing auth checks or fire-and-forget violations.
