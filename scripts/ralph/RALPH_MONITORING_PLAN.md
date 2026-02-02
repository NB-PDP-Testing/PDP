# Ralph Phase 4 Monitoring Plan

**Date**: 2026-02-02
**Phase**: Phase 4 (Tasks + Insights + Tone Controls + Navigation)
**Total Stories**: 4 stories (US-P9-057, US-P9-058, US-P9-NAV, US-P9-041)
**Estimated Duration**: 13 hours

---

## 🎯 Monitoring Strategy

### Real-Time Monitoring
I will continuously monitor:
1. **Agent outputs** in `/scripts/ralph/agents/output/`
2. **Ralph's commits** to the branch
3. **Test results** and type checks
4. **Agent feedback** in `feedback.md`

### Agent Files to Watch
- `/scripts/ralph/agents/output/feedback.md` - All agent findings
- `/scripts/ralph/agents/output/.audited-stories` - PRD compliance
- `/scripts/ralph/agents/output/.documented-stories` - Documentation updates
- `/scripts/ralph/agents/output/.tested-stories` - Test coverage
- `/scripts/ralph/agents/output/security-report.md` - Security findings

---

## ✅ Story-by-Story Review Checklist

### US-P9-057: Tasks Tab (5.5h) - Story 1

#### Critical Checks:
- [ ] **Schema**: Added ONLY `status` field to coachTasks (not created new table)
- [ ] **Schema**: Extended teamActivityFeed enums (task_created, task_completed, task_assigned, task)
- [ ] **Backend**: Created getTeamTasks query using by_team_and_org index
- [ ] **Backend**: Task mutations create teamActivityFeed entries
- [ ] **Backend**: getTeamOverviewStats enhanced with openTasks, overdueCount
- [ ] **Frontend**: tasks-tab.tsx built (copied player-tab pattern)
- [ ] **Frontend**: task-card.tsx shows voice note badge if voiceNoteId exists
- [ ] **Frontend**: task-filters.tsx copied from player-filters
- [ ] **Frontend**: create-task-modal.tsx with validation
- [ ] **Frontend**: task-detail-modal.tsx with voice note link
- [ ] **Frontend**: quick-stats-panel.tsx updated ("Attendance %" → "Open Tasks")
- [ ] **Type Check**: `npm run check-types` passes
- [ ] **Lint**: No new errors
- [ ] **Visual**: dev-browser verification shows working UI

#### Agent Findings to Address:
- [ ] **PRD Auditor**: Check acceptance criteria met
- [ ] **Security Tester**: Check auth on task mutations
- [ ] **Test Runner**: Verify tests pass
- [ ] **Quality Monitor**: Check for code quality issues
- [ ] **Documenter**: Verify docs updated

#### Common Issues to Watch:
- ⚠️ Ralph might create `teamTasks` table (WRONG - must use existing coachTasks)
- ⚠️ Ralph might forget activity feed entries in mutations
- ⚠️ Ralph might use .filter() after .withIndex() (WRONG - use composite index)
- ⚠️ Ralph might forget batch fetch pattern (causes N+1 queries)
- ⚠️ Ralph might forget to update Quick Stats Panel

---

### US-P9-058: Insights Tab (5h) - Story 2

#### Critical Checks:
- [ ] **Schema**: Created teamInsights table with proper indexes
- [ ] **Schema**: Extended teamActivityFeed enums (insight_generated, team_insight)
- [ ] **Backend**: Created getTeamInsights query with cursor pagination
- [ ] **Backend**: Insight mutations create teamActivityFeed entries
- [ ] **Backend**: getTeamOverviewStats enhanced with unreadInsights, highPriorityInsights
- [ ] **Backend**: generateInsightsFromVoiceNotes action created (placeholder)
- [ ] **Frontend**: insights-tab.tsx with pagination (copied activity-feed pattern)
- [ ] **Frontend**: insight-card.tsx shows voice note badge
- [ ] **Frontend**: insight-filters.tsx built
- [ ] **Frontend**: insight-detail-modal.tsx with voice note link
- [ ] **Frontend**: quick-stats-panel.tsx updated ("Upcoming Events" → "Unread Insights")
- [ ] **Optional**: Voice notes tab shows insights badge
- [ ] **Type Check**: `npm run check-types` passes
- [ ] **Lint**: No new errors
- [ ] **Visual**: dev-browser verification shows pagination working

#### Agent Findings to Address:
- [ ] **PRD Auditor**: Check pagination implementation
- [ ] **Security Tester**: Check auth on insight queries
- [ ] **Test Runner**: Verify pagination tests pass
- [ ] **Quality Monitor**: Check batch fetch implementation
- [ ] **Documenter**: Verify schema docs updated

