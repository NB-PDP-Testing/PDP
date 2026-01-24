# Remaining Work to Consolidate into Main
**Date:** January 24, 2026
**Status:** Post three-lens merge
**Purpose:** Identify remaining features from branches that need to be brought to main

---

## Summary

✅ **Already on Main:**
- Three-lens architecture (admin audit, team insights, coach privacy) - JUST MERGED
- Multi-org WhatsApp detection - ALREADY ON MAIN
- Parent feedback page - ALREADY ON MAIN
- Platform-wide trust levels - ALREADY ON MAIN
- WhatsApp feature flag - ALREADY ON MAIN

❌ **Still Missing from Main:**
- Admin navigation link for voice notes
- AI model transparency feature flag + component
- Related documentation files

---

## Priority 1: Admin Navigation Link (READY TO CHERRY-PICK)

**Commit:** `570ce34` from neil/marketing-site-improvements
**Date:** Jan 23, 2026
**Impact:** HIGH - Users can't access the admin voice notes page we just merged

### What It Adds:
1. Voice Notes link in admin sidebar (`/admin/voice-notes`)
2. Voice Notes link in admin horizontal navigation
3. Mic icon import
4. Positioned in "Content & Training" group

### Files Changed (3 files, +34 lines):
```
apps/web/src/app/orgs/[orgId]/admin/layout.tsx           | +1 line
apps/web/src/components/layout/admin-sidebar.tsx         | +6 lines
docs/archive/bug-fixes/ISSUE_312_RESOLUTION.md           | +27 lines (NEW)
```

### Changes in Detail:

**apps/web/src/app/orgs/[orgId]/admin/layout.tsx:**
```typescript
// Add to navigation links array (after Approvals, before Import)
{ href: `/orgs/${orgId}/admin/voice-notes`, label: "Voice Notes" },
```

**apps/web/src/components/layout/admin-sidebar.tsx:**
```typescript
// Add Mic import
import { ..., Mic } from "lucide-react";

// Add to Content & Training group
{
  icon: <Mic className="h-5 w-5" />,
  label: "Voice Notes",
  href: `/orgs/${params.orgId}/admin/voice-notes`,
  badge: undefined,
},
```

### Why Needed:
- We just merged the admin voice notes audit page
- Without this navigation link, admins can't access it
- Users would have to type the URL manually

### Risk: LOW
- Simple navigation change
- No logic changes
- No conflicts expected

### How to Merge:
```bash
git cherry-pick 570ce34
# OR manually apply the 3 file changes
```

---

## Priority 2: AI Model Transparency (OPTIONAL)

**Commit:** `5b5bb42` from neil/marketing-site-improvements
**Date:** Jan 23, 2026
**Impact:** MEDIUM - Nice-to-have for AI transparency

### What It Adds:
1. PostHog feature flag: `voice_notes_ai_model_display`
2. AIModelInfo component (shows which AI models are used)
3. Analytics events for model info views
4. Documentation

### Files Changed (4 files, +558 lines):
```
apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/ai-model-info.tsx (NEW - 115 lines)
apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx      (+3 lines)
apps/web/src/hooks/use-ux-feature-flags.ts                                      (+24 lines)
docs/features/whatsapp-voice-notes-feature-flag.md (NEW - 416 lines)
```

### Features:
- Shows coaches which AI models process their notes
  - Transcription: whisper-1
  - Insights: gpt-4o (or org-specific override)
- Non-intrusive info icon with tooltip
- Tracks analytics when viewed
- Builds AI transparency and trust

### Current Status on Main:
- ❌ AIModelInfo component doesn't exist
- ❌ `useVoiceNotesAiModelDisplay` flag not in hook return
- ✅ Documentation comment exists but not implemented

### Why It Might Be Needed:
- AI transparency is valuable
- Helps coaches understand the system
- Builds trust
- Analytics tracking

### Why It Might NOT Be Needed:
- Not critical for functionality
- Adds complexity
- Could be built fresh later when needed

### Risk: MEDIUM
- Modifies voice-notes-dashboard.tsx (potential conflict)
- Adds new component
- Changes feature flags hook

### Decision: **DEFER**
- Not critical for current functionality
- Can be added later when AI transparency is prioritized
- Would require testing

---

## Priority 3: Marketing Content (EXCLUDE)

**Commits:** Multiple from neil/marketing-site-improvements
**Status:** DO NOT MERGE YET

### What's There:
- Landing page updates
- Blog post: "WhatsApp for Coaches"
- Testimonials enhancements
- Footer cleanup
- Hero section improvements

### Why Exclude:
- User explicitly wants to review marketing separately
- Not ready to update production site
- Needs product review

### Action: KEEP ON BRANCH
- Leave neil/marketing-site-improvements as-is
- Review when ready to update marketing site

---

