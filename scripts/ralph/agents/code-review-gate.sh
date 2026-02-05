#!/bin/bash
# Code Review Gate Agent
# Watches for Ralph commits and runs automated code review
# Catches N+1 queries, missing auth, .filter() usage, Better Auth mistakes
#
# Runs two types of review:
# 1. Fast grep-based pattern checks (every commit)
# 2. Deep Claude CLI review (every 3rd commit or story completion)

set -e
cd "$(dirname "$0")/../../.."

OUTPUT_DIR="scripts/ralph/agents/output"
LOG_FILE="$OUTPUT_DIR/code-review-gate.log"
FEEDBACK_FILE="$OUTPUT_DIR/feedback.md"
COMMIT_COUNT_FILE="$OUTPUT_DIR/.review-commit-count"
LAST_REVIEWED_COMMIT="$OUTPUT_DIR/.last-reviewed-commit"

mkdir -p "$OUTPUT_DIR"
echo "0" > "$COMMIT_COUNT_FILE" 2>/dev/null || true
touch "$LAST_REVIEWED_COMMIT"

echo "🔍 Code Review Gate started at $(date)" | tee -a "$LOG_FILE"
echo "Watching for new commits every 45 seconds..."

# Write feedback for Ralph
write_feedback() {
    local severity="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "" >> "$FEEDBACK_FILE"
    echo "## Code Review Gate - $timestamp" >> "$FEEDBACK_FILE"
    echo "" >> "$FEEDBACK_FILE"
    echo "$severity $message" >> "$FEEDBACK_FILE"
    echo "" >> "$FEEDBACK_FILE"

    echo "📝 Feedback written: $severity" | tee -a "$LOG_FILE"
}

# Fast pattern-based code review (runs on every commit)
fast_review() {
    local changed_files="$1"
    local issues=""
    local critical_count=0
    local high_count=0
    local medium_count=0

    echo "Running fast pattern review..." | tee -a "$LOG_FILE"

    # Check each changed file
    for file in $changed_files; do
        [ -f "$file" ] || continue

        # --- CRITICAL: .filter() usage in Convex models ---
        if echo "$file" | grep -q "packages/backend/convex/models"; then
            local filter_hits=$(grep -n '\.filter(' "$file" 2>/dev/null || true)
            if [ -n "$filter_hits" ]; then
                issues+="- 🚨 **CRITICAL**: \`.filter()\` usage in \`$file\` - use \`.withIndex()\` instead\n"
                issues+="  \`\`\`\n$(echo "$filter_hits" | head -3)\n  \`\`\`\n"
                ((critical_count++))
            fi
        fi

        # --- CRITICAL: Missing org isolation ---
        if echo "$file" | grep -q "packages/backend/convex/models"; then
            if grep -q "\.collect()" "$file" 2>/dev/null; then
                if ! grep -q "organizationId" "$file" 2>/dev/null; then
                    issues+="- 🚨 **CRITICAL**: \`$file\` uses \`.collect()\` without organizationId filter - data isolation risk\n"
                    ((critical_count++))
                fi
            fi
        fi

        # --- HIGH: N+1 query pattern ---
        if grep -q "Promise\.all" "$file" 2>/dev/null; then
            local n1_hits=$(grep -n "Promise\.all.*map.*async.*ctx\.db\|Promise\.all.*map.*async.*ctx\.runQuery" "$file" 2>/dev/null || true)
            if [ -n "$n1_hits" ]; then
                issues+="- ⚠️ **HIGH**: N+1 query pattern in \`$file\` - use batch fetch + Map lookup\n"
                issues+="  \`\`\`\n$(echo "$n1_hits" | head -3)\n  \`\`\`\n"
                ((high_count++))
            fi
        fi

        # --- HIGH: Wrong Better Auth fields ---
        if grep -qE "user\.id[^_]|user\.firstName|user\.lastName" "$file" 2>/dev/null; then
            local ba_hits=$(grep -nE "user\.id[^_]|user\.firstName|user\.lastName" "$file" 2>/dev/null || true)
            if [ -n "$ba_hits" ]; then
                issues+="- ⚠️ **HIGH**: Wrong Better Auth field in \`$file\` - use \`user._id\` and \`user.name\`\n"
                issues+="  \`\`\`\n$(echo "$ba_hits" | head -3)\n  \`\`\`\n"
                ((high_count++))
            fi
        fi

        # --- HIGH: Mutation without auth check ---
        if echo "$file" | grep -q "packages/backend/convex/models"; then
            if grep -q "export const.*mutation\|export const.*internalMutation" "$file" 2>/dev/null; then
                if ! grep -qE "safeGetAuthUser|getUserOrgRole|checkUserOrgAccess|isOrgMember|internalMutation|// @public" "$file" 2>/dev/null; then
                    issues+="- ⚠️ **HIGH**: Mutation in \`$file\` may be missing auth check\n"
                    ((high_count++))
                fi
            fi
        fi

        # --- MEDIUM: console.log left in ---
        if echo "$file" | grep -qE "\.(tsx?|jsx?)$"; then
            local console_hits=$(grep -n "console\.log" "$file" 2>/dev/null | grep -v "// debug" | grep -v "console\.error" || true)
            if [ -n "$console_hits" ]; then
                issues+="- ℹ️ **MEDIUM**: \`console.log\` in \`$file\` - remove before merge\n"
                ((medium_count++))
            fi
        fi

        # --- MEDIUM: useQuery inside component that looks like a list item ---
        if echo "$file" | grep -qE "\.(tsx)$"; then
            if grep -q "useQuery" "$file" 2>/dev/null; then
                if echo "$file" | grep -qiE "card|item|row|cell"; then
                    issues+="- ℹ️ **MEDIUM**: \`useQuery\` in list item component \`$file\` - consider lifting to parent\n"
                    ((medium_count++))
                fi
            fi
        fi

        # --- MEDIUM: Missing returns validator ---
        if echo "$file" | grep -q "packages/backend/convex/models"; then
            local missing_returns=$(grep -c "export const.*query\|export const.*mutation" "$file" 2>/dev/null || echo "0")
            local has_returns=$(grep -c "returns:" "$file" 2>/dev/null || echo "0")
            if [ "$missing_returns" -gt "$has_returns" ] && [ "$missing_returns" -gt 0 ]; then
                issues+="- ℹ️ **MEDIUM**: \`$file\` has $missing_returns functions but only $has_returns \`returns\` validators\n"
                ((medium_count++))
            fi
        fi
    done

    # Report results
    local total=$((critical_count + high_count + medium_count))
    if [ "$total" -gt 0 ]; then
        local verdict="WARN"
        [ "$critical_count" -gt 0 ] && verdict="BLOCK"
        [ "$high_count" -gt 0 ] && verdict="BLOCK"

        write_feedback "🔍 **Code Review: $verdict** (${critical_count} critical, ${high_count} high, ${medium_count} medium)" "$issues\n**Verdict:** $verdict - $([ "$verdict" = "BLOCK" ] && echo "Fix CRITICAL/HIGH issues before continuing" || echo "Consider fixing MEDIUM issues")"
        echo "🔍 Review: $verdict ($total issues)" | tee -a "$LOG_FILE"
    else
        echo "✅ Fast review passed - no issues found" | tee -a "$LOG_FILE"
    fi
}

