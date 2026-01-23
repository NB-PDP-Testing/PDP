# Voice Notes Architecture & Implementation Analysis
**Last Updated**: January 21, 2026
**Status**: ✅ Production Ready with Phase 4 Enhancements
**Related**: See `docs/architecture/PHASE4_ARCHITECTURE.md` for complete Phase 4 details

## Executive Summary

The Voice Notes system is **fully implemented with Phase 4 enhancements** including advanced insight routing, player name correction, bulk operations, and parent summary integration. The system uses OpenAI for transcription (Whisper) and AI-powered insight extraction (GPT-4o), significantly more advanced than the original MVP plan.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐    ┌───────────────────┐    ┌──────────────────┐  │
│  │ Coach Dashboard │───▶│  Voice Notes Btn  │───▶│ Voice Notes Page │  │
│  │ (coach-dash.tsx)│    │ (Quick Actions)   │    │ /coach/voice-notes│  │
│  └─────────────────┘    └───────────────────┘    └──────────────────┘  │
│                                                            │            │
│                                                            ▼            │
│                         ┌────────────────────────────────────────────┐  │
│                         │      VoiceNotesDashboard Component         │  │
│                         │  ┌────────────────────────────────────┐   │  │
│                         │  │ Audio Recording (MediaRecorder API) │   │  │
│                         │  │ - Start/Stop recording              │   │  │
│                         │  │ - webm audio format                 │   │  │
│                         │  └────────────────────────────────────┘   │  │
│                         │  ┌────────────────────────────────────┐   │  │
│                         │  │ Typed Notes (Textarea)              │   │  │
│                         │  │ - Alternative text input            │   │  │
│                         │  │ - Same AI analysis pipeline         │   │  │
│                         │  └────────────────────────────────────┘   │  │
│                         │  ┌────────────────────────────────────┐   │  │
│                         │  │ Insight Review Panel                │   │  │
│                         │  │ - Apply/Dismiss workflow            │   │  │
│                         │  │ - Player name badges                │   │  │
│                         │  │ - Category badges                   │   │  │
│                         │  └────────────────────────────────────┘   │  │
│                         │  ┌────────────────────────────────────┐   │  │
│                         │  │ Voice Note History                  │   │  │
│                         │  │ - Transcriptions                    │   │  │
│                         │  │ - Status badges                     │   │  │
│                         │  │ - Insight preview                   │   │  │
│                         │  └────────────────────────────────────┘   │  │
│                         └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND LAYER (Convex)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    models/voiceNotes.ts                          │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ QUERIES                                                  │    │   │
│  │  │ - getAllVoiceNotes(orgId)                               │    │   │
│  │  │ - getVoiceNotesByCoach(orgId, coachId)                  │    │   │
│  │  │ - getPendingInsights(orgId)                             │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ MUTATIONS                                                │    │   │
│  │  │ - createTypedNote(orgId, noteText, noteType)            │    │   │
│  │  │ - createRecordedNote(orgId, audioStorageId, noteType)   │    │   │
│  │  │ - updateInsightStatus(noteId, insightId, status)        │    │   │
│  │  │ - deleteVoiceNote(noteId)                               │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ ACTIONS                                                  │    │   │
│  │  │ - generateUploadUrl() → Convex storage upload URL       │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    actions/voiceNotes.ts                         │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ transcribeAudio(noteId)                                  │    │   │
│  │  │ - Downloads audio from Convex storage                   │    │   │
│  │  │ - Sends to OpenAI gpt-4o-mini-transcribe                │    │   │
│  │  │ - Updates note with transcription                       │    │   │
│  │  │ - Schedules buildInsights                               │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │ buildInsights(noteId)                                    │    │   │
│  │  │ - Gets transcription from note                          │    │   │
│  │  │ - Fetches org player roster for context                 │    │   │
│  │  │ - Sends to OpenAI GPT-4o with Zod schema                │    │   │
│  │  │ - Extracts structured insights                          │    │   │
│  │  │ - Matches player names to roster IDs                    │    │   │
│  │  │ - Updates note with insights                            │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    schema.ts (voiceNotes table)                  │   │
│  │  - orgId: string (index: by_orgId)                              │   │
│  │  - coachId: string ⚠️ REQUIRED (index: by_orgId_and_coachId)   │   │
│  │    (Jan 21 2026: Changed from optional to required for Phase 4) │   │
│  │  - date: string                                                  │   │
│  │  - type: "training" | "match" | "general"                       │   │
│  │  - audioStorageId: Id<"_storage">                               │   │
│  │  - transcription: string                                         │   │
│  │  - transcriptionStatus: "pending"|"processing"|"completed"|"failed"│   │
│  │  - transcriptionError: string                                    │   │
│  │  - summary: string                                               │   │
│  │  - insights: Insight[] (Enhanced Phase 4 - see below)           │   │
│  │  - insightsStatus: "pending"|"processing"|"completed"|"failed"  │   │
│  │  - insightsError: string                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐         ┌────────────────────────────────┐   │
│  │   Convex Storage    │         │          OpenAI API             │   │
│  │   (_storage table)  │         │  ┌────────────────────────┐    │   │
│  │                     │         │  │ gpt-4o-mini-transcribe │    │   │
│  │   - Audio blobs     │         │  │ (Whisper model)        │    │   │
│  │   - webm format     │         │  │ Audio → Text           │    │   │
│  │                     │         │  └────────────────────────┘    │   │
│  │                     │         │  ┌────────────────────────┐    │   │
│  │                     │         │  │ GPT-4o                 │    │   │
│  │                     │         │  │ Text → Structured      │    │   │
│  │                     │         │  │ Insights (Zod schema)  │    │   │
│  │                     │         │  └────────────────────────┘    │   │
│  └─────────────────────┘         └────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Audio Recording Flow
```
User clicks Record → MediaRecorder starts → User clicks Stop
                                              ↓
                                     audioBlob created (webm)
                                              ↓
                                     generateUploadUrl() called
                                              ↓
                                     Audio uploaded to Convex storage
                                              ↓
                                     createRecordedNote() called
                                              ↓
                                     Note saved with audioStorageId
                                              ↓
                                     scheduler.runAfter(0, transcribeAudio)
                                              ↓
                                     OpenAI Whisper transcribes
                                              ↓
                                     updateTranscription() saves text
                                              ↓
                                     scheduler.runAfter(0, buildInsights)
                                              ↓
                                     GPT-4o extracts insights
                                              ↓
                                     updateInsights() saves to note
```

