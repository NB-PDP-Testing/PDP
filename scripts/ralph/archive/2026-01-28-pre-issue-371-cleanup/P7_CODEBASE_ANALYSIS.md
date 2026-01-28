# Phase 7: Coach Insight Auto-Apply - Codebase Analysis

**Date**: 2026-01-25
**Analyst**: Claude Sonnet 4.5
**Status**: Pre-Implementation Review

---

## Executive Summary

Phase 7 aims to implement **progressive automation for coach insights**, mirroring the P5 parent summary trust system but applied to player profile updates. After comprehensive codebase review, **Phase 7 is ready to proceed with minor PRD updates**.

### Key Findings:
- ✅ **P5 trust system architecture is proven** - Can be directly adapted for insights
- ⚠️ **Insights lack confidence scores** - Currently not generated or stored
- ⚠️ **No dedicated insight table** - Insights embedded in voiceNotes array (architectural consideration)
- ⚠️ **PRD assumptions need validation** - Some referenced features don't exist yet
- ✅ **Frontend insight UI exists** - Can be extended with new features

---

## 1. Current Codebase State

### 1.1 Voice Notes & Insights Architecture

**Schema: `voiceNotes` table** (`packages/backend/convex/schema.ts:1366-1437`)

```typescript
insights: v.array(
  v.object({
    id: v.string(),
    playerIdentityId: v.optional(v.id("playerIdentities")),
    playerName: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
    category: v.optional(v.string()),           // ✅ EXISTS
    recommendedUpdate: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("applied"),
      v.literal("dismissed")
    ),
    appliedDate: v.optional(v.string()),
    // Team/TODO classification fields
    teamId: v.optional(v.string()),
    teamName: v.optional(v.string()),
    assigneeUserId: v.optional(v.string()),
    assigneeName: v.optional(v.string()),
    linkedTaskId: v.optional(v.id("coachTasks")),
  })
)
```

**❌ MISSING FIELDS for Phase 7:**
- `confidenceScore` - AI confidence (0.0-1.0)
- `appliedAt` - Timestamp when applied (currently using string `appliedDate`)
- `appliedBy` - Who applied it (manual vs auto)
- `autoApplied` - Boolean flag for auto-application tracking

**🔍 Current Insight Categories:**
- `skill` - Skill rating updates
- `attendance` - Attendance records
- `goal` - Development goals
- `performance` - Performance notes
- `injury` - Injury updates (⚠️ NEVER auto-apply per PRD)
- `medical` - Medical updates (⚠️ NEVER auto-apply per PRD)
- `team_culture` - Team-level observations
- `todo` - Coach tasks

### 1.2 Backend Queries/Mutations

**Existing Functions** (`packages/backend/convex/models/voiceNotes.ts`)

| Function | Line | Purpose | P7 Ready? |
|----------|------|---------|-----------|
| `getPendingInsights` | 336 | Get insights with status='pending' | ⚠️ Needs wouldAutoApply |
| `updateInsightStatus` | 565 | Apply/dismiss insights | ⚠️ Needs preview tracking |
| `bulkApplyInsights` | 1087 | Batch apply insights | ❌ No auto-apply logic |
| `classifyInsight` | 1369 | Set insight category | ✅ Ready |
| `assignPlayerToInsight` | 1554 | Link insight to player | ✅ Ready |

**❌ MISSING Functions for Phase 7:**
- `autoApplyInsight` - Auto-apply logic with audit trail
- `undoAutoAppliedInsight` - 1-hour undo window
- `getAutoAppliedInsights` - Query auto-applied insights
- `setInsightAutoApplyPreferences` - Category preferences

### 1.3 Coach Trust Levels (Platform-Wide)

**Schema: `coachTrustLevels` table** (`packages/backend/convex/schema.ts:2048-2088`)

✅ **Existing Fields (from P5):**
```typescript
coachId: v.string(),
currentLevel: v.number(),              // 0-3
preferredLevel: v.optional(v.number()), // Coach's max desired level
totalApprovals: v.number(),
totalSuppressed: v.number(),
consecutiveApprovals: v.number(),
previewModeStats: v.optional(v.object({
  wouldAutoApproveSuggestions: v.number(),
  coachApprovedThose: v.number(),
  coachRejectedThose: v.number(),
  agreementRate: v.number(),
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
})),
confidenceThreshold: v.optional(v.number()),     // Default 0.7
personalizedThreshold: v.optional(v.number()),   // Phase 4 adaptive learning
```

**❌ MISSING FIELDS for Phase 7:**
- `insightPreviewModeStats` - Separate tracking for insights vs parent summaries
- `insightConfidenceThreshold` - Separate threshold for insights
- `insightAutoApplyPreferences` - Per-category toggles (skills, attendance, goals, performance)

