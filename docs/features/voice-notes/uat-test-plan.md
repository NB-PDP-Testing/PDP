# Voice Notes UAT Test Plan

**Created:** 2026-03-13
**Test Account:** `neil.B@blablablak.com` / `lien1979`
**Dev Server:** http://localhost:3000

---

## Test 1: Record Voice Note (In-App)

**Preconditions:** Logged in as coach, on voice notes dashboard (`/orgs/[orgId]/coach/voice-notes`)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Click "New" tab | New Note tab opens with Record and Type options | |
| 2 | Click "Record" button | Browser requests microphone permission | |
| 3 | Speak for 10+ seconds mentioning a player name | Live transcript appears, audio level meter active | |
| 4 | Click "Stop" | Recording stops, "Processing..." shown | |
| 5 | Wait for processing | Voice note appears in History tab | |
| 6 | Check Insights tab | Extracted insights appear with player names, categories, confidence scores | |

---

## Test 2: Type Text Note (In-App)

**Preconditions:** Same as Test 1

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Click "New" tab, select "Type" | Text input area appears | |
| 2 | Type: "Jake showed great improvement in passing today, skill rating 8/10" | Text captured in form | |
| 3 | Click "Save" | Note created, "Processing..." briefly shown | |
| 4 | Check Insights tab | Insight extracted with category: skill_rating, player: Jake | |

---

## Test 3: Apply Insight (Per Category)

**Preconditions:** Pending insights exist in Insights tab

### 3a: Apply skill_rating (with player)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Find a skill_rating insight with player assigned | Apply button enabled (green checkmark) | |
| 2 | Click Apply | Insight moves to "applied" status, toast confirmation | |
| 3 | Check player profile | Skill assessment updated (if domain write works) | |

### 3b: Apply without player (should be blocked)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Find an insight without playerIdentityId | Apply button disabled | |
| 2 | Hover over disabled Apply | Tooltip: "Assign a player first" | |

### 3c: Apply team_culture insight

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Find a team_culture insight | "Assign Team" button visible | |
| 2 | Click "Assign Team" | Team selection dialog opens | |
| 3 | Select a team | Insight linked to team, Apply enabled | |
| 4 | Click Apply | teamObservations record created | |

### 3d: Apply todo insight

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Find a todo insight | "Assign Coach" button visible | |
| 2 | Click "Assign Coach" | Coach selection dialog opens | |
| 3 | Select a coach | Insight linked to coach | |
| 4 | Click Apply | coachTasks record created | |

---

## Test 4: Dismiss Insight

**Preconditions:** Pending insights exist

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Find any pending insight | Dismiss button visible (X icon) | |
| 2 | Click Dismiss | Insight status changes to "dismissed", removed from pending list | |
| 3 | Check History tab | Dismissed insight visible with "dismissed" badge | |

---

## Test 5: Assign Player to Unmatched Insight

**Preconditions:** Unmatched insights exist (amber "Needs Attention" section)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Find an unmatched insight | Amber card with "Assign" button | |
| 2 | Click "Assign" | Player search dialog opens | |
| 3 | Type player name | Search results filter | |
| 4 | Select player | Insight linked, moves to "Ready to Apply" section | |

---

## Test 6: Parent Summary Approval

**Preconditions:** Applied insight triggers parent summary generation, pending summaries exist in Parents tab

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Click "Parents" tab | Pending summaries listed with approval cards | |
| 2 | Review AI-generated summary | Public summary text displayed clearly | |
| 3 | Click "Approve & Share" | Summary status changes to "approved" | |
| 4 | Wait 5 minutes | process-scheduled-deliveries cron delivers summary | |

---

## Test 7: Parent Summary Suppression

**Preconditions:** Pending summary in Parents tab

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Click "Don't Share" on a summary | Feedback dialog opens (optional) | |
| 2 | Select a reason or click "Skip" | Summary status changes to "suppressed" | |
| 3 | Verify trust level | totalSuppressed incremented | |

---

## Test 8: Trust Gate Visibility

**Preconditions:** Various trust levels and admin settings

