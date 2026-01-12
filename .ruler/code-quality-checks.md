# Code Quality Checks - REQUIRED Before Completion

## CRITICAL: Always Check Before Saying "Done"

After writing ANY code (Edit or Write tools), you MUST:

1. **Review PostToolUse hook output** - The hooks automatically run after every edit showing:
   - Ultracite auto-formats the file
   - Linting issues for THE SPECIFIC FILE you edited (max 10 diagnostics)
   - If you see errors in YOUR file, FIX THEM before proceeding

2. **If errors shown in hook output:**
   ```bash
   # Check linting issues in specific file
   npx biome check path/to/file.tsx

   # Auto-fix safe issues
   npx biome check --write path/to/file.tsx

   # Check TypeScript errors (if needed)
   npm run check-types
   ```

3. **Verify formatting:**
   - Ultracite auto-formats via hooks
   - Should be automatic, no action needed

## NEVER Commit Code With:

- TypeScript errors
- Linting errors in files you modified
- Unformatted code

## Team-Wide Pre-commit Hook (Husky + lint-staged)

This project uses **Husky** and **lint-staged** for team-wide pre-commit enforcement.

**How it works:**

- `.husky/pre-commit` runs automatically before every commit
- `lint-staged` runs `biome check` only on staged `.ts/.tsx/.js/.jsx` files
- **Commits are BLOCKED** if linting errors are found
- All developers get this automatically on `npm install`

**What triggers a block:**

- Error-level linting rules (e.g., `noVar`, `noParameterAssign`)
- Formatting issues
- Note: Warning-level rules (e.g., `noExplicitAny`) do NOT block commits

**Bypass (NOT recommended):**

```bash
git commit --no-verify
```

## Before Using Bash Tool to Commit

1. PreToolUse hook will warn if trying to commit
2. Husky pre-commit hook will block if staged files have errors
3. Only proceed with commit after fixing issues

## The "Fix as You Go" Rule:

When modifying a file, fix ALL linting issues in that file, not just avoid adding new ones. This includes:

- Existing `any` types - replace with proper types
- Missing button types - add `type="button"`
- Accessibility issues - add proper ARIA attributes
- Complexity issues - refactor if touching the function

## Quick Fix Commands:

```bash
# Check specific file
npx biome check path/to/file.tsx

# Auto-fix safe issues in file
npx biome check --write path/to/file.tsx

# Check all changed files (local dev)
npx biome check --changed .

# Full TypeScript check
npm run check-types

# Format code
npx ultracite fix
```

## Common Fixes:

| Error | Fix |
|-------|-----|
| `noExplicitAny` | Replace `any` with proper type |
| `useButtonType` | Add `type="button"` to `<button>` |
| `noLabelWithoutControl` | Add `htmlFor` to `<label>`, `id` to input |
| `useExhaustiveDependencies` | Add missing deps or wrap in useCallback |
| `noNestedTernary` | Refactor to if/else or early returns |

## If You're Unsure:

- Check `.ruler/linting-priorities.md` for priority order
- Check `docs/development/linting-guide.md` for detailed guidance
- Ask the user for clarification on complex issues
