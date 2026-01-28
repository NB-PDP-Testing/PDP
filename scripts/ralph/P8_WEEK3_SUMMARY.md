# P8 Week 3 - Navigation & Polish - Summary

**Date**: January 28, 2026
**Status**: Ready to Start ✅
**Prerequisites**: Week 1 ✅, Week 1.5 ✅, Week 2 ✅

---

## 📊 Current Status

### Completed Work
- ✅ **P8 Week 1** (Foundation) - 4 stories complete
  - Backend query, My Impact tab structure, navigation
- ✅ **P8 Week 1.5** (Trust Gate & Self-Service) - 10 stories complete
  - Platform/admin/coach 3-tier permissions, self-service access control
- ✅ **P8 Week 2** (My Impact Dashboard) - 7 stories complete
  - Summary cards, sent summaries, applied insights, team observations
- ✅ **PR #374** - Created and ready to merge (pending testing)

### Next Work
- ⏳ **P8 Week 3** (Navigation & Polish) - 9 stories NOT started
  - Bi-directional navigation, parent engagement analytics, export

---

## 🎯 What is Week 3?

**Mission**: Complete the bi-directional navigation between My Impact dashboard and Player Passports

### The Problem
Coaches now have a beautiful My Impact dashboard showing:
- ✅ Applied skill insights
- ✅ Recorded injuries
- ✅ Sent parent summaries
- ✅ Team observations

**But there's a critical gap**: No way to navigate from insights → player passport → back to source voice note.

### The Solution (Week 3)

**1. Forward Navigation** (Insights → Passport)
- Every insight card gets "View in [Player]'s Passport →" link
- Deep links to correct tab (Skills, Health, Attendance)
- One click to see full player context

**2. Backward Navigation** (Passport → Voice Note)
- Skill assessments show "From voice note (Jan 26)" badge
- Injury records show same badge
- Click badge → jump back to source voice note
- Auto-scroll and highlight the note (2-second animation)

**3. Parent Engagement Analytics**
- "Least Engaged Parents" section (bottom 5 parents)
- Color coding: Red (<30%), Yellow (30-60%), Green (>60%)
- Helps coaches identify who needs follow-up
- Engagement trends chart (last 4 weeks, sent vs viewed)

**4. Export & Comparisons**
- Export impact report as CSV
- Previous period comparisons: "+3 vs last month"
- Green (improvements) / Red (decreases) / Gray (no change)

**5. Polish**
- Loading skeleton while data fetches
- Smooth transitions and animations

---

## 📋 The 9 User Stories

| Story ID | Title | Priority | Hours |
|----------|-------|----------|-------|
| US-P8-012 | "View in Passport" links on insight cards | HIGH | 0.5 |
| US-P8-013 | Source badges on skill assessments | HIGH | 0.75 |
| US-P8-014 | Source badges on injury records | HIGH | 0.75 |
| US-P8-015 | Deep linking with scroll + highlight | HIGH | 1.0 |
| US-P8-016 | Least engaged parents section | MEDIUM | 1.5 |
| US-P8-017 | Engagement trends chart | MEDIUM | 1.0 |
| US-P8-018 | CSV export button | LOW | 0.75 |
| US-P8-019 | Previous period comparisons | MEDIUM | 1.0 |
| US-P8-020 | Loading skeleton | LOW | 0.5 |

**Total Estimated Time**: 4-6 hours

---

## 🏗️ Architecture Changes

### Backend (1 file)
**`packages/backend/convex/models/voiceNotes.ts`**

Extend `getCoachImpactSummary` query with:
```typescript
// NEW: Parent engagement data
parentEngagement: v.array(v.object({
  guardianId: v.optional(v.string()),
  guardianName: v.optional(v.string()),
  playerName: v.string(),
  playerIdentityId: v.id("playerIdentities"),
  summariesSent: v.number(),
  summariesViewed: v.number(),
  viewRate: v.number(), // percentage
  lastViewedAt: v.optional(v.number()),
}))

// NEW: Weekly trends (last 4 weeks)
weeklyTrends: v.array(v.object({
  weekLabel: v.string(), // "Week 1", "Week 2"
  weekStartDate: v.number(),
  summariesSent: v.number(),
  summariesViewed: v.number(),
}))

// NEW: Previous period comparison
previousPeriodStats: v.optional(v.object({
  voiceNotesCreated: v.number(),
  insightsApplied: v.number(),
  summariesSent: v.number(),
  parentViewRate: v.number(),
}))
```