### 2. Typed Note Flow
```
User types note → User clicks "Save & Analyze"
                          ↓
              createTypedNote() called
                          ↓
              Note saved with transcription (typed text)
                          ↓
              scheduler.runAfter(0, buildInsights)
                          ↓
              GPT-4o extracts insights
                          ↓
              updateInsights() saves to note
```

### 3. Insight Application Flow (Phase 4 Enhanced)
```
User reviews insight → Clicks Apply/Dismiss
                              ↓
               updateInsightStatus() called
                              ↓
               Insight status updated in note
                              ↓
               Insight routed to appropriate table based on category:
                              ↓
               ┌── injury → playerInjuries table
               ├── skill_rating → skillAssessments table
               ├── skill_progress → passportGoals or skillAssessments
               ├── behavior/performance → sportPassports.coachNotes
               ├── team_culture → team.coachNotes (Better Auth)
               └── todo → coachTasks table
                              ↓
               (If player-linked) Schedule parent summary generation
                              ↓
               Parent summary AI processing (if coach trust level allows)
                              ↓
               Summary available for coach review/approval
```

---

## Phase 4 Enhancements (January 2026)

### Critical Fix: coachId Now Required
**Date**: January 21, 2026
**Commit**: `5feda57`
**Issue**: Voice notes created without coachId were breaking coach-scoped queries and parent summary attribution.

**Impact**:
- All new voice notes must include `coachId`
- Enables proper coach-scoped analytics
- Required for parent summary attribution
- Necessary for team assignment tracking

### Advanced Insight Routing System

Insights now automatically route to specific database tables based on category:

| Category | Destination | What Gets Created |
|----------|-------------|-------------------|
| `injury` | `playerInjuries` | Formal injury record with severity, body part, status, RTP protocol |
| `skill_rating` | `skillAssessments` | Skill assessment with 1-5 rating for specific skill |
| `skill_progress` | `passportGoals` or `skillAssessments` | Development goal OR skill assessment (smart detection) |
| `behavior` | `sportPassports.coachNotes` | Coach note on player behavior |
| `performance` | `sportPassports.coachNotes` | Performance observation |
| `attendance` | `sportPassports.coachNotes` | Attendance tracking note |
| `team_culture` | `team.coachNotes` | Team-wide cultural observation |
| `todo` | `coachTasks` | Actionable task with assignment tracking |

**Smart Skill Detection**: If `skill_progress` insight contains a rating pattern ("Rating: 4", "set to 3/5"), automatically creates `skillAssessments` record instead of goal.

### Skill Rating Parser

Extracts numeric ratings from natural language:
- "Rating: 4" → 4
- "improved to 3/5" → 3
- "level three" → 3
- "now at four" → 4

Uses sophisticated regex patterns to detect and convert word numbers to numeric ratings.

### Player Name Correction (Two-Stage)

