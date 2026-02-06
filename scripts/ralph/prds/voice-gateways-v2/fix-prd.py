#!/usr/bin/env python3
"""
Fix Voice Gateways v2 PRD.json - Remove US-VN-006b and update dependencies
"""

import json
import sys
from pathlib import Path

prd_path = Path(__file__).parent / "PRD.json"

# Load current PRD
try:
    with open(prd_path) as f:
        prd = json.load(f)
    print(f"✅ Loaded PRD.json ({len(prd['userStories'])} stories)")
except Exception as e:
    print(f"❌ Error loading PRD.json: {e}")
    sys.exit(1)

# 1. Remove US-VN-006b from userStories
original_count = len(prd['userStories'])
prd['userStories'] = [s for s in prd['userStories'] if s['id'] != 'US-VN-006b']
new_count = len(prd['userStories'])
print(f"✅ Removed US-VN-006b from userStories ({original_count} → {new_count})")

# 2. Remove US-VN-006b from phase1Checklist
checklist_items = [
    "⬜ US-VN-006b: Create coachAIPreferences table in schema",
    "⬜ US-VN-006b: Create models/coachAIPreferences.ts",
    "⬜ US-VN-006b: Implement getCoachAIPreferences query with defaults",
    "⬜ US-VN-006b: Implement updateAIPreference mutation",
    "⬜ US-VN-006b: Update settings-tab.tsx (remove disabled props)",
    "⬜ US-VN-006b: Hook up switches to backend (useQuery + useMutation)",
    "⬜ US-VN-006b: Pass AI prefs to insight extraction in whatsapp.ts",
    "⬜ US-VN-006b: Update extractInsights to filter by enabled categories",
    "⬜ US-VN-006b: Write unit tests (__tests__/coachAIPreferences.test.ts)",
    "⬜ US-VN-006b: Manual testing (toggle categories, verify filtering)",
]

original_checklist = len(prd['phase1Checklist'])
prd['phase1Checklist'] = [c for c in prd['phase1Checklist'] if c not in checklist_items]
new_checklist = len(prd['phase1Checklist'])
print(f"✅ Removed {original_checklist - new_checklist} items from phase1Checklist")

# 3. Remove US-VN-006b from phase structure
prd['phaseStructure']['phases'][0]['stories'] = [
    s for s in prd['phaseStructure']['phases'][0]['stories'] if s != 'US-VN-006b'
]
print(f"✅ Removed US-VN-006b from phase structure")

# 4. Update US-VN-015 (Claims Extraction)
us_vn_015 = next(s for s in prd['userStories'] if s['id'] == 'US-VN-015')

# Remove US-VN-006b from dependencies
if 'US-VN-006b' in us_vn_015.get('dependencies', []):
    us_vn_015['dependencies'].remove('US-VN-006b')
    print(f"✅ Removed US-VN-006b from US-VN-015 dependencies")

# Remove integration section from acceptance criteria
integration_lines = [
    "Integration: Get coach AI preferences before extraction",
    "Filter GPT-4 prompt to only include enabled categories",
    "Example: If extractInjuryMentions disabled, don't ask GPT-4 about injuries",
    "Skip extraction for disabled categories (save API tokens 30-50%)",
    "Log category filtering stats for cost analysis"
]
original_ac = len(us_vn_015['acceptanceCriteria'])
us_vn_015['acceptanceCriteria'] = [
    ac for ac in us_vn_015['acceptanceCriteria'] if ac not in integration_lines
]
removed_ac = original_ac - len(us_vn_015['acceptanceCriteria'])
if removed_ac > 0:
    print(f"✅ Removed {removed_ac} integration criteria from US-VN-015")

# 5. Update US-VN-017 (Entity Resolution)
us_vn_017 = next(s for s in prd['userStories'] if s['id'] == 'US-VN-017')

# Remove US-VN-006b from dependencies
if 'US-VN-006b' in us_vn_017.get('dependencies', []):
    us_vn_017['dependencies'].remove('US-VN-006b')
    print(f"✅ Removed US-VN-006b from US-VN-017 dependencies")

