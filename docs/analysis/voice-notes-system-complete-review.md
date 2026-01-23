# Voice Notes System - Complete Holistic Review
**Date:** 2026-01-23
**Status:** Fixed - Auto-assignment removed

---

## Executive Summary

**ISSUE IDENTIFIED:** Team insights were being auto-assigned to teams even when no explicit team name was mentioned in the voice note, contradicting the AI's explicit instructions.

**ROOT CAUSE:** Auto-assignment logic in `actions/voiceNotes.ts` (lines 574-590) that assigned team insights to a coach's single team automatically.

**FIX APPLIED:** Removed auto-assignment block. Team insights now ONLY assigned when AI explicitly matches team name from voice note.

---

## Complete System Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ VOICE NOTE RECORDING                                         │
│ - Audio upload OR typed text                                │
│ - Coach selects: training/match/general                     │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│ TRANSCRIPTION (if audio)                                     │
│ - OpenAI Whisper API                                         │
│ - Updates: transcription, transcriptionStatus               │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│ AI INSIGHTS EXTRACTION                                       │
│ - Model: gpt-4o (configurable)                              │
│ - Input: transcription + player roster + team roster        │
│ - Output: summary + insights[] with structured data         │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│ INSIGHT CLASSIFICATION                                       │
│                                                              │
│ For PLAYER insights:                                        │
│   - AI matches playerName → playerId                        │
│   - Fallback: Code matching if AI fails                     │
│   - Result: playerIdentityId set                            │
│                                                              │
│ For TEAM insights (team_culture):                           │
│   ✅ CORRECT BEHAVIOR (after fix):                          │
│   - AI ONLY sets teamId/teamName if EXPLICIT team mentioned │
│   - Examples: "U18 Female", "Senior Women"                  │
│   - Generic refs ("the team") → teamId/teamName = NULL      │
│   ❌ BROKEN BEHAVIOR (before fix):                          │
│   - Code auto-assigned if coach had 1 team                  │
│   - Overrode AI's NULL decision                             │
│                                                              │
│ For TODO insights:                                          │
│   - AI matches "I need to" → assigns to recording coach     │
│   - Coach names mentioned → matches from roster             │
│   - Generic → assigneeUserId = NULL                         │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│ INSIGHTS TAB (Frontend Display)                             │
│                                                              │
│ Categorizes insights into:                                  │
│ 1. Matched (has playerIdentityId) → Can apply directly      │
│ 2. Unmatched (has playerName, no ID) → Needs assignment     │
│ 3. Team insights (team_culture/todo) → Can apply if teamId  │
│ 4. Uncategorized (no player, no category) → Needs classify  │
│                                                              │
│ Badge Display Logic:                                        │
│ - Has playerIdentityId → "Player Name" (blue)               │
│ - Has playerName only → "⚠️ Name (not matched)" (amber)     │
│ - team_culture with teamName → "Team: Team Name" (purple)   │
│ - team_culture without teamName → "Team" (purple) ← USER SAW│
│ - todo → "TODO" (green)                                      │
│ - Uncategorized → "⚠️ Needs classification" (orange)        │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│ MANUAL ACTIONS (if needed)                                  │
│                                                              │
│ For unmatched players:                                      │
│   - assignPlayerToInsight() → sets playerIdentityId         │
│                                                              │
│ For uncategorized insights:                                 │
│   - classifyInsight() → sets category + teamId/assigneeId   │
│                                                              │
│ For team insights without teamId:                           │
│   - classifyInsight() with teamId → sets teamId/teamName    │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│ APPLY INSIGHT (updateInsightStatus)                         │
│                                                              │
│ For PLAYER insights (has playerIdentityId):                 │
│   - injury → playerInjuries table                           │
│   - skill_rating → sportPassports.ratings                   │
│   - skill_progress → passportGoals table                    │
│   - behavior/performance → sportPassports.coachNotes        │
│                                                              │
│ For TEAM insights (has teamId + teamName):                  │
│   - Creates record in teamObservations table                │
│   - Links back to voice note                                │
│                                                              │
│ For TODO insights (has assigneeUserId):                     │
│   - Creates coachTask record                                │
│   - Links task to insight                                   │
│                                                              │
│ ❌ BLOCKS if:                                               │
│   - Team insight without teamId                             │
│   - TODO without assigneeUserId                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Schema Deep Dive

