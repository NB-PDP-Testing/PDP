#!/bin/bash
# Check PRD Command
# Quick status check of current PRD phase
#
# Usage: /check-prd

cd "$(dirname "$0")/../.."

PRD_FILE="scripts/ralph/prd.json"

if [ ! -f "$PRD_FILE" ]; then
    echo "❌ No PRD file found at $PRD_FILE"
    exit 1
fi

# Extract PRD details
PHASE=$(jq -r '.branchName // "unknown"' "$PRD_FILE" | sed 's|ralph/||')
TOTAL=$(jq '.userStories | length' "$PRD_FILE")
COMPLETED=$(jq '[.userStories[] | select(.passes == true)] | length' "$PRD_FILE")
PENDING=$((TOTAL - COMPLETED))

# Check if reviewed
REVIEWED_FILE=".claude/.reviewed-phases"
REVIEWED="❌ Not reviewed"
if [ -f "$REVIEWED_FILE" ] && grep -q "^$PHASE\$" "$REVIEWED_FILE" 2>/dev/null; then
    REVIEWED="✅ Reviewed"
fi

# Display status
cat << EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 CURRENT PRD STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase:     $PHASE
Stories:   $COMPLETED / $TOTAL completed ($PENDING pending)
Architect: $REVIEWED

EOF

# Show story breakdown
echo "User Stories:"
jq -r '.userStories[] | "  [\(if .passes then "✅" else "⏳" end)] US-\(.id): \(.title)"' "$PRD_FILE"

cat << EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Commands:
  /architect-review → Run architectural analysis
  echo "$PHASE" >> .claude/.reviewed-phases → Mark as reviewed

EOF
