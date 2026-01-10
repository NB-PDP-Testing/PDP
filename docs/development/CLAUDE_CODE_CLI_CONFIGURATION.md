# Claude Code CLI - Enhanced Configuration Guide

**Created:** January 10, 2026
**Status:** Recommended Configuration
**Purpose:** Improve code quality by integrating linting/type checking into Claude Code CLI workflow

---

## 🚨 CURRENT SITUATION (Critical!)

### Linting Status - Getting WORSE, Not Better

**Historical Data:**
- **Jan 2, 2026:** 1,727 issues (971 errors, 745 warnings, 11 infos)
- **Jan 10, 2026:** 2,553 issues (1,393 errors, 1,145 warnings, 15 infos)

**⚠️ PROBLEM:** 48% INCREASE (826 new issues) in just 8 days!

**Root Cause Analysis:**
1. CI linting check has overly permissive error handling
2. Exits with code 0 (success) when it should fail
3. Developers not running linting before committing
4. Claude Code CLI doesn't show linting errors in context (unlike Cursor)

**Recent Commits Added:** 290 linting issues (123 errors, 162 warnings, 5 infos) in last 10 commits

**This defeats the entire "fix as you go" strategy!**

---

## 🎯 Solution: Enhanced Claude Code CLI Configuration

### Problem: Linting Errors Not Visible to AI Agent

**What Cursor Does Right:**
- Language server integration shows linting/syntax errors in context
- AI agent sees errors automatically while coding
- Fixes happen proactively, not reactively

**What Claude Code CLI Currently Does:**
- ✅ Has PostToolUse hooks that run after edits
- ❌ But only shows output, doesn't put errors "in context"
- ❌ Agent can't see errors unless explicitly told to check

### Recommended Multi-Layer Approach

We need BOTH:
1. **Automated checks** (PostToolUse hooks) - Catch errors immediately
2. **Proactive agent behavior** (Rules files) - Agent checks before completing work
3. **CI enforcement** (Fixed CI config) - Ultimate safety net

---

## 📋 Configuration Implementation

### 1. Enhanced PostToolUse Hooks (.claude/settings.json)

**Location:** `/Users/neil/.claude/settings.json` (user-level) or `.claude/settings.json` (project-level)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx ultracite fix",
            "description": "Auto-format with Ultracite"
          },
          {
            "type": "command",
            "command": "npm run check-types 2>&1 | head -30 || true",
            "description": "Type check - show first 30 errors"
          },
          {
            "type": "command",
            "command": "npx biome check --changed . 2>&1 | head -40 || true",
            "description": "Lint check - show first 40 issues"
          },
          {
            "type": "command",
            "command": "echo '\n🔍 Remember to review type and lint errors above before proceeding!' || true",
            "description": "Reminder to check errors"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash.*commit",
        "hooks": [
          {
            "type": "command",
            "command": "npx biome check --changed . 2>&1 | tail -20",
            "description": "Pre-commit lint check"
          },
          {
            "type": "command",
            "command": "echo '\n⚠️  STOP! Review linting errors above before committing!' || true",
            "description": "Warning before commit"
          }
        ]
      }
    ]
  }
}
```

**What This Does:**
- ✅ Auto-formats after every edit (already working)
- ✅ Shows type errors (first 30 lines) after every edit
- ✅ Shows lint errors (first 40 lines) after every edit
- ✅ Adds visible reminder to check errors
- ✅ Warns before committing with linting errors

**Key Features:**
- `|| true` ensures hooks don't block (shows feedback, doesn't fail)
- `head -30` and `head -40` limit output to avoid overwhelming
- `tail -20` before commit shows summary of issues

### 2. Rules Files for Agent Behavior

**Location:** `.ruler/code-quality-checks.md`

```markdown
# Code Quality Checks - REQUIRED Before Completion

## CRITICAL: Always Check Before Saying "Done"

After writing ANY code (Edit or Write tools), you MUST:

