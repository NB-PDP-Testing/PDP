#!/bin/bash
# Security Review Command
# Triggers the security-reviewer agent via Claude Code Task tool
#
# Usage: /review-security [scope]
#   scope: "latest" (default), "all", "story US-XXX"

cd "$(dirname "$0")/../.."

SCOPE="${1:-latest}"

echo "🔒 Triggering Security Review Agent..."
echo "Scope: $SCOPE"
echo ""

# Prepare context based on scope
case "$SCOPE" in
    "latest")
        CONTEXT="Review security of the most recent git commit"
        ;;
    "all")
        CONTEXT="Review security of all changes in current branch vs main"
        ;;
    story*)
        STORY_ID="$SCOPE"
        CONTEXT="Review security of completed story $STORY_ID"
        ;;
    *)
        echo "Unknown scope: $SCOPE"
        echo "Usage: /review-security [latest|all|story US-XXX]"
        exit 1
        ;;
esac

echo "Delegating to security-reviewer agent..."
echo "Context: $CONTEXT"
echo ""
echo "The agent will:"
echo "  1. Scan changed files for vulnerabilities"
echo "  2. Check OWASP Top 10 security issues"
echo "  3. Validate authorization and input validation"
echo "  4. Write findings to scripts/ralph/agents/output/feedback.md"
echo ""
echo "⏳ This may take 30-60 seconds for deep analysis..."
echo ""

# This script is meant to be called by Claude Code, which will then spawn the agent
# The actual agent invocation happens via Claude Code's Task tool
cat << 'AGENT_PROMPT'

Please invoke the security-reviewer agent with the following:

Task: {
  subagent_type: "security-reviewer",
  description: "Security review of recent changes",
  prompt: "CONTEXT

Read the security-reviewer agent definition at .claude/agents/security-reviewer.md and follow its workflow.

Focus on:
- Authentication and authorization vulnerabilities
- XSS risks in user-generated content
- Missing input validation
- Hardcoded secrets
- Rate limiting gaps
- Phase-specific security concerns

Write your findings to scripts/ralph/agents/output/feedback.md following the format specified in the agent definition."
}

AGENT_PROMPT
