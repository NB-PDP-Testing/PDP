# Voice Notes Insight Categories - Comprehensive Reference

**Last Updated**: February 9, 2026
**Status**: v2 Pipeline Implementation (Phase 4+)

---

## Overview

The PlayerARC voice notes v2 pipeline extracts **atomic claims** from coach voice notes, categorizing them into **15 distinct topic categories**. Each claim represents a single observation about a single entity (player, team, or coach).

This is an expansion from the original v1 pipeline which had **7 categories**, adding **8 new categories** for richer insight extraction and better categorization.

### Quick Integration Status

| Category | AI Extraction | Schema | Drafts | Auto-Apply | Type-Specific Application |
|----------|---------------|--------|--------|------------|--------------------------|
| injury | ✅ | ✅ | ✅ | 🔒 Always Manual | ❌ Generic |
| skill_rating | ✅ | ✅ | ✅ | ✅ Can Auto-Apply | ❌ Generic |
| skill_progress | ✅ | ✅ | ✅ | ✅ Can Auto-Apply | ❌ Generic |
| behavior | ✅ | ✅ | ✅ | ⚠️ Not Integrated | ❌ Generic |
| performance | ✅ | ✅ | ✅ | ✅ Can Auto-Apply | ❌ Generic |
| attendance | ✅ | ✅ | ✅ | ✅ Can Auto-Apply | ❌ Generic |
| wellbeing | ✅ | ✅ | ✅ | 🔒 Always Manual | ❌ Generic |
| recovery | ✅ | ✅ | ✅ | 🔒 Always Manual | ❌ Generic |
| development_milestone | ✅ | ✅ | ✅ | ✅ Can Auto-Apply | ❌ Generic |
| physical_development | ✅ | ✅ | ✅ | ⚠️ Not Integrated | ❌ Generic |
| parent_communication | ✅ | ✅ | ✅ | 🔒 Manual (Correct) | ❌ Generic |
| tactical | ✅ | ✅ | ✅ | ⚠️ Not Integrated | ❌ Generic |
| team_culture | ✅ | ✅ | ✅ | ⚠️ Not Integrated | ❌ Generic |
| todo | ✅ | ✅ | ✅ | 🔒 Manual (Correct) | ✅ Creates Task |
| session_plan | ✅ | ✅ | ✅ | 🔒 Manual (Correct) | ❌ Generic |

**Legend**:
- ✅ Fully Integrated
- ⚠️ Partially Integrated / Missing
- 🔒 Intentionally Manual (correct design)
- ❌ Not Implemented

**Status Summary**:
- **AI Extraction**: 15/15 ✅ (100%)
- **Auto-Apply**: 5/15 ✅, 7/15 ⚠️, 3/15 🔒 (33% auto-apply enabled)
- **Type-Specific Application**: 1/15 ✅ (TODO creates coach tasks), 14/15 ❌ (generic storage only)

---

## The 15 Insight Categories

### **1. `injury` - Physical Injuries**

**Scope**: Player-specific
**What It Captures**: Physical injuries, knocks, strains, physical harm
**Special Metadata**:
- `severity`: `low` | `medium` | `high` | `critical`
- `sentiment`: Usually `concerned` or `negative`

**Examples**:
- "Niamh hurt her ankle in training"
- "John took a hard knock to the shoulder"
- "Sarah's hamstring is bothering her again"

**AI Prompt Instruction**:
> Physical injuries, knocks, strains (PLAYER-SPECIFIC, set severity)

**v1 Equivalent**: `injury` (existed)

---

### **2. `skill_rating` - Numeric Skill Ratings**

**Scope**: Player-specific
**What It Captures**: Explicit numeric ratings or scores for specific skills
**Special Metadata**:
- `skillName`: String (e.g., "hand_pass", "tackling", "dribbling")
- `skillRating`: Number 1-5
- `sentiment`: Usually `positive` or `neutral`

**Examples**:
- "I'd give Clodagh's hand_pass a 4 out of 5"
- "Sinead's tackling is about a 3, improving"
- "Give that a solid 5 for teamwork"

