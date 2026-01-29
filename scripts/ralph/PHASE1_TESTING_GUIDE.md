# Phase 1 Manual Testing Guide

## Prerequisites

### 1. Environment Setup
```bash
# Ensure you're on Phase 1 branch
git checkout ralph/coach-parent-summaries-phase1

# Verify clean build
npm run check-types

# Start dev server (if not already running)
npm run dev
```

### 2. Convex Dashboard Setup
1. Go to your Convex dashboard
2. Navigate to Settings → Environment Variables
3. Add `ANTHROPIC_API_KEY` with your Anthropic API key
4. This is required for AI summary generation

### 3. Test Accounts Needed
You need accounts with these roles in the same organization:
- **Coach account** - Has coach functional role, assigned to a team with players
- **Parent account** - Has parent functional role, linked to at least one player (child)

---

## Test Scenarios

### TEST 1: Voice Note Creates AI Summary (Backend Pipeline)

**Goal:** Verify the full pipeline: voice note → insight extraction → AI classification → summary generation

**Steps:**
1. Login as **coach**
2. Navigate to: `/orgs/[orgId]/coach/voice-notes`
3. Create a new voice note mentioning a specific player by name
   - Example: "Today I worked with [Player Name] on their passing technique. They're showing good improvement but still struggling with their left foot."
4. Wait for transcription to complete (watch the status)
5. Wait for insight extraction (may take 30-60 seconds)

**Expected Result:**
- After insight extraction completes, a new pending summary should appear
- Check Convex dashboard → Data → `coachParentSummaries` table
- Should see a new record with `status: "pending_review"`

**If it fails:**
- Check Convex Functions logs for errors
- Verify ANTHROPIC_API_KEY is set
- Check that the player mentioned has a `playerIdentityId`

---

### TEST 2: Coach Sees Pending Summaries Section

**Goal:** Verify the UI shows pending summaries

**Steps:**
1. Login as **coach** (same one who created the voice note)
2. Navigate to: `/orgs/[orgId]/coach/voice-notes`
3. Look for "Pending Parent Summaries" section

**Expected Result:**
- Section heading "Pending Parent Summaries" is visible
- Summary card shows:
  - Player name
  - AI-generated summary (parent-friendly text)
  - Confidence indicator (High/Medium/Review)
  - "Approve" button
  - "Don't Share" button

**If section is missing:**
- May have no pending summaries - create a voice note first (Test 1)
- Check browser console for errors
- Verify the query is returning data

---

### TEST 3: Expand Original Insight (Collapsible)

**Goal:** Verify coach can see the original insight

**Steps:**
1. On the pending summary card, find the expand/collapse trigger
2. Click to expand

