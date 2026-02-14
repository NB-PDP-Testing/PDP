# Phase 2.6 Branch → Main: Merge Safety Analysis

## Executive Summary
✅ **SAFE TO MERGE** - No breaking changes detected
⚠️ **LARGE MERGE** - Includes ALL Phase 2 features (2.1-2.6), not just 2.6
📊 **Impact**: 114 files changed, 15,530 insertions, 2,224 deletions

---

## What Will Be Merged

This merge includes **ALL 6 Phase 2 features**, not just Phase 2.6:

1. **Phase 2.1**: Data Quality Scoring
2. **Phase 2.2**: Import Simulation
3. **Phase 2.3**: Save & Resume
4. **Phase 2.4**: Granular Undo (24-hour window)
5. **Phase 2.5**: "What's Next" Workflow (not import-related)
6. **Phase 2.6**: Progress Animations

---

## Breaking Change Analysis

### Schema Changes: ✅ NON-BREAKING

**New Tables** (additive only):
- `importSessions` - Tracks import sessions for save/resume
- `importSessionDrafts` - Saves draft wizard state
- `importProgressTrackers` - Real-time progress tracking
- `importHistory` - Undo/rollback tracking

**Modified Tables** (additive only):
- `guardians` - Added optional `importSessionId` field
- `orgPlayerEnrollments` - Added optional `importSessionId` field
- `orgGuardianProfiles` - Added optional `importSessionId` field

**New Indexes** (non-breaking):
- `by_importSessionId` on guardians
- `by_importSessionId` on orgPlayerEnrollments

✅ **All changes are additive** - existing code will continue to work

---

### API Changes: ✅ BACKWARD COMPATIBLE

**New Queries**:
- `getImportSession`, `getImportDraft` (Phase 2.3)
- `canUndoImport`, `getImportHistory` (Phase 2.4)
- `getProgressTracker` (Phase 2.6)

**New Mutations**:
- `saveDraft`, `deleteDraft` (Phase 2.3)
- `undoImport` (Phase 2.4)
- `cleanupProgressTracker` (Phase 2.6)

**Modified Mutations**:
- `batchImportPlayersWithIdentity` - Now accepts optional `sessionId`, `selectedRowIndices`
  - ✅ Both parameters are optional - old calls still work

✅ **All API changes maintain backward compatibility**

---

### Frontend Changes: ✅ SELF-CONTAINED

**Import Wizard Enhancements**:
- Auto-save every 30s (doesn't affect existing flows)
- Resume capability (new route `/import/resume/:sessionId`)
- Quality scoring (pre-import, non-blocking)
- Simulation preview (optional, can be skipped)
- Progress animations (enhancement, graceful degradation)
- Undo UI (new route `/import/history`)

✅ **Existing import flows unchanged** - new features are opt-in enhancements

---

## Dependency Analysis

### Required Dependencies: ✅ ALL SATISFIED

Phase 2 builds on Phase 1.3 (Import Wizard base):
- ✅ Phase 1.3 is in main (commit f795808c)
- ✅ Import wizard components exist
- ✅ `batchImportPlayersWithIdentity` mutation exists

### No Circular Dependencies

Phase 2.6 → Phase 2.5 → Phase 2.4 → Phase 2.3 → Phase 2.2 → Phase 2.1
- All built sequentially on same branch
- No external dependencies missing

---

## Risk Assessment

### LOW RISK ✅

**Why safe:**
1. **Additive only** - No deletions of existing fields/tables/functions
2. **Optional parameters** - All new mutation args are optional
3. **Graceful fallback** - Progress tracker missing? Falls back to basic progress
4. **Self-contained routes** - New pages don't interfere with existing
5. **Tested incrementally** - Each phase tested individually

### MEDIUM RISK ⚠️

**Why cautious:**
1. **Large changeset** - 114 files, significant surface area
2. **Not browser-tested** - Animations not visually verified
3. **Database migrations** - 4 new tables + 2 new indexes
4. **Complex wizard state** - Auto-save, resume, undo add complexity

---

## Testing Checklist

### Before Merge
- [ ] Convex schema deployment (4 new tables)
- [ ] Review PR diffs carefully (15k+ lines)
- [ ] Check for merge conflicts

### After Merge
- [ ] Verify existing imports still work (basic flow)
- [ ] Test new features: save/resume, undo, progress animations
- [ ] Check data quality scoring on real data
- [ ] Run full import with 100+ players
- [ ] Mobile test at 375px width
- [ ] Monitor Convex function costs (new polling queries)

---

## Recommendation

### ✅ SAFE TO MERGE with conditions:

1. **Merge during low-traffic period** - Large changeset, want to catch issues early
2. **Deploy Convex schema first** - Ensure new tables exist before frontend hits them
3. **Monitor after deploy** - Watch for errors, performance issues
4. **Have rollback plan** - Can revert if critical issues arise
5. **Run manual tests** - Verify key flows after deployment

### Alternative Approach:

If you want **less risk**, merge Phase 2 incrementally:
1. Create branch from Phase 2.1 → Merge → Test
2. Create branch from Phase 2.2 → Merge → Test
3. ... continue through Phase 2.6

This spreads risk but takes more time.

---

## Database Migration Impact

### New Tables (4)
- `importSessions` - Will grow with imports (~10-100/month)
- `importSessionDrafts` - Small, auto-cleaned
- `importProgressTrackers` - Ephemeral, cleaned on completion
- `importHistory` - Will grow (~10-100/month), cleaned after 24h

### Storage Impact: LOW
- Most tables are ephemeral or auto-cleaned
- `importHistory` has 24-hour retention (auto-deleted)

---

## Conclusion

**✅ Merge is safe** - All changes are backward compatible and additive.

**⚠️ Large merge** - Test thoroughly after deployment.

**📋 Action items**:
1. Review PR carefully (15k+ lines)
2. Deploy during maintenance window
3. Run manual smoke tests post-deploy
4. Monitor Convex logs for errors

---

Generated: 2026-02-14