**AI Prompt Instruction**:
> Specific numeric rating/score for a skill (PLAYER-SPECIFIC, set skillName + skillRating 1-5)

**v1 Equivalent**: `skill_rating` (existed)

---

### **3. `skill_progress` - General Skill Improvement**

**Scope**: Player-specific
**What It Captures**: General skill improvement observations without specific numeric ratings
**Special Metadata**:
- `sentiment`: Usually `positive`

**Examples**:
- "Sarah's tackling has really improved"
- "His passing is getting much better"
- "She's making great progress on her weak foot"

**AI Prompt Instruction**:
> General skill improvement without numbers (PLAYER-SPECIFIC)

**v1 Equivalent**: `skill_progress` (existed)

---

### **4. `behavior` - Attitude & Discipline**

**Scope**: Player-specific
**What It Captures**: Attitude, effort, teamwork, discipline, work ethic
**Special Metadata**:
- `sentiment`: Can be `positive`, `negative`, or `concerned`

**Examples**:
- "Great effort from the new lad today"
- "Emma showed brilliant leadership at training"
- "Needs to work on his attitude when things don't go his way"

**AI Prompt Instruction**:
> Attitude, effort, teamwork, discipline (PLAYER-SPECIFIC)

**v1 Equivalent**: `behavior` (existed)

---

### **5. `performance` - Match/Training Performance**

**Scope**: Player-specific
**What It Captures**: Overall performance observations in matches or training
**Special Metadata**:
- `sentiment`: Can be `positive`, `neutral`, or `negative`

**Examples**:
- "Ella was outstanding in the match"
- "Solid performance from Michael at centre-back"
- "Struggled a bit today, but gave 100%"

**AI Prompt Instruction**:
> Match/training performance observations (PLAYER-SPECIFIC)

**v1 Equivalent**: `performance` (existed)

---

### **6. `attendance` - Presence/Absence**

**Scope**: Player-specific
**What It Captures**: Attendance at sessions, matches, or events
**Special Metadata**:
- `sentiment`: `negative` for absences, `positive` for consistent attendance

**Examples**:
- "Aoife missed training again"
- "Perfect attendance from John this month"
- "Wasn't at the match on Saturday"

**AI Prompt Instruction**:
> Presence/absence at sessions (PLAYER-SPECIFIC)

**v1 Equivalent**: `attendance` (existed)

---

### **7. `wellbeing` - Mental Health & Emotional State** ⭐ NEW in v2

**Scope**: Player-specific
**What It Captures**: Mental health, stress, anxiety, emotional state, mood
**Special Metadata**:
- `severity`: `low` | `medium` | `high` | `critical`
- `sentiment`: Usually `concerned` or `negative`

**Examples**:
- "Saoirse seemed anxious before the game"
- "Noticed Emma looking stressed lately"
- "He mentioned feeling overwhelmed with schoolwork"

**AI Prompt Instruction**:
> Mental health, stress, anxiety, emotional state (PLAYER-SPECIFIC, set severity)

**v1 Equivalent**: None (new category)

**Why Added**: Critical for safeguarding and player welfare. Coaches often observe mental health indicators that need tracking.

---

### **8. `recovery` - Rehab Progress & Return-to-Play** ⭐ NEW in v2

**Scope**: Player-specific
**What It Captures**: Rehabilitation progress, return-to-play status, recovery updates
**Special Metadata**:
- `sentiment`: Usually `positive` or `neutral`

**Examples**:
- "Niamh's ankle is healing well, should be back next week"
- "John finished his first full training session post-injury"
- "Still on light duties but progressing well"

**AI Prompt Instruction**:
> Rehab progress, return-to-play status (PLAYER-SPECIFIC, distinct from initial injury)

**v1 Equivalent**: None (new category)

**Why Added**: Distinct from initial injury reports. Tracks rehabilitation journey and clearance status.

---

### **9. `development_milestone` - Achievements & Selections** ⭐ NEW in v2

**Scope**: Player-specific
**What It Captures**: Achievements, selections (county/regional panels), personal bests, awards
**Special Metadata**:
- `sentiment`: `positive`

**Examples**:
- "Clodagh made the county panel"
- "Sarah got Player of the Match on Saturday"
- "John hit a personal best in his sprint time"