**Expected Result:**
- Collapsible section expands
- Shows original insight title and description (the coach's private notes)
- Shows category and sentiment if available

---

### TEST 4: Approve a Summary

**Goal:** Verify approval workflow

**Steps:**
1. On a pending summary card, click "Approve" button
2. Observe the response

**Expected Result:**
- Button shows loading state briefly
- Toast notification: "Summary approved" or similar
- Summary card disappears from pending list
- In Convex dashboard: record status changed to "approved"
- `approvedAt` and `approvedBy` fields are populated

---

### TEST 5: Suppress a Summary

**Goal:** Verify suppression workflow (create another voice note first)

**Steps:**
1. Create another voice note with player insight (Test 1)
2. On the new pending summary, click "Don't Share" button
3. Observe the response

**Expected Result:**
- Button shows loading state briefly
- Toast notification confirms suppression
- Summary card disappears from pending list
- In Convex dashboard: record status changed to "suppressed"

---

### TEST 6: Parent Sees Unread Badge

**Goal:** Verify parent navigation shows unread count

**Steps:**
1. **First:** Ensure there's at least one approved summary (from Test 4)
2. Login as **parent** (linked to the player from the approved summary)
3. Navigate to: `/orgs/[orgId]/parents`
4. Look at the sidebar navigation

**Expected Result:**
- "Coach Feedback" link in sidebar
- Red badge with unread count (should be "1" if one summary approved)
- If count > 9, shows "9+"

**If badge is missing:**
- Verify parent is linked to the correct player
- Check Convex data: `guardianPlayerLinks` table should have the link
- Verify summary status is "approved" not "pending_review"

---

### TEST 7: Parent Views Summaries (Grouped Display)

**Goal:** Verify parent can see summaries grouped by child and sport

**Steps:**
1. Login as **parent**
2. Navigate to: `/orgs/[orgId]/parents`
3. Find "Coach Feedback" section or tab

**Expected Result:**
- Summaries grouped by child (h3 header with child's name)
- Within each child, grouped by sport (h4 header with sport name)
- Each summary shows:
  - AI-generated content (positive, parent-friendly)
  - Timestamp ("2 hours ago", etc.)
  - "NEW" badge if unread

---

### TEST 8: Mark Summary as Viewed

**Goal:** Verify view tracking works

**Steps:**
1. As parent, click on an unread summary (with NEW badge)
2. Observe the changes

**Expected Result:**
- "NEW" badge disappears from the clicked summary
- Unread count in navigation decreases by 1
- In Convex dashboard:
  - `coachParentSummaries` record: `viewedAt` is set, `status` is "viewed"
  - `parentSummaryViews` table: new record with view details

---

### TEST 9: Empty States

**Goal:** Verify empty states display correctly

**9a. Coach - No Pending Summaries:**
1. Approve/suppress all pending summaries
2. Check voice notes dashboard
3. **Expected:** Empty state or section hidden

**9b. Parent - No Summaries:**
1. Login as parent with no approved summaries
2. Check Coach Feedback section
3. **Expected:** Helpful empty state message

---

### TEST 10: Sensitivity Classification (Edge Case)

**Goal:** Verify injury/behavior insights are flagged

**Steps:**
1. Login as coach
2. Create voice note mentioning injury: "Player [Name] twisted their ankle today during practice. They should rest for a few days."
3. Wait for processing

**Expected Result:**
- Summary is created with `sensitivityCategory: "injury"`
- Requires manual review (status should be `pending_review`)
- May show warning indicator in UI

**Note:** The current implementation skips auto-processing for injury/behavior categories, so this tests the classification system.

---

## Quick Verification Checklist

| # | Test | Status |
|---|------|--------|
| 1 | Voice note creates summary in DB | ☐ |
| 2 | Coach sees pending summaries UI | ☐ |
| 3 | Collapsible original insight works | ☐ |
| 4 | Approve button works | ☐ |
| 5 | Suppress button works | ☐ |
| 6 | Parent sees unread badge | ☐ |
| 7 | Parent sees grouped summaries | ☐ |
| 8 | Mark as viewed works | ☐ |
| 9 | Empty states display | ☐ |
| 10 | Injury classification flagged | ☐ |

---

## Troubleshooting

### "No summaries appearing after voice note"
1. Check Convex Functions logs for errors
2. Verify `ANTHROPIC_API_KEY` is set in Convex dashboard
3. Check if insight extraction completed (`insightsStatus: "completed"` on voice note)
4. Verify player mentioned has a valid `playerIdentityId`

### "Parent can't see any summaries"
1. Verify summary status is "approved" (not "pending_review")
2. Check `guardianPlayerLinks` table - parent must be linked to the player
3. Verify parent is viewing the correct organization

### "Approve/Suppress not working"
1. Check browser console for errors
2. Verify you're logged in as the coach who owns the summary
3. Check Convex Functions logs

### "AI summaries are poor quality"
1. Check the prompt in `packages/backend/convex/actions/coachParentSummaries.ts`
2. The `generateParentSummary` function transforms insights
3. May need prompt tuning for your use case

---

## Database Tables to Check

In Convex Dashboard → Data:

| Table | What to Check |
|-------|---------------|
| `coachParentSummaries` | New records created, status changes |
| `parentSummaryViews` | View tracking records |
| `voiceNotes` | `insightsStatus` should be "completed" |

---

## After Testing

Once all tests pass:
1. Note any issues found
2. Decide if Phase 1 is ready to push/PR
3. Proceed with Phase 2 setup
