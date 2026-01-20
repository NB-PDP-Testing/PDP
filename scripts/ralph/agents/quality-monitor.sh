#!/bin/bash
# Quality Monitor Agent
# Runs type checks and lint every 60 seconds, reports issues to feedback

set -e
cd "$(dirname "$0")/../../.."

OUTPUT_DIR="scripts/ralph/agents/output"
LOG_FILE="$OUTPUT_DIR/quality-monitor.log"
FEEDBACK_FILE="$OUTPUT_DIR/feedback.md"

mkdir -p "$OUTPUT_DIR"

echo "🔍 Quality Monitor started at $(date)" | tee -a "$LOG_FILE"
echo "Checking types and lint every 60 seconds..."

check_quality() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local issues_found=false
    local feedback=""

    echo "" | tee -a "$LOG_FILE"
    echo "=== Check at $timestamp ===" | tee -a "$LOG_FILE"

    # Run Convex codegen
    echo "Running Convex codegen..." | tee -a "$LOG_FILE"
    if ! npx -w packages/backend convex codegen 2>&1 | tee -a "$LOG_FILE"; then
        issues_found=true
        feedback+="- ❌ Convex codegen failed\n"
    else
        echo "✅ Convex codegen passed" | tee -a "$LOG_FILE"
    fi

    # Run TypeScript check
    echo "Running TypeScript check..." | tee -a "$LOG_FILE"
    local ts_output=$(npm run check-types 2>&1)
    local ts_exit=$?
    echo "$ts_output" >> "$LOG_FILE"

    if [ $ts_exit -ne 0 ]; then
        issues_found=true
        # Extract the error message
        local error_msg=$(echo "$ts_output" | grep -A 5 "error TS" | head -10)
        feedback+="- ❌ TypeScript errors:\n\`\`\`\n$error_msg\n\`\`\`\n"
        echo "❌ TypeScript check failed" | tee -a "$LOG_FILE"
    else
        echo "✅ TypeScript check passed" | tee -a "$LOG_FILE"
    fi

    # Run Biome lint (non-fixing, just check)
    echo "Running Biome lint check..." | tee -a "$LOG_FILE"
    local biome_output=$(npx biome check apps/web packages/backend 2>&1 | tail -20)
    if echo "$biome_output" | grep -q "Found [1-9].*error"; then
        issues_found=true
        feedback+="- ⚠️ Biome lint errors found\n"
        echo "⚠️ Biome lint has errors" | tee -a "$LOG_FILE"
    else
        echo "✅ Biome lint passed" | tee -a "$LOG_FILE"
    fi

    # Write feedback if issues found
    if [ "$issues_found" = true ]; then
        echo "" >> "$FEEDBACK_FILE"
        echo "## Quality Monitor - $timestamp" >> "$FEEDBACK_FILE"
        echo -e "$feedback" >> "$FEEDBACK_FILE"
        echo "🚨 Issues found - feedback written to $FEEDBACK_FILE" | tee -a "$LOG_FILE"
    else
        echo "✅ All quality checks passed" | tee -a "$LOG_FILE"
    fi
}

# Main loop
while true; do
    check_quality
    echo "Sleeping 60 seconds..." | tee -a "$LOG_FILE"
    sleep 60
done