### voiceNotes Table

```typescript
{
  orgId: string,
  coachId: string,
  date: string (ISO),
  type: "training" | "match" | "general",

  // Audio
  audioStorageId?: Id<"_storage">,

  // Transcription
  transcription?: string,
  transcriptionStatus?: "pending" | "processing" | "completed" | "failed",
  transcriptionError?: string,

  // Insights
  summary?: string,
  insights: Array<{
    id: string,                              // Unique insight ID

    // PLAYER-SPECIFIC DATA
    playerIdentityId?: Id<"playerIdentities">, // Matched player
    playerName?: string,                      // Player name (even if not matched)

    // INSIGHT CONTENT
    title: string,
    description: string,
    category?: string,                        // See categories below
    recommendedUpdate?: string,

    // STATUS
    status: "pending" | "applied" | "dismissed",
    appliedDate?: string,

    // TEAM DATA ✅ YES, STORED IN INSIGHTS COLUMN
    teamId?: string,           // Better Auth team ID
    teamName?: string,         // Team name for display

    // TODO DATA
    assigneeUserId?: string,   // Assigned coach ID
    assigneeName?: string,     // Assigned coach name
    linkedTaskId?: Id<"coachTasks">, // Created task ID
  }>,
  insightsStatus?: "pending" | "processing" | "completed" | "failed",
  insightsError?: string,
}
```

**Indexes:**
- `by_orgId` - All notes for organization
- `by_orgId_and_coachId` - All notes for specific coach

### teamObservations Table

Created when team insights are applied:

```typescript
{
  organizationId: string,
  teamId: string,              // Better Auth team ID
  teamName: string,            // Denormalized

  source: "voice_note" | "manual",
  voiceNoteId: Id<"voiceNotes">,
  insightId: string,

  coachId: string,
  coachName: string,

  title: string,
  description: string,
  category: string,
  dateObserved: string,
  createdAt: number,
}
```

**Indexes:**
- `by_organizationId` - All observations for org
- `by_teamId` - All observations for team
- `by_organizationId_and_teamId` - Combined
- `by_voiceNoteId` - Link back to source

---

## Categories & Routing

### Player-Specific Categories
Must have `playerIdentityId` to apply:

| Category | Routes To | Notes |
|----------|-----------|-------|
| `injury` | `playerInjuries` table | Creates injury record |
| `skill_rating` | `sportPassports.ratings` | Updates numeric skill rating (1-5) |
| `skill_progress` | `passportGoals` table | Creates development goal |
| `behavior` | `sportPassports.coachNotes` | Appends to coach notes |
| `performance` | `sportPassports.coachNotes` | Appends to coach notes |
| `attendance` | `sportPassports.coachNotes` | Appends to coach notes |

### Team-Level Categories
Must have `teamId` (for team_culture) or `assigneeUserId` (for todo):

| Category | Routes To | Requires |
|----------|-----------|----------|
| `team_culture` | `teamObservations` table | `teamId` + `teamName` |
| `todo` | `coachTasks` table | `assigneeUserId` + `assigneeName` |

---

## AI Prompt Analysis

### Player Matching Instructions

The AI receives:
```json
// Player roster
[
  {
    "id": "mx7fsvhh9m9v8qayeetcjvn5g17y95dv",
    "firstName": "Clodagh",
    "lastName": "Barlow",
    "fullName": "Clodagh Barlow",
    "ageGroup": "U18",
    "sport": "GAA Football"
  },
  // ... more players
]
```

**Instructions:**
- Match voice note names to `fullName` or `firstName`
- Copy exact `id` value to `playerId` in response
- If no match → `playerId: null`, but still include `playerName`

**Examples provided:**
- "Clodagh Barlow injured her hand" → `playerId: "mx7fsvhh..."`
- "great effort from Clodagh" → `playerId: "mx7fsvhh..."`

### Team Matching Instructions ✅ CORRECT

The AI receives:
```json
// Coach's teams
[
  {"id": "js7f960bfc0ck66cb29y380m8h7y86j3", "name": "U18 Female", "ageGroup": "U18", "sport": "GAA Football"},
  {"id": "js7f9xygdgpyqe5xp2dj93qdr57y97pt", "name": "Senior Women", "ageGroup": "Senior", "sport": "GAA Football"}
]
```

