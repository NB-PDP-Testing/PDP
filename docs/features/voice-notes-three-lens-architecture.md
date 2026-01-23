# Voice Notes: Three-Lens Architecture
**Date:** January 23, 2026
**Status:** 🔨 Planning
**Related Issue:** Voice notes visibility scoping

---

## Overview

Voice notes need to serve three distinct use cases with different visibility scopes:

1. **Admin Audit View** - Organization-wide oversight and compliance
2. **Coach Personal Workspace** - Individual coach's private notes
3. **Team Collaborative Insights** - Shared insights among coaches on the same team

Currently, ALL coaches see org-wide notes, which conflates these use cases.

---

## Use Case 1: Admin Audit View

### Who
- Organization Owners
- Organization Admins

### Purpose
- Governance and oversight
- Audit trail for compliance
- Insights into coaching activity across the organization
- Search capability for investigations

### Scope
**ALL voice notes in the organization**

### Current State
❌ Does not exist - no admin-specific view

### Implementation

#### Route
- `/orgs/[orgId]/admin/voice-notes`
- OR: `/orgs/[orgId]/settings/voice-notes-audit` (in settings section)

#### Backend Query
Use existing `getAllVoiceNotes(orgId)` - no changes needed

```typescript
export const getAllVoiceNotes = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(1000);
    return notes;
  },
});
```

#### Permissions
```typescript
// Check user is owner or admin
const membership = await ctx.runQuery(
  components.betterAuth.adapter.findOne,
  {
    model: "member",
    where: [
      { field: "userId", value: userId, operator: "eq" },
      { field: "organizationId", value: orgId, operator: "eq" }
    ]
  }
);

if (membership.role !== "owner" && membership.role !== "admin") {
  throw new Error("Only admins can access voice notes audit");
}
```

#### UI Features

**Core Display:**
- List of all voice notes with full details
- Coach attribution: "Created by: Coach Name"
- Team association (if available)
- Timestamp
- Note type badge
- Status indicators

**Search & Filtering:**
```typescript
interface VoiceNotesAuditFilters {
  searchQuery: string;           // Search transcription/insights
  coachId?: string;              // Filter by specific coach
  teamId?: string;               // Filter by team
  noteType?: "training" | "match" | "general";
  dateFrom?: string;             // Date range start
  dateTo?: string;               // Date range end
  status?: "pending" | "processing" | "completed" | "failed";
}
```

**Export:**
- CSV export with all fields
- PDF report generation
- Date range selection
- Coach/team filtering for exports

**UI Components:**
```
┌─────────────────────────────────────────────────────────┐
│  Voice Notes Audit                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Search box........................]  [Export ▼]      │
│                                                         │
│  Filters:                                               │
│  Coach: [Dropdown ▼]  Team: [Dropdown ▼]              │
│  Type: [All ▼]  Status: [All ▼]                        │
│  Date: [From: ____] [To: ____]                         │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Training Note - Senior Women                      │ │
│  │ Created by: John O'Brien                          │ │
│  │ Jan 22, 2026 3:45 PM                              │ │
│  │ 3 insights | Completed                            │ │
│  │ [View Details]                                     │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Match Note - U16 Boys                             │ │
│  │ Created by: Neil Barlow                           │ │
│  │ Jan 21, 2026 10:30 AM                             │ │
│  │ 5 insights | Completed                            │ │
│  │ [View Details]                                     │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Use Case 2: Coach Personal Workspace

### Who
- Individual coaches

### Purpose
- Manage their own voice notes
- Review and apply their insights
- Private coaching observations
- Personal workflow

### Scope
**Only notes created by THIS coach**

### Current State
❌ Shows org-wide notes (incorrect behavior)
✅ Query exists: `getVoiceNotesByCoach` (unused)

### Implementation

#### Route
- `/orgs/[orgId]/coach/voice-notes` (existing route)

#### Backend Query
**Switch from:** `getAllVoiceNotes(orgId)`
**Switch to:** `getVoiceNotesByCoach(orgId, coachId)` ✅ Already exists!

```typescript
export const getVoiceNotesByCoach = query({
  args: { orgId: v.string(), coachId: v.string() },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_orgId_and_coachId", (q) =>
        q.eq("orgId", args.orgId).eq("coachId", args.coachId)
      )
      .order("desc")
      .take(1000);
    return notes;
  },
});
```

#### Files to Update

1. **history-tab.tsx** (line 99-101)
```typescript
// BEFORE
const voiceNotes = useQuery(api.models.voiceNotes.getAllVoiceNotes, {
  orgId,
});

