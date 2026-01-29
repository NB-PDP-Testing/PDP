# P5 Phase 1 - Pre-Flight Checklist
**Date:** January 24, 2026
**Branch:** `ralph/coach-parent-summaries-p5`
**Stories:** 8 user stories (US-001 to US-008)
**Estimated Time:** 6-8 hours

---

## ✅ Pre-Flight Checks

### 1. Git Status
- [ ] Current branch: `main`
- [ ] Working directory clean (no uncommitted changes)
- [ ] All recent commits pushed to remote
- [ ] Ready to create new branch

**Verify with:**
```bash
git status
git log --oneline -5
```

### 2. Dev Server Running
- [ ] Dev server running on http://localhost:3000
- [ ] Can access Voice Notes dashboard at `/orgs/[orgId]/coach/voice-notes`
- [ ] Can login with test account: `neil.B@blablablak.com` / `lien1979`

**Verify with:**
```bash
# Check if server is running
curl http://localhost:3000 -I

# Or start if needed
npm run dev
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
- [ ] No existing type errors

**Verify with:**
```bash
npm run check-types
npx ultracite fix
npm run check
```

### 5. Existing P1-P4 Infrastructure
- [ ] `coachParentSummaries` table exists with `publicSummary.confidenceScore` field
- [ ] `coachTrustLevels` table exists with `currentLevel`, `preferredLevel`, `totalApprovals`
- [ ] `getCoachPendingSummaries` query returns summaries
- [ ] `getCoachTrustLevel` query returns trust data
- [ ] Voice notes dashboard renders correctly

**Verify with:**
```bash
# Check schema
grep -A 20 "coachTrustLevels" packages/backend/convex/schema.ts

# Check backend files exist
ls -la packages/backend/convex/models/coachParentSummaries.ts
ls -la packages/backend/convex/models/coachTrustLevels.ts
ls -la packages/backend/convex/lib/trustLevelCalculator.ts
```

### 6. Frontend Components Exist
- [ ] `summary-approval-card.tsx` exists
- [ ] `trust-preference-settings.tsx` exists (will be replaced by slider)
- [ ] `voice-notes-dashboard.tsx` exists
- [ ] `settings-tab.tsx` exists

**Verify with:**
```bash
ls -la apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/summary-approval-card.tsx
ls -la apps/web/src/components/coach/trust-preference-settings.tsx
ls -la apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx
ls -la apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx
```

### 7. Ralph Files Ready
- [ ] `prd.json` contains P5 Phase 1 stories (8 stories)
- [ ] `prompt.md` has instructions
- [ ] `progress.txt` exists (will be appended to)

**Verify with:**
```bash
cat scripts/ralph/prd.json | jq '.project'
cat scripts/ralph/prd.json | jq '.userStories | length'
ls -la scripts/ralph/progress.txt
```

### 8. Test Data Available
- [ ] Can create voice notes in the app
- [ ] Voice notes generate summaries
- [ ] Summaries appear in pending approval queue
- [ ] Trust level displays in dashboard

**Manual verification:**
- Login to app
- Navigate to `/orgs/[orgId]/coach/voice-notes`
- Verify pending summaries exist or can create new voice note

---

## 📋 What Ralph Will Do

### Phase 1 Overview: Preview Mode + Trust Slider (8 Stories)

**Stories 1-5: Preview Mode (Transparency)**
1. Add preview mode tracking fields to schema
2. Calculate wouldAutoApprove predictions for each summary
3. Show confidence scores that are currently hidden
4. Add "AI would auto-send" prediction badges
5. Track agreement rate between AI predictions and coach decisions

**Stories 6-8: Trust Slider (Control)**
6. Create new horizontal slider component
7. Add real-time progress visualization
8. Replace old radio buttons with slider in settings

### Expected Changes
**Files Created:**
- `apps/web/src/components/coach/trust-level-slider.tsx` (new slider component)

**Files Modified:**
- `packages/backend/convex/schema.ts` (add preview mode fields)
- `packages/backend/convex/models/coachParentSummaries.ts` (add wouldAutoApprove calculation)
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/summary-approval-card.tsx` (show confidence + badge)
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx` (use new slider)

**Commits:**
- Approximately 8 commits (one per story if all pass on first try)
- Branch: `ralph/coach-parent-summaries-p5-phase1`

### Success Criteria
**After Ralph completes:**
- ✅ Coaches see confidence scores on all pending summaries
- ✅ Coaches see "AI would auto-send" badges on eligible summaries
- ✅ Preview mode statistics tracked (20-message learning period)
- ✅ New horizontal slider in settings (replaces radio buttons)
- ✅ Progress bar shows "38/50 approvals to Trusted"
- ✅ All type checks pass
- ✅ All linting passes
- ✅ NO summaries auto-approve (Phase 2 feature, not Phase 1)

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
1. Ralph creates branch `ralph/coach-parent-summaries-p5-phase1`
2. Picks highest priority incomplete story (US-001)
3. Implements the story
4. Runs quality checks (typecheck, lint)
5. Commits if passing
6. Updates `prd.json` to mark story complete
7. Documents learnings in `progress.txt`
8. Repeats for next story
9. Stops when all 8 stories have `passes: true`

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

**Session tracking:**
```bash
# Ralph automatically captures session IDs
cat scripts/ralph/session-history.txt

