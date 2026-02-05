#!/bin/bash
# Check for New PRD Phase Hook
# Runs on SessionStart to notify user of new PRD phases
# Non-interactive - just displays notification

# Read hook input from stdin
INPUT=$(cat)

# Project directory
PROJECT_DIR="$CLAUDE_PROJECT_DIR"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

# Check if PRD exists
PRD_FILE="scripts/ralph/prd.json"
if [ ! -f "$PRD_FILE" ]; then
  echo "$INPUT"
  exit 0
fi

# Get current phase from PRD
PHASE=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null | sed 's|ralph/||')
if [ -z "$PHASE" ]; then
  echo "$INPUT"
  exit 0
fi

# Check if already reviewed
REVIEWED_FILE=".claude/.reviewed-phases"
if [ -f "$REVIEWED_FILE" ] && grep -q "^$PHASE\$" "$REVIEWED_FILE" 2>/dev/null; then
  # Already reviewed, no notification needed
  echo "$INPUT"
  exit 0
fi

# New phase detected - get story count
STORY_COUNT=$(jq '.userStories | length' "$PRD_FILE" 2>/dev/null || echo "?")

# Display notification
cat << EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 NEW PRD PHASE DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase:   $PHASE
Stories: $STORY_COUNT

Recommended: Run architectural review before Ralph starts

  /architect-review    → Run full architectural analysis
  /check-prd          → Show PRD details

To skip this notification:
  echo "$PHASE" >> .claude/.reviewed-phases

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF

# Pass through the input unchanged
echo "$INPUT"
exit 0
