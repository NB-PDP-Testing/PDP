# P5 Phase 2 - Pre-Flight Checklist
**Date:** January 24, 2026
**Branch:** `ralph/coach-parent-summaries-p5-phase2`
**Stories:** 6 user stories (US-006 to US-011)
**Estimated Time:** 5-7 hours

---

## ✅ Pre-Flight Checks

### 1. Git Status
- [ ] Current branch: `ralph/coach-parent-summaries-p5` (Phase 1 complete)
- [ ] Working directory clean (no uncommitted changes)
- [ ] Phase 1 commits pushed: 2e040b8, f8dae44, b9c713a
- [ ] Ready to create new branch for Phase 2

**Verify with:**
```bash
git status
git log --oneline -5
git branch --show-current
```

### 2. Dev Server Running
- [ ] Dev server running on http://localhost:3000
- [ ] Can access Voice Notes dashboard at `/orgs/[orgId]/coach/voice-notes`
- [ ] Can login with test account: `neil.B@blablablak.com` / `lien1979`

**Verify with:**
```bash
curl http://localhost:3000 -I
```

### 3. Dependencies Installed
- [ ] Node modules up to date
- [ ] Convex backend connected
- [ ] All packages installed in workspace

**Verify with:**
```bash
npm install
npx -w packages/backend convex codegen
```

### 4. Quality Tools Working
- [ ] TypeScript type checking works
- [ ] Ultracite linting works
- [ ] No existing type errors from Phase 1

**Verify with:**
```bash
npm run check-types
npx ultracite fix
npm run check
```

### 5. Phase 1 Infrastructure Verified
- [ ] `coachTrustLevels.previewModeStats` field exists in schema
- [ ] `coachTrustLevels.confidenceThreshold` field exists in schema
- [ ] `wouldAutoApprove` calculation exists in getCoachPendingSummaries
- [ ] Confidence visualization shows on summary cards
- [ ] Trust slider component exists and works
- [ ] Preview mode tracking in approve/suppress mutations works

**Verify with:**
```bash
# Check schema changes from Phase 1
grep -A 10 "previewModeStats" packages/backend/convex/schema.ts

# Check wouldAutoApprove implementation
grep -A 5 "wouldAutoApprove" packages/backend/convex/models/coachParentSummaries.ts

# Check trust slider component exists
ls -la apps/web/src/components/coach/trust-level-slider.tsx
```

### 6. Existing Queries/Mutations Work
- [ ] `getCoachPendingSummaries` query returns summaries with wouldAutoApprove
- [ ] `getCoachTrustLevel` query returns trust level data
- [ ] `approveSummary` mutation updates preview stats
- [ ] `suppressSummary` mutation updates preview stats
- [ ] `setCoachPreferredLevel` mutation updates trust level

**Manual verification:**
- Login to app
- Navigate to `/orgs/[orgId]/coach/voice-notes`
- Verify pending summaries show confidence scores and badges
- Open Settings tab, verify slider works

### 7. Ralph Files Ready
- [ ] `prd.json` contains P5 Phase 2 stories (US-006 to US-011)
- [ ] `progress.txt` has Phase 1 completion documented
- [ ] `progress.txt` has Phase 2 starting point documented

**Verify with:**
```bash
cat scripts/ralph/prd.json | jq '.project'
# Should output: "P5 Phase 2 - Supervised Auto-Approval"

cat scripts/ralph/prd.json | jq '.userStories | length'
# Should output: 6

tail -100 scripts/ralph/progress.txt | grep "P5 PHASE 2"
```

### 8. Schema Ready for Phase 2 Changes
- [ ] `coachParentSummaries` table has status field
- [ ] `parentSummaryViews` table exists (for revoke checking)
- [ ] Can add new optional fields to coachParentSummaries

**Verify with:**
```bash
grep -A 30 "coachParentSummaries" packages/backend/convex/schema.ts | head -40
grep "parentSummaryViews" packages/backend/convex/schema.ts
```

---

## 📋 What Ralph Will Do (Phase 2)

### Backend Changes (US-006 to US-009)
**US-006: Schema Changes**
- Add autoApprovalDecision object to coachParentSummaries
- Add scheduledDeliveryAt (for 1-hour window)
- Add revoke fields (revokedAt, revokedBy, revocationReason)

**US-007: Pure Logic Function**
- Create lib/autoApprovalDecision.ts
- Pure function: decideAutoApproval(trustLevel, summary)
- Returns: { shouldAutoApprove, reason, tier, decidedAt }

**US-008: Auto-Approval Integration**
- Modify createParentSummary mutation
- Call decideAutoApprove after creating summary
- If shouldAutoApprove: set status='auto_approved', approvedAt, approvedBy='system:auto', scheduledDeliveryAt

**US-009: Revoke Mutation**
- Add revokeSummary mutation
- Check: status='auto_approved' AND not viewed AND within 1-hour window
- If valid: change status to 'suppressed', set revoke fields
- Update trust metrics (revoke counts as suppression)

### Frontend Changes (US-010 to US-011)
**US-010: Auto-Sent Dashboard**
- Create getAutoApprovedSummaries query (last 7 days)
- Create AutoApprovedTab component
- Display table: Player, Summary, Confidence, Sent At, Status, Revoke button
- Revoke button disabled if viewed or past 1-hour window

**US-011: Dashboard Integration**
- Add AutoApprovedTab to voice-notes-dashboard.tsx
- Conditional: only show if trustLevel.currentLevel >= 2
- Tab label: 'Auto-Sent' (optional count badge)
- Position after Parents tab

