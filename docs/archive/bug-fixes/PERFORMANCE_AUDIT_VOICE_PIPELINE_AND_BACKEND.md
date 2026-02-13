# Performance Audit: Voice Pipeline & Backend — N+1 Queries, Missing Indexes, Anti-Patterns

**Date:** February 13, 2026
**Triggered by:** Ralph auto quality check hooks (feedback.md)
**Scope:** Full backend audit — voice pipeline + all models
**Branch:** `claude/verify-plan-fixes-DDIMv`

---

## Executive Summary

A comprehensive performance audit of the backend codebase identified **~40 performance anti-patterns** across 15+ files. The voice pipeline is the most severely affected subsystem, but critical issues also exist in core platform models (members, players, medical profiles, coach-parent messaging).

### Impact Classification

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 15 | N+1 queries causing O(N) DB calls where O(1) is possible |
| **HIGH** | 5 | Wrong field names, missing indexes causing full table scans |
| **MEDIUM** | 20+ | Unbounded `.collect()`, `.filter()` after index, missing composite indexes |

### Estimated Impact
- **Current excess DB calls per typical operation:** 70-200+ unnecessary calls in hot paths
- **`getCoachImpactSummary` alone:** ~65 unnecessary DB calls per invocation
- **Entity resolution pipeline:** 30-60 unnecessary calls per voice note processed
- **Members page load:** 100+ unnecessary calls for a 100-member org

---

## CRITICAL Findings

### 1. `voiceNotes.ts` — `getCoachImpactSummary` (Lines 2358-2576)

**The worst offender in the codebase.** This single function has 4 unbounded collects and 3 N+1 loops.

#### 1a. Four Unbounded `.collect()` Calls (Lines 2358-2427)
```typescript
// Lines 2358-2361 — collects ALL voice notes for org
const allVoiceNotes = await ctx.db
  .query("voiceNotes")
  .withIndex("by_orgId", q => q.eq("organizationId", args.organizationId))
  .collect();

// Lines 2370-2373 — collects ALL insights for org
const allInsights = await ctx.db
  .query("voiceNoteInsights")
  .withIndex("by_orgId", q => q.eq("organizationId", args.organizationId))
  .collect();

// Lines 2380-2383 — collects ALL coach-parent summaries
const allSummaries = await ctx.db
  .query("coachParentSummaries")
  .withIndex("by_orgId", q => q.eq("organizationId", args.organizationId))
  .collect();

// Lines 2392-2395 — collects ALL auto-applied insights
const allAutoApplied = await ctx.db
  .query("autoAppliedInsights")
  .withIndex("by_orgId", q => q.eq("organizationId", args.organizationId))
  .collect();
```

**Fix:** Add date-range filtering via composite indexes (e.g., `by_orgId_and_createdAt`), or use `.take(limit)` with pagination.

#### 1b. N+1: Skill Changes (Lines 2437-2473)
```typescript
// Loops over insights, making 2 DB calls per insight
for (const insight of recentInsights) {
  const voiceNote = await ctx.db.get(insight.voiceNoteId);  // N calls
  const player = await ctx.db.get(insight.playerId);         // N calls
  // ...
}
```
**Estimated:** 40 DB calls for 20 insights.

**Fix:** Batch-fetch all `voiceNoteId`s and `playerId`s into Maps before the loop.

#### 1c. N+1: Recent Summaries (Lines 2509-2528)
```typescript
for (const summary of recentSummaries.slice(0, 5)) {
  const parent = await ctx.db.get(summary.parentId);  // 5 calls
  const player = await ctx.db.get(summary.playerId);   // 5 calls
}
```
**Fix:** Batch-fetch parent and player IDs.

#### 1d. N+1: Parent Engagement (Lines 2543-2576)
```typescript
for (const summary of parentSummaries) {
  const messageCount = await ctx.db
    .query("coachParentMessages")
    .withIndex(...)
    .collect();  // Query per parent
}
```
**Fix:** Single query for all messages, group by parentId in memory.

---

### 2. `voiceNotes.ts` — Better Auth Field Bug (Line 1232)

```typescript
// ❌ BUG: "id" field does not exist — should be "_id"
const user = await adapter.findOne({
  model: "user",
  where: [{ field: "id", value: coachUserId }]  // Always returns null!
});
```

**Impact:** Coach names are NEVER enriched in voice note listings. This is a functional bug, not just performance.

**Fix:** Change `"id"` to `"_id"`.

---

### 3. `voiceNoteInsights.ts` — `getAutoAppliedInsights` (Lines 296-320)

