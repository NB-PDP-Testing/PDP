#!/bin/bash
# Auto-extract key insights from a Claude conversation
# Usage: ./extract-insights.sh <session-id> [output-file]
#
# Extracts:
# - Files modified (Write/Edit operations)
# - Bash commands run
# - Errors encountered
# - Commit messages
# - User stories completed
# - Code patterns discovered
# - Gotchas and important notes
# - Summary statistics

set -e

SESSION_ID=$1
OUTPUT_FILE=${2:-/dev/stdout}

if [ -z "$SESSION_ID" ]; then
  echo "Usage: ./extract-insights.sh <session-id> [output-file]"
  echo ""
  echo "Extracts learning insights from a Ralph iteration conversation."
  echo "If output-file is omitted, prints to stdout"
  exit 1
fi

# Get the current project path (normalized) - handles being called from different dirs
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROJECT_PATH=$(echo "$PROJECT_ROOT" | sed 's/\//-/g')
CLAUDE_PROJECT_DIR="$HOME/.claude/projects/$PROJECT_PATH"
JSONL_FILE="$CLAUDE_PROJECT_DIR/$SESSION_ID.jsonl"

if [ ! -f "$JSONL_FILE" ]; then
  echo "Error: Conversation file not found: $JSONL_FILE" >&2
  echo "Looking for: $JSONL_FILE" >&2
  exit 1
fi

# Create temporary files for extraction
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# ============================================================================
# EXTRACTION FUNCTIONS
# Note: Claude Code JSONL format:
#   - assistant messages have .message.content[] array
#   - tool_use entries are inside content array with .type == "tool_use"
#   - tool results come in user messages with .message.content[].type == "tool_result"
# ============================================================================

# Extract tool uses from assistant messages
# Format: assistant.message.content[] where type == "tool_use"
extract_tool_uses() {
  local tool_name=$1
  jq -r --arg tool "$tool_name" '
    select(.type == "assistant") |
    .message.content[]? |
    select(.type == "tool_use" and .name == $tool) |
    .input
  ' "$JSONL_FILE" 2>/dev/null
}

# Extract files written/created
extract_files_written() {
  jq -r '
    select(.type == "assistant") |
    .message.content[]? |
    select(.type == "tool_use" and .name == "Write") |
    .input.file_path // empty
  ' "$JSONL_FILE" 2>/dev/null | sort -u | sed 's|^.*/||' | head -20
}

# Extract files edited
extract_files_edited() {
  jq -r '
    select(.type == "assistant") |
    .message.content[]? |
    select(.type == "tool_use" and .name == "Edit") |
    .input.file_path // empty
  ' "$JSONL_FILE" 2>/dev/null | sort -u | sed 's|^.*/||' | head -20
}

# Extract bash commands run
extract_bash_commands() {
  jq -r '
    select(.type == "assistant") |
    .message.content[]? |
    select(.type == "tool_use" and .name == "Bash") |
    .input.command // empty
  ' "$JSONL_FILE" 2>/dev/null | grep -v "^$" | head -30
}

# Extract git commits made
extract_commits() {
  jq -r '
    select(.type == "assistant") |
    .message.content[]? |
    select(.type == "tool_use" and .name == "Bash") |
    .input.command // empty
  ' "$JSONL_FILE" 2>/dev/null | grep -E "git commit" | head -10
}

