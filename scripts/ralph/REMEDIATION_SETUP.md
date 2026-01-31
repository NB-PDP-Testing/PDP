# Phase 9 Week 2 Remediation - Setup Instructions

## Overview

Ralph will fix all 14 critical issues found in the comprehensive code audits:
- **6 stories** - Component integration (P0 - Blocking)
- **5 stories** - Missing features & bug fixes (P1 - High)
- **2 stories** - Performance violations (P1 - High)
- **1 story** - Testing & visual verification (P2 - Medium)

**Estimated Total: 12-17 hours**

---

## What's Been Set Up

✅ **Remediation PRD Created:**
- `/scripts/ralph/prds/Coaches Voice Insights/P9_WEEK2_REMEDIATION.md`
- Detailed fix instructions for all 14 issues
- References both audit reports
- Clear acceptance criteria

✅ **PRD Configuration:**
- `/scripts/ralph/prd-remediation.json` - Story definitions
- `/scripts/ralph/prd.json` - Symlinked to remediation PRD

✅ **Audit Reports Available:**
- `/docs/archive/audits/RALPH_P9_WEEK2_COMPREHENSIVE_AUDIT.md`
- `/docs/archive/audits/RALPH_P9_WEEK2_DEEP_DIVE_AUDIT.md`

✅ **Branch Ready:**
- Continue on `ralph/team-collaboration-hub-p9`
- All previous work intact

---

## Starting Ralph - Step by Step

### 1. Verify Configuration

```bash
# Check PRD is linked correctly
cat scripts/ralph/prd.json | jq '.project'
# Should show: "Phase 9 Week 2 - REMEDIATION: Fix All Critical Issues"

# Verify branch
git branch
# Should show: * ralph/team-collaboration-hub-p9
```

### 2. Start Ralph Agents

```bash
cd /Users/neil/Documents/GitHub/PDP/scripts/ralph/agents

# Start all agents
./start-all.sh
```

This starts:
- **Story Builder** - Reads PRD, creates implementation plans
- **Code Writer** - Writes code fixes
- **Test Writer** - Creates real tests
- **UAT Tester** - Visual verification with dev-browser
- **Quality Monitor** - Checks for violations
- **PRD Auditor** - Verifies acceptance criteria

### 3. Monitor Progress

**Watch the dashboard:**
```bash
# In a separate terminal
./watch-dashboard.sh
```

Shows:
- Current story being worked on
- Progress (X/14 complete)
- Quality monitor alerts
- Test results

**Check feedback:**
```bash
tail -f output/feedback.md
```

---

## Critical Things Ralph MUST Do

### ✅ Integration Checklist (Stories 001-006)

For EACH component:
1. Import component in parent page
2. Render component with proper props
3. Verify with: `grep -r "import.*ComponentName" apps/web/src`
4. Visual verification with dev-browser
5. Take screenshot
6. Update UAT test file

**If grep returns no results, the story is NOT complete.**

### ✅ Performance Checklist (Story 012)

1. Identify each `.filter()` violation
2. Check if composite index exists - if not, add to schema
3. Replace `.filter()` with `.withIndex()` where possible
4. Document remaining violations (e.g., Better Auth limitations)
5. Run `npx -w packages/backend convex codegen`
6. Verify in Convex dashboard (query plan shows index usage)

### ✅ Testing Checklist (Story 013)

For EACH test file:
1. Remove `expect(true).toBe(true)`
2. Write real tests covering acceptance criteria
3. Minimum 3 tests per file
4. Run tests: verify they pass
5. No placeholder tests remain

---

## Expected Output

After all 14 stories complete:

### Files Created/Modified

**New Files:**
- `apps/web/src/app/orgs/[orgId]/coach/settings/page.tsx` (Story 001)

**Modified Files:**
- Team hub page (Story 002)
- Voice notes insight display (Stories 003, 004, 006)
- Coach layout/header (Story 005)
- `insight-reactions.tsx` (Story 007)
- `teamCollaboration.ts` (Story 008)
- `aiCopilot.ts` (Stories 009, 010, 011, 012)
- `smart-action-bar.tsx` (Story 011)
- `schema.ts` (Story 012 - new indexes)
- All 11 test files (Story 013)
- All 14 UAT test files (Story 014)

### Verification Commands

