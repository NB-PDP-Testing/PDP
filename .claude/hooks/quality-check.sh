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

# Check for N+1 anti-pattern: Promise.all with queries inside map
if grep -q "Promise\.all" "$FILE_PATH" 2>/dev/null; then
  if grep -A 3 "Promise\.all" "$FILE_PATH" | grep -qE "\.map\(async|\.map\(\s*async" 2>/dev/null; then
    if grep -A 5 "Promise\.all" "$FILE_PATH" | grep -qE "ctx\.db\.(get|query)|ctx\.runQuery" 2>/dev/null; then
      echo "" >> "$FEEDBACK_FILE"
      echo "## Auto Quality Check - $(date '+%Y-%m-%d %H:%M:%S')" >> "$FEEDBACK_FILE"
      echo "### File: $FILE_PATH" >> "$FEEDBACK_FILE"
      echo "" >> "$FEEDBACK_FILE"
      echo "- ❌ **CRITICAL: N+1 query pattern detected**" >> "$FEEDBACK_FILE"
      echo "  - **Problem:** \`Promise.all(items.map(async => query))\` makes N database calls" >> "$FEEDBACK_FILE"
      echo "  - **Fix:** Batch fetch all IDs first, create Map for O(1) lookup" >> "$FEEDBACK_FILE"
      echo "" >> "$FEEDBACK_FILE"
    fi
  fi
fi

# Check for user.id instead of user._id (Better Auth)
if grep -qE "user\.id[^_]|user\.id$|user\.id," "$FILE_PATH" 2>/dev/null; then
  if ! grep -q "user\._id" "$FILE_PATH" 2>/dev/null || grep -c "user\.id[^_]" "$FILE_PATH" 2>/dev/null | grep -qv "^0$"; then
    echo "" >> "$FEEDBACK_FILE"
    echo "## Auto Quality Check - $(date '+%Y-%m-%d %H:%M:%S')" >> "$FEEDBACK_FILE"
    echo "### File: $FILE_PATH" >> "$FEEDBACK_FILE"
    echo "" >> "$FEEDBACK_FILE"
    echo "- ⚠️ **Better Auth: Possible user.id instead of user._id**" >> "$FEEDBACK_FILE"
    echo "  - **Problem:** Better Auth uses \`user._id\`, not \`user.id\`" >> "$FEEDBACK_FILE"
    echo "  - **Fix:** Replace \`user.id\` with \`user._id\`" >> "$FEEDBACK_FILE"
    echo "" >> "$FEEDBACK_FILE"
  fi
fi

# Check for missing organizationId in queries
if grep -qE "\.query\(|\.withIndex\(" "$FILE_PATH" 2>/dev/null; then
  if ! grep -q "organizationId" "$FILE_PATH" 2>/dev/null; then
    echo "" >> "$FEEDBACK_FILE"
    echo "## Auto Quality Check - $(date '+%Y-%m-%d %H:%M:%S')" >> "$FEEDBACK_FILE"
    echo "### File: $FILE_PATH" >> "$FEEDBACK_FILE"
    echo "" >> "$FEEDBACK_FILE"
    echo "- ⚠️ **Data Isolation: No organizationId filter found**" >> "$FEEDBACK_FILE"
    echo "  - **Problem:** Queries should be scoped by organizationId for multi-tenant isolation" >> "$FEEDBACK_FILE"
    echo "  - **Fix:** Add organizationId to query args and use in .withIndex()" >> "$FEEDBACK_FILE"
    echo "" >> "$FEEDBACK_FILE"
  fi
fi

# Pass through the input unchanged
echo "$INPUT"
exit 0
