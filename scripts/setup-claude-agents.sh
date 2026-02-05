#!/bin/bash
# ============================================================
# Claude Code Agent Setup for PDP/PlayerARC
# ============================================================
# Run this script after cloning the PDP repo to set up all
# Claude Code agents, slash commands, hooks, and Ralph
# monitoring agents on your machine.
#
# Usage: ./scripts/setup-claude-agents.sh
# ============================================================

set -e
cd "$(dirname "$0")/.."
PROJECT_DIR=$(pwd)

echo ""
echo "============================================================"
echo "  Claude Code Agent Setup for PDP/PlayerARC"
echo "============================================================"
echo ""

# -----------------------------------------------
# Step 1: Verify Claude Code is installed
# -----------------------------------------------
echo "1. Checking prerequisites..."

if ! command -v claude &> /dev/null; then
  echo "   ERROR: Claude Code CLI not found."
  echo "   Install it: npm install -g @anthropic-ai/claude-code"
  exit 1
fi
echo "   Claude Code CLI: OK"

if ! command -v jq &> /dev/null; then
  echo "   WARNING: jq not found. Some hooks need jq."
  echo "   Install it: brew install jq (macOS) or apt install jq (Linux)"
else
  echo "   jq: OK"
fi

if ! command -v npx &> /dev/null; then
  echo "   ERROR: npx not found. Install Node.js 18+."
  exit 1
fi
echo "   npx: OK"

echo ""

# -----------------------------------------------
# Step 2: Make hook scripts executable
# -----------------------------------------------
echo "2. Making hook scripts executable..."
chmod +x .claude/hooks/*.sh 2>/dev/null || true
echo "   .claude/hooks/*.sh: OK"

# -----------------------------------------------
# Step 3: Make Ralph agent scripts executable
# -----------------------------------------------
echo "3. Making Ralph agent scripts executable..."
chmod +x scripts/ralph/agents/*.sh 2>/dev/null || true
echo "   scripts/ralph/agents/*.sh: OK"

# -----------------------------------------------
# Step 4: Create required directories
# -----------------------------------------------
echo "4. Creating required directories..."
mkdir -p scripts/ralph/agents/output
mkdir -p scripts/ralph/prds
echo "   scripts/ralph/agents/output/: OK"
echo "   scripts/ralph/prds/: OK"

# -----------------------------------------------
# Step 5: Install npm dependencies
# -----------------------------------------------
echo "5. Checking npm dependencies..."
if [ ! -d "node_modules" ]; then
  echo "   Running npm install..."
  npm install
else
  echo "   node_modules exists: OK"
fi

# -----------------------------------------------
# Step 6: Install Playwright (for E2E agent)
# -----------------------------------------------
echo "6. Checking Playwright..."
if npx -w apps/web playwright --version &>/dev/null; then
  echo "   Playwright installed: OK"
else
  echo "   Installing Playwright..."
  npx -w apps/web playwright install chromium
fi

# -----------------------------------------------
# Step 7: Verify Convex codegen
# -----------------------------------------------
echo "7. Verifying Convex codegen..."
if npx -w packages/backend convex codegen &>/dev/null; then
  echo "   Convex codegen: OK"
else
  echo "   WARNING: Convex codegen failed. Run manually: npx -w packages/backend convex codegen"
fi

# -----------------------------------------------
# Step 8: Verify installation
# -----------------------------------------------
echo ""
echo "8. Verifying installation..."
echo ""

AGENTS=$(ls -1 .claude/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
COMMANDS=$(ls -1 .claude/commands/*.md 2>/dev/null | wc -l | tr -d ' ')
HOOKS=$(ls -1 .claude/hooks/*.sh 2>/dev/null | wc -l | tr -d ' ')
RALPH_AGENTS=$(ls -1 scripts/ralph/agents/*.sh 2>/dev/null | wc -l | tr -d ' ')

echo "   Agent definitions:   $AGENTS files in .claude/agents/"
echo "   Slash commands:      $COMMANDS files in .claude/commands/"
echo "   Hook scripts:        $HOOKS files in .claude/hooks/"
echo "   Ralph bash agents:   $RALPH_AGENTS files in scripts/ralph/agents/"
echo ""

# -----------------------------------------------
# Summary
# -----------------------------------------------
echo "============================================================"
echo "  SETUP COMPLETE"
echo "============================================================"
echo ""
echo "  Everything is in the repo already (.claude/ directory)."
echo "  Claude Code will pick up agents and commands automatically."
echo ""
echo "  SLASH COMMANDS (type in Claude Code):"
echo "    /architect-review  - Pre-phase architectural review"
echo "    /check-prd         - Show PRD status and stories"
echo "    /review-security   - Security review of changes"
echo "    /document-phase    - Generate phase documentation"
echo "    /build-fix         - Fix TypeScript/build errors"
echo "    /code-review       - Code quality review"
echo "    /refactor-clean    - Dead code analysis"
echo "    /e2e               - Run/generate Playwright tests"
echo ""
echo "  RALPH MONITORING (optional, run in separate terminal):"
echo "    ./scripts/ralph/agents/start-all.sh   - Start 6 agents"
echo "    ./scripts/ralph/agents/stop-all.sh    - Stop all agents"
echo "    ./scripts/ralph/agents/watch-dashboard.sh - Live dashboard"
echo ""
echo "  HOOKS (automatic, configured in .claude/settings.json):"
echo "    - Auto-format with ultracite on file save"
echo "    - Lint check with biome on file save"
echo "    - Quality check on backend file edits"
echo "    - Security review on git commits"
echo "    - Destructive command blocker"
echo "    - Markdown file creation warning"
echo "    - Console.log detection on stop"
echo "    - Session start/end status display"
echo ""
echo "  See docs/CLAUDE-AGENTS-GUIDE.md for full documentation."
echo ""
