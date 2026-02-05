#!/bin/bash
# Test Runner Agent
# Creates and EXECUTES both Playwright E2E and unit tests when stories complete
# Provides REAL-TIME feedback to Ralph via feedback.md
#
# Key features:
# - Detects newly completed stories (polls every 30 seconds)
# - Runs Playwright E2E tests against the running dev server
# - Runs type checks and codegen validation
# - Tracks baseline lint errors to detect regressions
# - Writes failures directly to feedback.md for Ralph to fix

set -e
cd "$(dirname "$0")/../../.."

OUTPUT_DIR="scripts/ralph/agents/output"
LOG_FILE="$OUTPUT_DIR/test-runner.log"
FEEDBACK_FILE="$OUTPUT_DIR/feedback.md"
PRD_FILE="scripts/ralph/prd.json"
TESTS_DIR="scripts/ralph/agents/output/tests"
UNIT_TESTS_DIR="packages/backend/convex/__tests__"
BASELINE_FILE="$OUTPUT_DIR/.lint-baseline"
PLAYWRIGHT_CONFIG="apps/web/uat/playwright.config.ts"
PLAYWRIGHT_TESTS_DIR="apps/web/uat/tests"

mkdir -p "$OUTPUT_DIR"
mkdir -p "$TESTS_DIR"
mkdir -p "$UNIT_TESTS_DIR"

echo "🧪 Test Runner Agent started at $(date)" | tee -a "$LOG_FILE"
echo "Running tests every 30 seconds (fast feedback loop)..."

# Track which stories we've tested
TESTED_FILE="$OUTPUT_DIR/.tested-stories"
touch "$TESTED_FILE"

# Capture baseline lint error count on startup
capture_baseline() {
    if [ ! -f "$BASELINE_FILE" ]; then
        echo "Capturing lint baseline..." | tee -a "$LOG_FILE"
        local biome_output=$(npx biome check apps/web packages/backend 2>&1 || true)
        local error_count=$(echo "$biome_output" | grep -oE "Found [0-9]+ error" | grep -oE "[0-9]+" | head -1 || echo "0")
        echo "$error_count" > "$BASELINE_FILE"
        echo "Baseline lint errors: $error_count" | tee -a "$LOG_FILE"
    fi
}
capture_baseline

# Write feedback for Ralph (real-time)
write_feedback() {
    local severity="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "" >> "$FEEDBACK_FILE"
    echo "## Test Runner - $timestamp" >> "$FEEDBACK_FILE"
    echo "" >> "$FEEDBACK_FILE"
    echo "$severity $message" >> "$FEEDBACK_FILE"
    echo "" >> "$FEEDBACK_FILE"

    echo "📝 Feedback written: $severity" | tee -a "$LOG_FILE"
}

# Check if dev server is running (required for Playwright)
check_dev_server() {
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|302\|304"; then
        return 0
    fi
    return 1
}