# Deep Claude CLI review (runs less frequently)
deep_review() {
    local changed_files="$1"

    echo "Running deep Claude CLI review..." | tee -a "$LOG_FILE"

    # Build file list for the prompt
    local file_list=$(echo "$changed_files" | head -10 | tr '\n' ', ')

    local prompt="You are a code reviewer for PlayerARC (Next.js + Convex + Better Auth).

Review these recently changed files for issues:
$file_list

Read each file and check for:
1. CRITICAL: .filter() instead of .withIndex() in Convex queries
2. CRITICAL: Missing organizationId filtering (data isolation)
3. HIGH: N+1 queries (Promise.all with db queries inside map)
4. HIGH: user.id instead of user._id, user.firstName instead of user.name
5. HIGH: Mutations without auth checks
6. MEDIUM: console.log statements, missing error handling

Be concise. Output format:
VERDICT: APPROVE | WARN | BLOCK

ISSUES:
- [SEVERITY] file:line - description

If no issues, just say APPROVE with a brief note."

    local result=$(echo "$prompt" | claude --print 2>&1 || echo "REVIEW_ERROR: Claude CLI failed")

    # Check result
    if echo "$result" | grep -qi "BLOCK\|CRITICAL\|HIGH"; then
        write_feedback "🔍 **Deep Code Review:**" "$result"
        echo "⚠️ Deep review found issues" | tee -a "$LOG_FILE"
    elif echo "$result" | grep -qi "WARN"; then
        echo "⚠️ Deep review has warnings (not blocking)" | tee -a "$LOG_FILE"
    else
        echo "✅ Deep review passed" | tee -a "$LOG_FILE"
    fi
}

# Main check function
check_for_new_commits() {
    local current_commit=$(git rev-parse HEAD 2>/dev/null || echo "none")
    local last_commit=$(cat "$LAST_REVIEWED_COMMIT" 2>/dev/null || echo "none")

    if [ "$current_commit" = "$last_commit" ] || [ "$current_commit" = "none" ]; then
        return
    fi

    echo "" | tee -a "$LOG_FILE"
    echo "=== New commit detected: $(git log --oneline -1) ===" | tee -a "$LOG_FILE"

    # Get changed files in this commit
    local changed_files=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$' | grep -v node_modules || true)

    if [ -z "$changed_files" ]; then
        echo "No code files changed, skipping review" | tee -a "$LOG_FILE"
        echo "$current_commit" > "$LAST_REVIEWED_COMMIT"
        return
    fi

    local file_count=$(echo "$changed_files" | wc -l | tr -d ' ')
    echo "Reviewing $file_count changed files..." | tee -a "$LOG_FILE"

    # Always run fast review
    fast_review "$changed_files"

    # Increment commit counter
    local commit_count=$(cat "$COMMIT_COUNT_FILE" 2>/dev/null || echo "0")
    commit_count=$((commit_count + 1))
    echo "$commit_count" > "$COMMIT_COUNT_FILE"

    # Run deep review every 3rd commit
    if [ $((commit_count % 3)) -eq 0 ]; then
        echo "📊 Deep review triggered (commit #$commit_count)" | tee -a "$LOG_FILE"
        deep_review "$changed_files"
    fi

    # Save last reviewed commit
    echo "$current_commit" > "$LAST_REVIEWED_COMMIT"
}

# Store PID
echo $$ > "$OUTPUT_DIR/code-review-gate.pid"

# Main loop
while true; do
    check_for_new_commits
    sleep 45
done
