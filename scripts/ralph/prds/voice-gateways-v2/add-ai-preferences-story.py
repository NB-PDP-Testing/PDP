#!/usr/bin/env python3
"""
Add US-VN-006b (Coach AI Category Preferences) to PRD.json
Updates Phase 1 structure, checklist, and effort estimates
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

# Create US-VN-006b story
new_story = {
    "id": "US-VN-006b",
    "phase": 1,
    "stream": "B",
    "title": "Coach AI Category Preferences",
    "description": "Implement backend for coach AI category settings (auto-detect players, injury extraction, skill tracking) to enable selective insight processing and save 20-40% CPU/API costs.",
    "acceptanceCriteria": [
        "Backend: Create coachAIPreferences table in schema.ts",
        "Schema fields:",
        "  - coachId: v.string() (Better Auth user ID)",
        "  - organizationId: v.string()",
        "  - autoDetectPlayerNames: v.boolean() (default: true)",
        "  - extractInjuryMentions: v.boolean() (default: true)",
        "  - skillProgressTracking: v.boolean() (default: true)",
        "  - extractPerformanceNotes: v.optional(v.boolean()) (future)",
        "  - extractWellbeingNotes: v.optional(v.boolean()) (future)",
        "  - extractBehavioralNotes: v.optional(v.boolean()) (future)",
        "  - createdAt: v.number()",
        "  - updatedAt: v.number()",
        "Indexes:",
        "  - by_coachId: ['coachId']",
        "  - by_org: ['organizationId']",
        "Backend: Create models/coachAIPreferences.ts",
        "Function: getCoachAIPreferences (query)",
        "  args: { coachId: v.string(), organizationId: v.string() }",
        "  returns: v.object({ autoDetectPlayerNames, extractInjuryMentions, skillProgressTracking, ... })",
        "  Logic: Query by coachId, return defaults if not found (all true)",
        "Function: updateAIPreference (mutation)",
        "  args: { category: v.union('autoDetectPlayerNames', 'extractInjuryMentions', 'skillProgressTracking'), enabled: v.boolean() }",
        "  Logic: Upsert preference record for current coach",
        "Frontend: Update settings-tab.tsx (make switches functional)",
        "  Line 106-139: Remove disabled prop from all 3 switches",
        "  Add useQuery for getCoachAIPreferences",
        "  Add useMutation for updateAIPreference",
        "  Wire up checked prop to query data",
        "  Wire up onCheckedChange to mutation",
        "  Add toast notifications for successful updates",
        "Integration: Pass preferences to insight extraction",
        "  Update actions/whatsapp.ts processIncomingMessage:",
        "    - Fetch coach AI preferences via runQuery",
        "    - Pass preferences object to extractInsights function",
        "  Update extractInsights to respect category flags:",
        "    - if (!prefs.autoDetectPlayerNames) skip player name extraction",
        "    - if (!prefs.extractInjuryMentions) skip injury insights",
        "    - if (!prefs.skillProgressTracking) skip skill insights",
        "  Log skipped categories for cost analysis",
        "Unit tests: Create __tests__/coachAIPreferences.test.ts",
        "Test cases:",
        "  - getCoachAIPreferences returns defaults if no record",
        "  - updateAIPreference creates new record if not exists",
        "  - updateAIPreference updates existing record",
        "  - Insight extraction skips disabled categories",
        "  - All categories disabled -> empty insights array (transcript still saved)",
        "  - Category re-enabled -> insights extracted again",
        "Type check passes: npm run check-types",
        "Manual test: Toggle category in UI -> voice note respects setting",
        "Cost analysis: Log rejection stats for disabled categories"
    ],
    "priority": 6.5,
    "passes": True,
    "effort": "1.5 days",
    "effortBreakdown": {
        "schema": "1h (table + indexes)",
        "backend": "3h (query + mutation + defaults)",
        "frontend": "2h (hook up switches, remove disabled)",
        "integration": "4h (pass to extraction, filter logic)",
        "tests": "2h (unit tests)",
        "manual": "1h (end-to-end test + cost logging)"
    },
    "dependencies": ["US-VN-006"],
    "files": {
        "create": [
            "packages/backend/convex/models/coachAIPreferences.ts",
            "packages/backend/convex/__tests__/coachAIPreferences.test.ts"
        ],
        "modify": [
            "packages/backend/convex/schema.ts (add coachAIPreferences table)",
            "apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx (make switches functional)",
            "packages/backend/convex/actions/whatsapp.ts (fetch prefs, pass to extraction)"
        ]
    },
    "testingRequirements": {
        "unitTests": True,
        "integrationTests": False,
        "manualTesting": True,
        "uatTestCases": ["AI-001", "AI-002", "AI-003"]
    }
}

# Insert after US-VN-006 (index 5, so insert at 6)
us_vn_006_index = next(i for i, s in enumerate(prd['userStories']) if s['id'] == 'US-VN-006')
prd['userStories'].insert(us_vn_006_index + 1, new_story)
print(f"✅ Inserted US-VN-006b after US-VN-006 (index {us_vn_006_index + 1})")

# Update Phase 1 structure
prd['phaseStructure']['phases'][0]['stories'].append('US-VN-006b')
prd['phaseStructure']['phases'][0]['duration'] = '4 days (was 2.5 days)'
print("✅ Updated Phase 1 structure: added US-VN-006b, updated duration")

# Update Phase 1 checklist
new_checklist_items = [
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

# Find where to insert (after US-VN-006 tasks)
insert_index = next(i for i, item in enumerate(prd['phase1Checklist']) if 'US-VN-006: Manual testing' in item) + 1
for item in reversed(new_checklist_items):
    prd['phase1Checklist'].insert(insert_index, item)
print(f"✅ Added {len(new_checklist_items)} checklist items after US-VN-006 tasks")

# Update effort summary
prd['effortSummary']['phase1']['streamB']['US-VN-006b'] = "1.5 days"
prd['effortSummary']['phase1']['streamB']['subtotal'] = "3.5 days (was 2 days)"
prd['effortSummary']['phase1']['parallelTotal'] = "3.5 days (streams run concurrently, was 2 days)"
prd['effortSummary']['phase1']['total'] = "4 days (was 2.5 days)"
prd['effortSummary']['breakdown']['phase1'] = "4 days (quality gates + fuzzy matching + AI prefs)"
prd['effortSummary']['totalProject'] = "26.5-31.5 days (6 phases, was 25-30 days)"
print("✅ Updated effort summaries")

# Update success criteria
cost_savings_criterion = "Cost savings: 20-40% for coaches who disable categories (estimated $60-80/month with 100 coaches)"
prd['successCriteria']['phase1Complete']['criteria'].append(cost_savings_criterion)
prd['successCriteria']['phase1Complete']['criteria'].append("Coach AI category preferences functional (3 toggles working)")
prd['successCriteria']['phase1Complete']['criteria'].append("Insight extraction respects disabled categories")
print("✅ Added cost savings to success criteria")

# Update US-VN-015 (Claims Extraction) - add category filtering
us_vn_015 = next(s for s in prd['userStories'] if s['id'] == 'US-VN-015')
us_vn_015['acceptanceCriteria'].extend([
    "Integration: Get coach AI preferences before extraction",
    "Filter GPT-4 prompt to only include enabled categories",
    "Example: If extractInjuryMentions disabled, don't ask GPT-4 about injuries",
    "Skip extraction for disabled categories (save API tokens 30-50%)",
    "Log category filtering stats for cost analysis"
])
us_vn_015['dependencies'].append('US-VN-006b')
print("✅ Updated US-VN-015 with category filtering")

# Update US-VN-017 (Entity Resolution) - add skip logic
us_vn_017 = next(s for s in prd['userStories'] if s['id'] == 'US-VN-017')
us_vn_017['acceptanceCriteria'].extend([
    "Integration: Skip entity resolution if autoDetectPlayerNames disabled",
    "Return empty candidates array for disabled categories",
    "Log skipped resolutions for performance tracking"
])
us_vn_017['dependencies'].append('US-VN-006b')
print("✅ Updated US-VN-017 with skip logic for disabled categories")

# Save updated PRD
try:
    with open(prd_path, 'w') as f:
        json.dump(prd, f, indent=2)
    print(f"\n✅ Successfully updated PRD.json")
    print(f"   Total stories: {len(prd['userStories'])}")
    print(f"   Phase 1 stories: {len([s for s in prd['userStories'] if s['phase'] == 1])}")
    print(f"   Phase 1 duration: {prd['phaseStructure']['phases'][0]['duration']}")
    print(f"   Total project duration: {prd['effortSummary']['totalProject']}")

    # Validate JSON
    with open(prd_path) as f:
        json.load(f)
    print("✅ Validated: PRD.json is valid JSON")

except Exception as e:
    print(f"❌ Error saving PRD.json: {e}")
    sys.exit(1)

print("\n🎉 US-VN-006b successfully integrated into Phase 1!")
print("\nNext steps:")
print("1. Review updated PRD.json (now 22 stories)")
print("2. Update PHASE1_QUALITY_GATES.md with US-VN-006b implementation guide")
print("3. Ralph can start Phase 1 execution with full AI preferences support")
