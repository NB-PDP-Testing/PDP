# Phase 5: Parent Communication Controls - Ideation

**Date**: 2026-02-02
**Status**: 💡 Ideation Required
**Priority**: High (based on tester feedback)

---

## 🎯 Problem Statement

**Tester Feedback**: "Don't want parents bombarded with messages"

**Current Issue**:
The original design for Frequency Controls (US-P9-042) and Smart Digest (US-P9-043) only addresses **timing** (when to send), but doesn't address **volume** (how many insights to send).

**Example Scenario**:
```
Coach creates 15 voice notes in one day.
Current design: Daily digest at 6 PM sends ALL 15 insights to ALL parents.
Result: Parent gets overwhelmed with a massive email.
Problem: No intelligence about relevance or priority.
```

---

## 🚫 Why Original Design (US-P9-042/043) is Insufficient

### US-P9-042: Frequency Controls (Original)
- Radio buttons: Immediate, Daily digest, Weekly digest
- Time picker for digest delivery
- **Missing**: Volume control, relevance filtering, priority weighting

### US-P9-043: Smart Digest Backend (Original)
- Cron job sends digest at scheduled time
- Batches all insights created since last digest
- **Missing**: Intelligence about WHICH insights to include, MAX insights per digest

---

## 💡 What We Actually Need

### 1. **Intelligent Filtering** (Not Just Batching)
Parents should only receive insights relevant to their child:
- ✅ Insight mentions their child by name → Include
- ✅ Insight has their child's playerIdentityId → Include
- ❌ General team insight not about their child → Exclude (or separate section)

### 2. **Volume Control** (Max Insights Per Digest)
Coach sets maximum insights per digest:
- Example: "Max 5 insights per daily digest"
- If coach creates 15 insights, system sends top 5 (by priority)
- Remaining 10 either:
  - Roll over to next digest
  - Get filtered out (low priority)
  - Aggregate into "10 other insights" summary

### 3. **Priority-Based Routing**
Different rules for different priority levels:
- **High priority** (injuries, behavioral issues) → Always immediate
- **Medium priority** (skill improvements, good performance) → Batched in digest
- **Low priority** (general observations) → Summary only or exclude

### 4. **Parent Preferences** (Per-Parent Control)
Parents set their own preferences:
- Communication level: "Highlights only" vs "Everything"
- Frequency override: Parent can choose daily even if coach defaults to weekly
- Topics: "Only injuries/medical" vs "All updates"

### 5. **Insight Summarization** (AI-Powered)
If too many insights, use AI to summarize:
- Instead of 15 individual insights → "Emma had a great week: 3 skill improvements, 2 positive behavioral notes"
- Link to "View all insights" in coach portal

---

## 🏗️ Proposed Architecture

### Phase 5 Story Breakdown

#### **Story 1: Insight Relevance Engine** (3h)
**Purpose**: Filter insights by child relevance

**Backend:**
- Add `relevantPlayerIds: v.array(v.id("orgPlayerEnrollments"))` to teamInsights
- Extract player mentions from insight text (AI or simple name matching)
- Query: `getParentRelevantInsights(parentId)` → Only insights for their children

**Acceptance Criteria:**
- Insights tagged with relevant player IDs
- Parents only see insights about their own children
- General team insights flagged separately

---

#### **Story 2: Volume Control Settings** (2h)
**Purpose**: Coach sets max insights per digest

**Backend:**
- Extend coachOrgPreferences:
  ```typescript
  maxInsightsPerDigest: v.optional(v.number()), // default: 5
  digestPriorityThreshold: v.optional(v.union(
    v.literal("high-only"),
    v.literal("medium-and-high"),
    v.literal("all")
  ))
  ```

**UI:**
- Number input: "Max insights per digest" (1-20, default 5)
- Radio: "Include priority levels: High only / Medium+ / All"
- Preview: "If you create 15 insights, parents will receive top 5 by priority"

---

#### **Story 3: Priority-Based Routing** (4h)
**Purpose**: High-priority insights bypass digest, go immediate

**Backend:**
- Add `deliveryRule` field to teamInsights based on priority
- High priority → immediate notification
- Medium → batched in digest
- Low → summary only or exclude

**Logic:**
```typescript
if (insight.priority === "high") {
  await sendImmediateNotification(parentIds, insight);
} else if (insight.priority === "medium") {
  await addToDigestQueue(parentIds, insight);
} else {
  await addToSummaryBatch(parentIds, insight);
}
```

---

#### **Story 4: Parent Communication Preferences** (3h)
**Purpose**: Parents control their own notification settings

**Backend:**
- Create `parentNotificationPreferences` table:
  ```typescript
  defineTable({
    userId: v.string(),
    childId: v.id("orgPlayerEnrollments"),
    frequency: v.union("immediate", "daily", "weekly"),
    volumeLevel: v.union("highlights", "moderate", "everything"),
    topicsEnabled: v.array(v.union(
      "injuries",
      "skills",
      "behavior",
      "attendance",
      "general"
    ))
  })
  ```

**UI (Parent Portal):**
- Settings page: "Notifications about [Child Name]"
- Frequency: Immediate / Daily / Weekly
- Volume: Highlights only / Moderate / Everything
- Topics: Checkboxes for injury, skills, behavior, etc.

---

#### **Story 5: Smart Digest Backend with Summarization** (5h)
**Purpose**: Intelligent digest assembly with AI summarization

**Backend:**
- Cron job runs daily/weekly
- For each parent:
  1. Query insights for their children
  2. Filter by parent preferences (volume, topics)
  3. Sort by priority
  4. Take top N (based on maxInsightsPerDigest)
  5. If remaining insights > 3, summarize with AI
  6. Format email with sections:
     - 🚨 Urgent (high-priority, immediate items)
     - ⭐ Highlights (top N medium-priority)
     - 📊 Summary (AI-generated summary of remaining)
     - 🔗 "View all insights" link

