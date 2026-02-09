Run a full review-and-fix pipeline on the current branch. Execute each phase in order, tracking findings as you go.

## Phase 1: Architecture Review
Use a Task agent (subagent_type: Explore) to scan all changed files on this branch vs main:
- Run `git diff main...HEAD --name-only` to get the changed file list
- Check for: N+1 query patterns, missing indexes, .filter() usage, inconsistent patterns vs CLAUDE.md conventions
- Check for: missing organizationId scoping, user.id vs user._id errors
- Record findings with severity (critical/high/medium)

## Phase 2: Code Review
Scan changed files for:
- console.log statements in non-test files
- TypeScript type safety issues (run `npx tsc --noEmit` and capture errors)
- Missing error handling at system boundaries
- Unused imports or dead code
- Components over 200 lines that should be split
- Record findings with severity

## Phase 3: Security Review
Scan changed files for:
- Missing permission/auth checks in mutations
- Exposed internal IDs in API responses
- Unvalidated inputs at system boundaries
- Hardcoded secrets or credentials
- dangerouslySetInnerHTML without sanitization
- Record findings with severity

## Phase 4: Fix All
- Sort all findings by severity (critical > high > medium)
- Implement each fix
- After each file edit, verify `npx tsc --noEmit` passes for that file
- If the same error fails twice, STOP and explain the two failed approaches before trying a third

## Phase 5: Validate
- Run `npm run check-types` for full type check
- Run `npx ultracite fix` for formatting
- If all pass, present a summary table of all findings and their resolution status

## Output Format
Present a final summary table:

| # | Severity | Category | File | Finding | Status |
|---|----------|----------|------|---------|--------|
| 1 | Critical | N+1 | models/foo.ts | Promise.all with query in map | Fixed |
| 2 | High | Security | models/bar.ts | Missing auth check | Fixed |
| 3 | Medium | Code | components/baz.tsx | console.log left in | Fixed |

Then ask: "All checks pass. Ready to commit these fixes?"
