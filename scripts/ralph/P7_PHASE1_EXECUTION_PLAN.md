# Phase 7.1 Ralph Execution Plan

**Date**: 2026-01-25
**Base Branch**: `phase7/prerequisites-insight-auto-apply`
**Ralph Branch**: `ralph/coach-insights-auto-apply-p7-phase1`
**Status**: ✅ Ready to Execute

---

## Pre-Execution Checklist

### ✅ Prerequisites Complete

- [x] `voiceNoteInsights` table created and migrated (40 insights)
- [x] `autoAppliedInsights` audit trail table created
- [x] `coachTrustLevels` extended with insight preview mode fields
- [x] AI confidence scoring implemented
- [x] Migration verified successfully
- [x] Knowledge graph alignment confirmed
- [x] P5/P6 learnings documented for Ralph

### ✅ Context Documents Prepared

- [x] `P7_CODEBASE_ANALYSIS.md` - Full codebase review
- [x] `P7_PREREQUISITES_COMPLETED.md` - What's been done
- [x] `P7_KNOWLEDGE_GRAPH_ALIGNMENT.md` - Future-proofing analysis
- [x] `P7_PHASE1_PREREQUISITES_NOTE.md` - What Ralph needs to know
- [x] `P7_RALPH_CONTEXT.md` - Complete P5/P6 learnings

---

## Phase 7.1 Overview

**Goal**: Preview Mode for Insights - Show coaches what AI would auto-apply

**User Stories**: US-001 through US-005

| Story | Status | Description |
|-------|--------|-------------|
| US-001 | ✅ DONE | Schema fields (completed in prerequisites) |
| US-002 | 🔨 TODO | Add `wouldAutoApply` calculation to queries |
| US-003 | 🔨 TODO | Confidence visualization on insight cards |
| US-004 | 🔨 TODO | Preview mode prediction badge |
| US-005 | 🔨 TODO | Track preview statistics when coaches apply/dismiss |

**Duration**: 1-2 weeks (Ralph automated execution)
**Expected Deliverables**:
- Backend query enhancements (wouldAutoApply logic)
- Frontend confidence UI (progress bars, badges)
- Preview mode tracking (agreement rate calculation)

---

## Ralph Execution Command

### Command to Run

```bash
npm run ralph -- \
  --prd scripts/ralph/prds/p7-coach-insight-auto-apply-phase7.prd.json \
  --phase 7.1 \
  --stories US-001,US-002,US-003,US-004,US-005 \
  --branch ralph/coach-insights-auto-apply-p7-phase1
```

### What Ralph Will Do

1. **Create branch**: `ralph/coach-insights-auto-apply-p7-phase1` off `phase7/prerequisites-insight-auto-apply`
2. **Read context**:
   - PRD: `scripts/ralph/prds/p7-coach-insight-auto-apply-phase7.prd.json`
   - Context: `P7_RALPH_CONTEXT.md`, `P7_PHASE1_PREREQUISITES_NOTE.md`
   - Reference: P5/P6 similar implementations
3. **Implement stories**:
   - US-001: Verify schema (should mark complete immediately)
   - US-002: Create/update `getPendingInsights` query with trust level calculation
   - US-003: Add confidence visualization to insight card components
   - US-004: Add preview mode badge to insight cards
   - US-005: Update `applyInsight` and `dismissInsight` mutations with tracking
4. **Run checks**:
   - Codegen after each backend change
   - Type check periodically
   - Lint before committing
5. **Create PR**: When all stories complete

---

## Expected File Changes

### Backend Files

| File | Change Type | Story |
|------|-------------|-------|
| `packages/backend/convex/models/voiceNoteInsights.ts` | Create/Update | US-002, US-005 |
| - `getPendingInsights` query | Add `wouldAutoApply` calculation | US-002 |
| - `applyInsight` mutation | Add preview tracking | US-005 |
| - `dismissInsight` mutation | Add preview tracking | US-005 |

### Frontend Files

| File | Change Type | Story |
|------|-------------|-------|
| `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx` | Update | US-003, US-004 |
| `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/*-insight-card.tsx` | Update | US-003, US-004 |
| - Add confidence progress bar | Visual enhancement | US-003 |
| - Add preview mode badge | Prediction indicator | US-004 |

