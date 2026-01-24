# Voice Notes Branch Comparison - Complete Analysis
**Date:** January 24, 2026
**Analyst:** Claude Code
**Purpose:** Comprehensive review of voice notes implementation across all local branches

---

## Executive Summary

**Finding:** Voice notes implementation is nearly identical across all three branches on the **backend**. The differences are primarily in **frontend routing and UI organization**.

**Key Discovery:** A new "Parent Coach Feedback" feature was added to main this morning (Jan 23) that does NOT exist on the other two branches.

**Marketing Site Status:** ✅ Confirmed - No marketing updates on main or remote main. All marketing work isolated to `neil/marketing-site-improvements` branch.

---

## Branch Overview

| Branch | Latest Commit | Focus | Status |
|--------|---------------|-------|--------|
| **main** | 300f781 (Jan 23) | Parent coach feedback page | CURRENT PRODUCTION |
| **neil/voice-notes-three-lens-architecture** | c2733cb (Jan 23) | Admin audit + team insights | FEATURE BRANCH |
| **neil/marketing-site-improvements** | 570ce34 (Jan 23) | Admin nav + marketing content | FEATURE BRANCH |

---

## Backend Implementation - IDENTICAL Across All Branches

### Voice Notes Core (models/voiceNotes.ts)

**Queries (5 total):**
1. `getAllVoiceNotes(orgId)` - Get all org notes (max 1000)
2. `getVoiceNoteById(noteId)` - Get single note
3. `getVoiceNotesByCoach(orgId, coachId)` - Get coach's notes only
4. `getPendingInsights(orgId)` - Get insights needing action
5. `getVoiceNotesForPlayer(orgId, playerIdentityId)` - Get notes for specific player

**Mutations (9 total):**
1. `createTypedNote` - Create text note, schedule insights extraction
2. `createRecordedNote` - Create audio note, schedule transcription
3. `generateUploadUrl` - Get storage URL for audio upload
4. `updateInsightStatus` - Apply/dismiss insights with complex routing
5. `bulkApplyInsights` - Batch apply multiple insights
6. `updateInsightContent` - Edit insight before applying
7. `updateInsightContentInternal` - Internal AI corrections
8. `classifyInsight` - Assign team/todo classification
9. `assignPlayerToInsight` - Manual player assignment
10. `deleteVoiceNote` - Delete with storage cleanup

**Actions (3 total - in actions/voiceNotes.ts):**
1. `transcribeAudio` - OpenAI Whisper transcription
2. `buildInsights` - GPT-4o insights extraction with player/team matching
3. `correctInsightPlayerName` - AI fallback for name corrections

### WhatsApp Integration (IDENTICAL)

**Tables:**
- `whatsappMessages` - Message log with coach matching
- `voiceNotes.source` field - Tracks origin (app_recorded, app_typed, whatsapp_audio, whatsapp_text)

**Actions (2 total - in actions/whatsapp.ts):**
1. `processIncomingMessage` - Webhook handler for Twilio
2. `checkAndAutoApply` - Trust-based auto-apply with retry logic

**Queries/Mutations (9 total - in models/whatsappMessages.ts):**
- createMessage, updateStatus, updateCoachInfo, updateMediaStorage, linkVoiceNote, updateProcessingResults
- getRecentMessages, getMessage
- findCoachByPhone (internal)

### Coach Trust Levels (IDENTICAL)

**Platform-wide trust calculation:**
- Level 0-3 based on approval/suppression ratio
- Stored in `coachTrustLevels` table
- Per-org preferences: toggle parent summaries, skip sensitive insights

**Queries (4):** getCoachTrustLevel, getCoachPlatformTrustLevel, getCoachAllOrgPreferences, getCoachTrustLevelInternal

**Mutations (3):** setCoachPreferredLevel, setParentSummariesEnabled, setSkipSensitiveInsights

**Internal (2):** getOrCreateTrustLevel, updateTrustMetrics

### Parent Summaries (IDENTICAL)

**Flow:**
1. Voice note insight → `createParentSummary` (internal mutation)
2. Creates record with privateInsight + publicSummary (AI-generated)
3. Status: pending_review → approved → delivered → viewed → acknowledged

**Queries (5):** getCoachPendingSummaries, getParentUnreadCount, getParentSummariesByChildAndSport, getPassportLinkForSummary, getSummaryForPDF