**AI Prompt Instruction**:
> Achievements, selections, personal bests (PLAYER-SPECIFIC)

**v1 Equivalent**: None (new category)

**Why Added**: Important for tracking player progression and recognition moments. Useful for player passports and parent communications.

---

### **10. `physical_development` - Growth & Conditioning** ⭐ NEW in v2

**Scope**: Player-specific
**What It Captures**: Growth spurts, conditioning improvements, fitness benchmarks, physical maturation
**Special Metadata**:
- `sentiment`: Usually `neutral` or `positive`

**Examples**:
- "Big growth spurt for the Doyle lad"
- "Emma's fitness levels have really improved"
- "Noticed he's gotten much faster over the summer"

**AI Prompt Instruction**:
> Growth spurts, conditioning, fitness benchmarks (PLAYER-SPECIFIC)

**v1 Equivalent**: None (new category)

**Why Added**: Physical development is crucial for youth sports. Helps track maturation and adjust training load.

---

### **11. `parent_communication` - Things to Discuss with Parents** ⭐ NEW in v2

**Scope**: Player-specific
**What It Captures**: Notes about topics that need parent communication or follow-up
**Special Metadata**:
- `recommendedAction`: Often populated with suggested action

**Examples**:
- "Need to chat with Ella's mam about the physio"
- "Should let Sarah's parents know she's ready to play up"
- "Discuss equipment needs with John's dad"

**AI Prompt Instruction**:
> Things to discuss with parents (PLAYER-SPECIFIC)

**v1 Equivalent**: None (new category)

**Why Added**: Helps coaches track parent communication needs. Critical for maintaining coach-parent relationships.

---

### **12. `tactical` - Position Changes & Formations** ⭐ NEW in v2

**Scope**: Player-specific OR Team-wide
**What It Captures**: Position changes, formations, role assignments, tactical adjustments
**Special Metadata**:
- Can be associated with either a player or a team
- `sentiment`: Usually `neutral`

**Examples**:
- "Moving Sinead to centre-back"
- "Trying the new 4-3-3 formation next match"
- "John to play sweeper role going forward"

**AI Prompt Instruction**:
> Position changes, formations, role assignments (PLAYER or TEAM)

**v1 Equivalent**: None (new category)

**Why Added**: Tactical decisions are important coaching notes that weren't captured before. Can apply to individuals or whole teams.

---

### **13. `team_culture` - Team Morale & Collective Behavior**

**Scope**: Team-wide (no specific player)
**What It Captures**: Team morale, collective behavior, group dynamics, team spirit
**Special Metadata**:
- `sentiment`: Can be `positive`, `negative`, or `neutral`
- No player association - this is team-level

**Examples**:
- "Great spirit in training tonight"
- "Team cohesion is really building"
- "Noticed some cliques forming, need to address"

**AI Prompt Instruction**:
> Team morale, collective behavior (TEAM-WIDE, no specific player)

**v1 Equivalent**: `team_culture` (existed)

---

### **14. `todo` - Action Items for Coaches**

**Scope**: Coach-specific (no player)
**What It Captures**: Action items, equipment needs, scheduling tasks, administrative to-dos
**Special Metadata**:
- `resolvedAssigneeUserId`: Which coach is assigned (if identifiable)
- `resolvedAssigneeName`: Coach name

**Examples**:
- "I need to book the pitch for Saturday"
- "Order new training bibs"
- "Schedule parent meeting for next week"

**AI Prompt Instruction**:
> Action items for coaches (COACH, no player)

**v1 Equivalent**: `todo` (existed)

**Assignment Rules**:
- First-person pronouns ("I need to", "I'll") → Assign to recording coach
- Specific coach name ("John should") → Match to coaches list
- Generic ("we need to", "someone should") → Leave unassigned

---

### **15. `session_plan` - Training Focus & Drill Ideas** ⭐ NEW in v2

**Scope**: Team-wide or No entity
**What It Captures**: Training focus areas, drill ideas, session planning notes
**Special Metadata**:
- May or may not be associated with a team
- `sentiment`: Usually `neutral`

