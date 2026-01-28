# P8 Phase 8 - Complete Testing Guide

**Branch**: `ralph/coach-impact-visibility-p8-week1`
**Status**: ✅ Week 1 Complete | ✅ Week 1.5 Complete | ✅ Week 2 Complete
**Last Updated**: January 28, 2026

---

## 🎯 Quick Overview: What Was Built

### Phase 8.1 (Week 1) - Foundation
**Goal**: Remove trust gate blocking + create backend query + scaffold My Impact tab

**What Was Implemented**:
1. ✅ Backend query `getCoachImpactSummary` - aggregates coach activity across 6 tables
2. ✅ Removed trust level gate from "Sent to Parents" tab
3. ✅ Created My Impact tab structure with date range filtering
4. ✅ Added My Impact tab to voice notes navigation

**Impact**: Level 0-1 coaches can now see sent parent summaries

---

### Phase 8.1.5 (Week 1.5) - Self-Service Access Control
**Goal**: Add back controllable trust gates with 3-tier permission system + coach self-service

**What Was Implemented**:
1. ✅ **Backend Permission System (US-P8-021)**:
   - 8-priority access logic
   - 6 queries (checkCoachParentAccess, getAllCoachesWithAccessStatus, etc.)
   - 8 mutations (toggle, block, grant, revoke, etc.)

2. ✅ **Platform Staff UI (US-P8-022 + US-P8-022B)** - DEFERRED FOR NOW:
   - Overview dashboard with metrics
   - Feature flags management table
   - Bulk operations across orgs

3. ✅ **Org Admin UI (US-P8-023)**:
   - Trust gate status dashboard
   - Bulk controls (grant all / block all)
   - Individual coach access management
   - Pending override requests review

4. ✅ **Coach Self-Service (US-P8-027-030)**:
   - Dropdown menu to hide tab
   - "Request Access" button
   - Toggle confirmation dialogs
   - Real-time tab visibility

**Impact**: Flexible 3-tier permission system with self-service controls

---

### Phase 8.2 (Week 2) - My Impact Dashboard
**Goal**: Fill in My Impact tab with comprehensive coaching metrics

**What Was Implemented**:
1. ✅ **Impact Summary Cards (US-P8-005)**:
   - 4 metric cards: Voice Notes, Insights Applied, Sent to Parents, Parent View Rate
   - Responsive grid layout (1 col → 2 col → 4 col)

2. ✅ **Sent Summaries Section (US-P8-006)**:
   - Table view (desktop) / Card view (mobile)
   - Status badges: Acknowledged, Viewed, Sent
   - Shows first 10 with "View All" button

3. ✅ **Applied Insights Section (US-P8-007)**:
   - Collapsible categories: Skills, Injuries
   - Links to player passport
   - Shows first 5 per category

4. ✅ **Enhanced Date Range (US-P8-008)**:
   - Added "Last 3 Months" and "This Season" options
   - Season calculates dynamically (Sept 1 - Aug 31)

5. ✅ **Team Observations Section (US-P8-009)**:
   - Card list with team badges
   - Shows first 10 observations

6. ✅ **Search & Filters (US-P8-010 + US-P8-011)**:
   - Debounced search (300ms)
   - Category filters: All, Skills, Injuries
   - Result count display

**Impact**: Complete dashboard showing coaching impact and parent engagement

---

## 🧪 How to Test Each Phase

### Phase 8.1 Testing (Foundation)

#### Test Account Setup
- **Coach accounts**: Need Level 0, Level 1, and Level 2 coaches
- **Test account**: `neil.B@blablablak.com` / `lien1979`

#### Quick Test (5 minutes)

**Test 1: Backend Query**
```bash
# Navigate to Convex dashboard
# Functions → voiceNotes → getCoachImpactSummary
# Run with:
{
  "coachId": "<your-coach-id>",
  "organizationId": "<your-org-id>",
  "dateRange": {
    "start": 0,
    "end": 1706486400000
  }
}
# Verify: Returns object with all fields
```

**Test 2: Trust Gate Removal**
1. Login as Level 0 or Level 1 coach
2. Navigate to `/orgs/[orgId]/coach/voice-notes`
3. ✅ Verify: "Sent to Parents" tab is visible (was hidden before)
4. Click tab
5. ✅ Verify: Can see sent summaries

**Test 3: My Impact Tab**
1. Stay on voice notes dashboard
2. ✅ Verify: "My Impact" tab appears in navigation
3. Click "My Impact" tab
4. ✅ Verify: Loading skeleton appears
5. ✅ Verify: Date range dropdown shows (Last 7 Days, Last 30 Days, All Time)
6. Change date range
7. ✅ Verify: Selection persists (localStorage)

#### Comprehensive Test
See individual UAT files:
- `scripts/ralph/agents/output/tests/coach-impact-visibility-p8-week1-US-P8-001-uat.md`
- `scripts/ralph/agents/output/tests/coach-impact-visibility-p8-week1-US-P8-002-uat.md`
- `scripts/ralph/agents/output/tests/coach-impact-visibility-p8-week1-US-P8-003-uat.md`
- `scripts/ralph/agents/output/tests/coach-impact-visibility-p8-week1-US-P8-004-uat.md`

---

### Phase 8.1.5 Testing (Self-Service Access Control)

#### Test Account Setup
- **Platform staff**: Account with `isPlatformStaff: true` (for `/platform/feature-flags` testing)
- **Org admin**: Account with Admin role in organization
- **Coach**: Regular coach account
- **Multiple coaches**: Need 3-5 coaches for bulk testing
- **Multiple orgs**: Need 2-3 organizations for platform staff testing

#### Quick Test (15 minutes)

**Test 0: Platform Staff Overview (Optional)**
1. Login as platform staff
2. Navigate to `/platform/feature-flags`
3. ✅ Verify: Overview dashboard shows 4 metric cards
4. ✅ Verify: Organization table lists all orgs
5. ✅ Verify: Can toggle "Gates Enabled" for an org
6. ✅ Verify: Can toggle "Admin Delegation" and "Coach Overrides"
7. ✅ Verify: Search filters organizations
8. ✅ Verify: Quick filters work (All, Gates Disabled, etc.)

**Test 1: Coach Self-Service (Hide Tab)**
1. Login as coach with access
2. Navigate to voice notes dashboard
3. ✅ Verify: "Sent to Parents" tab visible with dropdown chevron (▼)
4. Click chevron
5. ✅ Verify: Dropdown menu appears with "Hide this tab"
6. Click "Hide this tab"
7. ✅ Verify: Confirmation dialog appears
8. Confirm
9. ✅ Verify: Tab disappears
10. ✅ Verify: Toast notification shows

**Test 2: Coach Self-Service (Show Tab)**
1. After hiding tab in Test 1
2. ✅ Verify: Green "Request Access" button appears
3. Click "Request Access"
4. ✅ Verify: Dialog explains "You previously hid this tab"
5. Click "Re-enable Access"
6. ✅ Verify: Tab reappears
7. ✅ Verify: Toast notification shows

**Test 3: Admin Bulk Block**
1. Login as org admin
2. Navigate to `/orgs/[orgId]/admin/settings/features`
3. ✅ Verify: Trust Gate Status Dashboard visible
4. Find "Block All Coaches" toggle
5. Enable toggle
6. ✅ Verify: Confirmation dialog appears
7. Confirm
8. ✅ Verify: Toast shows "Blocked all coaches"
9. Login as coach (in another browser/incognito)
10. ✅ Verify: "Sent to Parents" tab is LOCKED
11. ✅ Verify: Tooltip shows "Blocked by administrator"

**Test 4: Admin Individual Coach Block**
1. Still logged in as org admin
2. On features page, find "Individual Coach Access Control" table
3. Find a specific coach in the table
4. Click "Block" button
5. ✅ Verify: Dialog appears asking for reason
6. Enter reason: "Test block"
7. Confirm
8. ✅ Verify: Coach status changes to 🚫 "Blocked"
9. Login as that coach
10. ✅ Verify: Tab locked with "Blocked by administrator: Test block"

**Test 5: Admin Unblock Coach**
1. Back to admin features page
2. Find blocked coach
3. Click "Unblock"
4. ✅ Verify: Toast shows "Unblocked [Coach Name]"
5. Coach tab should now be accessible

#### Comprehensive Test
See full test guides:
- **Quick Guide**: `docs/testing/Voice Insights/p8-week1.5-quick-test-guide.md`
- **Full 40 Test Cases**: `docs/testing/Voice Insights/p8-week1.5-self-service-access-testing-guide.md`

Test sections include:
- Section A: Platform Staff Controls (4 tests) - ✅ Implemented at `/platform/feature-flags`
- Section B: Org Admin Controls (7 tests) - ✅ Implemented
- Section C: Coach Self-Service Controls (8 tests) - ✅ Implemented
- Section D: Complex Scenarios (8 tests)
- Section E: Edge Cases & Error Handling (6 tests)
- Section F: Integration Tests (4 tests)
- Section G: Performance Tests (3 tests)

---

### Phase 8.2 Testing (My Impact Dashboard)

#### Test Data Requirements
- Need coach with existing voice notes
- Need some parent summaries sent
- Need some insights applied (skills, injuries)
- Need some team observations

#### Quick Test (15 minutes)

**Test 1: Summary Cards (US-P8-005)**
1. Login as coach
2. Navigate to My Impact tab
3. ✅ Verify: 4 cards display in row on desktop
4. ✅ Verify: Cards show:
   - Voice Notes (blue, Mic icon)
   - Insights Applied (green, CheckCircle icon)
   - Sent to Parents (purple, Send icon)
   - Parent View Rate (amber, Eye icon, shows %)
5. Resize browser to mobile (375px)
6. ✅ Verify: Cards stack vertically (1 column)
7. Resize to tablet (768px)
8. ✅ Verify: Cards show 2 columns

**Test 2: Sent Summaries Section (US-P8-006)**
1. Scroll down to "Sent to Parents" section
2. ✅ Verify: Desktop shows table with columns: Player, Summary, Sent At, Status
3. ✅ Verify: Status badges show: Acknowledged (green), Viewed (gray), or Sent (outline)
4. ✅ Verify: Relative timestamps show ("2 hours ago")
5. Resize to mobile
6. ✅ Verify: Switches to card layout
7. If more than 10 summaries:
   - ✅ Verify: "View All X Summaries" button appears

**Test 3: Applied Insights Section (US-P8-007)**
1. Find "Applied to Player Profiles" section
2. ✅ Verify: Shows "X insights" badge
3. ✅ Verify: Two collapsible categories: Skills, Injuries
4. Click "Skills" section
5. ✅ Verify: Expands to show skill changes
6. ✅ Verify: Each card shows player name, description, timestamp
7. ✅ Verify: "View in Passport →" button links to player profile
8. Click button
9. ✅ Verify: Opens player passport at skills tab

**Test 4: Date Range Filtering (US-P8-008)**
1. Top of page, find date range dropdown
2. ✅ Verify: Shows 5 options:
   - Last 7 Days
   - Last 30 Days
   - Last 3 Months (NEW)
   - This Season (NEW)
   - All Time
3. Select "Last 7 Days"
4. ✅ Verify: All sections update to show last 7 days data
5. ✅ Verify: Counts change in summary cards
6. Select "This Season"
7. ✅ Verify: Shows current season data (Sept 1 - now)

**Test 5: Team Observations (US-P8-009)**
1. Scroll to "Team Observations" section
2. ✅ Verify: Shows card list with team names
3. ✅ Verify: Each card has team badge and timestamp
4. If more than 10 observations:
   - ✅ Verify: "View All X Observations" button appears

**Test 6: Search & Filters (US-P8-010 + US-P8-011)**
1. In "Applied to Player Profiles" section
2. ✅ Verify: Search input appears at top
3. Type player name
4. ✅ Verify: Results filter (debounced, 300ms delay)
5. ✅ Verify: Shows "Showing X of Y insights"
6. Clear search (X button)
7. ✅ Verify: Category filter chips appear: All, Skills (X), Injuries (Y)
8. Click "Skills" chip
9. ✅ Verify: Only Skills category shows
10. ✅ Verify: Injuries section hides
11. Click "All"
12. ✅ Verify: Both categories show again

#### Comprehensive Test
See individual UAT files:
- `scripts/ralph/agents/output/tests/coach-impact-visibility-p8-week1-US-P8-005-uat.md` - Summary Cards
- `scripts/ralph/agents/output/tests/coach-impact-visibility-p8-week1-US-P8-006-uat.md` - Sent Summaries
- `scripts/ralph/agents/output/tests/coach-impact-visibility-p8-week1-US-P8-007-uat.md` - Applied Insights
- `scripts/ralph/agents/output/tests/coach-impact-visibility-p8-week1-US-P8-008-uat.md` - Date Range
- `scripts/ralph/agents/output/tests/coach-impact-visibility-p8-week1-US-P8-009-uat.md` - Team Observations
- `scripts/ralph/agents/output/tests/coach-impact-visibility-p8-week1-US-P8-010-uat.md` - Search
- `scripts/ralph/agents/output/tests/coach-impact-visibility-p8-week1-US-P8-011-uat.md` - Filters

---

## 🎬 Recommended Testing Order

### Option 1: Quick Validation (30 minutes)
**Goal**: Verify all features work at basic level

1. **Phase 8.1 Quick Test** (5 min)
   - Verify My Impact tab appears
   - Check date range filtering works
   - Confirm Sent to Parents tab visible for Level 0-1

2. **Phase 8.1.5 Quick Test** (10 min)
   - Coach hide/show tab
   - Admin block/unblock coach
   - Admin bulk block all

3. **Phase 8.2 Quick Test** (15 min)
   - Verify all 4 summary cards
   - Check responsive layout (mobile/desktop)
   - Test search and filters
   - Test date range changes

### Option 2: Comprehensive Testing (2-3 hours)
**Goal**: Full UAT covering all edge cases

1. **Phase 8.1 Comprehensive** (30 min)
   - Run all 4 UAT test files
   - Test with different coach trust levels
   - Verify backend query in Convex dashboard

2. **Phase 8.1.5 Comprehensive** (60-90 min)
   - Follow full 40 test case guide
   - Test all 8 priority levels
   - Test complex scenarios (blanket block + individual override)
   - Test edge cases (expired overrides, etc.)

3. **Phase 8.2 Comprehensive** (60 min)
   - Run all 7 UAT test files
   - Test with empty data
   - Test with large datasets (pagination)
   - Verify responsive layouts at multiple breakpoints

---

## 🐛 Known Issues & Limitations

### Phase 8.1
- None identified

### Phase 8.1.5
- Override expiration (overrideExpiresAt) is in schema but not enforced yet
- Platform staff UI is at `/platform/feature-flags` (not `/platform-admin/feature-flags`)

### Phase 8.2
- "View All" buttons in Applied Insights (Skills/Injuries) and Team Observations don't navigate yet (placeholders)
- "View All Summaries" button in Sent Summaries section DOES work (navigates to "Sent to Parents" tab)
- Parent engagement metrics section not yet implemented (planned for Week 3)

---

## 📝 Manual Testing Checklist

Use this checklist to track your testing progress:

### Phase 8.1 - Foundation
- [ ] Backend query returns valid data (Convex dashboard test)
- [ ] Sent to Parents tab visible for Level 0 coaches
- [ ] Sent to Parents tab visible for Level 1 coaches
- [ ] Sent to Parents tab visible for Level 2+ coaches
- [ ] My Impact tab appears in navigation
- [ ] My Impact tab loads without errors
- [ ] Date range dropdown works (3 options)
- [ ] Date range selection persists in localStorage

