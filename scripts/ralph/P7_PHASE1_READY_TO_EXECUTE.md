# Phase 7.1 - READY TO EXECUTE ✅

**Date**: 2026-01-25 23:20 GMT
**Status**: 🟢 **ALL SYSTEMS GO**
**Branch**: `phase7/prerequisites-insight-auto-apply` (commit 1465411)

---

## Executive Summary

Phase 7.1 is **100% ready for Ralph execution**. All prerequisites complete, all documentation prepared, all context provided, PRD updated, progress.txt reset, agents ready.

**Execution Command**:
```bash
npm run ralph -- \
  --prd scripts/ralph/prds/p7-coach-insight-auto-apply-phase7.prd.json \
  --phase 7.1 \
  --stories US-001,US-002,US-003,US-004,US-005 \
  --branch ralph/coach-insights-auto-apply-p7-phase1
```

---

## Final Readiness Checklist ✅

### Prerequisites (Infrastructure)

- [x] **Database Schema Extended**
  - voiceNoteInsights table created (lines 1439-1560)
  - autoAppliedInsights table created (lines 1492-1560)
  - coachTrustLevels extended with insight fields (lines 2089-2108)
  - All indexes created and functional

- [x] **Migration Executed**
  - 40 insights migrated successfully
  - Default confidence 0.7 applied to historical data
  - Verification passed: 100% match

- [x] **AI Confidence Scoring**
  - voiceNotes.ts action updated with confidence field
  - Zod schema includes confidence validation
  - Default fallback to 0.7 if AI doesn't provide score

- [x] **TypeScript Types Generated**
  - Codegen run successfully: `npx -w packages/backend convex codegen`
  - All table types available in generated API
  - No type errors

- [x] **Branch State**
  - Current branch: `phase7/prerequisites-insight-auto-apply`
  - Commit: 1465411
  - All changes pushed to remote
  - Clean git status (no uncommitted changes)

### Documentation (Context for Ralph)

- [x] **PRD Updated**
  - File: `scripts/ralph/prds/p7-coach-insight-auto-apply-phase7.prd.json`
  - Prerequisite section added with completion status
  - US-001, US-006, US-010 marked as complete
  - Line numbers updated to reflect actual schema locations
  - Knowledge graph integration notes added
  - Detailed acceptance criteria with P5 pattern references
  - Testing requirements comprehensive

- [x] **Progress.txt Reset**
  - File: `scripts/ralph/progress.txt`
  - Cleared for Phase 7.1 execution
  - Story status tracking template ready
  - Execution notes included
  - Testing checklist prepared

- [x] **Prerequisite Documentation**
  - `P7_PREREQUISITES_COMPLETED.md` - What's been done
  - `P7_CODEBASE_ANALYSIS.md` - Full codebase review (400+ lines)
  - `P7_KNOWLEDGE_GRAPH_ALIGNMENT.md` - Future-proofing analysis
  - `P7_PHASE1_PREREQUISITES_NOTE.md` - What Ralph needs to know
  - `P7_RALPH_CONTEXT.md` - Complete P5/P6 learnings (800+ lines)
  - `P7_PHASE1_EXECUTION_PLAN.md` - Detailed execution guide

### Agent Infrastructure

- [x] **Agent Scripts Ready**
  - `scripts/ralph/agents/documenter.sh` - Available
  - `scripts/ralph/agents/prd-auditor.sh` - Available
  - `scripts/ralph/agents/quality-monitor.sh` - Available
  - `scripts/ralph/agents/test-runner.sh` - Available
  - `scripts/ralph/agents/start-all.sh` - Available
  - `scripts/ralph/agents/stop-all.sh` - Available

- [x] **Agent Output Directory**
  - `scripts/ralph/agents/output/` exists
  - Agent log files ready
  - Marker files in place
  - Test output directory created

### Ralph Configuration

- [x] **PRD Structure Valid**
  - JSON syntax validated
  - All required fields present
  - User stories properly formatted
  - Acceptance criteria detailed
  - Priority ordering correct

- [x] **Story Mapping**
  - US-001: ✅ Complete (prerequisite) - Schema fields
  - US-002: 🔨 TODO - wouldAutoApply calculation
  - US-003: 🔨 TODO - Confidence visualization
  - US-004: 🔨 TODO - Preview mode badge
  - US-005: 🔨 TODO - Preview tracking

- [x] **Phase Configuration**
  - Phase identifier: "7.1: Preview Mode"
  - Story selection: US-001,US-002,US-003,US-004,US-005
  - Branch name: ralph/coach-insights-auto-apply-p7-phase1
  - Base branch: phase7/prerequisites-insight-auto-apply

---

