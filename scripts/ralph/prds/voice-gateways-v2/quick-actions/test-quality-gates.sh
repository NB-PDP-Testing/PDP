#!/bin/bash
#
# Quick Action: Test Quality Gates
# Tests all validation functions with sample inputs
#

set -e

echo "🧪 Testing Voice Notes Quality Gates"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASS=0
FAIL=0

test_case() {
  local name="$1"
  local command="$2"
  local expected="$3"

  echo -n "Testing: $name ... "

  if eval "$command" | grep -q "$expected"; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}FAIL${NC}"
    ((FAIL++))
  fi
}

echo "📝 Text Message Validation"
echo "--------------------------"

# Test empty message
test_case "Empty message rejected" \
  "echo '' | node -e 'const {validateTextMessage} = require(\"../packages/backend/convex/lib/messageValidation\"); const input = \"\"; console.log(JSON.stringify(validateTextMessage(input)))'" \
  "\"isValid\":false"

# Test too short
test_case "Short message rejected" \
  "echo 'hi' | node -e 'const {validateTextMessage} = require(\"../packages/backend/convex/lib/messageValidation\"); console.log(JSON.stringify(validateTextMessage(\"hi\")))'" \
  "\"isValid\":false"

# Test gibberish
test_case "Gibberish rejected" \
  "echo 'asdfjkl;' | node -e 'const {validateTextMessage} = require(\"../packages/backend/convex/lib/messageValidation\"); console.log(JSON.stringify(validateTextMessage(\"asdfjkl;\")))'" \
  "\"isValid\":false"

# Test valid message
test_case "Valid message accepted" \
  "echo 'John did well today' | node -e 'const {validateTextMessage} = require(\"../packages/backend/convex/lib/messageValidation\"); console.log(JSON.stringify(validateTextMessage(\"John did well today\")))'" \
  "\"isValid\":true"

echo ""
echo "🎤 Transcript Quality Validation"
echo "--------------------------------"

# Test empty transcript
test_case "Empty transcript rejected" \
  "node -e 'const {validateTranscriptQuality} = require(\"../packages/backend/convex/lib/messageValidation\"); console.log(JSON.stringify(validateTranscriptQuality(\"\")))'" \
  "\"isValid\":false"

# Test inaudible
test_case "Inaudible transcript rejected" \
  "node -e 'const {validateTranscriptQuality} = require(\"../packages/backend/convex/lib/messageValidation\"); console.log(JSON.stringify(validateTranscriptQuality(\"[inaudible] [music] [noise]\")))'" \
  "\"isValid\":false"

# Test valid with sports context
test_case "Sports transcript accepted" \
  "node -e 'const {validateTranscriptQuality} = require(\"../packages/backend/convex/lib/messageValidation\"); console.log(JSON.stringify(validateTranscriptQuality(\"John did well in training today\")))'" \
  "\"isValid\":true"

echo ""
echo "📊 Summary"
echo "----------"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi
