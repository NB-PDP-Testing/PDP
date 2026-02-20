#!/bin/bash
# Quality Monitor Agent
# Runs type checks and lint every 60 seconds, reports issues to feedback
# NEW: Auto-fix capability - runs ultracite fix and Claude CLI build-fix on failures
#
# Severity Classification (follows FEEDBACK-SEVERITY-GUIDE.md):
# 💥 BUILD FAILURE (CRITICAL) - Convex codegen failures that block development
# ❌ TYPE ERRORS (CRITICAL) - TypeScript compilation errors
# ⚠️ WARNING - Biome lint errors (code quality, not blocking)

set -e
cd "$(dirname "$0")/../../.."

OUTPUT_DIR="scripts/ralph/agents/output"
LOG_FILE="$OUTPUT_DIR/quality-monitor.log"
FEEDBACK_FILE="$OUTPUT_DIR/feedback.md"
AUTOFIX_COUNT_FILE="$OUTPUT_DIR/.autofix-count"
MAX_AUTOFIX_PER_CYCLE=2  # Prevent infinite fix loops

mkdir -p "$OUTPUT_DIR"
echo "0" > "$AUTOFIX_COUNT_FILE"

echo "🔍 Quality Monitor started at $(date)" | tee -a "$LOG_FILE"
echo "Checking types and lint every 60 seconds (with auto-fix)..."

# Attempt auto-fix for lint errors
try_autofix_lint() {
    local autofix_count=$(cat "$AUTOFIX_COUNT_FILE" 2>/dev/null || echo "0")

    if [ "$autofix_count" -ge "$MAX_AUTOFIX_PER_CYCLE" ]; then
        echo "⚠️ Max auto-fix attempts reached this cycle ($MAX_AUTOFIX_PER_CYCLE) - skipping" | tee -a "$LOG_FILE"
        return 1
    fi

    echo "🔧 Attempting auto-fix with ultracite..." | tee -a "$LOG_FILE"
    npx ultracite fix 2>/dev/null || true

    autofix_count=$((autofix_count + 1))
    echo "$autofix_count" > "$AUTOFIX_COUNT_FILE"

    echo "✅ Auto-fix applied (attempt $autofix_count/$MAX_AUTOFIX_PER_CYCLE)" | tee -a "$LOG_FILE"
    return 0
}

# Attempt auto-fix for type/build errors using Claude CLI
try_autofix_build() {
    local error_context="$1"
    local autofix_count=$(cat "$AUTOFIX_COUNT_FILE" 2>/dev/null || echo "0")

    if [ "$autofix_count" -ge "$MAX_AUTOFIX_PER_CYCLE" ]; then
        echo "⚠️ Max auto-fix attempts reached - reporting to feedback instead" | tee -a "$LOG_FILE"
        return 1
    fi

    echo "🔧 Attempting auto-fix with Claude CLI build-error-resolver..." | tee -a "$LOG_FILE"

    local prompt="You are the build-error-resolver agent. Fix these build errors with MINIMAL changes. Do NOT refactor or change architecture. Only fix the errors listed below.

Errors:
$error_context

Instructions:
1. Read each file mentioned in the errors
2. Apply the smallest possible fix
3. Run npx ultracite fix on changed files
4. Do NOT change any code beyond what is needed to fix the errors"

    local result=$(echo "$prompt" | timeout 120 claude --print 2>&1 || echo "AUTOFIX_ERROR: Claude CLI timed out or failed")

    autofix_count=$((autofix_count + 1))
    echo "$autofix_count" > "$AUTOFIX_COUNT_FILE"

    if echo "$result" | grep -qi "AUTOFIX_ERROR"; then
        echo "⚠️ Auto-fix failed - Claude CLI error" | tee -a "$LOG_FILE"
        return 1
    fi

    echo "✅ Auto-fix attempted (attempt $autofix_count/$MAX_AUTOFIX_PER_CYCLE)" | tee -a "$LOG_FILE"
    return 0
}