**🎯 Key Insight:** P5 trust levels are for **parent summaries**. Phase 7 needs **parallel tracking for insights** because:
- Coaches may trust AI differently for summaries vs profile updates
- Profile updates have higher stakes (changing actual player data)
- Different category preferences (trust skills auto-apply, not goals)

### 1.4 Frontend Insights UI

**Component: `InsightsTab`** (`apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx`)

✅ **Current Features:**
- Displays pending insights from coach's voice notes
- Shows player name, category, description, recommended update
- Buttons: Apply, Dismiss, Edit, Assign Player
- Supports team-level and TODO insights
- Player search/assignment for unmatched insights

**❌ MISSING for Phase 7:**
- Confidence score visualization (Progress bar)
- "AI would auto-apply" prediction badge
- Auto-Applied tab/filter
- Undo button with 1-hour window
- Category preference checkboxes (settings)

**Frontend Settings Tab:**
- ✅ Trust level slider exists (for parent summaries)
- ❌ No insight-specific settings yet
- ❌ No category preference controls

---

## 2. PRD Assessment & Recommendations

### 2.1 PRD Accuracy Check

**✅ ACCURATE Assumptions:**
1. **P5 trust system exists** - Can be mirrored
2. **Insights have categories** - Already implemented
3. **Insights have status tracking** - pending/applied/dismissed works
4. **Frontend insight cards exist** - Can be extended
5. **Platform staff kill switch exists** - Phase 6 platformMessagingSettings

**⚠️ NEEDS CLARIFICATION:**
1. **Line 64: "Find coachTrustLevels table definition (around line 1795)"**
   - **ACTUAL**: Line 2048 (PRD is outdated)
   - **FIX**: Update PRD with correct line numbers

2. **US-002: "Import coachTrustLevels query"**
   - **ISSUE**: No such query exists - trust levels fetched via db.query
   - **FIX**: Update PRD to show correct db.query pattern

3. **US-007: "Get current player skill rating (previousValue)"**
   - **ISSUE**: PRD doesn't specify where skill ratings are stored
   - **CLARIFY**: Are skills in `orgPlayerEnrollments` or separate table?

4. **US-009: "Auto-Applied tab shows insights where autoAppliedByAI === true"**
   - **ISSUE**: No such field exists yet on insights
   - **FIX**: Need to track this in new `autoAppliedInsights` table

**❌ MISSING REQUIREMENTS:**
1. **Confidence Score Generation**
   - PRD assumes `insight.confidenceScore` exists
   - **REALITY**: Insights are generated by Claude API but confidence not captured
   - **SOLUTION**: Modify AI action to return confidence scores

2. **Insight Application Logic**
   - PRD says "apply new skill rating from insight"
   - **REALITY**: No clear mapping of insights → player profile fields
   - **SOLUTION**: Define insight type → player field mapping table

3. **Player Profile Update Mechanism**
   - PRD doesn't specify how to update player profiles
   - **QUESTION**: Which fields in `orgPlayerEnrollments` should insights modify?
   - **SUGGESTION**: Create `playerFieldUpdates` table to track all changes

### 2.2 Critical Design Decisions Needed

**DECISION 1: Insight Storage Architecture**

**Current**: Insights embedded in `voiceNotes.insights` array
**Challenge**: Can't create indexes on array elements, no direct queries

**Options:**
A. **Keep embedded** (simpler, less schema changes)
   - ✅ Matches current architecture
   - ❌ Inefficient queries (must scan all voice notes)
   - ❌ Can't index confidence scores

B. **Extract to `voiceNoteInsights` table** (PRD assumption)
   - ✅ Efficient queries with indexes
   - ✅ Can add confidence score to schema
   - ✅ Supports auto-apply audit trail
   - ❌ Breaking change (migration required)
   - ❌ Duplication with embedded insights

**RECOMMENDATION**: **Option B - Extract to dedicated table**
- Phase 7 needs efficient querying by confidence, category, date
- Auto-apply audit trail needs proper indexing
- Migration can happen before Phase 7.1

**DECISION 2: Confidence Score Source**

**Challenge**: Current AI action doesn't return confidence scores

**Options:**
A. **Use Claude API response metadata**
   - Check if Anthropic API returns confidence
   - May not be available

B. **Calculate confidence from prompt analysis**
   - Use specific keywords/phrases in insight text
   - Heuristic-based (less reliable)

C. **Add explicit confidence scoring step**
   - Separate API call: "Rate this insight 0.0-1.0"
   - More accurate, but doubles cost

**RECOMMENDATION**: **Option C - Add explicit scoring**
- More reliable than heuristics
- Can be batched to reduce cost
- Critical for trust system accuracy