**Examples**:
- "Focus on tackling drills next session"
- "Need to work on set pieces this week"
- "Plan some conditioning work for Friday"

**AI Prompt Instruction**:
> Training focus areas, drill ideas (TEAM or NONE)

**v1 Equivalent**: None (new category)

**Why Added**: Coaches often plan future sessions during voice notes. These are valuable for session planning tools.

---

## Category Comparison: v1 vs v2

### Categories in v1 (7 total)
1. injury
2. skill_rating
3. skill_progress
4. behavior
5. performance
6. attendance
7. team_culture
8. todo

### New Categories in v2 (8 added)
9. **wellbeing** - Mental health tracking
10. **recovery** - Rehabilitation progress
11. **development_milestone** - Achievements
12. **physical_development** - Growth & conditioning
13. **parent_communication** - Parent follow-up notes
14. **tactical** - Tactical decisions
15. **session_plan** - Training planning

### Total: 15 Categories in v2

---

## How Insights Are Gathered

### 1. Pipeline Overview

```
Voice Note (WhatsApp/App)
         ↓
    Transcription (Whisper)
         ↓
    Claims Extraction (GPT-4 with Structured Output)
         ↓
    Entity Resolution (Player/Team Matching)
         ↓
    Insight Drafts (Confirmation Workflow)
         ↓
    Applied to Player Records
```

### 2. AI Extraction Process

**Technology**: OpenAI GPT-4 with Structured Output (Zod schema)

**Location**: `packages/backend/convex/actions/claimsExtraction.ts`

**Key Characteristics**:
- **Atomic Claims**: Each claim = ONE observation about ONE entity
- **Best-Effort Resolution**: AI attempts to match player names to roster
- **Confidence Scoring**: Each claim has `extractionConfidence` (0-1)
- **Entity Mentions**: Tracks all entities mentioned in each claim

### 3. System Prompt Structure

The AI is given:
1. **Category Definitions**: All 15 categories with descriptions
2. **Team Roster**: Current players with names, IDs, age groups
3. **Team List**: Coach's assigned teams
4. **Fellow Coaches**: For TODO assignment
5. **Transcript**: Full voice note text

### 4. Structured Output Schema

```typescript
{
  summary: string,              // Overall voice note summary
  claims: [
    {
      sourceText: string,       // Exact transcript quote
      topic: enum[15],          // One of 15 categories
      title: string,
      description: string,
      recommendedAction?: string,
      timeReference?: string,   // "today", "yesterday", "last week"

      entityMentions: [
        {
          mentionType: "player_name" | "team_name" | "group_reference" | "coach_name",
          rawText: string,
          position: number
        }
      ],

      // Topic-specific metadata
      severity?: "low" | "medium" | "high" | "critical",  // For injury/wellbeing
      sentiment?: "positive" | "neutral" | "negative" | "concerned",
      skillName?: string,                                  // For skill_rating
      skillRating?: number,                                // 1-5 for skill_rating

      // AI's best guess for player resolution
      playerId?: string,
      playerName?: string,
      teamId?: string,
      teamName?: string,
      assigneeUserId?: string,  // For todos
      assigneeName?: string,

      extractionConfidence: number  // 0-1
    }
  ]
}
```

### 5. Player Matching Process

**Two-Stage Matching**:

#### Stage 1: Deterministic Match
1. Check AI's suggested `playerId` against roster
2. Exact name match (case-insensitive)
3. First name + last name concatenation
4. First name only (if unambiguous - only 1 match)
5. Partial name match (if unambiguous - only 1 match)

#### Stage 2: Fuzzy Fallback
If no deterministic match:
1. Call `findSimilarPlayers` with Levenshtein distance algorithm
2. Match Irish names with phonetic variations
   - "Seán" → "Shawn", "Sean"
   - "Niamh" → "Neeve", "Neve"
   - "Aoife" → "Efa", "Eefa"
3. Accept if similarity score ≥ 0.85 (85% match)

**Location**: `packages/backend/convex/actions/claimsExtraction.ts` lines 226-362

### 6. Entity Resolution & Disambiguation