check_quality() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local issues_found=false
    local feedback=""

    # Reset auto-fix counter each cycle
    echo "0" > "$AUTOFIX_COUNT_FILE"

    echo "" | tee -a "$LOG_FILE"
    echo "=== Check at $timestamp ===" | tee -a "$LOG_FILE"

    # Run Convex codegen
    echo "Running Convex codegen..." | tee -a "$LOG_FILE"
    local codegen_output=$(npx -w packages/backend convex codegen 2>&1)
    if [ $? -ne 0 ]; then
        issues_found=true
        feedback+="💥 **BUILD FAILURE - Convex Codegen:**\n\`\`\`\n$codegen_output\n\`\`\`\n**Action Required:** Fix schema/function issues before continuing.\n\n"
        echo "💥 Convex codegen FAILED (CRITICAL)" | tee -a "$LOG_FILE"
    else
        echo "✅ Convex codegen passed" | tee -a "$LOG_FILE"
    fi

    # Run TypeScript check
    echo "Running TypeScript check..." | tee -a "$LOG_FILE"
    local ts_output=$(npm run check-types 2>&1)
    local ts_exit=$?
    echo "$ts_output" >> "$LOG_FILE"

    if [ $ts_exit -ne 0 ]; then
        local error_msg=$(echo "$ts_output" | grep -A 5 "error TS" | head -20)

        # Try auto-fix before reporting
        if try_autofix_build "$error_msg"; then
            # Re-check after fix attempt
            echo "Re-checking types after auto-fix..." | tee -a "$LOG_FILE"
            local recheck=$(npm run check-types 2>&1)
            if [ $? -eq 0 ]; then
                echo "✅ Auto-fix resolved type errors!" | tee -a "$LOG_FILE"
            else
                issues_found=true
                local remaining_errors=$(echo "$recheck" | grep -E "(error TS|Error:)" | head -10)
                feedback+="❌ **TYPE ERRORS (auto-fix attempted, errors remain):**\n\`\`\`\n$remaining_errors\n\`\`\`\n**Action Required:** Fix remaining type errors manually.\n\n"
                echo "❌ TypeScript still failing after auto-fix" | tee -a "$LOG_FILE"
            fi
        else
            issues_found=true
            feedback+="❌ **TYPE ERRORS for Quality Monitor:**\n\`\`\`\n$error_msg\n\`\`\`\n**Action Required:** Fix these type errors to restore type safety.\n\n"
            echo "❌ TypeScript check FAILED (CRITICAL)" | tee -a "$LOG_FILE"
        fi
    else
        echo "✅ TypeScript check passed" | tee -a "$LOG_FILE"
    fi

    # Run Biome lint (non-fixing, just check)
    echo "Running Biome lint check..." | tee -a "$LOG_FILE"
    local biome_output=$(npx biome check apps/web packages/backend 2>&1 | tail -20)
    if echo "$biome_output" | grep -q "Found [1-9].*error"; then
        # Try auto-fix for lint errors
        if try_autofix_lint; then
            # Re-check
            local lint_recheck=$(npx biome check apps/web packages/backend 2>&1 | tail -5)
            if echo "$lint_recheck" | grep -q "Found [1-9].*error"; then
                issues_found=true
                feedback+="- ⚠️ Biome lint errors remain after auto-fix\n"
                echo "⚠️ Biome lint still has errors after auto-fix" | tee -a "$LOG_FILE"
            else
                echo "✅ Auto-fix resolved lint errors!" | tee -a "$LOG_FILE"
            fi
        else
            issues_found=true
            feedback+="- ⚠️ Biome lint errors found\n"
            echo "⚠️ Biome lint has errors" | tee -a "$LOG_FILE"
        fi
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

# Store PID
echo $$ > "$OUTPUT_DIR/quality-monitor.pid"

# Main loop
while true; do
    check_quality
    echo "Sleeping 60 seconds..." | tee -a "$LOG_FILE"
    sleep 60
done