**DECISION 3: Player Profile Field Mapping**

**Challenge**: PRD mentions "skill ratings" but doesn't define storage

**Options:**
A. **Use existing fields in `orgPlayerEnrollments`**
   - Check what fields exist currently
   - May be limited

B. **Create `playerSkillRatings` table**
   - Dedicated skill tracking
   - More flexible schema

C. **Use existing `skillAssessments` table** (if exists)
   - Check schema for skill tracking

**ACTION REQUIRED**: Review player profile schema to determine approach

---

## 3. Schema Changes Required for Phase 7

### 3.1 NEW TABLE: `voiceNoteInsights`

**Rationale**: Extract insights from embedded array for efficient querying

```typescript
voiceNoteInsights: defineTable({
  // Source tracking
  voiceNoteId: v.id("voiceNotes"),
  insightId: v.string(), // Original insight.id from embedded array

  // Content
  title: v.string(),
  description: v.string(),
  category: v.string(),
  recommendedUpdate: v.optional(v.string()),

  // Player/Team association
  playerIdentityId: v.optional(v.id("playerIdentities")),
  playerName: v.optional(v.string()),
  teamId: v.optional(v.string()),
  teamName: v.optional(v.string()),

  // Trust & Automation (NEW for P7)
  confidenceScore: v.number(), // 0.0-1.0, AI confidence
  wouldAutoApply: v.boolean(), // Prediction flag (preview mode)

  // Status tracking
  status: v.union(
    v.literal("pending"),
    v.literal("applied"),
    v.literal("dismissed"),
    v.literal("auto_applied") // NEW
  ),

  // Application tracking
  appliedAt: v.optional(v.number()), // Timestamp
  appliedBy: v.optional(v.string()), // User ID or "system"
  dismissedAt: v.optional(v.number()),
  dismissedBy: v.optional(v.string()),

  // Metadata
  organizationId: v.string(),
  coachId: v.string(),
  createdAt: v.number(),
})
  .index("by_coach_org_status", ["coachId", "organizationId", "status"])
  .index("by_player_status", ["playerIdentityId", "status"])
  .index("by_confidence", ["confidenceScore"])
  .index("by_category_status", ["category", "status"])
  .index("by_voice_note", ["voiceNoteId"])
```

### 3.2 NEW TABLE: `autoAppliedInsights` (US-006)

```typescript
autoAppliedInsights: defineTable({
  // Source tracking
  insightId: v.id("voiceNoteInsights"),
  voiceNoteId: v.id("voiceNotes"),

  // Context
  playerId: v.id("orgPlayerEnrollments"),
  coachId: v.string(),
  organizationId: v.string(),

  // Insight metadata (denormalized for audit)
  category: v.string(),
  confidenceScore: v.number(),

  // Application tracking
  appliedAt: v.number(),
  autoAppliedByAI: v.boolean(), // true = auto, false = manual

  // Undo tracking
  undoneAt: v.optional(v.number()),
  undoReason: v.optional(v.string()), // "wrong_player", "wrong_rating", "incorrect", "other"
  undoReasonDetail: v.optional(v.string()), // Free text explanation

  // Change tracking (for rollback)
  changeType: v.string(), // "skill_rating", "attendance", "goal", etc.
  fieldChanged: v.string(), // Field name in player profile
  previousValue: v.optional(v.string()), // Serialized previous value
  newValue: v.string(), // Serialized new value
})
  .index("by_coach_org", ["coachId", "organizationId"])
  .index("by_insight", ["insightId"])
  .index("by_player", ["playerId"])
  .index("by_applied_at", ["appliedAt"])
  .index("by_undo_status", ["undoneAt"]) // null = active, non-null = undone
```

### 3.3 UPDATED TABLE: `coachTrustLevels`

**Add insight-specific fields:**

```typescript
// Phase 7: Insight auto-apply tracking (separate from parent summaries)
insightPreviewModeStats: v.optional(
  v.object({
    wouldAutoApplyInsights: v.number(), // Count of insights AI would auto-apply
    coachAppliedThose: v.number(), // Of those, how many coach applied
    coachDismissedThose: v.number(), // Of those, how many coach dismissed
    agreementRate: v.number(), // coachAppliedThose / wouldAutoApplyInsights
    startedAt: v.number(),
    completedAt: v.optional(v.number()), // After 20 insights
  })
),

insightConfidenceThreshold: v.optional(v.number()), // Default 0.7, separate from parent summary threshold

insightAutoApplyPreferences: v.optional(
  v.object({
    skills: v.boolean(), // Auto-apply skill rating updates
    attendance: v.boolean(), // Auto-apply attendance records
    goals: v.boolean(), // Auto-apply development goals
    performance: v.boolean(), // Auto-apply performance notes
    // injury and medical always excluded (never auto-apply)
  })
),
```

