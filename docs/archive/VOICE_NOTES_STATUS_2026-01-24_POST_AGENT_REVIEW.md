# Voice Notes Status - Post Agent Review
**Date:** January 24, 2026 (11:57 AM)
**Review Type:** Comprehensive post-agent work analysis
**Purpose:** Identify what was added to main and what local work still needs to be consolidated

---

## What Another Agent Did (Last 24 Hours)

### ✅ Successfully Added to Main

**1. Multi-Org WhatsApp Detection (6d1a028)**
- **When:** Jan 24, 2026 11:57 AM
- **What:** Sophisticated organization context detection for coaches in multiple organizations
- **Files Changed:**
  - `packages/backend/convex/actions/whatsapp.ts` (+418 lines)
  - `packages/backend/convex/models/whatsappMessages.ts` (+943 lines)
  - `packages/backend/convex/schema.ts` (+73 lines)
- **New Features:**
  - whatsappSessions table (2-hour session memory)
  - whatsappPendingMessages table (org selection workflow)
  - `findCoachWithOrgContext` query with intelligent detection:
    - Explicit org mention (@Grange, for Grange, etc.)
    - Team name matching
    - Age group pattern extraction (u12, under-12, etc.)
    - Sport keyword detection
    - Player name matching
    - Coach name matching
    - Session memory fallback
  - Org selection workflow when ambiguous

**2. Parent Coach Feedback Page** (300f781, 3807c87, 2b0e834)
- **When:** Jan 23, 2026
- **What:** Dedicated parent view for approved summaries
- **Files:**
  - `apps/web/src/app/orgs/[orgId]/parents/coach-feedback/page.tsx` (NEW)
  - `apps/web/src/components/coach-feedback-enhanced.tsx` (NEW)
- **Features:**
  - Filter by child, date, category
  - Search functionality
  - Mark as read
  - Download/share summaries

**3. Platform-Wide Coach Trust Levels** (ba879f9)
- **When:** Jan 23, 2026
- **What:** Refactored trust levels to be platform-wide (not just org-specific)

### ❌ NOT Added to Main (Still on Branches)

**Three-Lens Architecture Features:**
- ❌ Admin Voice Notes Audit page
- ❌ Team Collaborative Insights tab
- ❌ Coach-scoped query privacy fixes
- ❌ `getVoiceNotesForCoachTeams` backend query

**Marketing Site Updates:**
- ❌ Landing page improvements
- ❌ Blog posts (WhatsApp for Coaches)
- ❌ Testimonials enhancements
- ❌ Footer cleanup

---

## Current Branch Status

### main (Production)

**Latest Commit:** `6d1a028` - Multi-org WhatsApp detection (Jan 24)

**Features Present:**
- ✅ Voice notes core (create, transcribe, insights)
- ✅ WhatsApp integration with multi-org detection (NEW)
- ✅ Parent summaries system
- ✅ Coach trust levels (platform-wide)
- ✅ Parent coach feedback page
- ✅ Player passport voice insights integration

**Privacy Issue:**
- ❌ Coaches see ALL org notes (uses `getAllVoiceNotes`)
- ❌ No coach-level scoping in History/Insights/Review tabs

**Missing Features:**
- ❌ Admin audit view
- ❌ Team collaborative insights
- ❌ Coach privacy scoping

**Files Changed Since Our Last Analysis:**
```
packages/backend/convex/actions/whatsapp.ts         | +418 lines
packages/backend/convex/models/whatsappMessages.ts  | +943 lines
packages/backend/convex/schema.ts                   | +73 lines
apps/web/src/app/orgs/[orgId]/parents/coach-feedback/page.tsx | NEW
apps/web/src/components/coach-feedback-enhanced.tsx | NEW
```

---

### neil/voice-notes-three-lens-architecture

**Latest Commit:** `c2733cb` - Marketing preview route (Jan 23)

**Unique Features NOT on Main:**
- ✅ Admin Voice Notes Audit view (`/admin/voice-notes/page.tsx` - 471 lines)
- ✅ Team Collaborative Insights tab (`team-insights-tab.tsx` - 424 lines)
- ✅ Coach-scoped queries (privacy fix)
- ✅ `getVoiceNotesForCoachTeams` backend query (+147 lines)
- ✅ Coach privacy documentation

