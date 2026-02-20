#!/bin/bash
# Session Start Hook
# Shows Ralph project status when Claude Code starts

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

echo "🤖 Ralph Project Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Ralph status
if pgrep -f "ralph.sh" > /dev/null 2>&1; then
  echo "Ralph: RUNNING ✅"
else
  echo "Ralph: STOPPED ⏸️"
fi

# Check monitoring agents
AGENTS=0
for agent in quality-monitor prd-auditor documenter test-runner security-tester code-review-gate; do
  [ -f "scripts/ralph/agents/output/${agent}.pid" ] && kill -0 $(cat "scripts/ralph/agents/output/${agent}.pid") 2>/dev/null && ((AGENTS++))
done

echo "Agents: $AGENTS/6 running"

# Check PRD progress
if [ -f scripts/ralph/prd.json ]; then
  COMPLETED=$(jq '[.userStories[] | select(.passes == true)] | length' scripts/ralph/prd.json 2>/dev/null || echo 0)
  TOTAL=$(jq '.userStories | length' scripts/ralph/prd.json 2>/dev/null || echo 0)
  echo "Stories: $COMPLETED/$TOTAL complete"
fi

# Check pending feedback
if [ -f scripts/ralph/agents/output/feedback.md ]; then
  LINES=$(wc -l < scripts/ralph/agents/output/feedback.md 2>/dev/null || echo 0)
  if [ "$LINES" -gt 50 ]; then
    echo "⚠️  Feedback: $LINES lines pending (Ralph should review)"
  elif [ "$LINES" -gt 0 ]; then
    echo "Feedback: $LINES lines"
  fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit 0