---

## 4. AI Confidence Score Implementation

### 4.1 Current AI Action Analysis

**File**: `packages/backend/convex/actions/voiceNotes.ts`

**Current Flow:**
1. Transcribe voice note → Claude API
2. Generate insights → Claude API
3. Store insights in voiceNotes array

**Missing**: Confidence score capture

### 4.2 Proposed Confidence Scoring Approach

**OPTION A: Single-Pass Scoring** (Recommended)

Modify insight generation prompt to include confidence:

```typescript
// In generateInsights action
const prompt = `
Analyze this voice note and extract insights.
For each insight, rate your confidence 0.0-1.0:
- 1.0 = Certain (coach explicitly stated fact)
- 0.8 = High (clear implication from context)
- 0.6 = Medium (reasonable inference)
- 0.4 = Low (speculative)

Return JSON:
{
  "insights": [
    {
      "title": "...",
      "description": "...",
      "category": "skill",
      "confidence": 0.85,
      ...
    }
  ]
}
`;
```

**OPTION B: Two-Pass Scoring** (More accurate, higher cost)

1. First pass: Generate insights (as current)
2. Second pass: Rate each insight's confidence

```typescript
// After generating insights
for (const insight of insights) {
  const confidencePrompt = `
Rate your confidence in this insight 0.0-1.0:
Insight: "${insight.description}"
Based on: "${transcription}"

Consider:
- Was this explicitly stated or inferred?
- Is the player identification certain?
- Is the recommended action clear?

Return only a number 0.0-1.0.
  `;

  const confidence = await claudeAPI(confidencePrompt);
  insight.confidenceScore = parseFloat(confidence);
}
```

**RECOMMENDATION**: Start with **Option A** (single-pass) for Phase 7.1-7.2, upgrade to **Option B** if accuracy issues arise.

---

## 5. Player Profile Update Mapping

### 5.1 Insight Category → Player Field Mapping

**Required Research**: Review `orgPlayerEnrollments` schema to determine which fields insights can update.

**Proposed Mapping** (needs validation):

| Insight Category | Target Table/Field | Example |
|-----------------|-------------------|---------|
| `skill` | `orgPlayerEnrollments.skillRatings` (or `skillAssessments` table) | "Passing: 3 → 4" |
| `attendance` | `attendanceRecords` table (create new record) | "Missed training on 2026-01-20" |
| `goal` | `developmentGoals` table (update or create) | "Add goal: Improve left foot" |
| `performance` | `performanceNotes` table (or `orgPlayerEnrollments.notes`) | "Strong leadership in match" |
| `injury` | ❌ **NEVER AUTO-APPLY** | Manual review required |
| `medical` | ❌ **NEVER AUTO-APPLY** | Manual review required |

**ACTION REQUIRED**:
1. Review existing player profile schema
2. Identify which fields are safe to auto-update
3. Define validation rules for each field type

---

## 6. Migration Strategy

### 6.1 Phase 7 Prerequisites (Before US-001)

**MIGRATION 1: Extract Insights to Dedicated Table**

```typescript
// Migration: extractInsightsToTable.ts
export default internalMutation({
  handler: async (ctx) => {
    // 1. Fetch all voice notes with insights
    const voiceNotes = await ctx.db.query("voiceNotes").collect();

    let migrated = 0;
    for (const note of voiceNotes) {
      if (!note.insights || note.insights.length === 0) continue;

      for (const insight of note.insights) {
        // 2. Create new voiceNoteInsights record
        await ctx.db.insert("voiceNoteInsights", {
          voiceNoteId: note._id,
          insightId: insight.id,
          title: insight.title,
          description: insight.description,
          category: insight.category ?? "uncategorized",
          recommendedUpdate: insight.recommendedUpdate,
          playerIdentityId: insight.playerIdentityId,
          playerName: insight.playerName,
          teamId: (insight as any).teamId,
          teamName: (insight as any).teamName,

          // NEW FIELDS - set defaults for existing data
          confidenceScore: 0.7, // Default medium confidence for historical data
          wouldAutoApply: false, // Historical insights don't auto-apply

          status: insight.status,
          appliedAt: insight.appliedDate ? new Date(insight.appliedDate).getTime() : undefined,
          appliedBy: insight.status === "applied" ? note.coachId : undefined,

          organizationId: note.orgId,
          coachId: note.coachId ?? "",
          createdAt: note._creationTime,
        });

        migrated++;
      }
    }

    return { migrated };
  }
});
```

**MIGRATION 2: Add Confidence Scores to New Insights**