1. **Check for TypeScript errors:**
   ```bash
   npm run check-types
   ```
   - Fix ALL errors before proceeding
   - NEVER leave TypeScript errors

2. **Check for linting issues:**
   ```bash
   npx biome check --changed .
   ```
   - Fix ALL errors in files you modified
   - Fix ALL warnings if possible
   - Document why if you can't fix a warning

3. **Verify formatting:**
   ```bash
   npx ultracite fix
   ```
   - Should be automatic from hooks
   - Verify no changes needed

## NEVER Commit Code With:
- ❌ TypeScript errors
- ❌ Linting errors in changed files
- ❌ Unformatted code

## Before Using Bash Tool to Commit:
1. Run: `npx biome check --changed .`
2. Fix any issues shown
3. Only then proceed with commit

## If You See Errors in PostToolUse Hook Output:
- STOP immediately
- Fix the errors
- Re-check before proceeding

## The "Fix as You Go" Rule:
When modifying a file, you MUST fix ALL existing linting issues in that file,
not just avoid adding new ones.
```

**Location:** `.ruler/linting-priorities.md`

```markdown
# Linting Fix Priorities

When you encounter linting issues, fix in this order:

## Priority 1: Type Safety (MUST FIX)
- `noExplicitAny` - Replace `any` with proper types
- `noEvolvingTypes` - Add explicit type annotations
- `useAwait` - Fix async function usage

## Priority 2: Accessibility (MUST FIX for UI)
- `useButtonType` - Add `type="button"` to all buttons
- `noLabelWithoutControl` - Link labels with `htmlFor`/`id`
- `useKeyWithClickEvents` - Add keyboard handlers
- `noSvgWithoutTitle` - Add `<title>` to SVGs

## Priority 3: Complexity (SHOULD FIX)
- `noExcessiveCognitiveComplexity` - Simplify complex functions
- Extract helpers, reduce nesting, use early returns

## Priority 4: Style (CAN AUTO-FIX)
- `useBlockStatements` - Add braces (auto-fixable)
- `noNestedTernary` - Simplify ternaries
- `useTemplate` - Use template literals

## How to Fix:
```bash
# Auto-fix safe issues
npx biome check --write path/to/file.tsx

# Then manually fix remaining issues following priorities above
```

## NEVER:
- Use mass auto-fixes with `--unsafe` flag
- Add `any` types
- Skip accessibility attributes
- Create overly complex functions
```

### 3. Pre-commit Git Hook

**Location:** `.git/hooks/pre-commit` (or use husky)

```bash
#!/bin/bash

echo "🔍 Running pre-commit checks..."

# Check TypeScript
echo "Checking TypeScript..."
if ! npm run check-types; then
  echo "❌ TypeScript errors found. Fix before committing."
  echo "Run: npm run check-types"
  exit 1
fi

# Check linting on changed files
echo "Checking linting on changed files..."
if ! npx biome check --changed --diagnostic-level=error .; then
  echo "❌ Linting errors found in changed files. Fix before committing."
  echo "Run: npx biome check --changed ."
  echo "Fix: npx biome check --write <file>"
  exit 1
fi

