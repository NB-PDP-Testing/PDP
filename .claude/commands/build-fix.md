Fix all TypeScript and build errors with minimal changes.

## Instructions

1. Read the build-error-resolver agent definition at `.claude/agents/build-error-resolver.md`
2. Run diagnostics in this order, stopping at the first failure:
   - `npm run check-types` - TypeScript type checking
   - `npx -w packages/backend convex codegen` - Convex type generation
   - `npm run build` - Full Next.js production build
3. Parse all errors, group by file, sort by severity
4. For each error:
   - Read the file to understand context
   - Apply the **smallest possible fix**
   - Do NOT refactor, rename, or improve unrelated code
5. After fixing a batch, re-run the failing command to verify
6. If a fix introduces new errors, revert and try a different approach
7. Stop if the same error persists after 3 attempts

### Rules
- Fix one error at a time for safety
- Only change the lines that are broken
- Run `npx ultracite fix` on changed files for formatting
- Report: errors found, errors fixed, files changed, verification status

### Stack-specific patterns to know
- Convex validators: use `v.id("tableName")` not `v.string()` for IDs
- Better Auth: use `user._id` not `user.id`, use `user.name` not `user.firstName`
- Convex functions need `returns` validator
- Next.js App Router: `"use client"` must be first line
