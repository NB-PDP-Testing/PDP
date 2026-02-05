Find and safely remove dead code, unused dependencies, and duplicate files.

## Arguments
$ARGUMENTS - Optional scope: "analyze" (default, read-only), "clean" (actually remove)

## Instructions

1. Read the refactor-cleaner agent definition at `.claude/agents/refactor-cleaner.md`
2. Run analysis tools:
   - Find macOS duplicate files (`" 2.tsx"`, `" 3.md"` pattern)
   - Check for unused npm dependencies with `npx depcheck`
   - Search for unused exports with `npx knip` (install if needed)
   - Find unused imports with Biome
3. Categorize findings:
   - **SAFE** - Definitely unused, zero references (e.g., macOS duplicates)
   - **CAREFUL** - Probably unused but verify (components, utilities)
   - **SKIP** - Config, schema, auth, or public API files

### If scope is "analyze" (default)
- Present findings organized by category
- Show file counts, estimated size savings
- Do NOT delete anything
- Ask for approval before proceeding

### If scope is "clean"
- Only remove items categorized as SAFE
- Remove one category at a time:
  1. macOS duplicate files first
  2. Unused npm dependencies
  3. Unused exports/files
- Run `npm run check-types` and `npm run build` after each batch
- Revert if anything breaks
- Report what was removed

### Never remove
- Schema definitions or indexes
- Better Auth extensions
- Files in `mvp-app/` or `.ruler/`
- Convex model files (might be called from frontend)