echo "✅ All pre-commit checks passed!"
exit 0
```

**Make it executable:**
```bash
chmod +x .git/hooks/pre-commit
```

---

## 🔧 Fixed CI Configuration

### Problem with Current CI

```yaml
# Current (BROKEN - exits 0 even with errors!)
npx biome check --changed --diagnostic-level=error . || {
  exit_code=$?
  if [ $exit_code -eq 1 ]; then
    echo "No lintable files changed or all changes in excluded paths - OK"
    exit 0  # ❌ This allows lint errors to pass!
  fi
  exit $exit_code
}
```

**This exits with 0 (success) when it should fail!**

### Recommended Fix

**File:** `.github/workflows/ci.yml` (lines 56-79)

```yaml
- name: Run linting (changed files only)
  run: |
    echo "Checking linting on changed files..."

    # Get list of changed files
    if [ "${{ github.event_name }}" == "pull_request" ]; then
      CHANGED_FILES=$(git diff --name-only --diff-filter=ACMRT origin/main...HEAD | grep -E '\.(ts|tsx|js|jsx)$' || true)
    else
      CHANGED_FILES=$(git diff --name-only --diff-filter=ACMRT HEAD~1 | grep -E '\.(ts|tsx|js|jsx)$' || true)
    fi

    # If no files changed, exit success
    if [ -z "$CHANGED_FILES" ]; then
      echo "✅ No TypeScript/JavaScript files changed - skipping lint"
      exit 0
    fi

    echo "Changed files to lint:"
    echo "$CHANGED_FILES"

    # Run biome check - FAIL if errors found
    npx biome check --changed --diagnostic-level=error .

    # If we get here and biome returned non-zero, fail the build
    if [ $? -ne 0 ]; then
      echo "❌ Linting failed! Fix errors before merging."
      echo "Run locally: npx biome check --changed ."
      exit 1
    fi

    echo "✅ Linting passed!"
```

**Key Changes:**
1. Explicitly checks if files changed first
2. Only exits 0 if truly no files to check
3. Fails (exit 1) if biome finds errors
4. Provides helpful error messages

---

## 📊 Implementation Plan

### Phase 1: Immediate (Today)

**1. Update Claude Code CLI hooks**
```bash
# Edit your settings file
code ~/.claude/settings.json

# Add the PostToolUse hooks from above
```

**2. Add rules files**
```bash
# Create the rules
cat > .ruler/code-quality-checks.md << 'EOF'
[paste content from above]
EOF

cat > .ruler/linting-priorities.md << 'EOF'
[paste content from above]
EOF
```

**3. Fix CI configuration**
```bash
# Update .github/workflows/ci.yml with fixed linting check
# Create a PR to test it
```

### Phase 2: This Week

**4. Fix recent linting regressions**
```bash
# Check what was added in last 10 commits
npx biome check --changed --since=HEAD~10 .

# Fix the 290 issues added (123 errors, 162 warnings)
# Priority: Fix errors first, then warnings
```

**5. Install pre-commit hook**
```bash
# Copy the pre-commit hook script above to .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Or use husky for team-wide enforcement
npm install --save-dev husky
npx husky install
npx husky add .git/hooks/pre-commit "npm run check-types && npx biome check --changed ."
```

### Phase 3: Ongoing

**6. Monitor progress**
```bash
# Weekly check
npx biome check . 2>&1 | tail -10