**1. Pattern-Based Correction** (Fast):
- Handles possessives: "Claudia's" → "Clodagh's"
- Word boundaries: "Claudia" → "Clodagh"
- Full names: "Claudia Barlow" → "Clodagh Barlow"

**2. AI Fallback** (GPT-4o-mini):
- If pattern matching fails, schedule AI correction
- Intelligently rewrites text with correct player name
- Maintains context and phrasing

### Bulk Operations

New `bulkApplyInsights` mutation applies multiple insights in a single transaction:
- Groups by noteId to minimize database reads
- Optimized for coach workflow efficiency
- Returns success/failure count per insight

### Team & TODO Classification

`classifyInsight` mutation allows coaches to:
- Mark insights as team-level (not player-specific)
- Create TODO tasks automatically from insights
- Assign tasks to specific users
- Link tasks back to original voice note

### Player Passport Integration

`getVoiceNotesForPlayer` query enables:
- Display all coach insights for a player on their passport
- Enriched with coach name from Better Auth
- Used in "Coach Insights" section of player profiles

### Parent Summary Integration

**Automatic Workflow**:
1. Coach records voice note
2. AI extracts insights
3. **For each player-linked insight:**
   - Check if parent summaries enabled for coach
   - Generate parent-friendly summary via GPT-4o
   - Store with `pending_review` status
   - Coach reviews and approves
   - Parent receives tab notification
   - Parent reads message on dashboard

**Trust Levels**: Coaches can enable auto-approve for non-sensitive categories (skill_progress, performance). Injuries and behavior always require manual review.

See `docs/architecture/PHASE4_ARCHITECTURE.md` for complete details.

---

## Insight Schema (Updated Phase 4)

```typescript
interface Insight {
  id: string;                    // Unique ID for the insight
  playerIdentityId?: Id<"playerIdentities">;  // Matched player ID (identity system)
  playerName?: string;           // Player name from transcription
  title: string;                 // Short title (e.g., "Skill Improvement")
  description: string;           // Detailed description
  category?: string;             // One of 8 categories (Phase 4: added skill_rating, todo)
  recommendedUpdate?: string;    // AI-suggested action
  status: "pending" | "applied" | "dismissed";
  appliedDate?: string;          // When insight was applied

  // Phase 4 additions:
  teamId?: string;               // Team ID for team_culture insights
  teamName?: string;             // Team name for team_culture insights
  assigneeUserId?: string;       // User assigned to TODO insights
  assigneeName?: string;         // Name of assignee for TODO insights
  linkedTaskId?: Id<"coachTasks">; // Link to created task (if category = todo)
}
```

### Insight Categories (Phase 4: 8 categories)
1. **injury** - Player injuries detected (→ `playerInjuries` table)
2. **skill_progress** - Skill improvements or regressions
3. **behavior** - Behavioral observations
4. **performance** - Performance metrics
5. **attendance** - Attendance-related notes
6. **team_culture** - Team dynamics/culture

---

## AI System Prompt (buildInsights)

```
You are an expert sports coaching assistant that analyzes coach voice notes 
and extracts actionable insights.

Your task is to:
1. Summarize the key points from the voice note
2. Extract specific insights about individual players or the team
3. Match player names to the roster when possible
4. Categorize insights (injury, skill_progress, behavior, performance, attendance, team_culture)
5. Suggest concrete actions the coach should take

Team Roster:
- [Player name] (ID: [player_id]), Age Group: [age], Sport: [sport]
...

Important:
- Always try to match mentioned player names to the roster and include their exact ID
- If a player name doesn't match the roster exactly, still extract the insight with the playerName field
- Include insights about the whole team with playerName and playerId as null
- Be specific and actionable in your recommendations
```

---

## Features Implemented ✅

### Frontend (voice-notes-dashboard.tsx)
- [x] In-browser audio recording (MediaRecorder API)
- [x] Audio format: webm
- [x] Note type selection (training/match/general)
- [x] Typed notes alternative input
- [x] Real-time status display (pending/processing/completed/failed)
- [x] Error handling with user-friendly messages
- [x] Pending insights panel with Apply/Dismiss buttons
- [x] Voice note history with transcriptions
- [x] Insight badges (category, player name, status)
- [x] Navigation from Coach Dashboard (Quick Actions button)

### Backend (models/voiceNotes.ts)
- [x] Full CRUD operations
- [x] Organization scoping (by_orgId index)
- [x] Coach scoping (by_orgId_and_coachId index)
- [x] Convex storage integration for audio files
- [x] Scheduled actions for async processing

### AI Actions (actions/voiceNotes.ts)
- [x] OpenAI Whisper transcription (gpt-4o-mini-transcribe)
- [x] GPT-4o structured insight extraction
- [x] Zod schema validation
- [x] Player name matching to roster
- [x] Status tracking through processing pipeline

