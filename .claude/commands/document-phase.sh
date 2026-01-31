#!/bin/bash
# Document Phase Command
# Invokes the documenter-ai agent to generate comprehensive phase documentation
#
# Usage: /document-phase [feature-slug]
# Example: /document-phase phase-9-week-2

set -e

FEATURE_SLUG="${1:-}"
PRD_FILE="scripts/ralph/prd.json"

# Auto-detect feature slug if not provided
if [ -z "$FEATURE_SLUG" ]; then
    if [ -f "$PRD_FILE" ]; then
        BRANCH_NAME=$(jq -r '.branchName // ""' "$PRD_FILE" 2>/dev/null)
        FEATURE_SLUG=$(echo "$BRANCH_NAME" | sed 's|ralph/||')
    fi
fi

if [ -z "$FEATURE_SLUG" ]; then
    echo "❌ Error: Could not determine feature slug"
    echo ""
    echo "Usage: /document-phase <feature-slug>"
    echo "Example: /document-phase phase-9-week-2"
    echo ""
    echo "Or create/update scripts/ralph/prd.json with branchName field"
    exit 1
fi

# Prepare context for the agent
CONTEXT="Generate comprehensive documentation for phase: $FEATURE_SLUG

Please invoke the documenter-ai agent to:
1. Analyze completed stories in scripts/ralph/prd.json
2. Review implementation details in scripts/ralph/progress.txt
3. Extract key features, architecture decisions, and learnings
4. Generate professional documentation in docs/features/${FEATURE_SLUG}.md

Phase slug: $FEATURE_SLUG
PRD file: scripts/ralph/prd.json
Progress file: scripts/ralph/progress.txt
Output: docs/features/${FEATURE_SLUG}.md
"

echo "📝 Invoking documenter-ai agent for: $FEATURE_SLUG"
echo ""
echo "$CONTEXT"
