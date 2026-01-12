# CI/CD Pipeline & Code Quality Guide

> **Last Updated:** January 12, 2026
> **Status:** All checks passing
> **Recent:** Husky + lint-staged added for team-wide pre-commit hooks

---

## Quick Reference

| Check | Where | Blocks? | What It Does |
|-------|-------|---------|--------------|
| **Pre-commit Hook** | Local (Husky) | YES | Lints staged files before commit |
| **TypeScript** | CI | YES | Type checking across all packages |
| **Linting** | CI | YES | Biome check on changed files only |
| **Build** | CI | YES | Next.js production build |
| **Security Scan** | CI | NO | npm audit (non-blocking) |
| **Bundle Size** | CI | YES | Build analysis |
| **Convex Validation** | CI | NO | Schema validation (non-blocking) |

---

## How Code Quality Is Enforced

### Layer 1: Claude Code Hooks (Immediate Feedback)

When using Claude Code CLI, hooks run automatically after file edits:

```
Edit/Write file → ultracite formats → biome checks → errors shown
```

**Configuration:** `.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [
        { "command": "npx ultracite fix $CLAUDE_FILE_PATH" },
        { "command": "npx biome check --max-diagnostics=10 $CLAUDE_FILE_PATH" }
      ]
    }]
  }
}
```

**What this does:**
- Auto-formats the edited file
- Shows up to 10 linting issues for that specific file
- Provides immediate feedback without checking entire codebase

---

### Layer 2: Pre-commit Hook (Husky + lint-staged)

**NEW (Jan 12, 2026):** All developers now have pre-commit hooks via Husky.

**How it works:**
1. Developer runs `git commit`
2. Husky triggers `.husky/pre-commit`
3. lint-staged runs `biome check` on staged `.ts/.tsx/.js/.jsx` files
4. If errors found → commit blocked
5. If clean → commit proceeds

**Configuration files:**
- `.husky/pre-commit` - Hook script
- `.lintstagedrc.json` - lint-staged config

**What blocks commits:**
- Error-level linting rules (e.g., `noVar`, `noParameterAssign`)
- Formatting issues

**What does NOT block commits:**
- Warning-level rules (e.g., `noExplicitAny`, `noNestedTernary`)
- Files not staged for commit

**Setup for new developers:**
```bash
npm install  # Husky auto-installs hooks
```

**Bypass (NOT recommended):**
```bash
git commit --no-verify
```

---

### Layer 3: CI Pipeline (GitHub Actions)

**File:** `.github/workflows/ci.yml`

**Triggers:** Push to `main`, Pull requests to `main`

#### Jobs Detail

##### 1. TypeScript Type Check (Blocking)
```yaml
- name: Run type check
  run: npm run check-types
```
- Runs `tsc --noEmit` across all packages
- Catches type errors before merge
- **Must pass to merge**

##### 2. Lint Check (Blocking)
```yaml
- name: Run linting (changed files only)
  run: |
    CHANGED_FILES=$(git diff --name-only ... | grep -E '\.(ts|tsx|js|jsx)$')
    echo "$CHANGED_FILES" | xargs npx biome check --diagnostic-level=error
```
- Only checks files changed in the PR/commit
- Does NOT check entire codebase (2400+ existing issues)
- Prevents NEW linting issues
- **Must pass to merge**

##### 3. Build Check (Blocking)
```yaml
- name: Build
  run: npm run build
```
- Full Next.js production build
- Catches build-time errors
- **Must pass to merge**

##### 4. Security Scan (Non-blocking)
```yaml
- name: Run npm audit
  run: npm audit --audit-level=moderate
  continue-on-error: true
```
- Checks for known vulnerabilities
- Currently non-blocking (see recommendations)
- Review output manually

##### 5. Bundle Size Check (Blocking)
```yaml
- name: Build for production
  run: npm run build
- name: Analyze bundle
  # Reports bundle size
```
- Ensures build succeeds
- Reports bundle metrics

##### 6. Convex Schema Validation (Non-blocking)
```yaml
- name: Validate Convex schema
  run: npx convex dev --once --configure=skip
  continue-on-error: true
```
- Validates Convex schema
- Non-blocking (requires live connection)

---

## Current Linting State

**As of January 12, 2026:**

| Severity | Count | Blocks Commit? | Blocks CI? |
|----------|-------|----------------|------------|
| Errors | 1,261 | YES | YES (if in changed files) |
| Warnings | 1,149 | NO | NO |
| Infos | 15 | NO | NO |
| **Total** | **2,425** | - | - |

**Top Issues:**

| Rule | Count | Severity | Description |
|------|-------|----------|-------------|
| `noExplicitAny` | ~350 | Warning | Using `any` type |
| `useBlockStatements` | ~300 | Warning | Missing braces |
| `noIncrementDecrement` | ~225 | Warning | Using `++`/`--` |
| `noExcessiveCognitiveComplexity` | ~130 | Warning | Complex functions |
| `noNestedTernary` | ~80 | Warning | Nested ternaries |

**Why warnings don't block:**
- 2400+ existing issues would halt all development
- Gradual "fix as you go" approach is safer
- CI still prevents NEW issues in changed files