// AFTER
const { data: session } = useSession();
const coachId = session?.user?.userId || session?.user?.id;

const voiceNotes = useQuery(
  api.models.voiceNotes.getVoiceNotesByCoach,
  coachId ? { orgId, coachId } : "skip"
);
```

2. **insights-tab.tsx** (line 126-128) - Same change

3. **review-tab.tsx** (line 51-53) - Same change

4. **voice-notes-dashboard.tsx** (line 44-46) - Same change (stats only)

#### Testing
- Create 2 coaches in same org
- Each records voice notes
- Verify Coach A only sees their notes
- Verify Coach B only sees their notes
- Verify no cross-visibility

---

## Use Case 3: Team Collaborative Insights

### Who
- Coaches assigned to the same team

### Purpose
- Team coordination
- Shared player development insights
- Coach handoff continuity
- Collaborative coaching

### Scope
**Notes from all coaches on teams where this coach is assigned**

### Current State
❌ Does not exist - no team-scoped view
❌ Query does not exist - needs creation

### Implementation

#### Route Options

**Option A: Tab in Coach Voice Notes Dashboard**
- Add "Team Insights" tab to existing `/orgs/[orgId]/coach/voice-notes`
- Alongside: New Note | My Insights | My History | Team Insights

**Option B: Team Page Integration**
- Add to `/orgs/[orgId]/teams/[teamId]` page
- "Coach Insights" section showing all coaches' notes

**Option C: Standalone Section**
- New route: `/orgs/[orgId]/coach/team-insights`
- Dedicated collaborative workspace

**Recommendation:** Option A (tab) - keeps everything in one voice notes hub

#### Backend Query (NEW - To Create)

```typescript
/**
 * Get voice notes from all coaches on teams where this coach is assigned
 * Used for team collaborative insights view
 */
