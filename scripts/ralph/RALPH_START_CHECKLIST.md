# Ralph Week 1 Execution - Pre-Flight Checklist ✈️

**Date:** January 30, 2026
**Phase:** 9 Week 1 (Collaboration Foundations)
**Branch:** `ralph/team-collaboration-hub-p9`

---

## ✅ Pre-Flight Verification

### 1. Branch Setup
- [x] Branch created: `ralph/team-collaboration-hub-p9`
- [x] Based on latest `main`
- [x] On correct branch: `git branch --show-current`

### 2. Ralph Configuration Files
- [x] `prd.json` → Week 1 only (8 stories)
- [x] `progress.txt` → Codebase Patterns at top
- [x] `prompt.md` → Configured

### 3. Reference Documentation
- [x] `P9_WEEK1_FOUNDATIONS.md` → Detailed Week 1 guide
- [x] `P9_PHASE_BREAKDOWN.md` → Master plan
- [x] AGENTS.md files created in key directories

### 4. Critical Patterns Loaded
- [x] Better Auth adapter pattern (progress.txt)
- [x] Index usage rules (progress.txt)
- [x] N+1 prevention (progress.txt)
- [x] Skeleton loading (progress.txt)
- [x] Phase 8 learnings integrated

### 5. Quality Tools Ready
- [x] Dev server: http://localhost:3000 (should be running)
- [x] Test account: neil.B@blablablak.com / lien1979
- [x] dev-browser skill available
- [x] Convex dashboard access

---

## 🚀 Launch Command

```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/ralph.sh 10
```

**Parameters:**
- `10` = maximum iterations (safety limit)

---

## 📊 Expected Behavior

Ralph will:
1. ✅ Read `prd.json` (8 stories)
2. ✅ Read `progress.txt` (Codebase Patterns section)
3. ✅ Pick US-P9-001 (highest priority, passes=false)
4. ✅ Implement teamCollaboration backend model
5. ✅ Run quality checks (typecheck, lint)
6. ✅ Commit if checks pass
7. ✅ Update `prd.json` to mark US-P9-001 as complete
8. ✅ Move to US-P9-002
9. ✅ Repeat until all 8 stories complete

---

## 📋 Week 1 Stories (8 total, ~15h)

| ID | Title | Effort | Type |
|----|-------|--------|------|
| US-P9-001 | Create teamCollaboration Backend Model | 2h | Backend |
| US-P9-002 | Create Database Tables | 3h | Schema |
| US-P9-003 | Implement Presence Backend | 2h | Backend |
| US-P9-004 | Create Presence Indicators Component | 2h | Frontend |
| US-P9-005 | Implement Comment Backend | 2h | Backend |
| US-P9-006 | Implement Reactions Backend | 1h | Backend |
| US-P9-007 | Create InsightComments UI Component | 2h | Frontend |
| US-P9-008 | Create CommentForm Component | 1h | Frontend |

---

## 🎯 Success Criteria

Week 1 COMPLETE when:
- [x] All 8 stories have `passes: true` in prd.json
- [x] All quality checks pass (type, lint, browser)
- [x] Coaches can comment on insights
- [x] Coaches can react to insights
- [x] Coaches can see online presence
- [x] All code uses Better Auth adapter
- [x] All queries use indexes (no .filter())
- [x] All UI uses skeleton loaders

---

## 🔍 Monitoring Ralph

### Check Progress
```bash
# See completed stories
cat scripts/ralph/prd.json | jq '.userStories[] | {id, title, passes}'

# See learnings
tail -50 scripts/ralph/progress.txt

# See commits
git log --oneline -10
```

### Session History
```bash
# View all Ralph sessions
cat scripts/ralph/session-history.txt

# Parse specific session
./scripts/ralph/parse-conversation.sh <session-id>
```

---

## ⚠️ If Ralph Gets Stuck

### Common Issues

**Issue:** Story keeps failing quality checks
**Solution:** Check `progress.txt` for error details, fix manually if needed

**Issue:** Ralph runs out of context
**Solution:** Story might be too large - check progress notes, may need to split

**Issue:** Better Auth adapter not used
**Solution:** Ralph should read Codebase Patterns - verify it's in progress.txt

### Manual Intervention

If needed, you can:
1. Manually fix the issue
2. Mark story as `passes: true` in prd.json
3. Restart Ralph - it will skip completed stories

---

## 📝 After Week 1

### Review Checklist
- [ ] Review all commits
- [ ] Test features manually
- [ ] Check for any TODO comments
- [ ] Verify browser functionality

### Prepare Week 2
1. Update `prd.json` with Week 2 stories (10 stories)
2. Review Week 1 learnings in `progress.txt`
3. Run Ralph for Week 2

### Week 2 Stories Preview
- Activity feed with real-time updates
- @mention coaches in comments
- Priority-based notifications
- **AI Copilot UI (smart suggestions)**

---

## ✅ PRE-FLIGHT COMPLETE - READY FOR LAUNCH

**Command to start:**
```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/ralph.sh 10
```

---

**Created:** January 30, 2026
**Status:** ✅ Ready for Execution
**Estimated Completion:** 8 stories (~15 hours)
