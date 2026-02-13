## Performance Audit: N+1 Queries, Missing Indexes & Anti-Patterns Across Backend

### Summary

A comprehensive performance audit triggered by Ralph's auto quality check hooks identified **~40 performance anti-patterns** across 15+ backend files. The voice pipeline is the most severely affected, but critical issues also exist in core platform models (members, players, medical profiles, messaging).

This is a follow-up to the original performance crisis (Issue #330) that reduced calls from 3.2M to 800K/month. These newly identified patterns represent the next wave of optimization.

### Severity Breakdown

| Severity | Count | Examples |
|----------|-------|---------|
| **CRITICAL** | 15 | N+1 query loops making O(N) DB calls |
| **HIGH** | 5 | Wrong field names, full table scans, missing indexes |
| **MEDIUM** | 20+ | Unbounded `.collect()`, `.filter()` after index |

### Top 5 Most Impactful Issues

#### 1. `voiceNotes.ts` `getCoachImpactSummary` (Lines 2358-2576)
- **4 unbounded `.collect()` calls** loading entire tables
- **3 N+1 loops** making ~65 unnecessary DB calls per invocation
- Fix: Add date-range composite indexes + batch-fetch pattern

#### 2. `voiceNotes.ts` Better Auth Field Bug (Line 1232)
- Uses `field: "id"` instead of `field: "_id"` — query **always returns null**
- Coach names are **never enriched** in voice note listings
- This is a **functional bug**, not just performance

#### 3. `members.ts` `getMembersByOrganization` (Lines 55-75)
- `ctx.db.get(member.userId)` per member in Promise.all map
- 100-member org = 100 extra queries per page load
- Fix: Batch-fetch all user IDs, Map lookup

#### 4. Voice Pipeline Actions — Entity Resolution (Lines 326-374)
- `lookupAlias` query + `storeAlias` mutation per unique player mention
- 30 mentions in a voice note = up to 60 DB operations
- Fix: Batch lookup all aliases, batch store new ones

#### 5. `coachParentSummaries.ts` Full Table Scan (Line 1894)
- `.query("coachParentSummaries").collect()` with **no index at all**
- Plus 4 separate N+1 patterns at lines 135, 762, 900, 1109
- Fix: Add index, batch-fetch pattern

### Missing Schema Indexes

| Table | Needed Index | Reason |
|-------|-------------|--------|
| `voiceNotes` | `by_orgId_and_insightsStatus` | Eliminates `.filter()` after index (line 508) |
| `voiceNotes` | `by_coachId_insightsStatus_source` | Eliminates full table scan (line 2821) |
| `coachParentSummaries` | `by_orgId_and_createdAt` | Eliminates full table scan (line 1894) |

Additionally, 12+ indexes are defined in the schema but never used in any query — candidates for removal.

### All Affected Files

<details>
<summary>Full file list with line numbers (click to expand)</summary>

**Voice Pipeline Models:**
- `packages/backend/convex/models/voiceNotes.ts` — Lines 508, 1232, 2358-2576, 2821-2834
- `packages/backend/convex/models/voiceNoteInsights.ts` — Lines 296-320, 1301-1304, 1340-1350
- `packages/backend/convex/models/coaches.ts` — Lines 424-431
- `packages/backend/convex/models/voiceNoteEntityResolutions.ts` — Lines 340-377
- `packages/backend/convex/models/coachTrustLevels.ts` — Lines 1042-1045, 1129-1133, 1370-1441

**Voice Pipeline Actions:**
- `packages/backend/convex/actions/claimsExtraction.ts` — Lines 589-606
- `packages/backend/convex/actions/entityResolution.ts` — Lines 326-374
- `packages/backend/convex/actions/voiceNotes.ts` — Lines 201-207, 397-406, 679-714, 824-949, 973-994

**Core Platform Models:**
- `packages/backend/convex/models/members.ts` — Lines 55-75
- `packages/backend/convex/models/players.ts` — Lines 114-119
- `packages/backend/convex/models/coachParentMessages.ts` — Lines 48-56, 315-324
- `packages/backend/convex/models/medicalProfiles.ts` — Lines 118-160
- `packages/backend/convex/models/invitations.ts` — Lines 170-185
- `packages/backend/convex/models/coachParentSummaries.ts` — Lines 135, 762, 900, 1109, 1894
- `packages/backend/convex/models/guardianIdentities.ts` — Lines 1414-1415, 1534-1535

**Schema:**
- `packages/backend/convex/schema.ts` — Missing 3 composite indexes, 12+ unused indexes

</details>

### Recommended Fix Phases

**Phase 1 — Critical Fixes (Highest ROI)**
1. Fix Better Auth `"id"` → `"_id"` bug (voiceNotes.ts:1232) — functional bug
2. Refactor `getCoachImpactSummary` — ~65 DB call reduction
3. Add 3 missing composite indexes to schema
4. Fix `getAutoAppliedInsights` N+1 (voiceNoteInsights.ts)
5. Fix `members.ts` N+1 — affects every org page load

**Phase 2 — Voice Pipeline Actions**
6. Batch entity resolution (entityResolution.ts)
7. Batch claim player resolution (claimsExtraction.ts)
8. Batch auto-apply mutations (actions/voiceNotes.ts)
9. Add API call timeouts

**Phase 3 — Broader Backend**
10. Fix remaining N+1 in players, messages, medical, invitations, summaries
11. Add `.take()` limits to unbounded collects
12. Remove unused indexes
13. Fix `.filter()` in guardianIdentities

### Correct Pattern (Already in Codebase)

`voiceNotes.ts` `getAllVoiceNotes` (lines 142-163) already implements the correct batch-fetch pattern:
```typescript
const uniqueIds = [...new Set(items.map(i => i.relatedId))];
const results = await Promise.all(uniqueIds.map(id => ctx.db.get(id)));
const dataMap = new Map(results.filter(Boolean).map(r => [r._id, r]));
const enriched = items.map(i => ({ ...i, related: dataMap.get(i.relatedId) }));
```

### Related Issues
- #330 — Original performance crisis (3.2M → 800K calls/month)
- #495 — Voice monitoring harness plan
- #250 — Knowledge graph augmentation

### Full Documentation
See `docs/archive/bug-fixes/PERFORMANCE_AUDIT_VOICE_PIPELINE_AND_BACKEND.md` for complete analysis with code snippets, line numbers, and fix details.

### Labels
`performance`, `backend`, `voice-pipeline`, `priority: high`