---

## Features Missing/Incomplete ❌

### High Priority
1. **Insight Application to Player Profiles**
   - Current: `updateInsightStatus()` only marks insight as "applied"
   - Missing: Actual update to player's skills/notes/injuries
   - Impact: Insights are tracked but don't affect player data

2. **Audio Playback**
   - Current: Audio is uploaded and stored
   - Missing: No playback UI for recorded audio
   - Impact: Coach cannot listen back to recordings

3. **Bulk Insight Actions**
   - Current: Individual apply/dismiss only
   - Missing: Select all, apply all, dismiss all
   - Impact: Tedious when many insights pending

### Medium Priority
4. **Coach Insight Preferences (coachInsightPreferences schema)**
   - Schema exists but not wired
   - Should enable auto-approve thresholds
   - Category-specific preferences

5. **Delete Voice Note from UI**
   - Mutation exists (`deleteVoiceNote`)
   - No delete button in UI

6. **Search/Filter Voice Notes**
   - Only shows all notes for org
   - No date range filter
   - No search by content

7. **Player-Centric View**
   - Can't see all insights for a specific player
   - Only org-wide view available

### Low Priority
8. **Export Voice Notes**
   - No export to PDF/CSV

9. **Voice Note Editing**
   - Cannot edit transcription after creation

10. **Team-Scoped Notes**
    - Notes are org-level
    - No team association

---

## Integration Points

### With Smart Coach Dashboard
```typescript
// coach-dashboard.tsx
const handleViewVoiceNotes = () => {
  router.push(`/orgs/${orgId}/coach/voice-notes`);
};

// Passed to SmartCoachDashboard
onViewVoiceNotes={handleViewVoiceNotes}
```

```typescript
// smart-coach-dashboard.tsx (Quick Actions)
{onViewVoiceNotes && (
  <Button onClick={onViewVoiceNotes}>
    <Mic size={16} />
    Voice Notes
  </Button>
)}
```

### With Player Passport (TODO)
- Insights should link to player profiles
- Apply insight should update:
  - `skillAssessments` for skill_progress
  - `playerInjuries` for injury
  - `players.notes` for behavior/attendance

---

## Environment Variables Required

```env
OPENAI_API_KEY=sk-...  # Required for transcription and insights
```

---

## Recommended Enhancements

### Phase 1: Complete Core Functionality
1. **Implement insight application to player profiles**
   ```typescript
   // When applying skill_progress insight:
   await ctx.db.insert("skillAssessments", {
     playerIdentityId: insight.playerId,
     // ... skill data from insight
   });
   ```

2. **Add audio playback**
   ```tsx
   {note.audioStorageId && (
     <audio controls src={audioUrl} />
   )}
   ```

3. **Add delete button**
   ```tsx
   <Button onClick={() => deleteVoiceNote({ noteId: note._id })}>
     Delete
   </Button>
   ```

### Phase 2: Enhanced UX
4. **Bulk insight actions**
5. **Date range filtering**
6. **Search transcriptions**

### Phase 3: Advanced Features
7. **Wire coachInsightPreferences**
8. **Player-centric insight view**
9. **Team association**

---

## Comparison: MVP Plan vs Actual Implementation

| Feature | MVP Plan | Actual Implementation |
|---------|----------|----------------------|
| Audio Recording | ✅ In-browser | ✅ MediaRecorder API |
| Transcription | Deepgram | ✅ OpenAI Whisper |
| AI Insights | Basic extraction | ✅ GPT-4o + Zod structured |
| Player Matching | Manual | ✅ AI roster matching |
| Insight Categories | Not specified | ✅ 6 categories |
| Insight Review | Apply/Dismiss | ✅ Full workflow |
| Confidence Scoring | Planned | ❌ Not implemented |
| Auto-approve | Planned | ❌ Schema only |
| Learning System | Planned | ❌ Not implemented |

**Verdict:** The actual implementation is **better than MVP** for core features but missing some advanced features like auto-approve and learning system.

---

## File Inventory

| File | Purpose | Status |
|------|---------|--------|
| `apps/web/src/app/orgs/[orgId]/coach/voice-notes/page.tsx` | Page route | ✅ Working |
| `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx` | Main UI | ✅ Working |
| `packages/backend/convex/models/voiceNotes.ts` | Queries/Mutations | ✅ Working |
| `packages/backend/convex/actions/voiceNotes.ts` | AI Actions | ✅ Working |
| `packages/backend/convex/schema.ts` | Database schema | ✅ Includes voiceNotes |

---

**Document Version:** 1.0  
**Last Updated:** December 18, 2025  
**Status:** Complete Analysis
