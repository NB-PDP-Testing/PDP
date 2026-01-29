# ✅ P5 Phase 2 - READY TO LAUNCH
**Date:** January 24, 2026
**Status:** All files prepared and staged
**Branch:** `ralph/coach-parent-summaries-p5-phase2` (will be created by Ralph)

---

## 🎯 Phase 2 Overview: Supervised Auto-Approval

**Goal:** Enable actual auto-approval for level 2+ coaches with 1-hour safety net

**Stories:** 6 (US-006 to US-011)
**Estimated Time:** 5-7 hours
**Risk Level:** Moderate (first real automation, but supervised)

---

## ✅ What's Ready

### 1. ✅ PRD File Created
**Location:** `/scripts/ralph/prd.json`

**Contains:**
- 6 user stories (US-006 to US-011)
- Backend changes: Schema, pure logic, auto-approval, revoke
- Frontend changes: Auto-Sent tab, dashboard integration
- Detailed acceptance criteria for each story
- Context from Phase 1 completion

**Verify:**
```bash
cat scripts/ralph/prd.json | jq '.project'
# Output: "Coach-Parent AI Summaries - P5 Phase 2 (Supervised Auto-Approval)"

cat scripts/ralph/prd.json | jq '.userStories | length'
# Output: 6
```

### 2. ✅ Prompt File Ready
**Location:** `/scripts/ralph/prompt.md`

**Contains:**
- Instructions for Ralph
- Quality requirements
- Progress reporting format
- Browser testing guidelines
- Stop conditions

**Already configured** - no changes needed for P5 Phase 2

### 3. ✅ Progress.txt Updated
**Location:** `/scripts/ralph/progress.txt`

**Includes:**
- P5 Phase 1 completion summary (8 stories, all passing)
- Key learnings from Phase 1
- Patterns to reuse in Phase 2
- Phase 2 starting point with code snippets
- Expected outcomes and files to modify

**Optimized:** 18KB (down from 129KB), lean and focused

### 4. ✅ Pre-Flight Checklist Created
**Location:** `/scripts/ralph/P5_PHASE2_PREFLIGHT_CHECKLIST.md`

**Includes:**
- 8-point pre-flight verification
- Expected file changes
- Success criteria
- Post-flight verification steps
- Functional testing procedures
- Emergency troubleshooting

### 5. ✅ Phase Summary Files
**Locations:**
- `/scripts/ralph/prds/p5-phase1-preview-mode.prd.json` (COMPLETE)
- `/scripts/ralph/prds/p5-phase2-auto-approval.prd.json` (READY)
- `/scripts/ralph/prds/p5-phase3-cost-optimization.prd.json` (PLANNED)
- `/scripts/ralph/prds/p5-phase4-learning-loop.prd.json` (PLANNED)

**Index:** `/scripts/ralph/P5_P6_PRD_INDEX.md` (Quick reference for all phases)

---

## 📦 What Ralph Will Build

### Phase 2: Supervised Auto-Approval (6 Stories)

#### Stories 006-009: Backend Auto-Approval (4 stories)
**US-006:** Add auto-approval decision fields to schema
- autoApprovalDecision object (audit trail)
- scheduledDeliveryAt (1-hour window)
- Revoke fields (revokedAt, revokedBy, revocationReason)

**US-007:** Create autoApprovalDecision lib (pure function)
- Pure function: decideAutoApproval(trustLevel, summary)
- Logic: Level 2 checks confidence >= threshold
- Logic: Level 3 auto-approves all normal
- Logic: NEVER auto-approve injury/behavior

**US-008:** Implement auto-approval in createParentSummary
- Call decideAutoApprove after creating summary
- If shouldAutoApprove: status='auto_approved', approvedBy='system:auto'
- Set scheduledDeliveryAt = approvedAt + 1 hour
- Store decision in autoApprovalDecision field

**US-009:** Implement revokeSummary mutation
- Check: status='auto_approved' AND not viewed AND within 1-hour
- If valid: status='suppressed', set revoke fields
- Update trust metrics (revoke counts as suppression)
- Safety net for coaches

#### Stories 010-011: Frontend Dashboard (2 stories)
**US-010:** Create AutoApprovedTab component and query
- Query: getAutoApprovedSummaries (last 7 days)
- Table: Player, Summary, Confidence, Sent At, Status, Revoke
- Revoke button with confirmation dialog
- Status badges: Pending/Delivered/Viewed/Revoked

**US-011:** Add AutoApprovedTab to dashboard
- Conditional visibility: level 2+ only
- Tab label: 'Auto-Sent' (optional badge count)
- Position after Parents tab
- Wire success/error handlers

