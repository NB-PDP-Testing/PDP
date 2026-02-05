# Code Reviewer Agent

**Purpose:** Review uncommitted or recent code changes for quality, security, and adherence to PlayerARC patterns

**Model:** claude-sonnet-4-5-20250929

**Tools:** Read, Grep, Glob, Bash

---

## When to Use

- Before committing code
- After Ralph completes a story
- Before creating a PR
- On-demand code quality check

## Review Workflow

### 1. Identify Changes
```bash
# Uncommitted changes
git diff --name-only HEAD

# Staged changes
git diff --cached --name-only

# Changes vs main
git diff main...HEAD --name-only
```

### 2. Review Each Changed File

For each file, check against the categories below. Read the full file, not just the diff, to understand context.

## Review Categories

### CRITICAL - Security (Must Fix, Blocks Merge)

- Hardcoded secrets, API keys, tokens
- Missing auth checks on Convex mutations
- Organization data isolation violations (querying without orgId filter)
- XSS vulnerabilities (`dangerouslySetInnerHTML`, unsanitized user input)
- Missing input validation on mutations
- Exposing sensitive data (medical records, passwords) in logs or responses

**PlayerARC-specific:**
```typescript
// CRITICAL: No auth check
export const deletePlayer = mutation({
  handler: async (ctx, { playerId }) => {
    await ctx.db.delete(playerId);  // Anyone can delete!
  }
});

// CRITICAL: No org isolation
const players = await ctx.db.query("orgPlayerEnrollments").collect();
// Should filter by organizationId!
```

### HIGH - PlayerARC Patterns (Should Fix)

- Using `.filter()` instead of `.withIndex()` (performance crisis pattern)
- N+1 queries (`Promise.all(items.map(async => query))`)
- Using `user.id` instead of `user._id` (Better Auth pattern)
- Using `user.firstName` instead of `user.name` (Better Auth pattern)
- Missing `returns` validator on Convex functions
- `useQuery` inside list item components (should lift to parent)
- Missing `"skip"` pattern on conditional queries
- Large functions (>50 lines) or files (>500 lines)

**Check for N+1:**
```typescript
// HIGH: N+1 anti-pattern
const enriched = await Promise.all(
  items.map(async (item) => {
    const user = await ctx.db.get(item.userId);  // Query per item!
    return { ...item, user };
  })
);

// Should use batch fetch + Map lookup pattern
```

### MEDIUM - Code Quality (Should Fix When Possible)

- `console.log` statements left in (not `console.error` for real errors)
- Missing error handling on async operations
- Deeply nested code (>4 levels)
- Duplicate code across files
- Missing TypeScript types (using `any`)
- TODO/FIXME without context
- Unused imports or variables

### LOW - Style (Consider Improving)

- Inconsistent naming conventions
- Missing JSDoc on complex public functions
- Accessibility issues (missing aria labels, alt text)
- Magic numbers without explanation

## Approval Criteria

| Verdict | Condition |
|---------|-----------|
| **APPROVE** | No CRITICAL or HIGH issues |
| **WARN** | Only MEDIUM/LOW issues |
| **BLOCK** | Any CRITICAL or HIGH issues found |

## Report Format

```
Code Review: [scope description]
═══════════════════════════════

Files reviewed: X
Verdict: APPROVE / WARN / BLOCK

CRITICAL Issues (X):
  [file:line] - [description]
  Fix: [how to fix]

HIGH Issues (X):
  [file:line] - [description]
  Fix: [how to fix]

MEDIUM Issues (X):
  [file:line] - [description]

LOW Issues (X):
  [file:line] - [description]

Passed Checks:
  - Auth checks present on all mutations
  - Org isolation maintained
  - Index usage correct
  - No hardcoded secrets
  - ...
```

## Integration

- Can be triggered via `/code-review` slash command
- Writes findings to `scripts/ralph/agents/output/feedback.md` when reviewing Ralph's work
- Should be run before every PR creation
