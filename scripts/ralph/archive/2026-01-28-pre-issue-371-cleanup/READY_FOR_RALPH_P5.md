# ✅ Ralph P5 Phase 1 - READY TO LAUNCH
**Date:** January 24, 2026
**Status:** All files prepared and staged
**Branch:** `ralph/coach-parent-summaries-p5-phase1`

---

## 🎯 What's Ready

### 1. ✅ PRD File Created
**Location:** `/scripts/ralph/prd.json`

**Contents:**
- 8 user stories (US-001 to US-008)
- Preview mode implementation (stories 1-5)
- Trust slider enhancement (stories 6-8)
- Detailed acceptance criteria for each story
- Context about existing P1-P4 infrastructure

**Verify:**
```bash
cat scripts/ralph/prd.json | jq '.project'
# Output: "Coach-Parent AI Summaries - P5 Phase 1 (Preview Mode + Trust Slider)"

cat scripts/ralph/prd.json | jq '.userStories | length'
# Output: 8
```

### 2. ✅ Prompt File Ready
**Location:** `/scripts/ralph/prompt.md`

**Contains:**
- Instructions for Ralph
- Quality requirements
- Progress reporting format
- Browser testing guidelines
- Stop conditions

**Already configured** - no changes needed for P5 Phase 1

### 3. ✅ Pre-Flight Checklist Created
**Location:** `/scripts/ralph/P5_PHASE1_PREFLIGHT_CHECKLIST.md`

**Includes:**
- 8-point pre-flight verification
- Expected file changes
- Success criteria
- Post-flight verification steps
- Emergency troubleshooting

### 4. ✅ Supporting Documentation
All created and ready:
- `/docs/proposals/P5_P6_REVISION_SUMMARY.md` - Overview of P5 & P6 revisions
- `/docs/proposals/COACH_TRUST_CONTROL_UX_ENHANCEMENT.md` - Trust slider UX design
- `/docs/proposals/COACH_TRUST_SYSTEM_PROPOSAL_2026-01-24.md` - Full technical proposal
- `/scripts/ralph/prds/coach-parent-summaries-phase5-REVISED.prd.json` - Complete P5 PRD (all phases)
- `/scripts/ralph/prds/coach-parent-summaries-phase6-REVISED.prd.json` - Complete P6 PRD

---

## 📦 What Ralph Will Build

### Phase 1: Preview Mode + Trust Slider (8 Stories)

#### Stories 1-5: Transparency (Preview Mode)
**US-001:** Add preview mode tracking fields to `coachTrustLevels` schema
- Fields: `previewModeStats`, `confidenceThreshold`
- Tracks 20-message learning period
- Measures coach agreement with AI predictions