**For Ambiguous Mentions**:
- Status set to `needs_disambiguation`
- Multiple candidates stored with scores
- Coach presented with disambiguation UI
- Can select correct player or group reference

**For Group References**:
- "the twins" → Requires coach to identify which twins
- "the midfielders" → Can expand to multiple players
- "the new lads" → Requires clarification

---

## Schema: voiceNoteClaims Table

**Location**: `packages/backend/convex/schema.ts` lines 4238-4328

```typescript
voiceNoteClaims: defineTable({
  claimId: v.string(),                    // UUID identifier
  artifactId: v.id("voiceNoteArtifacts"), // Source voice note artifact

  // Source context
  sourceText: v.string(),                 // Exact transcript quote
  timestampStart: v.optional(v.number()), // Audio timestamp (seconds)
  timestampEnd: v.optional(v.number()),

  // Categorization
  topic: v.union(/* 15 literals */),      // See list above
  title: v.string(),
  description: v.string(),
  recommendedAction: v.optional(v.string()),
  timeReference: v.optional(v.string()),

  // Entity mentions (raw)
  entityMentions: v.array(v.object({
    mentionType: "player_name" | "team_name" | "group_reference" | "coach_name",
    rawText: v.string(),
    position: v.number()
  })),

  // Resolved entities (best-effort)
  resolvedPlayerIdentityId: v.optional(v.id("playerIdentities")),
  resolvedPlayerName: v.optional(v.string()),
  resolvedTeamId: v.optional(v.string()),
  resolvedTeamName: v.optional(v.string()),
  resolvedAssigneeUserId: v.optional(v.string()),
  resolvedAssigneeName: v.optional(v.string()),

  // Metadata
  severity: v.optional("low" | "medium" | "high" | "critical"),
  sentiment: v.optional("positive" | "neutral" | "negative" | "concerned"),
  skillName: v.optional(v.string()),
  skillRating: v.optional(v.number()),  // 1-5

  extractionConfidence: v.number(),     // 0-1
  organizationId: v.string(),
  coachUserId: v.string(),

  // Processing status
  status: "extracted" | "resolving" | "resolved" | "needs_disambiguation" |
          "merged" | "discarded" | "failed",

  createdAt: v.number(),
  updatedAt: v.number()
})
```

**Indexes**:
- `by_artifactId` - All claims for a voice note
- `by_artifactId_and_status` - Claims by status
- `by_claimId` - Unique claim lookup
- `by_topic` - Query by category
- `by_org_and_coach` - Coach's claims
- `by_org_and_status` - Organization claims by status
- `by_resolvedPlayerIdentityId` - All claims for a player
- `by_coachUserId` - All claims by a coach

---

## Category-Specific Extraction Rules

### Severity Classification (injury/wellbeing only)
- **low**: Minor issue, can continue playing
- **medium**: Needs attention but not urgent
- **high**: Needs immediate attention
- **critical**: Medical emergency, stop activity

### Sentiment Classification (all categories)
- **positive**: Good news, improvement, praise
- **neutral**: Factual observation, no emotional tone
- **negative**: Bad news, decline, criticism
- **concerned**: Worry, uncertainty about the situation

### Title Formatting Rules
- **Player-specific topics**: Always include player name
  - Format: `"{Player Name}'s {Skill/Topic} {Action/Status}"`
  - Example: "Niamh's Tackling Improvement"
- **Team-wide topics**: Use team name if available, otherwise "Team" prefix
- **TODO topics**: Start with action verb
  - Example: "Order New Equipment", "Schedule Parent Meeting"
- **SESSION_PLAN**: Start with "Plan:" or describe focus area

---

## Access & Querying

### Backend Queries

**Get claims for an artifact**:
```typescript
api.models.voiceNoteClaims.getClaimsByArtifact({ artifactId })
```

**Get claims by status**:
```typescript
api.models.voiceNoteClaims.getClaimsByArtifactAndStatus({
  artifactId,
  status: "needs_disambiguation"
})
```

**Get all claims for a coach**:
```typescript
api.models.voiceNoteClaims.getClaimsByOrgAndCoach({
  organizationId,
  coachUserId,
  limit: 50
})
```

### Frontend Viewer

