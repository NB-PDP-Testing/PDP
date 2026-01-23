# Team Observations System

**Date:** 2026-01-22
**Feature:** Structured storage and display of team-level insights from voice notes

---

## Overview

The team observations system provides proper storage and display for team-level insights extracted from voice notes. Previously, team insights were appended to a text field and had no UI for viewing. Now they're stored as structured records and displayed in a dedicated Team Insights page.

---

## Problem Solved

### Before
- ❌ Team insights appended to `team.coachNotes` text field
- ❌ No structured data - just text concatenation
- ❌ Ignored the `teamId` from AI auto-assignment
- ❌ No UI to view accumulated team insights
- ❌ Insights effectively disappeared after being "applied"

### After
- ✅ Structured records in `teamObservations` table
- ✅ Uses `teamId` from AI auto-assignment
- ✅ Dedicated Team Insights page for coaches
- ✅ Filter by team, view stats, see observation history
- ✅ Links back to source voice notes

---

## Architecture

### Database Schema

**New Table: `teamObservations`**

```typescript
{
  organizationId: string,        // Better Auth organization ID
  teamId: string,                // Better Auth team ID
  teamName: string,              // Denormalized for display
  source: "voice_note" | "manual", // Where it came from
  voiceNoteId: Id<"voiceNotes">, // Link to voice note
  insightId: string,             // Link to specific insight
  coachId: string,               // Coach who created it
  coachName: string,             // Denormalized for display
  title: string,                 // Insight title
  description: string,           // Insight description
  category: string,              // e.g., "team_culture"
  dateObserved: string,          // ISO date
  createdAt: number,             // Timestamp
}
```

**Indexes:**
- `by_organizationId` - All observations for an org
- `by_teamId` - All observations for a team
- `by_organizationId_and_teamId` - Optimized combined query
- `by_voiceNoteId` - Find observations from a voice note

---

## Backend API

### Queries (`models/teamObservations.ts`)

**`getTeamObservations(teamId)`**
- Returns all observations for a specific team
- Sorted by most recent first

**`getOrganizationObservations(organizationId)`**
- Returns all observations for an organization
- Used by coaches to see all their teams

**`getCoachTeamObservations(organizationId, coachId)`**
- Returns observations for teams the coach is assigned to
- Filters by coach assignment (future optimization available)

**`createTeamObservation(...)`**
- Manually create a team observation
- For future use when coaches want to add notes directly

**`deleteTeamObservation(observationId)`**
- Delete a team observation
- For future use if coaches need to remove observations

### Updated Mutations

**`voiceNotes.updateInsightStatus`** (lines 765-798)
- Now checks for `insight.teamId` from AI auto-assignment
- Creates `teamObservations` record when applying team insight
- Requires team to be assigned (fails gracefully if not)
- No longer appends to `team.coachNotes`

```typescript
if (targetTeamId && targetTeamName) {
  // Create team observation record
  const observationId = await ctx.db.insert("teamObservations", {
    organizationId: note.orgId,
    teamId: targetTeamId,
    teamName: targetTeamName,
    source: "voice_note",
    voiceNoteId: args.noteId,
    insightId: args.insightId,
    coachId: note.coachId,
    coachName: "Coach",
    title: insight.title,
    description: insight.description,
    category,
    dateObserved: note.date,
    createdAt: now,
  });
}
```

---

## Frontend UI

### Team Insights Page

**Location:** `/orgs/[orgId]/coach/team-insights`

**Features:**
1. **Stats Cards** - Shows:
   - Total observations
   - Teams with insights
   - Observations from voice notes

2. **Team Filter** - Dropdown to filter by team (if coach has multiple teams)

3. **Views:**
   - **All Teams** - Groups observations by team
   - **Single Team** - Shows observations for selected team

4. **Observation Cards:**
   - Badge: "Voice Note" or "Manual"
   - Category badge (if present)
   - Date observed (formatted as "Mon Jan 22, 10:30 PM")
   - Title and description
   - Coach name

**Navigation:**
- Added "Team Insights" link to coach sidebar
- Positioned between "Voice Notes" and "Messages"
- Uses Users icon

---

## Flow: Voice Note → Team Observation

1. **Recording**
   - Coach records voice note mentioning team culture/dynamics
   - Example: "The team's communication has really improved this week"