Modify `packages/backend/convex/actions/voiceNotes.ts`:

```typescript
// In generateInsights action
const insights = await claudeAPI({
  model: "claude-3-5-sonnet-20241022",
  prompt: `${systemPrompt}\n\nFor each insight, include a "confidence" field 0.0-1.0.`,
  // ... rest of config
});

// Store with confidence scores
for (const insight of insights) {
  insight.confidenceScore = insight.confidence ?? 0.7; // Fallback if not provided
}
```

### 6.2 Backward Compatibility

**Strategy**: Dual-write during transition period

1. Continue storing insights in `voiceNotes.insights` array (read-only)
2. Also create `voiceNoteInsights` records (primary for P7)
3. Phase 7 queries use new table only
4. After Phase 7 stable, deprecate embedded insights

**Benefit**: Zero downtime, easy rollback

---

## 7. PRD Improvements & Clarifications

### 7.1 Recommended PRD Updates

**UPDATE 1: Add prerequisite migration stories**

```json
{
  "id": "US-000-A",
  "title": "Migrate insights to dedicated voiceNoteInsights table",
  "description": "Extract embedded insights from voiceNotes array to new table with indexes",
  "phase": "7.0: Prerequisites",
  "priority": 0
},
{
  "id": "US-000-B",
  "title": "Add confidence scoring to AI insight generation",
  "description": "Modify Claude API prompt to return confidence scores for each insight",
  "phase": "7.0: Prerequisites",
  "priority": 0
}
```

**UPDATE 2: Clarify player profile update mechanism**

Add to US-007 acceptance criteria:
```
"Define insight → player field mapping:",
"  - skill insights update orgPlayerEnrollments.skillRatings",
"  - attendance insights create attendanceRecords entries",
"  - goal insights create/update developmentGoals",
"  - performance insights add to player notes",
"Implement validation for each field type (e.g., skill ratings 1-5)"
```

**UPDATE 3: Add undo reason categories**

Update US-008 to include specific undo reasons:
```typescript
undoReasons: v.union(
  v.literal("wrong_player"),
  v.literal("wrong_rating"),
  v.literal("insight_incorrect"),
  v.literal("changed_mind"),
  v.literal("duplicate"),
  v.literal("other")
)
```

**UPDATE 4: Specify confidence thresholds by trust level**

Add to US-002:
```
"Level 0 (New): wouldAutoApply = false (always)",
"Level 1 (Learning): wouldAutoApply = false (preview only)",
"Level 2 (Trusted): wouldAutoApply = confidence >= threshold (default 0.7)",
"Level 3 (Expert): wouldAutoApply = confidence >= (threshold - 0.1) (more aggressive)"
```

### 7.2 Additional Safety Guardrails

**RECOMMENDATION: Add to PRD Safety Section**

1. **Daily Auto-Apply Limit** (prevent runaway automation)
   ```
   - Max 20 auto-applies per coach per day
   - If limit reached, revert to preview mode
   - Reset at midnight UTC
   ```

2. **Category-Specific Confidence Floors**
   ```
   - skills: minimum 0.6 (60%)
   - attendance: minimum 0.7 (70%)
   - goals: minimum 0.8 (80%) - more subjective
   - performance: minimum 0.8 (80%)
   ```

3. **Auto-Apply Pause on High Undo Rate**
   ```
   - If undo rate >15% in last 10 auto-applies
   - Automatically pause auto-apply for this coach
   - Require manual re-enable with acknowledgment
   ```

---

## 8. Ralph Execution Plan

### 8.1 Prerequisites (Before Phase 7.1)

**TASK 1: Schema Design Review Session**
- Duration: 1-2 hours
- Participants: Dev team + Neil (stakeholder)
- Deliverables:
  1. Confirm `voiceNoteInsights` table schema
  2. Review player profile field mapping
  3. Approve `autoAppliedInsights` audit schema
  4. Sign off on migration strategy

**TASK 2: Run Migration (Non-Ralph Task)**
- Create migration scripts
- Test on staging data
- Run migration to production
- Verify data integrity

**TASK 3: Update AI Action for Confidence Scores (Non-Ralph Task)**
- Modify Claude API prompt
- Test confidence score accuracy
- Deploy updated action
- Verify new insights have scores

**Estimated Time**: 1-2 days (before Ralph starts)

### 8.2 Phase 7.1: Preview Mode (Ralph Stories US-001 to US-005)

**Branch**: `ralph/coach-insights-auto-apply-p7-phase1`

