# M3 Lessons Learned - Retry Operations

**Phase:** M3 - Retry Operations
**Story:** US-VNM-006
**Completion Date:** 2026-02-16
**Duration:** 15 minutes (1 iteration)
**Status:** ✅ COMPLETE & APPROVED

---

## M3 Overview

M3 implemented manual retry capability for failed artifacts with audit logging. Created `voicePipelineRetry.ts` with 5 functions (4 retry mutations + 1 history query) for platform staff to manually re-trigger failed pipeline stages.

**Key Achievement:** Ralph completed M3 in a single iteration (~15 minutes) with all critical patterns correctly implemented, passing both code review (10/10) and security review (9.5/10).

---

## Critical M3 Patterns (All Verified ✅)

### 1. Platform Staff Authorization (MANDATORY)

**Pattern Used:**
```typescript
async function verifyPlatformStaff(ctx: MutationCtx | QueryCtx): Promise<void> {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new Error("Not authenticated");

  const dbUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", value: user._id }],  // ✅ Array where clause
  });

  if (!dbUser?.isPlatformStaff) {
    throw new Error("Not authorized: platform staff only");
  }
}
```

**Used In:** All 5 functions (lines 97, 185, 265, 358, 501)

**Why It Works:**
- Uses Better Auth adapter (not direct DB access)
- Array where clause: `[{ field: "_id", value: user._id }]` ✅
- Checks `isPlatformStaff` database field
- Throws on failure (blocks unauthorized access)

---

### 2. Fire-and-Forget Scheduling (MANDATORY)

**Pattern Used:**
```typescript
// ✅ CORRECT: Fire-and-forget scheduling
await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, {
  noteId: artifact.voiceNoteId
});

// ❌ WRONG: Would block mutation
// await ctx.runAction(internal.actions.voiceNotes.transcribeAudio, {...});
```

**Why It's Critical:**
- Mutations cannot call `ctx.runAction()` directly (Convex restriction)
- Actions may take 30+ seconds (AI calls)
- Fire-and-forget prevents mutation timeout
- Non-blocking for user

**M3 Usage:** 9 fire-and-forget calls across 4 retry mutations ✅

---

### 3. transcribeAudio Signature Gotcha (CRITICAL)

**Pattern Used:**
```typescript
// ✅ CORRECT: transcribeAudio takes noteId (v1), not artifactId (v2)
const artifact = await ctx.db.get(args.artifactId);
if (!artifact?.voiceNoteId) {
  return { success: false, message: "Artifact missing voiceNoteId" };
}

await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, {
  noteId: artifact.voiceNoteId  // ✅ Uses voiceNoteId field from artifact
});

// ❌ WRONG: transcribeAudio doesn't accept artifactId
// await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, {
//   artifactId: args.artifactId  // Wrong! Action signature is (noteId: Id<"voiceNotes">)
// });
```

**Why It's Critical:**
- v1 pipeline used `voiceNotes` table
- v2 pipeline uses `voiceNoteArtifacts` table
- `transcribeAudio` action still takes v1 `noteId`
- `voiceNoteArtifacts.voiceNoteId` field links v2 → v1
- Using wrong ID causes runtime error

**M3 Usage:** Lines 140-153, 451-464 - both verified ✅

---

### 4. Event Logging Order (MANDATORY)

**Pattern Used:**
```typescript
// 1. Count retry attempts
const retryAttempt = (await countPreviousRetries(ctx, args.artifactId)) + 1;

// 2. Log retry_initiated FIRST (before any other operations)
await ctx.scheduler.runAfter(0, internal.models.voicePipelineEvents.logEvent, {
  eventType: "retry_initiated",
  artifactId: args.artifactId,
  voiceNoteId: artifact.voiceNoteId,
  organizationId,
  coachUserId: artifact.senderUserId,
  pipelineStage: "transcription",
  metadata: { retryAttempt },
});

// 3. Reset artifact status
await ctx.db.patch(args.artifactId, { status: "transcribing" });

// 4. THEN schedule action
await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, {
  noteId: artifact.voiceNoteId
});
```

**Why It's Critical:**
- Audit completeness: if action fails, we still have event
- Temporal accuracy: event timestamp reflects when retry was initiated, not when it completed
- Debugging: full timeline includes retry initiation

**ADR Reference:** ADR-VNM-007 (Retry Event Logging Timing)

---

### 5. Full Pipeline Cleanup (CRITICAL)

**Pattern Used:**
```typescript
try {
  // Delete ALL derived data in order (transcripts → claims → resolutions → drafts)
  const transcripts = await ctx.db
    .query("voiceNoteTranscripts")
    .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
    .collect();
  for (const transcript of transcripts) {
    await ctx.db.delete(transcript._id);
  }

  // ... delete claims, resolutions, drafts similarly ...

  // Only if ALL deletes succeed:
  await ctx.db.patch(args.artifactId, { status: "received" });
  await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.transcribeAudio, {
    noteId: artifact.voiceNoteId
  });
} catch (error) {
  console.error("Full pipeline retry cleanup failed:", error);
  return {
    success: false,
    message: "Cleanup failed - aborted to prevent partial state"
  };
}
```

