# Voice Notes Visibility Analysis
**Date:** January 23, 2026
**Issue:** Coaches seeing other coaches' voice notes in History tab
**Reporter:** Neil Barlow (neil.barlow@gmail.com)
**Scenario:** JKOBRIEN@GMAIL.COM's voice note visible to neil.barlow@gmail.com

---

## Summary

The Voice Notes History tab displays **ALL voice notes for the entire organization**, not just notes created by the current coach. This means coaches can see voice notes recorded by other coaches in the same organization.

---

## Technical Details

### Current Implementation

**Frontend (history-tab.tsx:99-101):**
```typescript
const voiceNotes = useQuery(api.models.voiceNotes.getAllVoiceNotes, {
  orgId,
});
```

**Backend Query (voiceNotes.ts:77-109):**
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

**What This Returns:**
- ALL voice notes in the organization
- NO filtering by coach
- Uses `by_orgId` index only

### Coach-Scoped Query (Available but Not Used)

There IS an alternative query that filters by coach:

**Backend Query (voiceNotes.ts:148-183):**
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

**This query is NOT used anywhere in the codebase.**

---

## All Components Using getAllVoiceNotes

1. **History Tab** - `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/history-tab.tsx:99`
2. **Insights Tab** - `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx:126`
3. **Review Tab** - `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/review-tab.tsx:51`
4. **Voice Notes Dashboard** - `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx:44`

**ALL tabs show organization-wide voice notes, not coach-specific notes.**

---

## Historical Context

### When Was This Introduced?

**Commit:** `09c5a4c` (January 20, 2026)
- "feat: Refactor voice notes dashboard with tabbed UI and mobile-first design"
- Initial tabbed UI implementation
- Always used `getAllVoiceNotes` from the start

**No Evidence Of:**
- Any commit changing from coach-scoped to org-scoped
- Documentation stating this is intentional behavior
- Discussion about voice note visibility scope

### Why Does getVoiceNotesByCoach Exist?

The query was created but never wired to the UI. Possible reasons:
1. **Planned Feature**: Intended for future coach filtering UI
2. **Alternative Use Case**: May be used elsewhere (player passport, coach analytics)
3. **Incomplete Implementation**: Work in progress that wasn't finished

---

## Observed Behavior

### Scenario
- **Organization:** Grange
- **Team:** Senior Women
- **Coach A:** neil.barlow@gmail.com (viewing notes)
- **Coach B:** JKOBRIEN@GMAIL.COM (created note)
- **Both coaches:** Assigned to Senior Women team

### What Coach A Sees
- Their own voice notes
- **Coach B's voice notes** (unexpected?)
- No indication of who created each note (no attribution UI)

### Privacy Implications
Voice notes may contain:
- Player performance observations
- Behavioral notes
- Injury observations
- Personal coaching thoughts

**Current state:** All coaches in the organization can see all notes.

---

## Comparison: Insights Tab vs History Tab

### Insights Tab (insights-tab.tsx:126)
- Uses `getAllVoiceNotes(orgId)`
- Shows ALL pending insights for the organization
- **This makes sense** - coaches should collaboratively review insights

### History Tab (history-tab.tsx:99)
- Uses `getAllVoiceNotes(orgId)`
- Shows ALL historical notes for the organization
- **Unclear if this is intentional** - private coaching notes visible to all

---

## Possible Design Intents

### Option 1: Intentional Team Collaboration
**Rationale:**
- Coaches on the same team should see each other's notes for continuity
- Helps with coach handoff (e.g., assistant coach steps in)
- Improves team coordination

**Evidence:**
- Insights tab also shows all org notes (collaborative review)
- No privacy controls or coach attribution in UI

### Option 2: Unintentional Oversight
**Rationale:**
- Voice notes are personal coaching observations
- Should be private to the creating coach
- `getVoiceNotesByCoach` query exists but unused

