#!/bin/bash
# Preflight Check Script for Ralph
# Run this BEFORE starting Ralph to ensure branch is ready
# Fixes the issue where Ralph doesn't create/switch branches

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Ralph Preflight Check${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if PRD file exists
if [ ! -f "$PRD_FILE" ]; then
  echo -e "${RED}❌ ERROR: PRD file not found at $PRD_FILE${NC}"
  exit 1
fi

# Extract branch name from PRD
BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null)

if [ -z "$BRANCH" ]; then
  echo -e "${RED}❌ ERROR: No branchName found in PRD${NC}"
  echo -e "${YELLOW}PRD file: $PRD_FILE${NC}"
  exit 1
fi

echo -e "${GREEN}✅ PRD found: $PRD_FILE${NC}"
echo -e "${BLUE}📋 Target branch: $BRANCH${NC}"
echo ""

# Get current git branch
CURRENT=$(git branch --show-current)

if [ "$CURRENT" = "$BRANCH" ]; then
  echo -e "${GREEN}✅ Already on target branch: $BRANCH${NC}"
  echo ""
  echo -e "${GREEN}======================================${NC}"
  echo -e "${GREEN}Preflight check PASSED${NC}"
  echo -e "${GREEN}Ready to run Ralph!${NC}"
  echo -e "${GREEN}======================================${NC}"
  exit 0
fi

echo -e "${YELLOW}Current branch: $CURRENT${NC}"
echo -e "${YELLOW}Need to switch to: $BRANCH${NC}"
echo ""

# Check if target branch exists
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo -e "${BLUE}📌 Branch exists, switching...${NC}"
  git checkout "$BRANCH"
  echo -e "${GREEN}✅ Switched to existing branch: $BRANCH${NC}"
else
  echo -e "${BLUE}🌿 Branch doesn't exist, creating...${NC}"
  git checkout -b "$BRANCH"
  echo -e "${GREEN}✅ Created and switched to new branch: $BRANCH${NC}"
fi

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Preflight check PASSED${NC}"
echo -e "${GREEN}Ready to run Ralph!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Start monitoring agents: ${YELLOW}./scripts/ralph/agents/start-all.sh${NC}"
echo -e "  2. Start Ralph (20 iterations): ${YELLOW}./scripts/ralph/ralph.sh 20${NC}"
echo ""

exit 0
