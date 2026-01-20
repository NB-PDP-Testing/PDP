#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop (adapted for Claude Code CLI)
# Usage: ./ralph.sh [max_iterations]

set -e

MAX_ITERATIONS=${1:-10}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"
SESSION_HISTORY_FILE="$SCRIPT_DIR/session-history.txt"
INSIGHTS_DIR="$SCRIPT_DIR/insights"
AGENTS_FEEDBACK_FILE="$SCRIPT_DIR/agents/output/feedback.md"

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")

  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    # Archive the previous run
    DATE=$(date +%Y-%m-%d)
    # Strip "ralph/" prefix from branch name for folder
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"

    echo "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"

    # Reset progress file for new run
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

# Initialize session history if it doesn't exist
if [ ! -f "$SESSION_HISTORY_FILE" ]; then
  echo "# Ralph Session History" > "$SESSION_HISTORY_FILE"
  echo "# Tracks Claude conversation IDs for each iteration" >> "$SESSION_HISTORY_FILE"
  echo "---" >> "$SESSION_HISTORY_FILE"
fi

# Create insights directory
mkdir -p "$INSIGHTS_DIR"

# Check for agent feedback and append to progress file
check_agent_feedback() {
  if [ -f "$AGENTS_FEEDBACK_FILE" ] && [ -s "$AGENTS_FEEDBACK_FILE" ]; then
    echo "📬 Found agent feedback - appending to progress.txt"

    # Check if CODE REVIEW FEEDBACK section exists
    if ! grep -q "## CODE REVIEW FEEDBACK" "$PROGRESS_FILE"; then
      echo "" >> "$PROGRESS_FILE"
      echo "## CODE REVIEW FEEDBACK" >> "$PROGRESS_FILE"
    fi

    # Append feedback content
    echo "" >> "$PROGRESS_FILE"
    echo "### Agent Feedback - $(date '+%Y-%m-%d %H:%M')" >> "$PROGRESS_FILE"
    cat "$AGENTS_FEEDBACK_FILE" >> "$PROGRESS_FILE"

    # Clear the feedback file
    > "$AGENTS_FEEDBACK_FILE"
  fi
}

echo "Starting Ralph (Claude Code CLI) - Max iterations: $MAX_ITERATIONS"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  Ralph Iteration $i of $MAX_ITERATIONS"
  echo "  Started: $(date '+%H:%M:%S')"
  echo "═══════════════════════════════════════════════════════"

  # Show current PRD status
  if [ -f "$PRD_FILE" ]; then
    INCOMPLETE_COUNT=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE" 2>/dev/null || echo "?")
    TOTAL_COUNT=$(jq '.userStories | length' "$PRD_FILE" 2>/dev/null || echo "?")
    COMPLETE_COUNT=$((TOTAL_COUNT - INCOMPLETE_COUNT))
    echo "📋 Stories: $COMPLETE_COUNT complete, $INCOMPLETE_COUNT remaining (of $TOTAL_COUNT total)"
  fi

  # Show monitoring tip on first iteration
  if [ "$i" -eq 1 ]; then
    echo ""
    echo "💡 TIP: Open another terminal and run:"
    echo "   ./scripts/ralph/monitor.sh"
    echo "   to see live progress updates!"
  fi

  # Check for agent feedback before each iteration
  check_agent_feedback

  echo ""
  echo "🔄 Running Claude (iteration may take 2-5 minutes)..."

  # Run claude with the ralph prompt
  # Note: Pass prompt as argument (not piped) for real-time interactive output
  # --dangerously-skip-permissions: Auto-approve all permissions for autonomous operation
  TEMP_OUTPUT="/tmp/ralph-output-$i.txt"
  ITERATION_START=$(date +%s)
  claude --dangerously-skip-permissions "$(cat "$SCRIPT_DIR/prompt.md")" 2>&1 | tee "$TEMP_OUTPUT" || true
  ITERATION_END=$(date +%s)
  ITERATION_DURATION=$((ITERATION_END - ITERATION_START))

  echo ""
  echo "⏱️  Iteration completed in ${ITERATION_DURATION}s ($(date '+%H:%M:%S'))"

  # Capture session ID after iteration
  SESSION_ID=$("$SCRIPT_DIR/capture-session-id.sh" 2>/dev/null || echo "unknown")
  if [ "$SESSION_ID" != "unknown" ]; then
    echo "📝 Session ID: $SESSION_ID"

    # Log to session history
    echo "Iteration $i: $SESSION_ID ($(date))" >> "$SESSION_HISTORY_FILE"

    # Auto-extract insights (optional, runs in background)
    INSIGHT_FILE="$INSIGHTS_DIR/iteration-$i-$SESSION_ID.md"
    "$SCRIPT_DIR/extract-insights.sh" "$SESSION_ID" "$INSIGHT_FILE" 2>/dev/null &

    echo "💡 Insights being extracted to: $INSIGHT_FILE"
  fi

  # Check for completion signal
  if [ -f "$TEMP_OUTPUT" ] && grep -q "<promise>COMPLETE</promise>" "$TEMP_OUTPUT"; then
    echo ""
    echo "Ralph completed all tasks!"
    echo "Completed at iteration $i of $MAX_ITERATIONS"
    echo ""
    echo "📊 Session history: $SESSION_HISTORY_FILE"
    echo "📝 Progress log: $PROGRESS_FILE"
    echo "💡 Insights: $INSIGHTS_DIR/"
    rm -f "$TEMP_OUTPUT"
    exit 0
  fi

  # Clean up temp file
  rm -f "$TEMP_OUTPUT"

  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo ""
echo "📊 Session history: $SESSION_HISTORY_FILE"
echo "📝 Progress log: $PROGRESS_FILE"
echo "💡 Insights: $INSIGHTS_DIR/"
echo ""
echo "Continue with: ./scripts/ralph/ralph.sh $MAX_ITERATIONS"
exit 1