# Run Playwright E2E tests
run_playwright_tests() {
    local story_id="$1"
    local test_pattern="$2"

    echo "Running Playwright E2E tests..." | tee -a "$LOG_FILE"

    # Check if dev server is running
    if ! check_dev_server; then
        echo "⚠️ Dev server not running on localhost:3000 - skipping E2E tests" | tee -a "$LOG_FILE"
        write_feedback "⚠️ **E2E TESTS SKIPPED for $story_id:**" "Dev server not running on localhost:3000. Start it with \`npm run dev\` to enable E2E testing."
        return 1
    fi

    local playwright_output=""
    local playwright_exit=0

    if [ -n "$test_pattern" ] && [ -d "$PLAYWRIGHT_TESTS_DIR" ]; then
        # Run tests matching the pattern (feature-specific)
        playwright_output=$(npx -w apps/web playwright test --config="$PLAYWRIGHT_CONFIG" -g "$test_pattern" --reporter=list 2>&1) || playwright_exit=$?
    else
        # Run all tests
        playwright_output=$(npx -w apps/web playwright test --config="$PLAYWRIGHT_CONFIG" --reporter=list 2>&1) || playwright_exit=$?
    fi

    # Parse results
    local passed=$(echo "$playwright_output" | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+" || echo "0")
    local failed=$(echo "$playwright_output" | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+" || echo "0")
    local skipped=$(echo "$playwright_output" | grep -oE "[0-9]+ skipped" | grep -oE "[0-9]+" || echo "0")

    echo "Playwright results: $passed passed, $failed failed, $skipped skipped" | tee -a "$LOG_FILE"

    if [ "$playwright_exit" -ne 0 ] && [ "$failed" -gt 0 ]; then
        # Extract failure details
        local failures=$(echo "$playwright_output" | grep -A 5 "✘\|FAILED\|Error:" | head -30)
        write_feedback "❌ **E2E TEST FAILURES for $story_id ($failed failed, $passed passed):**" "\`\`\`\n$failures\n\`\`\`\n\n**Action Required:** Fix failing E2E tests. View full report:\n\`npx -w apps/web playwright show-report uat/playwright-report\`\n\nTrace files at: \`apps/web/uat/test-results/\`"
        echo "❌ Playwright: $failed tests failed" | tee -a "$LOG_FILE"
        return 1
    fi

    echo "✅ Playwright: $passed tests passed" | tee -a "$LOG_FILE"
    return 0
}

# Run TypeScript/type checks
run_type_checks() {
    local story_id="$1"

    echo "Running type checks..." | tee -a "$LOG_FILE"

    local ts_output=$(npm run check-types 2>&1)
    local ts_exit=$?

    if [ $ts_exit -ne 0 ]; then
        local error_msg=$(echo "$ts_output" | grep -E "(error TS|Error:)" | head -20)
        write_feedback "❌ **TYPE ERRORS for $story_id:**" "\`\`\`\n$error_msg\n\`\`\`\n\n**Action Required:** Fix these type errors before marking story complete."
        return 1
    fi

    echo "✅ Type checks passed" | tee -a "$LOG_FILE"
    return 0
}

# Run Convex codegen to verify schema
run_codegen_check() {
    local story_id="$1"

    echo "Running Convex codegen..." | tee -a "$LOG_FILE"

    local codegen_output=$(npx -w packages/backend convex codegen 2>&1)
    local codegen_exit=$?

    if [ $codegen_exit -ne 0 ]; then
        write_feedback "❌ **CODEGEN FAILED for $story_id:**" "\`\`\`\n$codegen_output\n\`\`\`\n\n**Action Required:** Fix schema/function issues."
        return 1
    fi

    echo "✅ Codegen passed" | tee -a "$LOG_FILE"
    return 0
}

# Run Biome lint check - ONLY report NEW errors
run_lint_check() {
    local story_id="$1"

    echo "Running Biome lint..." | tee -a "$LOG_FILE"

    local biome_output=$(npx biome check apps/web packages/backend 2>&1 || true)
    local current_errors=$(echo "$biome_output" | grep -oE "Found [0-9]+ error" | grep -oE "[0-9]+" | head -1 || echo "0")
    local baseline_errors=$(cat "$BASELINE_FILE" 2>/dev/null || echo "0")

    if [ "$current_errors" -gt "$baseline_errors" ]; then
        local new_errors=$((current_errors - baseline_errors))
        write_feedback "❌ **NEW LINT ERRORS for $story_id:**" "Introduced $new_errors new error(s) (was $baseline_errors, now $current_errors)\n\n**Suggestion:** Run \`npx ultracite fix\` to auto-fix."
        return 1
    elif [ "$current_errors" -gt 0 ]; then
        echo "⚠️ Lint has $current_errors pre-existing errors (baseline: $baseline_errors) - not failing" | tee -a "$LOG_FILE"
    fi

    echo "✅ Lint passed (no new errors)" | tee -a "$LOG_FILE"
    return 0
}

# Generate UAT test scenario file (kept for documentation, supplementing Playwright)
generate_uat_tests() {
    local story_id="$1"
    local story_title="$2"
    local story_desc="$3"
    local acceptance="$4"
    local feature_slug="$5"

    local uat_file="$TESTS_DIR/${feature_slug}-${story_id}-uat.md"

    echo "Generating UAT checklist: $uat_file" | tee -a "$LOG_FILE"

    cat > "$uat_file" << EOF
# UAT Test: $story_id - $story_title

> Auto-generated: $(date '+%Y-%m-%d %H:%M')
> Status: ⏳ Pending Execution

## Story
$story_desc

## Acceptance Criteria Checklist

EOF

    echo "$acceptance" | while read -r criteria; do
        if [ -n "$criteria" ]; then
            echo "- [ ] $criteria" >> "$uat_file"
        fi
    done

    cat >> "$uat_file" << EOF

## Playwright E2E Tests
- Run: \`npx -w apps/web playwright test --config=uat/playwright.config.ts -g "$story_id"\`
- Report: \`npx -w apps/web playwright show-report uat/playwright-report\`

## Notes
_Add testing observations here_

---
*Generated by Test Runner Agent*
EOF

    echo "✅ UAT checklist generated: $uat_file" | tee -a "$LOG_FILE"
}

# Main test function for a story
test_story() {
    local story_id="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "" | tee -a "$LOG_FILE"
    echo "========================================" | tee -a "$LOG_FILE"
    echo "🧪 Testing $story_id at $timestamp" | tee -a "$LOG_FILE"
    echo "========================================" | tee -a "$LOG_FILE"

    # Get story details
    local story_title=$(jq -r --arg id "$story_id" '.userStories[] | select(.id == $id) | .title' "$PRD_FILE")
    local story_desc=$(jq -r --arg id "$story_id" '.userStories[] | select(.id == $id) | .description' "$PRD_FILE")
    local acceptance=$(jq -r --arg id "$story_id" '.userStories[] | select(.id == $id) | .acceptanceCriteria[]' "$PRD_FILE")
    local branch_name=$(jq -r '.branchName // "unknown"' "$PRD_FILE")
    local feature_slug=$(echo "$branch_name" | sed 's|ralph/||')

    local all_passed=true
    local critical_failure=false

    # 1. Run codegen first (schema validation) - CRITICAL
    if ! run_codegen_check "$story_id"; then
        all_passed=false
        critical_failure=true
    fi

    # 2. Run type checks - CRITICAL
    if ! run_type_checks "$story_id"; then
        all_passed=false
        critical_failure=true
    fi

    # 3. Run lint checks - ONLY NEW ERRORS are critical
    if ! run_lint_check "$story_id"; then
        all_passed=false
    fi

    # 4. Run Playwright E2E tests (the real deal)
    if ! run_playwright_tests "$story_id" "$story_id"; then
        all_passed=false
    fi

    # 5. Generate UAT checklist (documentation)
    generate_uat_tests "$story_id" "$story_title" "$story_desc" "$acceptance" "$feature_slug"

    # Record this story as tested
    echo "$story_id" >> "$TESTED_FILE"

    # Write summary
    if [ "$critical_failure" = true ]; then
        echo "❌ CRITICAL tests failed for $story_id - Ralph needs to fix" | tee -a "$LOG_FILE"
    elif [ "$all_passed" = true ]; then
        echo "✅ All tests passed for $story_id (including Playwright E2E)" | tee -a "$LOG_FILE"
    else
        echo "⚠️ Some tests had warnings for $story_id" | tee -a "$LOG_FILE"
    fi
}

# Check for newly completed stories
check_for_completed_stories() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "" | tee -a "$LOG_FILE"
    echo "--- Check at $timestamp ---" | tee -a "$LOG_FILE"

    if [ ! -f "$PRD_FILE" ]; then
        echo "No PRD found, skipping" | tee -a "$LOG_FILE"
        return
    fi

    # Get completed stories
    local completed_stories=$(jq -r '.userStories[] | select(.passes == true) | .id' "$PRD_FILE")

    for story_id in $completed_stories; do
        if ! grep -q "^$story_id$" "$TESTED_FILE" 2>/dev/null; then
            echo "🆕 New completed story detected: $story_id" | tee -a "$LOG_FILE"
            test_story "$story_id"
        fi
    done
}

# Store PID
echo $$ > "$OUTPUT_DIR/test-runner.pid"

# Main loop - fast polling for real-time feedback
while true; do
    check_for_completed_stories
    echo "Sleeping 30 seconds (fast feedback loop)..." | tee -a "$LOG_FILE"
    sleep 30
done