```typescript
// N+1: Query per insight to get auto-applied record
const enriched = await Promise.all(
  insights.map(async (insight) => {
    const autoApplied = await ctx.db
      .query("autoAppliedInsights")
      .withIndex("by_insightId", q => q.eq("insightId", insight._id))
      .first();  // 1 query per insight
    return { ...insight, autoApplied };
  })
);
```

**Fix:** Batch-fetch all auto-applied records for the insight IDs, create Map for O(1) lookup.

---

### 4. `voiceNoteInsights.ts` — `getUndoReasonStats` (Lines 1340-1350)

```typescript
// N+1: ctx.db.get per audit record
for (const audit of topAudits) {
  const insight = await ctx.db.get(audit.insightId);  // 10 calls
}
```

**Fix:** Batch-fetch all `insightId`s from `topAudits`.

---

### 5. `coaches.ts` — `getFellowCoachesForTeams` (Lines 424-431)

```typescript
// N+1: User query per coach in for-loop
for (const assignment of assignments) {
  const user = await ctx.runQuery(
    internal.models.users.getUserByStringId,
    { id: assignment.userId }
  );  // 1 query per coach
}
```

**Fix:** Collect all unique `userId`s, batch-fetch, use Map. Note: `getCoachesForTeam` (lines 481-504) already does this correctly — use it as a template.

---

### 6. `claimsExtraction.ts` — Claim Player Resolution (Lines 589-606)

```typescript
// N+1: resolveClaimPlayer() called per claim, each does fuzzy query
for (const claim of extractedClaims) {
  const resolved = await resolveClaimPlayer(ctx, claim, players);
  // Each call triggers ctx.runQuery for fuzzy matching
}
```

**Fix:** Batch player name resolution — collect all unique player names, resolve once, cache results.

---

### 7. `entityResolution.ts` — Alias Lookup + Store (Lines 326-374)

```typescript
// N+1: lookupAlias query + storeAlias mutation per unique player mention
for (const mention of uniqueMentions) {
  const alias = await ctx.runQuery(lookupAlias, { name: mention });  // N queries
  if (!alias) {
    await ctx.runMutation(storeAlias, { name: mention, ... });        // N mutations
  }
}
```
**Estimated:** 30 mentions = up to 60 DB operations.

**Fix:** Batch lookup all aliases first, then batch store new ones.

---

### 8. `voiceNotes.ts` (actions) — Auto-Apply Insights (Lines 824-949)

```typescript
// N+1: Mutation called per insight in loop
for (const insight of insights) {
  await ctx.runMutation(internal.models.voiceNoteInsights.autoApplyInsight, {
    insightId: insight._id,
    ...
  });  // 1 mutation per insight
}
```

**Fix:** Create a batch `autoApplyInsights` mutation that processes multiple insights in a single call.

---

### 9. `voiceNoteEntityResolutions.ts` — `resolveEntity` (Lines 340-377)

```typescript
// N+1: ctx.db.get(r.claimId) per resolution in for-loop
for (const resolution of resolutions) {
  const claim = await ctx.db.get(resolution.claimId);  // N calls
}
```

**Fix:** Batch-fetch all `claimId`s.

---

### 10. `coachTrustLevels.ts` — `getPlatformAIAccuracy` (Lines 1370-1441)

```typescript
// N+1: 2 queries per coach (user lookup + org lookup)
await Promise.all(coaches.map(async (coach) => {
  const user = await ctx.db.get(coach.userId);     // N calls
  const org = await ctx.db.get(coach.orgId);        // N calls
}));
```

**Fix:** Batch-fetch all user IDs and org IDs.

---

### 11. `coachParentSummaries.ts` — Full Table Scan (Line 1894)

```typescript
// CRITICAL: No index at all — full table scan
const all = await ctx.db
  .query("coachParentSummaries")
  .collect();  // Scans ENTIRE table
```

**Fix:** Add and use an appropriate index.

---

## HIGH Findings

### 12. `voiceNotes.ts` — `.filter()` After Index (Lines 508-513)

```typescript
const notes = await ctx.db
  .query("voiceNotes")
  .withIndex("by_orgId", q => q.eq("organizationId", orgId))
  .filter(q => q.eq(q.field("insightsStatus"), "completed"))  // Post-query filter!
  .collect();
```

**Fix:** Create composite index `by_orgId_and_insightsStatus` and use `.withIndex()` for both fields.

---

### 13. `voiceNotes.ts` — Full Table Scan with Multi-Field Filter (Lines 2821-2834)

```typescript
const notes = await ctx.db
  .query("voiceNotes")
  .filter(q => q.and(
    q.eq(q.field("coachId"), coachId),
    q.eq(q.field("insightsStatus"), "completed"),
    q.eq(q.field("source"), "live")
  ))
  .collect();  // Full table scan!
```