### Frontend (7 files)

**Voice Notes Components**:
1. `applied-insights-section.tsx` - Add "View in Passport →" links
2. `my-impact-tab.tsx` - Parent engagement section, trends chart, export button, skeleton
3. `impact-summary-cards.tsx` - Add comparison indicators
4. `voice-notes-dashboard.tsx` - Handle `?noteId=X` query param
5. `history-tab.tsx` - Scroll to note, highlight animation

**Player Passport Components**:
6. `skill-assessment-display.tsx` - Add "From voice note" badge
7. `injury-record-display.tsx` - Add "From voice note" badge

---

## ⚠️ Critical Schema Check Required

**Before implementing US-P8-013 and US-P8-014**, Ralph must verify:

```typescript
// Do these fields exist?
skillAssessments: defineTable({
  source: v.optional(v.string()), // ???
  voiceNoteId: v.optional(v.id("voiceNotes")), // ???
})

playerInjuries: defineTable({
  source: v.optional(v.string()), // ???
  voiceNoteId: v.optional(v.id("voiceNotes")), // ???
})
```

**If fields DON'T exist**:
1. Add to schema first
2. Run codegen
3. Then implement badges

**If fields DO exist**:
- Proceed with implementation

---

## 🧪 Testing Strategy

### 8 Key Test Cases

**TC-W3-001**: View in Passport Links
- Click skill insight → verify lands on Skills tab
- Click injury insight → verify lands on Health tab

**TC-W3-002**: Source Badges on Skills
- Verify badge shows for voice note skills
- Verify badge NOT shown for manual assessments
- Click badge → verify navigates to voice note

**TC-W3-003**: Deep Linking Highlight
- Click source badge from passport
- Verify: Switches to History tab, scrolls to note, highlights with ring
- Verify highlight fades after 2 seconds

**TC-W3-004**: Parent Engagement Section
- Verify shows bottom 5 least engaged parents
- Verify color coding: Red (<30%), Yellow (30-60%), Green (>60%)

**TC-W3-005**: Engagement Trends Chart
- Verify shows last 4 weeks
- Verify two lines: Sent (blue), Viewed (green)
- Verify responsive (works on mobile)

**TC-W3-006**: Export CSV
- Click Export → CSV
- Verify downloads with correct filename
- Open CSV → verify columns: Date, Player, Type, Description, Status

**TC-W3-007**: Previous Period Comparison
- Verify summary cards show "+X vs last month"
- Verify green for improvements, red for decreases

**TC-W3-008**: Loading Skeleton
- Verify skeleton shows before data loads
- Verify smooth transition to real data

---

## 📁 Files Created (Ready-to-Run Documentation)

### 1. `P8_WEEK3_READY_TO_RUN.md` (17 pages)
Comprehensive guide for Ralph including:
- Mission and problem statement
- All 9 user stories with acceptance criteria
- Backend architecture changes
- Frontend implementation details (code examples)
- Critical learnings from Week 2 (type safety, Better Auth patterns)
- Implementation checklist with phase order
- Testing scenarios
- Common pitfalls to avoid

### 2. `p8-week3-navigation-polish.prd.json` (350 lines)
Structured PRD with:
- Problem statement and objectives
- All 9 user stories with detailed acceptance criteria
- Technical approach (backend + frontend)
- Testing strategy
- Implementation phases
- Risks and mitigations
- Success criteria
- Known limitations and future enhancements

---

## 🚀 How to Start Week 3

### Option A: Manual Start (You)
1. Review `P8_WEEK3_READY_TO_RUN.md`
2. Create branch: `git checkout -b ralph/coach-impact-visibility-p8-week3`
3. Implement stories in order (backend → navigation → analytics → polish)
4. Test as you go