**Missing from Main:**
- ❌ Multi-org WhatsApp detection
- ❌ Parent coach feedback page
- ❌ Platform-wide trust levels

**Files Different from Main:**
```
NEW FILES:
- apps/web/src/app/orgs/[orgId]/admin/voice-notes/page.tsx (471 lines)
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/team-insights-tab.tsx (424 lines)
- docs/features/voice-notes-three-lens-architecture.md
- docs/archive/bug-analysis/voice-notes-visibility-analysis-2026-01-23.md

MODIFIED FILES:
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx
  (uses getVoiceNotesByCoach instead of getAllVoiceNotes)
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/history-tab.tsx
  (uses getVoiceNotesByCoach)
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx
  (uses getVoiceNotesByCoach)
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/review-tab.tsx
  (uses getVoiceNotesByCoach)
- packages/backend/convex/models/voiceNotes.ts
  (adds getVoiceNotesForCoachTeams query)
```

**Total Changes:** 10 files, +2,060 lines

---

### neil/marketing-site-improvements

**Latest Commit:** `570ce34` - Add Voice Notes link to admin navigation (Jan 23)

**Voice Notes Changes:**
- ✅ Admin navigation link for voice notes
- ❌ No three-lens features
- ❌ No multi-org WhatsApp
- ❌ No parent feedback page

**Marketing Content (NOT ON MAIN):**
- Landing page updates
- Blog posts
- Testimonials
- Footer changes

**Status:** Mixed content - needs cherry-picking to separate voice notes from marketing

---

## Stash Review

**Checked 17 Stashes - Results:**

| Stash | Branch | Type | Contains |
|-------|--------|------|----------|
| stash@{0} | main | Auto-backup | lint-staged |
| stash@{1} | marketing | WIP | API changes + feedback logs |
| stash@{2} | marketing | WIP | No significant code |
| stash@{3} | three-lens | WIP | No significant code |
| stash@{4} | marketing | WIP | Feedback logs (148 lines) |
| stash@{5} | three-lens | WIP | Work in progress note |
| stash@{6-16} | Various | WIP/Auto | Feedback logs, lint backups |

**Conclusion:** No critical code lost in stashes - mostly auto-backups and feedback logs.

---

## Feature Comparison Matrix

| Feature | main | three-lens | marketing | Status |
|---------|------|------------|-----------|---------|
| **Voice Notes Core** | ✅ | ✅ | ✅ | All branches |
| **WhatsApp Integration** | ✅ Basic | ✅ Basic | ✅ Basic | All branches |
| **Multi-Org WhatsApp Detection** | ✅ NEW | ❌ | ❌ | main only |
| **Parent Summaries** | ✅ | ✅ | ✅ | All branches |
| **Platform-Wide Trust Levels** | ✅ NEW | ❌ | ❌ | main only |
| **Parent Feedback Page** | ✅ NEW | ❌ | ❌ | main only |
| **Coach Privacy Fix** | ❌ | ✅ | ❌ | three-lens only |
| **Team Insights Tab** | ❌ | ✅ | ❌ | three-lens only |
| **Admin Audit View** | ❌ | ✅ | ❌ | three-lens only |
| **Admin Nav Link** | ❌ | ❌ | ✅ | marketing only |
| **Marketing Site Updates** | ❌ | ❌ | ✅ | marketing only |

---

## Critical Privacy Issue STILL EXISTS on Main

**Problem:** Coaches can see ALL organization voice notes, not just their own.

**Location:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx:44`
  ```typescript
  const voiceNotes = useQuery(api.models.voiceNotes.getAllVoiceNotes, {
    orgId,
  });
  ```

**Impact:**
- Coach A can see Coach B's notes
- Privacy violation
- Performance issue (loads all org notes)

**Solution:** On three-lens branch - uses `getVoiceNotesByCoach` instead

---

## Backend Architecture Comparison

### WhatsApp Integration

**main (Multi-Org Detection):**
```
WhatsApp Message Received
  ↓