**1. Check Integration:**
```bash
# All these MUST return results:
grep -r "import.*ActivityFeedView" apps/web/src
grep -r "import.*CommentForm" apps/web/src
grep -r "import.*InsightReactions" apps/web/src
grep -r "import.*NotificationCenter" apps/web/src
grep -r "import.*SmartActionBar" apps/web/src
```

**2. Check Tests:**
```bash
# Should show NO "expect(true).toBe(true)"
grep -r "expect(true).toBe(true)" packages/backend/convex/__tests__/US-P9-*.test.ts
```

**3. Check Performance:**
```bash
# Should show documented justifications for any remaining .filter()
grep -A 2 -B 2 ".filter(" packages/backend/convex/models/teamCollaboration.ts
grep -A 2 -B 2 ".filter(" packages/backend/convex/models/aiCopilot.ts
```

**4. Run Type Check:**
```bash
npm run check-types
# Should pass with no errors
```

---

## Quality Gates

Ralph MUST NOT mark a story complete unless:

✅ **Integration Stories (001-006):**
- [ ] Component imported in parent
- [ ] `grep` command returns results
- [ ] Component renders in UI
- [ ] Visual verification done
- [ ] Screenshot saved
- [ ] UAT test updated

✅ **Feature Stories (007-011):**
- [ ] Code changes made
- [ ] Acceptance criteria met
- [ ] Type check passes
- [ ] Tested in Convex dashboard (backend) or dev-browser (frontend)

✅ **Performance Story (012):**
- [ ] All `.filter()` violations fixed or documented
- [ ] New indexes added to schema
- [ ] Schema push successful
- [ ] Query plans reviewed

✅ **Testing Stories (013-014):**
- [ ] All placeholder tests replaced
- [ ] All tests pass
- [ ] All UAT tests executed
- [ ] Screenshots saved

---

## Troubleshooting

### If Ralph marks story complete but integration not done:

```bash
# Check if component actually imported
grep -r "import.*ComponentName" apps/web/src

# If no results, integration is NOT done
# Story should be marked FAILED
```

### If quality monitor keeps flagging same issue:

```bash
# Review feedback
cat output/feedback.md | grep "CRITICAL"

# If issue not fixed, story should NOT be marked complete
```

### If tests still placeholder:

```bash
# Check actual test content
cat packages/backend/convex/__tests__/US-P9-XXX.test.ts

# If contains "expect(true).toBe(true)", story NOT complete
```

---

## Success Criteria

Remediation is complete when:

- ✅ All 14 stories marked "passes: true" in output/.audited-stories
- ✅ All 5 components return results in grep searches
- ✅ Page route `/coach/settings` returns 200 (not 404)
- ✅ All `.filter()` violations fixed or documented
- ✅ All tests are real (no `expect(true).toBe(true)`)
- ✅ All UAT tests show "✅ Passed" (not "⏳ Pending")
- ✅ `npm run check-types` passes
- ✅ Quality monitor shows no critical violations

---

## Post-Remediation Verification

After Ralph finishes:

```bash
# 1. Run comprehensive checks
npm run check-types
npm run check

# 2. Verify integrations
./scripts/ralph/agents/verify-integrations.sh

# 3. Run tests
npm test

# 4. Visual verification
# Start dev server
npm run dev

# Navigate to each page and verify:
# - /orgs/[orgId]/coach/team-hub (Activity feed visible)
# - /orgs/[orgId]/coach/voice-notes (Comments, reactions, AI suggestions visible)
# - /orgs/[orgId]/coach (Notification bell in header)
# - /orgs/[orgId]/coach/settings (Preferences page loads)
```

---

## Important Notes

⚠️ **Ralph must READ both audit reports before starting**
- They contain critical context for WHY each fix is needed
- They show exact line numbers and code snippets
- They explain what was wrong with original implementation

⚠️ **Visual verification is MANDATORY**
- Use dev-browser for all UI changes
- Save screenshots
- Update UAT test files with results

⚠️ **Quality monitor feedback is NOT optional**
- If quality monitor flags an issue, it MUST be fixed
- Story cannot be complete if violations remain
- "Complete" means working + integrated + tested + verified

---

## Ready to Start

Once you've reviewed this document:

```bash
cd /Users/neil/Documents/GitHub/PDP/scripts/ralph/agents
./start-all.sh
```

Ralph will begin working through all 14 stories in priority order.

Monitor progress with:
```bash
./watch-dashboard.sh
```

Good luck! 🚀
