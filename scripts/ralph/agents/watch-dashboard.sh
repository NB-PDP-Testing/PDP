#!/bin/bash
# Live Dashboard - Auto-refreshing version of unified-dashboard.sh
# Run this in a separate terminal while Ralph is running
# Press Ctrl+C to stop

cd "$(dirname "$0")/../../.."

# Track previous values to detect changes
PREV_COMPLETED=0
PREV_COMMIT=""

while true; do
  clear
  cat << 'DASHBOARD'
╔══════════════════════════════════════════════════════════════╗
║  RALPH + AGENT MONITORING DASHBOARD (LIVE)                   ║
║  Press Ctrl+C to stop                                        ║
╚══════════════════════════════════════════════════════════════╝
DASHBOARD

  echo ""
  echo "🤖 RALPH STATUS:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Ralph running?
  if pgrep -f "ralph.sh" > /dev/null; then
      echo "✅ Ralph: RUNNING"
  else
      echo "🔴 Ralph: STOPPED"
  fi

  # Check if all 5 agents are running
  AGENTS_RUNNING=0
  [ -f scripts/ralph/agents/output/quality-monitor.pid ] && kill -0 $(cat scripts/ralph/agents/output/quality-monitor.pid) 2>/dev/null && ((AGENTS_RUNNING++))
  [ -f scripts/ralph/agents/output/prd-auditor.pid ] && kill -0 $(cat scripts/ralph/agents/output/prd-auditor.pid) 2>/dev/null && ((AGENTS_RUNNING++))
  [ -f scripts/ralph/agents/output/documenter.pid ] && kill -0 $(cat scripts/ralph/agents/output/documenter.pid) 2>/dev/null && ((AGENTS_RUNNING++))
  [ -f scripts/ralph/agents/output/security-tester.pid ] && kill -0 $(cat scripts/ralph/agents/output/security-tester.pid) 2>/dev/null && ((AGENTS_RUNNING++))
  [ -f scripts/ralph/agents/output/test-runner.pid ] && kill -0 $(cat scripts/ralph/agents/output/test-runner.pid) 2>/dev/null && ((AGENTS_RUNNING++))

  if [ $AGENTS_RUNNING -eq 5 ]; then
      echo "✅ Agents: ALL RUNNING ($AGENTS_RUNNING/5)"
  elif [ $AGENTS_RUNNING -gt 0 ]; then
      echo "⚠️  Agents: PARTIAL ($AGENTS_RUNNING/5 running)"
  else
      echo "🔴 Agents: STOPPED (0/5 running)"
  fi

  echo ""
  echo "📊 STORY PROGRESS:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  COMPLETED=$(cat scripts/ralph/prd.json 2>/dev/null | jq '[.userStories[] | select(.passes == true)] | length' 2>/dev/null || echo "0")
  TOTAL=$(cat scripts/ralph/prd.json 2>/dev/null | jq '.userStories | length' 2>/dev/null || echo "0")

  if [ "$TOTAL" -gt 0 ]; then
      PERCENT=$((COMPLETED * 100 / TOTAL))
  else
      PERCENT=0
  fi

  echo "Progress: $COMPLETED / $TOTAL stories ($PERCENT%)"

  # Detect change
  if [ "$COMPLETED" != "$PREV_COMPLETED" ] && [ "$PREV_COMPLETED" != "0" ]; then
      echo "🎉 NEW STORY COMPLETED!"
  fi
  PREV_COMPLETED=$COMPLETED

  echo ""

  # Progress bar
  BAR_LENGTH=50
  if [ "$TOTAL" -gt 0 ]; then
      FILLED=$((COMPLETED * BAR_LENGTH / TOTAL))
  else
      FILLED=0
  fi
  EMPTY=$((BAR_LENGTH - FILLED))
  printf "["
  printf "%${FILLED}s" | tr ' ' '█'
  printf "%${EMPTY}s" | tr ' ' '░'
  printf "]\n"

  echo ""
  cat scripts/ralph/prd.json 2>/dev/null | jq -r '.userStories[] | "\(if .passes then "✅" else "⏳" end) \(.id): \(.title)"' 2>/dev/null || echo "No stories found"

  echo ""
  echo "📝 RECENT COMMITS:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  LATEST_COMMIT=$(git log --oneline -1 --since="1 hour ago" 2>/dev/null)

  if [ -n "$LATEST_COMMIT" ]; then
      if [ "$LATEST_COMMIT" != "$PREV_COMMIT" ] && [ -n "$PREV_COMMIT" ]; then
          echo "🆕 NEW COMMIT:"
      fi
      git log --oneline -3 --since="1 hour ago"
      PREV_COMMIT="$LATEST_COMMIT"
  else
      echo "(no commits in last hour)"
  fi

  echo ""
  echo "🛡️  AGENT LOGS (Last 6 lines):"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ -f scripts/ralph/agents/output/quality-monitor.log ]; then
      echo "Quality Monitor:"
      tail -3 scripts/ralph/agents/output/quality-monitor.log 2>/dev/null | sed 's/^/  /' || echo "  (no output)"
      echo ""
      echo "Test Runner:"
      tail -3 scripts/ralph/agents/output/test-runner.log 2>/dev/null | sed 's/^/  /' || echo "  (no output yet)"
  else
      echo "No agent logs yet"
      echo "Run: ./scripts/ralph/agents/start-all.sh"
  fi

  echo ""
  echo "📋 FEEDBACK FOR RALPH:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ -f scripts/ralph/agents/output/feedback.md ]; then
      FEEDBACK_LINES=$(wc -l < scripts/ralph/agents/output/feedback.md)
      if [ "$FEEDBACK_LINES" -gt 5 ]; then
          echo "⚠️  $FEEDBACK_LINES lines of feedback pending"
          echo "Recent feedback:"
          tail -5 scripts/ralph/agents/output/feedback.md | sed 's/^/  /'
      else
          echo "✅ No pending feedback"
      fi
  else
      echo "✅ No feedback file"
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Last updated: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  echo "Refreshing every 5 seconds... (Press Ctrl+C to stop)"

  sleep 5
done