findCoachWithOrgContext(phoneNumber)
  ├─ Returns: { coach, orgs: [multiple], context: {...} }
  ├─ Single org → Auto-select
  ├─ Multiple orgs → Analyze context:
  │   ├─ Explicit mention (@Grange) → Select org
  │   ├─ Team name match → Select org
  │   ├─ Player name match → Select org
  │   ├─ Age group/sport match → Select org
  │   ├─ Session memory → Use previous org
  │   └─ Ambiguous → Create pending message
  └─ Pending message → Ask coach to select org
       ↓
  Coach replies "1", "2", or org name
       ↓
  Parse selection → Resolve pending message → Process note
```

**three-lens (Simple Single-Org):**
```
WhatsApp Message Received
  ↓
findCoachByPhone(phoneNumber)
  ├─ Returns: { coach, orgId }
  └─ Process note
```

**Difference:** main handles multi-org coaches, three-lens assumes single org

---

### Voice Notes Queries

**main Queries:**
```typescript
// 18 total functions
getAllVoiceNotes(orgId)          // Returns ALL org notes
getVoiceNotesByCoach(orgId, coachId)  // Returns coach's notes (UNUSED in UI)
getVoiceNotesForPlayer(orgId, playerId)  // Returns player's notes
```

**three-lens Queries:**
```typescript
// 19 total functions (all of main's + 1 new)
getVoiceNotesForCoachTeams(orgId, coachId)  // NEW - Returns team co-coaches' notes
```

**Usage Difference:**

| Component | main | three-lens |
|-----------|------|------------|
| Dashboard | getAllVoiceNotes | getVoiceNotesByCoach |
| History Tab | getAllVoiceNotes | getVoiceNotesByCoach |
| Insights Tab | getAllVoiceNotes | getVoiceNotesByCoach |
| Review Tab | getAllVoiceNotes | getVoiceNotesByCoach |
| Team Tab | N/A | getVoiceNotesForCoachTeams |

---

## Local Work That Needs Consolidation

### Priority 1: Three-Lens Features (CRITICAL)

**Why Critical:**
- Fixes privacy issue
- Adds team collaboration
- Adds admin oversight

**What to Consolidate:**
1. Admin audit view (`/admin/voice-notes/page.tsx`)
2. Team insights tab (`team-insights-tab.tsx`)
3. Coach-scoped query changes (privacy fix)
4. `getVoiceNotesForCoachTeams` backend query

**Challenge:** three-lens branch is missing:
- Multi-org WhatsApp detection
- Parent feedback page
- Platform-wide trust levels

**Solution:** Merge main INTO three-lens, then merge three-lens to main

### Priority 2: Marketing Branch Cleanup

**What to Extract:**
- Admin navigation link (voice notes)

**What to Leave:**
- All marketing content (for separate review)

---

## Merge Strategy Recommendation

### Option A: Three-Lens First (Recommended)

**Steps:**
1. Checkout three-lens branch
2. Merge main into three-lens (brings multi-org WhatsApp + parent feedback)
3. Resolve conflicts (keep both features)
4. Test thoroughly
5. Merge three-lens to main

**Commands:**
```bash
git checkout neil/voice-notes-three-lens-architecture
git merge main --no-ff
# Resolve conflicts:
#  - Keep getVoiceNotesByCoach for tabs
#  - Keep team insights tab
#  - Keep multi-org WhatsApp logic
#  - Keep parent feedback page
npm run check-types
npx ultracite fix
# Test manually
gh pr create --base main --title "feat: Voice Notes Three-Lens Architecture + Multi-Org WhatsApp"
```

**Conflicts Expected:**
- `voice-notes-dashboard.tsx` - Tab types (add "team" tab)
- `actions/whatsapp.ts` - Multi-org vs simple org detection (keep multi-org)
- Parent feedback page (three-lens doesn't have it - keep from main)

### Option B: Cherry-Pick Three-Lens to Main

**Steps:**
1. Cherry-pick admin audit commit
2. Cherry-pick team insights commit
3. Cherry-pick coach privacy fixes commit
4. Cherry-pick backend query commit

**Commands:**
```bash
git checkout main
git cherry-pick e199ef1  # Coach privacy fix
git cherry-pick b156dbf  # Team insights tab
git cherry-pick b0c661d  # Admin audit view
# Resolve conflicts and test
```

**Risk:** Higher conflict risk, harder to maintain

---

## Testing Requirements After Consolidation

### Multi-Org WhatsApp Tests

- [ ] Coach in single org sends note → Auto-processes
- [ ] Coach in multiple orgs sends note with team mention → Auto-selects org
- [ ] Coach in multiple orgs sends ambiguous note → Prompts for org selection
- [ ] Coach replies "1" → Selects first org
- [ ] Coach replies "Grange" → Selects org by name
- [ ] Session memory works (same org within 2 hours)
- [ ] Pending message expires after timeout

### Three-Lens Architecture Tests

- [ ] Coach sees only own notes in History tab
- [ ] Coach sees only own notes in Insights tab
- [ ] Team Insights tab shows co-coaches' notes
- [ ] Team Insights tab filters by team correctly
- [ ] Admin can access audit view
- [ ] Non-admin cannot access audit view
- [ ] Admin audit search works
- [ ] Admin audit filter works

### Parent Feedback Tests

- [ ] Parent sees approved summaries
- [ ] Parent can filter by child
- [ ] Parent can search summaries
- [ ] Parent can mark as read
- [ ] Parent can download/share

---

## Files Requiring Manual Review

### High Conflict Risk

1. **`packages/backend/convex/actions/whatsapp.ts`**
   - main: 1,083 lines (multi-org)
   - three-lens: 719 lines (simple org)
   - Decision: Keep main's multi-org logic

2. **`apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx`**
   - main: getAllVoiceNotes, 5 tabs
   - three-lens: getVoiceNotesByCoach, 6 tabs (adds team tab)
   - Decision: Use three-lens queries + keep all 6 tabs

3. **`packages/backend/convex/models/whatsappMessages.ts`**
   - main: 16 functions (multi-org helpers)
   - three-lens: 9 functions (basic)
   - Decision: Keep main's functions

### Medium Conflict Risk

4. **`packages/backend/convex/schema.ts`**
   - main: Has whatsappSessions, whatsappPendingMessages
   - three-lens: Doesn't have these tables
   - Decision: Keep main's schema additions

5. **Tab Components (history/insights/review)**
   - main: Uses getAllVoiceNotes
   - three-lens: Uses getVoiceNotesByCoach
   - Decision: Use three-lens (privacy fix)

---

## Summary of Local Work Status

### ✅ Successfully Consolidated (On Main)
- Multi-org WhatsApp detection
- Parent feedback page
- Platform-wide trust levels

### ❌ Still on Local Branches (Needs Consolidation)

**From neil/voice-notes-three-lens-architecture:**
- Admin audit view (471 lines)
- Team insights tab (424 lines)
- Coach privacy fixes
- `getVoiceNotesForCoachTeams` query

**From neil/marketing-site-improvements:**
- Admin navigation link
- Marketing content (to be reviewed separately)

### 💾 In Stashes (No Critical Code)
- Mostly feedback logs and lint backups
- No significant code to recover

---

## Recommended Next Steps

1. **Immediate:** Merge main into three-lens branch
2. **Resolve conflicts** (keep both features)
3. **Test** multi-org WhatsApp + three-lens architecture together
4. **Create PR** from three-lens to main
5. **After merge:** Cherry-pick admin nav link from marketing branch
6. **Later:** Review marketing content separately

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Merge conflicts | Medium | High | Manual conflict resolution, thorough testing |
| Lost functionality | High | Low | Both branches have complete features |
| Privacy regression | High | Low | Three-lens privacy fixes will be merged |
| Multi-org breakage | High | Medium | Comprehensive WhatsApp testing required |
| Performance issues | Medium | Low | Both implementations are optimized |

---

**End of Status Report**
**Next Action:** Proceed with Option A (Three-Lens First) merge strategy