**Why It's Critical:**
- Convex mutations are atomic: if thrown, ALL writes roll back
- Try/catch prevents partial state (some data deleted, some not)
- Status reset ONLY after all deletes succeed
- Action scheduling ONLY after all deletes succeed

**ADR Reference:** ADR-VNM-006 (Full Pipeline Retry Cleanup Strategy)

---

### 6. Retry Attempt Tracking

**Pattern Used:**
```typescript
async function countPreviousRetries(
  ctx: MutationCtx,
  artifactId: string
): Promise<number> {
  const prevRetries = await ctx.db
    .query("voicePipelineEvents")
    .withIndex("by_artifactId", (q) => q.eq("artifactId", artifactId))
    .collect();

  // JavaScript .filter() on already-collected data (NOT Convex query .filter())
  const retryEvents = prevRetries.filter(
    (event) => event.eventType === "retry_initiated"
  );

  return retryEvents.length;
}

// Usage in retry mutations:
const retryAttempt = (await countPreviousRetries(ctx, args.artifactId)) + 1;

await ctx.scheduler.runAfter(0, internal.models.voicePipelineEvents.logEvent, {
  eventType: "retry_initiated",
  metadata: { retryAttempt },  // ✅ Increment tracked
});
```

**Why It's Correct:**
- ✅ Uses `.withIndex()` for database query (efficient)
- ✅ Calls `.collect()` to fetch all events
- ✅ Uses JavaScript `.filter()` on collected array (NOT Convex database filter)
- ❌ Automated scanner flagged as CRITICAL - FALSE POSITIVE

**Important Distinction:**
- ❌ BAD: `ctx.db.query(...).filter(...)` - Convex database filter (scans entire table)
- ✅ GOOD: `array.filter(...)` - JavaScript filter on already-collected data

---

### 7. Index Usage Pattern

**M3 Implementation:**
```typescript
// All queries use .withIndex()
const prevRetries = await ctx.db
  .query("voicePipelineEvents")
  .withIndex("by_artifactId", (q) => q.eq("artifactId", artifactId))
  .collect();

const existingResolutions = await ctx.db
  .query("voiceNoteEntityResolutions")
  .withIndex("by_artifactId", (q) => q.eq("artifactId", args.artifactId))
  .collect();
```

**All M3 Queries:** 100% index usage ✅

---

### 8. Error Handling Pattern

**Pattern Used:**
```typescript
// User-facing errors return objects (don't throw)
if (!artifact) {
  return { success: false, message: "Artifact not found" };
}

if (!artifact.voiceNoteId) {
  return {
    success: false,
    message: "Artifact missing voiceNoteId - cannot retry transcription"
  };
}

// Server-side errors logged with details, user gets generic message
try {
  // ... destructive operations ...
} catch (error) {
  console.error("Full pipeline retry cleanup failed:", error);  // ✅ Detailed logging
  return {
    success: false,
    message: "Cleanup failed - aborted to prevent partial state"  // ✅ Generic user message
  };
}
```

**Security Benefit:** No sensitive data in user-facing errors

---

### 9. Better Auth Patterns (From M2, Verified in M3)

**Pattern Used:**
```typescript
// ✅ CORRECT: Use user._id (NOT user.id)
const dbUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  model: "user",
  where: [{ field: "_id", value: user._id }],  // ✅ _id field
});

// ❌ WRONG:
// where: [{ field: "userId", value: user.id }]  // Wrong! userId is always null
```

**From M2:** This pattern was critical in M2 and continued correctly in M3.

---

### 10. Type Safety with Validators