## Knowledge Transfer (P5/P6 Learnings Documented)

### P5 Patterns Ralph Has Access To

1. **Preview Mode Pattern** (P5 Phase 1)
   - Calculate `wouldAutoApply` based on trust level
   - Show prediction badges BEFORE enabling automation
   - Track agreement rate over 20-item learning period
   - Color-coded confidence visualization

2. **Trust Level Calculation** (P5 Core)
   - effectiveLevel = min(currentLevel, preferredLevel)
   - Threshold defaults to 0.7 (70% confidence)
   - Level 0-1: Manual only
   - Level 2: Supervised automation
   - Level 3: Full automation

3. **Preview Tracking** (P5 US-005)
   - Increment counters before action (transactional)
   - Calculate agreement rate: applied / predicted
   - Mark complete after 20 items
   - Store in separate stats object

4. **UI Patterns** (P5 US-003, US-004)
   - Progress bar with percentage
   - Color coding: Red <60%, Amber 60-79%, Green 80%+
   - Blue badge for predictions ("AI would auto-apply")
   - Sparkles icon from lucide-react

### P6 Patterns Ralph Should Follow

1. **Query Optimization**
   - Always use `.withIndex()`, never `.filter()`
   - Index names match fields: `by_coach_org_status`
   - Real-time subscriptions via `useQuery`

2. **Error Handling**
   - Use `ConvexError` for user-facing errors
   - Let system errors bubble up
   - Validate permissions before operations

3. **Code Style**
   - Import organization (React → External → UI → Local → Convex)
   - Component structure (Hooks → Derived → Handlers → Render)
   - Mutation pattern (Get context → Fetch → Validate → Apply → Side effects)

---

## Phase 7.1 Execution Plan

### Expected Timeline

| Story | Estimated Time | Complexity |
|-------|----------------|------------|
| US-001 | 5 min | Trivial (verify fields exist) |
| US-002 | 30 min | Medium (create query, trust calculation) |
| US-003 | 30 min | Medium (UI component updates) |
| US-004 | 30 min | Medium (badge logic) |
| US-005 | 45 min | High (mutation with tracking) |
| **Total** | **~2.5 hours** | **Automated execution** |

**Plus**:
- Testing & verification: 30 min
- Manual visual check: 15 min
- PR creation: 15 min
- **Grand Total**: ~3.5 hours

### Success Criteria

**Backend** (npm run check-types must pass):
- [ ] `getPendingInsights` query created in voiceNoteInsights.ts
- [ ] Query uses `.withIndex('by_coach_org_status')`
- [ ] `wouldAutoApply` calculated correctly
- [ ] `applyInsight` mutation created
- [ ] `dismissInsight` mutation created
- [ ] Preview tracking increments correct counters
- [ ] After 20 insights, `completedAt` set

**Frontend** (visual verification required):
- [ ] Confidence progress bar appears on insight cards
- [ ] Percentage text shows correctly
- [ ] Color coding: Red <60%, Amber 60-79%, Green 80%+
- [ ] Preview badge shows for `wouldAutoApply=true`
- [ ] "Requires manual review" shows for `wouldAutoApply=false`
- [ ] Sparkles icon appears on auto-apply badge

**Integration**:
- [ ] Codegen runs successfully
- [ ] Type check passes (npm run check-types)
- [ ] Linting passes (npx ultracite fix)
- [ ] No console errors in browser
- [ ] Real-time updates work (Convex subscriptions)

---

## Testing Plan

### Unit Testing (Automated)

**Backend**:
```bash
# Type check
npm run check-types

# Lint
npx ultracite fix

# Codegen
npx -w packages/backend convex codegen
```

### Manual Testing

**1. Visual Verification**:
```bash
# Ensure dev server running
npm run dev

# Navigate to:
http://localhost:3000/orgs/{orgId}/coach/voice-notes

# Login as:
neil.B@blablablak.com / lien1979
```

**2. Functional Testing**:
- [ ] Click "Insights" tab
- [ ] Verify confidence bars appear on all insight cards
- [ ] Verify color coding correct (red/amber/green)
- [ ] Verify badge appears on high-confidence skills
- [ ] Verify "manual review" text on injury/medical/low-confidence
- [ ] Apply 5 insights with "would auto-apply" badge
- [ ] Dismiss 2 insights with "would auto-apply" badge
- [ ] Check Convex dashboard: `coachTrustLevels.insightPreviewModeStats`
  - `wouldAutoApplyInsights`: 7
  - `coachAppliedThose`: 5
  - `coachDismissedThose`: 2
  - `agreementRate`: ~0.71 (71%)
- [ ] Apply 13 more insights to reach 20 total
- [ ] Verify `completedAt` timestamp set

