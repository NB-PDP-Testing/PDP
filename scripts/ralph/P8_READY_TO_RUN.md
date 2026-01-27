# Phase 8 Week 1 - Ready for Ralph 🚀

**Date**: 27 January 2026
**Status**: ✅ ALL SYSTEMS GO
**Branch Target**: `ralph/coach-impact-visibility-p8-week1`

---

## ✅ Setup Complete

### 1. PRDs Created ✅

**Main PRD (Markdown):**
- `scripts/ralph/prds/Coaches Voice Insights/P8_COACH_IMPACT_VISIBILITY.md` (Full 20-story PRD)
- `scripts/ralph/prds/Coaches Voice Insights/P9_TEAM_COLLABORATION_HUB.md` (Full 30-story PRD for Phase 9)

**Ralph JSON PRD (Active):**
- `scripts/ralph/prds/Coaches Voice Insights/p8-week1-foundation.prd.json` (Week 1: 4 stories)
- `scripts/ralph/prd.json` ← **ACTIVE PRD Ralph will read**

### 2. Context Documents Created ✅

**P8 Context:**
- `scripts/ralph/P8_RALPH_CONTEXT.md` - Complete P1-P7 learnings + P8 architecture
  - Backend query patterns
  - Frontend component patterns
  - Navigation patterns
  - Testing strategies
  - Common mistakes from P1-P7

**P7 Context (Reference):**
- `scripts/ralph/P7_RALPH_CONTEXT.md` - Trust level patterns from P5-P7

### 3. Progress Log Reset ✅

**Archived:**
- `scripts/ralph/archive/progress-p7-20260127.txt` (P7 work preserved)

**Fresh Start:**
- `scripts/ralph/progress.txt` - New file with:
  - Codebase patterns section (P1-P7 learnings)
  - Phase 8 Week 1 context
  - Common mistakes to avoid

### 4. Agents Running ✅

**Active Agents:**
- ✅ `quality-monitor.sh` (PID 10162) - Type/lint checks every 60s
- ✅ `prd-auditor.sh` (PID 10244) - Story verification every 90s
- ✅ `test-runner.sh` (PID 10500) - Test execution every 30s

**Output Location:**
- `scripts/ralph/agents/output/feedback.md` - Real-time feedback for Ralph

### 5. Git Status ✅

**Current Branch:** `main`
**Working Tree:** Clean (ready for new branch)

**Untracked Files (New Documentation):**
- P8_RALPH_CONTEXT.md
- P8_COACH_IMPACT_VISIBILITY.md
- P9_TEAM_COLLABORATION_HUB.md
- PHASE_8_9_PLANNING.md
- p8-week1-foundation.prd.json

---

## 📋 Week 1 User Stories (4 Stories)

### US-P8-001: Create getCoachImpactSummary Backend Query
**Priority:** 1 (CRITICAL - Foundation)
**Complexity:** HIGH
**Estimated Time:** 2-3 hours

**What It Does:**
- Aggregates coach activity across 6 tables
- Returns summary metrics, skill changes, injuries, summaries, team observations
- Calculates parent engagement stats
- Provides weekly trends for chart

**Critical Notes:**
- This query is FOUNDATION for entire My Impact dashboard
- Must use .withIndex() for ALL sub-queries
- Test thoroughly in Convex dashboard before marking complete

---

### US-P8-002: Remove Trust Level Gate from Sent to Parents Tab
**Priority:** 2 (QUICK WIN)
**Complexity:** LOW
**Estimated Time:** 15 minutes

**What It Does:**
- Removes trust level check that hides tab for Level 0-1 coaches
- Makes "Sent to Parents" tab visible to ALL coaches

**Critical Notes:**
- This is the IMMEDIATE IMPACT fix
- Simple code change (delete if statement)
- Huge UX improvement for Level 0-1 coaches

---

### US-P8-003: Create My Impact Tab Component Structure
**Priority:** 3 (SCAFFOLDING)
**Complexity:** MEDIUM
**Estimated Time:** 1 hour

**What It Does:**
- Creates my-impact-tab.tsx with date range filtering
- Loading/empty states
- Placeholder sections for Week 2 work

**Critical Notes:**
- Scaffolding for Week 2 dashboard components
- Establishes data fetching pattern
- Sets up date range state management

---

### US-P8-004: Add My Impact Tab to Navigation
**Priority:** 4 (SCAFFOLDING)
**Complexity:** LOW
**Estimated Time:** 30 minutes

**What It Does:**
- Adds "My Impact" tab to voice notes dashboard
- Role-based visibility (coaches + platform staff only)
- Icon: BarChart3

**Critical Notes:**
- Final scaffolding piece
- Makes tab visible to users
- After this, Week 1 foundation complete

---

## 🎯 Success Criteria for Week 1

### Backend:
- [ ] getCoachImpactSummary query returns valid data structure
- [ ] Query uses .withIndex() for all sub-queries (NEVER .filter())
- [ ] Query tested in Convex dashboard with real coachId/orgId
- [ ] Type check passes: `npm run check-types`
- [ ] Codegen runs successfully: `npx -w packages/backend convex codegen`

### Frontend:
- [ ] Level 0-1 coaches can see "Sent to Parents" tab
- [ ] My Impact tab structure created with date range filtering
- [ ] My Impact tab visible in navigation
- [ ] Loading/empty states implemented
- [ ] Visual verification in browser complete

