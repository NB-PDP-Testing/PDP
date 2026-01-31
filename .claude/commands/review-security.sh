#!/bin/bash
# Security Review Command
# Provides instructions for running deep security analysis

cd "$(dirname "$0")/../.."

COMMIT_RANGE="${1:-HEAD~5..HEAD}"

cat << EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 DEEP SECURITY REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyzing commits: $COMMIT_RANGE

Changed files:
EOF

git diff --name-only $COMMIT_RANGE 2>/dev/null | head -20

cat << EOF

Ask Claude to review these changes for security vulnerabilities.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