# Remove integration section from acceptance criteria
skip_lines = [
    "Integration: Skip entity resolution if autoDetectPlayerNames disabled",
    "Return empty candidates array for disabled categories",
    "Log skipped resolutions for performance tracking"
]
original_ac = len(us_vn_017['acceptanceCriteria'])
us_vn_017['acceptanceCriteria'] = [
    ac for ac in us_vn_017['acceptanceCriteria'] if ac not in skip_lines
]
removed_ac = original_ac - len(us_vn_017['acceptanceCriteria'])
if removed_ac > 0:
    print(f"✅ Removed {removed_ac} integration criteria from US-VN-017")

# 6. Update US-VN-004 (Enhanced Feedback) - Add clarification
us_vn_004 = next(s for s in prd['userStories'] if s['id'] == 'US-VN-004')

# Add note at top of acceptance criteria if not already present
clarification = "Note: Extends existing generic fallbacks in checkAndAutoApply for edge cases"
if clarification not in us_vn_004['acceptanceCriteria']:
    us_vn_004['acceptanceCriteria'].insert(0, clarification)
    print(f"✅ Added clarification to US-VN-004")

# Update the checkAndAutoApply line
for i, ac in enumerate(us_vn_004['acceptanceCriteria']):
    if "Call sendDetailedFeedback instead of generic messages" in ac:
        us_vn_004['acceptanceCriteria'][i] = "  - Call sendDetailedFeedback for validation failures (adds to existing generic fallbacks)"
        print(f"✅ Updated US-VN-004 checkAndAutoApply wording")
        break

# 7. Update effort estimates
# Remove US-VN-006b from streamB
if 'US-VN-006b' in prd['effortSummary']['phase1']['streamB']:
    del prd['effortSummary']['phase1']['streamB']['US-VN-006b']
    print(f"✅ Removed US-VN-006b from streamB effort")

# Update streamB subtotal
prd['effortSummary']['phase1']['streamB']['subtotal'] = "2 days"

# Update phase1 totals
prd['effortSummary']['phase1']['parallelTotal'] = "2 days (streams run concurrently)"
prd['effortSummary']['phase1']['total'] = "2.5 days"

# Update breakdown
prd['effortSummary']['breakdown']['phase1'] = "2.5 days (quality gates + fuzzy matching)"

# Update total project
prd['effortSummary']['totalProject'] = "25-30 days (6 phases)"

print(f"✅ Updated all effort estimates")

# 8. Update success criteria - remove AI prefs references
phase1_criteria = prd['successCriteria']['phase1Complete']['criteria']
ai_pref_criteria = [
    "Cost savings: 20-40% for coaches who disable categories (estimated $60-80/month with 100 coaches)",
    "Coach AI category preferences functional (3 toggles working)",
    "Insight extraction respects disabled categories"
]
original_criteria = len(phase1_criteria)
prd['successCriteria']['phase1Complete']['criteria'] = [
    c for c in phase1_criteria if c not in ai_pref_criteria
]
removed_criteria = original_criteria - len(prd['successCriteria']['phase1Complete']['criteria'])
if removed_criteria > 0:
    print(f"✅ Removed {removed_criteria} AI preferences criteria from success criteria")

# 9. Update phase 1 duration in phaseStructure
prd['phaseStructure']['phases'][0]['duration'] = '2.5 days'
print(f"✅ Updated phase 1 duration to 2.5 days")

# Save updated PRD
try:
    with open(prd_path, 'w') as f:
        json.dump(prd, f, indent=2)
    print(f"\n✅ Successfully updated PRD.json")
    print(f"   Total stories: {len(prd['userStories'])} (was {original_count})")
    print(f"   Phase 1 duration: {prd['phaseStructure']['phases'][0]['duration']}")
    print(f"   Total project duration: {prd['effortSummary']['totalProject']}")

    # Validate JSON
    with open(prd_path) as f:
        json.load(f)
    print("✅ Validated: PRD.json is valid JSON")

except Exception as e:
    print(f"❌ Error saving PRD.json: {e}")
    sys.exit(1)

print("\n🎉 All fixes applied successfully!")
print("\nNext steps:")
print("1. Review updated PRD.json")
print("2. Verify story count: cat PRD.json | jq '.userStories | length'")
print("3. Ralph can start Phase 1 execution with confidence")
