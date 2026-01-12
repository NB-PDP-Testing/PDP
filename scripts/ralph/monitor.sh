#!/bin/bash
# Ralph Progress Monitor
# Run this in a separate terminal while Ralph is running

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
PRD_FILE="$SCRIPT_DIR/prd.json"
SESSION_HISTORY="$SCRIPT_DIR/session-history.txt"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Clear screen and show header
clear
echo "╔════════════════════════════════════════════════════════╗"
echo "║          Ralph Progress Monitor (Live)                ║"
echo "║     Press Ctrl+C to stop monitoring                   ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Track previous values to detect changes
PREV_PROGRESS_SIZE=0
PREV_COMMIT_COUNT=0
PREV_COMPLETE_COUNT=0

while true; do
  # Move cursor to line 6 (after header)
  tput cup 5 0

  # === PRD Status ===
  if [ -f "$PRD_FILE" ]; then
    TOTAL=$(jq '.userStories | length' "$PRD_FILE" 2>/dev/null || echo "?")
    COMPLETE=$(jq '[.userStories[] | select(.passes == true)] | length' "$PRD_FILE" 2>/dev/null || echo "0")
    INCOMPLETE=$((TOTAL - COMPLETE))
    PERCENT=$((COMPLETE * 100 / TOTAL))

    echo -e "${BLUE}📋 PRD Status:${NC}"
    echo -e "   Total Stories: $TOTAL"
    echo -e "   ${GREEN}✓ Complete: $COMPLETE${NC}"
    echo -e "   ${YELLOW}⧖ Remaining: $INCOMPLETE${NC}"
    echo -e "   Progress: ${PERCENT}%"

    # Show progress bar
    BAR_WIDTH=40
    FILLED=$((PERCENT * BAR_WIDTH / 100))
    printf "   ["
    printf "%${FILLED}s" | tr ' ' '█'
    printf "%$((BAR_WIDTH - FILLED))s" | tr ' ' '░'
    printf "] ${PERCENT}%%\n"

    # Detect change
    if [ "$COMPLETE" != "$PREV_COMPLETE_COUNT" ]; then
      echo -e "   ${GREEN}🎉 Story just completed!${NC}"
      PREV_COMPLETE_COUNT=$COMPLETE
    fi
  else
    echo -e "${RED}📋 No prd.json found${NC}"
  fi

  echo ""

  # === Git Activity ===
  COMMIT_COUNT=$(git log --oneline --since="10 minutes ago" 2>/dev/null | wc -l | tr -d ' ')
  echo -e "${BLUE}📝 Recent Git Activity:${NC}"
  echo -e "   Commits (last 10 min): $COMMIT_COUNT"

  if [ "$COMMIT_COUNT" -gt "$PREV_COMMIT_COUNT" ]; then
    echo -e "   ${GREEN}✓ New commit detected!${NC}"
    PREV_COMMIT_COUNT=$COMMIT_COUNT
  fi

  # Show last 3 commits
  git log --oneline -3 --pretty=format:"   %h %s" 2>/dev/null | head -3
  echo ""
  echo ""

  # === Progress Log Activity ===
  if [ -f "$PROGRESS_FILE" ]; then
    PROGRESS_SIZE=$(wc -l < "$PROGRESS_FILE" | tr -d ' ')
    echo -e "${BLUE}📖 Progress Log:${NC}"
    echo -e "   Lines: $PROGRESS_SIZE"

    if [ "$PROGRESS_SIZE" != "$PREV_PROGRESS_SIZE" ]; then
      echo -e "   ${GREEN}✓ New progress logged!${NC}"
      PREV_PROGRESS_SIZE=$PROGRESS_SIZE
    fi

    # Show last entry
    echo -e "${YELLOW}   Last entry:${NC}"
    tail -5 "$PROGRESS_FILE" | sed 's/^/   /' | head -5
  fi

  echo ""

  # === Session History ===
  if [ -f "$SESSION_HISTORY" ]; then
    SESSION_COUNT=$(grep -c "Iteration" "$SESSION_HISTORY" 2>/dev/null || echo "0")
    echo -e "${BLUE}🔄 Active Sessions:${NC}"
    echo -e "   Iterations: $SESSION_COUNT"
    tail -1 "$SESSION_HISTORY" | sed 's/^/   /'
  fi

  echo ""

  # === Claude Process Status ===
  if pgrep -f "claude.*dangerously-skip" > /dev/null; then
    echo -e "${GREEN}✓ Ralph is ACTIVE${NC}"
  else
    echo -e "${RED}⚠ Ralph not detected${NC}"
  fi

  echo ""
  echo -e "${YELLOW}Refreshing in 2s... (Ctrl+C to stop)${NC}"

  # Clear to end of screen
  tput ed

  sleep 2
done