**Instructions (lines 480-493):**

> ONLY match team_culture insights to a team if the EXACT team name is mentioned
>
> DO NOT infer or guess which team based on context like "the girls", "the lads", "the team"
>
> Examples of EXPLICIT matches:
> - "The U18 Female team showed great spirit" → teamId="abc123", teamName="U18 Female"
> - "Senior Women played well today" → teamId="xyz789", teamName="Senior Women"
>
> Examples where you should leave NULL:
> - "The girls worked hard tonight" → teamId=null, teamName=null
> - "Great team spirit today" → teamId=null, teamName=null
> - "The senior team played well" → teamId=null, teamName=null (not exact)
>
> IMPORTANT: When in doubt, leave NULL and let the coach classify manually

**This is EXACTLY RIGHT!** The AI is instructed to be conservative.

---

## The Bug (Now Fixed)

### Before Fix

**File:** `packages/backend/convex/actions/voiceNotes.ts` (lines 574-590)

```typescript
// BROKEN CODE (removed):
if (
  insight.category === "team_culture" &&
  !teamId &&
  teamsList.length === 1  // ← Auto-assign if coach has 1 team
) {
  teamId = teamsList[0].id;
  teamName = teamsList[0].name;
  console.log(
    `[Team Auto-Assignment] Assigned team_culture insight to "${teamName}"`
  );
}
```

**What happened:**
1. User says: "The team showed great engagement"
2. AI correctly categorizes as `team_culture`
3. AI correctly leaves `teamId=null` (no explicit team mentioned)
4. Code sees: `team_culture` + `null` teamId + coach has 1 team
5. Code **AUTO-ASSIGNS** it to that team
6. UI shows: "Team: U18 Female" (even though not mentioned)

**This contradicted the AI's explicit instructions!**

### After Fix

```typescript
// FIXED CODE:
// Team assignment: Only use AI-matched teams (no auto-assignment)
// Teams should only be assigned when explicitly mentioned in the voice note
const teamId = insight.teamId ?? undefined;
const teamName = insight.teamName ?? undefined;

if (insight.category === "team_culture" && teamId && teamName) {
  console.log(
    `[Team Matching] AI matched team_culture insight to "${teamName}"`
  );
} else if (insight.category === "team_culture" && !teamId) {
  console.log(
    "[Team Classification] team_culture insight needs manual team assignment (no explicit team mentioned)"
  );
}
```

**What happens now:**
1. User says: "The team showed great engagement"
2. AI correctly categorizes as `team_culture`
3. AI correctly leaves `teamId=null`
4. Code **RESPECTS** the AI's decision
5. UI shows: "Team" (no team name) ← **Needs manual classification**
6. Coach clicks "Classify" → assigns to specific team

---

## Frontend Badge Display Logic

