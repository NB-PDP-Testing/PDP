#!/bin/bash
# Dangerous Command Check Hook
# Blocks destructive operations that could lose work

# Read hook input from stdin
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Check for destructive commands
if [[ "$COMMAND" =~ "git reset --hard" ]] || \
   [[ "$COMMAND" =~ "git clean -f" ]] || \
   [[ "$COMMAND" =~ "rm -rf /" ]]; then

  echo "⛔ BLOCKED: Destructive command detected" >&2
  echo "Command: $COMMAND" >&2
  echo "This could cause data loss. If you really need to run this, use the terminal directly." >&2
  exit 2  # Block the command
fi

# Pass through
echo "$INPUT"
exit 0