**US-002:** Calculate `wouldAutoApprove` predictions
- Modifies `getCoachPendingSummaries` query
- Shows what WOULD auto-approve (doesn't actually auto-approve)
- Logic: `normal` + `level >= 2` + `confidence >= threshold`

**US-003:** Show confidence scores on approval cards
- Progress bar visualization (currently hidden)
- Color coding: red <60%, amber 60-79%, green 80%+
- Makes AI confidence transparent

**US-004:** Add prediction badges to cards
- "AI would auto-send this at Level 2+" badge
- or "Requires manual review" text
- Visual feedback loop for coaches

**US-005:** Track preview mode statistics
- When coach approves/suppresses, track if AI predicted correctly
- Calculate agreement rate over 20 messages
- Determines readiness for actual automation (Phase 2)

#### Stories 6-8: Control (Trust Slider)
**US-006:** Create horizontal slider component
- Replaces radio buttons from Phase 2
- Gradual control (drag anywhere 0-3)
- Visual earned/locked levels
- Industry pattern: Spotify, iPhone

**US-007:** Add progress visualization to slider
- "38 / 50 approvals to Trusted" with progress bar
- Encouraging messages when close
- Color coding based on progress

**US-008:** Integrate slider into settings
- Replace `TrustPreferenceSettings` with `TrustLevelSlider`
- Wire to existing `setCoachPreferredLevel` mutation
- Toast feedback on change

---

## 🚀 How to Launch Ralph

### Step 1: Pre-Flight Checks
Open and review the checklist:
```bash
open scripts/ralph/P5_PHASE1_PREFLIGHT_CHECKLIST.md
```

**Quick verify (copy/paste):**
```bash
# Check git status
git status

# Check dev server
curl http://localhost:3000 -I

# Check quality tools
npm run check-types
npx ultracite fix

# Check PRD ready
cat scripts/ralph/prd.json | jq '.userStories | length'
```

### Step 2: Launch Ralph
```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/ralph.sh 10
```

**What happens:**
1. Creates branch `ralph/coach-parent-summaries-p5-phase1`
2. Implements US-001 (schema changes)
3. Runs quality checks
4. Commits if passing
5. Repeats for US-002 through US-008
6. Stops when all stories pass or 10 iterations reached

### Step 3: Monitor Progress
**In another terminal window:**
```bash
# Watch progress file
tail -f scripts/ralph/progress.txt

# Or check status periodically
cat scripts/ralph/prd.json | jq '.userStories[] | {id, title, passes}'
```

---

## ✅ Success Criteria

### When Ralph Finishes Successfully
You'll see:
```bash
cat scripts/ralph/prd.json | jq '.userStories[] | select(.passes == false)'
# Returns: (empty - no failures)
```

### Manual Verification
1. Navigate to Voice Notes dashboard
2. ✅ See confidence scores on pending summaries (progress bar)
3. ✅ See "AI would auto-send" or "Requires manual review" badges
4. Open Settings tab
5. ✅ See horizontal slider (not radio buttons)
6. ✅ See progress: "X / Y approvals to next level"
7. ✅ Can drag slider left/right
8. ✅ Toast appears when changing level

### Quality Checks Pass
```bash
npm run check-types  # ✅ Passes
npx ultracite fix     # ✅ No issues
npm run check         # ✅ Passes
```

---

## 📊 Expected Timeline

### If Everything Goes Smoothly
- **Story 1 (Schema):** 15-20 minutes
- **Story 2 (Backend query):** 20-25 minutes
- **Story 3 (Confidence viz):** 15-20 minutes
- **Story 4 (Prediction badge):** 10-15 minutes
- **Story 5 (Tracking logic):** 25-30 minutes
- **Story 6 (Slider component):** 30-35 minutes
- **Story 7 (Progress viz):** 20-25 minutes
- **Story 8 (Integration):** 15-20 minutes

**Total:** 2.5-3 hours (if no issues)

**Realistic with retries:** 4-6 hours

### If Ralph Hits Issues
Each iteration takes 5-20 minutes depending on:
- Complexity of story
- Number of files to read
- Type errors encountered
- Quality check failures

**10 iterations max** = up to 3-4 hours wall clock time

---

## 🎯 What This Achieves

### User Experience Changes
**Before P5 Phase 1:**
- ❌ Confidence scores hidden (coaches can't see AI confidence)
- ❌ No preview of automation (don't know what AI would do)
- ❌ Binary trust settings (radio buttons feel rigid)
- ❌ Can't see progress to next level

**After P5 Phase 1:**
- ✅ **Confidence scores visible** (transparency, coaches see AI isn't guessing)
- ✅ **Prediction badges** ("AI would auto-send at Level 2+")
- ✅ **Preview mode tracking** (measures agreement before automating)
- ✅ **Horizontal slider** (gradual, intuitive control)
- ✅ **Progress visualization** ("38 / 50 approvals to Trusted")
- ✅ **NO auto-approval yet** (Phase 2 feature - this is pure preview)

### Zero Risk
- Nothing auto-approves (all manual review still required)
- Just shows predictions + better UI
- Builds trust and understanding
- Gathers data for Phase 2 decision

### Data Collected
After 2 weeks in production:
- Agreement rates per coach (do they approve what AI predicts?)
- Confidence score distribution (are most summaries 70%+?)
- Slider engagement (do coaches adjust levels?)
- Preview mode completion (how many reach 20 messages?)

**Decision point:** If agreement rates >70%, proceed to Phase 2 (actual auto-approval)

---

## 📝 After Ralph Completes

### Immediate Next Steps
1. ✅ Verify all stories pass (check prd.json)
2. ✅ Run quality checks (typecheck, lint)
3. ✅ Manual testing (visual verification)
4. ✅ Review commits (`git log --oneline -10`)
5. ✅ Read progress.txt learnings

### Merge to Main
```bash
git checkout main
git merge ralph/coach-parent-summaries-p5-phase1
git push origin main
```

### Deploy & Monitor
1. Deploy to production
2. **Wait 2 weeks** (let coaches use preview mode)
3. Monitor metrics:
   - Query `coachTrustLevels` for `previewModeStats`
   - Check `agreementRate` field (target >70%)
   - Survey coaches: "Are predictions accurate?"
4. If agreement high → Plan Phase 2 (Auto-Approval)
5. If agreement low → Adjust thresholds, iterate

### Future Phases (After Phase 1 Success)
- **Phase 2:** Supervised Auto-Approval (1-hour revoke window)
- **Phase 3:** Cost Optimization (90% savings via prompt caching)
- **Phase 4:** Learning Loop (adaptive thresholds)
- **Phase 5:** (Future) Intelligent nudges
- **Phase 6:** Monitoring & safeguards

---

## 🆘 Troubleshooting

### If Ralph Gets Stuck
**Symptom:** Same story failing repeatedly (3+ times)

**Action:**
1. Read `progress.txt` for error pattern
2. Check if story too large (should it be split?)
3. Manually fix the blocking issue
4. Update `prd.json` to mark story as `passes: true`
5. Let Ralph continue with remaining stories

### If Quality Checks Fail
**Symptom:** Type errors or lint errors after story

**Action:**
1. Ralph documents error in `progress.txt`
2. Review the error
3. Either:
   - Let Ralph retry (it learns from failures)
   - Manually fix and mark story complete
   - Simplify story acceptance criteria

### If Branch Conflicts
**Symptom:** Branch already exists

**Action:**
```bash
# Delete old branch if needed
git branch -D ralph/coach-parent-summaries-p5-phase1

# Or use different branch name in prd.json
```

---

## 📁 File Locations Summary

### Ralph Files (Ready)
- ✅ `/scripts/ralph/prd.json` - P5 Phase 1 PRD (8 stories)
- ✅ `/scripts/ralph/prompt.md` - Ralph instructions
- ✅ `/scripts/ralph/P5_PHASE1_PREFLIGHT_CHECKLIST.md` - Pre-flight checklist
- ✅ `/scripts/ralph/READY_FOR_RALPH_P5.md` - This file

### Documentation (Reference)
- ✅ `/docs/proposals/P5_P6_REVISION_SUMMARY.md`
- ✅ `/docs/proposals/COACH_TRUST_CONTROL_UX_ENHANCEMENT.md`
- ✅ `/docs/proposals/COACH_TRUST_SYSTEM_PROPOSAL_2026-01-24.md`
- ✅ `/docs/status/VOICE_NOTES_TRUST_SYSTEM_STATUS_2026-01-24.md`

### PRDs (Full Phases - Reference)
- ✅ `/scripts/ralph/prds/coach-parent-summaries-phase5-REVISED.prd.json` (20 stories)
- ✅ `/scripts/ralph/prds/coach-parent-summaries-phase6-REVISED.prd.json` (22 stories)

---

## ✨ Ready to Launch!

**Everything is staged and ready. To start Ralph:**

```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/ralph.sh 10
```

**Ralph will:**
1. Create branch `ralph/coach-parent-summaries-p5-phase1`
2. Implement 8 stories (preview mode + trust slider)
3. Run quality checks after each story
4. Commit if passing
5. Stop when all pass or 10 iterations reached

**You'll see:**
- Confidence scores on all summaries (transparency!)
- "AI would auto-send" prediction badges
- Beautiful horizontal trust slider
- Real-time progress to next level

**Then:**
- Merge to main
- Deploy to production
- Monitor for 2 weeks
- Proceed to Phase 2 (auto-approval) when ready

---

**🚀 LAUNCH RALPH WHEN READY! 🚀**