### 8a: Trust Level 0 coach

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Login as trust level 0 coach | "Sent to Parents" tab NOT visible | |
| 2 | If "Request Access" appears | Click it, enter reason | |
| 3 | Admin receives notification | Access request visible in admin panel | |

### 8b: Trust Level 2+ coach

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Login as trust level 2+ coach | "Sent to Parents" tab visible | |
| 2 | Click tab | Sent summaries listed with status badges | |

### 8c: Admin override

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Admin enables blanket override | All coaches see "Sent to Parents" tab | |
| 2 | Admin disables trust gates | All coaches see "Sent to Parents" tab | |
| 3 | Admin blocks specific coach | That coach loses "Sent to Parents" tab | |

---

## Test 9: Auto-Apply at Trust Level 2+

**Preconditions:** Coach at trust level 2+, auto-apply enabled in preferences

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Create voice note with high-confidence insight | Insight auto-applied (not pending) | |
| 2 | Check "Sent to Parents" tab | Auto-applied insight listed | |
| 3 | Click "Undo" within 1 hour | Undo dialog opens with reason selection | |
| 4 | Select reason, confirm | Insight reverted, undo recorded | |
| 5 | Try undo after 1 hour | Button shows "Expired", disabled | |

---

## Test 10: Undo Auto-Applied Insight

**Preconditions:** Auto-applied insight exists, within 1-hour window

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Find auto-applied insight with "Undo" button | Button active (not expired) | |
| 2 | Click "Undo" | Reason dialog: wrong_player, wrong_rating, other | |
| 3 | Select "wrong_player", confirm | Insight reverted, status shows "Undone" | |
| 4 | Check insight list | Insight back in pending state | |

---

## Test 11: Review Microsite (/r/[code])

**Preconditions:** WhatsApp voice note processed, review link generated

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Open review link in browser | Microsite loads with pending insights | |
| 2 | Review insight list | Player names, categories, confidence shown | |
| 3 | Click "Apply" on assigned insight | Insight applied successfully | |
| 4 | Click "Dismiss" on another | Insight dismissed | |
| 5 | Click "Assign Player" on unassigned | Player search appears | |
| 6 | Use "Apply All" batch action | All remaining applied | |
| 7 | Test snooze (1h) | Reminder scheduled | |

---

## Test 12: Sent to Parents Status Badges

**Preconditions:** Auto-approved summaries in various states

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Open "Sent to Parents" tab | Summaries listed with status badges | |
| 2 | Verify "Pending Delivery" badge | Gray badge with clock icon | |
| 3 | Verify "Delivered" badge | Blue badge with check icon | |
| 4 | Verify "Viewed" badge | Green badge with eye icon | |
| 5 | Click "Revoke" on revocable summary | Confirmation dialog, then red "Revoked" badge | |

---

## Test 13: My Impact Dashboard

**Preconditions:** Coach has history of voice notes, insights, summaries

| Step | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Click "My Impact" tab | Dashboard loads with metric cards | |
| 2 | Verify voice notes count | Matches actual notes created | |
| 3 | Verify insights applied count | Includes manual + auto-applied | |
| 4 | Verify summaries sent count | Matches delivered summaries | |
| 5 | Verify parent view rate | Percentage of viewed/sent | |
| 6 | Change date range | All metrics update accordingly | |
| 7 | Export CSV | Download includes all data | |

---

## Edge Cases

| Test | Scenario | Expected Result | Pass/Fail |
|------|----------|----------------|-----------|
| E1 | Apply without player assigned (after US-VR-008 fix) | Apply button disabled with "Assign a player first" tooltip | |
| E2 | Empty insights list | Empty state message shown | |
| E3 | Trust level 0 accessing Sent to Parents | Tab hidden, "Request Access" shown in footer | |
| E4 | Expired review link (>48h) | Error message: "Link expired" | |
| E5 | Duplicate voice note content | Both notes processed (no dedup - known issue #634) | |
| E6 | Injury insight auto-apply | Should NOT auto-apply regardless of trust level (safety) | |
| E7 | Behavior insight auto-apply | Should NOT auto-apply regardless of trust level (sensitivity) | |
| E8 | iOS Safari review microsite | Known issue #592: screen may lock | |
