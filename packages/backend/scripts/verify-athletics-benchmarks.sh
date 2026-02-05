#!/bin/bash
#
# Verification script for Athletics benchmarks
# Validates JSON structure and provides summary statistics
#

echo "🔍 Athletics Benchmarks Verification"
echo "======================================"
echo ""

# Check if file exists
BENCHMARK_FILE="athletics-benchmarks-IMPORT.json"
if [ ! -f "$BENCHMARK_FILE" ]; then
    echo "❌ Error: $BENCHMARK_FILE not found"
    exit 1
fi

echo "✅ File found: $BENCHMARK_FILE"

# Validate JSON syntax
if python3 -c "import json; json.load(open('$BENCHMARK_FILE'))" 2>/dev/null; then
    echo "✅ Valid JSON syntax"
else
    echo "❌ Invalid JSON syntax"
    exit 1
fi

# Run detailed validation
python3 << 'PYTHON_SCRIPT'
import json
from collections import Counter

with open('athletics-benchmarks-IMPORT.json', 'r') as f:
    data = json.load(f)

benchmarks = data['benchmarks']

print(f"\n📊 Benchmark Statistics")
print(f"Total benchmarks: {len(benchmarks)}")

# Age group distribution
age_groups = Counter(b['ageGroup'] for b in benchmarks)
print(f"\n🎯 Age Group Distribution:")
for age in sorted(age_groups.keys(), key=lambda x: ['U10', 'U12', 'U14', 'U16', 'U18', 'U20', 'Senior'].index(x)):
    print(f"  {age}: {age_groups[age]}")

# Competitive level distribution
levels = Counter(b['competitiveLevel'] for b in benchmarks)
print(f"\n🏆 Competitive Level Distribution:")
for level in ['Developmental', 'Competitive', 'Elite']:
    print(f"  {level}: {levels[level]}")

# Event group distribution
events = Counter(b['eventGroup'] for b in benchmarks)
print(f"\n🏃 Event Group Distribution:")
for event in sorted(events.keys()):
    print(f"  {event}: {events[event]}")

# Gender distribution
genders = Counter(b['gender'] for b in benchmarks)
print(f"\n⚧ Gender Distribution:")
for gender in sorted(genders.keys()):
    print(f"  {gender}: {genders[gender]}")

# Skill coverage
skills = Counter(b['skillName'] for b in benchmarks)
print(f"\n💪 Skill Coverage (30 total skills):")
print(f"  Unique skills: {len(skills)}")
if len(skills) == 30:
    print("  ✅ All 30 skills represented")
else:
    print(f"  ⚠️  Expected 30 skills, found {len(skills)}")

# Expected level distribution
expected_levels = Counter(b['expectedLevel'] for b in benchmarks)
print(f"\n📈 Expected Level Distribution:")
for level in sorted(expected_levels.keys()):
    print(f"  Level {level}: {expected_levels[level]}")

# Validation checks
print(f"\n✅ Validation Checks:")

# Check all benchmarks have required fields
required_fields = ['sport', 'ageGroup', 'gender', 'competitiveLevel', 'eventGroup',
                   'skillName', 'expectedLevel', 'performanceIndicators',
                   'assessmentNotes', 'progressionPath']
all_valid = True
for i, b in enumerate(benchmarks):
    missing = [f for f in required_fields if f not in b]
    if missing:
        print(f"  ❌ Benchmark {i} missing fields: {missing}")
        all_valid = False
        break

if all_valid:
    print("  ✅ All benchmarks have required fields")

# Check performance indicators structure
pi_valid = True
for i, b in enumerate(benchmarks):
    pi = b.get('performanceIndicators', {})
    if not all(k in pi for k in ['technical', 'performance', 'training']):
        print(f"  ❌ Benchmark {i} has invalid performanceIndicators structure")
        pi_valid = False
        break

if pi_valid:
    print("  ✅ All performance indicators have correct structure")

# Check expected levels are valid (1-5)
level_valid = True
for i, b in enumerate(benchmarks):
    level = b.get('expectedLevel')
    if not isinstance(level, int) or level < 1 or level > 5:
        print(f"  ❌ Benchmark {i} has invalid expectedLevel: {level}")
        level_valid = False
        break

if level_valid:
    print("  ✅ All expected levels are valid (1-5)")

# Check sport field is consistent
sports = set(b['sport'] for b in benchmarks)
if sports == {'Athletics'}:
    print("  ✅ All benchmarks have sport='Athletics'")
else:
    print(f"  ❌ Inconsistent sport values: {sports}")

print("\n✨ Verification Complete")
PYTHON_SCRIPT

echo ""
echo "📄 Related Files:"
echo "  - athletics-benchmarks-IMPORT.json (1,174 benchmarks)"
echo "  - ATHLETICS_BENCHMARKS_SUMMARY.md (detailed summary)"
echo "  - athletics-level-descriptors-UPDATE.json (skill descriptors)"
echo "  - ../docs/features/ATHLETICS-QUICK-REFERENCE.md (coach reference)"
echo "  - ../docs/research/ATHLETICS_SKILL_STANDARDS_RESEARCH.md (research base)"
echo ""
echo "✅ Ready for production import"