### Quality:
- [ ] All type checks pass
- [ ] All lint checks pass (ultracite)
- [ ] No console errors
- [ ] All stories visually verified
- [ ] Progress.txt updated with learnings

---

## 🚀 Running Ralph

### Command:
```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/ralph.sh 10
```

### What Ralph Will Do:
1. Read `scripts/ralph/prd.json` (P8 Week 1 PRD)
2. Read `scripts/ralph/progress.txt` (codebase patterns)
3. Read `scripts/ralph/P8_RALPH_CONTEXT.md` (P8 architecture)
4. Pick highest priority story (US-P8-001)
5. Implement story
6. Run quality checks
7. Commit if passing
8. Update prd.json to mark story complete
9. Update progress.txt with learnings
10. Repeat for remaining stories

### Monitoring Ralph:
```bash
# Watch all agents in real-time
tail -f scripts/ralph/agents/output/*.log

# Watch progress
tail -f scripts/ralph/progress.txt

# Watch git commits
watch -n 5 git log --oneline -5
```

### If Ralph Encounters Issues:
Agents will write feedback to `scripts/ralph/agents/output/feedback.md`:
- Type errors → Quality monitor catches immediately
- Lint errors → Quality monitor flags for Ralph
- Story verification failures → PRD auditor alerts

Ralph reads feedback in next iteration and fixes issues.

---

## 📊 Expected Timeline

**Story-by-Story Estimate:**
- US-P8-001: 2-3 hours (complex aggregation query)
- US-P8-002: 15 minutes (simple fix)
- US-P8-003: 1 hour (scaffolding)
- US-P8-004: 30 minutes (navigation)

**Total Week 1:** 4-5 hours

**Ralph Iterations:** Likely 4-6 iterations (1 story per iteration, some may need 2)

---

## 🎓 Key Context for Ralph

### From P5 (Parent Summaries Trust System):
- Trust level progressive automation pattern
- Preview mode stats (20-item baseline)
- Confidence visualization (color-coded progress bars)
- **Trust level gate pattern** (the one we're REMOVING in US-P8-002)

### From P6 (Monitoring & Safety):
- Cost control patterns (not used in P8, but reference)
- Circuit breaker patterns (not used in P8, but reference)
- Query optimization patterns (CRITICAL for US-P8-001)

### From P7 (Insight Auto-Apply):
- Insight preview mode pattern
- autoAppliedInsights table with targetRecordId (CRITICAL for P8 navigation)
- Category-based auto-apply preferences
- Undo tracking patterns

### P8 Critical Insights:
- **UX Gap**: Level 0-1 coaches do MORE work but have LESS visibility
- **Solution**: "My Impact" dashboard for ALL coaches (not gated by trust level)
- **Navigation**: Bi-directional links (insight → passport → voice note)
- **Traceability**: Complete audit trail from AI suggestions to player profiles

---

## 📚 Reference Documents

**Essential Reading:**
1. `scripts/ralph/P8_RALPH_CONTEXT.md` - P8 architecture + patterns
2. `scripts/ralph/prd.json` - Current active PRD (Week 1)
3. `scripts/ralph/prds/Coaches Voice Insights/P8_COACH_IMPACT_VISIBILITY.md` - Full PRD

**Context:**
4. `scripts/ralph/P7_RALPH_CONTEXT.md` - P5-P7 learnings
5. `docs/technical/VOICE_NOTES_TECHNICAL_OVERVIEW.md` - Section 20: Visibility gap

**Testing:**
6. `docs/testing/Voice Insights/` - Existing test guides from P1-P7

---

## ✅ Pre-Flight Checklist

- [x] P8 PRDs created (Markdown + JSON)
- [x] P8 context document created
- [x] progress.txt reset with P8 context
- [x] prd.json points to P8 Week 1 PRD
- [x] Agents running (quality monitor, prd auditor, test runner)
- [x] Git status clean (on main branch)
- [x] Documentation references complete
- [x] Success criteria defined
- [x] Timeline estimated

---

## 🎉 Ready to Launch!

**Command to start Ralph:**
```bash
./scripts/ralph/ralph.sh 10
```

Ralph has everything needed:
- ✅ Clear user stories with detailed acceptance criteria
- ✅ Complete context from P1-P7
- ✅ P8-specific architecture and patterns
- ✅ Real-time monitoring via agents
- ✅ Quality checks automated
- ✅ Testing strategies defined

**Expected Outcome:**
After 4-5 hours (4-6 Ralph iterations), Week 1 will be complete:
- ✅ getCoachImpactSummary query working
- ✅ Level 0-1 coaches can see sent summaries (immediate impact!)
- ✅ My Impact tab structure ready for Week 2 work
- ✅ Foundation set for remaining 16 stories

**Next Steps After Week 1:**
1. Create P8 Week 2 JSON PRD (US-P8-005 to US-P8-011)
2. Run Ralph on Week 2 (dashboard components)
3. Create P8 Week 3 JSON PRD (US-P8-012 to US-P8-020)
4. Run Ralph on Week 3 (navigation & polish)

---

**Ready for liftoff! 🚀**

Prepared by: Claude Sonnet 4.5
Date: 27 January 2026
Status: GREEN - ALL SYSTEMS GO