## Priority 4: Old WhatsApp/Voice Notes Commits (SKIP)

**Commits:** Various TODO assignment fixes, debug cleanup, etc.
**Status:** SUPERSEDED by newer work

### Why Skip:
- Main already has multi-org WhatsApp detection (6d1a028)
- The newer implementation is more comprehensive
- Old commits were from incremental development
- Cherry-picking would cause conflicts

### Examples of Old Commits (Skip These):
- `07ce7e2` - Remove debug logging (old iteration)
- `0d5e889` - WhatsApp audio handling (superseded)
- `aec3acf` - TODO assignment fix (superseded)
- `6b6fe1a` - TODO prompt (superseded)

### Why They're Superseded:
- Multi-org detection (6d1a028) rewrote WhatsApp integration
- New implementation is 1,434 lines of improvements
- Includes all the fixes from these old commits plus more

---

## Summary Table

| Item | Priority | Status | Action | Risk |
|------|----------|--------|--------|------|
| Admin nav link | HIGH | Ready | Cherry-pick 570ce34 | LOW |
| AI model transparency | MEDIUM | Optional | Defer | MEDIUM |
| Marketing content | N/A | Exclude | Keep on branch | N/A |
| Old WhatsApp fixes | N/A | Superseded | Skip | N/A |

---

## Recommended Action Plan

### Step 1: Add Admin Navigation Link ⭐ PRIORITY

**Option A: Cherry-pick (Clean)**
```bash
git cherry-pick 570ce34
# Will bring over:
# - Admin navigation links
# - Bug fix documentation
```

**Option B: Manual (If conflicts)**
```bash
# Manually add to apps/web/src/app/orgs/[orgId]/admin/layout.tsx
{ href: `/orgs/${orgId}/admin/voice-notes`, label: "Voice Notes" },

# Manually add to apps/web/src/components/layout/admin-sidebar.tsx
{
  icon: <Mic className="h-5 w-5" />,
  label: "Voice Notes",
  href: `/orgs/${params.orgId}/admin/voice-notes`,
  badge: undefined,
},
```

**Expected Result:**
- Admins can access voice notes audit page from navigation
- Both sidebar and horizontal nav have the link
- Positioned logically in "Content & Training" section

### Step 2: Push to Remote

```bash
git push origin main
```

### Step 3: Test in Production

- [ ] Admin can see "Voice Notes" link in sidebar
- [ ] Admin can click link and access audit page
- [ ] Permission check works (non-admins can't access)
- [ ] Search and filter work on audit page

### Step 4: Consider AI Transparency (Later)

**IF** you want AI transparency features:
- Cherry-pick `5b5bb42` to a new branch
- Test thoroughly (modifies dashboard)
- Create separate PR for review
- **NOT urgent** - can wait

---

## Files That Need Review After Merge

### Check These Files Manually:

1. **apps/web/src/app/orgs/[orgId]/admin/layout.tsx**
   - Should have Voice Notes link
   - Positioned after Approvals, before Import

2. **apps/web/src/components/layout/admin-sidebar.tsx**
   - Should have Voice Notes link with Mic icon
   - In Content & Training group

3. **apps/web/src/app/orgs/[orgId]/admin/voice-notes/page.tsx**
   - Should exist (from three-lens merge)
   - Permission check present
   - Query works

---

## What's Been Successfully Consolidated

### ✅ Jan 24 - Three-Lens Merge (1025926)
- Admin voice notes audit page
- Team collaborative insights tab
- Coach privacy fix (scoped queries)
- Backend query: getVoiceNotesForCoachTeams
- Documentation

### ✅ Jan 24 - Multi-Org WhatsApp (6d1a028)
- Intelligent org context detection
- Session memory
- Pending message workflow
- WhatsApp sessions table
- WhatsApp pending messages table

### ✅ Jan 23 - Parent Feedback (300f781, 3807c87, 2b0e834)
- Parent coach feedback page
- Enhanced feedback component
- Filter, search, mark as read
- Download/share summaries

### ✅ Earlier - Parent Summaries (PR #306)
- AI-generated parent summaries
- Approval workflow
- Trust-based auto-apply
- Acknowledgment system

---

## Verification Checklist

After adding admin navigation:

- [ ] Type check passes: `npm run check-types`
- [ ] Lint passes: `npx ultracite fix`
- [ ] Admin can access `/admin/voice-notes` from navigation
- [ ] Non-admin cannot access the page
- [ ] Sidebar shows Voice Notes with Mic icon
- [ ] Horizontal nav shows Voice Notes link
- [ ] All three-lens features work (admin audit, team insights, coach privacy)
- [ ] Multi-org WhatsApp still works
- [ ] Parent feedback page still works

---

**Next Action:** Cherry-pick commit 570ce34 to add admin navigation link

**End of Document**