**Key Design Decisions:**
- ✅ 1-hour revoke window (supervised, not instant)
- ✅ approvedBy='system:auto' (distinguishes from manual)
- ✅ Revokes count as suppressions (slight trust penalty)
- ✅ Audit trail for compliance
- ✅ Tab visibility adapts to trust progression

---

## 🔑 Key Context from Phase 1

**What Exists (Reuse):**
- ✅ wouldAutoApprove calculation logic (can copy/adapt)
- ✅ Effective level: Math.min(currentLevel, preferredLevel ?? currentLevel)
- ✅ Confidence threshold: confidenceThreshold ?? 0.7
- ✅ Preview mode tracking (agreement rates)
- ✅ Trust slider UI (horizontal, progress bars)
- ✅ Confidence visualization (all ready)

**Phase 1 Files:**
- packages/backend/convex/schema.ts (has previewModeStats)
- packages/backend/convex/models/coachParentSummaries.ts (has wouldAutoApprove logic)
- apps/web/src/components/coach/trust-level-slider.tsx (slider component)
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/summary-approval-card.tsx (confidence viz)

**Phase 1 Learnings:**
- Preview tracking happens BEFORE updateTrustMetrics
- When suppressing: increment wouldAutoApproveSuggestions but NOT coachApprovedThose
- Both parents-tab AND review-tab need prop updates
- Progress visualization shows TO next level (motivating)

---

## 🚀 How to Launch Ralph

### Step 1: Pre-Flight Checks
Open and review the checklist:
```bash
open scripts/ralph/P5_PHASE2_PREFLIGHT_CHECKLIST.md
```

**Quick verify (copy/paste):**
```bash
# Check git status
git status
git log --oneline -5

# Check dev server
curl http://localhost:3000 -I

# Check quality tools
npm run check-types
npx ultracite fix

# Check PRD ready
cat scripts/ralph/prd.json | jq '.userStories | length'
# Should output: 6

# Check Phase 1 complete
git log --grep="US-001" --oneline | head -3
```

### Step 2: Launch Ralph
```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/ralph.sh 10
```

**What happens:**
1. Creates branch `ralph/coach-parent-summaries-p5-phase2`
2. Implements US-006 (schema changes)
3. Runs quality checks
4. Commits if passing
5. Repeats for US-007 through US-011
6. Stops when all stories pass or 10 iterations reached