**Evidence:**
- No documentation stating organization-wide visibility is intended
- No UI indicator showing which coach created each note
- User reports this as unexpected behavior

### Option 3: Work in Progress
**Rationale:**
- Feature shipped before coach filtering was implemented
- `getVoiceNotesByCoach` exists as foundation for future work

**Evidence:**
- Query exists but never wired
- Recent Phase 4 work didn't address visibility scoping

---

## Impact Assessment

### User Experience
- **Positive:** Team coaches can see all notes for coordination
- **Negative:** Private coaching thoughts visible to peers
- **Confusing:** No indication of who created each note

### Security/Privacy
- **Low Risk:** Notes scoped to organization (no cross-org leaks)
- **Medium Risk:** Coaches may record sensitive observations
- **Compliance:** May need audit trail of who accessed whose notes

### Data Volume
- **Performance:** 1000 notes max (reasonable for org-wide query)
- **Noise:** Coaches may see irrelevant notes from other teams

---

## Recommendations

### Immediate Action (Choose One)

**Option A: Keep Current Behavior (Organization-Wide)**
1. Add documentation stating this is intentional
2. Add UI attribution: "Recorded by Coach X"
3. Add filter: "Show only my notes" toggle
4. Update docs/features/voice-notes.md

**Option B: Switch to Coach-Scoped**
1. Change History tab to use `getVoiceNotesByCoach`
2. Add coach filter dropdown for admins
3. Keep Insights/Review tabs org-wide (collaborative)
4. Document the scoping decision

**Option C: Hybrid Approach**
1. Default to coach's own notes
2. Add "View All Team Notes" toggle
3. Show coach attribution when viewing all notes
4. Audit log for cross-coach viewing (compliance)

### Code Changes (Option B Example)

**Frontend (history-tab.tsx):**
```typescript
// BEFORE
const voiceNotes = useQuery(api.models.voiceNotes.getAllVoiceNotes, {
  orgId,
});

// AFTER
const { data: session } = useSession();
const coachId = session?.user?.userId || session?.user?._id;

const voiceNotes = useQuery(
  api.models.voiceNotes.getVoiceNotesByCoach,
  coachId ? { orgId, coachId } : "skip"
);
```

**Impact:**
- 4 files to update (all tabs + dashboard)
- No schema changes needed
- Query already exists and indexed

---

## Questions for Product Owner

1. **Intended Behavior:** Should coaches see each other's voice notes?
2. **Use Case:** Is this for team coordination or personal coaching logs?
3. **Privacy:** Are there sensitive observations that should be private?
4. **Attribution:** Should we show which coach created each note?
5. **Filtering:** Do coaches need to filter between their notes and team notes?

---

## Testing Recommendations

### Scenario 1: Multi-Coach Organization
1. Create 2 coaches in same org
2. Assign both to same team
3. Each coach records a voice note
4. Verify visibility for each coach

### Scenario 2: Cross-Team Visibility
1. Create 2 coaches in same org
2. Assign to different teams
3. Each coach records a voice note
4. Verify if coaches see cross-team notes

### Scenario 3: Role-Based Access
1. Create org owner, admin, coach
2. Each records a voice note
3. Verify visibility based on role

---

## Related Documentation

- `docs/features/voice-notes.md` - Does not mention visibility scoping
- `docs/features/whatsapp-integration.md` - WhatsApp notes also affected
- `packages/backend/convex/models/voiceNotes.ts` - Both queries exist

---

## Conclusion

The current implementation shows **organization-wide voice notes** to all coaches. This appears to be:
- **Implemented since day one** (not a recent regression)
- **Not explicitly documented** as intentional
- **Has infrastructure for coach-scoping** (query exists but unused)
- **No UI attribution** (can't tell who created what)

**Next Steps:**
1. Confirm intended behavior with product owner
2. If coach-scoped is desired, implement Option B above
3. If org-wide is desired, add attribution UI (Option A)
4. Document the decision in `docs/features/voice-notes.md`
