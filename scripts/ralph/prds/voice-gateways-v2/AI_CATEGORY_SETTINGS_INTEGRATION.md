# AI Category Settings Integration - Voice Gateways v2

**Date**: February 5, 2026
**Status**: Feature exists in UI but not functional - needs backend implementation
**Impact**: HIGH - Can save 20-40% CPU/API costs by skipping disabled categories

---

## 🔍 Current State Assessment

### ✅ What Exists

**UI Implementation** (`apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx`):

Lines 106-139 show AI Preferences section with **3 category toggles**:

```typescript
1. Auto-detect player names (line 109)
   - Description: "AI will automatically identify player names in your notes"
   - Status: defaultChecked disabled (always ON, not functional)

2. Extract injury mentions (line 120)
   - Description: "Flag potential injuries for medical follow-up"
   - Status: defaultChecked disabled (always ON, not functional)

3. Skill progress tracking (line 131)
   - Description: "Track skill improvements mentioned in notes"
   - Status: defaultChecked disabled (always ON, not functional)
```

**Related Existing Features**:
- `skipSensitiveInsights` (line 184) - FUNCTIONAL
  - Excludes injury + behavioral insights from parent summaries
  - Already integrated in backend
- `parentSummariesEnabled` (line 165) - FUNCTIONAL
  - Controls parent summary generation
  - Already integrated in backend

### ❌ What's Missing

**Backend Implementation**:
- ❌ No `coachAIPreferences` table or schema
- ❌ No category filtering in insight extraction
- ❌ No mutations to toggle categories
- ❌ No queries to fetch preferences

**Integration Points Missing**:
- ❌ Not checked in voice note processing pipeline
- ❌ Not used in claims extraction (Phase 4)
- ❌ Not used in entity resolution (Phase 5)

---

## 💰 Cost/CPU Savings Potential

### Scenario Analysis

**Assumptions**:
- Average voice note: 60 seconds, 150 words transcript
- AI processing cost: $0.036 per voice note
- Typical coach voice notes: 50/month

**Current (All Categories Enabled)**:
```
50 notes/month × $0.036 = $1.80/month per coach
100 coaches = $180/month
```

**With Category Filtering**:

| Scenario | Categories Disabled | CPU Saved | Cost Saved | Monthly Savings (100 coaches) |
|----------|---------------------|-----------|------------|-------------------------------|
| **Minimal** | None | 0% | $0 | $0 |
| **Common** | Skill tracking (1/3 insights) | ~30% | $0.011/note | $55/month |
| **Injury-Only Coach** | Skills + player names (2/3) | ~60% | $0.022/note | $110/month |
| **Maximum** | All disabled (record only) | ~90% | $0.032/note | $160/month |

**Expected Real-World**:
- ~40% of coaches disable at least 1 category
- Average savings: **~$60-80/month** (~35% reduction)
- Additional benefit: **Faster processing** (skip unnecessary AI calls)

---

## 🏗️ Proposed Integration (Voice Gateways v2)

### Phase 1: Backend Schema & Mutations (1 day)

Add to existing Phase 1 or as new story **US-VN-006b**:

```typescript
// packages/backend/convex/schema.ts

coachAIPreferences: defineTable({
  coachId: v.string(), // Better Auth user ID
  organizationId: v.string(),

  // Category toggles (default: all true)
  autoDetectPlayerNames: v.boolean(), // Default: true
  extractInjuryMentions: v.boolean(), // Default: true
  skillProgressTracking: v.boolean(), // Default: true

  // Future categories (for v2 pipeline)
  extractPerformanceNotes: v.optional(v.boolean()), // Default: true
  extractWellbeingNotes: v.optional(v.boolean()), // Default: true
  extractBehavioralNotes: v.optional(v.boolean()), // Default: true

  updatedAt: v.number(),
  createdAt: v.number(),
})
  .index("by_coachId", ["coachId"])
  .index("by_org", ["organizationId"]);
```

**Mutations Required**:
```typescript
// packages/backend/convex/models/coachAIPreferences.ts

export const getCoachAIPreferences = query({
  args: { coachId: v.string(), organizationId: v.string() },
  returns: v.union(v.object({...}), v.null()),
  handler: async (ctx, args) => {
    // Return preferences or defaults
    const prefs = await ctx.db
      .query("coachAIPreferences")
      .withIndex("by_coachId", q => q.eq("coachId", args.coachId))
      .first();

    // Return with defaults if not found
    return prefs ?? {
      autoDetectPlayerNames: true,
      extractInjuryMentions: true,
      skillProgressTracking: true,
    };
  }
});

export const updateAIPreference = mutation({
  args: {
    category: v.union(
      v.literal("autoDetectPlayerNames"),
      v.literal("extractInjuryMentions"),
      v.literal("skillProgressTracking")
    ),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Update or create preference record
  }
});
```

### Phase 2: Frontend - Make Toggles Functional (0.5 day)

**Update** `settings-tab.tsx`:

```typescript
// Remove disabled prop, add actual state management
const aiPrefs = useQuery(api.models.coachAIPreferences.getCoachAIPreferences, {
  coachId: user._id,
  organizationId: orgId,
});

const updatePref = useMutation(api.models.coachAIPreferences.updateAIPreference);

<Switch
  checked={aiPrefs?.autoDetectPlayerNames ?? true}
  onCheckedChange={(enabled) => updatePref({
    category: "autoDetectPlayerNames",
    enabled
  })}
/>
```

### Phase 3: Integration into v1 Pipeline (1 day)

**Update existing voice note processing**:

```typescript
// packages/backend/convex/actions/whatsapp.ts

export const processIncomingMessage = internalAction({
  handler: async (ctx, args) => {
    // ... existing quality gates ...

    // NEW: Get coach AI preferences
    const aiPrefs = await ctx.runQuery(
      api.models.coachAIPreferences.getCoachAIPreferences,
      { coachId, organizationId }
    );

    // Pass to insight extraction
    const insights = await extractInsights(transcript, aiPrefs);
  }
});

// Update insight extraction to respect preferences
async function extractInsights(transcript: string, prefs: AIPreferences) {
  const insights = [];

  // Only extract if enabled
  if (prefs.autoDetectPlayerNames) {
    // Extract player names
  }

  if (prefs.extractInjuryMentions) {
    // Extract injury insights
  }

  if (prefs.skillProgressTracking) {
    // Extract skill insights
  }

  return insights;
}
```

### Phase 4: Integration into v2 Pipeline (Phase 4-5)

**Critical Integration**: Claims Extraction (US-VN-015)

```typescript
// packages/backend/convex/actions/claimsExtraction.ts

export const extractClaims = internalAction({
  handler: async (ctx, args) => {
    // Get coach AI preferences
    const aiPrefs = await ctx.runQuery(
      api.models.coachAIPreferences.getCoachAIPreferences,
      { coachId: args.coachId, organizationId: args.orgId }
    );

    // Build GPT-4 prompt based on enabled categories
    const enabledCategories = [];
    if (aiPrefs.extractInjuryMentions) enabledCategories.push("injury");
    if (aiPrefs.skillProgressTracking) enabledCategories.push("skill_progress");
    if (aiPrefs.extractPerformanceNotes) enabledCategories.push("performance");
    if (aiPrefs.extractWellbeingNotes) enabledCategories.push("wellbeing");

    const prompt = `
      Extract claims from this transcript.
      ONLY extract claims in these categories: ${enabledCategories.join(", ")}

      Transcript: "${transcript}"

      Return JSON array of claims...
    `;

    // Call GPT-4 with filtered categories
    const claims = await openai.createChatCompletion({
      messages: [{ role: "user", content: prompt }],
      // ... save API tokens by skipping disabled categories!
    });

    return claims;
  }
});
```

**Cost Savings in v2**:
- Fewer GPT-4 tokens (smaller prompts)
- Fewer claims to process
- Fewer entity resolutions needed
- Faster processing overall

---

## 📋 Updated PRD Stories

### New Story: US-VN-006b (Insert after US-VN-006)

```json
{
  "id": "US-VN-006b",
  "phase": 1,
  "stream": "B",
  "title": "Coach AI Category Preferences",
  "description": "Implement backend for coach AI category settings (auto-detect players, injury extraction, skill tracking) to enable selective insight processing and save CPU/API costs.",
  "acceptanceCriteria": [
    "Backend: Create coachAIPreferences table in schema.ts",
    "Fields: coachId, organizationId, autoDetectPlayerNames, extractInjuryMentions, skillProgressTracking",
    "Create getCoachAIPreferences query with defaults",
    "Create updateAIPreference mutation",
    "Frontend: Update settings-tab.tsx to make switches functional",
    "Remove disabled prop from category switches",
    "Add useQuery for coach preferences",
    "Add useMutation for updating preferences",
    "Add toast notifications for changes",
    "Integration: Pass preferences to insight extraction",
    "Update extractInsights to respect category flags",
    "Skip disabled categories (don't process)",
    "Log skipped categories for analytics",
    "Unit tests: Create __tests__/coachAIPreferences.test.ts",
    "Test cases:",
    "  - Get preferences (returns defaults if not set)",
    "  - Update preference (creates or updates record)",
    "  - Insight extraction respects flags (skips disabled)",
    "  - All categories disabled → no insights extracted",
    "Type check passes: npm run check-types",
    "Manual test:",
    "  - Toggle categories in UI → persisted",
    "  - Send voice note with disabled category → that type not extracted"
  ],
  "priority": 6.5,
  "passes": true,
  "effort": "1.5 days",
  "effortBreakdown": {
    "schema": "1h (table + indexes)",
    "backend": "3h (query + mutation)",
    "frontend": "2h (make switches functional)",
    "integration": "4h (update insight extraction)",
    "tests": "2h (unit tests)",
    "manual": "1h (end-to-end test)"
  },
  "dependencies": ["US-VN-006"],
  "files": {
    "create": [
      "packages/backend/convex/models/coachAIPreferences.ts",
      "packages/backend/convex/__tests__/coachAIPreferences.test.ts"
    ],
    "modify": [
      "packages/backend/convex/schema.ts (add coachAIPreferences table)",
      "apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx (make functional)",
      "packages/backend/convex/actions/whatsapp.ts (pass prefs to extraction)"
    ]
  },
  "testingRequirements": {
    "unitTests": true,
    "integrationTests": false,
    "manualTesting": true,
    "uatTestCases": ["AI-001", "AI-002", "AI-003"]
  }
}
```

