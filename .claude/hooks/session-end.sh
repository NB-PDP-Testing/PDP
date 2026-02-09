#!/bin/bash
# Session End Hook
# Shows comprehensive summary when Claude Code session ends

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

echo ""
echo "📊 SESSION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Current branch
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "Branch:       $BRANCH"

# Commits this session
RECENT=$(git rev-list --count HEAD@{1}..HEAD 2>/dev/null || echo 0)
if [ "$RECENT" -gt 0 ]; then
  echo "Commits:      $RECENT new"
else
  echo "Commits:      none"
fi

# Files changed (uncommitted)
MODIFIED=$(git status --short 2>/dev/null | wc -l | tr -d ' ')
if [ "$MODIFIED" -gt 0 ]; then
  echo "Uncommitted:  ⚠️  $MODIFIED files"
else
  echo "Uncommitted:  clean"
fi

# Type errors
TSC_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" 2>/dev/null || echo 0)
if [ "$TSC_ERRORS" -gt 0 ]; then
  echo "Type errors:  ❌ $TSC_ERRORS remaining"
else
  echo "Type errors:  ✅ none"
fi

# PRD progress
if [ -f scripts/ralph/prd.json ]; then
  COMPLETED=$(jq '[.userStories[] | select(.passes == true)] | length' scripts/ralph/prd.json 2>/dev/null || echo 0)
  TOTAL=$(jq '.userStories | length' scripts/ralph/prd.json 2>/dev/null || echo 0)
  echo "Stories:      $COMPLETED/$TOTAL complete"
fi

# Pending feedback
if [ -f scripts/ralph/agents/output/feedback.md ]; then
  FEEDBACK=$(wc -l < scripts/ralph/agents/output/feedback.md 2>/dev/null | tr -d ' ')
  if [ "$FEEDBACK" -gt 0 ]; then
    echo "Feedback:     $FEEDBACK lines pending"
  fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
exit 0