**M3 Implementation:**
```typescript
export const retryTranscription = mutation({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),  // ✅ Type-safe ID validator
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

**All M3 Functions:** 100% have args and returns validators ✅

---

## M3 Gotchas Encountered

### 1. Automated Scanner False Positive (JavaScript .filter())

**Issue:** quality-monitor agent flagged `.filter()` usage as CRITICAL/BLOCK
**Location:** Lines 64, 510
**Reality:** False positive - code uses JavaScript `.filter()` on collected arrays, NOT Convex query `.filter()`

**Pattern:**
```typescript
// ✅ CORRECT (flagged incorrectly by scanner)
const events = await ctx.db.query(...).withIndex(...).collect();  // Database query
const filtered = events.filter(...);  // JavaScript array filter
```

**Resolution:** Manual review confirmed correct - scanner cannot distinguish JavaScript vs Convex .filter()

---

### 2. Security Scanner False Positive (Auth Detection)

**Issue:** security-tester flagged voicePipelineRetry.ts as "mutations without authorization checks"
**Reality:** All 5 functions have `verifyPlatformStaff(ctx)` at line 1 of handler

**Resolution:** Scanner outdated or doesn't recognize the auth helper pattern

---

## M3 Review Results

### Code Review: ✅ APPROVE (10/10)

**Verified:**
- ✅ Platform staff auth: 5/5 functions
- ✅ Fire-and-forget: 9/9 calls
- ✅ transcribeAudio signature: correct (uses noteId)
- ✅ Event logging order: correct
- ✅ Full pipeline try/catch: present
- ✅ Index usage: all .withIndex()
- ✅ Retry attempt tracking: implemented

**Issues:**
- 🟡 1 MEDIUM: console.error on line 437 (acceptable for error logging)
- ❌ 2 FALSE POSITIVES from automated scanners (see above)

---

### Security Review: ✅ SECURE (9.5/10)

**Verified:**
- ✅ Authorization: All functions verify isPlatformStaff
- ✅ Input validation: Type-safe validators, existence checks
- ✅ Error handling: Generic user messages, detailed server logs
- ✅ Audit logging: All retries logged with full context
- ✅ Data integrity: Try/catch prevents partial state
- ✅ No sensitive data in errors

**Future Enhancements (Low Priority):**
- Rate limiting for retry operations (max 10 retries/hour/artifact)
- Circuit breaker for repeated failures

---

## M3 Performance

**Estimated:** 2-3 days
**Actual:** 15 minutes (1 iteration)
**Speedup:** ~200x faster than estimate

**Why So Fast:**
- M1/M2 lessons learned documented and read by Ralph
- Architecture ADRs generated before implementation (pre-phase review)
- Critical patterns documented with code examples
- No ambiguity in requirements (PHASE_M3.json detailed)
- All gotchas pre-documented (transcribeAudio signature, auth pattern, etc.)

---

## Key Takeaways for M4

### 1. Pre-Phase Architecture Review Works

**Process:**
1. Run `/architect-review` before Ralph starts
2. Generate ADRs for critical decisions
3. Document gotchas and critical patterns
4. Ralph reads ADRs before implementation

**M3 Result:** All 3 ADRs followed correctly, no rework needed

---

### 2. Automated Scanners Have Limitations

**Known False Positives:**
- JavaScript `.filter()` vs Convex `.filter()` (scanner can't distinguish)
- Custom auth helper patterns (scanner doesn't recognize)

**Solution:** Trust manual reviews over automated scanners for final approval

---

### 3. Lessons Learned Files Are Critical

**M3 Success Factors:**
- M1_LESSONS_LEARNED.md read by Ralph ✅
- M2_LESSONS_LEARNED.md read by Ralph ✅
- All critical patterns documented with code examples ✅
- Gotchas pre-flagged (transcribeAudio signature) ✅

**Result:** Zero pattern violations, zero rework

---

### 4. Fire-and-Forget Pattern Is Standard

**M3 Usage:** 9 fire-and-forget calls across all retry mutations
**Pattern:** `ctx.scheduler.runAfter(0, internal.models.X, {...})`
**Why:** Mutations can't call actions directly, prevents timeout

**M4 Implication:** Same pattern will apply for alert emission

---

## M4 Preparation Checklist

Based on M3 learnings, M4 should:

- [ ] Read M1, M2, M3 lessons learned before starting
- [ ] Run architecture review for M4 (if major decisions needed)
- [ ] Document M4 critical patterns with code examples
- [ ] Use fire-and-forget for event emissions in health checks
- [ ] Use platform staff auth pattern (same as M3)
- [ ] Use Better Auth adapter with array where clause
- [ ] Handle divide-by-zero in failure rate calculations
- [ ] Implement alert deduplication (15-minute window)
- [ ] Use .withIndex() for all queries
- [ ] Include returns validators on all functions

---

## M3 Critical Files Reference

**Created:**
- `packages/backend/convex/models/voicePipelineRetry.ts` (532 lines)

**ADRs Generated:**
- `docs/architecture/decisions/ADR-VNM-005-retry-mutation-scheduling-pattern.md`
- `docs/architecture/decisions/ADR-VNM-006-full-pipeline-retry-cleanup-strategy.md`
- `docs/architecture/decisions/ADR-VNM-007-retry-event-logging-timing.md`

**Functions Implemented:**
1. `retryTranscription` - Retry failed transcription
2. `retryClaimsExtraction` - Retry failed claims extraction
3. `retryEntityResolution` - Retry failed entity resolution (deletes existing first)
4. `retryFullPipeline` - DESTRUCTIVE full retry (deletes all derived data)
5. `getRetryHistory` - Query retry event history for artifact

**Helper Functions:**
- `verifyPlatformStaff()` - Authorization check
- `countPreviousRetries()` - Retry attempt tracking

---

## End of M3 Lessons Learned

**Status:** ✅ M3 COMPLETE - Ready for M4
**Next Phase:** M4 - Pipeline Alerts (Automated health checks, anomaly detection)
**Ralph Status:** Stopped after M3 completion
**Agents Status:** 6/6 running, ready for M4
