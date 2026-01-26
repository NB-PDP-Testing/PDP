# Voice Notes Dashboard - Complete Tab Reference Guide

## Overview

The Voice Notes dashboard has **7 main tabs** (2 always visible, 5 conditional) plus **3 sub-tabs** under Insights.

**Key Principle**: Tabs only appear when there's work to do (progressive disclosure).

---

## MAIN TABS (Dashboard Level)

### Tab 1: NEW ⭐ (Always Visible)

**Icon**: Mic
**Badge**: None
**Visibility**: **ALWAYS SHOWN**

#### What It Shows
- Voice note recording interface
- Audio recording button OR text input option
- Note type selector: Training / Match / General
- AI processing status indicators:
  - Transcription status (pending → processing → completed)
  - Insights extraction status (pending → processing → completed)

#### User Actions
- Record audio note
- Type text note
- Select note type
- View processing status

#### When It's Active
- Default tab for first-time users
- Active when coach wants to create new notes

---

### Tab 2: PARENTS 👨‍👩‍👧 (Conditional)

**Icon**: MessageSquare
**Badge**: Count of pending summaries
**Alert**: ⚠️ Warning icon if sensitive summaries present (injury/behavior)
**Visibility**: Only shown when **`pendingSummariesCount > 0`**

#### What It Shows
**Pending Summaries Awaiting Coach Approval**:
- AI-generated parent-friendly summaries from voice note insights
- Grouped by:
  1. **Sensitive** (injury/behavior) - Red/amber section, requires manual review
  2. **Standard** (skill development, performance) - Blue section

**Each Summary Card Shows**:
- Player name
- Summary content (AI-generated parent-friendly text)
- Sensitivity classification (normal/injury/behavior)
- Confidence score (0-100%)
- Original insight that generated it
- Private coach notes (hidden from parents)

#### User Actions
- **Approve**: Send summary to parent
- **Edit**: Modify summary text before sending
- **Suppress**: Don't send to parent
- View full insight details

#### When It Hides
- After all pending summaries are approved/suppressed
- Tab disappears from navigation

#### Auto-Switch Behavior
**HIGHEST PRIORITY**: Dashboard auto-switches to this tab when pending summaries exist (parent communication first).

#### Current Implementation Status
✅ **Fully Implemented** - Working as designed

---

### Tab 3: INSIGHTS 💡 (Conditional)

**Icon**: Lightbulb
**Badge**: Count of pending insights
**Alert**: ⚠️ Warning icon if insights need attention (unmatched players, uncategorized)
**Visibility**: Only shown when **`pendingInsightsCount > 0`**

#### What It Shows
**Three Sub-Tabs** (see detailed section below):
1. **Pending Review** - Insights awaiting coach action
2. **Auto-Applied** - Insights automatically applied by AI
3. **Settings** - Auto-apply preferences and trust level

#### When It Hides
- After all insights are applied/dismissed
- Tab disappears from navigation

#### Auto-Switch Behavior
**SECOND PRIORITY**: Dashboard auto-switches here if no pending summaries exist.

#### Current Implementation Status
✅ **Fully Implemented** - Working as designed

---

### Tab 4: TEAM 👥 (Conditional)

**Icon**: Users
**Badge**: Count of pending team insights
**Visibility**: Only shown when **`pendingTeamInsightsCount > 0`**

#### What It Shows
**Insights from Other Coaches on Shared Teams**:
- Voice notes created by fellow coaches
- Filtered to show only insights about shared players
- Collaborative view of player development
- Excludes team-level insights (only player-specific)

**Each Insight Shows**:
- Player name
- Insight title and description
- Category (skill_rating, performance, etc.)
- Coach who created it
- Timestamp
- Recommended actions

#### User Actions
- View other coach observations
- Apply insights to player profiles
- Dismiss if not relevant

#### When It Hides
- After all team insights are resolved
- Tab disappears from navigation

#### Current Implementation Status
✅ **Implemented** - Working as designed

---

### Tab 5: SENT TO PARENTS 📤 (Conditional - Trust Level)

**Icon**: Send
**Badge**: None
**Visibility**: Only shown when **`trustLevel >= 2`**

#### What It Shows
**All Parent Summaries Sent (Last 30 Days)**:
- Both auto-approved AND manually approved summaries
- Time-sorted (newest first)
- Includes multiple status types:
  - auto_approved (pending delivery)
  - delivered (sent but not viewed)
  - viewed (parent opened)
  - suppressed (revoked by coach)