# Extract errors from tool results (in user messages)
extract_errors() {
  # Tool result errors
  jq -r '
    select(.type == "user") |
    .message.content[]? |
    select(.type == "tool_result" and .is_error == true) |
    "Tool error: \(.content // "unknown" | if type == "array" then .[0].text // "error" else tostring end | split("\n")[0])"
  ' "$JSONL_FILE" 2>/dev/null | head -20

  # Also check for error messages in bash output
  jq -r '
    select(.type == "user") |
    .message.content[]? |
    select(.type == "tool_result") |
    .content // "" |
    if type == "string" then . else (if type == "array" then .[0].text // "" else "" end) end |
    split("\n")[] |
    select(test("error TS|Error:|ERROR:|failed|Failed|FAILED"; "")) |
    select(length < 200 and length > 10)
  ' "$JSONL_FILE" 2>/dev/null | head -20
}

# Extract PRD story updates (stories marked as passes: true)
extract_story_completions() {
  jq -r '
    select(.type == "assistant") |
    .message.content[]? |
    select(.type == "tool_use" and .name == "Edit") |
    select(.input.file_path // "" | test("prd.json")) |
    .input.new_string // empty
  ' "$JSONL_FILE" 2>/dev/null | grep -oE '"passes":\s*true' | wc -l | tr -d ' '
}

# Extract text content from assistant messages
extract_assistant_text() {
  jq -r '
    select(.type == "assistant") |
    .message.content[]? |
    select(.type == "text") |
    .text // empty
  ' "$JSONL_FILE" 2>/dev/null
}

# Extract patterns from assistant messages (learning-related content)
extract_patterns() {
  extract_assistant_text | \
    grep -iE "(pattern|convention|always use|never use|must use|should use|best practice)" | \
    grep -v "^$" | \
    head -10 | \
    sed 's/^[[:space:]]*//' | \
    sed 's/^/- /'
}

# Extract gotchas and warnings
extract_gotchas() {
  extract_assistant_text | \
    grep -iE "(gotcha|careful|warning|important:|note:|mistake|learned|realized)" | \
    grep -v "^$" | \
    head -10 | \
    sed 's/^[[:space:]]*//' | \
    sed 's/^/- /'
}

# Extract what was read (to understand exploration scope)
extract_files_read() {
  jq -r '
    select(.type == "assistant") |
    .message.content[]? |
    select(.type == "tool_use" and .name == "Read") |
    .input.file_path // empty
  ' "$JSONL_FILE" 2>/dev/null | \
    sed 's|^.*/||' | \
    sort | uniq -c | sort -rn | head -10 | \
    awk '{print "- " $2 " (read " $1 "x)"}'
}

# Count tool usage
count_tool_usage() {
  jq -r '
    select(.type == "assistant") |
    .message.content[]? |
    select(.type == "tool_use") |
    .name
  ' "$JSONL_FILE" 2>/dev/null | sort | uniq -c | sort -rn | head -15
}

# ============================================================================
# GENERATE OUTPUT
# ============================================================================

{
  echo "# Iteration Insights: $SESSION_ID"
  echo "**Extracted**: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""

  # Summary stats
  echo "## Summary Statistics"
  TOTAL_TOOLS=$(jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "tool_use") | .name' "$JSONL_FILE" 2>/dev/null | wc -l | tr -d ' ')
  TOTAL_WRITES=$(jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "tool_use" and .name == "Write") | .name' "$JSONL_FILE" 2>/dev/null | wc -l | tr -d ' ')
  TOTAL_EDITS=$(jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "tool_use" and .name == "Edit") | .name' "$JSONL_FILE" 2>/dev/null | wc -l | tr -d ' ')
  TOTAL_READS=$(jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "tool_use" and .name == "Read") | .name' "$JSONL_FILE" 2>/dev/null | wc -l | tr -d ' ')
  TOTAL_BASH=$(jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "tool_use" and .name == "Bash") | .name' "$JSONL_FILE" 2>/dev/null | wc -l | tr -d ' ')
  STORIES_DONE=$(extract_story_completions)

  echo "- **Total tool calls**: $TOTAL_TOOLS"
  echo "- **Files written**: $TOTAL_WRITES"
  echo "- **Files edited**: $TOTAL_EDITS"
  echo "- **Files read**: $TOTAL_READS"
  echo "- **Bash commands**: $TOTAL_BASH"
  echo "- **Stories completed**: ${STORIES_DONE:-0}"
  echo ""

  # Tool usage breakdown
  echo "## Tool Usage Breakdown"
  echo "\`\`\`"
  count_tool_usage
  echo "\`\`\`"
  echo ""

  # Files modified
  WRITTEN=$(extract_files_written)
  EDITED=$(extract_files_edited)

  if [ -n "$WRITTEN" ] || [ -n "$EDITED" ]; then
    echo "## Files Modified"
    if [ -n "$WRITTEN" ]; then
      echo "**Created:**"
      echo "$WRITTEN" | sed 's/^/- /'
    fi
    if [ -n "$EDITED" ]; then
      echo ""
      echo "**Edited:**"
      echo "$EDITED" | sed 's/^/- /'
    fi
    echo ""
  fi

  # Most-read files (indicates exploration focus)
  READS=$(extract_files_read)
  if [ -n "$READS" ]; then
    echo "## Most Explored Files"
    echo "$READS"
    echo ""
  fi

  # Git commits
  COMMITS=$(extract_commits)
  if [ -n "$COMMITS" ]; then
    echo "## Git Commits Made"
    echo "\`\`\`bash"
    echo "$COMMITS"
    echo "\`\`\`"
    echo ""
  fi

  # Errors encountered
  ERRORS=$(extract_errors)
  if [ -n "$ERRORS" ]; then
    echo "## Errors Encountered"
    echo "$ERRORS" | head -15 | sed 's/^/- /'
    echo ""
  fi

  # Key bash commands (excluding common ones)
  BASH_CMDS=$(extract_bash_commands | grep -vE "^ls|^cd |^cat |^echo|^pwd|^git status|^git log|^git diff" | head -15)
  if [ -n "$BASH_CMDS" ]; then
    echo "## Key Commands Run"
    echo "\`\`\`bash"
    echo "$BASH_CMDS"
    echo "\`\`\`"
    echo ""
  fi

  # Patterns discovered
  PATTERNS=$(extract_patterns)
  if [ -n "$PATTERNS" ]; then
    echo "## Patterns Discovered"
    echo "$PATTERNS"
    echo ""
  fi

  # Gotchas
  GOTCHAS=$(extract_gotchas)
  if [ -n "$GOTCHAS" ]; then
    echo "## Gotchas & Learnings"
    echo "$GOTCHAS"
    echo ""
  fi

  echo "---"
  echo ""
  echo "**Full conversation**: \`$JSONL_FILE\`"
  echo ""
  echo "**Parse with**: \`./scripts/ralph/parse-conversation.sh $SESSION_ID\`"

} > "$OUTPUT_FILE"

if [ "$OUTPUT_FILE" != "/dev/stdout" ]; then
  echo "✅ Insights extracted to: $OUTPUT_FILE"
fi
