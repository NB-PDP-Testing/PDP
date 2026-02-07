Run a deep security review of recent code changes.

## Arguments
$ARGUMENTS - Optional scope: "latest" (default), "all", or a story ID like "US-P9-055"

## Instructions

1. Read the security reviewer agent definition at `.claude/agents/security-reviewer.md`
2. Determine the scope of the review:
   - **"latest"** or no argument: Review the most recent git commit
   - **"all"**: Review all changes in current branch vs main
   - **Story ID**: Review files related to that specific story
3. Launch a Task agent (subagent_type: "general-purpose") to perform the security review

The security review should check for:

### CRITICAL Issues
- Hardcoded secrets (API keys, tokens, passwords)
- XSS vulnerabilities (unsafe HTML rendering, `dangerouslySetInnerHTML`)
- Authentication bypass
- Authorization vulnerabilities (missing permission checks)
- Command injection

### HIGH Priority
- Missing rate limiting on sensitive endpoints
- Insecure direct object references
- Sensitive data exposure in logs/errors
- Missing input validation
- CORS misconfigurations

### MEDIUM Priority
- Missing CSRF protection
- Insufficient logging
- Information disclosure

### Platform-Specific Checks
- Convex mutations missing auth checks
- Better Auth patterns used incorrectly
- Organization data isolation violations
- `.filter()` usage instead of `.withIndex()`

### Output
- Write findings to `scripts/ralph/agents/output/feedback.md`
- Present a summary with severity counts
- Include specific file paths and line numbers for each issue
- Provide fix recommendations
