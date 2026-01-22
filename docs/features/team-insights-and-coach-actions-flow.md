# Team Insights & Coach Actions - Complete Flow

**Date:** 2026-01-22
**Purpose:** Document how team-level insights and coach actions are captured, classified, applied, and displayed

---

## Overview

Voice notes can generate insights that are **NOT player-specific**. These fall into two categories:
1. **Team Culture** - Observations about team dynamics, culture, behavior
2. **TODO** - Action items for coaches to complete

---

## The Flow

### 1. Capture (Voice Note Recording)

**Location:** `/orgs/[orgId]/coach/voice-notes` - Record tab

When coach records a voice note:
- AI analyzes transcription
- Extracts insights (player-specific AND team-level)
- Insights without player name → potential team insights

**Backend:** `packages/backend/convex/actions/voiceNotes.ts`
- `buildInsights` action processes voice note with AI
- AI categorizes insights automatically
- Returns array of insights with categories

### 2. Classification (Insights Tab)

**Location:** `/orgs/[orgId]/coach/voice-notes` - Insights tab

**UI Display:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx`

Insights are categorized into 4 groups:
1. **Matched** - Has playerIdentityId (can apply directly)
2. **Unmatched** - Has playerName but no match (needs player assignment)
3. **Classified Team Insights** - Has team_culture or todo category ✅
4. **Uncategorized** - No player AND no team category (needs classification) ⚠️

**TEAM_LEVEL_CATEGORIES:**
```typescript
const TEAM_LEVEL_CATEGORIES = ["team_culture", "todo"];
```

**Visual Indicators:**
- **Team Culture:** Purple badge "Team"
- **TODO:** Green badge "TODO" + blue "✓ Task created" (if task exists)
- **Uncategorized:** Orange badge "⚠️ Needs classification"

**Classification Process:**
1. Coach clicks "Classify" on uncategorized insight
2. Modal appears with two options:
   - **Team Insight** → Select team from dropdown
   - **Coach Action** → Assign to user (creates task)
3. On submit:
   - Calls `classifyInsight` mutation
   - Updates insight category
   - If TODO: Creates task in `coachTasks` table

### 3. Storage & Application

**Backend:** `packages/backend/convex/models/voiceNotes.ts`

#### Team Culture Insights

**Classification:** `classifyInsight` mutation (line 1161-1273)
```typescript
await classifyInsight({
  noteId,
  insightId,
  category: "team_culture",
  teamId,    // Better Auth team ID
  teamName,  // Display name
});
```

**Storage:**
- Stored in `voiceNotes.insights[]` array
- Fields added: `category: "team_culture"`, `teamId`, `teamName`
- Status remains "pending" until applied

**Application:**
When coach clicks "Apply" on team_culture insight:
- Currently: Just marks as "applied"
- **Future Enhancement Needed:** Should create team note/observation record

#### TODO/Coach Actions

**Classification:** `classifyInsight` mutation (line 1161-1273)
```typescript
const result = await classifyInsight({
  noteId,
  insightId,
  category: "todo",
  assigneeUserId,      // Who to assign to
  assigneeName,
  createdByUserId,     // Current coach
  createdByName,
  taskPriority,        // Optional: low/medium/high
});
```

**Storage:**
- Creates record in `coachTasks` table
- Links back to voice note: `source: "voice_note"`, `voiceNoteId`, `insightId`
- Insight updated with: `category: "todo"`, `linkedTaskId`, `assigneeUserId`, `assigneeName`

**Schema:** `packages/backend/convex/schema.ts`
```typescript
coachTasks: {
  text: string,
  completed: boolean,
  organizationId: string,
  assignedToUserId?: string,
  assignedToName?: string,
  createdByUserId?: string,
  source: "voice_note" | "manual",
  voiceNoteId?: Id<"voiceNotes">,
  insightId?: string,
  priority?: "low" | "medium" | "high",
  playerIdentityId?: Id,
  playerName?: string,
  teamId?: string,
  createdAt: number,
}
```

### 4. Display in UI

#### Insights Tab (Voice Notes Page)

**Location:** `/orgs/[orgId]/coach/voice-notes` - Insights tab

**Display:**
- Shows all pending insights
- **Classified team insights section:**
  - Badge: "Team" (purple) for team_culture
  - Badge: "TODO" (green) for todo + "✓ Task created" if linked
  - Date/time: "Mon Jan 22, 10:30 PM"
  - Apply button (marks as applied)
  - Dismiss button (marks as dismissed)

**Sorting:** Most recent first (lines 377-387)

#### Coach TODOs Page

**Location:** `/orgs/[orgId]/coach/todos`

**File:** `apps/web/src/app/orgs/[orgId]/coach/todos/components/coach-todos-view.tsx`

**Display:**
- Lists all tasks from `coachTasks` table
- Shows source (voice_note vs manual)
- Checkbox to mark complete
- Filter by assignee, status, priority
- Link back to voice note (if from voice note)

**Backend Query:** `packages/backend/convex/models/coachTasks.ts`
```typescript
getTasksForCoach({
  organizationId,
  userId,  // Shows tasks assigned to this coach
})
```

---

## Data Flow Summary

```
1. VOICE NOTE RECORDING
   ↓
