# Bug Fixing Workflow

When fixing bugs, follow this process **before making any code changes**:

## Step 1: Analyze the Bug Report
- Thoroughly review all bug details (description, reproduction steps, expected vs actual)
- Do not make assumptions - ask clarifying questions if anything is unclear

## Step 2: Investigate the Codebase
- Explore relevant code paths comprehensively
- Determine if the bug is still active or already fixed
- Identify the root cause (not just symptoms)
- Search for ALL related files and confirm the correct target with the user

## Step 3: Present Findings
- Summarize the bug and its root cause
- Propose potential fixes with trade-offs
- Ask any pertinent questions

## Step 4: Wait for Approval
- **Do not make any code changes** until the user reviews the analysis
- Wait for explicit direction on which fix to implement

## Step 5: Verify and Validate
- Run `npx -w packages/backend convex codegen` and `npm run check-types` after implementing
- When the user reports the fix didn't work, re-investigate thoroughly with actual command output

## GitHub Issue Updates

When updating GitHub issues:
1. Create an MD file first in `docs/archive/bug-fixes/`
2. Use `--body-file` flag: `gh issue comment <number> --repo NB-PDP-Testing/PDP --body-file <path>`
3. NEVER use inline `--body "..."` - content gets truncated