**Claims Viewer Debug Page**: `/platform/v2-claims`

Shows:
- Recent artifacts with their claims
- Topic breakdown with color-coded badges
- Entity resolution status
- Confidence scores
- Player matching results

---

## Feature Flags

**Claims extraction is gated by**:
```typescript
shouldUseV2Pipeline(organizationId, userId)
```

**When enabled**:
- Voice notes → create v2 artifacts
- Transcripts → extract claims
- Claims → create insight drafts
- v1 `buildInsights` skipped

**When disabled**:
- Falls back to v1 pipeline
- No claims extraction
- Original insights array in voiceNote

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `packages/backend/convex/schema.ts` (lines 4238-4328) | voiceNoteClaims table definition |
| `packages/backend/convex/actions/claimsExtraction.ts` | Main extraction logic with GPT-4 |
| `packages/backend/convex/models/voiceNoteClaims.ts` | CRUD operations for claims |
| `packages/backend/convex/lib/coachContext.ts` | Roster gathering for AI prompt |
| `apps/web/src/app/platform/v2-claims/page.tsx` | Claims viewer UI |
| `docs/architecture/voice-notes-pipeline-v2.md` | v2 architecture overview |
| `scripts/ralph/prds/voice-gateways-v2/context/PHASE4_CLAIMS_EXTRACTION.md` | Implementation guide |

---

## Implementation Status

**Phase 4 (Claims Extraction)**: ✅ COMPLETE
- Schema added
- Extraction action implemented
- Player matching with fuzzy fallback
- Claims viewer debug page

**Phase 5 (Entity Resolution)**: ✅ COMPLETE
- Disambiguation UI
- Multi-candidate resolution
- Group reference handling

**Phase 6 (Drafts & Confirmation)**: ✅ COMPLETE
- Insight drafts generation
- Confirmation workflow
- Auto-apply based on trust level

**Phase 7A-7D (Migration & Cleanup)**: 🚧 IN PROGRESS
- Wire in-app notes to v2
- Complete v1 → v2 bridge
- Retire v1 processing

---

## Integration Status: Auto-Apply & Application Logic

### Auto-Apply Logic Integration

**Location**: `packages/backend/convex/actions/draftGeneration.ts` lines 86-131

The auto-apply logic in the v2 pipeline is **NOT equally integrated** across all 15 categories. Here's the breakdown:

#### ✅ Fully Integrated - Can Auto-Apply (5 categories)

These categories can automatically apply without confirmation if coach trust level and preferences allow:

| Category | Preference Check | Trust Level Required | Notes |
|----------|-----------------|---------------------|-------|
| `skill_rating` | `prefs.skills` | TL2+ | Numeric skill ratings |
| `skill_progress` | `prefs.skills` | TL2+ | General skill improvement |
| `attendance` | `prefs.attendance` | TL2+ | Presence/absence tracking |
| `development_milestone` | `prefs.goals` | TL2+ | Achievements, selections |
| `performance` | `prefs.performance` | TL2+ | Match/training performance |

**Auto-Apply Requirements**:
1. Coach trust level ≥ 2 (or preferred level if lower)
2. Overall confidence ≥ threshold (default 0.85)
3. Category preference enabled in `coachTrustLevels.insightAutoApplyPreferences`
4. NOT a sensitive category

#### 🔒 Always Require Confirmation - Sensitive (3 categories)

These categories are flagged as `SENSITIVE_TYPES` and **NEVER auto-apply**, regardless of trust level:

| Category | Reason | Code Location |
|----------|--------|---------------|
| `injury` | Safeguarding concern, requires verification | draftGeneration.ts:17 |
| `wellbeing` | Mental health sensitive, requires review | draftGeneration.ts:17 |
| `recovery` | Medical status, requires verification | draftGeneration.ts:17 |

**Rationale**: These categories involve player safety and wellbeing, so human review is mandatory.

#### ⚠️ NOT Integrated - No Auto-Apply Support (7 categories)

These categories have **NO preference check** in `checkAutoApplyAllowed()` and always require manual confirmation:

| Category | Current Behavior | Recommended Preference | Rationale for Recommendation |
|----------|-----------------|------------------------|----------------------------|
| `behavior` | Always manual | Add `prefs.behavior` | Could auto-apply positive behavior notes at TL2+ |
| `physical_development` | Always manual | Add `prefs.physicalDevelopment` | Non-sensitive tracking data, could auto-apply at TL2+ |
| `parent_communication` | Always manual | Always manual (correct) | Requires coach review before parent contact |
| `tactical` | Always manual | Add `prefs.tactical` | Position/formation changes could auto-apply at TL3 |
| `team_culture` | Always manual | Add `prefs.teamCulture` | Non-player-specific, could auto-apply at TL2+ |
| `todo` | Always manual | Always manual (correct) | Action items should be explicitly acknowledged |
| `session_plan` | Always manual | Always manual (correct) | Training plans require coach review |

**Code Gap** (lines 86-105):
```typescript
function checkAutoApplyAllowed(
  topic: string,
  prefs: TrustLevelData["insightAutoApplyPreferences"]
): boolean {
  if (!prefs) return false;

  if (topic === "skill_rating" || topic === "skill_progress") return prefs.skills;
  if (topic === "attendance") return prefs.attendance;
  if (topic === "development_milestone") return prefs.goals;
  if (topic === "performance") return prefs.performance;

  // ⚠️ All other topics return false - no preference check
  return false;
}
```

### Type-Specific Application Logic

**Location**: `packages/backend/convex/models/insightDrafts.ts` `applyDraft()` (lines 464-625)

Currently, ALL 15 categories use **generic application logic**:
1. Create `voiceNoteInsight` record
2. Update `voiceNotes.insights[]` embedded array (backward compatibility)
3. Schedule parent summary generation (if player-specific)
4. Create audit trail in `autoAppliedInsights`

**No type-specific application** exists for any category.

#### Recommended Type-Specific Application Logic

| Category | Current | Recommended Enhancement | Target Table/Action |
|----------|---------|------------------------|---------------------|
| `injury` | Generic insight | Create entry in `injuries` table | Link to injury tracking system |
| `wellbeing` | Generic insight | Flag in wellbeing dashboard | Create alert for safeguarding officer |
| `recovery` | Generic insight | Update linked injury record | Update `injuries.status` to "recovering" |
| `skill_rating` | Generic insight | Update `skillAssessments` table | Store numeric rating with timestamp |
| `skill_progress` | Generic insight | Create development note | Link to player passport skill section |
| `behavior` | Generic insight | Add to behavior log | Player passport behavior timeline |
| `performance` | Generic insight | Add to performance history | Player passport performance section |
| `attendance` | Generic insight | Update attendance record | Link to session attendance tracking |
| `development_milestone` | Generic insight | Add to achievements list | Player passport milestones section |
| `physical_development` | Generic insight | Add to growth tracking | Player passport physical development |
| `parent_communication` | Generic insight | Create parent follow-up task | Task queue for coach dashboard |
| `tactical` | Generic insight | Update player/team tactical profile | Store position preferences, formation notes |
| `team_culture` | Generic insight | Add to team notes | Team dashboard culture section |
| `todo` | Generic insight + Coach task | ✅ **NOW IMPLEMENTED**: Creates entry in `coachTasks` table | Coach dashboard task list |
| `session_plan` | Generic insight | Add to training plan library | Link to session planning tools |

**Current State**: All insights are stored generically in `voiceNoteInsights` table. No direct updates to domain-specific tables (injuries, skillAssessments, etc.).

**Implication**: Insights exist but may not populate the relevant UI sections (injury cards, skill ratings, attendance logs) without additional data bridging.

### Recommendations for Full Integration

#### Phase A: Complete Auto-Apply Preferences (High Priority)

Add preference support for 4 categories that would benefit from auto-apply:

1. **Add to `coachTrustLevels.insightAutoApplyPreferences` schema**:
   ```typescript
   insightAutoApplyPreferences: {
     skills: boolean,          // ✅ Exists (skill_rating, skill_progress)
     attendance: boolean,      // ✅ Exists
     goals: boolean,           // ✅ Exists (development_milestone)
     performance: boolean,     // ✅ Exists
     behavior: boolean,        // ❌ ADD THIS
     physicalDevelopment: boolean,  // ❌ ADD THIS
     tactical: boolean,        // ❌ ADD THIS
     teamCulture: boolean      // ❌ ADD THIS
   }
   ```

