#!/bin/bash
# Security Tester Agent
# Runs core security checks + phase-specific checks every 120 seconds

set -e
cd "$(dirname "$0")/../../.."

OUTPUT_DIR="scripts/ralph/agents/output"
LOG_FILE="$OUTPUT_DIR/security-tester.log"
FEEDBACK_FILE="$OUTPUT_DIR/feedback.md"
REPORT_FILE="$OUTPUT_DIR/security-report.md"

mkdir -p "$OUTPUT_DIR"

# Phase-specific configuration
# Set this before running Ralph on a new phase
CURRENT_PHASE="P9"  # Phase 9: Collaboration Features
PHASE_CHECKS_ENABLED=true

echo "🔒 Security Tester started at $(date)" | tee -a "$LOG_FILE"
echo "Current Phase: $CURRENT_PHASE (Phase checks: $PHASE_CHECKS_ENABLED)" | tee -a "$LOG_FILE"
echo "Running core + phase-specific security checks every 120 seconds..."

run_security_checks() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local issues_found=false
    local feedback=""
    local severity_critical=0
    local severity_high=0
    local severity_medium=0

    echo "" | tee -a "$LOG_FILE"
    echo "=== Security Check at $timestamp ===" | tee -a "$LOG_FILE"

    # ========================================
    # CORE SECURITY CHECKS (Always Run)
    # ========================================

    # 1. Secrets Detection - Hardcoded API keys, tokens, passwords
    echo "🔍 Checking for hardcoded secrets..." | tee -a "$LOG_FILE"
    local secrets=$(grep -r -E "(OPENAI_API_KEY|ANTHROPIC_API_KEY|sk-[a-zA-Z0-9]{32,}|key.*=.*['\"][a-zA-Z0-9]{20,}|token.*=.*['\"][a-zA-Z0-9]{20,}|password.*=.*['\"][^'\"]+)" \
        --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
        apps/web/src packages/backend/convex 2>/dev/null | \
        grep -v "\.env" | grep -v "process.env" | grep -v "// example" || true)

    if [ -n "$secrets" ]; then
        issues_found=true
        ((severity_critical++))
        feedback+="- 🚨 **CRITICAL**: Hardcoded secrets detected\\n\`\`\`\\n$(echo "$secrets" | head -5)\\n\`\`\`\\n"
        echo "🚨 CRITICAL: Hardcoded secrets found" | tee -a "$LOG_FILE"
    else
        echo "✅ No hardcoded secrets detected" | tee -a "$LOG_FILE"
    fi

    # 2. Dependency Vulnerabilities - npm audit
    echo "🔍 Checking dependency vulnerabilities..." | tee -a "$LOG_FILE"
    local audit_output=$(npm audit --json 2>/dev/null || true)
    local critical_vulns=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")
    local high_vulns=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "0")

    if [ "$critical_vulns" -gt 0 ] || [ "$high_vulns" -gt 0 ]; then
        issues_found=true
        if [ "$critical_vulns" -gt 0 ]; then
            ((severity_critical++))
            feedback+="- 🚨 **CRITICAL**: $critical_vulns critical dependency vulnerabilities\\n"
        fi
        if [ "$high_vulns" -gt 0 ]; then
            ((severity_high++))
            feedback+="- ⚠️ **HIGH**: $high_vulns high-severity dependency vulnerabilities\\n"
        fi
        feedback+="  Run \`npm audit fix\` to resolve\\n"
        echo "🚨 Dependency vulnerabilities: $critical_vulns critical, $high_vulns high" | tee -a "$LOG_FILE"
    else
        echo "✅ No critical/high dependency vulnerabilities" | tee -a "$LOG_FILE"
    fi

    # 3. Authorization Checks - Verify getUserOrgRole used in mutations
    echo "🔍 Checking authorization patterns..." | tee -a "$LOG_FILE"
    local unprotected_mutations=$(find packages/backend/convex/models -name "*.ts" -type f -exec grep -l "export const.*mutation" {} \; 2>/dev/null | while read file; do
        # Check if mutation has role check or is in public/open endpoints
        if ! grep -q "getUserOrgRole\|checkUserOrgAccess\|isOrgMember\|// @public" "$file" 2>/dev/null; then
            echo "$file"
        fi
    done)

    if [ -n "$unprotected_mutations" ]; then
        ((severity_high++))
        issues_found=true
        feedback+="- ⚠️ **HIGH**: Mutations without authorization checks:\\n"
        for file in $unprotected_mutations; do
            feedback+="  - $file\\n"
        done
        feedback+="  **Action**: Add \`getUserOrgRole()\` or mark as \`// @public\`\\n"
        echo "⚠️ Unprotected mutations found" | tee -a "$LOG_FILE"
    else
        echo "✅ All mutations have authorization checks" | tee -a "$LOG_FILE"
    fi

    # 4. Direct Database Access Without Indexes
    echo "🔍 Checking for .filter() usage (security + performance)..." | tee -a "$LOG_FILE"
    local filter_usage=$(find packages/backend/convex/models -name "*.ts" -type f -exec grep -n "\.query.*\.filter(" {} + 2>/dev/null || true)

    if [ -n "$filter_usage" ]; then
        ((severity_medium++))
        issues_found=true
        feedback+="- ⚠️ **MEDIUM**: .filter() usage found (use .withIndex() instead):\\n"
        feedback+="  $(echo "$filter_usage" | head -3 | sed 's/^/  /')\\n"
        echo "⚠️ .filter() usage detected" | tee -a "$LOG_FILE"
    else
        echo "✅ No .filter() usage (all queries use indexes)" | tee -a "$LOG_FILE"
    fi

    # 5. Environment Variable Exposure
    echo "🔍 Checking for exposed environment variables..." | tee -a "$LOG_FILE"
    local env_exposure=$(grep -r "process\.env\." apps/web/src --include="*.tsx" --include="*.ts" 2>/dev/null | \
        grep -v "NEXT_PUBLIC_" | grep -v "\.env" | grep -v "// safe" || true)

    if [ -n "$env_exposure" ]; then
        ((severity_high++))
        issues_found=true
        feedback+="- ⚠️ **HIGH**: Server-only env vars exposed to client:\\n"
        feedback+="  $(echo "$env_exposure" | head -3 | sed 's/^/  /')\\n"
        feedback+="  **Action**: Only use NEXT_PUBLIC_ prefixed vars in client code\\n"
        echo "⚠️ Environment variable exposure detected" | tee -a "$LOG_FILE"
    else
        echo "✅ No server env vars exposed to client" | tee -a "$LOG_FILE"
    fi

    # ========================================
    # PHASE-SPECIFIC CHECKS (Configurable)
    # ========================================

    if [ "$PHASE_CHECKS_ENABLED" = true ]; then
        echo "" | tee -a "$LOG_FILE"
        echo "🎯 Running Phase $CURRENT_PHASE specific checks..." | tee -a "$LOG_FILE"

        case "$CURRENT_PHASE" in
            "P9")
                # Phase 9: Collaboration Features (Activity Feed, @Mentions, Notifications, AI Copilot)

                # P9.1: XSS in Comments/Mentions
                echo "🔍 [P9] Checking for XSS vulnerabilities in user-generated content..." | tee -a "$LOG_FILE"
                local xss_risks=$(grep -r "dangerouslySetInnerHTML" apps/web/src --include="*.tsx" 2>/dev/null | \
                    grep -v "DOMPurify\|sanitize" || true)

                if [ -n "$xss_risks" ]; then
                    ((severity_critical++))
                    issues_found=true
                    feedback+="- 🚨 **CRITICAL [P9]**: XSS risk - dangerouslySetInnerHTML without sanitization:\\n"
                    feedback+="  $(echo "$xss_risks" | head -3 | sed 's/^/  /')\\n"
                    feedback+="  **Action**: Use DOMPurify or remove dangerouslySetInnerHTML\\n"
                    echo "🚨 XSS vulnerability detected" | tee -a "$LOG_FILE"
                else
                    echo "✅ No XSS risks in user-generated content rendering" | tee -a "$LOG_FILE"
                fi

                # P9.2: Rate Limiting on Notification/Activity Endpoints
                echo "🔍 [P9] Checking rate limiting on high-frequency endpoints..." | tee -a "$LOG_FILE"
                local high_freq_mutations=$(grep -l "sendNotification\|createActivityFeedEntry\|sendMention" \
                    packages/backend/convex/models/*.ts 2>/dev/null | while read file; do
                    if ! grep -q "rateLimiter\|throttle\|// rate-limited" "$file" 2>/dev/null; then
                        echo "$file"
                    fi
                done)

                if [ -n "$high_freq_mutations" ]; then
                    ((severity_high++))
                    issues_found=true
                    feedback+="- ⚠️ **HIGH [P9]**: No rate limiting on notification/activity endpoints:\\n"
                    for file in $high_freq_mutations; do
                        feedback+="  - $file\\n"
                    done
                    feedback+="  **Action**: Add rate limiting to prevent spam/abuse\\n"
                    echo "⚠️ Missing rate limiting on high-frequency endpoints" | tee -a "$LOG_FILE"
                else
                    echo "✅ Rate limiting implemented on high-frequency endpoints" | tee -a "$LOG_FILE"
                fi

                # P9.3: AI Prompt Injection (AI Copilot)
                echo "🔍 [P9] Checking for AI prompt injection vulnerabilities..." | tee -a "$LOG_FILE"
                local ai_endpoints=$(grep -l "openai\|anthropic\|generateText" \
                    packages/backend/convex/actions/*.ts packages/backend/convex/models/*.ts 2>/dev/null || true)

                if [ -n "$ai_endpoints" ]; then
                    local unsafe_ai=$(echo "$ai_endpoints" | while read file; do
                        if ! grep -q "sanitize\|validation\|maxLength\|// prompt-validated" "$file" 2>/dev/null; then
                            echo "$file"
                        fi
                    done)

                    if [ -n "$unsafe_ai" ]; then
                        ((severity_high++))
                        issues_found=true
                        feedback+="- ⚠️ **HIGH [P9]**: AI endpoints without input validation:\\n"
                        for file in $unsafe_ai; do
                            feedback+="  - $file\\n"
                        done
                        feedback+="  **Action**: Validate/sanitize user input before AI prompts\\n"
                        echo "⚠️ AI prompt injection risk detected" | tee -a "$LOG_FILE"
                    else
                        echo "✅ AI endpoints have input validation" | tee -a "$LOG_FILE"
                    fi
                else
                    echo "ℹ️ No AI endpoints detected in current phase" | tee -a "$LOG_FILE"
                fi

                # P9.4: Notification Permission Escalation
                echo "🔍 [P9] Checking notification authorization..." | tee -a "$LOG_FILE"
                local notif_files=$(find packages/backend/convex/models -name "*notification*.ts" -o -name "*activity*.ts" 2>/dev/null || true)

                if [ -n "$notif_files" ]; then
                    local unauth_notif=$(echo "$notif_files" | while read file; do
                        if grep -q "sendNotification\|createNotification" "$file" 2>/dev/null; then
                            if ! grep -q "getUserOrgRole\|checkPermission\|canNotify\|// @internal" "$file" 2>/dev/null; then
                                echo "$file"
                            fi
                        fi
                    done)

                    if [ -n "$unauth_notif" ]; then
                        ((severity_high++))
                        issues_found=true
                        feedback+="- ⚠️ **HIGH [P9]**: Notification functions without permission checks:\\n"
                        for file in $unauth_notif; do
                            feedback+="  - $file\\n"
                        done
                        feedback+="  **Action**: Verify user can send notifications to recipient\\n"
                        echo "⚠️ Notification permission issues detected" | tee -a "$LOG_FILE"
                    else
                        echo "✅ Notification functions have permission checks" | tee -a "$LOG_FILE"
                    fi
                fi
                ;;

            *)
                echo "ℹ️ No phase-specific checks configured for phase $CURRENT_PHASE" | tee -a "$LOG_FILE"
                ;;
        esac
    fi

    # ========================================
    # DEEP CLAUDE REVIEW (on story completion or every 5th cycle)
    # ========================================

    local cycle_count=$(cat "$OUTPUT_DIR/.security-cycle-count" 2>/dev/null || echo "0")
    cycle_count=$((cycle_count + 1))
    echo "$cycle_count" > "$OUTPUT_DIR/.security-cycle-count"

    # Check if a new story was completed (PRD changed)
    local current_completed=$(jq '[.userStories[] | select(.passes == true)] | length' scripts/ralph/prd.json 2>/dev/null || echo "0")
    local last_completed=$(cat "$OUTPUT_DIR/.last-security-completed" 2>/dev/null || echo "0")

    local run_deep_review=false
    if [ "$current_completed" -gt "$last_completed" ]; then
        run_deep_review=true
        echo "$current_completed" > "$OUTPUT_DIR/.last-security-completed"
        echo "🆕 New story completed - triggering deep security review" | tee -a "$LOG_FILE"
    elif [ $((cycle_count % 5)) -eq 0 ]; then
        run_deep_review=true
        echo "📊 Periodic deep security review (cycle $cycle_count)" | tee -a "$LOG_FILE"
    fi

    if [ "$run_deep_review" = true ]; then
        echo "🔒 Running deep Claude security review..." | tee -a "$LOG_FILE"

        # Get recently changed files
        local recent_files=$(git diff --name-only HEAD~3 HEAD 2>/dev/null | grep -E '\.(ts|tsx)$' | grep -v node_modules | head -15 || true)

        if [ -n "$recent_files" ]; then
            local deep_prompt="You are a security reviewer for PlayerARC (Next.js + Convex + Better Auth multi-tenant app).

Review these recently changed files for security vulnerabilities:
$recent_files

Read each file and focus on:
1. CRITICAL: Hardcoded secrets, XSS (dangerouslySetInnerHTML without sanitization)
2. CRITICAL: Authentication bypass, missing auth checks on mutations
3. CRITICAL: Organization data isolation - queries MUST filter by organizationId
4. HIGH: Missing input validation on Convex mutations
5. HIGH: Server-only env vars exposed in client code (non-NEXT_PUBLIC_)
6. HIGH: Unsafe user input passed to AI prompts (prompt injection)
7. MEDIUM: Missing rate limiting on high-frequency endpoints

Be concise. Only report actual issues found (not theoretical).
Output: SEVERITY - file:line - description - fix suggestion"

            local deep_result=$(echo "$deep_prompt" | timeout 90 claude --print 2>&1 || echo "DEEP_REVIEW_ERROR")

            if echo "$deep_result" | grep -qi "CRITICAL\|HIGH"; then
                echo "" >> "$FEEDBACK_FILE"
                echo "## Deep Security Review - $timestamp" >> "$FEEDBACK_FILE"
                echo "" >> "$FEEDBACK_FILE"
                echo "$deep_result" >> "$FEEDBACK_FILE"
                echo "" >> "$FEEDBACK_FILE"
                echo "🚨 Deep security review found issues" | tee -a "$LOG_FILE"
            elif ! echo "$deep_result" | grep -qi "DEEP_REVIEW_ERROR"; then
                echo "✅ Deep security review passed" | tee -a "$LOG_FILE"
            else
                echo "⚠️ Deep review failed (Claude CLI error)" | tee -a "$LOG_FILE"
            fi
        fi
    fi

    # ========================================
    # REPORTING
    # ========================================

    # Write security report
    echo "# Security Report - $timestamp" > "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "**Phase:** $CURRENT_PHASE" >> "$REPORT_FILE"
    echo "**Critical:** $severity_critical | **High:** $severity_high | **Medium:** $severity_medium" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"

    # Write feedback if issues found
    if [ "$issues_found" = true ]; then
        echo "" >> "$FEEDBACK_FILE"
        echo "## Security Tester - $timestamp" >> "$FEEDBACK_FILE"
        echo -e "$feedback" >> "$FEEDBACK_FILE"

        echo "## Issues Found" >> "$REPORT_FILE"
        echo -e "$feedback" >> "$REPORT_FILE"

        echo "🚨 Security issues found - feedback written to $FEEDBACK_FILE" | tee -a "$LOG_FILE"
        echo "📄 Full report: $REPORT_FILE" | tee -a "$LOG_FILE"
    else
        echo "✅ All security checks passed" | tee -a "$LOG_FILE"
        echo "## All Checks Passed ✅" >> "$REPORT_FILE"
    fi
}

# Store PID
echo $$ > "$OUTPUT_DIR/security-tester.pid"

# Main loop
while true; do
    run_security_checks
    echo "Sleeping 120 seconds..." | tee -a "$LOG_FILE"
    sleep 120
done
