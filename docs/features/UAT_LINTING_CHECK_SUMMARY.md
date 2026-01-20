# UAT Linting Check - Quick Reference

**Status:** ✅ Implemented (2026-01-20)

## What It Does

Before running UAT tests, the system automatically checks that **files changed in your branch** pass linting validation. If any linting errors are found, tests are blocked until you fix them.

## How It Works

```
npm run test
    ↓
1. ✅ Verify app is running
2. 🔍 Run linting check on changed files (NEW)
    - Compares current branch to main: git diff main...HEAD
    - Checks only .ts/.tsx/.js/.jsx files
    - Uses same biome rules as pre-commit hook
3. 🔐 Authenticate test users (only if linting passed)
    ↓
Tests run (only if all passed)
```

## Behavior

| Scenario | Pre-Commit Hook | UAT Linting Check |
|----------|-----------------|-------------------|
| **What's checked** | Staged files only | Files changed in branch (vs main) |
| **Old code with errors** | ❌ Ignored | ❌ Ignored |
| **New code with errors** | ✅ Blocked | ✅ Blocked |
| **Command** | \`npx lint-staged\` | \`git diff main...HEAD\` + \`npx biome check\` |

**Key Point:** If all your commits passed linting, UAT tests will also pass linting. They use the same validation, just different scopes.

## Example Output

### Success Case
```bash
npm run test

✅ Application is running at http://localhost:3000

🔍 UAT Pre-Test: Running linting check on changed files...
   Checking 5 changed file(s)...
Checked 2 files in 465ms. No fixes applied.
✅ Linting check passed!

[owner] 🔄 Starting login...
# Tests proceed normally
```

### Failure Case
```bash
npm run test

✅ Application is running at http://localhost:3000

🔍 UAT Pre-Test: Running linting check on changed files...
   Checking 3 changed file(s)...

apps/web/src/app/page.tsx:10:7 lint/correctness/noUnusedVariables
  × This variable is unused.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ LINTING FAILED - UAT tests cannot proceed

Fix linting errors in changed files before running tests:
  npx biome check --write <file>   # Auto-fix safe issues
  npx biome check <file>           # View all issues
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Error: Linting check failed - UAT tests blocked
```

## What Files Are Checked?

**Checked:**
- ✅ TypeScript/JavaScript files changed in your branch (\`.ts\`, \`.tsx\`, \`.js\`, \`.jsx\`)
- ✅ Production code: \`apps/web/src\`, \`packages/backend/convex\`

**Not Checked:**
- ❌ Files not modified in your branch (old code)
- ❌ UAT test files (excluded by biome.json)
- ❌ Generated files, node_modules, etc.

## How to Fix Linting Errors

```bash
# View all errors in a file
npx biome check apps/web/src/app/page.tsx

# Auto-fix safe issues
npx biome check --write apps/web/src/app/page.tsx

# Or fix all changed files at once
git diff --name-only main...HEAD | grep -E '\.(ts|tsx|js|jsx)$' | xargs npx biome check --write
```

## Why This Approach?

**Problem:** Originally checked entire codebase (430+ errors in old files) → blocked tests even though all commits passed linting.

**Solution:** Check only files changed in branch → matches pre-commit behavior → tests pass when commits pass.

**Benefit:** Consistency across the development workflow:
- Pre-commit checks staged files
- UAT checks branch changes
- Both ignore old code with existing errors
- Both enforce quality on new code

## Technical Details

**Implementation:** \`apps/web/uat/global-setup.ts\`

**Git command:** \`git diff --name-only --diff-filter=ACM main...HEAD\`

**Biome command:** \`npx biome check --diagnostic-level=error --files-ignore-unknown=true --no-errors-on-unmatched <files>\`

**Full documentation:** See \`docs/features/UAT_LINTING_CHECK_PRD.json\`

## FAQ

**Q: Can I skip the linting check?**
A: No, it's always enforced to maintain code quality.

**Q: What if I'm on main branch?**
A: No files will be detected as "changed", so linting passes immediately.

**Q: What if linting fails?**
A: Fix the errors in your changed files, commit, and try again.

**Q: Does this slow down tests?**
A: Adds ~0.5-1 second. Much faster than running tests with broken code.

**Q: Why not check all files?**
A: Same reason pre-commit doesn't check all files - we validate changes, not entire codebase.