**Ralph Config**:
```json
{
  "phaseNumber": "7.1",
  "storyRange": "US-001 to US-005",
  "estimatedStories": 5,
  "dependencies": [
    "voiceNoteInsights table exists",
    "Insights have confidence scores",
    "Migration complete"
  ],
  "testingFocus": [
    "Confidence visualization on insight cards",
    "Preview mode prediction badges",
    "Preview stats tracking accuracy",
    "Agreement rate calculation"
  ]
}
```

**Expected Duration**: 2-3 days

**Critical Files**:
- Schema: `packages/backend/convex/schema.ts`
- Backend: `packages/backend/convex/models/voiceNoteInsights.ts` (NEW)
- Backend: `packages/backend/convex/models/coachTrustLevels.ts`
- Frontend: Insight card components (US-003, US-004)

**Validation Checkpoints**:
1. Confidence scores render correctly (color coding)
2. "Would auto-apply" badge appears for high-confidence skills
3. Injury/medical insights NEVER show "would auto-apply"
4. Preview stats update when coach applies/dismisses
5. Agreement rate calculated correctly

### 8.3 Phase 7.2: Supervised Auto-Apply (Ralph Stories US-006 to US-009)

**Branch**: `ralph/coach-insights-auto-apply-p7-phase2`

**Ralph Config**:
```json
{
  "phaseNumber": "7.2",
  "storyRange": "US-006 to US-009",
  "estimatedStories": 4,
  "dependencies": [
    "Phase 7.1 complete and tested",
    "Player profile field mapping defined",
    "Auto-apply UI designs reviewed"
  ],
  "testingFocus": [
    "Auto-apply only triggers at Level 2+",
    "Audit trail captures all changes",
    "Undo works within 1-hour window",
    "Auto-Applied tab shows correct insights",
    "Coach notifications for auto-applies"
  ]
}
```

**Expected Duration**: 3-4 days

**Critical Files**:
- Schema: `autoAppliedInsights` table (US-006)
- Backend: Auto-apply mutations (US-007, US-008)
- Frontend: Auto-Applied tab + undo UI (US-009)
- Player profile update logic (NEW)

**Validation Checkpoints**:
1. Auto-apply ONLY for Level 2+ coaches
2. Auto-apply ONLY for enabled categories
3. Audit trail stores previousValue → newValue
4. Undo reverts player profile correctly
5. Undo window enforced (1 hour)
6. Auto-Applied tab filters correctly

### 8.4 Phase 7.3: Learning Loop (Ralph Stories US-010 to US-013)

**Branch**: `ralph/coach-insights-auto-apply-p7-phase3`

**Ralph Config**:
```json
{
  "phaseNumber": "7.3",
  "storyRange": "US-010 to US-013",
  "estimatedStories": 4,
  "dependencies": [
    "Phase 7.2 complete and tested",
    "At least 2 weeks of auto-apply data",
    "Undo reasons being collected"
  ],
  "testingFocus": [
    "Category preferences save correctly",
    "Threshold adjustments based on undo rate",
    "Undo reason analytics dashboard",
    "Adaptive learning doesn't over-correct"
  ]
}
```

**Expected Duration**: 2-3 days

**Critical Files**:
- Schema: Category preferences (US-010)
- Backend: Threshold adjustment cron (US-012)
- Backend: Undo analytics query (US-013)
- Frontend: Settings category controls (US-011)
- Admin: Undo analysis dashboard (US-013)

**Validation Checkpoints**:
1. Category toggles work independently
2. Threshold adjusts based on undo rate
3. Adjustments don't exceed min/max bounds (0.6-0.9)
4. Undo reasons tracked accurately
5. Analytics dashboard shows meaningful insights

### 8.5 Ralph Execution Command

**Phase 7.1**:
```bash
npm run ralph -- \
  --prd scripts/ralph/prds/p7-coach-insight-auto-apply-phase7.prd.json \
  --phase 7.1 \
  --stories US-001,US-002,US-003,US-004,US-005 \
  --branch ralph/coach-insights-auto-apply-p7-phase1
```

**Phase 7.2**:
```bash
npm run ralph -- \
  --prd scripts/ralph/prds/p7-coach-insight-auto-apply-phase7.prd.json \
  --phase 7.2 \
  --stories US-006,US-007,US-008,US-009 \
  --branch ralph/coach-insights-auto-apply-p7-phase2
```

**Phase 7.3**:
```bash
npm run ralph -- \
  --prd scripts/ralph/prds/p7-coach-insight-auto-apply-phase7.prd.json \
  --phase 7.3 \
  --stories US-010,US-011,US-012,US-013 \
  --branch ralph/coach-insights-auto-apply-p7-phase3
```

---

## 9. Risk Assessment