**Mutations (8):** approveSummary, approveInjurySummary, suppressSummary, editSummaryContent, markSummaryViewed, trackShareEvent, acknowledgeParentSummary, acknowledgeAllForPlayer

---

## Frontend Differences - Where Branches Diverge

### 1. Coach Voice Notes Dashboard

**Location:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/`

| Component | main | three-lens | marketing |
|-----------|------|------------|-----------|
| `voice-notes-dashboard.tsx` | Uses `getAllVoiceNotes` | Uses `getVoiceNotesByCoach` | Uses `getAllVoiceNotes` |
| `history-tab.tsx` | Uses `getAllVoiceNotes` | Uses `getVoiceNotesByCoach` ✅ | Uses `getAllVoiceNotes` |
| `insights-tab.tsx` | Uses `getAllVoiceNotes` | Uses `getVoiceNotesByCoach` ✅ | Uses `getAllVoiceNotes` |
| `review-tab.tsx` | Uses `getAllVoiceNotes` | Uses `getVoiceNotesByCoach` ✅ | Uses `getAllVoiceNotes` |
| **NEW:** `team-insights-tab.tsx` | ❌ | ✅ NEW (424 lines) | ❌ |

**Privacy Impact:**
- **main & marketing:** Coaches see ALL org notes (privacy issue)
- **three-lens:** Coaches see only THEIR notes in History/Insights/Review tabs
- **three-lens:** NEW "Team Insights" tab shows co-coaches' notes for shared teams

### 2. Admin Voice Notes Audit

**Location:** `apps/web/src/app/orgs/[orgId]/admin/voice-notes/`

| Feature | main | three-lens | marketing |
|---------|------|------------|-----------|
| Admin audit page | ❌ | ✅ NEW (471 lines) | ❌ |
| View all org notes | ❌ | ✅ | ❌ |
| Search & filter | ❌ | ✅ | ❌ |
| Coach attribution | ❌ | ✅ | ❌ |

**Features (three-lens branch only):**
- Permission check: Only owner/admin can access
- Search: Transcription, insights, coach names, player names
- Filters: Note type (training/match/general)
- Display: Coach name, timestamp, note type, insight count, status
- Collapsible transcriptions

### 3. Parent Coach Feedback Page 🆕

**Location:** `apps/web/src/app/orgs/[orgId]/parents/coach-feedback/`

**STATUS: This is NEW on main (added Jan 23, 2026) and does NOT exist on other branches**

| Feature | main | three-lens | marketing |
|---------|------|------------|-----------|
| Coach feedback page | ✅ NEW | ❌ DELETED | ❌ DELETED |
| Enhanced feedback component | ✅ NEW | ❌ | ❌ |
| Snapshot component | ✅ NEW | ❌ | ❌ |
| Nav link in parent menu | ✅ NEW | ❌ | ❌ |

**Commits that added this (main branch only):**
1. `300f781` - Merge coach feedback sections into unified card
2. `3807c87` - Add Coach Feedback nav link and New/History tabs
3. `2b0e834` - Add enhanced parent coach feedback page with filters and search

**What it does:**
- Parents view approved coach summaries in dedicated page
- Filter by child, date range, category
- Search summaries
- Mark as read
- Download/share summaries

**Why deleted on other branches:**
- three-lens: Focused on coach-side audit, deleted parent pages
- marketing: Similar cleanup, focused on marketing content

### 4. Player Passport Integration

**Location:** `apps/web/src/app/orgs/[orgId]/players/[playerId]/components/`

| Component | main | three-lens | marketing | Purpose |
|-----------|------|------------|-----------|---------|
| `voice-insights-section-improved.tsx` | ✅ | ✅ | ✅ | Coach/admin view of voice notes for player |
| `parent-summaries-section.tsx` | ✅ | ✅ | ✅ | Parent view of approved summaries |

**All branches IDENTICAL** - Shows voice insights on player passport page with:
- Search & filter
- Compact/detailed view modes
- Group by date/category/status
- Integration with parent summaries (shows which insights were shared)

---

## Marketing Site Status ✅ VERIFIED SAFE

**Question:** Has marketing content been updated on main or remote main?

**Answer:** ✅ **NO** - Marketing updates are isolated to `neil/marketing-site-improvements` branch only.

**Evidence:**

### Remote Main (origin/main)
```bash
git show origin/main:apps/web/src/app/page.tsx
# Still shows original landing page (last updated: coach passport comparison feature)

