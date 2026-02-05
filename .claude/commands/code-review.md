Review uncommitted code changes for security, quality, and PlayerARC pattern adherence.

## Arguments
$ARGUMENTS - Optional scope: "staged" (default), "all", "main" (diff vs main branch)

## Instructions

1. Read the code-reviewer agent definition at `.claude/agents/code-reviewer.md`
2. Determine scope:
   - **"staged"** or no argument: Review `git diff --cached`
   - **"all"**: Review `git diff HEAD` (all uncommitted changes)
   - **"main"**: Review `git diff main...HEAD` (all branch changes)
3. Get the list of changed files and read each one fully
4. Review against these categories (in priority order):

### CRITICAL (Blocks merge)
- Hardcoded secrets or API keys
- Missing auth checks on Convex mutations
- Organization data isolation violations
- XSS vulnerabilities

### HIGH (Should fix)
- `.filter()` instead of `.withIndex()`
- N+1 query patterns (Promise.all with queries in map)
- Wrong Better Auth field names (`user.id` vs `user._id`)
- Missing `returns` validator on Convex functions
- `useQuery` inside list item components

### MEDIUM (Should fix when possible)
- `console.log` statements left in
- Missing error handling
- Deeply nested code (>4 levels)
- Unused imports or `any` types

### LOW (Consider)
- Naming consistency
- Accessibility gaps
- Missing comments on complex logic

### Output
Present a clear verdict: **APPROVE**, **WARN**, or **BLOCK** with all findings organized by severity, including file paths and line numbers.
