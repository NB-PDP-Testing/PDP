# CI Linting Fix - Quick Instructions

## The Problem

Current CI config (lines 56-79 in `.github/workflows/ci.yml`) exits with code 0 (success) even when linting errors are present.

## The Fix

Replace lines 56-79 with:

```yaml
      - name: Run linting (changed files only)
        run: |
          echo "Checking linting on changed files..."

          # Get list of changed TypeScript/JavaScript files
          if [ "${{ github.event_name }}" == "pull_request" ]; then
            CHANGED_FILES=$(git diff --name-only --diff-filter=ACMRT origin/main...HEAD | grep -E '\.(ts|tsx|js|jsx)$' || true)
          else
            CHANGED_FILES=$(git diff --name-only --diff-filter=ACMRT HEAD~1 | grep -E '\.(ts|tsx|js|jsx)$' || true)
          fi

          # If no TypeScript/JavaScript files changed, exit success
          if [ -z "$CHANGED_FILES" ]; then
            echo "✅ No TypeScript/JavaScript files changed - skipping lint"
            exit 0
          fi

          echo "Files to lint:"
          echo "$CHANGED_FILES"
          echo ""

          # Run biome check on changed files - FAIL if errors found
          echo "Running biome check..."
          npx biome check --changed --diagnostic-level=error .

          LINT_EXIT_CODE=$?

          if [ $LINT_EXIT_CODE -ne 0 ]; then
            echo ""
            echo "❌ LINTING FAILED!"
            echo "Found linting errors in changed files."
            echo ""
            echo "To fix locally:"
            echo "1. Check errors: npx biome check --changed ."
            echo "2. Auto-fix safe issues: npx biome check --write <file>"
            echo "3. Manually fix remaining issues"
            echo ""
            exit 1
          fi

          echo "✅ Linting passed!"
```

## Quick Steps

1. Open `.github/workflows/ci.yml`
2. Find line 56 (starts with `- name: Run linting`)
3. Replace through line 79 with code above
4. Commit and push
5. Test by creating a PR with a small change

## Verification

After deploying, CI should:
- ✅ Pass if no TS/JS files changed
- ✅ Pass if files changed but no linting errors
- ❌ **FAIL** if files changed with linting errors (this is the fix!)

Before the fix, #3 would pass (bad). After the fix, #3 will fail (good).
