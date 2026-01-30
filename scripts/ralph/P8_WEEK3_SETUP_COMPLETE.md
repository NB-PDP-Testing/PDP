# P8 Week 3 - Setup Complete ✅

**Date**: January 28, 2026
**Branch**: `ralph/coach-impact-visibility-p8-week1`
**Status**: Ready for Ralph to start Week 3

---

## ✅ All Setup Complete

Ralph is ready to start implementing P8 Week 3 (Navigation & Polish). All documentation, learnings, and configuration are in place.

---

## 📁 Files Created

### 1. Implementation Guide (17 pages)
**File**: `scripts/ralph/P8_WEEK3_READY_TO_RUN.md`

Contains:
- Complete mission statement
- All 9 user stories with code examples
- Backend architecture changes (extend getCoachImpactSummary)
- Frontend implementation details for 8 files
- Critical learnings from Week 2
- Implementation checklist by phase
- 8 testing scenarios
- Common pitfalls to avoid

### 2. PRD (350 lines)
**File**: `scripts/ralph/prds/Coaches Voice Insights/p8-week3-navigation-polish.prd.json`

Contains:
- Problem statement and objectives
- All 9 user stories with detailed AC
- Technical approach (backend + frontend)
- Testing strategy
- Risks and mitigations
- Success criteria
- Known limitations

### 3. Ralph Configuration
**File**: `scripts/ralph/prd.json`

Updated to point to Week 3:
- Project: "P8 Week 3 - Navigation & Polish"
- Branch: "ralph/coach-impact-visibility-p8-week3"
- All 9 user stories configured
- Critical learnings from Week 2 incorporated
- Schema check warnings included

### 4. Executive Summary
**File**: `scripts/ralph/P8_WEEK3_SUMMARY.md`

Quick reference:
- What's in Week 3
- Current status
- Architecture changes
- Testing strategy
- Next steps

### 5. Session History
**File**: `scripts/ralph/session-history.txt`

Updated with Week 3 setup entry.

---

## 🎯 Week 3 Overview

### The 9 User Stories

| ID | Title | Priority | Hours |
|----|-------|----------|-------|
| US-P8-012 | "View in Passport" links on insight cards | HIGH | 0.5 |
| US-P8-013 | Source badges on skill assessments | HIGH | 0.75 |
| US-P8-014 | Source badges on injury records | HIGH | 0.75 |
| US-P8-015 | Deep linking with scroll + highlight | HIGH | 1.0 |
| US-P8-016 | Least engaged parents section | MEDIUM | 1.5 |
| US-P8-017 | Engagement trends chart | MEDIUM | 1.0 |
| US-P8-018 | CSV export button | LOW | 0.75 |
| US-P8-019 | Previous period comparisons | MEDIUM | 1.0 |
| US-P8-020 | Loading skeleton | LOW | 0.5 |

**Total**: 4-6 hours

### What Week 3 Delivers

**Bi-Directional Navigation**:
- Click insight card → jump to player passport (correct tab)
- View skill/injury in passport → see "From voice note" badge
- Click badge → jump back to voice note with scroll + highlight

**Parent Engagement Analytics**:
- Least engaged parents section (bottom 5 with color coding)
- Engagement trends chart (4-week line chart)
- Helps coaches identify who needs follow-up

**Export & Comparisons**:
- CSV export for applied insights
- Previous period comparisons on summary cards (+/-3 vs last month)

**Polish**:
- Loading skeleton while data fetches
- Smooth animations and transitions

---

## ⚠️ Critical Warnings for Ralph

### 1. Schema Check Required (HIGHEST PRIORITY)

**Before implementing US-P8-013 and US-P8-014**, Ralph MUST verify:

```typescript
// Check if these fields exist in schema
skillAssessments: defineTable({
  source: v.optional(v.string()),  // ← Does this exist?
  voiceNoteId: v.optional(v.id("voiceNotes")),  // ← Does this exist?
})

playerInjuries: defineTable({
  source: v.optional(v.string()),  // ← Does this exist?
  voiceNoteId: v.optional(v.id("voiceNotes")),  // ← Does this exist?
})
```

