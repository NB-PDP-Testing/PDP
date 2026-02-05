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

  # Check if all 6 agents are running
  AGENTS_RUNNING=0
  AGENT_STATUS=""
  for agent in quality-monitor prd-auditor documenter test-runner security-tester code-review-gate; do
      if [ -f "scripts/ralph/agents/output/${agent}.pid" ] && kill -0 $(cat "scripts/ralph/agents/output/${agent}.pid") 2>/dev/null; then
          ((AGENTS_RUNNING++))
          AGENT_STATUS+="  ✅ $agent\n"
      else
          AGENT_STATUS+="  🔴 $agent\n"
      fi
  done

  if [ $AGENTS_RUNNING -eq 6 ]; then
      echo "✅ Agents: ALL RUNNING ($AGENTS_RUNNING/6)"
  elif [ $AGENTS_RUNNING -gt 0 ]; then
      echo "⚠️  Agents: PARTIAL ($AGENTS_RUNNING/6 running)"
  else
      echo "🔴 Agents: STOPPED (0/6 running)"
  fi
  echo -e "$AGENT_STATUS"

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
  echo "🛡️  AGENT LOGS (Latest):"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ -f scripts/ralph/agents/output/quality-monitor.log ]; then
      for agent_log in quality-monitor test-runner code-review-gate security-tester; do
          if [ -f "scripts/ralph/agents/output/${agent_log}.log" ]; then
              echo "$agent_log:"
              tail -2 "scripts/ralph/agents/output/${agent_log}.log" 2>/dev/null | sed 's/^/  /' || echo "  (no output)"
              echo ""
          fi
      done
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
