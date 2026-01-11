# Code Quality Checks - REQUIRED Before Completion

## CRITICAL: Always Check Before Saying "Done"

After writing ANY code (Edit or Write tools), you MUST:

1. **Review PostToolUse hook output** - The hooks automatically run after every edit showing:
   - TypeScript errors (first 30 lines)
   - Linting issues (last 50 lines with summary)
   - If you see errors, FIX THEM before proceeding

2. **If errors shown in hook output:**
   ```bash
   # Check TypeScript errors
   npm run check-types

   # Check linting issues in specific file
   npx biome check path/to/file.tsx

   # Auto-fix safe issues
   npx biome check --write path/to/file.tsx
   ```

3. **Verify formatting:**
   - Ultracite auto-formats via hooks
   - Should be automatic, no action needed

## NEVER Commit Code With:

- TypeScript errors
- Linting errors in files you modified
- Unformatted code

## Before Using Bash Tool to Commit:

1. PreToolUse hook will show current errors - READ IT
2. If errors shown, STOP and fix them first
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