**If fields DON'T exist**:
1. Add to schema FIRST
2. Run codegen
3. THEN implement source badges

**If fields DO exist**:
- Proceed with badge implementation

### 2. Critical Learnings from Week 2

**Type Safety** ⚠️:
- Always use `Id<"tableName">` not `string`
- Import: `import type { Id } from "@pdp/backend/convex/_generated/dataModel";`
- Ralph used `string` in Week 2 → caused type errors

**Interface vs Type** ⚠️:
- Use `type` not `interface`
- Biome lint rule enforces this
- Ralph used `interface` → failed lint

**Match Backend Field Names** ⚠️:
- Read backend query return validator FIRST
- Don't guess field names
- Ralph used `appliedAt` but backend had `recordedAt` for injuries

**Better Auth Integration** ⚠️:
- Do NOT query organization/team/member/user tables directly
- Use `ctx.runQuery(components.betterAuth.adapter.findMany, {...})`

**Recharts Library** ✅:
- Already available, no installation needed
- Import LineChart, ResponsiveContainer, etc.

**CSV Export** ⚠️:
- Escape commas: `description.replace(/,/g, ';')`
- Prevents CSV corruption

**Responsive Design** ⚠️:
- Always wrap LineChart in ResponsiveContainer
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

---

## 📋 Implementation Order

Ralph should follow this sequence:

### Phase 1: Backend Foundation (30 minutes)
1. Check schema for source/voiceNoteId fields ⚠️
2. Extend getCoachImpactSummary with:
   - parentEngagement array
   - weeklyTrends array
   - previousPeriodStats object
3. Run codegen
4. Type check

### Phase 2: Navigation Links (1 hour)
5. US-P8-012: Add "View in Passport" links to insight cards
6. US-P8-013: Add source badges to skill assessments (if schema OK)
7. US-P8-014: Add source badges to injury records (if schema OK)
8. Type check after each story

### Phase 3: Deep Linking (45 minutes)
9. US-P8-015: Implement deep linking with scroll + highlight animation
10. Test navigation flow
11. Type check

### Phase 4: Analytics & Export (1.5 hours)
12. US-P8-016: Add least engaged parents section
13. US-P8-017: Add engagement trends chart
14. US-P8-019: Add comparison indicators to summary cards
15. US-P8-018: Add CSV export
16. Type check

### Phase 5: Polish (30 minutes)
17. US-P8-020: Add loading skeleton
18. Visual review
19. Run linter: `npx ultracite fix`

### Phase 6: Testing & Documentation (30 minutes)
20. Create testing guide
21. Test all navigation flows manually
22. Update session history
23. Create checkpoint document

---

## 🧪 Testing Checklist

Ralph should verify:

- [ ] **TC-W3-001**: View in Passport links navigate to correct tabs
- [ ] **TC-W3-002**: Source badges show for voice note skills/injuries only
- [ ] **TC-W3-003**: Deep linking scrolls to note + highlights for 2 seconds
- [ ] **TC-W3-004**: Parent engagement shows bottom 5 with color coding
- [ ] **TC-W3-005**: Trends chart shows 4 weeks, responsive, tooltip works
- [ ] **TC-W3-006**: CSV exports with correct columns and filename
- [ ] **TC-W3-007**: Previous period comparisons show with colors
- [ ] **TC-W3-008**: Loading skeleton shows before data loads
- [ ] **Type check passes**: `npm run check-types`
- [ ] **Linting passes**: `npx ultracite fix`

---

## 📂 Files Ralph Will Touch

### Backend (2 files)
1. `packages/backend/convex/schema.ts` - Check/add source fields
2. `packages/backend/convex/models/voiceNotes.ts` - Extend getCoachImpactSummary

