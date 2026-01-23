# Parent Dashboard Redesign - Implementation Update

**Issue:** #249 - [F08] Parent Dashboard Comprehensive Review & Enhancement
**Date:** January 22, 2026
**Branch:** `jkobrien/Parents_Dashboard`

---

## Summary

Implemented a comprehensive redesign of the parent dashboard to match the MVP layout from `mvp-app/src/PDPMicrosite.tsx`. Key changes include reorganized section order, new coach feedback snapshot component, and redesigned AI Practice Assistant with clickable child cards.

---

## Changes Implemented

### 1. Layout Reorganization

**New Layout Order (matches MVP):**
1. Header ("Your Family's Journey")
2. Weekly Schedule (moved up from bottom)
3. Summary Stats (4 cards)
4. Coach Feedback Snapshot (new - shows 3-4 recent items)
5. AI Practice Assistant (redesigned)
6. Children Cards (detailed cards)

**Removed from Main Page:**
- Passport Sharing promotional card (moved explanation to `/parents/sharing` page)
- Medical Information section (accessible via sidebar nav only)
- "Coming Soon" features card

### 2. New Component: CoachFeedbackSnapshot

**File:** `apps/web/src/app/orgs/[orgId]/parents/components/coach-feedback-snapshot.tsx`

- Shows 3-4 most recent coach feedback items
- "See All" link to full coach feedback page
- Displays child name, sport, timestamp, and summary
- Reuses existing `coachParentSummaries` query

### 3. AI Practice Assistant Redesign

**File:** `apps/web/src/app/orgs/[orgId]/parents/components/ai-practice-assistant.tsx`

**Before:** Dropdown selector to choose child, then generate button

**After:** Clickable child cards (one-click to generate plan)
- Grid layout with child cards
- Multi-sport children appear multiple times (once per sport enrollment)
- Sport emoji display for visual distinction
- "How it works" explanation section
- Full-width purple gradient design

### 4. Sharing Page Enhancement

**File:** `apps/web/src/app/orgs/[orgId]/parents/sharing/components/parent-sharing-dashboard.tsx`

- Added "What is Passport Sharing?" explanatory card after header
- Contains the information previously shown on the main dashboard promotional card

### 5. Updated HTML Mockup

**File:** `docs/mockups/parent-dashboard-redesign-with-sidebar.html`

- Added "How it works" explanation to AI Assistant section
- Enhanced children cards with Top Strengths (skill rating dots) and Attendance grid

---

## Files Modified

| File | Description |
|------|-------------|
| `apps/web/src/app/orgs/[orgId]/parents/page.tsx` | Main dashboard - reordered sections, removed items |
| `apps/web/src/app/orgs/[orgId]/parents/components/ai-practice-assistant.tsx` | Replaced dropdown with clickable child cards |
| `apps/web/src/app/orgs/[orgId]/parents/components/coach-feedback-snapshot.tsx` | **NEW** - Coach feedback snapshot component |
| `apps/web/src/app/orgs/[orgId]/parents/sharing/components/parent-sharing-dashboard.tsx` | Added explanatory card |
| `docs/mockups/parent-dashboard-redesign-with-sidebar.html` | Updated mockup with new design elements |

---

## Technical Details

### Multi-Sport Child Display

Children who play multiple sports (e.g., GAA and Soccer) now appear multiple times in the AI Assistant section:
- Fetches sport passports for all children via `getBulkPassportsForPlayers` query
- Creates one card per sport enrollment
- Each card shows sport emoji, sport name, and age group

### Coach Feedback Snapshot

- Reuses existing `getParentSummariesByChildAndSport` query
- Flattens hierarchical data structure
- Sorts by creation time (most recent first)
- Limits to 4 items maximum
- Formats relative timestamps (e.g., "2h ago", "Yesterday")

---

## Testing Notes

### Verification Completed
- Type check passes (`npm run check-types`)
- Layout verified in browser (empty state with no linked children)
- Mockup updated and viewable

### Manual Testing Required
- Test with parent account that has linked children
- Verify Weekly Schedule appears immediately after header
- Verify Coach Feedback Snapshot shows recent items
- Verify AI Assistant cards are clickable and generate plans
- Verify multi-sport children appear multiple times
- Test mobile responsive layout at 375px width

---

## Related Documentation

- Implementation plan: See conversation transcript
- MVP reference: `mvp-app/src/PDPMicrosite.tsx` lines 3847-4720
- Mockup: `docs/mockups/parent-dashboard-redesign-with-sidebar.html`