---

## Rollback Plan

If Phase 7.1 needs to be rolled back:

**Before Merge**:
```bash
git checkout main
git branch -D ralph/coach-insights-auto-apply-p7-phase1
```

**After Merge**:
```bash
git revert <merge-commit-sha>
git push origin main
```

**Impact**: Phase 7.1 only adds UI and tracking. No auto-apply logic. **Safe to rollback anytime**.

---

## Next Steps After Completion

### Immediate (After Ralph Finishes)

1. **Visual Verification** - Check UI in browser (Ralph can't do this)
2. **Manual Testing** - Apply/dismiss insights, verify tracking
3. **Code Review** - Check Ralph followed P5/P6 patterns
4. **Create PR** - Or Ralph may create automatically

### Phase 7.2 Preparation (After 7.1 Merged)

Once Phase 7.1 is merged to main:
```bash
npm run ralph -- \
  --prd scripts/ralph/prds/p7-coach-insight-auto-apply-phase7.prd.json \
  --phase 7.2 \
  --stories US-006,US-007,US-008,US-009 \
  --branch ralph/coach-insights-auto-apply-p7-phase2
```

**Phase 7.2 Summary**:
- Auto-apply skill insights to player profiles
- 1-hour undo window
- Audit trail population
- Auto-applied insights UI tab

---

## Critical Reminders

### For Ralph

1. **voiceNoteInsights is a TABLE** - Query with `.withIndex()`, not embedded array
2. **Confidence scores already exist** - 0.7 default for historical, AI-generated for new
3. **US-001 and US-006 are complete** - Verify schema fields exist, mark complete immediately
4. **Reference P5 implementations** - Same patterns, same structure
5. **Never auto-apply injury/medical** - Safety guardrail
6. **Store targetRecordId** - For knowledge graph integration (Phase 7.2)

### For Manual Verification

1. **Visual check required** - Ralph can't verify UI in browser
2. **Check Convex dashboard** - Verify preview stats update correctly
3. **Test account credentials** - neil.B@blablablak.com / lien1979
4. **Preview period is 20 insights** - Not 10, not 30. Exactly 20.

---

## Documentation Index

All documentation is ready and organized:

### Prerequisites
- `P7_PREREQUISITES_COMPLETED.md` - What's been built
- `P7_KNOWLEDGE_GRAPH_ALIGNMENT.md` - Future-proofing

### Context for Ralph
- `P7_RALPH_CONTEXT.md` - Complete P5/P6 learnings (PRIMARY REFERENCE)
- `P7_PHASE1_PREREQUISITES_NOTE.md` - What Ralph should know
- `P7_PHASE1_EXECUTION_PLAN.md` - How to execute

### Codebase Analysis
- `P7_CODEBASE_ANALYSIS.md` - Full review before prerequisites
- `P7_PHASE1_READY_TO_EXECUTE.md` - This document

### Reference Phases
- `P5_PHASE4_HANDOFF.md` - P5 learning loop patterns
- `P6_PHASED_IMPLEMENTATION_PLAN.md` - P6 architecture
- P5/P6 implementation files in `apps/web` and `packages/backend`

---

## Final Status

**Database**: ✅ Ready
- voiceNoteInsights table with 40 migrated insights
- autoAppliedInsights audit trail table
- coachTrustLevels extended with insight fields
- All indexes created and functional

**Code**: ✅ Ready
- AI confidence scoring implemented
- TypeScript types generated
- No build errors
- Clean git state

**Documentation**: ✅ Ready
- PRD updated with prerequisite status
- Progress.txt reset for Phase 7.1
- 6 comprehensive context documents
- P5/P6 pattern references documented

**Configuration**: ✅ Ready
- Agent scripts available
- Output directory prepared
- Testing accounts verified
- Dev server running on port 3000

---

## Execution Authorization

**Authorized to proceed**: YES ✅

**Command**:
```bash
npm run ralph -- \
  --prd scripts/ralph/prds/p7-coach-insight-auto-apply-phase7.prd.json \
  --phase 7.1 \
  --stories US-001,US-002,US-003,US-004,US-005 \
  --branch ralph/coach-insights-auto-apply-p7-phase1
```

**Expected Duration**: 3-4 hours (automated execution)

**Monitoring**: Check `scripts/ralph/progress.txt` for real-time updates

**Support**: All context documents available in `scripts/ralph/`

---

**READY TO LAUNCH** 🚀

---

**Prepared by**: Claude Sonnet 4.5
**Date**: 2026-01-25 23:20 GMT
**Commit**: 1465411
**Branch**: phase7/prerequisites-insight-auto-apply