---

## Developer Workflow

### Before Committing

```bash
# Check your changed files
npx biome check --changed .

# Fix auto-fixable issues
npx biome check --write path/to/your/file.tsx

# Check TypeScript
npm run check-types
```

### When Commit Is Blocked

If you see:
```
❌ COMMIT BLOCKED: Linting errors found in staged files
```

1. Look at the error output
2. Fix the issues:
   ```bash
   npx biome check --write path/to/file.tsx  # Auto-fix safe issues
   npx biome check path/to/file.tsx          # See remaining issues
   ```
3. Stage fixes and retry commit

### When CI Fails

1. Check which job failed in GitHub Actions
2. For linting failures:
   ```bash
   # Reproduce locally
   npx biome check path/to/changed/files.tsx
   ```
3. For TypeScript failures:
   ```bash
   npm run check-types
   ```

---

## Configuration Files Reference

| File | Purpose |
|------|---------|
| `biome.json` | Linting rules and formatting config |
| `.lintstagedrc.json` | Files to check on pre-commit |
| `.husky/pre-commit` | Pre-commit hook script |
| `.claude/settings.json` | Claude Code CLI hooks |
| `.github/workflows/ci.yml` | CI pipeline definition |
| `turbo.json` | Monorepo build config |

### biome.json Key Settings

```json
{
  "linter": {
    "rules": {
      "suspicious": {
        "noExplicitAny": "warn",    // Warning, not error
        "noEvolvingTypes": "warn"
      },
      "style": {
        "noParameterAssign": "error", // Error - blocks commits
        "noNestedTernary": "warn"
      },
      "complexity": {
        "noExcessiveCognitiveComplexity": "warn"
      }
    }
  }
}
```

---

## Recommendations for Future Improvements

### High Priority

#### 1. Elevate Critical Rules to Error Level
**When:** Once warning count drops below 500
**What:** Change these from `warn` to `error` in `biome.json`:
- `noExplicitAny` - Type safety is critical
- `useExhaustiveDependencies` - Prevents React bugs

**How:**
```json
{
  "suspicious": {
    "noExplicitAny": "error"  // Change from "warn"
  }
}
```

#### 2. Make Security Scan Blocking
**When:** After security audit is completed
**What:** Remove `continue-on-error: true` from security job
**Risk if not done:** Vulnerabilities may ship to production

**How:**
```yaml
- name: Run npm audit
  run: npm audit --audit-level=moderate
  # Remove: continue-on-error: true
```

#### 3. Add TypeScript Strict Mode
**When:** During a dedicated cleanup sprint
**What:** Enable stricter TypeScript options
**Benefit:** Catches more errors at compile time

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Medium Priority

#### 4. Add Test Coverage Checks
**What:** Require minimum test coverage for PRs
**Benefit:** Ensures new code is tested

```yaml
- name: Run tests with coverage
  run: npm test -- --coverage
- name: Check coverage threshold
  run: npx coverage-check --threshold 80
```

#### 5. Add PR Size Limits
**What:** Warn or block very large PRs
**Benefit:** Encourages smaller, reviewable changes

#### 6. Add Dependency Review
**What:** Check for license issues and deprecated packages
**How:** Use GitHub's dependency review action

```yaml
- name: Dependency Review
  uses: actions/dependency-review-action@v3
```

### Lower Priority

#### 7. Consider Prettier for Markdown/JSON
**What:** Add formatting for non-code files
**Benefit:** Consistent documentation formatting

#### 8. Add Performance Budgets
**What:** Fail CI if bundle size exceeds threshold
**Benefit:** Prevents performance regressions

#### 9. Add E2E Tests to CI
**What:** Run Playwright tests on PRs
**Consideration:** Adds CI time, needs test stability

---

## Troubleshooting

### "Pre-commit hook not running"

```bash
# Reinstall Husky
npm install
npx husky install
```

### "Linting passes locally but fails in CI"

CI only checks changed files against the base branch:
```bash
# Simulate CI check locally
git diff --name-only origin/main...HEAD | grep -E '\.(ts|tsx)$' | xargs npx biome check
```

### "Too many linting errors"

Don't fix everything at once. Focus on:
1. Files you're already modifying
2. Error-level issues (they block commits)
3. High-impact warnings (`noExplicitAny`)

### "Commit blocked but I need to push WIP"

```bash
git commit --no-verify -m "WIP: description"
```
**Note:** CI will still catch issues. Use sparingly.

---

## Monthly Review Checklist

Run monthly to track progress:

```bash
# Get current linting count
npx biome check . 2>&1 | tail -5

# Check security vulnerabilities
npm audit

# Review bundle size
npm run build && ls -la apps/web/.next/static/chunks/
```

**Update this document with:**
- Current issue counts
- Any new rules added
- Progress toward goals

---

## Related Documentation

- [Linting Guide](./linting-guide.md) - Comprehensive linting plan
- [Biome Configuration](../../biome.json) - Rule definitions
- [CI Workflow](../../.github/workflows/ci.yml) - Pipeline definition

---

**Questions?** Check the linting guide or ask in the team channel.
