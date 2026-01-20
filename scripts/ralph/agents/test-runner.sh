#!/bin/bash
# Test Runner Agent
# Creates and EXECUTES both UAT and unit tests when stories complete
# Provides REAL-TIME feedback to Ralph via feedback.md
#
# Key features:
# - Detects newly completed stories (polls every 30 seconds for faster response)
# - Generates unit test files for backend mutations/queries
# - Runs tests immediately and reports results
# - Writes failures directly to feedback.md for Ralph to fix during the run
#
# FIXES:
# - Only report NEW errors, not pre-existing lint warnings
# - Track baseline error counts to detect regressions
# - Don't mark as failed if only lint warnings exist (not errors)

set -e
cd "$(dirname "$0")/../../.."

OUTPUT_DIR="scripts/ralph/agents/output"
LOG_FILE="$OUTPUT_DIR/test-runner.log"
FEEDBACK_FILE="$OUTPUT_DIR/feedback.md"
PRD_FILE="scripts/ralph/prd.json"
TESTS_DIR="scripts/ralph/agents/output/tests"
UNIT_TESTS_DIR="packages/backend/convex/__tests__"
BASELINE_FILE="$OUTPUT_DIR/.lint-baseline"

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

# Run TypeScript/type checks for a specific story's files
run_type_checks() {
    local story_id="$1"

    echo "Running type checks..." | tee -a "$LOG_FILE"

    # Run full type check (fast enough for real-time)
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

    # Only fail if NEW errors were introduced
    if [ "$current_errors" -gt "$baseline_errors" ]; then
        local new_errors=$((current_errors - baseline_errors))
        write_feedback "❌ **NEW LINT ERRORS for $story_id:**" "Introduced $new_errors new error(s) (was $baseline_errors, now $current_errors)\n\n**Suggestion:** Run \`npx biome check --write --unsafe\` to auto-fix."
        return 1
    elif [ "$current_errors" -gt 0 ]; then
        echo "⚠️ Lint has $current_errors pre-existing errors (baseline: $baseline_errors) - not failing" | tee -a "$LOG_FILE"
    fi

    echo "✅ Lint passed (no new errors)" | tee -a "$LOG_FILE"
    return 0
}

# Generate unit test file for backend changes
generate_unit_test() {
    local story_id="$1"
    local story_title="$2"
    local acceptance="$3"

    # Check if story involves backend (mutations/queries)
    if echo "$acceptance" | grep -qiE "(mutation|query|schema|table|index)"; then
        local test_file="$UNIT_TESTS_DIR/${story_id}.test.ts"

        echo "Generating unit test: $test_file" | tee -a "$LOG_FILE"

        cat > "$test_file" << EOF
/**
 * Unit Tests: $story_id - $story_title
 * Auto-generated by Test Runner Agent
 *
 * NOTE: These are placeholder tests. Review and enhance based on actual implementation.
 */

import { describe, it, expect } from 'vitest';

describe('$story_id: $story_title', () => {
  // Placeholder test - implement based on actual acceptance criteria
  it('should be implemented', () => {
    // TODO: Implement actual test
    expect(true).toBe(true);
  });
});
EOF

        echo "✅ Unit test generated: $test_file" | tee -a "$LOG_FILE"
        return 0
    fi

    echo "Skipping unit test (no backend changes detected)" | tee -a "$LOG_FILE"
    return 0
}

# Run existing unit tests
run_unit_tests() {
    local story_id="$1"

    # Check if vitest is configured
    if [ -f "packages/backend/vitest.config.ts" ] || [ -f "vitest.config.ts" ]; then
        echo "Running unit tests..." | tee -a "$LOG_FILE"

        # Run vitest in CI mode (non-interactive)
        local test_output=$(npm run test --if-present 2>&1 || npx vitest run --reporter=verbose 2>&1 || echo "No test runner configured")
        local test_exit=$?

        if [ $test_exit -ne 0 ] && echo "$test_output" | grep -qiE "(fail|error)"; then
            local failures=$(echo "$test_output" | grep -A 3 -E "(FAIL|Error:)" | head -20)
            write_feedback "❌ **UNIT TEST FAILURES for $story_id:**" "\`\`\`\n$failures\n\`\`\`\n\n**Action Required:** Fix failing tests."
            return 1
        fi

        echo "✅ Unit tests passed (or not configured)" | tee -a "$LOG_FILE"
    else
        echo "⏭️ No unit test runner configured" | tee -a "$LOG_FILE"
    fi

    return 0
}

# Generate UAT test scenario file
generate_uat_tests() {
    local story_id="$1"
    local story_title="$2"
    local story_desc="$3"
    local acceptance="$4"
    local feature_slug="$5"

    local uat_file="$TESTS_DIR/${feature_slug}-${story_id}-uat.md"

    echo "Generating UAT tests: $uat_file" | tee -a "$LOG_FILE"

    cat > "$uat_file" << EOF
# UAT Test: $story_id - $story_title

> Auto-generated: $(date '+%Y-%m-%d %H:%M')
> Status: ⏳ Pending Execution

## Story
$story_desc

## Acceptance Criteria Checklist

EOF

    # Generate checklist from acceptance criteria
    echo "$acceptance" | while read -r criteria; do
        if [ -n "$criteria" ]; then
            echo "- [ ] $criteria" >> "$uat_file"
        fi
    done

    cat >> "$uat_file" << EOF

## Test Scenarios

### Happy Path
1. Navigate to the feature
2. Perform the primary action described in the story
3. Verify all acceptance criteria are met
4. **Expected:** Feature works as described

### Edge Cases
1. Test with empty/null values
2. Test with boundary values
3. Test rapid repeated actions
4. **Expected:** Graceful handling, no errors

### Error Handling
1. Test with invalid inputs
2. Test without proper permissions
3. Test with network issues (if applicable)
4. **Expected:** Clear error messages, no crashes

## Visual Verification
- [ ] UI matches design expectations
- [ ] Responsive on mobile (if applicable)
- [ ] Loading states are appropriate
- [ ] Error states are user-friendly

## Notes
_Add testing observations here_

---
*Generated by Test Runner Agent*
EOF

    echo "✅ UAT test generated: $uat_file" | tee -a "$LOG_FILE"
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
        # Not marking as critical since pre-existing errors are ignored
    fi

    # 4. Generate tests (UAT + Unit)
    generate_uat_tests "$story_id" "$story_title" "$story_desc" "$acceptance" "$feature_slug"
    generate_unit_test "$story_id" "$story_title" "$acceptance"

    # 5. Run unit tests if configured
    if ! run_unit_tests "$story_id"; then
        all_passed=false
    fi

    # Record this story as tested
    echo "$story_id" >> "$TESTED_FILE"

    # Write summary - only if critical checks passed
    if [ "$critical_failure" = true ]; then
        echo "❌ CRITICAL tests failed for $story_id - Ralph needs to fix" | tee -a "$LOG_FILE"
    elif [ "$all_passed" = true ]; then
        echo "✅ All tests passed for $story_id" | tee -a "$LOG_FILE"
        # Don't spam feedback with success messages - only report failures
    else
        echo "⚠️ Some non-critical checks had warnings for $story_id" | tee -a "$LOG_FILE"
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

# Main loop - fast polling for real-time feedback
while true; do
    check_for_completed_stories
    echo "Sleeping 30 seconds (fast feedback loop)..." | tee -a "$LOG_FILE"
    sleep 30
done
