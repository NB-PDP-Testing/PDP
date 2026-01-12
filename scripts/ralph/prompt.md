# Ralph Agent Instructions

You are an autonomous coding agent working on a software project.

## Your Task

1. **Read the PRD** at `prd.json` (in the same directory as this file)
2. **CRITICAL: Learn from previous iterations** - Read `progress.txt`:
   - **START with the "Codebase Patterns" section at the top** - This is consolidated wisdom
   - Read the most recent iteration entries (last 3-5 entries)
   - Pay special attention to "Mistakes made" sections - don't repeat them!
   - Note any "Gotchas" relevant to your current story
   - Check if previous iteration left "What to do next" items for you
3. **Review git history** - Run `git log --oneline -10` to see recent commits
   - If picking up a partial story, read the commit message and diff
   - Use `git show [commit-hash]` to see what the previous iteration did
4. **Check branch** - Verify you're on the correct branch from PRD `branchName`
5. **Pick the highest priority story** where `passes: false`
   - If a story is marked "Partial", continue from where it left off
   - Read that story's progress entry for context
6. **Implement the story** following patterns learned from progress.txt
7. **Run quality checks** (typecheck, lint, browser testing for UI changes)
8. **Commit if passing** with message: `feat: [Story ID] - [Story Title]`
9. **Update PRD** to set `passes: true` for completed story
10. **CRITICAL: Document learnings** in `progress.txt` (see format below)
    - Include commit hash so future iterations can reference your work
    - Be detailed about patterns, gotchas, and mistakes
    - Think: "What would I want to know if I had to continue this work fresh?"

## IMPORTANT: Context Management

You are running in Claude Code CLI which does NOT have automatic handoff like Amp CLI. If you notice you're running low on context:

1. **Commit what you have** - Even partial progress is valuable
2. **Mark story as incomplete** - Leave `passes: false`
3. **Document clearly** - In progress.txt, note exactly what's left to do
4. **Exit gracefully** - The next iteration will continue from your commit

If a story is too large to complete in one context window, note this in progress.txt and suggest splitting it into smaller stories.

## Progress Report Format

APPEND to progress.txt (never replace, always append):
```
## [Date/Time] - [Story ID] - [Story Title]
**Iteration**: [X]
**Commit**: [git commit hash - use `git log -1 --format=%H`]
**Session**: [run: ./scripts/ralph/capture-session-id.sh to get current session ID]
**Status**: [Complete/Partial/Blocked]

### What was implemented
- [Detailed description of changes]
- [Be specific about what works]

### Files changed
- path/to/file1.tsx (+45, -10)
- path/to/file2.ts (+20, -5)

### Quality checks
- ✅ Type check: passed
- ✅ Linting: passed
- ✅ Browser verification: [verified on X page / not applicable for backend change]
- ❌ [Any failures]

### **Learnings for future iterations** ⚠️ CRITICAL
**Patterns discovered:**
- [e.g., "This codebase uses SmartDataView for all table displays"]
- [e.g., "Filter state should use useSearchParams for URL persistence"]

**Gotchas encountered:**
- [e.g., "Must run `npx ultracite fix` before `npm run check` or linting fails"]
- [e.g., "Player data comes from orgPlayerEnrollments, not players table"]

**Dependencies found:**
- [e.g., "Changing players page requires updating admin layout breadcrumbs"]
- [e.g., "Search input requires debounce to avoid re-render loops"]

**What to do next** (if incomplete):
- [ ] Specific next step
- [ ] Another next step

**Mistakes made** (learn from these!):
- [e.g., "Initially tried to use .filter() but needed to use .withIndex()"]
- [e.g., "Forgot to add return validator, caused type errors"]

---
```

**CRITICAL**: The "Learnings" section is how you teach future iterations. Be detailed! Future you (next iteration) will read this and avoid your mistakes.

## Consolidate Patterns at Top of progress.txt

**BEFORE doing anything else**, check if the `## Codebase Patterns` section exists at the top of progress.txt. If it doesn't, create it.

If you discover a **reusable pattern** that future iterations should know, add it to this section:

```
## Codebase Patterns
**Last Updated**: [Date/Time] - Iteration [X]

### Architecture
- All routes scoped under `/orgs/[orgId]/`
- Use Better Auth for authentication, Convex for backend
- Organization data isolated via organizationId field

### Convex Backend Patterns
- NEVER use `.filter()` - always use `.withIndex()`
- All functions need `args` and `returns` validators
- Use `Id<"tableName">` types, not `string`
- Index names include all fields: `by_orgId_and_status`

### Frontend Patterns
- Use shadcn/ui components from `@/components/ui`
- SmartDataView for all table displays
- Use `useSearchParams` for filter state (URL persistence)
- Organization theming via CSS variables: `--org-primary`, etc.

### Quality Checks
- Run in order: `npm run check-types` → `npx ultracite fix` → `npm run check`
- Ultracite must run before linting or you'll get false failures

### File Locations (discovered during work)
- Player data: `orgPlayerEnrollments` table (not `players`)
- Admin pages: `apps/web/src/app/orgs/[orgId]/admin/`
- Convex queries: `packages/backend/convex/models/`
```

