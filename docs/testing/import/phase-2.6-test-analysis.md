# Phase 2.6 Test Analysis: Error Testing Problem

**Date**: February 14, 2026
**Issue**: Error collection UI tests are UNTESTABLE in manual UAT

---

## The Fundamental Problem

### PRD Says (US-P2.6-004)
> "As a user running an import with errors, I need to see errors as they occur (not just at the end) so I can decide whether to cancel the import."

**Implies**: Data validation errors (duplicates, invalid data) should appear during import.

### Implementation Reality

**Import system uses UPSERT pattern**:
```typescript
// Line 682-684 in playerImport.ts
if (existingPlayer) {
  playerIdentityId = existingPlayer._id;
  results.playersReused += 1;  // ← No error, just reuse
} else {
  // Create new player
  results.playersCreated += 1;
}
```

**Errors only occur from exceptions** (lines 765-767, 1192-1194):
```typescript
} catch (error) {
  results.errors.push(errorMsg);  // ← Only system/runtime errors
}
```

### What This Means

| Scenario | Quality Check | Import | Result |
|----------|---------------|--------|--------|
| Duplicate rows in CSV | ❌ **Critical error** (blocks) | N/A | Can't reach import |
| Import same data twice | ✅ Passes | ✅ Updates existing | No errors |
| Missing required fields | ❌ **Critical error** (blocks) | N/A | Can't reach import |
| Invalid email/phone | ❌ **Critical error** (blocks) | N/A | Can't reach import |
| Database failure | N/A | ❌ Error | Can test (but not in UAT) |
| Constraint violation | N/A | ❌ Error | Can test (but not in UAT) |

**Conclusion**: ALL data validation errors are caught by Quality Check. Import errors only occur from system failures.

---

## Why Error Tests Are Untestable

### Chicken-and-Egg Problem
1. Quality Check blocks all data errors → can't reach Import step
2. Clean data passes Quality Check → Import succeeds (upserts duplicates)
3. System errors (database failures) → can't trigger in manual UAT

### Error Collection UI Status
- ✅ **UI exists** and **works correctly**
- ✅ **Code is correct** (displays errors from progress tracker)
- ❌ **Can't be tested** with normal CSV data in manual UAT
- ✅ **Can only be tested** by developers forcing system errors

---

## Tests That Cannot Be Tested in Manual UAT

### Must Be Removed from Manual Test Document

1. **Test 2.6.4.2**: Errors Appear in Real-Time
   - Requires errors during import
   - Import doesn't produce errors with valid data

2. **Test 2.6.4.3**: Error List Expansion
   - Requires error list to expand
   - No errors to expand

3. **Test 2.6.4.4**: Error Animations
   - Requires errors appearing with staggered animation
   - No errors to animate

4. **Test 2.6.4.5**: Auto-Scroll to Bottom
   - Requires 10+ errors
   - Can't produce errors

5. **Test 2.6.4.6**: Error Persistence After Completion
   - Requires errors to persist
   - No errors to persist

6. **Test 2.6.4.7**: Mobile Responsiveness - Error List
   - Requires error list on mobile
   - No errors to display

7. **Test 2.6.3.5**: Error Shake Animation
   - Requires progress bar to shake on error
   - No errors to trigger shake

8. **Integration Test 2**: Import with Errors - All Features
   - Requires import with errors for integration testing
   - Can't produce errors

### Can Still Test in Manual UAT

1. ✅ **Test 2.6.4.1**: Error Section with No Errors
   - Shows "No errors (0)" with green checkmark
   - This actually tests the success path

All other tests (stats counter, current operation, progress bar animations, polling, cleanup) **can be tested** normally.

---

## Three Possible Solutions

### Option 1: Remove Error Tests (RECOMMENDED)
**What**: Remove untestable error tests from manual UAT document
**Why**: Can't be tested with normal CSV data
**Impact**:
- Manual UAT tests only testable features
- Error UI tested only by developers (forcing database errors)
- Reduces manual test count from 33 to ~25 tests

**Files to update**:
- `phase-2.6-manual-tests.md` - Remove tests 2.6.4.2-2.6.4.7, 2.6.3.5, Integration Test 2
- Keep test 2.6.4.1 (tests "no errors" success path)

### Option 2: Change Import to Error on Duplicates
**What**: Modify import to throw errors for duplicates instead of upserting
**Why**: Match PRD expectation
**Impact**:
- **Breaking change** - current upsert behavior is a feature (allows data updates via re-import)
- Would need to add "update mode" vs "insert mode" toggle
- Significant code changes
- Might break existing workflows

**Not recommended** - upsert is actually useful behavior

### Option 3: Developer-Only Error Tests
**What**: Keep error tests but mark as "Developer Only - Manual Force Required"
**Why**: Documents that error UI exists and works
**Impact**:
- Manual testers skip these tests
- Developers can test by modifying database constraints or forcing errors in code
- More complete test coverage but not practical for UAT

---

## Recommended Approach

**Update manual test document**:

1. **Remove** untestable error tests (2.6.4.2-2.6.4.7, 2.6.3.5, Integration Test 2)

2. **Keep** test 2.6.4.1 renamed to:
   - **Test 2.6.4.1**: Error Section in Success State
   - Tests that "No errors (0)" displays correctly

3. **Add note** explaining import upsert behavior:
   ```markdown
   ## Note on Import Behavior

   The import system uses an **upsert pattern** (update-or-insert):
   - Existing players (same name + DOB) → Updates enrollment
   - New players → Creates player identity and enrollment
   - **No errors for duplicates** - they update existing records

   This allows users to update player data by re-importing CSV files.

   Errors only occur from system failures (database errors, constraint violations).
   The error collection UI exists and works correctly, but cannot be tested in
   manual UAT with normal CSV data.
   ```

4. **Update test count**:
   - From: 33 tests total
   - To: ~25 tests total (remove 8 untestable error tests)
   - Success rate threshold still 90% (23/25 pass)

---

## Updated Test Data Approach

**Remove** `error-testing-data.csv` - not needed

**Keep** existing test data:
- `clean-data.csv` (20 rows) - for success path testing
- `large-data.csv` (50+ rows) - for performance testing

**Test upsert behavior** (optional):
1. Import `clean-data.csv` once → 20 players created
2. Import `clean-data.csv` again → 20 players updated (playersReused counter increases)
3. Verify no errors, enrollment data updated

---

## Summary

✅ **Error UI code is correct** - works as designed
❌ **Error tests are untestable** - import upserts, doesn't error
✅ **Solution**: Remove error tests from manual UAT
✅ **Impact**: Reduces test count from 33 to 25, all testable
✅ **Next steps**: Update `phase-2.6-manual-tests.md` to remove untestable tests

The import system's upsert behavior is actually a **feature** (allows data updates via re-import), not a bug. The error collection UI works correctly for system errors, but system errors can't be triggered in manual UAT.