2. **AI Analysis**
   - AI identifies this as a `team_culture` insight
   - Auto-assigns to coach's team (if only one team)
   - Returns `teamId` and `teamName` in insight

3. **Display in Insights Tab**
   - Shows "Team: [Team Name]" badge
   - Coach sees it's ready to apply
   - Date/time displayed

4. **Apply**
   - Coach clicks "Apply" button
   - System creates `teamObservations` record
   - Marks insight as "applied"

5. **View in Team Insights**
   - Coach navigates to Team Insights page
   - Sees observation in team's history
   - Can filter by team, see stats, etc.

---

## Data Flow

```
Voice Note Recording
      ↓
AI Extracts Team Insight
(includes teamId + teamName if auto-assigned)
      ↓
Insights Tab
(shows team badge, apply button)
      ↓
Coach Clicks Apply
      ↓
Create teamObservations Record
(structured data with all fields)
      ↓
Team Insights Page
(displays in coach's team history)
```

---

## Current Status

### ✅ Implemented
1. Full database schema with indexes
2. Backend queries for fetching observations
3. Updated apply logic to create observations
4. Team Insights page with filtering
5. Navigation link in coach sidebar
6. Stats cards and grouped views
7. Mobile responsive design

### 🔄 Future Enhancements
1. **Manual Entry** - Allow coaches to add observations without voice notes
2. **Delete/Edit** - Allow coaches to manage observations
3. **Export** - Export team observations to PDF/CSV
4. **Trends** - Show trends over time for team culture
5. **Coach Name** - Fetch actual coach name from Better Auth (currently hardcoded as "Coach")
6. **Team Detail Pages** - Show observations on individual team detail pages
7. **Filters** - Add date range, category filters
8. **Search** - Search through team observations

### ⚠️ Migration Considerations
- Old team insights (pre-implementation) are in `team.coachNotes` text field
- Consider migration script to parse and import historical observations
- Or leave as-is and only apply new system going forward

---

## Usage Example

### For Coaches

1. **Record voice note:**
   - "The U16 girls showed fantastic teamwork in today's training"

2. **AI processes:**
   - Categorizes as `team_culture`
   - Auto-assigns to "U16 Girls" team

3. **Review in Insights tab:**
   - See insight with "Team: U16 Girls" badge
   - Click "Apply"

4. **View in Team Insights:**
   - Navigate to Team Insights from sidebar
   - See observation appear in U16 Girls section
   - View stats showing 1 new observation

### For Organization
- All team observations stored centrally
- Can query by team, date, coach
- Historical record of team culture evolution
- Link back to source voice notes for context

---

## Technical Details

### Query Performance
- Indexed by `organizationId` and `teamId` for fast lookups
- Compound index for efficient org+team queries
- Voice note linking via `voiceNoteId` index

### Data Integrity
- Required fields prevent incomplete records
- Denormalized `teamName` and `coachName` for fast display
- Source tracking enables filtering by origin

### Type Safety
- Full TypeScript types generated by Convex
- Validated schemas for all operations
- Type-safe queries in frontend

---

## Files Reference

### Backend
- `packages/backend/convex/schema.ts` - Table definition
- `packages/backend/convex/models/teamObservations.ts` - Queries and mutations
- `packages/backend/convex/models/voiceNotes.ts` - Updated apply logic (line 765-798)

### Frontend
- `apps/web/src/app/orgs/[orgId]/coach/team-insights/page.tsx` - Main page
- `apps/web/src/components/layout/coach-sidebar.tsx` - Navigation link

### Documentation
- `docs/features/team-insights-and-coach-actions-flow.md` - Original analysis
- `docs/features/voice-notes-date-time-display.md` - Related feature

---

**Status:** ✅ Fully Implemented and Committed
**Testing:** Manual testing recommended to verify:
1. Team insights from voice notes create observations
2. Team Insights page displays correctly
3. Team filter works (for multi-team coaches)
4. Stats are accurate
5. Links back to voice notes function

---

## Summary

The team observations system transforms team insights from lost text appends into a proper, queryable database with a clean UI. Coaches can now:
- See all team culture notes in one place
- Filter by team
- Track team development over time
- Link back to source voice notes

This makes team insights actually useful and actionable.