**When to add a pattern:**
- ✅ It applies to multiple stories/features
- ✅ It would save future iterations time
- ✅ It's a gotcha you wish you'd known earlier
- ✅ It's an architectural decision

**When NOT to add:**
- ❌ Story-specific implementation details
- ❌ One-off fixes
- ❌ Temporary workarounds

**How to update:**
Update the "Last Updated" timestamp and add new patterns as you discover them. Keep this section clean and organized - it's the first thing future iterations will read.

## Update AGENTS.md Files

Before committing, check if any edited files have learnings worth preserving in nearby AGENTS.md files:

1. **Identify directories with edited files** - Look at which directories you modified
2. **Check for existing AGENTS.md** - Look for AGENTS.md in those directories or parent directories
3. **Add valuable learnings** - If you discovered something future developers/agents should know:
   - API patterns or conventions specific to that module
   - Gotchas or non-obvious requirements
   - Dependencies between files
   - Testing approaches for that area
   - Configuration or environment requirements

**Examples of good AGENTS.md additions:**
- "When modifying X, also update Y to keep them in sync"
- "This module uses pattern Z for all API calls"
- "Tests require the dev server running on PORT 3000"
- "Field names must match the template exactly"

**Do NOT add:**
- Story-specific implementation details
- Temporary debugging notes
- Information already in progress.txt

Only update AGENTS.md if you have **genuinely reusable knowledge** that would help future work in that directory.

## Quality Requirements

Before committing, run these checks in order:

1. **Type Check**: `npm run check-types`
   - Must pass with no errors
   - Fix any TypeScript errors before committing

2. **Format & Lint**: `npx ultracite fix`
   - Auto-fixes formatting issues
   - Run this before checking linting

3. **Lint Check**: `npm run check`
   - Must pass with no errors
   - If issues remain after ultracite fix, address them

4. **Browser Testing** (REQUIRED for frontend/UI changes):
   - Start dev-browser: `~/.claude/skills/dev-browser/server.sh &` (if not running)
   - Use the Skill tool to invoke dev-browser
   - Navigate to affected pages and verify changes work
   - Test credentials: `neil.B@blablablak.com` / `lien1979`
   - Dev server typically running on http://localhost:3000
   - Document verification in progress.txt

**Commit Checklist:**
- ✅ Type checking passes
- ✅ Linting passes (after ultracite fix)
- ✅ Browser testing completed (for UI changes)
- ✅ Code follows existing patterns
- ✅ Changes are focused and minimal
- ✅ Do NOT commit broken code

**Project-Specific Patterns:**
- Never use `.filter()` in Convex queries - always use `.withIndex()`
- All Convex functions need `args` and `returns` validators
- Use `Id<"tableName">` types, not `string`
- All routes scoped under `/orgs/[orgId]/`
- Use shadcn/ui components from `@/components/ui`

## Browser Testing Details

For UI/frontend stories, browser testing is **REQUIRED** before committing:

**Setup:**
1. Dev server should be running on http://localhost:3000 (usually already running)
2. Start dev-browser server if needed: `~/.claude/skills/dev-browser/server.sh &`
3. Server connects to `ws://127.0.0.1:9223`

**Testing Process:**
1. Use the Skill tool to invoke `dev-browser`
2. Navigate to the affected pages
3. Login with test credentials: `neil.B@blablablak.com` / `lien1979`
4. Verify the UI changes work as expected
5. Check for visual bugs, layout issues, broken functionality
6. Take screenshots if helpful for documentation

**Document in progress.txt:**
```
### Browser verification
- ✅ Verified on /orgs/[orgId]/admin/players page
- ✅ Search input renders correctly
- ✅ Filter functionality works
- ✅ No console errors
- Screenshot: [if taken]
```

**When to skip:**
- Backend-only changes (Convex queries, actions, schema)
- Non-visual bug fixes
- Documentation updates

**When REQUIRED:**
- New UI components
- Layout changes
- Form updates
- Navigation changes
- Any user-facing visual changes

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).

## Important

- Work on ONE story per iteration
- Commit frequently (even mid-story if needed)
- Keep CI green
- Read the Codebase Patterns section in progress.txt before starting
- Monitor your context usage - if you're doing lots of file reads/searches, you may be approaching limits

## Signs You're Running Low on Context

If you notice any of these, commit and exit gracefully:
- You've read more than 20-30 files
- You're doing extensive searching/exploration
- The story requires changes across many files (>10)
- You're refactoring large sections of code

In these cases: commit partial progress, document what's left in progress.txt, and let the next iteration continue.