2. AI ANALYSIS
   ↓
3. INSIGHTS EXTRACTION
   ├─ Player-specific → Match to player
   └─ Team-level → Needs classification
      ↓
4. CLASSIFICATION (Coach Action)
   ├─ Team Culture
   │  ├─ Select team
   │  ├─ Update insight.category = "team_culture"
   │  ├─ Add teamId, teamName
   │  └─ Display in Insights tab with Team badge
   │
   └─ TODO/Coach Action
      ├─ Select assignee
      ├─ Create coachTask record
      ├─ Update insight.category = "todo"
      ├─ Link insight.linkedTaskId → taskId
      └─ Display in:
         ├─ Insights tab (with TODO badge + ✓ Task created)
         └─ Coach TODOs page (with link to voice note)
      ↓
5. APPLICATION
   ├─ Team Culture: Mark as applied (no permanent record yet)
   └─ TODO: Already created task, apply just marks insight as applied
```

---

## Current Status

### ✅ Working
1. AI extracts team-level insights from voice notes
2. Coach can classify uncategorized insights as team_culture or todo
3. TODO insights create tasks in coachTasks table
4. Tasks display in Coach TODOs page
5. Insights tab shows team and todo badges with date/time
6. Most recent insights appear first

### ⚠️ Needs Verification
1. **Team Culture insights:**
   - Classification works ✅
   - Display works ✅
   - **Application:** Currently just marks as "applied" - no permanent team observation record created
   - **Question:** Should team_culture insights create a record somewhere? (e.g., team notes table?)

2. **TODO tasks:**
   - Creation works ✅
   - Display in Insights tab ✅
   - Display in TODOs page ✅
   - **Question:** Can coaches complete tasks from TODOs page?

### 🔍 Recommendations

1. **Add Team Observations Table**
   - Create `teamObservations` table
   - When team_culture insight is applied, create observation record
   - Display team observations in team detail page

2. **Link Tasks to Player Passports**
   - If TODO has playerIdentityId, show task in player passport
   - Create "Coach Actions" section in passport

3. **Dashboard Widget**
   - Show unclassified insights count on coach dashboard
   - Show pending tasks count
   - Show team observations count

---

## Files Reference

### Backend
- `packages/backend/convex/actions/voiceNotes.ts` - AI analysis & extraction
- `packages/backend/convex/models/voiceNotes.ts` - Classification & application
- `packages/backend/convex/models/coachTasks.ts` - Task queries
- `packages/backend/convex/schema.ts` - Database schema

### Frontend
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx` - Insights display
- `apps/web/src/app/orgs/[orgId]/coach/todos/components/coach-todos-view.tsx` - TODOs display

---

**Status:** ✅ Verified - System working as designed
**Next Steps:** Confirm if team_culture insights need permanent storage
