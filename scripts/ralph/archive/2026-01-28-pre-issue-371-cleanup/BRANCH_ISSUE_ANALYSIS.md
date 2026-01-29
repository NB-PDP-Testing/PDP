# Why Ralph Didn't Switch Branches - Root Cause Analysis

**Date**: 2026-01-26
**Issue**: Ralph recorded branch name but never created/switched to it
**Impact**: All Phase 7.1 commits went to prerequisite branch instead of new branch

---

## What Happened

**Expected**:
```bash
# Ralph should have:
git checkout -b ralph/coach-insights-auto-apply-p7-phase1
# Then made commits on this new branch
```

**Actual**:
```bash
# Ralph only recorded the name:
echo "ralph/coach-insights-auto-apply-p7-phase1" > .last-branch
# But never ran git checkout -b
# All commits went to: phase7/prerequisites-insight-auto-apply
```

---

## Root Cause

**The ralph.sh script does NOT create branches.**

### Evidence from ralph.sh

Lines 42-48:
```bash
# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"  # ← Only records name
  fi
fi
```

**No `git checkout` commands anywhere in ralph.sh!**

### What ralph.sh Actually Does

1. **Reads branch name** from PRD
2. **Records it** in `.last-branch` file
3. **Archives previous run** if branch name changed
4. **Assumes branch already exists** or will be created by Claude

---

## Why This Wasn't Caught Before

### P5 and P6 Phases Worked

Looking at git history:
```bash
$ git branch | grep ralph
ralph/coach-parent-summaries-p5
ralph/coach-parent-summaries-p5-phase2
ralph/coach-parent-summaries-p5-phase3
ralph/coach-parent-summaries-p5-phase4
ralph/coach-parent-summaries-p6-phase1
ralph/coach-parent-summaries-p6-phase2
ralph/coach-parent-summaries-p6-phase3
ralph/coach-parent-summaries-p6-phase4
```

**All P5/P6 branches exist!** So Ralph must have created them somehow, or they were created manually.

### Possible Explanations

**Option 1**: Claude created branches during P5/P6 execution
- Ralph's prompt may have instructed Claude to create branches
- Claude may have proactively created branches
- This worked for P5/P6 but failed for P7

**Option 2**: Branches were created manually before P5/P6 runs
- Operator created branches first
- Ralph worked on existing branches

**Option 3**: P5/P6 used different workflow
- Different ralph.sh version?
- Different execution method?

---

## Fix Options

### Option A: Fix ralph.sh (Recommended)

Add branch creation to ralph.sh:

```bash
# After line 48, add:
# Create branch if it doesn't exist
if [ -n "$CURRENT_BRANCH" ]; then
  CURRENT_GIT_BRANCH=$(git branch --show-current)
  if [ "$CURRENT_GIT_BRANCH" != "$CURRENT_BRANCH" ]; then
    # Check if branch exists
    if git show-ref --verify --quiet "refs/heads/$CURRENT_BRANCH"; then
      echo "📌 Switching to existing branch: $CURRENT_BRANCH"
      git checkout "$CURRENT_BRANCH"
    else
      echo "🌿 Creating new branch: $CURRENT_BRANCH"
      git checkout -b "$CURRENT_BRANCH"
    fi
  fi
fi
```

**Pros**: Automatic, works for all future phases
**Cons**: Modifies Ralph's workflow

### Option B: Manual Branch Creation

Document that branches must be created manually:

```bash
# Before running Ralph, always create the branch:
git checkout -b ralph/coach-insights-auto-apply-p7-phase1

# Then run Ralph
npm run ralph -- --prd scripts/ralph/prd.json ...
```

**Pros**: Simple, explicit control
**Cons**: Easy to forget, manual step

### Option C: Update Ralph's Prompt

Modify `scripts/ralph/prompt.md` to instruct Claude to create branch first:

```markdown
1. FIRST, create the branch specified in the PRD:
   ```bash
   git checkout -b <branchName from PRD>
   ```

2. THEN begin implementing stories...
```