### Option B: Ralph Start (AI Agent)
1. Load Ralph agent
2. Point Ralph to PRD: `scripts/ralph/prd.json` (update to Week 3 PRD path)
3. Ralph reads `P8_WEEK3_READY_TO_RUN.md`
4. Ralph implements all 9 stories
5. Ralph creates testing guide and checkpoint

**Recommended**: Option B (Ralph) - He successfully delivered Weeks 1, 1.5, and 2

---

## 📊 Phase 8 Complete Picture

### All 4 Weeks

| Week | Focus | Stories | Status |
|------|-------|---------|--------|
| Week 1 | Foundation | 4 | ✅ Complete |
| Week 1.5 | Trust Gate & Self-Service | 10 | ✅ Complete |
| Week 2 | My Impact Dashboard | 7 | ✅ Complete |
| **Week 3** | **Navigation & Polish** | **9** | **⏳ Not Started** |

**Total**: 30 user stories across 4 weeks

### When Week 3 is Complete

Coaches will have:
1. ✅ Foundation query and tab structure (Week 1)
2. ✅ Flexible permission system (Week 1.5)
3. ✅ Beautiful impact dashboard (Week 2)
4. ✅ Bi-directional navigation (Week 3) ← **FINAL PIECE**
5. ✅ Parent engagement analytics (Week 3)
6. ✅ Export capability (Week 3)

**Result**: Complete coach impact visibility system 🎉

---

## 🎯 Next Steps

### Immediate (Today/Tomorrow)

**If continuing with P8 Week 3**:
1. Review `P8_WEEK3_READY_TO_RUN.md` (comprehensive guide)
2. Decide: Manual implementation or use Ralph agent?
3. If Ralph:
   - Update `scripts/ralph/prd.json` to point to Week 3 PRD
   - Load Ralph with Week 3 context
   - Let Ralph implement all 9 stories

**If moving to different work**:
- P8 Weeks 1, 1.5, and 2 are complete and ready to merge (PR #374)
- Week 3 can be deferred if other priorities emerge

### PR #374 Status
- ✅ Created and ready to merge
- ✅ All quality checks passing (only Vercel deployment failed - environment issue)
- ⏰ Pending manual testing before merge
- Can merge now or after Week 3 (your choice)

---

## 💡 Recommendation

**Suggested Path Forward**:

1. **Today**: Merge PR #374 (Weeks 1, 1.5, 2 to main)
   - Command: `gh pr merge 374 --squash --delete-branch`
   - Rationale: Get completed work into main before starting new week

2. **Tomorrow**: Start Week 3 with Ralph
   - Fresh branch from main
   - Use prepared documentation
   - Estimated 4-6 hours to complete

3. **After Week 3**: Create final PR for Week 3
   - Complete Phase 8 implementation
   - Deploy to production

**Total Time to Complete Phase 8**: 1-2 more days

---

## 📚 Documentation Available

All documentation ready for Week 3:

1. **Implementation Guide**: `P8_WEEK3_READY_TO_RUN.md` (17 pages)
2. **PRD**: `p8-week3-navigation-polish.prd.json` (350 lines)
3. **Main PRD**: `P8_COACH_IMPACT_VISIBILITY.md` (Week 3 section: lines 836-1236)
4. **Context for Ralph**: All learnings from Weeks 1, 1.5, 2 documented

**Status**: Week 3 is fully planned and ready to execute ✅

---

## ❓ Questions to Consider

1. **Do you want to merge PR #374 first?** (Weeks 1, 1.5, 2)
2. **Do you want to start Week 3 now?** Or defer?
3. **Should Ralph implement Week 3?** Or manual implementation?
4. **Testing**: Should we test PR #374 before merging? Or merge and test in production?

---

**End of Summary**

Phase 8 is 75% complete (21 of 30 stories done). Week 3 is the final polish that ties everything together with seamless navigation and analytics. Ready when you are! 🚀
