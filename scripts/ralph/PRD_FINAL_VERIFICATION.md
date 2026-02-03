# prd.json - Final Verification for Ralph

**Date**: 2026-02-02
**Status**: ✅ COMPLETE - READY FOR RALPH

---

## ✅ prd.json Structure Verification

### File Details
- **Location**: `/scripts/ralph/prd.json`
- **Size**: 30KB (was 682 bytes)
- **Format**: Complete PRD with all user stories

### Required Fields (All Present ✅)

#### 1. Project Metadata ✅
```json
{
  "project": "Phase 9 Week 4 Phase 4 - Collaboration Features (Tasks + Insights) ENHANCED",
  "branchName": "ralph/p9-week4-team-hub",
  "description": "Complete Week 4 with Tasks Tab and Insights Tab. Integrate with Activity Feed, Overview Dashboard, Voice Notes, and Navigation. Build on existing patterns from Phases 1-3 and REUSE existing coachTasks schema."
}
```

#### 2. Context Files ✅
Points Ralph to supporting documentation:
- `scripts/ralph/PHASE4_CONTEXT.md` (44KB - implementation patterns)
- `scripts/ralph/PHASE4_FINAL_RECOMMENDATIONS.md` (10KB - key decisions)
- `scripts/ralph/PHASE3_CONTEXT.md` (9.9KB - Phase 3 patterns)
- `scripts/ralph/progress.txt` (7.5KB - streamlined tracker)

#### 3. Phase Context ✅
- **previousPhases**: Lists Phases 1-3 completion
- **currentPhase**: "Phase 4 - Collaboration Features (4 stories, 13 hours) + Integrations"
- **completedStories**: 7 stories from Phases 1-3
- **featuresAlreadyComplete**: Lists 5 features to not rebuild
- **criticalPatternsEstablished**: 10 patterns Ralph must follow
- **reusableComponents**: 6 component patterns to copy

#### 4. User Stories ✅
**4 stories with comprehensive acceptance criteria:**

**US-P9-057: Tasks Tab** (5.5h)
- 31 acceptance criteria
- Effort breakdown (schema, backend, frontend, overview, testing)
- Files to modify: 4 files
- Files to create: 5 files
- ⚠️ CRITICAL: Use existing coachTasks table (not new table)

**US-P9-058: Insights Tab** (5h)
- 38 acceptance criteria
- Effort breakdown (schema, backend, frontend, overview, voiceNotesLink)
- Files to modify: 5 files
- Files to create: 4 files
- Includes Activity Feed + Overview + Voice Notes integration

**US-P9-NAV: Navigation Integration** (0.5h)
- 11 acceptance criteria
- Bottom nav: 5 items with Voice highlighted
- Sidebar: Development group placement

**US-P9-041: Tone Controls** (2h)
- 13 acceptance criteria
- Tone dropdown: Warm, Professional, Brief
- Live preview card with example summaries

**Total**: 93 acceptance criteria across 4 stories

#### 5. Phase 4 Checklist ✅
**40 actionable items** broken down by story:
- US-P9-057: 15 tasks (Tasks Tab)
- US-P9-058: 11 tasks (Insights Tab)
- US-P9-NAV: 3 tasks (Navigation)
- US-P9-041: 8 tasks (Tone Controls)
- Final verification: 3 tasks

#### 6. Success Criteria ✅
**29 success criteria** covering:
- Tasks Tab functionality (9 criteria)
- Insights Tab functionality (9 criteria)
- Navigation accessibility (3 criteria)
- Tone Controls functionality (4 criteria)
- Quality gates (4 criteria)

