# Phase 4 Quick Checklist

## US-P9-058: Insights Tab ⏳

### Schema (0.5h)
- [ ] Create `teamInsights` table in schema.ts
- [ ] Add indexes: by_team_and_org, by_org_and_status, by_voice_note
- [ ] Extend teamActivityFeed.actionType: Add "insight_generated"
- [ ] Extend teamActivityFeed.entityType: Add "insight"
- [ ] Run: `npm run check-types` → verify zero errors

### Backend (2h)
- [ ] Create models/teamInsights.ts with:
  - [ ] getTeamInsights query (with cursor pagination)
  - [ ] createInsight mutation (with activity feed entry)
  - [ ] dismissInsight mutation
  - [ ] markInsightViewed mutation
- [ ] Enhance getTeamOverviewStats in teams.ts:
  - [ ] Add unreadInsights count
  - [ ] Add highPriorityInsights count
- [ ] Use Better Auth patterns (user._id, user.name)
- [ ] Use batch fetch pattern (no N+1 queries)
- [ ] Use composite indexes (no .filter() after .withIndex())

### Frontend (2h)
- [ ] Create components/insights-tab.tsx
  - [ ] Copy structure from tasks-tab.tsx
  - [ ] Cursor-based pagination (copy from activity-feed-view.tsx)
  - [ ] Load 50 insights per page
  - [ ] Empty states
  - [ ] Loading states (skeleton grid)
- [ ] Create components/insight-card.tsx
  - [ ] Copy structure from task-card.tsx
  - [ ] Show category, title, description, priority, status
  - [ ] Voice note badge (if voiceNoteId)
  - [ ] Watermark: generated date
  - [ ] Click: open modal, mark as viewed
- [ ] Create components/insight-filters.tsx
  - [ ] Status tabs (All/New/Viewed)
  - [ ] Category dropdown
  - [ ] Priority dropdown
  - [ ] Sort dropdown
  - [ ] Search input
- [ ] Create components/insight-detail-modal.tsx
  - [ ] Show full details
  - [ ] Dismiss button
  - [ ] View voice note link (if voiceNoteId)
  - [ ] Auto-mark as viewed on open
- [ ] Wire up in page.tsx (add to TabsContent)

### Overview Integration (0.5h)
- [ ] Update quick-stats-panel.tsx
  - [ ] Replace "Upcoming Events" → "Unread Insights"
  - [ ] Use Lightbulb icon
  - [ ] Show unreadInsights count
  - [ ] Subtitle: highPriorityInsights count
  - [ ] Colors: purple (text-purple-500, bg-purple-500/10)
  - [ ] Click: navigate to Insights tab with "new" filter

### Testing
- [ ] Manual browser test: Create insight
- [ ] Manual browser test: View insight (status updates)
- [ ] Manual browser test: Dismiss insight
- [ ] Manual browser test: Filters work
- [ ] Manual browser test: Pagination works
- [ ] Manual browser test: Voice note link works
- [ ] Manual browser test: Activity feed shows events
- [ ] Manual browser test: Quick Stats shows correct counts
- [ ] Manual browser test: Mobile responsive

### Tracking
- [ ] Add US-P9-058 to .tested-stories
- [ ] Add US-P9-058 to .audited-stories
- [ ] Add p9-week4-team-hub:US-P9-058 to .documented-stories
- [ ] Update prd.json: Set passes = true
- [ ] Update progress.txt: Mark US-P9-058 complete

---

## US-P9-NAV: Navigation Integration ⏳

### Changes (0.5h)
- [ ] Update coach-sidebar.tsx
  - [ ] Add "Team Hub" link in Development section
  - [ ] Position: After "Team Insights"
  - [ ] Icon: LayoutGrid
- [ ] Update bottom-nav.tsx
  - [ ] Update to 5 items:
    - [ ] Overview (Home)
    - [ ] Players (Users)
    - [ ] Voice (Mic, **highlight: true**)
    - [ ] Hub (LayoutGrid)
    - [ ] Tasks (CheckSquare)
  - [ ] Verify Voice is center-right position
  - [ ] Verify highlight styling works

### Testing
- [ ] Manual browser test: Sidebar link works
- [ ] Manual browser test: Bottom nav displays 5 items
- [ ] Manual browser test: Voice item is highlighted
- [ ] Manual browser test: Mobile responsive

### Tracking
- [ ] Add US-P9-NAV to tracking files
- [ ] Update prd.json: Set passes = true
- [ ] Update progress.txt: Mark complete

---

## US-P9-041: Tone Controls ⏳

### Schema (0.5h)
- [ ] Extend coachOrgPreferences table in schema.ts
- [ ] Add: parentSummaryTone: v.optional(v.union('warm', 'professional', 'brief'))
- [ ] Run: `npm run check-types`

### Backend (0.5h)
- [ ] Create mutation: updateParentSummaryTone
- [ ] Use Better Auth patterns

### Frontend (1h)
- [ ] Add tone dropdown to preferences/settings page
- [ ] Add live preview card with 3 examples:
  - [ ] Warm: "Great news! Emma's tackling skills have really improved..."
  - [ ] Professional: "Emma's tackling rating has improved from 3/5 to 4/5..."
  - [ ] Brief: "Emma: Tackling 3/5 → 4/5. Good progress."
- [ ] Save button calls mutation
- [ ] Show success toast on save

### Testing
- [ ] Manual browser test: Dropdown shows 3 options
- [ ] Manual browser test: Preview updates on selection
- [ ] Manual browser test: Save persists selection
- [ ] Manual browser test: Reload shows saved value

### Tracking
- [ ] Add US-P9-041 to tracking files
- [ ] Update prd.json: Set passes = true
- [ ] Update progress.txt: Mark complete

---

## Final Delivery Checklist ✅

### Pre-Delivery
- [ ] All 4 stories passes = true in prd.json
- [ ] All 4 stories in .tested-stories
- [ ] All 4 stories in .audited-stories
- [ ] All 4 stories in .documented-stories
- [ ] progress.txt shows Phase 4 complete

### Code Quality
- [ ] Run: `npm run check-types` → 0 errors
- [ ] Run: `npx ultracite fix` → 0 errors
- [ ] No console errors in browser
- [ ] All commits have Co-Authored-By

### Integration Testing
- [ ] Tasks Tab fully functional
- [ ] Insights Tab fully functional
- [ ] Navigation works from all entry points
- [ ] Activity Feed shows all event types
- [ ] Overview Dashboard shows all stats
- [ ] Quick Stats clicks navigate correctly
- [ ] Voice note badges/links work
- [ ] Mobile responsive (375px, 768px, 1024px)

### Git
- [ ] All changes committed
- [ ] Branch clean (no uncommitted changes)
- [ ] Ready for PR/merge

---

**Current Status**: US-P9-057 ✅ | US-P9-058 ⏳ | US-P9-NAV ⏳ | US-P9-041 ⏳

**Next Action**: Start US-P9-058 (Insights Tab)
