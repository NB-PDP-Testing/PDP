#!/bin/bash
# Auto Security Check Hook
# Triggered after git commits
# Reviews changed files for security issues

# Read hook input from stdin
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only run on git commit
if [[ ! "$COMMAND" =~ "git commit" ]]; then
  echo "$INPUT"
  exit 0
fi

FEEDBACK_FILE="scripts/ralph/agents/output/feedback.md"
mkdir -p "$(dirname "$FEEDBACK_FILE")"

# Get last commit's changed files
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null)

# Initialize security report
ISSUES_FOUND=0

# Check for hardcoded secrets (multiple patterns)
SECRET_PATTERNS="API_KEY|SECRET|PASSWORD|TOKEN|PRIVATE_KEY|AWS_ACCESS"
if echo "$CHANGED_FILES" | xargs grep -E "$SECRET_PATTERNS.*=.*(\"|\')[^\"\']{20,}" 2>/dev/null | grep -v "process.env" | head -5; then
  if [ $ISSUES_FOUND -eq 0 ]; then
    echo "" >> "$FEEDBACK_FILE"
    echo "## Auto Security Review - $(date '+%Y-%m-%d %H:%M:%S')" >> "$FEEDBACK_FILE"
    echo "### Commit: $(git log -1 --oneline)" >> "$FEEDBACK_FILE"
    echo "" >> "$FEEDBACK_FILE"
  fi
  echo "- 🚨 **CRITICAL: Possible hardcoded secrets**" >> "$FEEDBACK_FILE"
  echo "  - **Pattern:** API keys, tokens, or passwords hardcoded in source" >> "$FEEDBACK_FILE"
  echo "  - **Fix:** Use environment variables instead" >> "$FEEDBACK_FILE"
  ((ISSUES_FOUND++))
fi

# Check for XSS vulnerabilities
if echo "$CHANGED_FILES" | xargs grep -l "dangerouslySetInnerHTML" 2>/dev/null | head -5; then
  if [ $ISSUES_FOUND -eq 0 ]; then
    echo "" >> "$FEEDBACK_FILE"
    echo "## Auto Security Review - $(date '+%Y-%m-%d %H:%M:%S')" >> "$FEEDBACK_FILE"
    echo "### Commit: $(git log -1 --oneline)" >> "$FEEDBACK_FILE"
    echo "" >> "$FEEDBACK_FILE"
  fi
  echo "- ⚠️ **HIGH: XSS Risk (dangerouslySetInnerHTML)**" >> "$FEEDBACK_FILE"
  echo "  - **Fix:** Sanitize with DOMPurify before rendering" >> "$FEEDBACK_FILE"
  ((ISSUES_FOUND++))
fi

# Check for SQL/NoSQL injection risks
if echo "$CHANGED_FILES" | xargs grep -E "\`.*\$\{.*\}\`|\".*\$\{.*\}\"" 2>/dev/null | grep -E "(query|exec|find|update|delete)" | head -5; then
  if [ $ISSUES_FOUND -eq 0 ]; then
    echo "" >> "$FEEDBACK_FILE"
    echo "## Auto Security Review - $(date '+%Y-%m-%d %H:%M:%S')" >> "$FEEDBACK_FILE"
    echo "### Commit: $(git log -1 --oneline)" >> "$FEEDBACK_FILE"
    echo "" >> "$FEEDBACK_FILE"
  fi
  echo "- ⚠️ **HIGH: Possible injection vulnerability**" >> "$FEEDBACK_FILE"
  echo "  - **Pattern:** String interpolation in queries" >> "$FEEDBACK_FILE"
  echo "  - **Fix:** Use parameterized queries or validators" >> "$FEEDBACK_FILE"
  ((ISSUES_FOUND++))
fi

# Check for console.log in production code
if echo "$CHANGED_FILES" | grep -v "test\|spec" | xargs grep -l "console\.log" 2>/dev/null | head -5; then
  if [ $ISSUES_FOUND -eq 0 ]; then
    echo "" >> "$FEEDBACK_FILE"
    echo "## Auto Security Review - $(date '+%Y-%m-%d %H:%M:%S')" >> "$FEEDBACK_FILE"
    echo "### Commit: $(git log -1 --oneline)" >> "$FEEDBACK_FILE"
    echo "" >> "$FEEDBACK_FILE"
  fi
  echo "- ℹ️ **INFO: console.log statements found**" >> "$FEEDBACK_FILE"
  echo "  - **Action:** Remove debug logging before production" >> "$FEEDBACK_FILE"
  ((ISSUES_FOUND++))
fi

# Check for missing authorization in mutations (Convex specific)
MUTATION_FILES=$(echo "$CHANGED_FILES" | grep "packages/backend/convex/models.*\.ts$")
if [ -n "$MUTATION_FILES" ]; then
  for file in $MUTATION_FILES; do
    if grep -q "export const.*mutation" "$file" 2>/dev/null; then
      if ! grep -q "getUserOrgRole\|checkOrgAccess\|requirePlatformStaff" "$file" 2>/dev/null; then
        if [ $ISSUES_FOUND -eq 0 ]; then
          echo "" >> "$FEEDBACK_FILE"
          echo "## Auto Security Review - $(date '+%Y-%m-%d %H:%M:%S')" >> "$FEEDBACK_FILE"
          echo "### Commit: $(git log -1 --oneline)" >> "$FEEDBACK_FILE"
          echo "" >> "$FEEDBACK_FILE"
        fi
        echo "- ⚠️ **MEDIUM: Possible missing authorization in $file**" >> "$FEEDBACK_FILE"
        echo "  - **Fix:** Add getUserOrgRole() check in mutations" >> "$FEEDBACK_FILE"
        ((ISSUES_FOUND++))
        break
      fi
    fi
  done
fi

# Finish report if issues found
if [ $ISSUES_FOUND -gt 0 ]; then
  echo "" >> "$FEEDBACK_FILE"
  echo "**Total security concerns:** $ISSUES_FOUND" >> "$FEEDBACK_FILE"
  echo "" >> "$FEEDBACK_FILE"
fi

# Pass through the input unchanged
echo "$INPUT"
exit 0