### Expected File Changes
**Created:**
- packages/backend/convex/lib/autoApprovalDecision.ts
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/auto-approved-tab.tsx

**Modified:**
- packages/backend/convex/schema.ts
- packages/backend/convex/models/coachParentSummaries.ts
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx

### Success Criteria
**After Ralph completes:**
- ✅ Level 2+ summaries auto-approve with 1-hour window
- ✅ Coach can revoke auto-approved summaries
- ✅ Auto-Sent tab visible to level 2+ coaches
- ✅ Audit trail for all auto-decisions
- ✅ All type checks pass
- ✅ All linting passes
- ✅ NO summaries sent to parents yet (scheduledDeliveryAt in future)

---

## 🚀 Running Ralph

### Command
```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/ralph.sh 10
```

**Parameters:**
- `10` = maximum iterations (Ralph will stop after 10 attempts or when all stories pass)

### What to Expect
1. Ralph creates branch `ralph/coach-parent-summaries-p5-phase2`
2. Picks highest priority incomplete story (US-006)
3. Implements the story
4. Runs quality checks (typecheck, lint)
5. Commits if passing
6. Updates `prd.json` to mark story complete
7. Documents learnings in `progress.txt`
8. Repeats for next story
9. Stops when all 6 stories have `passes: true`

### Monitoring Progress
**During execution:**
```bash
# Watch progress file (in another terminal)
tail -f scripts/ralph/progress.txt

# Check git log
git log --oneline -10

# Check PRD status
cat scripts/ralph/prd.json | jq '.userStories[] | {id, title, passes}'
```

---

## 🛑 If Something Goes Wrong

### Story Fails Quality Checks
Ralph will:
- Document the failure in `progress.txt`
- Leave story marked `passes: false`
- Move to next iteration to retry or skip

**You can:**
- Review `progress.txt` for error details
- Manually fix the issue
- Update `prd.json` to mark story complete
- Let Ralph continue with next story

### Critical Errors to Watch For
**Schema issues:**
- If codegen fails, check for syntax errors in schema.ts
- Ensure optional fields use v.optional()
- Check that new fields don't conflict with existing ones

**Type errors:**
- autoApprovalDecision interface must match schema
- decideAutoApproval function signature must match usage
- Mutation return types must have validators

**Logic errors:**
- Don't auto-approve if sensitivityCategory !== 'normal'
- Check effectiveLevel (not just currentLevel)
- Verify 1-hour window calculation (60 * 60 * 1000 milliseconds)

---

## ✅ Post-Flight Verification

### After Ralph Completes

**1. Check All Stories Pass**
```bash
cat scripts/ralph/prd.json | jq '.userStories[] | select(.passes == false)'
# Should return empty (no false stories)
```

**2. Verify Quality Checks**
```bash
npm run check-types  # Must pass
npx ultracite fix     # Must pass
npm run check         # Must pass
```

**3. Manual Testing**
**Backend verification:**
- [ ] Schema has autoApprovalDecision, scheduledDeliveryAt, revoke fields
- [ ] lib/autoApprovalDecision.ts exports decideAutoApproval function
- [ ] revokeSummary mutation exists and has proper validators

**Frontend verification:**
- [ ] Navigate to Voice Notes dashboard as level 2+ coach
- [ ] Auto-Sent tab visible
- [ ] Table shows auto-approved summaries
- [ ] Revoke button appears for recent auto-approvals

**4. Review Commits**
```bash
git log --oneline --graph ralph/coach-parent-summaries-p5-phase2
# Should see ~6 commits for 6 stories
```

**5. Check Progress Documentation**
```bash
# Read learnings from all iterations
tail -300 scripts/ralph/progress.txt
# Should have entries for each story with commit hashes
```

### Functional Testing
**Test auto-approval logic:**
1. Create a voice note with high confidence (>70%)
2. Verify summary created with status 'auto_approved'
3. Check scheduledDeliveryAt is ~1 hour in future
4. Check autoApprovalDecision has reason

**Test revoke:**
1. Navigate to Auto-Sent tab
2. Find recent auto-approved summary
3. Click Revoke button
4. Confirm dialog
5. Verify status changes to 'suppressed'
6. Verify revokedAt, revokedBy fields set

**Test conditional tab visibility:**
1. Login as level 0 or 1 coach
2. Verify Auto-Sent tab NOT visible
3. Login as level 2+ coach
4. Verify Auto-Sent tab IS visible

---

## 📝 Next Steps After Phase 2

### If Phase 2 Succeeds
1. Merge to main: `git checkout main && git merge ralph/coach-parent-summaries-p5-phase2`
2. Push to remote: `git push origin main`
3. Deploy to production
4. **Monitor for 1 week:**
   - Check revocation rates (<5% target)
   - Check auto-approval rates (>30% at level 2 target)
   - Survey coaches: "I trust auto-approval" (>80% target)
5. If metrics good → proceed to Phase 3 (Cost Optimization)
6. If metrics bad → investigate and adjust thresholds

### If Phase 2 Partial Success
1. Review which stories failed
2. Document issues for manual fix
3. Complete remaining stories manually or with Ralph rerun
4. Then follow "If Phase 2 Succeeds" steps

### Monitoring After Deployment
- Query `coachParentSummaries` for auto-approved summaries
- Check `revokedAt` IS NOT NULL count (revocation rate)
- Check scheduled delivery job works (Phase 2.5 or P6)
- Monitor parent feedback for errors

---

**Ready to launch Ralph? Double-check this checklist, then run: `./scripts/ralph/ralph.sh 10`**
