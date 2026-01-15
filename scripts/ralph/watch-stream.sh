#!/bin/bash
# Pretty stream viewer for Ralph
# Usage: ./watch-stream.sh

STREAM_LOG="$(dirname "$0")/stream.log"

echo "🔍 Watching Ralph stream (Ctrl+C to stop)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

tail -f "$STREAM_LOG" 2>/dev/null | while IFS= read -r line; do
  # Skip empty lines
  [ -z "$line" ] && continue

  # Parse JSON and format nicely
  type=$(echo "$line" | jq -r '.type // empty' 2>/dev/null)

  case "$type" in
    "assistant")
      # Extract text content from assistant messages
      text=$(echo "$line" | jq -r '.message.content[]? | select(.type == "text") | .text // empty' 2>/dev/null)
      if [ -n "$text" ]; then
        echo ""
        echo "💬 Claude:"
        echo "$text" | fold -s -w 100
        echo ""
      fi
      ;;
    "tool_use")
      tool=$(echo "$line" | jq -r '.tool // empty' 2>/dev/null)
      echo "🔧 Tool: $tool"
      ;;
    "tool_result")
      # Show abbreviated tool results
      echo "   ✓ Tool completed"
      ;;
    "system")
      msg=$(echo "$line" | jq -r '.message // empty' 2>/dev/null)
      echo "⚙️  System: $msg"
      ;;
    "error")
      error=$(echo "$line" | jq -r '.error // .message // empty' 2>/dev/null)
      echo "❌ Error: $error"
      ;;
    "result")
      echo ""
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "✅ Iteration complete"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      ;;
    *)
      # For unknown types, show type if present
      if [ -n "$type" ]; then
        echo "📋 Event: $type"
      fi
      ;;
  esac
done