export const getVoiceNotesForCoachTeams = query({
  args: {
    orgId: v.string(),
    coachId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("voiceNotes"),
      _creationTime: v.number(),
      orgId: v.string(),
      coachId: v.optional(v.string()),
      coachName: v.string(), // Enriched with coach name
      date: v.string(),
      type: noteTypeValidator,
      transcription: v.optional(v.string()),
      summary: v.optional(v.string()),
      insights: v.array(insightValidator),
      insightsStatus: v.optional(statusValidator),
      // Team context
      teamIds: v.array(v.string()), // Which teams this note is relevant to
    })
  ),
  handler: async (ctx, args) => {
    // Step 1: Get all teams where this coach is assigned
    const coachAssignments = await ctx.db
      .query("coachAssignments")
      .withIndex("by_userId_and_orgId", (q) =>
        q.eq("userId", args.coachId).eq("organizationId", args.orgId)
      )
      .collect();

    if (coachAssignments.length === 0) {
      return []; // Coach not assigned to any teams
    }

    const teamIds = coachAssignments.map((a) => a.teamId);

    // Step 2: Get all coach assignments for these teams (find co-coaches)
    const allTeamCoachAssignments = await Promise.all(
      teamIds.map((teamId) =>
        ctx.db
          .query("coachAssignments")
          .withIndex("by_teamId_and_orgId", (q) =>
            q.eq("teamId", teamId).eq("organizationId", args.orgId)
          )
          .collect()
      )
    );

    // Get unique coach IDs (including self)
    const coachIds = [
      ...new Set(
        allTeamCoachAssignments.flat().map((a) => a.userId)
      ),
    ];

    // Step 3: Get all voice notes from these coaches
    const allNotes = await Promise.all(
      coachIds.map((coachId) =>
        ctx.db
          .query("voiceNotes")
          .withIndex("by_orgId_and_coachId", (q) =>
            q.eq("orgId", args.orgId).eq("coachId", coachId)
          )
          .order("desc")
          .take(500) // Limit per coach
          .collect()
      )
    );

    const notes = allNotes.flat();

    // Step 4: Enrich with coach names
    const notesWithCoachInfo = await Promise.all(
      notes.map(async (note) => {
        let coachName = "Unknown Coach";

        if (note.coachId) {
          const coachResult = await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: "user",
              where: [
                { field: "id", value: note.coachId, operator: "eq" },
              ],
            }
          );

          if (coachResult) {
            const coach = coachResult as {
              firstName?: string;
              lastName?: string;
              name?: string;
            };
            coachName =
              `${coach.firstName || ""} ${coach.lastName || ""}`.trim() ||
              coach.name ||
              "Coach";
          }
        }

        // Determine which teams this note is relevant to
        // (based on players mentioned in insights)
        const relevantTeamIds: string[] = [];

        // You could enhance this by checking which teams the mentioned
        // players belong to, but for now just mark it as relevant to all
        // teams where the creating coach is assigned
        const noteCoachAssignments = allTeamCoachAssignments
          .flat()
          .filter((a) => a.userId === note.coachId);

        relevantTeamIds.push(
          ...noteCoachAssignments.map((a) => a.teamId)
        );

        return {
          _id: note._id,
          _creationTime: note._creationTime,
          orgId: note.orgId,
          coachId: note.coachId,
          coachName,
          date: note.date,
          type: note.type,
          transcription: note.transcription,
          summary: note.summary,
          insights: note.insights,
          insightsStatus: note.insightsStatus,
          teamIds: [...new Set(relevantTeamIds)],
        };
      })
    );

    // Step 5: Sort by date (most recent first)
    return notesWithCoachInfo.sort(
      (a, b) => b._creationTime - a._creationTime
    );
  },
});
```

#### UI Features

**Display:**
- Show coach name who created each insight
- Filter by team (if coach is on multiple teams)
- Group by player or by coach
- Focus on pending/actionable insights
- Hide already-applied insights (optional toggle)

**Example UI:**
```
┌─────────────────────────────────────────────────────────┐
│  Team Insights                                          │
│  Collaboration with coaches on your teams               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Filter by team: [All Teams ▼]                         │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 🎯 Clodagh Barlow - Senior Women                   │ │
│  │                                                    │ │
│  │ John O'Brien · Jan 22, 3:45 PM                    │ │
│  │ "Skill Progress: Passing accuracy improved to 4/5"│ │
│  │ [View Details] [Apply to Player Profile]          │ │
│  │                                                    │ │
│  │ Neil Barlow · Jan 21, 10:30 AM                    │ │
│  │ "Behavior: Great leadership during match"         │ │
│  │ [View Details] [Applied ✓]                        │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 🎯 Emma Murphy - Senior Women                      │ │
│  │                                                    │ │
│  │ John O'Brien · Jan 22, 3:45 PM                    │ │
│  │ "Injury: Possible ankle strain during training"   │ │
│  │ [View Details] [Apply]                            │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Features:**
- **Coach attribution:** Always show who created the insight
- **Team context:** Show which team(s) the note relates to
- **Player grouping:** Group insights by player for easier review
- **Action buttons:** Allow any coach to apply insights to player profiles
- **Filter options:**
  - By team (if coach is on multiple teams)
  - By coach (see only certain co-coach's insights)
  - By player
  - Applied vs pending

**Permissions:**
- Any coach on the team can VIEW the insights
- Any coach can APPLY insights to player profiles
- Original coach maintains ownership for editing/deleting

---

## Summary Table

| View | User Role | Scope | Query | Route | Status |
|------|-----------|-------|-------|-------|--------|
| **Admin Audit** | Owner/Admin | All org notes | `getAllVoiceNotes(orgId)` | `/admin/voice-notes` | ❌ To Build |
| **Coach Workspace** | Coach | Own notes only | `getVoiceNotesByCoach(orgId, coachId)` | `/coach/voice-notes` | 🔨 Fix Needed |
| **Team Insights** | Coach | Team coaches' notes | `getVoiceNotesForCoachTeams(orgId, coachId)` | Tab in `/coach/voice-notes` | ❌ To Build |

---

## Implementation Priority

### Phase 1: Fix Coach Workspace (HIGH PRIORITY)
**Impact:** Fixes privacy issue where coaches see all org notes
**Effort:** Low (4 file changes, query exists)
**Status:** READY TO IMPLEMENT

### Phase 2: Team Collaborative Insights (MEDIUM PRIORITY)
**Impact:** Enables team coordination without exposing all org notes
**Effort:** Medium (new query + UI tab)
**Status:** Needs design review

### Phase 3: Admin Audit View (LOW PRIORITY - FUTURE)
**Impact:** Governance and compliance
**Effort:** Medium (new route + search UI)
**Status:** Future enhancement

---

## Migration Notes

### Data Migration
**Not needed** - no schema changes required

### User Communication
**Message to coaches:**
```
Voice Notes Update:

We've improved privacy in Voice Notes!

What's changed:
- Your "History" tab now shows only YOUR voice notes
- New "Team Insights" tab shows insights from coaches on your teams
- Organization admins can still audit all notes if needed

Why this matters:
- Your personal coaching observations remain private
- Team collaboration is easier with dedicated team insights view
- Better organization and less clutter
```

---

## Testing Plan

### Test Case 1: Coach Privacy
1. Create Coach A and Coach B in same org
2. Coach A records voice note
3. Coach B views their workspace
4. **Expected:** Coach B does NOT see Coach A's note in History tab

### Test Case 2: Team Collaboration
1. Create Coach A and Coach B assigned to Team X
2. Create Coach C assigned to Team Y
3. Coach A records note about Player in Team X
4. **Expected:**
   - Coach B sees insight in Team Insights tab
   - Coach C does NOT see insight
   - Coach A sees insight in both "My History" and "Team Insights"

### Test Case 3: Admin Audit
1. Create org admin user
2. Navigate to admin audit view
3. **Expected:** See ALL voice notes from all coaches
4. Test search by coach, team, date range
5. Test export functionality

### Test Case 4: Multi-Team Coach
1. Create Coach A assigned to Team X and Team Y
2. Create Coach B on Team X only
3. Create Coach C on Team Y only
4. **Expected:** Coach A sees insights from both Coach B and Coach C in Team Insights

---

## Related Files

### Queries/Mutations
- `packages/backend/convex/models/voiceNotes.ts` - Add `getVoiceNotesForCoachTeams`

### Frontend Components
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/history-tab.tsx` - Fix query
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx` - Fix query
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/review-tab.tsx` - Fix query
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx` - Fix query, add team tab
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/team-insights-tab.tsx` - NEW
- `apps/web/src/app/orgs/[orgId]/admin/voice-notes/page.tsx` - NEW (future)

### Schema
- No changes needed! All queries use existing indexes

---

## Open Questions

1. **Team Insights Tab Name:**
   - "Team Insights"?
   - "Shared Insights"?
   - "Team Notes"?

2. **Can coaches apply insights from other coaches?**
   - Yes (collaborative) - any team coach can apply
   - No (ownership) - only creator can apply
   - **Recommendation:** Yes, for collaboration

3. **Admin audit: Read-only or edit capability?**
   - Read-only (audit only)
   - Can delete (moderation)
   - **Recommendation:** Read-only + delete for compliance

4. **Show voice note transcription in team insights?**
   - Show full transcription
   - Show summary only
   - Show insights only
   - **Recommendation:** Summary + insights (protect coach's raw voice notes)

---

**Document Status:** Draft for review
**Next Steps:** Review with product owner, then implement Phase 1