**Fix:** Create composite index `by_coachId_insightsStatus_source`.

---

### 14. `coachTrustLevels.ts` — `.filter()` After Index (Lines 1129-1133)

```typescript
.withIndex("by_coachId")
.filter(q => q.gte(q.field("_creationTime"), cutoff))  // Date filter post-index
```

**Fix:** Use composite index with `_creationTime` or filter in application code after indexed fetch.

---

### 15. `guardianIdentities.ts` — `.filter()` Anti-Patterns (Lines 1414-1415, 1534-1535)

```typescript
// Two instances of .filter() without index
.filter(q => q.eq(q.field("organizationId"), orgId))
```

**Fix:** Use `.withIndex("by_orgId")`.

---

## MEDIUM Findings — Broader Backend

### 16. `players.ts` — N+1 in `getPlayersByTeam` (Lines 114-119)
- `ctx.db.get(identity.enrollmentId)` per player identity
- Fix: Batch-fetch enrollment IDs

### 17. `coachParentMessages.ts` — N+1 (Lines 48-56, 315-324)
- User lookup per message for sender enrichment
- Fix: Batch-fetch unique sender IDs

### 18. `members.ts` — N+1 in `getMembersByOrganization` (Lines 55-75)
- `ctx.db.get(member.userId)` per member
- For 100-member org = 100 extra queries
- Fix: Batch-fetch all user IDs

### 19. `medicalProfiles.ts` — N+1 in `getAllForOrganization` (Lines 118-160)
- 4 queries per enrollment (medical profile, injuries, emergency contacts, allergies)
- Fix: Batch-fetch by org, then join in memory

### 20. `invitations.ts` — N+1 (Lines 170-185)
- User lookup per invitation/request
- Fix: Batch-fetch inviter user IDs

### 21. `coachParentSummaries.ts` — Multiple N+1 Patterns (Lines 135, 762, 900, 1109)
- 4 separate locations with Promise.all + per-item queries
- Fix: Batch-fetch pattern in each

### 22. Unbounded `.collect()` — 18+ Instances
Files affected: `voiceNotes.ts`, `voiceNoteInsights.ts`, `coachTrustLevels.ts`, `coachParentSummaries.ts`, and others.
- Fix: Add `.take(limit)` or pagination where appropriate

---

## Missing Schema Indexes

### Must Add
| Table | Index Name | Fields | Reason |
|-------|-----------|--------|--------|
| `voiceNotes` | `by_orgId_and_insightsStatus` | `organizationId`, `insightsStatus` | Eliminates `.filter()` at line 508 |
| `voiceNotes` | `by_coachId_insightsStatus_source` | `coachId`, `insightsStatus`, `source` | Eliminates full table scan at line 2821 |
| `coachParentSummaries` | `by_orgId_and_createdAt` | `organizationId`, `_creationTime` | Eliminates full table scan at line 1894 |

### Unused Indexes (Candidates for Removal)
12+ indexes are defined in the schema but never referenced in any query. These should be audited and removed to reduce schema bloat. A full list should be generated by grepping each index definition against actual `.withIndex()` usage.

---

## Additional Action Items

### Missing Timeout/Retry on External API Calls
- `actions/voiceNotes.ts` lines 201-207: No timeout on audio fetch + OpenAI API call
- Fix: Add `AbortController` with timeout (e.g., 30s for audio, 60s for transcription)

### Uncached Fuzzy Matches
- `actions/voiceNotes.ts` lines 679-714: Same player name gets fuzzy-matched multiple times across claims
- Fix: Cache fuzzy match results in a local Map during processing

### Sequential Scheduler Calls
- `actions/voiceNotes.ts` lines 973-994: Sequential `await` on `scheduler.runAfter()`
- Fix: Use `Promise.all()` for independent scheduler calls

### Hard-coded Limit
- `actions/voiceNotes.ts` line 397-406: Hard-coded 1000 team limit without pagination
- Fix: Add pagination or dynamic limit

---

## Recommended Fix Priority

### Phase 1 — Critical Fixes (Highest Impact)
1. **Fix Better Auth field bug** (`voiceNotes.ts` line 1232) — functional bug, coach names never display
2. **Refactor `getCoachImpactSummary`** — eliminate 4 unbounded collects + 3 N+1 loops (~65 DB call reduction)
3. **Add missing composite indexes** — `by_orgId_and_insightsStatus`, `by_coachId_insightsStatus_source`
4. **Fix `getAutoAppliedInsights` N+1** in `voiceNoteInsights.ts`
5. **Fix `members.ts` N+1** — affects every org page load

