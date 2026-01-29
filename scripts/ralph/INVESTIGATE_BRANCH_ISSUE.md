# Branch Creation Issue - Post-Mortem TODO

**Date**: 2026-01-26
**Phase**: 7.1 execution
**Issue**: Ralph did not create the expected branch

---

## What Happened

Ralph was instructed to work on branch: `ralph/coach-insights-auto-apply-p7-phase1`

**Expected behavior:**
1. Create new branch from `phase7/prerequisites-insight-auto-apply`
2. Make all commits on the new branch

**Actual behavior:**
1. Ralph recorded the branch name in `.last-branch`
2. Ralph never actually created the branch with `git checkout -b`
3. All commits went to `phase7/prerequisites-insight-auto-apply` (current branch)

---

## Evidence

```bash
# Current state during execution
$ git branch --show-current
phase7/prerequisites-insight-auto-apply

$ cat scripts/ralph/.last-branch
ralph/coach-insights-auto-apply-p7-phase1

$ git branch -a | grep "ralph/coach-insights"
# (no results - branch doesn't exist)
```

**Commits made on wrong branch:**
- `32c741c` - feat: US-002 - Add getPendingInsights query with wouldAutoApply calculation
- `47b6a22` - feat: US-003 - Add confidence visualization to insight cards
- (More commits expected as Ralph continues...)

---

## Ralph Configuration Used

**Command:**
```bash
npm run ralph -- \
  --prd scripts/ralph/prd.json \
  --phase 7.1 \
  --stories US-001,US-002,US-003,US-004,US-005 \
  --branch ralph/coach-insights-auto-apply-p7-phase1
```

**PRD Configuration:**
```json
{
  "project": "P7 Phase 1 - Preview Mode for Insight Auto-Apply",
  "branchName": "ralph/coach-insights-auto-apply-p7-phase1",
  ...
}
```

---

## Hypotheses to Investigate

### 1. Ralph Script Logic Issue
**Check**: Does `ralph.sh` actually create the branch or just record the name?
**Files to review:**
- `scripts/ralph/ralph.sh` - Main execution script
- Look for `git checkout -b` command
- Check if branch creation is conditional

### 2. Base Branch Specification Missing
**Check**: Did we specify which branch to create from?
**PRD fields to review:**
- Does PRD have a "baseBranch" field?
- Is there a separate parameter for base vs. target branch?

### 3. Execution Mode Difference
**Check**: Does Ralph behave differently in different modes?
**Compare:**
- P5 executions (which worked correctly)
- P6 executions (which worked correctly)
- P7 execution (this one)

### 4. Manual vs. Scripted Execution
**Check**: Was Ralph started differently this time?
**Review:**
- Previous successful runs: How were they started?
- This run: Any differences in startup command?

---

## Investigation Steps (After Ralph Completes)

1. **Review Ralph Script:**
   ```bash
   # Check ralph.sh for branch creation logic
   grep -n "git checkout" scripts/ralph/ralph.sh
   grep -n "branch" scripts/ralph/ralph.sh
   ```

2. **Check Ralph Documentation:**
   ```bash
   # Look for branch parameter docs
   cat scripts/ralph/README.md 2>/dev/null
   head -50 scripts/ralph/ralph.sh  # Check script header comments
   ```

3. **Compare with P5/P6 Executions:**
   ```bash
   # Check how P5 branches were created
   git log --all --oneline | grep "p5-phase"
   git log --all --oneline | grep "p6-phase"
   ```

4. **Test Branch Creation:**
   ```bash
   # Try creating a test branch manually
   git checkout -b test-ralph-branch-creation
   git checkout phase7/prerequisites-insight-auto-apply
   git branch -D test-ralph-branch-creation
   ```

5. **Check Ralph Config Files:**
   ```bash
   # Look for configuration files
   find scripts/ralph -name "*.config.*" -o -name ".ralphrc"
   cat scripts/ralph/.last-branch
   ```

---

## Potential Fixes

### Option A: Ralph Script Fix
If `ralph.sh` doesn't create branches, add:
```bash
# In ralph.sh, before main execution loop
if [ -n "$BRANCH_NAME" ]; then
  echo "Creating branch: $BRANCH_NAME"
  git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
fi
```

### Option B: Manual Branch Creation
Add to execution docs:
```bash
# BEFORE running Ralph, create the branch manually
git checkout -b ralph/coach-insights-auto-apply-p7-phase1

# THEN run Ralph
npm run ralph -- --prd scripts/ralph/prd.json --phase 7.1 ...
```

### Option C: PRD Enhancement
Add to PRD structure:
```json
{
  "baseBranch": "phase7/prerequisites-insight-auto-apply",
  "targetBranch": "ralph/coach-insights-auto-apply-p7-phase1",
  ...
}
```

---

## Decision

**For this run:** Continue on `phase7/prerequisites-insight-auto-apply` (user approved)

**For future runs:** Investigate and fix the root cause

---

## User Note

User said: "its fine, let ralph complete the work on this branch.. we need to understand why ralph didnt work on the correct branch after this run."

---

**Status**: OPEN - Investigation pending Ralph completion
**Priority**: Medium (doesn't break functionality, but affects workflow)
**Impact**: Commits go to wrong branch, requiring cherry-picking or different merge strategy
