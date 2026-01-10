#!/bin/bash
# Reset UX Agent Workflow
# Run this to start fresh

echo "🧹 Resetting UX Agent Workflow..."
echo ""

# Remove output files
rm -f UX_AUDIT_FINDINGS.md
rm -f UX_IMPLEMENTATION_LOG.md
rm -f CODE_QUALITY_REPORT.md
rm -f UX_VERIFICATION_REPORT.md
rm -f UX_QA_REPORT.md
rm -f .ux-workflow-state.json

echo "✓ Removed output files:"
echo "  - UX_AUDIT_FINDINGS.md"
echo "  - UX_IMPLEMENTATION_LOG.md"
echo "  - CODE_QUALITY_REPORT.md"
echo "  - UX_VERIFICATION_REPORT.md"
echo "  - UX_QA_REPORT.md"
echo "  - .ux-workflow-state.json"
echo ""

# Kill any tmux sessions
tmux kill-session -t ux-agents 2>/dev/null && echo "✓ Killed tmux session" || echo "○ No tmux session running"

echo ""
echo "✅ Ready for fresh start!"
echo ""
echo "Run: python3 scripts/ux-orchestrator.py"
