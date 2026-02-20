#!/bin/bash
#
# Quick Action: Test Fuzzy Player Matching
# Tests Levenshtein algorithm with Irish names
#

set -e

echo "🔍 Testing Fuzzy Player Matching"
echo "================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

test_similarity() {
  local name1="$1"
  local name2="$2"
  local min_score="$3"

  echo -n "Testing: '$name1' vs '$name2' ... "

  # Calculate similarity
  similarity=$(node -e "
    const {levenshteinSimilarity} = require('../packages/backend/convex/lib/stringMatching');
    console.log(levenshteinSimilarity('$name1', '$name2').toFixed(2));
  ")

  if (( $(echo "$similarity >= $min_score" | bc -l) )); then
    echo -e "${GREEN}PASS${NC} (similarity: $similarity)"
    ((PASS++))
  else
    echo -e "${RED}FAIL${NC} (similarity: $similarity, expected >= $min_score)"
    ((FAIL++))
  fi
}

echo "🇮🇪 Irish Names"
echo "-------------"

test_similarity "Seán" "Shawn" "0.75"
test_similarity "Niamh" "Neeve" "0.50"
test_similarity "O'Brien" "O'Bryan" "0.85"
test_similarity "Pádraig" "Paddy" "0.50"
test_similarity "Aoife" "Efa" "0.50"
test_similarity "Ciarán" "Kieran" "0.75"

echo ""
echo "👥 Common Typos"
echo "---------------"

test_similarity "John" "Jon" "0.80"
test_similarity "Michael" "Micheal" "0.85"
test_similarity "Patrick" "Patric" "0.90"
test_similarity "Catherine" "Katherine" "0.70"

echo ""
echo "🔤 Normalization Tests"
echo "---------------------"

echo -n "Testing: Diacritic removal ... "
normalized=$(node -e "
  const {normalizeForMatching} = require('../packages/backend/convex/lib/stringMatching');
  console.log(normalizeForMatching('Seán O\\'Brien'));
")

if [ "$normalized" = "sean obrien" ]; then
  echo -e "${GREEN}PASS${NC} ($normalized)"
  ((PASS++))
else
  echo -e "${RED}FAIL${NC} ($normalized)"
  ((FAIL++))
fi

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
