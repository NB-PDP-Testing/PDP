#!/bin/bash
# Architect Review Command
# Provides instructions for running architectural analysis

cd "$(dirname "$0")/../.."

PRD_FILE="scripts/ralph/prd.json"

if [ ! -f "$PRD_FILE" ]; then
    echo "❌ PRD file not found: $PRD_FILE"
    exit 1
fi

PHASE=$(jq -r '.branchName // "unknown"' "$PRD_FILE" | sed 's|ralph/||')
STORY_COUNT=$(jq '.userStories | length' "$PRD_FILE")

cat << EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 ARCHITECT REVIEW - PRD ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase: $PHASE
Stories: $STORY_COUNT

Ask Claude to analyze the PRD for architectural decisions and generate ADRs.

After completion, mark phase as reviewed:
  echo "$PHASE" >> .claude/.reviewed-phases

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
