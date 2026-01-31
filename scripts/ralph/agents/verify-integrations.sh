#!/bin/bash

# Verify all components are properly integrated after remediation

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Integration Verification Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PASS=0
FAIL=0

# Function to check if component is imported
check_component() {
  local component=$1
  local description=$2

  echo "Checking: $description"
  results=$(grep -r "import.*$component" apps/web/src 2>/dev/null)

  if [ -n "$results" ]; then
    echo "✅ PASS - $component is imported"
    echo "   Found in: $(echo "$results" | cut -d: -f1)"
    ((PASS++))
  else
    echo "❌ FAIL - $component NOT imported anywhere"
    ((FAIL++))
  fi
  echo ""
}

# Function to check if file exists
check_file() {
  local filepath=$1
  local description=$2

  echo "Checking: $description"

  if [ -f "$filepath" ]; then
    echo "✅ PASS - File exists: $filepath"
    ((PASS++))
  else
    echo "❌ FAIL - File missing: $filepath"
    ((FAIL++))
  fi
  echo ""
}

# Check all component integrations
echo "📦 Component Integration Checks"
echo "─────────────────────────────────────────────────────"
echo ""

check_component "ActivityFeedView" "Activity Feed Component"
check_component "CommentForm" "Comment Form with @Mentions"
check_component "InsightReactions" "Reaction Buttons Component"
check_component "NotificationCenter" "Notification Bell Component"
check_component "SmartActionBar" "AI Suggestions Component"

# Check page routing
echo "📄 Page Routing Checks"
echo "─────────────────────────────────────────────────────"
echo ""

check_file "apps/web/src/app/orgs/[orgId]/coach/settings/page.tsx" "Settings Page Route"

# Check for placeholder tests
echo "🧪 Test Quality Checks"
echo "─────────────────────────────────────────────────────"
echo ""

echo "Checking for placeholder tests..."
placeholder_count=$(grep -r "expect(true).toBe(true)" packages/backend/convex/__tests__/US-P9-*.test.ts 2>/dev/null | wc -l)

if [ "$placeholder_count" -eq 0 ]; then
  echo "✅ PASS - No placeholder tests found"
  ((PASS++))
else
  echo "❌ FAIL - Found $placeholder_count placeholder test(s)"
  grep -r "expect(true).toBe(true)" packages/backend/convex/__tests__/US-P9-*.test.ts
  ((FAIL++))
fi
echo ""

# Check for .filter() violations
echo "⚡ Performance Checks"
echo "─────────────────────────────────────────────────────"
echo ""

echo "Checking for undocumented .filter() usage..."
# This is a simplified check - actual verification requires code review
filter_count=$(grep -c "\.filter(" packages/backend/convex/models/teamCollaboration.ts 2>/dev/null || echo 0)
aifilter_count=$(grep -c "\.filter(" packages/backend/convex/models/aiCopilot.ts 2>/dev/null || echo 0)

echo "Found .filter() usage:"
echo "  - teamCollaboration.ts: $filter_count instances"
echo "  - aiCopilot.ts: $aifilter_count instances"
echo ""
echo "⚠️  Manual review required to verify these are documented/justified"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "🎉 All integration checks PASSED!"
  echo ""
  echo "Next steps:"
  echo "1. Run: npm run check-types"
  echo "2. Run: npm test"
  echo "3. Start dev server and visual verification"
  exit 0
else
  echo "⚠️  Integration INCOMPLETE - $FAIL check(s) failed"
  echo ""
  echo "Components not integrated will NOT be accessible to users."
  echo "Review remediation stories 001-006 and ensure all components are imported."
  exit 1
fi