**Each Summary Card Shows**:
- Player name
- Summary content (first 2 lines)
- Confidence score
- Status badge:
  - "Pending Delivery" (gray, clock icon) - Waiting for 1-hour window
  - "Delivered" (blue, check icon) - Sent, not yet viewed
  - "Viewed" (green, eye icon) - Parent opened it
  - "Revoked" (red, X icon) - Coach canceled within 1-hour
- Approval method badge:
  - "Auto-Approved" (gray) - System approved
  - "Manual" (outline) - Coach approved
- Sent timestamp (e.g., "3h ago")
- Acknowledgment indicator:
  - "✓ Acknowledged by Emma's Mum 2h ago" (if acknowledged)

#### User Actions
- **Search**: By player name or summary content
- **Filter**: By approval method (All / Auto / Manual)
- **Filter**: By acknowledgment status (All / Acknowledged / Not Acknowledged)
- **Revoke**: Cancel delivery within 1-hour window (if status = auto_approved)
- **View details**: Expand to see full summary

#### Search & Filter Examples
1. Search "emma" → Find all summaries for Emma
2. Filter "Auto-Approved" + "Not Acknowledged" → Find auto-sent summaries parents haven't engaged with
3. Search "injury" → Find all injury-related summaries

#### When It Hides
- Trust level 0 or 1 (coach hasn't built trust yet)
- Tab completely hidden from navigation

#### When It Appears
- **First appearance**: When coach reaches trust level 2
- Remains visible at Level 2+

#### Current Implementation Status
✅ **Fully Implemented** with recent enhancements:
- ✅ Parent acknowledgment display
- ✅ Expanded to show manual summaries (not just auto)
- ✅ Time window expanded from 7 → 30 days
- ✅ Search and filter capabilities
- ✅ Approval method badges
- ✅ Scheduled delivery processing (cron job)

---

### Tab 6: HISTORY 📚 (Always Visible)

**Icon**: History
**Badge**: None
**Visibility**: **ALWAYS SHOWN**

#### What It Shows
**Complete Archive of All Voice Notes**:
- Every voice note ever created by this coach
- Full transcriptions
- All insights generated (applied, dismissed, pending)
- Parent summaries created from insights
- Date range: All time (no limit)

**Each Note Shows**:
- Transcription text
- Audio player (if audio recorded)
- Note type (training/match/general)
- Date and time created
- List of insights extracted
- Status of each insight (pending/applied/dismissed/auto_applied)
- Parent summaries generated

#### User Actions
- **Search**: By transcription text, player name, date
- **Filter**: By note type, date range, player
- **View**: Full note details
- **Reference**: Past observations for player development tracking

#### Features
- Search across all historical notes
- Filter by multiple criteria
- View complete audit trail
- Track development over time

#### When It's Useful
- Review past assessments
- Track player progress over season
- Reference previous observations
- Audit AI decisions

#### Current Implementation Status
✅ **Implemented** - Working as designed

---

### Tab 7: SETTINGS ⚙️ (Always Visible - Header Icon)

**Icon**: Settings (in header, not main tabs)
**Badge**: None
**Visibility**: **Always available via header icon**

#### What It Shows
**Auto-Apply Configuration**:
- **Trust Level Display**:
  - Current level (0, 1, 2, 3)
  - Trust level icon
  - Progress to next level (e.g., "5 more reviews to Level 2")
  - Description of current level capabilities

- **Category Preferences** (Enable/Disable):
  - Skills (skill_rating, skill_progress)
  - Attendance
  - Goals
  - Performance (includes behavior)
  - Injury/Medical (always manual - not toggleable)

- **Confidence Threshold Slider**:
  - Range: 0.5 - 1.0
  - Default: 0.7 (70%)
  - Shows: "Only auto-apply insights with X% confidence or higher"
  - Adaptive: Adjusts based on undo patterns

#### User Actions
- View trust level progress
- Enable/disable auto-apply by category
- Adjust confidence threshold
- Understand what AI will do automatically

#### Trust Level Impact
- **Level 0-1**: Settings visible but auto-apply disabled
- **Level 2+**: Settings control active auto-apply behavior

#### Current Implementation Status
✅ **Implemented** - Accessible from header icon

---

## INSIGHTS SUB-TABS (Level 2)

The Insights tab contains **3 sub-tabs** for managing different insight states.

---

### Sub-Tab A: PENDING REVIEW 📋

**Purpose**: Queue of insights needing coach action

#### Two Main Sections

##### Section 1: NEEDS YOUR HELP ⚠️ (Top Priority - Conditional)
**Styling**: Amber background, warning icon
**Visibility**: When **`needsAttentionCount > 0`**

**Shows 4 Types of Blocked Insights**:

1. **Unmatched Players** (`unmatchedInsights`)
   - AI extracted player name but couldn't match to roster
   - Example: "Sineád" vs "Sinead" (accent mismatch)
   - **Requires**: Assign to correct player
   - **Action**: "Assign Player" button → search roster
   - **Block**: Cannot auto-apply until matched

2. **Team Insights Without Team** (`teamInsightsNeedingAssignment`)
   - Category = team_culture but no teamId assigned
   - Example: "Team showed great resilience today"
   - **Requires**: Assign to specific team
   - **Action**: "Assign Team" button → select from dropdown
   - **Block**: Cannot auto-apply until team assigned

3. **TODO Without Assignee** (`unassignedTodoInsights`)
   - Category = todo but no assigneeUserId
   - Example: "Need to schedule extra tackling session"
   - **Requires**: Assign to coach
   - **Action**: "Assign Coach" button → select from team coaches
   - **Block**: Cannot auto-apply until assigned

4. **Uncategorized Insights** (`uncategorizedInsights`)
   - No player, no team-level category
   - AI couldn't determine context
   - **Requires**: Classify as team/todo OR assign player
   - **Action**: "Classify" button → choose category
   - **Block**: Cannot auto-apply until categorized

**After Manual Correction**:
- ✅ **Auto-apply re-check triggers** (Phase 7.3 feature)
- If now eligible → Automatically moves to Auto-Applied tab
- Coach sees toast: "✓ Auto-applied after correction: Tackling 5 → 4"

##### Section 2: AI INSIGHTS (Ready to Apply) 💙
**Styling**: Blue background
**Visibility**: Always (shows count)

**Shows 3 Types of Ready Insights**:

1. **Matched Insights** (`matchedInsights`)
   - Has playerIdentityId (matched to roster)
   - Category assigned
   - Ready to apply immediately

2. **Classified Team Insights** (`classifiedTeamInsights`)
   - Has teamId + category = team_culture
   - Ready to apply to team notes

3. **Assigned TODO Insights** (`assignedTodoInsights`)
   - Has assigneeUserId + category = todo
   - Ready to create task for coach

**Each Insight Shows**:
- Player name
- Title (e.g., "Emma's Tackling Skill Rating")
- Description (full text from AI)
- Category badge (skill_rating, performance, etc.)
- Recommended update (e.g., "Set tackling to 4/5")
- Confidence score (0-100%)
- "Would Auto-Apply" badge (if eligible at Level 2+)

**Actions**:
- **Apply**: Single insight application
- **Apply All (N)**: Bulk apply when multiple ready
- **Edit**: Modify insight before applying
- **Dismiss**: Not relevant/incorrect

**Prediction Indicators** (Phase 7.1):
- Badge shows "Would Auto-Apply" if:
  - Trust level >= 2
  - Confidence >= threshold
  - Category enabled in preferences
  - Not injury/medical

**Calculation**:
```
readyToApplyCount = pendingInsightsCount - needsAttentionCount
```

#### Current Implementation Status
✅ **Fully Implemented** including:
- ✅ Re-check auto-apply after corrections
- ✅ Toast notifications when re-check succeeds
- ✅ "Would Auto-Apply" prediction badges

---

### Sub-Tab B: AUTO-APPLIED ✅

**Purpose**: History of insights automatically applied by AI

**Visibility**: Always available (empty state if none)

#### What It Shows
**Insights Automatically Applied** (status = "auto_applied"):
- Skill changes made by AI
- Confidence scores
- Timestamps
- Previous value → New value
- Undo capability (1-hour window)

**Card Display**:
- **Green background**: Active (can undo)
- **Gray background**: Undone (reverted)
- **White background**: Expired (>1 hour, permanent)

**Each Card Shows**:
- Player name
- Skill name (e.g., "Tackling")
- Change: "5 → 4" or "none → 5"
- Confidence score bar
- Timestamp (e.g., "2h ago")
- AI confidence percentage

**Actions**:
- **Undo** button (if within 1 hour):
  - Reverts player data to previous value
  - Changes insight status back to "pending"
  - Moves insight back to Pending Review tab
- **Expired** button (after 1 hour):
  - Grayed out, cannot undo
  - Change is permanent
- **Undone** badge (if already reverted):
  - Shows "Undone 30m ago"

**Trust Level Impact**:
- **Level 0-1**: Tab exists but shows empty state
  - Message: "Auto-apply unlocks at Level 2"
  - Shows progress: "5/20 insights reviewed"
- **Level 2+**: Tab shows active auto-applied insights

#### Current Implementation Status
✅ **Fully Implemented** - Working as designed

---

### Sub-Tab C: SETTINGS ⚙️

**Purpose**: Configure auto-apply behavior

#### What It Shows
**Same as main Settings (header icon)**:
- Trust level display with icon
- Progress to next level
- Category preferences (toggle each)
- Confidence threshold slider

**Difference from Header Icon**:
- None - identical content
- Provides alternative access path
- Some users prefer tab-based navigation

#### Current Implementation Status
✅ **Implemented** - Accessible from both locations

---

## TAB VISIBILITY LOGIC

### Always Visible (2 tabs)
1. **New** - Core functionality
2. **History** - Archive access
3. **Settings** - Configuration (header icon)

### Conditional Visibility (5 tabs)

| Tab | Condition | Hide When |
|-----|-----------|-----------|
| Parents | `pendingSummariesCount > 0` | All summaries approved/suppressed |
| Insights | `pendingInsightsCount > 0` | All insights applied/dismissed |
| Team | `pendingTeamInsightsCount > 0` | All team insights resolved |
| Sent to Parents | `trustLevel >= 2` | Trust level 0 or 1 |
| History | Always visible | Never hides |

---

## AUTO-SWITCH PRIORITY

When dashboard loads, it auto-switches to highest priority tab with work:

**Priority Order**:
1. **Parents** (if pendingSummariesCount > 0) - HIGHEST
2. **Insights** (if pendingInsightsCount > 0) - SECOND
3. **New** (default) - FALLBACK

**Rationale**: Parent communication takes priority over player development insights.

---

## BADGE COLORS & MEANINGS

### Tab Badges
- **Number badge**: Count of pending items
- **⚠️ Warning badge**: Sensitive content requiring attention

### Status Badges (Sent to Parents Tab)

| Badge | Color | Icon | Meaning |
|-------|-------|------|---------|
| Pending Delivery | Gray | Clock | Within 1-hour revoke window |
| Delivered | Blue | Check | Sent, parent hasn't viewed |
| Viewed | Green | Eye | Parent opened summary |
| Revoked | Red | X | Coach canceled delivery |

### Approval Method Badges

| Badge | Style | Meaning |
|-------|-------|---------|
| Auto-Approved | Gray (secondary) | AI auto-approved at Level 2+ |
| Manual | Outline | Coach manually approved |

### Category Badges (Insights)

| Category | Color | Purpose |
|----------|-------|---------|
| skill_rating | Blue | Skill level assessment |
| skill_progress | Green | Skill improvement noted |
| injury | Red | Injury observation (always manual) |
| behavior | Red | Behavioral concern (always manual) |
| performance | Purple | General performance note |
| attendance | Orange | Attendance tracking |
| team_culture | Teal | Team-level observation |
| todo | Yellow | Action item for coach |

---

## COMPLETE INSIGHT JOURNEY

### Stage 1: Voice Note Creation
1. Coach records note in **New Tab**
2. AI transcribes audio (30-60 seconds)
3. AI extracts insights with confidence scores

### Stage 2: Initial Processing (Phase 7.3)
**Auto-Apply Eligibility Check**:
- Trust level >= 2?
- Confidence >= threshold?
- Category enabled in preferences?
- Category NOT injury/medical?
- Player matched?
- Format parseable?

**If Eligible**: status = "auto_applied" → **Auto-Applied Tab**
**If Not Eligible**: status = "pending" → **Pending Review Tab**

### Stage 3: Manual Review (Pending Review Tab)

**Path A: Needs Attention**
1. Coach sees insight in "Needs Your Help" section
2. Coach fixes issue (assign player, classify, etc.)
3. **Re-check auto-apply triggers** (new in Phase 7.3)
4. If now eligible → Auto-applies → Moves to **Auto-Applied Tab**
5. Coach sees toast: "✓ Auto-applied after correction"

**Path B: Ready to Apply**
1. Coach manually applies → status = "applied"
2. OR coach dismisses → status = "dismissed"

### Stage 4: Auto-Applied Review (Auto-Applied Tab)

**Within 1 Hour**:
- Coach can undo
- Status reverts to "pending"
- Player data reverted
- Goes back to Pending Review

**After 1 Hour**:
- Undo window expired
- Change is permanent
- Remains in Auto-Applied history

### Stage 5: History (History Tab)
- All notes and insights viewable
- Complete audit trail
- Reference for future coaching

---

## PARENT SUMMARY JOURNEY

### Stage 1: Summary Generation
1. AI detects parent-shareable insight
2. AI generates parent-friendly summary
3. AI classifies sensitivity (normal/injury/behavior)
4. Auto-approval decision made (if Level 2+)

### Stage 2: Pending Review (Parents Tab)
**If Auto-Approved** (Level 2+):
- status = "auto_approved"
- scheduledDeliveryAt = now + 1 hour
- Shows in **Sent to Parents Tab**

**If Manual Review Required**:
- status = "pending_review"
- Shows in **Parents Tab**
- Coach must approve/edit/suppress

### Stage 3: Delivery (Cron Job)
- Every 5 minutes, cron checks scheduledDeliveryAt
- If time passed: status → "delivered"
- Parent receives notification (future: email/SMS/push)

### Stage 4: Parent Engagement
- Parent views: viewedAt timestamp → badge changes to "Viewed" (green)
- Parent acknowledges: acknowledgedAt timestamp → "✓ Acknowledged by Emma's Mum"

---

## EMPTY STATES

### New Tab
- Never empty (always has recording interface)

### Parents Tab
- Empty = Tab hides from navigation
- No empty state shown

### Insights Tab
- Empty = Tab hides from navigation
- No empty state shown

### Team Tab
- Empty = Tab hides from navigation
- No empty state shown

### Sent to Parents Tab (Level 2+)
**When truly empty**:
```
✓ No Sent Summaries

Summaries sent to parents (auto-approved and manually approved) will
appear here.

Once you approve insights for parents, they will be listed here.
```

**When filtered to no results**:
```
No summaries match your search and filters.

[Clear Filters] button
```

### Auto-Applied Sub-Tab (Level 0-1)
```
🔒 Auto-Apply Unlocks at Level 2

Build trust by manually reviewing 20 insights.
High-confidence insights will automatically apply here.

Current Progress: 5/20 insights reviewed
```

### History Tab
- Shows "No voice notes yet" if truly empty
- "Create your first note" call-to-action

---

## RESPONSIVE BEHAVIOR

### Mobile
- Tabs collapse to dropdown menu
- Badges shown inline
- One card per row
- Search/filter stack vertically

### Tablet
- Tabs shown as scrollable row
- 2 cards per row
- Filters on same row as search

### Desktop
- Full tab bar visible
- 3+ cards per row
- All controls on single row

---

## SUMMARY TABLE

| # | Tab | Always Visible? | Condition | Badge | Content |
|---|-----|-----------------|-----------|-------|---------|
| 1 | New | ✅ Yes | None | None | Record voice notes |
| 2 | Parents | ❌ No | pendingSummariesCount > 0 | Count + ⚠️ | Pending parent summaries |
| 3 | Insights | ❌ No | pendingInsightsCount > 0 | Count + ⚠️ | 3 sub-tabs (Pending/Auto/Settings) |
| 4 | Team | ❌ No | pendingTeamInsightsCount > 0 | Count | Team coach insights |
| 5 | Sent to Parents | ❌ No | trustLevel >= 2 | None | All sent summaries (30 days) |
| 6 | History | ✅ Yes | None | None | Complete archive |
| 7 | Settings | ✅ Yes (header) | None | None | Auto-apply configuration |

**Total Possible Tabs**: 7 (2 always + up to 5 conditional)

---

## TECHNICAL IMPLEMENTATION

### Tab Visibility Code
```typescript
// Main tabs (dashboard level)
tabs = [
  { id: "new" }, // Always
  pendingSummariesCount > 0 && { id: "parents", badge: count },
  pendingInsightsCount > 0 && { id: "insights", badge: count },
  pendingTeamInsightsCount > 0 && { id: "team", badge: count },
  trustLevel >= 2 && { id: "sent-to-parents" },
  { id: "history" }, // Always
].filter(Boolean);

// Sub-tabs (insights level)
insightsSubTabs = [
  { id: "pending-review" }, // Always
  { id: "auto-applied" }, // Always (empty state if Level 0-1)
  { id: "settings" }, // Always
];
```

### Auto-Switch Logic
```typescript
if (pendingSummariesCount > 0) {
  setActiveTab("parents"); // Priority 1
} else if (pendingInsightsCount > 0) {
  setActiveTab("insights"); // Priority 2
} else {
  setActiveTab("new"); // Default
}
```

### Count Calculations
```typescript
needsAttentionCount =
  unmatchedInsights +
  uncategorizedInsights +
  teamInsightsNeedingAssignment +
  unassignedTodoInsights;

readyToApplyCount = pendingInsightsCount - needsAttentionCount;
```

---

This is the complete reference for all tabs in the Voice Notes dashboard system.