### Generated Files

| File | Change Type | Notes |
|------|-------------|-------|
| `packages/backend/convex/_generated/api.d.ts` | Auto-generated | Updated by codegen |
| `packages/backend/convex/_generated/dataModel.d.ts` | Auto-generated | Schema types |

---

## Success Criteria

### Backend Validation

- [ ] `getPendingInsights` query returns `wouldAutoApply` boolean field
- [ ] `applyInsight` mutation increments preview stats correctly
- [ ] `dismissInsight` mutation increments preview stats correctly
- [ ] After 20 insights, `completedAt` is set
- [ ] Agreement rate calculated correctly: `coachAppliedThose / wouldAutoApplyInsights`
- [ ] Type check passes: `npm run check-types`
- [ ] Codegen runs without errors

### Frontend Validation

- [ ] Insight cards display confidence percentage
- [ ] Progress bar shows confidence visually (0-100%)
- [ ] Color coding works: Red <60%, Amber 60-79%, Green 80%+
- [ ] High-confidence insights show "AI would auto-apply" badge
- [ ] Low-confidence insights show "Requires manual review" text
- [ ] Sparkles icon appears on auto-apply badge
- [ ] Visual verification in browser (manual check required)

### Integration Validation

- [ ] Applying insight updates preview stats in `coachTrustLevels`
- [ ] Dismissing insight updates preview stats in `coachTrustLevels`
- [ ] Real-time updates work (Convex subscriptions)
- [ ] No console errors
- [ ] Linting passes: `npx ultracite fix`

---

## Post-Ralph Checklist

After Ralph completes:

1. **Visual Verification** (Required - Ralph can't do this):
   ```bash
   # Ensure dev server is running
   npm run dev

   # Navigate to: http://localhost:3000
   # Login as coach: neil.B@blablablak.com / lien1979
   # Go to: Voice Notes → Insights tab
   # Verify:
   #   - Confidence bars appear
   #   - Badges show for high-confidence insights
   #   - Colors match specification
   ```

2. **Manual Testing**:
   - Apply 5 high-confidence insights
   - Dismiss 5 low-confidence insights
   - Check `coachTrustLevels` record in Convex dashboard
   - Verify counters incremented
   - Verify agreement rate calculated

3. **Code Review**:
   - Check Ralph's implementations match P5/P6 patterns
   - Verify indexes used (not `.filter()`)
   - Verify imports are correct
   - Verify error handling present

4. **Create PR**:
   - Ralph may create PR automatically
   - If not, create manually:
     ```bash
     gh pr create \
       --title "feat(phase7.1): Add insight preview mode" \
       --body "Implements Phase 7.1 (US-001 to US-005): Preview mode for coach insights auto-apply system."
     ```

---

## Monitoring Ralph's Progress

### During Execution

Ralph will output progress in real-time. Watch for:

1. **Story markers**: `[US-001]`, `[US-002]`, etc.
2. **File changes**: Created, modified, deleted files
3. **Verification**: Codegen, type check, lint results
4. **Errors**: Build errors, type errors, test failures

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Ralph forgot import - add it manually |
| "Property does not exist on type" | Type mismatch - check Convex generated types |
| ".filter() used instead of .withIndex()" | Remind Ralph to use indexes |
| "Component not rendering" | Check props passed correctly |
| "Mutation not triggering" | Check event handler wiring |

### Intervention Points

You may need to intervene if:
- Ralph gets stuck on a story (>30 minutes)
- Build errors persist after 3 attempts
- Visual verification fails (UI doesn't match spec)

If intervention needed:
1. Stop Ralph (Ctrl+C)
2. Fix issue manually
3. Restart Ralph with `--resume` flag (if available)

---

## Next Steps After Phase 7.1

Once Phase 7.1 is complete and merged to `main`:

### Phase 7.2: Supervised Auto-Apply (US-006 to US-009)
```bash
npm run ralph -- \
  --prd scripts/ralph/prds/p7-coach-insight-auto-apply-phase7.prd.json \
  --phase 7.2 \
  --stories US-006,US-007,US-008,US-009 \
  --branch ralph/coach-insights-auto-apply-p7-phase2
```

**What Phase 7.2 Does**:
- Actually auto-apply insights to player profiles
- Implement 1-hour undo window
- Create undo UI
- Populate `autoAppliedInsights` audit trail

### Phase 7.3: Learning Loop (US-010 to US-013)
```bash
npm run ralph -- \
  --prd scripts/ralph/prds/p7-coach-insight-auto-apply-phase7.prd.json \
  --phase 7.3 \
  --stories US-010,US-011,US-012,US-013 \
  --branch ralph/coach-insights-auto-apply-p7-phase3
```

**What Phase 7.3 Does**:
- Analyze undo patterns
- Adjust confidence thresholds per coach
- Auto-pause on high undo rate (>15%)
- PostHog tracking integration

---

## Rollback Plan

If Phase 7.1 needs to be rolled back:

1. **Before Merge**: Just delete the branch
   ```bash
   git branch -D ralph/coach-insights-auto-apply-p7-phase1
   ```

2. **After Merge**: Revert the PR
   ```bash
   git revert <merge-commit-sha>
   ```

**Impact**: Phase 7.1 only adds UI and tracking. No auto-apply logic. Safe to rollback.

---

## Resources for Ralph

### Key Reference Implementations (P5)

- **Preview Mode UI**: `apps/web/src/app/orgs/[orgId]/coach/parent-summaries/components/summary-card.tsx`
- **Preview Tracking**: `packages/backend/convex/models/coachParentSummaries.ts`
- **Trust Level Queries**: `packages/backend/convex/models/coachTrustLevels.ts`

### Documentation

- **Phase 5 Trust System**: `scripts/ralph/P5_PHASE4_HANDOFF.md`
- **Phase 6 Architecture**: `scripts/ralph/P6_PHASED_IMPLEMENTATION_PLAN.md`
- **Knowledge Graph**: `docs/architecture/knowledge-graph.md`
- **Convex Patterns**: `.ruler/convex_rules.md`

### Testing Accounts

- **Coach**: `neil.B@blablablak.com` / `lien1979`
- **Org ID**: (check current session)
- **Insights**: 40 migrated insights available in dev environment

---

## Communication Plan

### Updates to Provide

After Ralph execution:
1. **Success metrics**: How many stories completed
2. **File changes**: List of modified files
3. **Test results**: Type check, lint, codegen status
4. **Visual verification**: Screenshots of UI changes
5. **PR link**: Link to created pull request

### Blockers to Report

If Ralph encounters issues:
1. **What failed**: Story number, error message
2. **What was tried**: Ralph's attempted solutions
3. **Current state**: What works, what doesn't
4. **Next steps**: Manual intervention needed?

---

## Estimated Timeline

| Milestone | Duration | Notes |
|-----------|----------|-------|
| Ralph setup | 5 min | Create branch, read context |
| US-001 verification | 5 min | Schema already done |
| US-002 backend | 30 min | Query enhancement |
| US-003 frontend | 30 min | Confidence UI |
| US-004 frontend | 30 min | Preview badge |
| US-005 backend | 45 min | Tracking mutations |
| Testing & verification | 30 min | Type check, lint, codegen |
| **Total** | **~3 hours** | Automated execution |

**Manual verification**: +30 minutes (visual check, manual testing)
**PR creation**: +15 minutes (write description, request review)

**Grand Total**: ~4 hours end-to-end

---

## Ready to Execute! 🚀

All context prepared, all prerequisites complete, all learnings documented.

**Execute Ralph with:**

```bash
npm run ralph -- \
  --prd scripts/ralph/prds/p7-coach-insight-auto-apply-phase7.prd.json \
  --phase 7.1 \
  --stories US-001,US-002,US-003,US-004,US-005 \
  --branch ralph/coach-insights-auto-apply-p7-phase1
```

---

**Prepared by**: Claude Sonnet 4.5
**Date**: 2026-01-25
**Base Branch**: `phase7/prerequisites-insight-auto-apply` (commit e3587d8)