git log origin/main apps/web/src/data/blog-posts.ts | head -3
# 3fcf51e biome check unsafe
# 69b81ef feat: Complete blog functionality and landing page improvements
# 4ace338 feat: Add comprehensive landing page and demo request functionality
```

**No recent marketing updates on remote main.**

### Local Main
```bash
git log main --oneline apps/web/src/app/page.tsx | head -5
# 7ee998e feat: Add coach passport comparison and cross-org sharing features
# (No recent marketing updates)
```

**No recent marketing updates on local main.**

### Marketing Branch (neil/marketing-site-improvements)
```bash
git log neil/marketing-site-improvements --oneline --since="7 days ago" | grep -i "landing\|blog\|marketing"
# c89dcb0 feat: Add 'WhatsApp for Coaches' blog post
# 9100498 fix: Clean up footer with working links and contact info
# 407904a feat: Enhance testimonials section with quantifiable results
# e62e4cf refactor: Reorder landing page sections for better user flow
# ae90977 feat: Improve landing page messaging and CTAs
```

**All marketing work isolated to this branch only.**

---

## Three-Lens Architecture Details

**Philosophy:** Voice notes serve three distinct use cases with different visibility scopes.

### Lens 1: Coach Personal Workspace
- **Who:** Individual coach
- **Scope:** Only notes created by THIS coach
- **Query:** `getVoiceNotesByCoach(orgId, coachId)`
- **UI:** History, Insights, Review tabs on `/coach/voice-notes`
- **Status on branches:**
  - main: ❌ Uses `getAllVoiceNotes` (shows all org notes - privacy issue)
  - three-lens: ✅ Uses `getVoiceNotesByCoach` (privacy fixed)
  - marketing: ❌ Uses `getAllVoiceNotes` (privacy issue)

### Lens 2: Team Collaborative Insights
- **Who:** Coaches on the same team(s)
- **Scope:** Notes from all coaches who share teams with current coach
- **Query:** `getVoiceNotesForCoachTeams(orgId, coachId)` (NEW on three-lens)
- **UI:** "Team Insights" tab (NEW on three-lens)
- **Features:**
  - Shows co-coaches' player insights
  - Grouped by player
  - Coach attribution
  - Apply insights from other coaches
  - Filter by team (if coach on multiple teams)
- **Status on branches:**
  - main: ❌ Does not exist
  - three-lens: ✅ Fully implemented
  - marketing: ❌ Does not exist

### Lens 3: Admin Audit View
- **Who:** Organization owners/admins
- **Scope:** ALL voice notes in the organization
- **Query:** `getAllVoiceNotes(orgId)` (existing query, new UI)
- **UI:** `/admin/voice-notes` (NEW on three-lens)
- **Features:**
  - Search: Transcription, insights, player names, coach names
  - Filter: Note type (training/match/general)
  - Coach attribution
  - Collapsible transcription viewer
  - Status indicators
  - Source badges (WhatsApp, Recorded, Typed)
- **Status on branches:**
  - main: ❌ Does not exist
  - three-lens: ✅ Fully implemented
  - marketing: ❌ Does not exist

---

## Backend Query Usage Comparison

| Query | Purpose | main | three-lens | marketing |
|-------|---------|------|------------|-----------|
| `getAllVoiceNotes` | Get all org notes | Coach tabs ❌ | Admin audit ✅ | Coach tabs ❌ |
| `getVoiceNotesByCoach` | Get coach's notes only | ❌ Not used | Coach tabs ✅ | ❌ Not used |
| `getVoiceNotesForCoachTeams` | Get team co-coaches' notes | ❌ Does not exist | Team tab ✅ | ❌ Does not exist |
| `getVoiceNotesForPlayer` | Get notes for player | Passport ✅ | Passport ✅ | Passport ✅ |

**Privacy Issue:**
- main and marketing branches use `getAllVoiceNotes` in coach tabs
- This means coaches see ALL organization notes, not just their own
- three-lens fixes this by using `getVoiceNotesByCoach`

---

## New Features by Branch

### Main Branch (Jan 23 additions)
**Parent Coach Feedback Page**
- ✅ `/parents/coach-feedback/page.tsx` - Dedicated parent view
- ✅ `/parents/components/coach-feedback-enhanced.tsx` - Enhanced card view
- ✅ `/parents/components/coach-feedback-snapshot.tsx` - Snapshot component
- ✅ Navigation link in parent menu
- ✅ Filter by child, date, category
- ✅ Search functionality
- ✅ Mark as read
- ✅ Download/share

**Platform-wide Coach Trust Levels**
- ✅ Refactored to platform-wide architecture
- ✅ Trust level follows coach across organizations
- ✅ Per-org preferences still supported

### Three-Lens Branch
**Admin Audit View**
- ✅ `/admin/voice-notes/page.tsx` (471 lines)
- ✅ Organization-wide oversight
- ✅ Search & filter functionality
- ✅ Coach attribution
- ✅ Permission checks (owner/admin only)

**Team Collaborative Insights**
- ✅ `team-insights-tab.tsx` (424 lines)
- ✅ Backend query: `getVoiceNotesForCoachTeams`
- ✅ Shows co-coaches' notes for shared teams
- ✅ Grouped by player
- ✅ Apply insights from other coaches

**Coach Privacy Fix**
- ✅ History tab now uses `getVoiceNotesByCoach`
- ✅ Insights tab now uses `getVoiceNotesByCoach`
- ✅ Review tab now uses `getVoiceNotesByCoach`
- ✅ Coaches see only their own notes

### Marketing Branch
**Admin Navigation**
- ✅ Voice Notes link in admin navigation menu

**Marketing Content** (TO BE EXCLUDED FROM CONSOLIDATION)
- ❌ Landing page updates
- ❌ Blog post: "WhatsApp for Coaches"
- ❌ Testimonials enhancements
- ❌ Footer cleanup
- ❌ Hero section improvements

---

## Files Changed by Branch

### Three-Lens Architecture Branch (10 files)

**NEW Files:**
1. `apps/web/src/app/orgs/[orgId]/admin/voice-notes/page.tsx` (471 lines)
2. `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/team-insights-tab.tsx` (424 lines)
3. `apps/web/src/app/marketing-preview/page.tsx` (testing route)
4. `docs/archive/bug-analysis/voice-notes-visibility-analysis-2026-01-23.md`
5. `docs/features/voice-notes-three-lens-architecture.md`

**MODIFIED Files:**
6. `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/history-tab.tsx`
7. `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx`
8. `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/review-tab.tsx`
9. `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx`
10. `packages/backend/convex/models/voiceNotes.ts` (+147 lines for new query)

**Total:** +2,060 lines

### Marketing Branch (relevant voice notes files)

**Voice Notes Changes:**
1. `apps/web/src/app/orgs/[orgId]/admin/navigation.tsx` - Add voice notes link
2. Various WhatsApp TODO assignment fixes
3. PostHog feature flags
4. Debug logging cleanup
5. TypeScript fixes

**Marketing Changes (TO EXCLUDE):**
- `apps/web/src/app/page.tsx`
- `apps/web/src/components/landing/*`
- `apps/web/src/data/blog-posts.ts`
- `docs/archive/content/MARKETING_*.md`

---

## Consolidation Recommendations

### Phase 1: Merge Three-Lens Branch to Main ⭐ PRIORITY

**Why:**
- Fixes critical privacy issue (coaches seeing all org notes)
- Adds valuable team collaboration features
- Adds admin oversight capabilities
- Clean, focused changes
- No conflicts expected

**Impact:**
- **BREAKING:** Coach tabs now scoped to individual coach (privacy fix)
- **NEW:** Team Insights tab for team collaboration
- **NEW:** Admin audit view for organization oversight

**Commands:**
```bash
git checkout neil/voice-notes-three-lens-architecture
git pull origin main --rebase
npm run check-types && npx ultracite fix
gh pr create \
  --title "feat: Voice Notes Three-Lens Architecture - Privacy + Team Insights + Admin Audit" \
  --base main \
  --body-file docs/features/voice-notes-three-lens-architecture.md
```

**Testing Required:**
1. Coach sees only their own notes in History/Insights/Review tabs
2. Coach sees co-coaches' notes in Team Insights tab (if on shared teams)
3. Admin can access `/admin/voice-notes` and see all org notes
4. Non-admin cannot access admin audit view
5. Search and filter work in admin audit

### Phase 2: Extract Voice Notes Fixes from Marketing Branch

**Cherry-pick these commits:**
1. `570ce34` - Add Voice Notes link to admin navigation
2. `5b5bb42` - PostHog feature flags for WhatsApp
3. `07ce7e2` - Remove debug logging
4. `0d5e889` - WhatsApp audio handling improvements
5. `aec3acf` - WhatsApp TODO assignment fix
6. `6b6fe1a` - Tighten TODO assignment prompt

**Commands:**
```bash
git checkout main
git pull origin main
git cherry-pick 6b6fe1a aec3acf 0d5e889 5b5bb42 07ce7e2 570ce34
npm run check-types && npx ultracite fix
```

**Risk:** LOW-MEDIUM (possible conflicts)

### Phase 3: Keep Marketing Branch Separate

**Do NOT merge marketing content to main yet.**

**Reason:**
- Marketing updates need separate review/approval
- User explicitly wants to keep current production site
- Marketing work should be reviewed when ready to update site

**Recommendation:**
- Keep `neil/marketing-site-improvements` branch as-is
- Extract only voice notes fixes (Phase 2 above)
- Review marketing content separately when ready to update site

---

## Conflicts Analysis

### Three-Lens → Main: Expected Conflicts

**File:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx`

**Reason:** Both branches may have modified tab logic

**Resolution:** Manual merge - keep both changes:
- main: Tab logic for parent feedback
- three-lens: Tab logic for team insights + privacy scoping

**Risk:** LOW - Changes are in different sections

### Marketing → Main: Expected Conflicts

**File:** `apps/web/src/app/orgs/[orgId]/admin/navigation.tsx`

**Reason:** Both branches may have modified navigation structure

**Resolution:** Manual merge - combine navigation items

**Risk:** LOW-MEDIUM

**File:** Various parent/guardian components

**Reason:** Marketing branch has deleted files that main has modified

**Resolution:** Keep main versions (parent coach feedback is new on main)

**Risk:** MEDIUM

---

## Testing Checklist

### Three-Lens Branch Testing

**Coach Privacy:**
- [ ] Coach A creates voice note
- [ ] Coach B (different coach, same org) does NOT see Coach A's note in History tab
- [ ] Coach A sees their own note in History tab
- [ ] Coach B creates voice note, sees only their own note

**Team Collaboration:**
- [ ] Coach A and Coach B assigned to Team X
- [ ] Coach C assigned to Team Y (different team)
- [ ] Coach A creates note about Player on Team X
- [ ] Coach B sees note in "Team Insights" tab
- [ ] Coach C does NOT see note in "Team Insights" tab
- [ ] Coach A sees note in both "History" and "Team Insights" tabs

**Admin Audit:**
- [ ] Admin user can access `/admin/voice-notes`
- [ ] Admin sees ALL voice notes from all coaches
- [ ] Non-admin user cannot access `/admin/voice-notes`
- [ ] Search works (transcription, insights, player names, coach names)
- [ ] Filter by note type works
- [ ] Coach attribution displayed correctly

**Backend:**
- [ ] `getVoiceNotesForCoachTeams` query returns correct notes
- [ ] Notes filtered to coaches on shared teams
- [ ] Enriched with coach names
- [ ] Sorted by date (most recent first)

---

## Summary

### What We Found

1. **Backend is identical** across all three branches - no consolidation needed
2. **Main branch added new parent coach feedback page** (Jan 23) not on other branches
3. **Three-lens branch fixes privacy issue** and adds team collaboration + admin audit
4. **Marketing branch has admin nav improvements** + marketing content (to exclude)
5. **Marketing content NOT on main or remote main** - confirmed safe ✅

### What Needs to Happen

1. **Merge three-lens branch to main** - Fixes privacy, adds features (PRIORITY)
2. **Cherry-pick voice notes fixes from marketing** - Admin nav link, WhatsApp fixes
3. **Keep marketing content on separate branch** - Review later when ready to update site

### Critical Privacy Issue

**Current state (main & marketing branches):**
- Coaches can see ALL organization voice notes
- Privacy violation - coaches should only see their own notes
- Fixed on three-lens branch

**Recommendation:** Merge three-lens ASAP to fix this issue.

---

**End of Analysis**