#### 7. Mandatory Patterns ✅
**13 mandatory patterns** Ralph MUST follow:
- Use Better Auth IDs as v.string()
- Use existing coachTasks table (DON'T create teamTasks)
- Use composite indexes (never .filter() after .withIndex())
- Batch fetch with Map lookup (avoid N+1 queries)
- Create teamActivityFeed entries after mutations
- Include args and returns validators
- Use skeleton loaders (not spinners)
- Provide empty states
- Mobile-first responsive design
- Touch targets ≥44px
- Run type checks before committing
- Use dev-browser for visual verification
- Copy existing component patterns

#### 8. Integration Points ✅
**4 major integrations documented:**

**Activity Feed Integration**
- Purpose: Show task/insight events in team activity stream
- Events: task_created, task_completed, task_assigned, insight_generated
- Pattern: Code example provided
- Example: Full mutation code included

**Overview Dashboard Integration**
- Purpose: Show task/insight counts in Quick Stats Panel
- Stats: openTasks, overdueCount, unreadInsights, highPriorityInsights
- Pattern: Enhance getTeamOverviewStats query
- UI: Replace placeholders with real stats

**Voice Notes Integration**
- Purpose: Bidirectional linking
- Fields: voiceNoteId in coachTasks (exists!), voiceNoteId in teamInsights (new)
- Pattern: Display voice note icon badge on cards
- Optional: Add insights badge to voice notes tab

**Navigation Integration**
- Purpose: Make Team Hub easily accessible
- Sidebar: Development group placement
- Bottom Nav: 5 items with Voice highlighted
- Icon: LayoutDashboard for Team Hub, Mic for Voice

#### 9. Effort Summary ✅
- **US-P9-057**: 5.5h (Tasks)
- **US-P9-058**: 5h (Insights)
- **US-P9-NAV**: 0.5h (Navigation)
- **US-P9-041**: 2h (Tone Controls)
- **Total**: 13h

**Breakdown by type:**
- Schema: 1h
- Backend: 4.5h
- Frontend: 6h
- Integration: 1h
- Navigation: 0.5h
- Testing: 0.5h

**Delta from original**: +4h for 4 major integrations + tone controls

---

## ✅ Comparison with Ralph Example PRD

### Example PRD Pattern (Coach-Parent Messaging)
```json
{
  "project": "...",
  "branchName": "...",
  "description": "...",
  "userStories": [
    {
      "id": "US-001",
      "title": "...",
      "description": "...",
      "acceptanceCriteria": [...],
      "priority": 1,
      "passes": false,
      "notes": "..."
    }
  ]
}
```

### Our PRD Pattern ✅ MATCHES
```json
{
  "project": "...",
  "branchName": "...",
  "description": "...",
  "contextFiles": [...],
  "userStories": [
    {
      "id": "US-P9-057",
      "phase": 4,
      "title": "...",
      "description": "...",
      "acceptanceCriteria": [...],
      "priority": 1,
      "passes": false,
      "effort": "5.5h",
      "effortBreakdown": {...},
      "dependencies": [],
      "files": {...}
    }
  ],
  "phase4Checklist": [...],
  "successCriteria": {...},
  "mandatoryPatterns": [...],
  "integrationPoints": {...},
  "effortSummary": {...}
}
```

**✅ Our PRD is MORE comprehensive than the example:**
- ✓ Has all required fields from example
- ✓ PLUS: contextFiles (supporting docs)
- ✓ PLUS: phase4Checklist (40 actionable items)
- ✓ PLUS: successCriteria (29 criteria)
- ✓ PLUS: mandatoryPatterns (13 patterns)
- ✓ PLUS: integrationPoints (4 integrations with code)
- ✓ PLUS: effortSummary (detailed breakdown)
- ✓ PLUS: effortBreakdown per story
- ✓ PLUS: files (modify/create lists per story)

---

## ✅ Ralph Execution Readiness

### What Ralph Will Read (in order):
1. **prd.json** (30KB) - Main PRD with all 4 user stories ✅
2. **progress.txt** (7.5KB) - Streamlined Phase 1-3 summary + Phase 4 context ✅
3. **PHASE4_CONTEXT.md** (44KB) - Implementation patterns and code examples ✅
4. **PHASE4_FINAL_RECOMMENDATIONS.md** (10KB) - Key decisions ✅
5. **PHASE3_CONTEXT.md** (9.9KB) - Phase 3 patterns to reuse ✅

**Total**: ~102KB (optimal for Ralph's context window)

### What Ralph Will Execute:

#### Story 1: US-P9-057 (Tasks Tab) - 5.5h
1. Add `status` field to existing coachTasks schema
2. Extend teamActivityFeed enums (task events)
3. Create getTeamTasks query (use by_team_and_org index)
4. Create task mutations (create, update, delete, updateStatus)
5. Add activity feed entries in mutations
6. Enhance getTeamOverviewStats (openTasks, overdueCount)
7. Build tasks-tab.tsx (copy player-tab pattern)
8. Build task-card.tsx (copy player-card, add voice note badge)
9. Build task-filters.tsx (copy player-filters)
10. Build create-task-modal.tsx
11. Build task-detail-modal.tsx (with voice note link)
12. Update quick-stats-panel.tsx (replace "Attendance %" → "Open Tasks")
13. Test: filtering, voice note linking, activity feed events

#### Story 2: US-P9-058 (Insights Tab) - 5h
1. Create teamInsights schema with indexes
2. Extend teamActivityFeed enums (insight events)
3. Create getTeamInsights query with pagination
4. Create insight mutations (create, markAsRead)
5. Create generateInsightsFromVoiceNotes action (placeholder)
6. Add activity feed entries in mutations
7. Enhance getTeamOverviewStats (unreadInsights, highPriorityInsights)
8. Build insights-tab.tsx (copy activity-feed pagination)
9. Build insight-card.tsx (add voice note badge)
10. Build insight-filters.tsx
11. Build insight-detail-modal.tsx
12. Update quick-stats-panel.tsx (replace "Upcoming Events" → "Unread Insights")
13. Optional: Add insights badge to voice notes tab
14. Test: pagination, filters, voice note linking

#### Story 3: US-P9-NAV (Navigation) - 0.5h
1. Update coach-sidebar.tsx (add Team Hub to Development group)
2. Update layout.tsx (add bottom nav with 5 items, Voice highlighted)
3. Test: navigation accessible, Voice highlighted on mobile

#### Story 4: US-P9-041 (Tone Controls) - 2h
1. Extend coachOrgPreferences schema (parentSummaryTone field)
2. Create getCoachPreferences query
3. Create updateCoachPreferences mutation
4. Build parent-comms-settings.tsx
5. Add tone dropdown (Warm, Professional, Brief)
6. Add live preview card with example summaries
7. Wire to Team Hub Settings OR Coach Settings page
8. Test: tone selection updates preview, save persists

#### Final Verification:
1. Visual verification with dev-browser (all tabs, navigation, integrations)
2. Type check passes (npm run check-types)
3. Verify Activity Feed shows task/insight events
4. Verify Overview Dashboard shows task/insight counts
5. Commit: "feat: Phase 9 Week 4 Phase 4 - Tasks + Insights + Tone Controls with Full Integration"

---

## ✅ Success Metrics

### Coverage
- **4 stories** with **93 acceptance criteria** ✅
- **40 checklist items** for Ralph to track progress ✅
- **29 success criteria** to verify completion ✅
- **13 mandatory patterns** to ensure quality ✅
- **4 major integrations** fully documented ✅

### Quality
- All stories have detailed acceptance criteria ✅
- All stories have effort breakdown ✅
- All stories have file modification lists ✅
- Critical patterns highlighted (existing schema, batch fetch, indexes) ✅
- Integration code examples provided ✅

### Completeness
- Previous phases context (what's done) ✅
- Current phase scope (what to do) ✅
- Reusable components (how to do it) ✅
- Mandatory patterns (what to avoid) ✅
- Success criteria (how to verify) ✅

---

## 🚀 Final Status

### prd.json ✅ READY
- ✅ Size: 30KB (complete PRD, not pointer)
- ✅ Structure: Matches Ralph example pattern
- ✅ Content: 4 stories with 93 acceptance criteria
- ✅ Context: Points to 4 supporting documents
- ✅ Checklist: 40 actionable items
- ✅ Patterns: 13 mandatory patterns
- ✅ Integrations: 4 fully documented
- ✅ Effort: 13h realistic estimate

### Supporting Files ✅ READY
- ✅ progress.txt (7.5KB - streamlined)
- ✅ PHASE4_CONTEXT.md (44KB - patterns)
- ✅ PHASE4_FINAL_RECOMMENDATIONS.md (10KB - decisions)
- ✅ PHASE3_CONTEXT.md (9.9KB - Phase 3 patterns)

### Ralph Execution Plan ✅ CLEAR
1. Read prd.json → Get complete requirements
2. Read contextFiles → Get patterns and decisions
3. Execute stories in order (US-P9-057 → US-P9-058 → US-P9-NAV → US-P9-041)
4. Follow mandatory patterns
5. Verify success criteria
6. Commit with proper message

---

**STATUS**: ✅ **prd.json IS COMPLETE AND READY FOR RALPH**

Ralph has everything needed for a successful Phase 4 execution:
- Complete requirements (93 acceptance criteria)
- Clear execution plan (40 checklist items)
- Proven patterns (13 mandatory patterns)
- Full integration specs (4 integrations with code)
- Quality gates (29 success criteria)

**START RALPH NOW!** 🚀

---