### Phase 2 — Voice Pipeline Actions
6. **Batch entity resolution** in `entityResolution.ts`
7. **Batch claim player resolution** in `claimsExtraction.ts`
8. **Batch auto-apply mutations** in `actions/voiceNotes.ts`
9. **Add API call timeouts** in `actions/voiceNotes.ts`

### Phase 3 — Broader Backend Cleanup
10. Fix remaining N+1 patterns in `players.ts`, `coachParentMessages.ts`, `medicalProfiles.ts`, `invitations.ts`, `coachParentSummaries.ts`
11. Add `.take()` limits to unbounded collects
12. Remove unused indexes from schema
13. Fix `.filter()` patterns in `guardianIdentities.ts`

---

## Correct Pattern Reference

The codebase already has good examples of the batch-fetch pattern:

**`voiceNotes.ts` — `getAllVoiceNotes` (lines 142-163):**
```typescript
// 1. Collect unique IDs
const uniqueCoachIds = [...new Set(notes.map(n => n.coachId))];

// 2. Batch fetch
const coaches = await Promise.all(uniqueCoachIds.map(id => ctx.db.get(id)));

// 3. Create Map
const coachMap = new Map();
for (const coach of coaches) {
  if (coach) coachMap.set(coach._id, coach);
}

// 4. Synchronous enrichment (no await)
return notes.map(note => ({
  ...note,
  coachName: coachMap.get(note.coachId)?.name
}));
```

**`coaches.ts` — `getCoachesForTeam` (lines 481-504):** Also correctly batched.

All fixes should follow this same pattern.

---

## Related Issues
- **Issue #330** — Original performance crisis (3.2M → 800K calls/month)
- **Issue #495** — Voice monitoring harness plan
- **Issue #250** — Knowledge graph augmentation (future optimization layer)

---

## Appendix: Files Requiring Changes

| File | Line(s) | Issue | Severity |
|------|---------|-------|----------|
| `packages/backend/convex/models/voiceNotes.ts` | 1232 | Better Auth `"id"` → `"_id"` bug | CRITICAL (functional) |
| `packages/backend/convex/models/voiceNotes.ts` | 2358-2576 | 4 unbounded collects + 3 N+1 loops | CRITICAL |
| `packages/backend/convex/models/voiceNotes.ts` | 508-513 | `.filter()` after index | HIGH |
| `packages/backend/convex/models/voiceNotes.ts` | 2821-2834 | Full table scan + multi-field filter | HIGH |
| `packages/backend/convex/models/voiceNoteInsights.ts` | 296-320 | N+1 in `getAutoAppliedInsights` | CRITICAL |
| `packages/backend/convex/models/voiceNoteInsights.ts` | 1340-1350 | N+1 in `getUndoReasonStats` | HIGH |
| `packages/backend/convex/models/coaches.ts` | 424-431 | N+1 in `getFellowCoachesForTeams` | CRITICAL |
| `packages/backend/convex/models/voiceNoteEntityResolutions.ts` | 340-377 | N+1 in `resolveEntity` | MODERATE |
| `packages/backend/convex/models/coachTrustLevels.ts` | 1129-1133, 1370-1441 | `.filter()` + N+1 | HIGH |
| `packages/backend/convex/models/coachParentSummaries.ts` | 1894 | Full table scan | CRITICAL |
| `packages/backend/convex/models/coachParentSummaries.ts` | 135, 762, 900, 1109 | 4x N+1 patterns | CRITICAL |
| `packages/backend/convex/models/members.ts` | 55-75 | N+1 per member | CRITICAL |
| `packages/backend/convex/models/players.ts` | 114-119 | N+1 per player identity | MEDIUM |
| `packages/backend/convex/models/coachParentMessages.ts` | 48-56, 315-324 | N+1 per message | MEDIUM |
| `packages/backend/convex/models/medicalProfiles.ts` | 118-160 | 4 queries per enrollment | MEDIUM |
| `packages/backend/convex/models/invitations.ts` | 170-185 | N+1 per invitation | MEDIUM |
| `packages/backend/convex/models/guardianIdentities.ts` | 1414-1415, 1534-1535 | `.filter()` without index | MEDIUM |
| `packages/backend/convex/actions/claimsExtraction.ts` | 589-606 | N+1 claim resolution | CRITICAL |
| `packages/backend/convex/actions/entityResolution.ts` | 326-374 | N+1 alias lookup + store | CRITICAL |
| `packages/backend/convex/actions/voiceNotes.ts` | 824-949 | N+1 auto-apply mutations | HIGH |
| `packages/backend/convex/actions/voiceNotes.ts` | 201-207 | Missing API timeouts | MEDIUM |
| `packages/backend/convex/schema.ts` | Various | 2 missing indexes, 12+ unused indexes | HIGH |
