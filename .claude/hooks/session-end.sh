#!/bin/bash
# Session End Hook
# Shows summary when Claude Code session ends

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

echo ""
echo "📊 RALPH SESSION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f scripts/ralph/prd.json ]; then
  COMPLETED=$(jq '[.userStories[] | select(.passes == true)] | length' scripts/ralph/prd.json 2>/dev/null || echo 0)
  TOTAL=$(jq '.userStories | length' scripts/ralph/prd.json 2>/dev/null || echo 0)
  echo "Stories completed: $COMPLETED/$TOTAL"
fi

if [ -f scripts/ralph/agents/output/feedback.md ]; then
  FEEDBACK=$(wc -l < scripts/ralph/agents/output/feedback.md 2>/dev/null || echo 0)
  echo "Feedback for Ralph: $FEEDBACK lines"
fi

# Recent commits
RECENT=$(git rev-list --count HEAD@{1}..HEAD 2>/dev/null || echo 0)
if [ "$RECENT" -gt 0 ]; then
  echo "Commits this session: $RECENT"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
exit 0