#### Common Issues to Watch:
- ⚠️ Ralph might forget pagination (must be cursor-based like activity feed)
- ⚠️ Ralph might not batch fetch voice notes/players (N+1 queries)
- ⚠️ Ralph might forget readBy array for unread tracking
- ⚠️ Ralph might forget to update both Quick Stats cards

---

### US-P9-NAV: Navigation Integration (0.5h) - Story 3

#### Critical Checks:
- [ ] **Sidebar**: Team Hub added to Development group (after Team Insights)
- [ ] **Sidebar**: Icon is LayoutDashboard
- [ ] **Bottom Nav**: 5 items in correct order (Overview, Players, Voice, Hub, Tasks)
- [ ] **Bottom Nav**: Voice item has `highlight: true`
- [ ] **Mobile**: 5 icons fit without overflow
- [ ] **Type Check**: `npm run check-types` passes
- [ ] **Visual**: dev-browser verification (sidebar + bottom nav both work)

#### Agent Findings to Address:
- [ ] **PRD Auditor**: Check navigation placement
- [ ] **Quality Monitor**: Check responsive layout
- [ ] **Documenter**: Verify navigation docs

#### Common Issues to Watch:
- ⚠️ Ralph might forget to set `highlight: true` on Voice item
- ⚠️ Ralph might put bottom nav items in wrong order

---

### US-P9-041: Tone Controls (2h) - Story 4

#### Critical Checks:
- [ ] **Schema**: Extended coachOrgPreferences with parentSummaryTone field
- [ ] **Backend**: Created getCoachPreferences query
- [ ] **Backend**: Created updateCoachPreferences mutation
- [ ] **Frontend**: parent-comms-settings.tsx component created
- [ ] **Frontend**: Tone dropdown with 3 options (Warm, Professional, Brief)
- [ ] **Frontend**: Live preview card updates on selection
- [ ] **Frontend**: Save button persists to database
- [ ] **Integration**: Wired to Team Hub Settings OR Coach Settings
- [ ] **Type Check**: `npm run check-types` passes
- [ ] **Visual**: dev-browser verification (dropdown works, preview updates)

#### Agent Findings to Address:
- [ ] **PRD Auditor**: Check preview examples match spec
- [ ] **Security Tester**: Check auth on preference mutations
- [ ] **Quality Monitor**: Check preview logic
- [ ] **Documenter**: Verify settings docs

#### Common Issues to Watch:
- ⚠️ Ralph might forget live preview (must update without save)
- ⚠️ Ralph might not match exact preview text from spec

---

## 🤖 Agent Monitoring

### 1. PRD Auditor (`prd-auditor.sh`)
**What it checks**: Acceptance criteria compliance

**Monitor**: `/scripts/ralph/agents/output/.audited-stories`

**Action if findings**:
1. Read full audit report in feedback.md
2. Verify each criterion against Ralph's implementation
3. If non-compliant, ask Ralph to fix specific criteria
4. Re-audit after fix

**Common findings**:
- Missing acceptance criteria
- Incomplete implementation
- Wrong pattern used

---

### 2. Security Tester (`security-tester.sh`)
**What it checks**: Security vulnerabilities

**Monitor**: `/scripts/ralph/agents/output/security-report.md`