**AI Summarization:**
```typescript
const summary = await generateInsightSummary({
  insights: remainingInsights,
  tone: coach.parentSummaryTone,
  format: "brief"
});
// Output: "Emma had a productive week: 3 skill improvements
// (tackling, passing, positioning) and maintained excellent
// attendance. Keep up the great work!"
```

---

#### **Story 6: Frequency Controls UI (Evolved)** (2h)
**Purpose**: Coach UI for frequency + volume settings

**UI Components:**
- Frequency radio: Immediate / Daily / Weekly
- Time/day pickers (if digest)
- **NEW**: Volume slider: "Max insights per digest" (1-20)
- **NEW**: Priority threshold: "Send priority levels: High only / Medium+ / All"
- **NEW**: Preview card: "Based on last 7 days, parents would have received X insights"

---

### Phase 5 Total: 19 hours (6 stories)

| Story | Effort | Focus |
|-------|--------|-------|
| Insight Relevance Engine | 3h | Filter by child |
| Volume Control Settings | 2h | Coach sets max |
| Priority-Based Routing | 4h | High → immediate |
| Parent Preferences | 3h | Parent control |
| Smart Digest Backend | 5h | Intelligent assembly + AI summary |
| Frequency Controls UI | 2h | Evolved settings UI |
| **TOTAL** | **19h** | **Complete parent comms** |

---

## 🎯 Success Criteria

### Parent Experience:
- ✅ Only receives insights about their own children
- ✅ Never overwhelmed (max 5 insights per digest by default)
- ✅ Urgent items (injuries) arrive immediately
- ✅ Can customize frequency and volume to their preference
- ✅ Gets AI summary if coach creates many insights

### Coach Experience:
- ✅ Sets team-wide defaults (tone, frequency, max volume)
- ✅ Preview shows what parents will receive
- ✅ Confidence that high-priority items go immediately
- ✅ No worry about "over-communicating"

---

## 📝 Key Design Questions (For Ideation)

1. **Volume Threshold**: What's the right default max? 3? 5? 10?
   - Research: How many bullet points can parent absorb in one email?

2. **Rollover Strategy**: If max is 5 but coach creates 15, what happens to remaining 10?
   - Option A: Roll over to next digest
   - Option B: Discard (low priority only)
   - Option C: AI summarize into one line

3. **Parent Override**: Should parent max override coach max?
   - Example: Coach sets max 5, parent wants max 10
   - Or: Coach sets max 10, parent wants max 3

4. **Topic Filtering**: What topics matter most?
   - Injuries/medical (always send?)
   - Skills/development (batched?)
   - Behavioral (immediate or batched?)
   - Attendance (summary only?)

5. **Summarization Quality**: How smart should AI summary be?
   - Simple: "3 skill improvements, 2 behavioral notes"
   - Advanced: "Emma's tackling improved significantly (3→5), showing leadership..."

6. **Multi-Child Parents**: Parent has 2+ children on team
   - Separate digest per child?
   - Combined digest with sections?
   - Parent preference?

---

## 🔗 Related Stories (From Original Plan)

### Deferred from Week 4:
- ❌ **US-P9-042**: Frequency Controls (original - too simple)
- ❌ **US-P9-043**: Smart Digest Backend (original - too simple)

### Evolved for Phase 5:
- ✅ **New Story 1**: Insight Relevance Engine
- ✅ **New Story 2**: Volume Control Settings
- ✅ **New Story 3**: Priority-Based Routing
- ✅ **New Story 4**: Parent Preferences
- ✅ **New Story 5**: Smart Digest Backend (evolved)
- ✅ **New Story 6**: Frequency Controls UI (evolved)

---

## 💭 Tester Feedback Integration

**Original Feedback**: "Don't want parents bombarded with messages"

**How This Design Addresses It:**
1. **Relevance filtering** → Parents only get insights about their children
2. **Volume control** → Max 5 insights per digest (coach can adjust)
3. **Priority routing** → Only urgent items go immediately
4. **Parent preferences** → Parents choose "highlights only" if desired
5. **AI summarization** → Remaining insights condensed into one summary

**Result**: Parents feel informed, not overwhelmed.

---

## 📅 Next Steps

1. **User Research** (Before Phase 5):
   - Interview 3-5 parents: What volume feels right?
   - Survey coaches: How many insights do they create per week?
   - Analyze current voice note creation patterns

2. **Design Workshop**:
   - Sketch UI for coach volume controls
   - Design parent preference UI (portal vs email)
   - Prototype AI summary formats

3. **Technical Spike**:
   - Test AI summarization quality (Claude API)
   - Estimate cost per digest (AI calls)
   - Design cron job for digest assembly

4. **Phase 5 PRD**:
   - Write detailed acceptance criteria for 6 stories
   - Create mockups for coach/parent UIs
   - Define AI summary prompts

---

## 🎉 Why This Matters

**Business Value:**
- Reduces parent complaint risk ("too many emails")
- Increases engagement (relevant insights only)
- Builds trust (coaches have control, parents have choice)

**Technical Value:**
- Clean architecture (relevance engine reusable)
- Scalable (works for 10 insights or 100)
- Extensible (can add SMS, push notifications later)

**Competitive Advantage:**
- No other sports platform has intelligent parent digests
- AI summarization is cutting-edge UX
- Shows we listen to tester feedback

---

**Status**: Ready for Phase 5 ideation and user research
**Owner**: Product team + Engineering
**Timeline**: After Phase 4 complete

---