**Pros**: Works within existing Ralph system
**Cons**: Relies on Claude following instructions

### Option D: Pre-flight Check Script

Create `scripts/ralph/preflight.sh`:

```bash
#!/bin/bash
# Run before Ralph to ensure branch is ready

PRD_FILE="scripts/ralph/prd.json"
BRANCH=$(jq -r '.branchName' "$PRD_FILE")

if [ -z "$BRANCH" ]; then
  echo "❌ No branchName in PRD"
  exit 1
fi

CURRENT=$(git branch --show-current)
if [ "$CURRENT" != "$BRANCH" ]; then
  if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    echo "📌 Switching to: $BRANCH"
    git checkout "$BRANCH"
  else
    echo "🌿 Creating: $BRANCH"
    git checkout -b "$BRANCH"
  fi
fi

echo "✅ Ready on branch: $BRANCH"
```

**Pros**: Separate concern, explicit check
**Cons**: Extra script to maintain

---

## Recommended Solution

**Implement Option A + D**:

1. **Fix ralph.sh** to automatically handle branches
2. **Add preflight.sh** as safety check
3. **Document in README** that both are used

### Implementation

```bash
# 1. Update ralph.sh (add branch logic)
# 2. Create scripts/ralph/preflight.sh
# 3. Update execution docs to run preflight first:

./scripts/ralph/preflight.sh  # Ensures branch is ready
./scripts/ralph/ralph.sh 20   # Runs Ralph
```

---

## Workaround for Phase 7.1

**Already resolved** - User approved continuing on prerequisite branch.

**For future phases**:
- Create branch manually before running Ralph
- OR implement fix above

---

## Impact Assessment

### Phase 7.1 Status
- ✅ Code works correctly
- ✅ Commits are clean and documented
- ⚠️ Commits on wrong branch (acceptable, approved)
- ⚠️ Need to handle merging differently

### Merge Strategy

**Option 1: Merge prerequisite branch directly**
```bash
git checkout main
git merge phase7/prerequisites-insight-auto-apply
```

**Option 2: Cherry-pick Phase 7.1 commits to new branch**
```bash
git checkout phase7/prerequisites-insight-auto-apply
git checkout -b ralph/coach-insights-auto-apply-p7-phase1
git cherry-pick 32c741c..210c5b0  # Phase 7.1 commits
git checkout main
git merge ralph/coach-insights-auto-apply-p7-phase1
```

**Option 3: Keep as-is, document in PR**
- Create PR from prerequisite branch
- Note in PR description that Phase 7.1 is included
- Merge prerequisite + Phase 7.1 together

---

## Action Items

### Immediate (Phase 7.2 Prep)
- [ ] Decide on fix approach (A, B, C, or D)
- [ ] Implement chosen fix
- [ ] Test with dummy run
- [ ] Document in P7_PHASE2_EXECUTION_PLAN.md

### Long Term
- [ ] Add branch creation to ralph.sh
- [ ] Create preflight.sh script
- [ ] Update Ralph documentation
- [ ] Add to Ralph testing checklist

---

## Testing the Fix

Once implemented, test with:

```bash
# Create test PRD with dummy branch
echo '{"branchName": "test/ralph-branch-fix"}' > scripts/ralph/prd.json

# Run Ralph (should create branch automatically)
./scripts/ralph/preflight.sh
# Should output: "🌿 Creating: test/ralph-branch-fix"

# Verify
git branch --show-current
# Should output: test/ralph-branch-fix

# Cleanup
git checkout main
git branch -D test/ralph-branch-fix
```

---

## Conclusion

**Root cause**: ralph.sh records branch name but never creates/switches branches

**Fix needed**: Add branch creation logic to ralph.sh or preflight script

**Priority**: Medium (doesn't block work, just affects organization)

**Phase 7.1**: Unaffected, works correctly on prerequisite branch

**Phase 7.2**: Fix before running to avoid same issue

---

**Status**: OPEN - Fix needed before Phase 7.2
**Assigned**: TBD
**Estimated effort**: 1 hour (implement + test)
