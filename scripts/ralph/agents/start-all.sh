#!/bin/bash
# Start all monitoring agents in the background

set -e
cd "$(dirname "$0")"

OUTPUT_DIR="output"
mkdir -p "$OUTPUT_DIR"

echo "🚀 Starting Ralph Monitoring Agents..."

# Kill any existing agents first
./stop-all.sh 2>/dev/null || true

# Start Quality Monitor
echo "Starting Quality Monitor..."
nohup ./quality-monitor.sh > /dev/null 2>&1 &
echo $! > "$OUTPUT_DIR/quality-monitor.pid"
echo "  PID: $(cat $OUTPUT_DIR/quality-monitor.pid)"

# Start PRD Auditor (with slight delay)
sleep 2
echo "Starting PRD Auditor..."
nohup ./prd-auditor.sh > /dev/null 2>&1 &
echo $! > "$OUTPUT_DIR/prd-auditor.pid"
echo "  PID: $(cat $OUTPUT_DIR/prd-auditor.pid)"

# Start Documenter Agent (with slight delay)
sleep 2
echo "Starting Documenter..."
nohup ./documenter.sh > /dev/null 2>&1 &
echo $! > "$OUTPUT_DIR/documenter.pid"
echo "  PID: $(cat $OUTPUT_DIR/documenter.pid)"

# Start Test Runner Agent (replaces uat-tester, runs tests in real-time)
sleep 2
echo "Starting Test Runner (UAT + Unit tests)..."
nohup ./test-runner.sh > /dev/null 2>&1 &
echo $! > "$OUTPUT_DIR/test-runner.pid"
echo "  PID: $(cat $OUTPUT_DIR/test-runner.pid)"

# Start Security Tester Agent
sleep 2
echo "Starting Security Tester..."
nohup ./security-tester.sh > /dev/null 2>&1 &
echo $! > "$OUTPUT_DIR/security-tester.pid"
echo "  PID: $(cat $OUTPUT_DIR/security-tester.pid)"

echo ""
echo "✅ All 5 agents started!"
echo ""
echo "Monitor outputs with:"
echo "  tail -f scripts/ralph/agents/output/*.log"
echo ""
echo "Stop agents with:"
echo "  ./scripts/ralph/agents/stop-all.sh"