### 9.1 Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Migration data loss** | HIGH | LOW | Backup before migration, test on staging |
| **Confidence scores inaccurate** | HIGH | MEDIUM | Start conservative (0.7 threshold), monitor undo rates |
| **Auto-apply updates wrong player** | HIGH | LOW | Require playerIdentityId, validate before update |
| **Undo fails to revert** | MEDIUM | LOW | Store previousValue as string, test all field types |
| **Performance degradation** | MEDIUM | LOW | Index new table properly, monitor query times |
| **Breaking existing insight workflow** | HIGH | MEDIUM | Maintain backward compatibility, feature flag rollout |

### 9.2 Product Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Coaches don't trust auto-apply** | HIGH | MEDIUM | Preview mode first (7.1), collect feedback before 7.2 |
| **Too many false auto-applies** | HIGH | MEDIUM | Conservative thresholds, easy undo, pause on high undo rate |
| **Coaches bypass system** | MEDIUM | LOW | Make manual workflow still easy, don't force automation |
| **Confusion about what auto-applied** | MEDIUM | MEDIUM | Clear UI badges, notifications, audit trail visibility |

### 9.3 Recommended Risk Mitigations

1. **Phased Rollout** (already in PRD)
   - Week 1-2: Preview mode only, measure agreement rate
   - Week 3-4: Auto-apply for opt-in coaches only
   - Week 5-6: Learning loop for coaches with <2% undo rate

2. **Feature Flags**
   - Platform-level: `insightAutoApplyEnabled` (kill switch)
   - Org-level: `insightAutoApplyBeta` (pilot organizations)
   - Coach-level: Opt-in via trust level + category preferences

3. **Monitoring Dashboards**
   - Daily auto-apply volume
   - Undo rate by coach, category, confidence range
   - Agreement rate trends (preview mode)
   - Alert if undo rate >10% org-wide

---

## 10. Success Criteria Validation

### 10.1 Phase 7.1 Success Metrics (Preview Mode)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Agreement rate | >40% | `insightPreviewModeStats.agreementRate` |
| Confidence score visibility | 100% of insights show score | Frontend audit |
| No regressions | 0 bugs in existing workflow | QA testing |
| Coach understanding | >80% understand badges | User survey (optional) |

### 10.2 Phase 7.2 Success Metrics (Supervised Auto-Apply)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Auto-apply rate | >30% of eligible insights | `autoAppliedInsights` count / total insights |
| Undo rate | <5% | Undone / total auto-applied |
| Time saved | 5-10 min/coach/week | Before/after time study |
| Coach satisfaction | >75% positive | Post-launch survey |

### 10.3 Phase 7.3 Success Metrics (Learning Loop)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Threshold personalization | >50% coaches have adjusted threshold | Count coaches with `personalizedThreshold` |
| Category adoption | >60% coaches enable ≥2 categories | Check `insightAutoApplyPreferences` |
| Feedback loop active | Undo reasons tracked monthly | `getUndoReasonStats` query |

---

## 11. Recommendations Summary

### 11.1 Before Starting Phase 7

✅ **HIGH PRIORITY** (Blockers):
1. **Extract insights to dedicated table** - Required for efficient queries
2. **Add confidence scoring to AI action** - Core feature dependency
3. **Define player profile field mapping** - Required for auto-apply
4. **Update PRD line numbers** - Schema references are outdated

⚠️ **MEDIUM PRIORITY** (Should do):
5. **Add safety guardrails to PRD** - Daily limits, confidence floors, auto-pause
6. **Create migration test plan** - Ensure data integrity
7. **Design undo UI mockups** - Avoid rework in Phase 7.2

💡 **NICE TO HAVE** (Optional):
8. **Pilot with 1-2 friendly coaches** - Get early feedback before full rollout
9. **Create admin monitoring dashboard** - Track metrics proactively
10. **Document player field update logic** - For future maintenance

### 11.2 PRD Updates Required

**File**: `scripts/ralph/prds/p7-coach-insight-auto-apply-phase7.prd.json`

**Changes**:
1. Add US-000-A and US-000-B (migration + confidence scoring)
2. Update line 64: `coachTrustLevels` is at line 2048, not 1795
3. Clarify US-007: Specify which player profile fields to update
4. Expand US-008: Add undo reason enum values
5. Add safety section: Daily limits, confidence floors, auto-pause rules
6. Update testing requirements: Add migration validation tests

**Action**: Create `p7-coach-insight-auto-apply-phase7-v2.prd.json` with updates

---

## 12. Next Steps

### 12.1 Immediate Actions (Today)

1. **Review this analysis with Neil** - Confirm approach
2. **Update PRD** - Incorporate recommendations
3. **Create migration plan** - Detailed steps for insight extraction
4. **Review player profile schema** - Identify update targets

### 12.2 This Week (Before Ralph Starts)