# View auto-extracted insights
ls -t scripts/ralph/insights/ | head -3
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

### Ralph Runs Out of Context
Ralph will:
- Commit partial progress
- Document exactly what's left to do in `progress.txt`
- Exit gracefully
- Next iteration picks up where it left off

**No action needed** - this is expected behavior

### Too Many Iterations
If Ralph hits 10 iterations without completing:
- Review `progress.txt` for patterns (same story failing repeatedly?)
- Check if stories are too large (should they be split?)
- Manually complete problematic stories
- Run Ralph again for remaining stories

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
- [ ] Navigate to Voice Notes dashboard
- [ ] Pending summaries show confidence scores with progress bars
- [ ] Pending summaries show "AI would auto-send" or "Requires manual review" badges
- [ ] Open Settings tab
- [ ] See horizontal trust slider (not radio buttons)
- [ ] Slider shows progress bar to next level
- [ ] Can drag slider left/right to change preference
- [ ] Approve a high-confidence summary → preview stats increment (check DB or logs)

**4. Review Commits**
```bash
git log --oneline --graph ralph/coach-parent-summaries-p5-phase1
# Should see ~8 commits for 8 stories
```

**5. Check Progress Documentation**
```bash
# Read learnings from all iterations
cat scripts/ralph/progress.txt
# Should have entries for each story with commit hashes
```

### Visual Verification
**Using dev-browser or manual:**
1. Login: `neil.B@blablablak.com` / `lien1979`
2. Navigate to: `/orgs/[orgId]/coach/voice-notes`
3. Verify: Pending summaries show confidence visualization
4. Verify: "AI would auto-send" badges appear
5. Open: Settings tab
6. Verify: Horizontal slider replaces radio buttons
7. Verify: Progress bar shows "X / Y approvals to next level"
8. Drag: Slider left/right
9. Verify: Toast appears confirming change

---

## 📝 Next Steps After Phase 1

### If Phase 1 Succeeds
1. Merge to main: `git checkout main && git merge ralph/coach-parent-summaries-p5-phase1`
2. Push to remote: `git push origin main`
3. Deploy to production
4. **Monitor preview mode for 2 weeks**
5. Analyze agreement rates (are coaches >70% aligned with AI predictions?)
6. If agreement high → proceed to Phase 2 (Auto-Approval)
7. If agreement low → investigate and adjust thresholds

### If Phase 1 Partial Success
1. Review which stories failed
2. Document issues for manual fix
3. Complete remaining stories manually or with Ralph rerun
4. Then follow "If Phase 1 Succeeds" steps

### Monitoring After Deployment
- Check `coachTrustLevels` records for `previewModeStats`
- Look for coaches with `agreementRate` > 0.7 (ready for automation)
- Survey coaches: "Do you understand the confidence scores? Are predictions accurate?"
- Gather feedback before proceeding to Phase 2

---

## 🆘 Emergency Contacts / Resources

### If Ralph Breaks
- Review logs: `scripts/ralph/progress.txt`
- Review conversation: `~/.claude/projects/-Users-neil-Documents-GitHub-PDP/[session-id].jsonl`
- Parse conversation: `./scripts/ralph/parse-conversation.sh [session-id]`
- View insights: `cat scripts/ralph/insights/iteration-N-[session].md`

### Key Documentation
- P5 Full PRD: `scripts/ralph/prds/coach-parent-summaries-phase5-REVISED.prd.json`
- P6 Full PRD: `scripts/ralph/prds/coach-parent-summaries-phase6-REVISED.prd.json`
- Trust Slider UX: `docs/proposals/COACH_TRUST_CONTROL_UX_ENHANCEMENT.md`
- Status Document: `docs/status/VOICE_NOTES_TRUST_SYSTEM_STATUS_2026-01-24.md`
- This Summary: `docs/proposals/P5_P6_REVISION_SUMMARY.md`

### Codebase References
- Current P1-P4 implementation all working on `main` branch
- Trust calculator: `packages/backend/convex/lib/trustLevelCalculator.ts`
- Schema: `packages/backend/convex/schema.ts` (line ~1630 for summaries, ~1795 for trust)
- Voice Notes models: `packages/backend/convex/models/coachParentSummaries.ts`
- Trust models: `packages/backend/convex/models/coachTrustLevels.ts`

---

**Ready to launch Ralph? Double-check this checklist, then run: `./scripts/ralph/ralph.sh 10`**
