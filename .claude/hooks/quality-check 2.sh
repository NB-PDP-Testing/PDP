#!/bin/bash
# Auto Quality Check Hook
# Triggered after file writes to backend files
# Writes issues to feedback.md for Ralph to read

# Read hook input from stdin
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only check backend files
if [[ ! "$FILE_PATH" =~ packages/backend/convex ]]; then
  exit 0
fi

FEEDBACK_FILE="scripts/ralph/agents/output/feedback.md"
mkdir -p "$(dirname "$FEEDBACK_FILE")"

# Check for Better Auth adapter violations
if grep -q "ctx\.db\.\(get\|query\)" "$FILE_PATH" 2>/dev/null; then
  if grep -E "(user|member|organization|team)" "$FILE_PATH" | grep -q "ctx\.db"; then
    echo "" >> "$FEEDBACK_FILE"
    echo "## Auto Quality Check - $(date '+%Y-%m-%d %H:%M:%S')" >> "$FEEDBACK_FILE"
    echo "### File: $FILE_PATH" >> "$FEEDBACK_FILE"
    echo "" >> "$FEEDBACK_FILE"
    echo "- ❌ **CRITICAL: Better Auth adapter violation**" >> "$FEEDBACK_FILE"
    echo "  - **Problem:** Direct DB access to auth tables" >> "$FEEDBACK_FILE"
    echo "  - **Fix:** Use \`ctx.runQuery(components.betterAuth.adapter.findOne, {...})\`" >> "$FEEDBACK_FILE"
    echo "" >> "$FEEDBACK_FILE"
  fi
fi

# Check for .filter() usage
if grep -q "\.filter(" "$FILE_PATH" 2>/dev/null; then
  echo "" >> "$FEEDBACK_FILE"
  echo "## Auto Quality Check - $(date '+%Y-%m-%d %H:%M:%S')" >> "$FEEDBACK_FILE"
  echo "### File: $FILE_PATH" >> "$FEEDBACK_FILE"
  echo "" >> "$FEEDBACK_FILE"
  echo "- ⚠️ **Performance: .filter() usage detected**" >> "$FEEDBACK_FILE"
  echo "  - **Problem:** Should use .withIndex() for better performance" >> "$FEEDBACK_FILE"
  echo "  - **Fix:** Replace \`.query().filter()\` with \`.query().withIndex()\`" >> "$FEEDBACK_FILE"
  echo "" >> "$FEEDBACK_FILE"
fi

# Pass through the input unchanged
echo "$INPUT"
exit 0
