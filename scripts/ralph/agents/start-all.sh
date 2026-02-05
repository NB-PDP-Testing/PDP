#!/bin/bash
# Start all monitoring agents in the background

set -e
cd "$(dirname "$0")"

OUTPUT_DIR="output"
mkdir -p "$OUTPUT_DIR"

echo "🚀 Starting Ralph Monitoring Agents..."

# Kill any existing agents first
./stop-all.sh 2>/dev/null || true

# Start Quality Monitor (type checks, lint, auto-fix)
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

# Start Documenter Agent
sleep 2
echo "Starting Documenter..."
nohup ./documenter.sh > /dev/null 2>&1 &
echo $! > "$OUTPUT_DIR/documenter.pid"
echo "  PID: $(cat $OUTPUT_DIR/documenter.pid)"

# Start Test Runner Agent (Playwright E2E + type checks + lint)
sleep 2
echo "Starting Test Runner (Playwright E2E + Unit tests)..."
nohup ./test-runner.sh > /dev/null 2>&1 &
echo $! > "$OUTPUT_DIR/test-runner.pid"
echo "  PID: $(cat $OUTPUT_DIR/test-runner.pid)"

# Start Security Tester Agent (grep checks + deep Claude review)
sleep 2
echo "Starting Security Tester..."
nohup ./security-tester.sh > /dev/null 2>&1 &
echo $! > "$OUTPUT_DIR/security-tester.pid"
echo "  PID: $(cat $OUTPUT_DIR/security-tester.pid)"

# Start Code Review Gate (pattern checks + deep review on commits)
sleep 2
echo "Starting Code Review Gate..."
nohup ./code-review-gate.sh > /dev/null 2>&1 &
echo $! > "$OUTPUT_DIR/code-review-gate.pid"
echo "  PID: $(cat $OUTPUT_DIR/code-review-gate.pid)"

echo ""
echo "✅ All 6 agents started!"
echo ""
echo "Agents:"
echo "  1. Quality Monitor    - Type checks, lint, auto-fix (60s)"
echo "  2. PRD Auditor        - Story verification via Claude (5min)"
echo "  3. Documenter         - Feature docs on completion (120s)"
echo "  4. Test Runner        - Playwright E2E + type checks (30s)"
echo "  5. Security Tester    - Grep + deep Claude review (120s)"
echo "  6. Code Review Gate   - Pattern + deep review on commits (45s)"
echo ""
echo "Monitor outputs with:"
echo "  tail -f scripts/ralph/agents/output/*.log"
echo ""
echo "Live dashboard:"
echo "  ./scripts/ralph/agents/watch-dashboard.sh"
echo ""
echo "Stop agents with:"
echo "  ./scripts/ralph/agents/stop-all.sh"
