# Phase 7.3 Testing Guide - Learning Loop with Automatic Triggering

**Date**: 2026-01-26
**Branch**: `ralph/coach-insights-auto-apply-p7-phase3`
**Status**: ✅ Ready for Testing (All 5 Stories Complete)

---

## What's New in Phase 7.3

This phase completes the automation loop with:
1. **US-009.5**: Automatic triggering - insights auto-apply WITHOUT manual action
2. **US-010**: Category preferences mutation - backend control per category
3. **US-011**: Category preferences UI - Settings tab with checkboxes
4. **US-012**: Adaptive thresholds - AI learns from your undo patterns
5. **US-013**: Undo analytics - collect feedback for AI improvement

**Key Change**: Insights now auto-apply automatically when created (no "Apply All" button needed)

---

## Prerequisites

### Test Account
- **URL**: `http://localhost:3000`
- **Account**: `neil.B@blablablak.com` / `lien1979`
- **Role**: Coach with Level 2+ trust

### Required Setup

**1. Verify Trust Level is 2+**
- Navigate to: `/orgs/{orgId}/coach/voice-notes`
- Click "Settings" tab (new in Phase 7.3!)
- Scroll to trust level section
- **Required**: Level 2 or higher

**If Level < 2, update in Convex**:
```
1. Convex Dashboard → Data → coachTrustLevels
2. Find your coach record (search by coachId)
3. Set currentLevel: 2
4. Set preferredLevel: 2
5. Save
```

**2. Enable Category Preferences (New in US-011)**
- Still in Settings tab
- Under "Auto-Apply Preferences"
- **Check the "Skills" checkbox** (required for testing)
- Should see toast: "Preferences updated successfully"

**3. Convex Dashboard Access**
- URL: https://dashboard.convex.dev
- Navigate to your project
- Open "Data" tab

**4. Verify Prerequisites from Phase 7.1 & 7.2**
- ✅ voiceNoteInsights table exists with insights
- ✅ autoAppliedInsights table exists (audit trail)
- ✅ coachTrustLevels has insightAutoApplyPreferences field
- ✅ AI confidence scoring works (0.0-1.0 scale)

---

## Test Scenario 1: Automatic Triggering (US-009.5) - CRITICAL

**Goal**: Verify insights auto-apply automatically when created (no manual action)