# Update tracking in docs/development/ci-cd-guide.md
```

**7. Team communication**
- Share this document with team
- Explain the hooks and rules
- Demonstrate the workflow

---

## 🎯 Expected Outcomes

### With Enhanced Hooks

**Before (Current):**
- Agent writes code
- Doesn't see linting errors
- User has to manually check
- Issues accumulate

**After (With Hooks):**
- Agent writes code
- Hooks run immediately showing errors
- Agent sees errors in output
- Agent can fix before proceeding

**Effectiveness:** 70-80% (agent sees errors, but not "in context")

### With Rules Files

**Before (Current):**
- Agent considers task "done" after writing code
- Doesn't verify quality
- Commits without checking

**After (With Rules):**
- Agent follows rules checklist
- Verifies TypeScript and linting
- Fixes issues before saying "done"

**Effectiveness:** 85-90% (agent actively checks)

### With Fixed CI

**Before (Current):**
- CI passes despite linting errors
- 48% increase in 8 days
- Issues accumulate

**After (With Fix):**
- CI fails if linting errors present
- Forces fixes before merge
- Issue count stabilizes then reduces

**Effectiveness:** 95-99% (ultimate safety net)

### Combined Effect

**All three together:**
- **Hooks** - Immediate feedback after each edit
- **Rules** - Proactive checking before completion
- **CI** - Blocks bad code from merging

**Expected Result:**
- Zero new linting issues
- Gradual reduction of existing issues (10-15% per month)
- Better code quality overall

---

## 📈 Success Metrics

### Short Term (1 Week)
- ✅ Hooks installed and working
- ✅ Rules files added to `.ruler/`
- ✅ CI fixed and deployed
- ✅ Zero new linting issues in commits
- ✅ 290 recent issues fixed

### Medium Term (1 Month)
- ✅ Issue count reduced by 10-15% (target: <2,170)
- ✅ All team members using hooks
- ✅ CI catching 100% of violations
- ✅ No PRs merged with linting errors

### Long Term (3 Months)
- ✅ Issue count reduced by 30-40% (target: <1,532)
- ✅ High-impact issues (any types, complexity) significantly reduced
- ✅ Linting becomes natural part of workflow
- ✅ Code quality improving measurably

---

## 🔍 Comparison to Cursor

### What Cursor Does
- **Language Server Integration:** Shows errors inline as you type
- **In-Context Awareness:** AI sees errors automatically
- **Proactive Fixing:** AI suggests fixes as part of normal workflow

### What Claude Code CLI Can Do (With This Config)
- **PostToolUse Hooks:** Shows errors after each edit ✅
- **Rules-Based Checking:** Agent checks before completing ✅
- **PreToolUse Hooks:** Warnings before dangerous operations ✅

### The Gap
- **Real-time inline errors:** Cursor wins (language server)
- **Post-edit error visibility:** Claude Code (with hooks) matches Cursor
- **Proactive agent behavior:** Claude Code (with rules) can match Cursor

### Recommendation
Claude Code CLI can achieve 85-90% of Cursor's code quality benefits with:
1. Enhanced PostToolUse hooks (this config)
2. Rules files for agent behavior (this config)
3. Pre-commit hooks for safety (this config)

The 10-15% gap is the inline language server integration, which would require
changes to Claude Code CLI itself (feature request).

---

## 📞 Support & Resources

### Quick Reference

**Check linting:**
```bash
npx biome check --changed .
```

**Fix safe issues:**
```bash
npx biome check --write path/to/file.tsx
```

**Check TypeScript:**
```bash
npm run check-types
```

### Documentation
- **Linting Guide:** `docs/development/linting-guide.md`
- **CI/CD Guide:** `docs/development/ci-cd-guide.md`
- **Quick Reference:** `docs/archive/planning/LINTING_QUICK_REFERENCE.md`

### When Things Go Wrong

**If hooks don't run:**
- Check `.claude/settings.json` syntax
- Restart Claude Code CLI
- Check file permissions

**If CI still passes with errors:**
- Verify `.github/workflows/ci.yml` was updated
- Check CI logs for actual error messages
- Test locally: `npx biome check --changed .`

**If too many errors to fix:**
- Focus on files you're modifying
- Use priority order (Type Safety → Accessibility → Complexity → Style)
- Ask for help with complex issues

---

## 🎓 Training Materials

### For AI Agents (Add to .ruler/)

**File:** `.ruler/ai-agent-code-quality.md`

```markdown
# AI Agent Code Quality Standards

## After Every Edit or Write:
1. Wait for PostToolUse hook output
2. READ the type check output
3. READ the lint check output
4. If errors shown, FIX THEM before proceeding
5. Never say "done" with errors present

## Before Committing:
1. Run: `npx biome check --changed .`
2. Fix ALL errors shown
3. Fix ALL warnings if possible
4. Only then proceed with commit

## Common Fixes:
- TypeScript error → Add proper types, don't use `any`
- Linting error `useButtonType` → Add `type="button"` to <button>
- Linting error `noLabelWithoutControl` → Link <label> with `htmlFor`
- Linting error `noExplicitAny` → Replace `any` with proper type

## If You're Unsure:
- Ask the user for clarification
- Check the linting guide: docs/development/linting-guide.md
- Follow the priority order in .ruler/linting-priorities.md
```

---

**Last Updated:** January 10, 2026
**Next Review:** January 17, 2026 (weekly)
**Status:** Ready for Implementation