2. **Update `checkAutoApplyAllowed()` in `draftGeneration.ts`**:
   ```typescript
   if (topic === "behavior") return prefs.behavior;
   if (topic === "physical_development") return prefs.physicalDevelopment;
   if (topic === "tactical") return prefs.tactical;
   if (topic === "team_culture") return prefs.teamCulture;
   ```

3. **Keep manual-only for**: `parent_communication`, `todo`, `session_plan` (correct as-is)

#### Phase B: Type-Specific Application Logic (Medium Priority)

Highest impact type-specific applications to implement:

**Priority 1 (Immediate Value)**:
- **`injury`** → Create/update `injuries` table entry
- **`skill_rating`** → Create/update `skillAssessments` entry
- **`attendance`** → Link to attendance tracking
- ~~**`todo`** → Create coach task~~ ✅ **COMPLETED** (Feb 9, 2026)

**Priority 2 (Enhanced Features)**:
- **`wellbeing`** → Safeguarding dashboard alert
- **`recovery`** → Update linked injury status
- **`development_milestone`** → Player passport achievements
- **`tactical`** → Player position/role preferences

**Priority 3 (Nice to Have)**:
- **`physical_development`** → Growth tracking charts
- **`parent_communication`** → Parent contact task queue
- **`team_culture`** → Team dashboard notes
- **`session_plan`** → Training plan library

#### Phase C: UI Integration (Medium Priority)

Ensure all 15 categories display properly in:
- Coach dashboard insights view
- Player passport sections
- Parent dashboard (filtered appropriately)
- Claims viewer (`/platform/v2-claims`)

### Current Limitations

**As of February 9, 2026**:

1. **7 categories cannot auto-apply** even at high trust levels (behavior, physical_development, tactical, team_culture, todo, session_plan, parent_communication)

2. **No type-specific application** - all insights stored generically without updating domain tables

3. **UI may not reflect insights** - insights exist in `voiceNoteInsights` but may not populate injury cards, skill assessments, attendance logs, etc. without additional bridging

4. **Parent communication not automated** - `parent_communication` insights don't create follow-up tasks

5. **Session plans not integrated** - `session_plan` insights don't feed into session planning tools

---

## Summary

The v2 voice notes pipeline extracts **15 distinct categories** of insights from coach voice notes:

**Player-Specific (11)**:
1. injury
2. skill_rating
3. skill_progress
4. behavior
5. performance
6. attendance
7. wellbeing
8. recovery
9. development_milestone
10. physical_development
11. parent_communication

**Team/Coach (4)**:
12. tactical (can be player or team)
13. team_culture
14. todo
15. session_plan

Each category has specific metadata fields (severity, sentiment, skill ratings) and is extracted using GPT-4 structured output with best-effort player matching and fuzzy name resolution.

The expansion from 7 to 15 categories provides significantly richer insight extraction, particularly around player welfare (wellbeing, recovery), development tracking (milestones, physical development), and operational planning (parent communication, tactical, session planning).

### Integration Completeness

**Fully Integrated** (Extraction, Storage, Drafts): All 15 categories ✅

**Auto-Apply Logic**:
- Fully integrated: 5 categories (skill_rating, skill_progress, attendance, development_milestone, performance)
- Always sensitive: 3 categories (injury, wellbeing, recovery)
- Not integrated: 7 categories (behavior, physical_development, parent_communication, tactical, team_culture, todo, session_plan)

**Type-Specific Application**: None (all use generic voiceNoteInsights storage)

See "Integration Status: Auto-Apply & Application Logic" section above for detailed recommendations on completing the integration.

---

**Document Version**: 1.1
**Last Updated**: February 9, 2026
**Maintained By**: Architecture team
**Changelog**:
- v1.1 (Feb 9): Added integration status analysis, auto-apply gaps, type-specific application recommendations
- v1.0 (Feb 9): Initial comprehensive category documentation