**File:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx` (lines 488-492)

```typescript
: insight.category === "team_culture" ? (
  <Badge className="bg-purple-100 text-purple-700 text-xs">
    {(insight as any).teamName
      ? `Team: ${(insight as any).teamName}`  // ← Has teamName
      : "Team"}                                // ← No teamName (user saw this)
  </Badge>
```

**Badge Logic Summary:**

| Condition | Badge Display | Color | Meaning |
|-----------|---------------|-------|---------|
| `playerIdentityId` exists | `[Player Name]` | Blue (secondary) | Matched to player, ready to apply |
| `playerName` only (no ID) | `⚠️ [Name] (not matched)` | Amber | AI extracted name but couldn't match |
| `team_culture` + `teamName` | `Team: [Team Name]` | Purple | AI matched explicit team mention |
| `team_culture` + no `teamName` | `Team` | Purple | Needs manual team assignment |
| `todo` | `TODO` | Green | Action item for coach |
| `todo` + `linkedTaskId` | `TODO` + `✓ Task created` | Green + Blue | Task already created |
| No category, no player | `⚠️ Needs classification` | Orange | Uncategorized insight |

---

## Manual Classification Flow

### For Team Insights Without Team

**Frontend:** Dialog in `insights-tab.tsx` (lines 916-1026)

Coach sees:
1. Insight with "Team" badge (no team name)
2. Clicks "Classify" button
3. Dialog shows team picker from coach's assigned teams
4. Selects team (e.g., "U18 Female")
5. Calls `classifyInsight()` mutation

**Backend:** `models/voiceNotes.ts` (line 1132)

```typescript
export const classifyInsight = mutation({
  args: {
    noteId, insightId, category,
    teamId?,      // ← Sets this
    teamName?,    // ← Sets this
    assigneeUserId?, assigneeName?,
    // ... other fields
  },
  handler: async (ctx, args) => {
    // Updates insight with teamId and teamName
    // If category="todo", creates coachTask
    return { success: true, category, teamName, taskId? };
  }
});
```

After classification:
- Insight updates: `teamId` and `teamName` set
- UI updates: Badge changes from "Team" to "Team: U18 Female"
- Now ready to apply

---

## Apply Flow

**Frontend:** Click "Apply" button

**Backend:** `models/voiceNotes.ts::updateInsightStatus` (line 398)

### For Team Insights (lines 765-816)

```typescript
else if (args.status === "applied" && !insight.playerIdentityId) {
  // Team-level insight
  const targetTeamId = (insight as any).teamId;
  const targetTeamName = (insight as any).teamName;

  if (targetTeamId && targetTeamName) {
    // ✅ Create team observation
    const observationId = await ctx.db.insert("teamObservations", {
      organizationId: note.orgId,
      teamId: targetTeamId,
      teamName: targetTeamName,
      source: "voice_note",
      voiceNoteId: args.noteId,
      insightId: args.insightId,
      coachId: note.coachId,
      coachName, // Fetched from Better Auth
      title: insight.title,
      description: insight.description,
      category,
      dateObserved: note.date,
      createdAt: now,
    });

    return { success: true, appliedTo: "teamObservations", recordId: observationId };
  } else {
    // ❌ Block if no teamId
    throw new Error(
      "Team insight must be assigned to a team before applying. Please classify it first."
    );
  }
}
```

**Result:**
- New record in `teamObservations` table
- Insight status → `applied`
- Visible on Team Insights page

---

## Current State Analysis

### ✅ What's Working Correctly

1. **Schema Design**
   - ✅ `teamId` and `teamName` ARE stored in insights column (schema line 1397-1398)
   - ✅ Separate `teamObservations` table for applied insights
   - ✅ Full linking back to source voice notes

2. **AI Instructions**
   - ✅ Explicit instructions to ONLY match EXACT team names
   - ✅ Conservative approach - when in doubt, leave NULL
   - ✅ Clear examples provided

3. **Frontend Display**
   - ✅ Shows "Team: [name]" when teamName exists
   - ✅ Shows "Team" when teamName is null (needs classification)
   - ✅ Classification dialog allows manual team assignment

4. **Apply Logic**
   - ✅ Blocks applying team insights without teamId
   - ✅ Creates proper teamObservations records
   - ✅ Links back to voice notes

5. **Manual Classification**
   - ✅ `classifyInsight()` mutation updates teamId/teamName
   - ✅ Can classify uncategorized insights
   - ✅ Can assign team to team_culture insights

### ❌ What Was Broken (Now Fixed)

1. **Auto-Assignment Override**
   - ❌ Was: Code auto-assigned to single team, overriding AI's NULL decision
   - ✅ Now: Respects AI's decision, requires manual classification

---

## Testing Recommendations

### Scenario 1: Explicit Team Mention
**Voice Note:** "The U18 Female team showed great spirit today"

**Expected:**
- AI extracts: `category="team_culture"`, `teamId="[id]"`, `teamName="U18 Female"`
- UI shows: Badge "Team: U18 Female" (purple)
- Apply: Creates teamObservations record immediately

### Scenario 2: Generic Team Reference (Fixed)
**Voice Note:** "The team showed great engagement during the session"

**Expected:**
- AI extracts: `category="team_culture"`, `teamId=null`, `teamName=null`
- UI shows: Badge "Team" (purple, no team name) ← **User saw this before**
- Apply blocked: "Team insight must be assigned to a team before applying"
- Action required: Coach clicks "Classify" → selects team → then applies

### Scenario 3: Ambiguous Team Reference
**Voice Note:** "The senior team played well"

**Expected:**
- AI extracts: `category="team_culture"`, `teamId=null`, `teamName=null`
  - Reason: "senior team" is not EXACT match for "Senior Women" or "Senior Men"
- UI shows: Badge "Team" (needs classification)
- Manual classification required

### Scenario 4: Multi-Team Coach
**Voice Note:** "Great team spirit today"
**Coach has:** U18 Female, U16 Female

**Before fix:**
- Would NOT auto-assign (needs `teamsList.length === 1`)
- Still required manual classification

**After fix:**
- Same behavior (no auto-assignment)
- Requires manual classification

---

## Files Inventory

### Backend Files

| File | Purpose | Lines of Interest |
|------|---------|-------------------|
| `schema.ts` | Table definitions | 1356-1416 (voiceNotes), 1422-1450 (teamObservations) |
| `actions/voiceNotes.ts` | AI processing | 225-700 (buildInsights), 409-527 (AI prompt), 574-595 (team assignment - FIXED) |
| `models/voiceNotes.ts` | CRUD operations | 398-843 (updateInsightStatus), 1132-1230 (classifyInsight) |
| `models/teamObservations.ts` | Team insights queries | All |
| `models/orgPlayerEnrollments.ts` | Player roster | 784-828 (team resolution - recently fixed) |

### Frontend Files

| File | Purpose | Key Features |
|------|---------|--------------|
| `voice-notes-dashboard.tsx` | Main page | Tab navigation |
| `components/insights-tab.tsx` | Pending insights | Badge display (488-492), Classification dialog (916-1026) |
| `components/history-tab.tsx` | Applied insights | Historical view |
| `components/parents-tab.tsx` | Parent summaries | Auto-generated summaries |
| `components/review-tab.tsx` | Injury/behavior review | Manual approval flow |
| `components/settings-tab.tsx` | Trust settings | Parent summary toggle |
| `page.tsx` | Route entry | Dashboard wrapper |

### Documentation Files

| File | Purpose |
|------|---------|
| `docs/features/voice-notes.md` | Main feature docs |
| `docs/features/team-observations-system.md` | Team insights system |
| `docs/features/team-insights-and-coach-actions-flow.md` | Original analysis |
| `docs/bugs/CRITICAL-voice-note-roster-fix-2026-01-22.md` | Player matching fix |
| `docs/bugs/voice-note-deduplication-fix.md` | Roster dedup fix |
| `docs/bugs/clodagh-matching-fix-2026-01-22.md` | AI matching improvements |

---

## Recommendations

### ✅ Current System is Correct

The system is now working as designed:

1. **AI makes conservative decisions** - Only assigns teams when explicitly mentioned
2. **Code respects AI decisions** - No overrides
3. **Manual classification available** - Coach can assign when needed
4. **Data properly structured** - teamId/teamName stored in insights
5. **Apply flow validates** - Blocks applying without required data

### 📋 Future Enhancements (Optional)

1. **Smart Team Suggestions**
   - When insight needs classification, suggest most likely team based on context
   - E.g., if most recent notes were about U18 Female, suggest that first

2. **Bulk Classification**
   - Allow classifying multiple "Team" insights to same team at once
   - Useful when coach records multiple generic team notes in one session

3. **Team Context Persistence**
   - Remember which team coach was talking about in recent notes
   - Auto-suggest (but don't auto-assign) based on this context

4. **Better Logging**
   - Add console logs showing why AI didn't match team
   - Help debug cases where coach expected match but AI left NULL

5. **Team Name Aliases**
   - Allow teams to have multiple names
   - E.g., "U18 Female" = "U18 Girls" = "U18F"
   - Improve AI matching accuracy

---

## Conclusion

### Issue Summary
Team insights were being auto-assigned to teams when coaches had only one team, contradicting the AI's explicit instructions to leave teamId/teamName as NULL when no explicit team name was mentioned.

### Fix Applied
Removed the auto-assignment logic that was overriding the AI's decisions. Team insights now ONLY get teamId/teamName when:
1. The voice note explicitly mentions the team name (e.g., "U18 Female")
2. The AI successfully matches it to the coach's teams roster
3. OR the coach manually classifies it using the classification dialog

### System Status
✅ **Working as designed** - Conservative approach requires explicit team mentions or manual classification.

The data IS being stored in the insights column (teamId/teamName fields), exactly as you suspected. The system was just being too eager to fill them in automatically.

---

**Document Status:** Complete
**Last Updated:** 2026-01-23
**Next Steps:** Test with real voice notes to verify fix