### Frontend (8 files)
3. `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/applied-insights-section.tsx`
4. `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx`
5. `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/impact-summary-cards.tsx`
6. `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx`
7. `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/history-tab.tsx`
8. `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/skill-assessment-display.tsx`
9. `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/injury-record-display.tsx`

### Documentation (2 files to create)
10. `scripts/ralph/P8_WEEK3_TESTING_GUIDE.md`
11. `scripts/ralph/P8_WEEK3_CHECKPOINT.md`

---

## 🚀 How to Start Week 3

### Option 1: Load Ralph (Recommended)

Ralph has successfully delivered Weeks 1, 1.5, and 2. He can do Week 3:

```bash
# Ralph reads prd.json (already updated to Week 3)
# Ralph reads P8_WEEK3_READY_TO_RUN.md
# Ralph implements all 9 stories
# Ralph creates testing guide and checkpoint
```

### Option 2: Manual Implementation

```bash
# Review documentation
cat scripts/ralph/P8_WEEK3_READY_TO_RUN.md

# Create new branch
git checkout -b ralph/coach-impact-visibility-p8-week3

# Follow Phase 1-6 implementation order
# Test as you go
```

---

## 📊 P8 Complete Picture

### Current Status

| Week | Focus | Stories | Status |
|------|-------|---------|--------|
| Week 1 | Foundation | 4 | ✅ Complete |
| Week 1.5 | Trust Gate & Self-Service | 10 | ✅ Complete |
| Week 2 | My Impact Dashboard | 7 | ✅ Complete |
| **Week 3** | **Navigation & Polish** | **9** | **⏳ Ready to Start** |

**Total**: 30 stories = Complete Phase 8

### When Week 3 is Complete

Coaches will have:
1. ✅ Foundation query and tab structure
2. ✅ Flexible 3-tier permission system
3. ✅ Beautiful impact dashboard
4. ✅ **Bi-directional navigation** ← Week 3
5. ✅ **Parent engagement analytics** ← Week 3
6. ✅ **Export capability** ← Week 3

**Result**: Complete coach impact visibility system 🎉

---

## 🎯 Success Criteria

Week 3 is complete when:

- [ ] All 9 user stories implemented
- [ ] Bi-directional navigation works seamlessly
- [ ] Source badges show on skills/injuries in passport
- [ ] Deep linking scrolls to note + highlights
- [ ] Parent engagement analytics visible
- [ ] CSV export works
- [ ] Previous period comparisons display
- [ ] Loading skeleton shows
- [ ] Type checking passes
- [ ] Linting passes
- [ ] All 8 test cases pass
- [ ] Visual verification complete

---

## 📚 Documentation Available

Ralph has access to:

1. **P8_WEEK3_READY_TO_RUN.md** - Complete implementation guide (17 pages)
2. **p8-week3-navigation-polish.prd.json** - Structured PRD (350 lines)
3. **P8_COACH_IMPACT_VISIBILITY.md** - Main PRD (Week 3 section: lines 836-1236)
4. **P8_WEEK3_SUMMARY.md** - Executive summary
5. **P8_WEEK2_RALPH_CONTEXT.md** - Critical learnings from Week 2
6. **prd.json** - Ralph's configuration (updated to Week 3)

---

## ⏭️ After Week 3

**Next Phase**: Phase 9 - Team Collaboration Hub
- 4 weeks
- 30-35 stories
- Transform Voice Notes into team collaboration platform
- Comments, reactions, @mentions, activity feed, multi-view, templates

---

## 🎉 Ready to Launch

Everything is in place for Ralph to start Week 3:

✅ Documentation complete (17 pages)
✅ PRD configured (9 stories)
✅ Learnings incorporated (type safety, Better Auth, etc.)
✅ Critical warnings highlighted (schema check)
✅ Implementation order defined
✅ Testing strategy documented
✅ Success criteria clear

**Status**: READY FOR RALPH ✅

**Estimated Time**: 4-6 hours

**Result**: Complete Phase 8 (30 stories total) 🚀

---

**End of Setup Documentation**

Ralph can now start implementing P8 Week 3. All systems go! 🎉