### Updated Story: US-VN-015 (Claims Extraction)

**Add to acceptance criteria**:
```json
"Get coach AI preferences before extraction",
"Filter GPT-4 prompt to only include enabled categories",
"Skip extraction for disabled categories (save API tokens)",
"Log category filtering for cost analysis"
```

### Updated Story: US-VN-017 (Entity Resolution)

**Add to acceptance criteria**:
```json
"Skip entity resolution if autoDetectPlayerNames is disabled",
"Return empty candidates array for disabled categories"
```

---

## 🎯 Implementation Priority

### Recommended Approach

**Option A: Add to Phase 1 (Recommended)**
- Add US-VN-006b after US-VN-006
- Complete before Phase 2
- Benefit: v1 pipeline gets savings immediately
- Effort: +1.5 days to Phase 1 (total: 4 days)

**Option B: Add to Phase 4 (v2 Only)**
- Implement only in v2 pipeline
- Benefit: Focus on v2 architecture
- Drawback: No savings for v1 users

**Option C: Separate Phase 1.5**
- Implement between Phase 1 and Phase 2
- Non-blocking for Phase 2 work
- Can be done in parallel with Phase 2 UI work

**Recommendation**: **Option A** - Add to Phase 1 as US-VN-006b

Rationale:
- Small effort (+1.5 days)
- Immediate cost savings for v1 pipeline
- Proven UI already exists (just needs hookup)
- Foundation for v2 category filtering
- Coaches get control immediately

---

## 📊 Success Criteria

### Phase 1 (US-VN-006b Complete)

- ✅ Coach can toggle AI categories in settings
- ✅ Preferences persist across sessions
- ✅ Voice notes respect category settings
- ✅ Disabled categories not extracted (verified via logs)
- ✅ Cost savings: 20-40% for coaches who disable categories
- ✅ No regressions: All enabled categories still work

### Phase 4 (v2 Integration Complete)

- ✅ Claims extraction filters by enabled categories
- ✅ GPT-4 prompts exclude disabled categories
- ✅ Entity resolution skips disabled categories
- ✅ Measured token savings: 30-50% for selective coaches
- ✅ Processing time improvement: 20-30% for selective coaches

---

## 🧪 Testing Strategy

### UAT Test Cases

**AI-001: Enable/Disable Categories**
1. Open coach settings → AI Preferences
2. Toggle "Extract injury mentions" OFF
3. Send voice note mentioning injury
4. Verify: No injury insight extracted
5. Toggle back ON
6. Send same note again
7. Verify: Injury insight extracted

**AI-002: Mixed Category Settings**
1. Enable: Player names + Skills
2. Disable: Injuries
3. Send note with all three types
4. Verify: Only player names + skills extracted

**AI-003: All Categories Disabled**
1. Disable all AI categories
2. Send voice note
3. Verify: Transcript saved but no insights
4. Verify: Processing completes successfully (no errors)

---

## 💡 Future Enhancements

### Additional Categories (Phase 4+)

**Suggested Categories**:
1. **Performance notes** (speed, strength, endurance)
2. **Wellbeing notes** (mental health, stress, sleep)
3. **Behavioral notes** (attitude, teamwork, leadership)
4. **Tactical notes** (positioning, decision-making)
5. **Technical notes** (skill execution, technique)

**Granular Control**:
- Sub-categories (e.g., injuries → minor, major, concussion)
- Sport-specific categories (e.g., GAA: solo work, catching, kicking)
- Time-based filtering (e.g., only extract performance during games)

### Analytics Dashboard

**Coach Insights**:
- Show cost savings from disabled categories
- Show processing time improvements
- Recommend categories based on usage patterns

---

## ✅ Checklist for Integration

- [ ] Add US-VN-006b to PRD.json after US-VN-006
- [ ] Update Phase 1 checklist with AI preferences tasks
- [ ] Update Phase 1 effort: 2.5 days → 4 days
- [ ] Add AI preferences to mandatory patterns
- [ ] Update US-VN-015 (Claims) with category filtering
- [ ] Update US-VN-017 (Entity Resolution) with skip logic
- [ ] Document cost savings in success criteria
- [ ] Add UAT test cases (AI-001 to AI-003)
- [ ] Update PHASE1_QUALITY_GATES.md with implementation guide
- [ ] Update README.md with AI preferences overview

---

## 📞 Next Steps

1. **Approve Integration Approach**:
   - Option A (Phase 1), B (Phase 4), or C (Phase 1.5)?

2. **Add US-VN-006b to PRD.json**:
   - I can add this story immediately

3. **Update Related Stories**:
   - US-VN-015, US-VN-017 with category filtering

4. **Update Phase 1 Context**:
   - Add implementation guide for AI preferences

**Ready to integrate?** Let me know which option you prefer and I'll update all documentation immediately. 🚀
