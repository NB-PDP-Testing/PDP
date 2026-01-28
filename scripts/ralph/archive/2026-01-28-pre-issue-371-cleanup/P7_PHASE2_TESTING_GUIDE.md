# Phase 7.2 Testing Guide - Supervised Auto-Apply

**Date**: 2026-01-26
**Branch**: `ralph/coach-insights-auto-apply-p7-phase2`
**Status**: Ready for Testing

---

## Prerequisites

### Test Account
- **URL**: `http://localhost:3000`
- **Account**: `neil.B@blablablak.com` / `lien1979`
- **Role**: Coach

### Required Setup

**1. Verify Trust Level**
- Navigate to: `/orgs/{orgId}/coach/voice-notes`
- Click "Settings" tab
- Check trust level slider
- **Required**: Level 2 or higher for auto-apply to work

**If Level < 2**:
```
You need to manually set trust level to 2 for testing.
Update coachTrustLevels.currentLevel to 2 in Convex dashboard.
```

**2. Convex Dashboard Access**
- URL: https://dashboard.convex.dev
- Navigate to your project
- Open "Data" tab

---

## Test Scenario 1: Verify Auto-Apply Works (US-007)

**Goal**: Confirm high-confidence skill insights auto-apply for Level 2+ coaches

### Step 1: Create High-Confidence Skill Insight

**Option A: Create via Voice Note** (if AI processing works)
1. Navigate to Voice Notes tab
2. Create new voice note about a player's skill
3. Example: "John showed excellent passing today, his accuracy has improved to a solid 4 out of 5"
4. Wait for AI processing
5. Check Insights tab for new insight

**Option B: Create Manually in Convex** (faster for testing)
1. Open Convex dashboard → Data → `voiceNoteInsights`
2. Click "Insert document"
3. Fill in fields:
```json
{
  "voiceNoteId": "<existing voiceNote _id>",
  "coachId": "<your coach userId>",
  "organizationId": "<your org id>",
  "playerIdentityId": "<existing player _id>",
  "playerName": "Test Player",
  "title": "Improved Passing Skill",
  "description": "Player showed great improvement in passing accuracy",
  "category": "skill",
  "confidenceScore": 0.85,
  "status": "pending",
  "recommendedUpdate": "Passing: 4",
  "createdAt": <Date.now()>,
  "updatedAt": <Date.now()>
}
```

**Important**:
- `confidenceScore` must be >= 0.7 (default threshold)
- `category` must be "skill"
- `recommendedUpdate` format: "SkillName: RatingNumber" (e.g., "Passing: 4")

### Step 2: Trigger Auto-Apply