### Phase 8.1.5 - Self-Service Access
- [ ] Coach can hide tab using dropdown chevron
- [ ] Confirmation dialog appears before hiding
- [ ] Tab disappears after hiding
- [ ] "Request Access" button appears when hidden
- [ ] Coach can re-enable tab immediately
- [ ] Admin can view all coaches with status
- [ ] Admin can block individual coach with reason
- [ ] Admin can unblock individual coach
- [ ] Admin can enable "Block All Coaches"
- [ ] All coaches lose access when bulk blocked
- [ ] Admin can disable "Block All Coaches"
- [ ] Blocked coaches see locked tab with tooltip
- [ ] Toast notifications appear for all actions

### Phase 8.2 - My Impact Dashboard
- [ ] 4 summary cards display correctly
- [ ] Cards show correct icons and colors
- [ ] Cards responsive (1 col → 2 col → 4 col)
- [ ] Sent Summaries section shows table (desktop)
- [ ] Sent Summaries section shows cards (mobile)
- [ ] Status badges show correct colors
- [ ] Applied Insights section has 2 collapsible categories
- [ ] Skills category shows skill changes
- [ ] Injuries category shows injury records
- [ ] "View in Passport" links work
- [ ] Date range dropdown has 5 options
- [ ] Date range changes update all sections
- [ ] "This Season" calculates correctly (Sept 1 - now)
- [ ] Team Observations section shows cards
- [ ] Search filters Applied Insights
- [ ] Search is debounced (300ms)
- [ ] Category filters work (All, Skills, Injuries)
- [ ] Result count updates ("Showing X of Y")
- [ ] Empty states show when no data

---

## 🔗 Related Documentation

### PRD Files
- `scripts/ralph/prds/Coaches Voice Insights/p8-week1-foundation.prd.json`
- `scripts/ralph/prds/Coaches Voice Insights/p8-week1.5-trust-gate-fix.prd.json`
- `scripts/ralph/prds/Coaches Voice Insights/p8-week2-my-impact-dashboard.prd.json`

### Status Documents
- `scripts/ralph/P8_CHECKPOINT_JAN28.md` - Week 1 & 1.5 completion summary
- `scripts/ralph/P8_WEEK2_READY_TO_RUN.md` - Week 2 setup guide

### Testing Guides
- `docs/testing/Voice Insights/p8-week1.5-quick-test-guide.md`
- `docs/testing/Voice Insights/p8-week1.5-self-service-access-testing-guide.md`
- `scripts/ralph/agents/output/tests/coach-impact-visibility-p8-week1-US-P8-*.md` (16 UAT files)

### Implementation Guides
- `scripts/ralph/P8_SELF_SERVICE_IMPLEMENTATION.md` - Backend patterns
- `scripts/ralph/P8_RALPH_CONTEXT.md` - Full context from P1-P7

---

## ✅ Test Results Template

Use this template to record your test results:

```markdown
## P8 Testing Results - [Your Name] - [Date]

### Environment
- Branch: ralph/coach-impact-visibility-p8-week1
- Test account: [username]
- Browser: [browser + version]
- Device: [desktop/mobile/tablet]

### Phase 8.1 Results
- Backend Query: ✅ / ❌ [notes]
- Trust Gate Removal: ✅ / ❌ [notes]
- My Impact Tab: ✅ / ❌ [notes]

### Phase 8.1.5 Results
- Coach Hide Tab: ✅ / ❌ [notes]
- Coach Show Tab: ✅ / ❌ [notes]
- Admin Block Coach: ✅ / ❌ [notes]
- Admin Bulk Block: ✅ / ❌ [notes]

### Phase 8.2 Results
- Summary Cards: ✅ / ❌ [notes]
- Sent Summaries: ✅ / ❌ [notes]
- Applied Insights: ✅ / ❌ [notes]
- Date Filtering: ✅ / ❌ [notes]
- Search & Filters: ✅ / ❌ [notes]

### Issues Found
1. [Issue description]
2. [Issue description]

### Overall Assessment
[Pass / Needs Work / Blocked]

### Next Steps
[What should happen next]
```

---

**Testing Status**: ⏳ Awaiting manual verification
**Ready for Production**: After successful manual testing ✅