**Action if findings**:
1. Check for auth bypass vulnerabilities
2. Check for SQL injection risks (shouldn't happen with Convex)
3. Check for XSS vulnerabilities
4. If found, Ralph MUST fix before proceeding

**Common findings**:
- Missing auth checks on mutations
- Missing organizationId validation
- Missing role checks

---

### 3. Test Runner (`test-runner.sh`)
**What it checks**: Test coverage and passing tests

**Monitor**: `/scripts/ralph/agents/output/.tested-stories`

**Action if findings**:
1. Check test failures in feedback.md
2. Verify all tests pass
3. If failing, Ralph MUST fix
4. Re-run tests after fix

**Common findings**:
- Type errors in tests
- Missing test coverage
- Failing integration tests

---

### 4. Quality Monitor (`quality-monitor.sh`)
**What it checks**: Code quality, performance, patterns

**Monitor**: Feedback.md section for quality issues

**Action if findings**:
1. Check for N+1 query patterns
2. Check for .filter() after .withIndex()
3. Check for missing batch fetch
4. Ralph MUST fix performance issues

**Common findings**:
- N+1 queries (Promise.all in map)
- Missing batch fetch with Map
- Using .filter() after .withIndex()
- Not using composite indexes

---

### 5. Documenter (`documenter.sh`)
**What it checks**: Documentation updates

**Monitor**: `/scripts/ralph/agents/output/.documented-stories`

**Action if findings**:
1. Verify schema docs updated
2. Verify component docs created
3. If missing, Ralph should add docs

**Common findings**:
- Missing schema documentation
- Missing component usage examples

---

## 🔄 Review Workflow

### After Each Story Completion:

1. **Check Commit**
   ```bash
   git log -1 --stat
   git diff HEAD~1
   ```

2. **Read Agent Outputs**
   ```bash
   cat /Users/neil/Documents/GitHub/PDP/scripts/ralph/agents/output/feedback.md
   tail -50 /Users/neil/Documents/GitHub/PDP/scripts/ralph/agents/output/security-report.md
   ```

3. **Verify Story Completion**
   - Read `.audited-stories` - is story marked complete?
   - Read `.tested-stories` - did tests pass?
   - Read feedback.md - any blockers?

4. **Run Manual Checks**
   ```bash
   cd /Users/neil/Documents/GitHub/PDP
   npm run check-types
   ```

5. **Visual Verification** (if UI changes)
   ```bash
   # Use dev-browser skill to verify UI
   # Check mobile + desktop responsive
   # Verify interactions work
   ```

6. **Decision Point**
   - ✅ If all checks pass → Ralph proceeds to next story
   - ❌ If issues found → Ralph MUST fix before proceeding

---

## 🚨 Critical Blockers (Must Fix Immediately)

### 1. Schema Issues
- ❌ Created teamTasks table instead of using coachTasks
- ❌ Missing indexes on new tables
- ❌ Wrong field types (v.id() for Better Auth IDs)

**Action**: Stop Ralph, fix schema, re-run

### 2. Security Issues
- ❌ Missing auth checks on mutations
- ❌ Missing organizationId validation
- ❌ Data leak across organizations

**Action**: Stop Ralph, fix security, re-test

### 3. Type Errors
- ❌ Type check fails
- ❌ Convex codegen errors

**Action**: Stop Ralph, fix types, re-check

### 4. Performance Issues
- ❌ N+1 queries detected
- ❌ Missing batch fetch
- ❌ Using .filter() after .withIndex()

**Action**: Stop Ralph, refactor to batch fetch, re-test

---

## 📊 Success Metrics

### Per Story:
- ✅ All acceptance criteria met
- ✅ All agent checks pass
- ✅ Type check passes
- ✅ Tests pass
- ✅ Visual verification complete
- ✅ Security checks clean

### Phase 4 Complete:
- ✅ All 4 stories complete
- ✅ 93 acceptance criteria met
- ✅ No security vulnerabilities
- ✅ No type errors
- ✅ All tests passing
- ✅ Mobile responsive
- ✅ Activity Feed shows task/insight events
- ✅ Overview Dashboard shows task/insight counts
- ✅ Navigation accessible (sidebar + bottom nav)
- ✅ Tone Controls working

---

## 📝 Monitoring Log Template

I will log each story completion:

```markdown
## Story: US-P9-XXX - [Title]
**Started**: [timestamp]
**Completed**: [timestamp]
**Duration**: [actual time]

### Checks:
- [ ] Schema changes correct
- [ ] Backend queries/mutations working
- [ ] Frontend UI working
- [ ] Type check passes
- [ ] Tests pass
- [ ] Agent findings addressed
- [ ] Visual verification complete

### Agent Findings:
- PRD Auditor: [findings]
- Security Tester: [findings]
- Test Runner: [findings]
- Quality Monitor: [findings]
- Documenter: [findings]

### Issues Found & Fixed:
1. [Issue]: [Fix applied]
2. [Issue]: [Fix applied]

### Status: ✅ COMPLETE / ⚠️ NEEDS WORK
```

---

## 🎯 My Role

### Continuous Monitoring:
1. ✅ Watch agent output files for new findings
2. ✅ Review each commit Ralph makes
3. ✅ Verify acceptance criteria met
4. ✅ Check for critical patterns (batch fetch, indexes, auth)
5. ✅ Ensure agent findings are addressed

### Intervention Points:
1. ⚠️ If schema wrong (teamTasks instead of coachTasks) → Stop Ralph immediately
2. ⚠️ If security issue found → Stop Ralph, require fix
3. ⚠️ If N+1 queries detected → Stop Ralph, require batch fetch refactor
4. ⚠️ If type check fails → Stop Ralph, require fix
5. ⚠️ If agent finding not addressed → Prompt Ralph to fix

### Quality Gates:
Each story must pass ALL checks before proceeding to next story:
- ✅ PRD Auditor approval
- ✅ Security Tester clean
- ✅ Test Runner all tests passing
- ✅ Quality Monitor no performance issues
- ✅ Type check passes
- ✅ Visual verification complete

---

**I AM READY TO MONITOR RALPH'S EXECUTION** 🎯

I will:
1. ✅ Continuously check agent outputs
2. ✅ Verify each story completion
3. ✅ Ensure all findings are addressed
4. ✅ Stop Ralph if critical issues found
5. ✅ Provide detailed feedback on each story
6. ✅ Confirm Phase 4 success criteria met

**Let Ralph begin!** 🚀
