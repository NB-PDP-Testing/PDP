#!/bin/bash

# setup-env.sh - Initialize .env.local files for PDP development
# Usage: bash scripts/setup-env.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 PDP Environment Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo "❌ Error: Could not find package.json. Are you in the project root?"
    exit 1
fi

# Function to check if file exists and ask to overwrite
check_and_create() {
    local file_path=$1
    local file_name=$(basename "$file_path")
    local dir_name=$(dirname "$file_path")

    if [ -f "$file_path" ]; then
        echo "⚠️  $file_name already exists in $dir_name"
        read -p "   Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "   ⏭️  Skipping $file_name"
            return 1
        fi
    fi
    return 0
}

# Get Convex deployment info
echo "🔧 Convex Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Convex is already configured in backend
EXISTING_CONVEX_URL=""
if [ -f "$PROJECT_ROOT/packages/backend/.env.local" ]; then
    EXISTING_CONVEX_URL=$(grep "^CONVEX_URL=" "$PROJECT_ROOT/packages/backend/.env.local" | cut -d'=' -f2)
fi

if [ -n "$EXISTING_CONVEX_URL" ]; then
    echo "Found existing Convex URL: $EXISTING_CONVEX_URL"
    read -p "Use this URL? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        EXISTING_CONVEX_URL=""
    fi
fi

if [ -z "$EXISTING_CONVEX_URL" ]; then
    echo "Enter your Convex deployment URL:"
    echo "(e.g., https://valuable-pig-963.convex.cloud)"
    read -p "CONVEX_URL: " CONVEX_URL

    if [ -z "$CONVEX_URL" ]; then
        echo "❌ Error: CONVEX_URL is required"
        exit 1
    fi

    # Extract deployment name from URL
    # https://valuable-pig-963.convex.cloud -> dev:valuable-pig-963
    DEPLOYMENT_NAME=$(echo "$CONVEX_URL" | sed -n 's|https://\([^.]*\)\.convex\.cloud|\1|p')
    if [ -n "$DEPLOYMENT_NAME" ]; then
        CONVEX_DEPLOYMENT="dev:$DEPLOYMENT_NAME"
    else
        read -p "Enter CONVEX_DEPLOYMENT (e.g., dev:valuable-pig-963): " CONVEX_DEPLOYMENT
    fi
else
    CONVEX_URL="$EXISTING_CONVEX_URL"
    EXISTING_DEPLOYMENT=$(grep "^CONVEX_DEPLOYMENT=" "$PROJECT_ROOT/packages/backend/.env.local" | cut -d'=' -f2)
    CONVEX_DEPLOYMENT="${EXISTING_DEPLOYMENT:-dev:your-deployment}"
fi

echo ""
echo "📍 Site URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "Enter SITE_URL (default: http://localhost:3000): " SITE_URL
SITE_URL="${SITE_URL:-http://localhost:3000}"

echo ""
echo "🔐 OAuth Configuration (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Configure Google and Microsoft OAuth for social sign-in."
echo "You can skip this and use email/password authentication only."
echo ""
read -p "Configure OAuth providers? (y/N): " -n 1 -r
echo

OAUTH_CONFIGURED=false
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📌 Where to find OAuth credentials:"
    echo "   • Convex Dashboard: https://dashboard.convex.dev/deployment/settings"
    echo "   • Google: https://console.cloud.google.com/apis/credentials"
    echo "   • Microsoft: https://portal.azure.com (Azure App Registrations)"
    echo ""

    # Google OAuth
    echo "Google OAuth Configuration:"
    read -p "GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
    read -p "GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET

    echo ""
    # Microsoft OAuth
    echo "Microsoft OAuth Configuration:"
    read -p "MICROSOFT_CLIENT_ID: " MICROSOFT_CLIENT_ID
    read -p "MICROSOFT_CLIENT_SECRET: " MICROSOFT_CLIENT_SECRET

    # Check if all OAuth credentials were provided
    if [ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ] && \
       [ -n "$MICROSOFT_CLIENT_ID" ] && [ -n "$MICROSOFT_CLIENT_SECRET" ]; then
        OAUTH_CONFIGURED=true
        echo ""
        echo "✅ OAuth credentials configured"
    else
        echo ""
        echo "⚠️  Some OAuth credentials missing - OAuth will be disabled"
        echo "   You can add them manually to packages/backend/.env.local later"
    fi
else
    echo "⏭️  Skipping OAuth configuration - email/password only"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Creating .env.local files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Create root .env.local
ROOT_ENV="$PROJECT_ROOT/.env.local"
if check_and_create "$ROOT_ENV"; then
    cat > "$ROOT_ENV" << EOF
# Deployment used by \`npx convex dev\`
CONVEX_DEPLOYMENT=$CONVEX_DEPLOYMENT # team: neil-b, project: pdp-modular

CONVEX_URL=$CONVEX_URL
NEXT_PUBLIC_CONVEX_URL=$CONVEX_URL
SITE_URL=$SITE_URL
EOF
    echo "✅ Created root .env.local"
fi

# 2. Create packages/backend/.env.local
BACKEND_ENV="$PROJECT_ROOT/packages/backend/.env.local"
if check_and_create "$BACKEND_ENV"; then
    cat > "$BACKEND_ENV" << EOF
# Deployment used by \`npx convex dev\`
CONVEX_DEPLOYMENT=$CONVEX_DEPLOYMENT # team: neil-b, project: pdp-modular

CONVEX_URL=$CONVEX_URL
EOF

    # Add OAuth credentials if configured
    if [ "$OAUTH_CONFIGURED" = true ]; then
        cat >> "$BACKEND_ENV" << EOF

# Google OAuth
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET

# Microsoft OAuth
MICROSOFT_CLIENT_ID=$MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET=$MICROSOFT_CLIENT_SECRET
EOF
    fi

    echo "✅ Created packages/backend/.env.local"
fi

# 3. Create apps/web/.env.local
WEB_ENV="$PROJECT_ROOT/apps/web/.env.local"
if check_and_create "$WEB_ENV"; then
    cat > "$WEB_ENV" << EOF
NEXT_PUBLIC_CONVEX_URL=$CONVEX_URL
NEXT_PUBLIC_CONVEX_SITE_URL=$SITE_URL
NEXT_PUBLIC_USE_REAL_AI=true

# PostHog Analytics (EU Region for GDPR Compliance)
# Sign up at https://eu.posthog.com to get your keys
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# Session Plan Configuration
# Cache duration in hours (default: 1)
# Example: 1 = 1 hour, 0.5 = 30 minutes, 0.05 = 3 minutes (testing)
NEXT_PUBLIC_SESSION_PLAN_CACHE_HOURS=1
EOF
    echo "✅ Created apps/web/.env.local"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Environment Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Created files:"
echo "   • .env.local (root)"
echo "   • packages/backend/.env.local"
echo "   • apps/web/.env.local"
echo ""
echo "🚀 Next steps:"
echo "   1. Run: npm install"
echo "   2. Run: npm run dev"
echo "   3. Open: $SITE_URL"
echo ""
echo "📝 Optional configuration:"
echo "   • Add PostHog keys to apps/web/.env.local"
echo "   • Configure OAuth providers (Google, Microsoft)"
echo "   • See docs/setup/ for detailed setup guides"
echo ""
