#!/bin/bash
# Stop all monitoring agents

cd "$(dirname "$0")"
OUTPUT_DIR="output"

echo "🛑 Stopping Ralph Monitoring Agents..."

for pidfile in "$OUTPUT_DIR"/*.pid; do
    if [ -f "$pidfile" ]; then
        pid=$(cat "$pidfile")
        name=$(basename "$pidfile" .pid)
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            echo "  Stopped $name (PID: $pid)"
        else
            echo "  $name not running"
        fi
        rm -f "$pidfile"
    fi
done

echo "✅ All 5 agents stopped"