### Step 3: Monitor Progress
**In another terminal window:**
```bash
# Watch progress file
tail -f scripts/ralph/progress.txt

# Or check status periodically
cat scripts/ralph/prd.json | jq '.userStories[] | {id, title, passes}'

# Check commits
git log --oneline --graph
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
**Backend:**
1. Check schema: autoApprovalDecision, scheduledDeliveryAt, revoke fields exist
2. Check lib: autoApprovalDecision.ts exports decideAutoApproval
3. Check mutation: revokeSummary exists with proper validators

**Frontend:**
1. Navigate to Voice Notes dashboard (as level 2+ coach)
2. ✅ See "Auto-Sent" tab
3. ✅ Table shows auto-approved summaries (if any)
4. ✅ Revoke button appears and works
5. ✅ Tab NOT visible for level 0/1 coaches

### Quality Checks Pass
```bash
npm run check-types  # ✅ Passes
npx ultracite fix     # ✅ No issues
npm run check         # ✅ Passes
```

---

## 📊 Expected Timeline

### If Everything Goes Smoothly
- **Story 6 (Schema):** 15-20 minutes
- **Story 7 (Pure function):** 20-25 minutes
- **Story 8 (Auto-approval):** 30-40 minutes
- **Story 9 (Revoke mutation):** 25-30 minutes
- **Story 10 (AutoApprovedTab):** 40-50 minutes
- **Story 11 (Dashboard integration):** 15-20 minutes

**Total:** 2.5-3 hours (if no issues)

**Realistic with retries:** 5-7 hours

### If Ralph Hits Issues
Each iteration takes 5-20 minutes depending on:
- Complexity of story
- Number of files to read
- Type errors encountered
- Quality check failures

**10 iterations max** = up to 4-5 hours wall clock time

---

## 🎯 What This Achieves

### User Experience Changes
**Before P5 Phase 2:**
- ❌ All summaries require manual approval (even high confidence)
- ❌ No automation despite "Trusted" level 2
- ❌ Coaches spend time on repetitive approvals
- ❌ No way to undo once approved

**After P5 Phase 2:**
- ✅ **Level 2+ summaries auto-approve** (if normal + confidence >= threshold)
- ✅ **1-hour revoke window** (coach can catch mistakes)
- ✅ **Auto-Sent dashboard** (transparency, see what went out)
- ✅ **Audit trail** (every auto-decision logged with reason)
- ✅ **Supervised automation** (not instant send, safety net)
- ❌ **Still no delivery** (scheduled delivery in Phase 2.5 or P6)

### Risk Level
**Low to Moderate:**
- Parents don't see summaries for 1 hour (revoke window)
- Coach can revoke mistakes immediately
- Only level 2+ coaches get automation (earned trust)
- Injury/behavior NEVER auto-approve
- Audit trail for compliance

### Data Collected
After 1 week in production:
- Revocation rates per coach (target <5%)
- Auto-approval rates (target >30% at level 2)
- Coach feedback: "I trust auto-approval" (target >80%)
- Patterns: What gets revoked and why

**Decision point:** If metrics good → Phase 3 (Cost Optimization)

---

## 📝 After Ralph Completes

### Immediate Next Steps
1. ✅ Verify all stories pass (check prd.json)
2. ✅ Run quality checks (typecheck, lint)
3. ✅ Manual testing (functional verification)
4. ✅ Review commits (`git log --oneline -10`)
5. ✅ Read progress.txt learnings

### Merge to Main
```bash
git checkout main
git merge ralph/coach-parent-summaries-p5-phase2
git push origin main
```

### Deploy & Monitor
1. Deploy to production
2. **Monitor for 1 week**
3. Check metrics:
   - Query `coachParentSummaries` for auto-approved count
   - Query `coachParentSummaries` where revokedAt IS NOT NULL (revocation rate)
   - Survey coaches: "Do you trust auto-approval?"
4. If metrics good → Plan Phase 3 (Cost Optimization)
5. If metrics bad → Adjust thresholds, iterate

### Future Phases (After Phase 2 Success)
- **Phase 3:** Cost Optimization (90% savings via prompt caching)
- **Phase 4:** Learning Loop (adaptive thresholds)
- **P6:** Monitoring & safeguards (cost budgets, rate limits, circuit breakers)

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

### Common Issues
**Schema errors:**
- Ensure optional fields use `v.optional()`
- Check for typos in field names
- Verify codegen runs successfully

**Type errors in pure function:**
- AutoApprovalDecision interface must match schema
- Function signature must match usage
- Return types must have all required fields

**Revoke mutation issues:**
- Check parentSummaryViews index exists
- Verify 1-hour calculation (60 * 60 * 1000)
- Ensure proper error messages

---

## 📁 File Locations Summary

### Ralph Files (Ready)
- ✅ `/scripts/ralph/prd.json` - P5 Phase 2 PRD (6 stories)
- ✅ `/scripts/ralph/prompt.md` - Ralph instructions
- ✅ `/scripts/ralph/progress.txt` - Optimized, Phase 1 learnings + Phase 2 context
- ✅ `/scripts/ralph/P5_PHASE2_PREFLIGHT_CHECKLIST.md` - Pre-flight checks
- ✅ `/scripts/ralph/P5_PHASE2_READY.md` - This file

### Documentation (Reference)
- ✅ `/scripts/ralph/P5_P6_PRD_INDEX.md` - Index of all phases
- ✅ `/scripts/ralph/prds/p5-phase2-auto-approval.prd.json` - Phase 2 summary
- ✅ `/scripts/ralph/prds/coach-parent-summaries-phase5-REVISED.prd.json` - Full P5 PRD
- ✅ `/docs/proposals/COACH_TRUST_CONTROL_UX_ENHANCEMENT.md` - Trust slider UX
- ✅ `/docs/proposals/COACH_TRUST_SYSTEM_PROPOSAL_2026-01-24.md` - Trust system proposal

### Phase 1 Archive
- ✅ `/scripts/ralph/archive/progress-p1-p4-full.txt.bak` - Full P1-P4 history

---

## ✨ Ready to Launch!

**Everything is staged and ready. To start Ralph:**

```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/ralph.sh 10
```

**Ralph will:**
1. Create branch `ralph/coach-parent-summaries-p5-phase2`
2. Implement 6 stories (auto-approval + dashboard)
3. Run quality checks after each story
4. Commit if passing
5. Stop when all pass or 10 iterations reached

**You'll see:**
- Auto-approval for level 2+ coaches
- 1-hour revoke window (safety net)
- Auto-Sent dashboard tab
- Audit trail for compliance

**Then:**
- Merge to main
- Deploy to production
- Monitor for 1 week
- Proceed to Phase 3 when metrics good

---

**🚀 LAUNCH RALPH WHEN READY! 🚀**
