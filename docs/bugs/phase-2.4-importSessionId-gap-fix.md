# Bug Fix: Missing importSessionId on Import Tables

**Date:** 2026-02-13
**Severity:** BLOCKER for Phase 2.4 (Granular Undo)
**Status:** ✅ COMPLETE

## Problem

The `batchImportPlayersWithIdentity` mutation in `playerImport.ts` only sets `importSessionId` on 2 of 6 tables:

- ✅ `playerIdentities` (line 675) — **ALREADY SET**
- ✅ `orgPlayerEnrollments` (line 1036) — **ALREADY SET**
- ❌ `guardianIdentities` (lines 416, 801, 940) — **MISSING**
- ❌ `guardianPlayerLinks` (lines 460, 846, 978) — **MISSING**
- ❌ `sportPassports` (line 1057) — **MISSING**
- ❌ `skillAssessments` (lib/import/benchmarkApplicator.ts:166) — **MISSING**

## Impact

Phase 2.4's `undoImport` mutation cannot delete guardians, links, passports, or assessments because it queries by `importSessionId`. Without this field, these records will be **orphaned** after undo.

## Fix Summary

### Step 1: Add importSessionId to guardianIdentities inserts ✅
- Line 416 (single player import) ✅ **DONE**
- Line 801 (adult-youth matching) ✅ **DONE**
- Line 940 (adult-youth matching fallback) ✅ **DONE**

### Step 2: Add importSessionId to guardianPlayerLinks inserts ✅
- Line 460 (single player import) ✅ **DONE**
- Line 846 (adult-youth matching) ✅ **DONE**
- Line 978 (adult-youth matching fallback) ✅ **DONE**

### Step 3: Add importSessionId to sportPassports insert ✅
- Line 1057 ✅ **DONE**

### Step 4: Add importSessionId to skillAssessments (benchmarks) ✅
- Updated `BenchmarkSettings` type to include optional `importSessionId` field
- Updated `benchmarkApplicator.ts` line 166 to set `importSessionId` on skillAssessments inserts
- Updated `playerImport.ts` line 1118 caller to pass `importSessionId: args.sessionId`

### Step 5: Verification ✅
- ✅ Convex codegen: PASSED
- ✅ Type checks: PASSED (only 2 pre-existing template errors remain)

## Files Modified

1. `packages/backend/convex/models/playerImport.ts`
   - Added `importSessionId: args.sessionId` to 3 guardianIdentities inserts
   - Added `importSessionId: args.sessionId` to 3 guardianPlayerLinks inserts
   - Added `importSessionId: args.sessionId` to 1 sportPassports insert
   - Updated applyBenchmarksToPassport caller to pass importSessionId

2. `packages/backend/convex/lib/import/benchmarkApplicator.ts`
   - Added `importSessionId?: Id<"importSessions">` to BenchmarkSettings type
   - Added `importSessionId: settings.importSessionId` to skillAssessments insert

## Testing Required (Post-Fix)

Before Ralph starts Phase 2.4:
1. Run a test import with guardians and benchmarks enabled
2. Query each of the 6 tables by importSessionId to verify all records are tagged
3. Count records per table and verify they match import stats

Example verification queries:
```typescript
// After import sessionId = "abc123"
const players = await ctx.db.query("playerIdentities")
  .withIndex("by_importSessionId", q => q.eq("importSessionId", sessionId))
  .collect();

const guardians = await ctx.db.query("guardianIdentities")
  .withIndex("by_importSessionId", q => q.eq("importSessionId", sessionId))
  .collect();

// ... repeat for all 6 tables
```

## Result

✅ All 6 tables now set `importSessionId` during import. Ralph can proceed with Phase 2.4 implementation.
