Generate comprehensive documentation for a completed phase.

## Arguments
$ARGUMENTS - Optional feature slug (e.g., "phase-9-week-4"). Auto-detected from PRD if not provided.

## Instructions

1. Read the documenter agent definition at `.claude/agents/documenter-ai.md`
2. Determine the feature slug:
   - Use the provided argument if given
   - Otherwise auto-detect from `scripts/ralph/prd.json` (extract from `branchName`)
3. Launch a Task agent (subagent_type: "general-purpose") to generate documentation

The documenter should gather context from:
- `scripts/ralph/prd.json` - completed stories and acceptance criteria
- `scripts/ralph/progress.txt` - implementation notes
- `git log --oneline -30` - recent commit history
- `git diff main...HEAD --name-only` - changed files

### Documentation Output

Generate `docs/features/[feature-slug].md` containing:

1. **Executive Summary** - what was built and business value
2. **Overview** - phase, branch, story count, timeline
3. **What Was Built** - features grouped by theme with story references
4. **Architecture & Design** - components, data model, patterns, integrations
5. **Implementation Highlights** - notable code, hooks, utilities
6. **Story Breakdown** - each story with implementation details and acceptance criteria
7. **Challenges & Solutions** - problems encountered and how they were solved
8. **Testing Strategy** - test coverage, UAT, manual testing
9. **Technical Debt** - known issues, future enhancements
10. **Key Files Reference** - new and modified files with descriptions

### Also
- Write a summary to `scripts/ralph/agents/output/feedback.md`
- Present key insights to the user when complete
