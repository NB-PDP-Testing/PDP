# Voice Gateways v2 PRD - Required Fixes

**Status**: Ready for corrections
**Date**: February 5, 2026

---

## 🚨 1. DELETE US-VN-006b

**File**: `scripts/ralph/prds/voice-gateways-v2/PRD.json`

### Remove from userStories array (lines 505-592)
Delete entire story object:
```json
{
  "id": "US-VN-006b",
  "phase": 1,
  "stream": "B",
  "title": "Coach AI Category Preferences",
  ...
}
```

### Remove from phase1Checklist (lines 1686-1695)
Delete these lines:
```json
"☐ US-VN-006b: Create coachAIPreferences table in schema",
"☐ US-VN-006b: Create models/coachAIPreferences.ts",
"☐ US-VN-006b: Implement getCoachAIPreferences query with defaults",
"☐ US-VN-006b: Implement updateAIPreference mutation",
"☐ US-VN-006b: Update settings-tab.tsx (remove disabled props)",
"☐ US-VN-006b: Hook up switches to backend (useQuery + useMutation)",
"☐ US-VN-006b: Pass AI prefs to insight extraction in whatsapp.ts",
"☐ US-VN-006b: Update extractInsights to filter by enabled categories",
"☐ US-VN-006b: Write unit tests (__tests__/coachAIPreferences.test.ts)",
"☐ US-VN-006b: Manual testing (toggle categories, verify filtering)",
```

### Update phase structure (line 39)
Remove `"US-VN-006b"` from phase 1 stories array

### Update phaseStructure.phase1ParallelStreams (line 24)
Current:
```json
"Stream B: Fuzzy Matching (US-VN-005 to US-VN-006)"
```
Change to:
```json
"Stream B: Fuzzy Matching (US-VN-005 to US-VN-006)"
```
(No change needed - already correct)

---

## 🚨 2. UPDATE US-VN-015 (Claims Extraction)

**File**: `scripts/ralph/prds/voice-gateways-v2/PRD.json`
**Line**: ~1200

### Remove US-VN-006b from dependencies
Current:
```json
"dependencies": ["US-VN-014", "US-VN-006b"],
```
Change to:
```json
"dependencies": ["US-VN-014"],
```

### Remove integration section from acceptanceCriteria (lines 1182-1186)
Delete:
```json
"Integration: Get coach AI preferences before extraction",
"Filter GPT-4 prompt to only include enabled categories",
"Example: If extractInjuryMentions disabled, don't ask GPT-4 about injuries",
"Skip extraction for disabled categories (save API tokens 30-50%)",
"Log category filtering stats for cost analysis"
```

---

## 🚨 3. UPDATE US-VN-017 (Entity Resolution)

**File**: `scripts/ralph/prds/voice-gateways-v2/PRD.json`
**Line**: ~1350

### Remove US-VN-006b from dependencies
Current:
```json
"dependencies": ["US-VN-016", "US-VN-006", "US-VN-006b"],
```
Change to:
```json
"dependencies": ["US-VN-016", "US-VN-006"],
```

### Remove integration section from acceptanceCriteria (lines 1335-1338)
Delete:
```json
"Integration: Skip entity resolution if autoDetectPlayerNames disabled",
"Return empty candidates array for disabled categories",
"Log skipped resolutions for performance tracking"
```

---

## ⚠️ 4. REVISE US-VN-004 (Enhanced Feedback)

**File**: `scripts/ralph/prds/voice-gateways-v2/PRD.json`
**Line**: ~351

### Update acceptance criteria line
Current:
```json
"Update checkAndAutoApply in actions/whatsapp.ts:",
"  - Call sendDetailedFeedback instead of generic messages",
```

Change to:
```json
"Update checkAndAutoApply in actions/whatsapp.ts:",
"  - Call sendDetailedFeedback for validation failures (adds to existing generic fallbacks)",
"  - Keep existing generic messages for edge cases and unknown errors",
```

### Add clarification at top of acceptanceCriteria
After line 330, add:
```json
"Note: Existing generic fallbacks in checkAndAutoApply remain for edge cases",
```

---

## 📊 5. UPDATE EFFORT ESTIMATES

**File**: `scripts/ralph/prds/voice-gateways-v2/PRD.json`

### Update Phase 1 effort (line 1789)
Current:
```json
"total": "4 days (was 2.5 days)"
```
Change to:
```json
"total": "2.5 days"
```

### Update totalProject (line 1791)
Current:
```json
"totalProject": "26.5-31.5 days (6 phases, was 25-30 days)",
```
Change to:
```json
"totalProject": "25-30 days (6 phases)",
```

### Update effortSummary.phase1 (lines 1774-1789)
Remove:
```json
"streamB": {
  "US-VN-005": "1 day",
  "US-VN-006": "1 day",
  "subtotal": "3.5 days (was 2 days)",
  "US-VN-006b": "1.5 days"
},
```
Change to:
```json
"streamB": {
  "US-VN-005": "1 day",
  "US-VN-006": "1 day",
  "subtotal": "2 days"
},
```

### Update breakdown (line 1793)
Current:
```json
"phase1": "4 days (quality gates + fuzzy matching + AI prefs)",
```
Change to:
```json
"phase1": "2.5 days (quality gates + fuzzy matching)",
```

---

## ✅ VALIDATION CHECKLIST

After making changes, verify:
- [ ] US-VN-006b completely removed from PRD.json
- [ ] US-VN-006b removed from phase1Checklist
- [ ] US-VN-006b removed from phase structure
- [ ] US-VN-015 dependencies updated (no US-VN-006b)
- [ ] US-VN-015 integration section removed
- [ ] US-VN-017 dependencies updated (no US-VN-006b)
- [ ] US-VN-017 integration section removed
- [ ] US-VN-004 wording clarified (extends, not replaces)
- [ ] Phase 1 effort: 2.5 days
- [ ] Total project effort: 25-30 days
- [ ] Run: `cat PRD.json | jq '.userStories | length'` → Should be 21 (not 22)

---

## 📝 COMMIT MESSAGE

After fixes:
```
docs: Correct Voice Gateways v2 PRD - remove duplicate US-VN-006b

- Delete US-VN-006b (Coach AI Category Preferences)
  - Feature already implemented as parent auto-apply preferences
  - Not in scope for this project
- Update US-VN-015 and US-VN-017 to remove US-VN-006b dependency
- Clarify US-VN-004 extends (not replaces) existing feedback
- Adjust effort: Phase 1 now 2.5 days, total 25-30 days

Ref: docs/archive/bug-fixes/VOICE_GATEWAYS_V2_PRD_VALIDATION.md
```

---

## 🚀 NEXT STEPS

1. Make the above changes to PRD.json
2. Validate JSON syntax: `cat PRD.json | jq .`
3. Verify story count: `cat PRD.json | jq '.userStories | length'` → 21
4. Commit changes
5. Ralph can start implementation with confidence

---

**Full validation report**: `docs/archive/bug-fixes/VOICE_GATEWAYS_V2_PRD_VALIDATION.md`