### Prerequisites
- Trust level: 2+
- "Skills" category enabled in Settings tab
- No existing pending skill insights (or we'll create new one)

### Method A: Create Voice Note (End-to-End Test)

**Step 1: Create Voice Note**
1. Navigate to Voice Notes tab
2. Click "New Voice Note"
3. Record or type:
   ```
   "John showed excellent passing today. His accuracy has really improved,
   I'd rate his passing at a solid 4 out of 5 now."
   ```
4. Save/Submit
5. Wait for AI processing (usually 10-30 seconds)

**Step 2: Verify Automatic Auto-Apply**
1. Navigate to Insights tab
2. Click "Auto-Applied" tab (should be middle tab)
3. **EXPECTED**: New insight appears immediately
   - ✅ Green badge: "✓ Auto-Applied"
   - ✅ Shows "just now" or recent timestamp
   - ✅ Shows change: "Previous → New" (e.g., "3 → 4")
   - ✅ NO manual action required (this is the key test!)

**Step 3: Verify Player Profile Updated**
1. Navigate to Players page
2. Find John (or the player mentioned)
3. View their skills
4. **EXPECTED**: Passing skill = 4 (or the value from insight)

**Step 4: Verify Audit Trail**
1. Convex Dashboard → Data → autoAppliedInsights
2. Find most recent record
3. **EXPECTED**:
   - `autoAppliedByAI: true`
   - `appliedAt: <recent timestamp>`
   - `changeType: "skill_rating"`
   - `previousValue` and `newValue` populated
   - `coachId` matches your coach

**✅ PASS CRITERIA**:
- Insight appears in Auto-Applied tab WITHOUT clicking any button
- Player profile updated automatically
- Audit record created
- No errors in console

**❌ FAIL if**:
- Insight stays in "Pending Review" tab
- Need to click "Apply All" button (this means US-009.5 not working)
- No audit record created

---

### Method B: Manual Insight Creation (Faster Testing)

**Step 1: Create Pending Insight**
1. Convex Dashboard → Data → voiceNoteInsights
2. Click "Insert document"
3. Use this template:
```json
{
  "voiceNoteId": "<any existing voiceNote _id>",
  "insightId": "test-<random-string>",
  "coachId": "<your userId>",
  "organizationId": "<your org id>",
  "playerIdentityId": "<existing player _id>",
  "playerName": "Test Player",
  "title": "Improved Dribbling Skill",
  "description": "Player showed significant improvement in dribbling",
  "category": "skill",
  "confidenceScore": 0.82,
  "status": "pending",
  "recommendedUpdate": "Dribbling: 4",
  "wouldAutoApply": true,
  "createdAt": <Date.now()>,
  "updatedAt": <Date.now()>
}
```

**Important Values**:
- `confidenceScore`: >= 0.7 (default threshold)
- `category`: "skill" (must match enabled category)
- `status`: "pending"
- `recommendedUpdate`: "SkillName: Number" format

**Step 2: Trigger buildInsights Action**

**Problem**: Manual insert doesn't trigger the auto-apply logic (it only triggers when AI creates insights).

**Solution**: Use Convex Dashboard to call the auto-apply mutation directly:
1. Convex Dashboard → Functions
2. Find `models/voiceNoteInsights:autoApplyInsight`
3. Args: `{ "insightId": "<the _id from step 1>" }`
4. Click "Run mutation"

**Step 3: Verify Auto-Applied**
1. Check UI: Insight should move to "Auto-Applied" tab
2. Check player profile: Skill updated
3. Check autoAppliedInsights table: New record

**Note**: This tests the mutation but not the automatic triggering. For full US-009.5 test, use Method A (voice note).

---

## Test Scenario 2: Category Preferences UI (US-011)

**Goal**: Verify coaches can control which categories auto-apply via Settings tab

### Step 1: Access Settings Tab
1. Navigate to `/orgs/{orgId}/coach/voice-notes`
2. Click "Insights" navigation item
3. **VERIFY**: 3 tabs visible:
   - "Pending Review"
   - "Auto-Applied"
   - "Settings" ← **NEW**
4. Click "Settings" tab

### Step 2: Verify UI Layout
**EXPECTED**:
- Card with title: "Auto-Apply Preferences"
- Description: "Choose which types of insights can be automatically applied..."
- 4 checkboxes:
  - ☐ Skills
  - ☐ Attendance
  - ☐ Goals
  - ☐ Performance
- Safety note: "Injury and medical insights always require manual review"
- Each checkbox has descriptive text

### Step 3: Toggle Category On
1. Click "Skills" checkbox to enable (should show checkmark)
2. **EXPECTED**:
   - Toast notification: "Preferences updated successfully" (or similar)
   - Checkbox stays checked after page refresh

### Step 4: Verify Persistence
1. Refresh page (F5)
2. Go back to Settings tab
3. **EXPECTED**: "Skills" checkbox still checked

### Step 5: Test Other Categories
1. Enable "Attendance" checkbox
2. **EXPECTED**: Toast notification
3. Enable "Goals" checkbox
4. Enable "Performance" checkbox
5. All should persist across refresh

### Step 6: Toggle Category Off
1. Uncheck "Skills" checkbox
2. **EXPECTED**:
   - Toast notification
   - Checkbox unchecked
   - Persists after refresh

### Step 7: Verify Backend Mutation
1. Convex Dashboard → Data → coachTrustLevels
2. Find your coach record
3. Check `insightAutoApplyPreferences` field
4. **EXPECTED**:
```json
{
  "skills": true,
  "attendance": true,
  "goals": true,
  "performance": true
}
```
(Or whatever combination you toggled)

**✅ PASS CRITERIA**:
- Settings tab renders with 4 checkboxes
- Toggling checkbox triggers mutation
- Toast notifications appear
- Preferences persist across page refresh
- Backend record updates correctly

---

## Test Scenario 3: Category Preferences Control Auto-Apply (Integration)

**Goal**: Verify category preferences actually control what auto-applies

### Prerequisites
- Trust level: 2+
- Start with ALL categories disabled in Settings

### Step 1: Disable All Categories
1. Settings tab → uncheck all 4 categories
2. Verify all are off

### Step 2: Create Skill Insight (Should NOT Auto-Apply)
1. Create voice note about a skill improvement
2. Wait for AI processing
3. Check Insights tab
4. **EXPECTED**: Insight in "Pending Review" (NOT auto-applied)
5. **Reason**: Skills category disabled

### Step 3: Enable Skills Category
1. Settings tab → check "Skills" checkbox
2. Verify toast notification

### Step 4: Create Another Skill Insight (Should Auto-Apply)
1. Create another voice note about skill
2. Wait for AI processing
3. **EXPECTED**: Insight auto-applies and appears in "Auto-Applied" tab

### Step 5: Test Attendance Category
1. Settings → Enable "Attendance" only, disable "Skills"
2. Create voice note: "John was absent from training today"
3. **EXPECTED**: Attendance insight auto-applies
4. Create skill insight
5. **EXPECTED**: Skill insight stays in "Pending Review"

**✅ PASS CRITERIA**:
- Disabled categories prevent auto-apply
- Enabled categories allow auto-apply
- Changes take effect immediately
- No manual "Apply All" button needed

---

## Test Scenario 4: Undo Within 1-Hour Window

**Goal**: Verify undo functionality with reason tracking (feeds into US-013)

### Step 1: Create Auto-Applied Insight
1. Follow Scenario 1 to create auto-applied insight
2. Verify it appears in "Auto-Applied" tab
3. Note the timestamp (should say "just now")

### Step 2: Verify Undo Button Active
1. Find the auto-applied insight card
2. **EXPECTED**:
   - [Undo] button visible and enabled
   - Tooltip: "Undo this change (expires in X minutes)"

### Step 3: Click Undo
1. Click [Undo] button
2. **EXPECTED**: Dialog appears with:
   - Title: "Undo Auto-Applied Insight"
   - Message showing what will be reverted
   - Radio button options:
     - ○ Wrong player - AI applied to incorrect player
     - ○ Wrong rating - The suggested rating was incorrect
     - ○ Insight incorrect - The insight itself was wrong
     - ○ Changed my mind - I want to review this manually
     - ○ Duplicate - This was already applied
     - ○ Other (with text area for explanation)
   - [Cancel] and [Undo] buttons

### Step 4: Select Reason and Confirm
1. Select "Wrong rating" (or any reason)
2. Click [Undo] button
3. **EXPECTED**:
   - Dialog closes
   - Toast notification: "Auto-apply undone. Passing reverted to 3" (or similar)
   - Insight card updates:
     - Badge changes from green "✓ Auto-Applied" to gray "Undone"
     - [Undo] button disabled
     - Button text changes to "Undone"

### Step 5: Verify Player Profile Reverted
1. Navigate to player profile
2. Check skill rating
3. **EXPECTED**: Rating reverted to previous value

### Step 6: Verify Audit Trail
1. Convex Dashboard → Data → autoAppliedInsights
2. Find the record
3. **EXPECTED**:
   - `undoneAt: <timestamp>`
   - `undoReason: "wrong_rating"`
   - `undoneBy: <your userId>`

### Step 7: Test Undo Expiration (1-Hour Window)

**Option A: Wait 1 hour** (not practical for testing)

**Option B: Manually test expiration**:
1. Convex Dashboard → Data → autoAppliedInsights
2. Find an auto-applied record
3. Manually change `appliedAt` to 2 hours ago:
   ```
   appliedAt: Date.now() - (2 * 60 * 60 * 1000)
   ```
4. Refresh UI
5. **EXPECTED**:
   - [Undo] button disabled
   - Button text: "Expired"
   - Tooltip: "Undo window has expired (1 hour limit)"

**✅ PASS CRITERIA**:
- Undo dialog appears with reason options
- Undo reverts player profile
- Undo creates audit trail with reason
- Button disables after undo
- Expired insights can't be undone

---

## Test Scenario 5: Undo Analytics Query (US-013)

**Goal**: Verify undo reason statistics query returns correct data

### Prerequisites
- Create and undo several insights with different reasons (from Scenario 4)
- Need at least 3-5 undone insights for meaningful stats

### Step 1: Create Test Data
1. Auto-apply 5 different insights
2. Undo each with different reasons:
   - 2x "wrong_rating"
   - 1x "wrong_player"
   - 1x "insight_incorrect"
   - 1x "changed_mind"

### Step 2: Call Query via Convex Dashboard
1. Convex Dashboard → Functions
2. Find `models/voiceNoteInsights:getUndoReasonStats`
3. Args (default):
```json
{
  "organizationId": "<your org id>",
  "timeframeDays": 30
}
```
4. Click "Run query"

### Step 3: Verify Response Structure
**EXPECTED**:
```json
{
  "total": 5,
  "byReason": [
    {
      "reason": "wrong_rating",
      "count": 2,
      "percentage": 40.0
    },
    {
      "reason": "changed_mind",
      "count": 1,
      "percentage": 20.0
    },
    {
      "reason": "insight_incorrect",
      "count": 1,
      "percentage": 20.0
    },
    {
      "reason": "wrong_player",
      "count": 1,
      "percentage": 20.0
    }
  ],
  "topInsights": [
    {
      "insightId": "<id>",
      "title": "...",
      "reason": "wrong_rating",
      "undoneAt": <timestamp>
    },
    // ... up to 10 most recent
  ]
}
```

### Step 4: Verify Calculations
1. Check total matches number of undone insights
2. Check percentages add up to 100%
3. Check topInsights sorted by undoneAt (most recent first)
4. Check topInsights limited to 10

### Step 5: Test Timeframe Filter
1. Call query with `timeframeDays: 7`
2. **EXPECTED**: Only insights undone in last 7 days

### Step 6: Test Organization Filter
1. Call query with different organizationId
2. **EXPECTED**: Only insights from that org

**✅ PASS CRITERIA**:
- Query returns correct structure
- Total count accurate
- Percentages calculated correctly (sum to 100%)
- topInsights sorted and limited to 10
- Filters work correctly

---

## Test Scenario 6: Adaptive Thresholds (US-012)

**Goal**: Verify confidence threshold adjusts based on undo patterns

**Note**: This is a cron job that runs daily at 2 AM UTC, so testing requires either:
- Waiting for scheduled run
- Manually triggering the mutation
- Verifying the logic via Convex dashboard

### Method A: Manual Trigger (Recommended for Testing)

**Step 1: Create Undo Pattern**

**High Accuracy Pattern** (< 3% undo rate):
1. Auto-apply 20 insights
2. Undo only 0-1 of them
3. **Expected**: Threshold should LOWER (more aggressive)

**Low Accuracy Pattern** (> 10% undo rate):
1. Auto-apply 20 insights
2. Undo 3+ of them (15%+ undo rate)
3. **Expected**: Threshold should RAISE (more conservative)

**Step 2: Check Current Threshold**
1. Convex Dashboard → Data → coachTrustLevels
2. Find your coach record
3. Note current `insightConfidenceThreshold` (default: 0.7)

**Step 3: Manually Trigger Adjustment**
1. Convex Dashboard → Functions
2. Find `models/coachTrustLevels:adjustInsightThresholds`
3. Args: `{}` (no args needed, processes all coaches)
4. Click "Run mutation"

**Step 4: Verify Threshold Adjusted**
1. Refresh coachTrustLevels data
2. Check `insightConfidenceThreshold`
3. **EXPECTED** (High Accuracy):
   - Threshold LOWERED by 0.05
   - Example: 0.7 → 0.65
   - Bounded minimum: 0.6
4. **EXPECTED** (Low Accuracy):
   - Threshold RAISED by 0.05
   - Example: 0.7 → 0.75
   - Bounded maximum: 0.9

### Method B: Verify Cron Schedule

**Step 1: Check Cron Configuration**
1. Open: `packages/backend/convex/crons.ts`
2. **EXPECTED**: Schedule entry:
```typescript
crons.daily(
  "Adjust insight confidence thresholds",
  { hourUTC: 2, minuteUTC: 0 },
  internal.models.coachTrustLevels.adjustInsightThresholds
);
```

**Step 2: Verify Logic**
1. Check mutation requires minimum 10 auto-applied insights
2. Calculates undo rate = (undone / total) * 100
3. < 3% → lower by 0.05
4. > 10% → raise by 0.05
5. Bounded: 0.6 to 0.9

**✅ PASS CRITERIA**:
- High accuracy (< 3% undo) → threshold lowers
- Low accuracy (> 10% undo) → threshold raises
- Threshold bounded 0.6 to 0.9
- Requires minimum 10 insights
- Cron scheduled for daily 2 AM UTC

---

## Integration Test: Full Workflow

**Goal**: Test complete flow from voice note to auto-apply to undo to analytics

### Step 1: Setup
1. Trust level: 2
2. Skills category: enabled
3. Current threshold: 0.7 (default)
4. Clear any existing pending insights

### Step 2: Create Voice Note
1. Record: "Sarah's passing accuracy has improved significantly, I'd rate it at 4 out of 5 now"
2. Save
3. Wait for AI processing

### Step 3: Verify Automatic Auto-Apply (US-009.5)
1. Navigate to Insights tab
2. Click "Auto-Applied" tab
3. **VERIFY**: Insight appears WITHOUT manual action
4. **VERIFY**: Green "✓ Auto-Applied" badge
5. **VERIFY**: Shows "just now"

### Step 4: Verify Player Updated (US-007 from Phase 7.2)
1. Navigate to Sarah's player profile
2. Check skills
3. **VERIFY**: Passing = 4

### Step 5: Undo with Reason (US-008 from Phase 7.2)
1. Go back to Auto-Applied tab
2. Click [Undo] on Sarah's insight
3. Select reason: "Wrong rating"
4. Confirm
5. **VERIFY**: Toast notification
6. **VERIFY**: Card shows "Undone" badge

### Step 6: Check Analytics (US-013)
1. Convex Dashboard → Functions
2. Call `getUndoReasonStats`
3. **VERIFY**:
   - total: 1
   - byReason includes "wrong_rating": 100%
   - topInsights includes Sarah's insight

### Step 7: Repeat for Different Categories
1. Disable Skills, enable Attendance (US-011)
2. Create attendance-related voice note
3. **VERIFY**: Auto-applies automatically
4. Create skill-related voice note
5. **VERIFY**: Stays in "Pending Review" (skills disabled)

### Step 8: Create High Undo Rate Pattern
1. Auto-apply 10 insights
2. Undo 2 of them (20% undo rate)
3. Manually trigger threshold adjustment (US-012)
4. **VERIFY**: Threshold increases to 0.75

### Step 9: Test New Threshold
1. Create insight with confidence 0.72
2. **VERIFY**: Does NOT auto-apply (below new threshold of 0.75)
3. Create insight with confidence 0.82
4. **VERIFY**: DOES auto-apply (above threshold)

**✅ PASS CRITERIA (Full Integration)**:
- Voice note → Auto-apply happens automatically
- Player profile updates
- Undo works with reason tracking
- Analytics show correct stats
- Category preferences control what auto-applies
- Threshold adapts to undo patterns
- New threshold affects future auto-applies

---

## Expected Behaviors

### Safety Guardrails (Always Active)

**These should NEVER auto-apply**:
- ❌ Injury insights (category: "injury")
- ❌ Medical insights (category: "medical")
- ❌ Confidence < threshold (default 0.7)
- ❌ effectiveLevel < 2
- ❌ Category not enabled in preferences

**These SHOULD auto-apply**:
- ✅ Skill insights with confidence >= 0.7 and skills enabled
- ✅ Attendance insights with confidence >= 0.7 and attendance enabled
- ✅ Goals insights with confidence >= 0.7 and goals enabled
- ✅ Performance insights with confidence >= 0.7 and performance enabled

### UI Behavior

**Settings Tab**:
- All 4 category checkboxes
- Toast on toggle
- Persists across refresh
- Safety note visible

**Auto-Applied Tab**:
- Green "✓ Auto-Applied" badges
- Relative time ("just now", "5 minutes ago")
- [Undo] button enabled for < 1 hour
- "Undone" badge after undo
- "Expired" button after 1 hour

**Pending Review Tab**:
- Blue "AI would auto-apply" badge for eligible insights
- Shows why not auto-applied if ineligible

---

## Troubleshooting

### Insight Not Auto-Applying

**Check 1: Trust Level**
- Convex → coachTrustLevels
- currentLevel >= 2?
- preferredLevel >= 2 (or null)?

**Check 2: Category Enabled**
- UI Settings tab
- Is the category checkbox checked?
- Convex → coachTrustLevels → insightAutoApplyPreferences
- Category set to true?

**Check 3: Confidence Score**
- Insight confidenceScore >= insightConfidenceThreshold?
- Default threshold: 0.7

**Check 4: Category Type**
- Is category "injury" or "medical"? (never auto-apply)
- Is category "skill", "attendance", "goals", or "performance"?

**Check 5: Automatic Triggering**
- Check browser console for errors
- Check Convex logs for auto-apply attempts
- Verify buildInsights action includes US-009.5 logic

### Settings Tab Not Showing

**Check 1: Component Update**
- Verify insights-tab.tsx has 3 tabs
- Check for "Settings" TabsTrigger
- Refresh page hard (Cmd+Shift+R)

**Check 2: Build/Deploy**
- Restart dev server
- Clear browser cache
- Check for TypeScript errors

### Undo Button Disabled

**Check 1: Time Window**
- Was insight applied > 1 hour ago?
- Check appliedAt timestamp

**Check 2: Already Undone**
- Check if undoneAt field exists
- Badge should show "Undone" not "Auto-Applied"

**Check 3: Ownership**
- Can only undo your own auto-applied insights
- Check coachId matches

### Analytics Query Empty

**Check 1: Undone Insights Exist**
- Convex → autoAppliedInsights
- Filter by undoneAt !== undefined
- Any results?

**Check 2: Timeframe**
- Default 30 days
- Were insights undone in last 30 days?

**Check 3: Organization Filter**
- Passing correct organizationId?

---

## Success Criteria Summary

**Phase 7.3 is COMPLETE when**:

**US-009.5: Automatic Triggering**
- ✅ Insights auto-apply WITHOUT clicking "Apply All"
- ✅ Happens immediately after insight created
- ✅ No manual intervention required

**US-010 & US-011: Category Preferences**
- ✅ Settings tab renders with 4 checkboxes
- ✅ Toggling checkbox updates backend
- ✅ Enabled categories allow auto-apply
- ✅ Disabled categories prevent auto-apply

**US-012: Adaptive Thresholds**
- ✅ Cron job scheduled for daily 2 AM UTC
- ✅ High accuracy (< 3% undo) lowers threshold
- ✅ Low accuracy (> 10% undo) raises threshold
- ✅ Thresholds bounded 0.6 to 0.9

**US-013: Undo Analytics**
- ✅ Query returns total, byReason, topInsights
- ✅ Percentages calculated correctly
- ✅ Filters work (org, timeframe)

**Integration**:
- ✅ Voice note → automatic auto-apply → player updated
- ✅ Undo with reason → analytics track it
- ✅ Category preferences control behavior
- ✅ Threshold adapts to undo patterns

---

## Test Data Setup Script (Optional)

If you need to create test data quickly:

```javascript
// Run in Convex Dashboard Functions tab
// Or create as a helper mutation

// Create 10 auto-applied insights with varied reasons
const reasons = [
  "wrong_rating",
  "wrong_rating",
  "wrong_player",
  "insight_incorrect",
  "changed_mind"
];

for (let i = 0; i < 10; i++) {
  // Create insight
  const insightId = await ctx.db.insert("voiceNoteInsights", {
    // ... insight data
  });

  // Auto-apply it
  await ctx.db.insert("autoAppliedInsights", {
    insightId,
    // ... audit data
  });

  // Undo half of them
  if (i % 2 === 0) {
    await ctx.db.patch(insightId, {
      undoneAt: Date.now(),
      undoReason: reasons[i % reasons.length],
    });
  }
}
```

---

## Test Coverage Checklist

**Before marking Phase 7.3 complete**:

### US-009.5: Automatic Triggering
- [ ] Create voice note → insight auto-applies automatically
- [ ] No "Apply All" button clicked
- [ ] Player profile updates
- [ ] Audit trail created
- [ ] Console shows no errors

### US-010 & US-011: Category Preferences
- [ ] Settings tab renders
- [ ] 4 checkboxes visible (skills, attendance, goals, performance)
- [ ] Toggling checkbox shows toast
- [ ] Preferences persist across refresh
- [ ] Backend record updates
- [ ] Enabled category allows auto-apply
- [ ] Disabled category prevents auto-apply

### US-012: Adaptive Thresholds
- [ ] Cron scheduled for 2 AM UTC
- [ ] < 3% undo rate lowers threshold by 0.05
- [ ] > 10% undo rate raises threshold by 0.05
- [ ] Thresholds bounded 0.6-0.9
- [ ] Requires minimum 10 insights

### US-013: Undo Analytics
- [ ] Query returns total count
- [ ] Returns byReason array with percentages
- [ ] Returns topInsights (max 10)
- [ ] Percentages sum to 100%
- [ ] Organization filter works
- [ ] Timeframe filter works

### Integration Tests
- [ ] Full workflow: voice note → auto-apply → undo → analytics
- [ ] Category preferences control auto-apply behavior
- [ ] Threshold changes affect future auto-applies
- [ ] All safety guardrails enforced

---

**Testing Duration Estimate**: 45-60 minutes for full coverage

**Quick Smoke Test**: 15 minutes (Scenarios 1, 2, and 6 only)

**Critical Path**: Scenario 1 (automatic triggering) + Scenario 3 (category control)
