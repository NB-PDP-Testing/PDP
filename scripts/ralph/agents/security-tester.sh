#!/bin/bash
# Security Tester Agent
# Runs security pattern checks every 120 seconds, reports issues to feedback

set -e
cd "$(dirname "$0")/../../.."

OUTPUT_DIR="scripts/ralph/agents/output"
LOG_FILE="$OUTPUT_DIR/security-tester.log"
FEEDBACK_FILE="$OUTPUT_DIR/feedback.md"
SECURITY_REPORT="$OUTPUT_DIR/security-report.md"

mkdir -p "$OUTPUT_DIR"

echo "🔒 Security Tester started at $(date)" | tee -a "$LOG_FILE"
echo "Checking security patterns every 120 seconds..."

check_security() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local issues_found=false
    local feedback=""
    local severity_high=0
    local severity_medium=0
    local severity_low=0

    echo "" | tee -a "$LOG_FILE"
    echo "=== Security Check at $timestamp ===" | tee -a "$LOG_FILE"

    # 1. Check for hardcoded secrets in backend
    echo "Checking for hardcoded secrets..." | tee -a "$LOG_FILE"
    local secrets=$(grep -r -E "(API_KEY|SECRET|PASSWORD|TOKEN|PRIVATE_KEY|AWS_ACCESS).*=.*(\"|\')[^\"\']{20,}" packages/backend/convex 2>/dev/null | grep -v "process.env" || true)
    if [ -n "$secrets" ]; then
        issues_found=true
        severity_high=$((severity_high + 1))
        feedback+="## 🚨 HIGH: Possible Hardcoded Secrets\n"
        feedback+="Found potential hardcoded secrets in backend:\n"
        feedback+="\`\`\`\n$secrets\n\`\`\`\n"
        feedback+="**Fix:** Use environment variables instead\n\n"
        echo "🚨 Found potential hardcoded secrets" | tee -a "$LOG_FILE"
    fi

    # 2. Check for XSS vulnerabilities (dangerouslySetInnerHTML)
    echo "Checking for XSS risks..." | tee -a "$LOG_FILE"
    local xss=$(grep -r "dangerouslySetInnerHTML" apps/web/src 2>/dev/null | head -5 || true)
    if [ -n "$xss" ]; then
        issues_found=true
        severity_medium=$((severity_medium + 1))
        feedback+="## ⚠️ MEDIUM: XSS Risk Detected\n"
        feedback+="Found dangerouslySetInnerHTML usage:\n"
        feedback+="\`\`\`\n$xss\n\`\`\`\n"
        feedback+="**Fix:** Sanitize with DOMPurify before rendering\n\n"
        echo "⚠️ Found XSS risks" | tee -a "$LOG_FILE"
    fi

    # 3. Check for SQL/NoSQL injection risks
    echo "Checking for injection vulnerabilities..." | tee -a "$LOG_FILE"
    local injection=$(grep -r -E "\`.*\$\{.*\}\`|\".*\$\{.*\}\"" packages/backend/convex 2>/dev/null | grep -E "(query|exec|find|update|delete)" | head -5 || true)
    if [ -n "$injection" ]; then
        issues_found=true
        severity_medium=$((severity_medium + 1))
        feedback+="## ⚠️ MEDIUM: Possible Injection Vulnerability\n"
        feedback+="Found string interpolation in queries:\n"
        feedback+="\`\`\`\n$injection\n\`\`\`\n"
        feedback+="**Fix:** Use parameterized queries or validators\n\n"
        echo "⚠️ Found injection risks" | tee -a "$LOG_FILE"
    fi

    # 4. Check for console.log in production code
    echo "Checking for debug logging..." | tee -a "$LOG_FILE"
    local console_logs=$(find apps/web/src packages/backend/convex -name "*.ts" -o -name "*.tsx" 2>/dev/null | grep -v "test\|spec" | xargs grep -l "console\.log" 2>/dev/null | head -5 || true)
    if [ -n "$console_logs" ]; then
        issues_found=true
        severity_low=$((severity_low + 1))
        feedback+="## ℹ️ INFO: Debug Logging Found\n"
        feedback+="Files with console.log:\n"
        for file in $console_logs; do
            feedback+="- $file\n"
        done
        feedback+="**Action:** Remove debug logging before production\n\n"
        echo "ℹ️ Found debug logging" | tee -a "$LOG_FILE"
    fi

    # 5. Check for missing authorization in Convex mutations
    echo "Checking authorization patterns..." | tee -a "$LOG_FILE"
    local unauth_mutations=""
    for file in $(find packages/backend/convex/models -name "*.ts" 2>/dev/null); do
        if grep -q "export const.*mutation" "$file" 2>/dev/null; then
            if ! grep -q "getUserOrgRole\|checkOrgAccess\|requirePlatformStaff" "$file" 2>/dev/null; then
                unauth_mutations+="$file\n"
            fi
        fi
    done
    if [ -n "$unauth_mutations" ]; then
        issues_found=true
        severity_medium=$((severity_medium + 1))
        feedback+="## ⚠️ MEDIUM: Possible Missing Authorization\n"
        feedback+="Mutations without auth checks:\n"
        feedback+="$(echo -e $unauth_mutations)"
        feedback+="**Fix:** Add getUserOrgRole() check in mutations\n\n"
        echo "⚠️ Found mutations without auth checks" | tee -a "$LOG_FILE"
    fi

    # Write to feedback if issues found
    if [ "$issues_found" = true ]; then
        echo "" >> "$FEEDBACK_FILE"
        echo "## 🔒 Security Audit - $timestamp" >> "$FEEDBACK_FILE"
        echo "" >> "$FEEDBACK_FILE"
        echo -e "$feedback" >> "$FEEDBACK_FILE"
        echo "**Summary:** $severity_high high, $severity_medium medium, $severity_low low severity issues" >> "$FEEDBACK_FILE"
        echo "" >> "$FEEDBACK_FILE"

        # Also write to security report
        echo "# Security Report - $timestamp" > "$SECURITY_REPORT"
        echo "" >> "$SECURITY_REPORT"
        echo -e "$feedback" >> "$SECURITY_REPORT"

        echo "✍️ Wrote security issues to feedback.md and security-report.md" | tee -a "$LOG_FILE"
    else
        echo "✅ No security issues found" | tee -a "$LOG_FILE"
    fi
}

# Main loop
while true; do
    check_security
    echo "Sleeping for 120 seconds..." | tee -a "$LOG_FILE"
    sleep 120
done
