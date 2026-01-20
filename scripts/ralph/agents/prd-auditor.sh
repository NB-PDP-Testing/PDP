#!/bin/bash
# PRD Auditor Agent
# Verifies completed stories actually match their acceptance criteria

set -e
cd "$(dirname "$0")/../../.."

OUTPUT_DIR="scripts/ralph/agents/output"
LOG_FILE="$OUTPUT_DIR/prd-auditor.log"
FEEDBACK_FILE="$OUTPUT_DIR/feedback.md"
PRD_FILE="scripts/ralph/prd.json"

mkdir -p "$OUTPUT_DIR"

echo "📋 PRD Auditor started at $(date)" | tee -a "$LOG_FILE"
echo "Checking completed stories every 5 minutes..."

# Track which stories we've already audited
AUDITED_FILE="$OUTPUT_DIR/.audited-stories"
touch "$AUDITED_FILE"

audit_story() {
    local story_id="$1"
    local story_title="$2"
    local acceptance_criteria="$3"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "" | tee -a "$LOG_FILE"
    echo "=== Auditing $story_id: $story_title ===" | tee -a "$LOG_FILE"
    echo "Timestamp: $timestamp" | tee -a "$LOG_FILE"

    # Use Claude CLI to verify the story
    local prompt="You are a PRD auditor. Verify that story $story_id ($story_title) has been properly implemented.

Acceptance Criteria:
$acceptance_criteria

Instructions:
1. Search the codebase for evidence this story was implemented
2. Check if all acceptance criteria are met
3. Report any gaps or missing functionality

Output format:
- PASS: All criteria met (explain briefly)
- PARTIAL: Some criteria met (list what's missing)
- FAIL: Story not properly implemented (explain why)

Be concise. Focus on facts."

    # Run Claude CLI with the audit prompt
    local result=$(echo "$prompt" | claude --print 2>&1 || echo "AUDIT_ERROR: Claude CLI failed")

    echo "$result" >> "$LOG_FILE"

    # Check for issues
    if echo "$result" | grep -qi "PARTIAL\|FAIL"; then
        echo "" >> "$FEEDBACK_FILE"
        echo "## PRD Audit - $story_id - $timestamp" >> "$FEEDBACK_FILE"
        echo "$result" >> "$FEEDBACK_FILE"
        echo "⚠️ $story_id has issues - feedback written" | tee -a "$LOG_FILE"
    else
        echo "✅ $story_id passed audit" | tee -a "$LOG_FILE"
    fi

    # Mark as audited
    echo "$story_id" >> "$AUDITED_FILE"
}

check_completed_stories() {
    echo "" | tee -a "$LOG_FILE"
    echo "=== Checking for newly completed stories ===" | tee -a "$LOG_FILE"

    # Get completed stories from PRD
    local completed=$(jq -r '.userStories[] | select(.passes == true) | .id' "$PRD_FILE" 2>/dev/null)

    for story_id in $completed; do
        # Skip if already audited
        if grep -q "^$story_id$" "$AUDITED_FILE" 2>/dev/null; then
            continue
        fi

        # Get story details
        local story_title=$(jq -r ".userStories[] | select(.id == \"$story_id\") | .title" "$PRD_FILE")
        local acceptance=$(jq -r ".userStories[] | select(.id == \"$story_id\") | .acceptanceCriteria | join(\"\n- \")" "$PRD_FILE")

        audit_story "$story_id" "$story_title" "- $acceptance"
    done

    echo "Audit check complete" | tee -a "$LOG_FILE"
}

# Main loop
while true; do
    check_completed_stories
    echo "Sleeping 5 minutes..." | tee -a "$LOG_FILE"
    sleep 300
done