**Option A: Use UI** (if there's a trigger button)
- Navigate to Insights tab
- Look for high-confidence pending insight
- Should show blue "AI would auto-apply" badge (from Phase 7.1)
- Click any action that might trigger auto-apply

**Option B: Call Mutation Directly** (recommended for testing)
1. Open browser console on voice notes page
2. Get the insight ID from the insight card or Convex
3. Call mutation:
```javascript
// In browser console
const convex = window.convex; // If exposed
// Or use Convex dashboard "Functions" tab to call mutation directly
```

**Or use Convex Dashboard**:
1. Convex Dashboard → Functions
2. Find `voiceNoteInsights:autoApplyInsight`
3. Click "Run"
4. Args: `{ "insightId": "<insight _id>" }`
5. Click "Run mutation"

### Step 3: Verify Auto-Apply Happened

**Check 1: Insight Status Updated**
1. Convex Dashboard → Data → `voiceNoteInsights`
2. Find your test insight
3. Verify:
   - `status` changed from "pending" to "applied"
   - `appliedAt` has timestamp
   - `appliedBy` has coach userId
   - `autoAppliedByAI` is `true`

**Check 2: Audit Trail Created**
1. Convex Dashboard → Data → `autoAppliedInsights`
2. Find record matching your insight ID
3. Verify fields:
   - `insightId` matches
   - `confidenceScore` is 0.85 (or your value)
   - `appliedAt` has timestamp
   - `changeType` is "skill_rating"
   - `fieldChanged` is "Passing" (or your skill)
   - `previousValue` has old rating (or undefined if new)
   - `newValue` is "4" (or your rating)
   - `autoAppliedByAI` is `true`
   - `undoneAt` is `undefined`

**Check 3: Player Profile Updated**
1. Get `playerIdentityId` from insight
2. Convex Dashboard → Data → `sportPassports`
3. Find passport with `playerIdentityId` matching
4. Note `passportId` (_id of passport)
5. Navigate to `skillAssessments` table
6. Find record with:
   - `passportId` matching
   - `skillCode` matching skill name (e.g., "Passing")
7. Verify:
   - `rating` is 4 (or your new value)
   - `updatedAt` has recent timestamp

**Expected Result**: ✅ All 3 checks pass - insight applied, audit created, profile updated

---

## Test Scenario 2: Verify Auto-Apply Safety (US-007)

**Goal**: Confirm auto-apply is rejected for invalid cases

### Test 2A: Low Trust Level (Level 0 or 1)

1. Convex Dashboard → Data → `coachTrustLevels`
2. Find your coach record
3. Set `currentLevel` to 0 or 1
4. Try to trigger auto-apply (same as Scenario 1)
5. **Expected**: Mutation returns `{ success: false, message: "Level 2+ required" }`

### Test 2B: Low Confidence Score

1. Create insight with `confidenceScore: 0.5` (below 0.7 threshold)
2. Try to trigger auto-apply
3. **Expected**: Mutation returns `{ success: false, message: "Confidence too low" }`

### Test 2C: Wrong Category (Injury/Medical)

1. Create insight with `category: "injury"`
2. Try to trigger auto-apply
3. **Expected**: Mutation returns `{ success: false, message: "Only skill category can be auto-applied" }`

### Test 2D: Already Applied

1. Use same insight from Scenario 1 (already applied)
2. Try to trigger auto-apply again
3. **Expected**: Mutation returns `{ success: false, message: "Already applied" }`

**Expected Results**: ✅ All safety checks reject invalid auto-apply attempts

---

## Test Scenario 3: Verify UI Displays Auto-Applied Insights (US-009)

**Goal**: Confirm Auto-Applied tab shows insights correctly

### Step 1: Navigate to Auto-Applied Tab

1. Open browser: `http://localhost:3000/orgs/{orgId}/coach/voice-notes`
2. Click "Insights" tab
3. Should see TWO tabs:
   - "Pending Review" (existing)
   - "Auto-Applied" (NEW)
4. Click "Auto-Applied" tab

### Step 2: Verify Insight Card Display

**Check insight card shows**:
- ✅ Player name
- ✅ Insight title and description
- ✅ Green badge: "✓ Auto-Applied"
- ✅ Time applied: "Applied X minutes ago" (relative time)
- ✅ What changed: "Passing: 3 → 4" (previousValue → newValue)
- ✅ AI confidence progress bar with percentage
- ✅ [Undo] button
- ✅ [View Profile] button

**Visual Verification**:
- Take screenshot of Auto-Applied tab
- Verify all elements render correctly
- Check responsive layout (mobile/desktop)

### Step 3: Verify Empty State

1. If no auto-applied insights exist, should show:
   - Sparkles icon
   - "No auto-applied insights yet"
   - "When you reach Level 2, high-confidence skill insights will auto-apply here"

**Expected Result**: ✅ Auto-Applied tab displays correctly with all UI elements

---

## Test Scenario 4: Verify Undo Within 1 Hour (US-008)

**Goal**: Confirm undo works within 1-hour window

### Step 1: Trigger Undo

1. In Auto-Applied tab, find recent auto-applied insight
2. Verify [Undo] button is **enabled** (not grayed out)
3. Click [Undo] button
4. Undo confirmation dialog should open

### Step 2: Confirm Undo

**Dialog should show**:
- Title: "Undo Auto-Applied Insight"
- Message explaining what will be reverted
- Radio button options:
  - ○ Wrong player - AI applied to incorrect player
  - ○ Wrong rating - The suggested rating was incorrect
  - ○ Insight incorrect - The insight itself was wrong
  - ○ Changed my mind - I want to review this manually
  - ○ Duplicate - This was already applied
  - ○ Other (with text area)
- [Cancel] and [Undo] buttons

**Actions**:
1. Select a reason (e.g., "Changed my mind")
2. Click [Undo] button
3. Watch for loading state
4. Toast notification should appear: "Auto-apply undone. Skill rating reverted to {previousValue}."

### Step 3: Verify Undo Completed

**Check 1: Audit Trail Updated**
1. Convex Dashboard → Data → `autoAppliedInsights`
2. Find the audit record
3. Verify:
   - `undoneAt` has timestamp
   - `undoReason` is "changed_mind" (or your selection)

**Check 2: Insight Status Reverted**
1. Convex Dashboard → Data → `voiceNoteInsights`
2. Find the insight
3. Verify:
   - `status` is "pending" (reverted from "applied")
   - `appliedAt` is `undefined` (cleared)
   - `appliedBy` is `undefined` (cleared)
   - `autoAppliedByAI` is `undefined` (cleared)

**Check 3: Player Profile Reverted**
1. Navigate to `skillAssessments` table
2. Find the skill assessment record
3. Verify:
   - `rating` is back to previousValue (e.g., 3)
   - `updatedAt` has recent timestamp

**Check 4: UI Updated**
1. Return to Auto-Applied tab
2. Insight should now show:
   - Gray badge: "Undone"
   - [Undo] button disabled with "Undone" text
   - No longer shows time or change details

**Expected Result**: ✅ Undo completed successfully, all changes reverted

---

## Test Scenario 5: Verify Undo After 1 Hour (US-008)

**Goal**: Confirm undo fails after 1-hour window

### Step 1: Create Old Auto-Applied Insight

**Option A: Wait 1 hour** (slow)
- Create auto-applied insight
- Wait 61 minutes
- Try to undo

**Option B: Mock timestamp** (faster)
1. Convex Dashboard → Data → `autoAppliedInsights`
2. Find an auto-applied insight
3. Edit `appliedAt` field
4. Set to: `Date.now() - 3700000` (61 minutes ago)
5. Save

### Step 2: Try to Undo

1. Refresh Auto-Applied tab
2. Find the old insight
3. [Undo] button should be **disabled** with:
   - Text: "Expired"
   - Tooltip: "Undo window expired (must undo within 1 hour)"
4. Try clicking [Undo] button (should do nothing)

**Or call mutation directly**:
1. Convex Dashboard → Functions → `voiceNoteInsights:undoAutoAppliedInsight`
2. Args: `{ "autoAppliedInsightId": "<old audit _id>", "undoReason": "changed_mind" }`
3. Click "Run mutation"
4. **Expected**: Returns `{ success: false, message: "Undo window expired (must undo within 1 hour)" }`

**Expected Result**: ✅ Undo rejected after 1 hour, button disabled in UI

---

## Test Scenario 6: Verify Undo by Wrong Coach (US-008)

**Goal**: Confirm undo fails if different coach tries to undo

### Setup

1. Create auto-applied insight for Coach A
2. Switch to Coach B account (or use different coachId in mutation)
3. Try to undo Coach A's insight

### Test

1. Convex Dashboard → Functions → `voiceNoteInsights:undoAutoAppliedInsight`
2. Args: `{ "autoAppliedInsightId": "<coach A audit _id>", "undoReason": "changed_mind" }`
3. Call mutation as Coach B
4. **Expected**: Returns `{ success: false, message: "Not authorized" }` or similar

**Expected Result**: ✅ Undo rejected if coach doesn't own the insight

---

## Test Scenario 7: End-to-End Integration Test

**Goal**: Complete workflow from creation to undo

### Full Workflow

1. **Start**: Coach at Level 2+
2. **Create**: High-confidence skill insight (confidence >= 0.7)
3. **Auto-Apply**: System automatically applies insight
   - Verify audit trail created
   - Verify player profile updated
4. **View**: Navigate to Auto-Applied tab
   - Verify insight appears with green badge
   - Verify time, change details, buttons
5. **Undo**: Click undo button within 1 hour
   - Select reason
   - Confirm undo
6. **Verify**: Check all changes reverted
   - Insight back to pending
   - Profile reverted to previous value
   - UI shows "Undone" badge

**Expected Result**: ✅ Complete workflow works end-to-end

---

## Visual Testing Checklist

### Auto-Applied Tab
- [ ] Tab navigation works (Pending Review ↔ Auto-Applied)
- [ ] Insight cards render correctly
- [ ] Green "✓ Auto-Applied" badge displays
- [ ] Gray "Undone" badge displays (after undo)
- [ ] Relative time updates ("23 minutes ago")
- [ ] Change display shows "SkillName: old → new"
- [ ] Confidence progress bar shows percentage
- [ ] Confidence bar color codes correctly (red/amber/green)
- [ ] [Undo] button enabled state correct
- [ ] [Undo] button disabled state correct
- [ ] [View Profile] button links correctly
- [ ] Empty state displays when no insights

### Undo Dialog
- [ ] Dialog opens on [Undo] click
- [ ] Title and message display
- [ ] Radio button options all visible
- [ ] "Other" option shows text area when selected
- [ ] [Cancel] button closes dialog
- [ ] [Undo] button shows loading state
- [ ] Dialog closes after successful undo
- [ ] Toast notification appears

### Responsive Design
- [ ] Desktop layout works
- [ ] Mobile layout works
- [ ] Tablet layout works

---

## Performance Testing

### Query Performance
1. Create 20+ auto-applied insights
2. Navigate to Auto-Applied tab
3. Check load time (should be < 1 second)
4. Verify pagination (if implemented)

### Mutation Performance
1. Time auto-apply mutation (should be < 500ms)
2. Time undo mutation (should be < 500ms)

---

## Error Handling

### Test Error Scenarios

1. **Network Error**:
   - Disconnect network
   - Try to undo
   - Verify error toast appears

2. **Invalid Insight ID**:
   - Call mutation with non-existent insightId
   - Verify error message

3. **Missing Required Fields**:
   - Create insight missing `recommendedUpdate`
   - Try to auto-apply
   - Verify graceful failure

---

## Browser Compatibility

Test in:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (macOS/iOS)

---

## Success Criteria

**All tests must pass**:
- ✅ Auto-apply works for Level 2+ coaches
- ✅ Auto-apply rejects invalid cases (trust, confidence, category)
- ✅ Audit trail created correctly
- ✅ Player profile updated correctly
- ✅ Auto-Applied tab displays insights
- ✅ Undo works within 1 hour
- ✅ Undo fails after 1 hour
- ✅ Undo fails for wrong coach
- ✅ Player profile reverts on undo
- ✅ UI shows all required elements
- ✅ Dialog works correctly
- ✅ Toast notifications appear
- ✅ Empty state displays
- ✅ No console errors
- ✅ No Convex errors

---

## Known Issues to Watch For

### From Phase 7.1
- Better Auth user table warnings (expected, non-blocking)
- Pre-existing lint errors (not related to Phase 7.2)

### Phase 7.2 Specific
- If skills don't update, check sportPassports table exists
- If undo fails, verify timestamp calculation (< 3600000, NOT <=)
- If dialog doesn't open, check imports for RadioGroup/Dialog components

---

## Testing Shortcuts

### Quick Backend Test
```bash
# In Convex Dashboard → Functions
# Call: voiceNoteInsights:autoApplyInsight
# Args: { "insightId": "<id>" }
# Should return: { success: true, appliedInsightId: "<audit id>" }
```

### Quick Undo Test
```bash
# In Convex Dashboard → Functions
# Call: voiceNoteInsights:undoAutoAppliedInsight
# Args: { "autoAppliedInsightId": "<id>", "undoReason": "changed_mind" }
# Should return: { success: true, message: "..." }
```

### Quick Trust Level Check
```sql
-- In Convex Dashboard → Data → coachTrustLevels
-- Find your coach record
-- Verify currentLevel >= 2
```

---

## Screenshots to Capture

1. Auto-Applied tab with insights
2. Auto-applied insight card (green badge)
3. Undone insight card (gray badge)
4. Undo confirmation dialog
5. Toast notification after undo
6. Empty state
7. Convex audit trail record
8. Convex skillAssessments before/after

---

**Ready to test!** Start with Scenario 1 (basic auto-apply) and work through each scenario.

If you hit issues, check:
1. Trust level is >= 2
2. Confidence is >= 0.7
3. Category is "skill"
4. recommendedUpdate format is "SkillName: Number"
5. sportPassports table exists for player
6. Console for errors

---

**Testing Account**: `neil.B@blablablak.com` / `lien1979`
**Convex Dashboard**: https://dashboard.convex.dev
**Dev Server**: http://localhost:3000

---