1. **Implement migration** - Extract insights to new table
2. **Update AI action** - Add confidence scoring
3. **Test migrations** - Validate data integrity
4. **Create Ralph config** - Phase 7.1 setup

### 12.3 Week 1-2 (Phase 7.1)

1. **Run Ralph on US-001 to US-005**
2. **Manual QA** - Verify confidence visualization
3. **Collect preview mode data** - 20 insights per coach
4. **Measure agreement rate** - Should be >40%

### 12.4 Week 3-4 (Phase 7.2)

1. **Run Ralph on US-006 to US-009**
2. **Pilot with 3-5 coaches** - Opt-in only
3. **Monitor undo rates** - Should be <5%
4. **Gather feedback** - Interview pilot coaches

### 12.5 Week 5-6 (Phase 7.3)

1. **Run Ralph on US-010 to US-013**
2. **Enable for all coaches** - General availability
3. **Start adaptive learning** - Threshold adjustments
4. **Monthly undo analysis** - Feed back to AI team

---

## Appendix A: Codebase File Inventory

### Backend Files (Convex)

**Schema**:
- `packages/backend/convex/schema.ts` - All table definitions

**Models (Existing)**:
- `packages/backend/convex/models/voiceNotes.ts` - Voice notes + insights CRUD
- `packages/backend/convex/models/coachTrustLevels.ts` - Trust level management
- `packages/backend/convex/models/coachParentSummaries.ts` - P5 reference implementation

**Models (NEW for P7)**:
- `packages/backend/convex/models/voiceNoteInsights.ts` - Dedicated insight queries
- `packages/backend/convex/models/autoAppliedInsights.ts` - Auto-apply audit trail

**Actions**:
- `packages/backend/convex/actions/voiceNotes.ts` - AI transcription + insight generation

**Crons** (for P7.3):
- `packages/backend/convex/crons.ts` - Add adaptive threshold adjustment

### Frontend Files (Next.js)

**Components (Existing)**:
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx`

**Components (NEW for P7)**:
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insight-confidence-badge.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/auto-applied-insights-tab.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/undo-insight-dialog.tsx`
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/category-preferences.tsx`

**Admin Pages (for P7.3)**:
- `apps/web/src/app/admin/ai-insights/undo-analysis/page.tsx`

---

## Appendix B: P5 Reference Implementation

**Trust Level Calculation** (`packages/backend/convex/models/coachTrustLevels.ts:calculateTrustLevel`)

```typescript
// Level 0 → 1: 10+ approvals
if (totalApprovals >= 10 && currentLevel < 1) {
  newLevel = 1;
}

// Level 1 → 2: 50+ approvals, <10% suppression rate
if (totalApprovals >= 50 && suppressionRate < 0.1 && currentLevel < 2) {
  newLevel = 2;
}

// Level 2 → 3: 200+ approvals, <5% suppression rate, coach opt-in required
if (totalApprovals >= 200 && suppressionRate < 0.05 && currentLevel < 3) {
  // Only upgrade if coach has opted in (preferredLevel >= 3)
  if ((preferredLevel ?? 0) >= 3) {
    newLevel = 3;
  }
}
```

**wouldAutoApprove Logic** (`packages/backend/convex/models/coachParentSummaries.ts`)

```typescript
const effectiveLevel = Math.min(
  trustLevel.currentLevel,
  trustLevel.preferredLevel ?? trustLevel.currentLevel
);

const threshold = trustLevel.confidenceThreshold ?? 0.7;

const wouldAutoApprove =
  summary.category !== "injury" && // Never auto-approve injury
  summary.category !== "behavioral" && // Never auto-approve behavioral
  effectiveLevel >= 2 && // Level 2+ only
  summary.confidenceScore >= threshold; // Meets confidence threshold
```

**Phase 7 should mirror this exact pattern for insights.**

---

## Conclusion

Phase 7 is **architecturally sound** and builds on proven P5 patterns. The PRD is comprehensive but needs updates for:
1. Schema migration prerequisites
2. Confidence score implementation
3. Player profile update mechanics

**Recommended path forward**:
1. ✅ Update PRD (incorporate this analysis)
2. ✅ Run migrations (extract insights, add confidence)
3. ✅ Execute Phase 7.1 with Ralph (preview mode)
4. ✅ Pilot Phase 7.2 with select coaches
5. ✅ Roll out Phase 7.3 after validation

**Estimated timeline**: 4-6 weeks from PRD approval to full rollout.

**Risk level**: **MEDIUM-LOW** - Well-understood patterns, incremental rollout, strong safety nets.

---

**Prepared by**: Claude Sonnet 4.5
**Date**: 2026-01-25
**Status**: Ready for stakeholder review
