#!/bin/bash

# GitHub Secrets Setup Script for UAT Testing
# Repository: NB-PDP-Testing/PDP
#
# This script adds all required secrets for UAT testing to your GitHub repository.
# 
# Prerequisites:
# 1. GitHub CLI installed: brew install gh
# 2. Authenticated: gh auth login
#
# Usage: ./scripts/setup-github-secrets.sh

set -e

REPO="NB-PDP-Testing/PDP"

echo "🔐 Setting up GitHub Secrets for UAT Testing"
echo "Repository: $REPO"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Install with: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI."
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI authenticated"
echo ""

# Function to set a secret
set_secret() {
    local name=$1
    local value=$2
    echo "  Setting $name..."
    echo "$value" | gh secret set "$name" --repo "$REPO"
}

# ============================================
# STAGING/PREVIEW ENVIRONMENT SETTINGS
# ============================================
echo "📍 Environment Settings"

# Prompt for staging URL
read -p "Enter your staging/preview URL (e.g., https://pdp-staging.vercel.app): " STAGING_URL
if [ -n "$STAGING_URL" ]; then
    set_secret "PLAYWRIGHT_BASE_URL" "$STAGING_URL"
fi

# Prompt for Convex URL
read -p "Enter your Convex URL (e.g., https://xxx.convex.cloud): " CONVEX_URL
if [ -n "$CONVEX_URL" ]; then
    set_secret "NEXT_PUBLIC_CONVEX_URL" "$CONVEX_URL"
fi

echo ""

# ============================================
# TEST USER CREDENTIALS
# ============================================
echo "👤 Test User Credentials"
echo "(Press Enter to use default values from test-data.json)"
echo ""

# Owner credentials
read -p "TEST_OWNER_EMAIL [owner_pdp@outlook.com]: " OWNER_EMAIL
OWNER_EMAIL=${OWNER_EMAIL:-owner_pdp@outlook.com}
set_secret "TEST_OWNER_EMAIL" "$OWNER_EMAIL"

read -p "TEST_OWNER_PASSWORD [Password123!]: " OWNER_PASSWORD
OWNER_PASSWORD=${OWNER_PASSWORD:-Password123!}
set_secret "TEST_OWNER_PASSWORD" "$OWNER_PASSWORD"

# Admin credentials
read -p "TEST_ADMIN_EMAIL [adm1n_pdp@outlook.com]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-adm1n_pdp@outlook.com}
set_secret "TEST_ADMIN_EMAIL" "$ADMIN_EMAIL"

read -p "TEST_ADMIN_PASSWORD [Password123!]: " ADMIN_PASSWORD
ADMIN_PASSWORD=${ADMIN_PASSWORD:-Password123!}
set_secret "TEST_ADMIN_PASSWORD" "$ADMIN_PASSWORD"

# Coach credentials
read -p "TEST_COACH_EMAIL [coach_pdp@outlook.com]: " COACH_EMAIL
COACH_EMAIL=${COACH_EMAIL:-coach_pdp@outlook.com}
set_secret "TEST_COACH_EMAIL" "$COACH_EMAIL"

read -p "TEST_COACH_PASSWORD [Password123!]: " COACH_PASSWORD
COACH_PASSWORD=${COACH_PASSWORD:-Password123!}
set_secret "TEST_COACH_PASSWORD" "$COACH_PASSWORD"

# Parent credentials
read -p "TEST_PARENT_EMAIL [parent_pdp@outlook.com]: " PARENT_EMAIL
PARENT_EMAIL=${PARENT_EMAIL:-parent_pdp@outlook.com}
set_secret "TEST_PARENT_EMAIL" "$PARENT_EMAIL"

read -p "TEST_PARENT_PASSWORD [Password123!]: " PARENT_PASSWORD
PARENT_PASSWORD=${PARENT_PASSWORD:-Password123!}
set_secret "TEST_PARENT_PASSWORD" "$PARENT_PASSWORD"

echo ""
echo "✅ All secrets have been set!"
echo ""
echo "📋 Next Steps:"
echo "1. Edit .github/workflows/uat-tests.yml"
echo "2. Remove 'if: false' from the uat-tests job (around line 42)"
echo "3. Commit and push the changes"
echo "4. UAT tests will run on the next push to main/develop"
echo ""
echo "🧪 To manually trigger tests:"
echo "   Go to Actions → UAT Tests → Run workflow"
