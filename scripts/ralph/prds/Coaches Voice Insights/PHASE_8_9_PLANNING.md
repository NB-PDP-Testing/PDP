# Phase 8 & 9 Planning: Voice Notes Enhancement
## Insights Extracted from Technical Overview Sections 15-21

**Document Version:** 1.0
**Date:** January 27, 2026
**Source:** `/docs/technical/VOICE_NOTES_TECHNICAL_OVERVIEW.md` (Lines 2544-4651)
**Prepared By:** Claude Sonnet 4.5 (Analysis Agent)

---

## Executive Summary

This document synthesizes insights from sections 15-21 of the Voice Notes Technical Overview to inform Phase 8 (P8) and Phase 9 (P9) development planning. Analysis reveals **one critical gap and multiple enhancement opportunities** across five key themes:

### Key Findings

1. **Critical Gap Identified (Section 20):** Level 0-1 coaches (manual review users) have **ZERO visibility** into outcomes of their work. They cannot:
   - See what parent summaries they've sent
   - Track which insights were applied to player profiles
   - Understand their coaching impact
   - Follow up on previous communications

   **Impact:** Coaches doing MORE work get LESS feedback than automated users. This is a fundamental UX failure.

2. **Collaboration Opportunity (Section 19):** Team Insights can evolve from a simple list view into a comprehensive collaboration hub inspired by industry leaders (Notion, ClickUp, Figma, Asana).

3. **AI Personalization (Sections 17-18):** System tracks coach behavior but doesn't surface learning insights back to coaches. Prompt flexibility is hardcoded.

4. **Admin Tools Gap (Section 15):** Rich analytics exist in backend but no UI to visualize trends, costs, or system health.

5. **Audio Features (Section 16):** Audio files stored but never played back. No retention policy.

### Priority Themes

| Theme | Priority | Phases |
|-------|----------|--------|
| **Coach Visibility & Impact** | 🔴 Critical | P8 (primary focus) |
| **Team Collaboration Hub** | 🟡 High | P9 (primary focus) |
| **AI Tuning & Personalization** | 🟡 Medium | P9 (secondary focus) |
| **Admin Tools & Analytics** | 🟢 Low | Future phases |
| **Audio/Media Features** | 🟢 Low | Future phases |

---

## Section-by-Section Insights Analysis

### Section 15: Admin Observability & Platform Analytics

#### What's Implemented

✅ **Backend Analytics Infrastructure (Complete)**
- Per-API-call logging (`aiUsageLog`)
- Daily aggregates for 100x faster queries (`aiUsageDailyAggregates`)
- Cost budgeting with alerts (`orgCostBudgets`, `platformCostAlerts`)
- Service health monitoring with circuit breaker (`aiServiceHealth`)
- Coach override pattern tracking (`coachOverrideAnalytics`)
- Trust level distribution tracking (`coachTrustLevels`)

✅ **Data Collection**
- Operation-level metrics (transcription, insights, summaries)
- Token usage (input, cached, output)
- USD cost per operation
- Coach attribution
- Error tracking
- Override reasons (wrong_player, wrong_rating, etc.)

#### What's Missing

❌ **Admin UI (No Frontend)**
- No dedicated voice notes analytics dashboard
- No historical trend charts
- No export functionality
- No visual cost breakdown
- No confidence score distribution visualization

❌ **Coach-Facing Analytics**
- Coaches don't see their own cost impact
- No "most improved" leaderboards
- No accuracy metrics per coach

#### Insights Extracted

| Insight | Category | Priority |
|---------|----------|----------|
| "Admins must query raw data - no visual dashboard" | Admin UX | 🟢 Low |
| "Can't see patterns over time without charts" | Admin UX | 🟢 Low |
| "No per-feature cost breakdown in UI" | Admin UX | 🟢 Low |
| "Transcription quality metrics not tracked" | System Quality | 🟢 Low |
| "Override patterns tracked but not surfaced to coaches" | Coach Learning | 🟡 Medium |
| "Budget alerts work but no visualization of spending trends" | Admin UX | 🟢 Low |

#### Recommendations for Future Phases

1. **Admin Analytics Dashboard** (Post-P9)
   - Daily voice note creation trends
   - AI cost visualization by org/coach/feature
   - Success rate charts (transcription + insights)
   - Common insight categories pie chart
   - Override/correction rate trends

2. **Coach Cost Awareness** (Post-P9)
   - Show coaches their AI usage in "My Impact" (future)
   - "Your notes this month cost $2.45 in AI" with context
   - Compare to org average (anonymized)

3. **Platform Staff Tools** (Post-P9)
   - Real-time health dashboard
   - Model performance A/B testing results
   - Alert history with acknowledgment tracking

**Priority Assessment:** Low priority for P8/P9. Backend infrastructure is solid. Admin UI can wait until product-market fit established with coaches.

---

### Section 16: Audio Storage Architecture

#### What's Implemented

✅ **Audio Upload & Storage**
- Browser recording to Convex storage (direct upload)
- WhatsApp audio download and storage
- Storage reference in `voiceNotes.audioStorageId`
- Automatic cleanup when note deleted
- Supports `audio/webm` (browser) and `audio/ogg` (WhatsApp)

#### What's Missing

❌ **Playback Features**
- No audio player UI
- Audio stored but never played back
- Coaches can't review original recording

❌ **Quality Features**
- No waveform visualization during recording
- No real-time audio level meter
- No recording duration counter

❌ **Data Management**
- No retention policy (indefinite storage)
- No storage quotas per org
- No bulk download for GDPR compliance

#### Insights Extracted

| Insight | Category | Priority |
|---------|----------|----------|
| "Audio stored but never played back - unused asset" | Coach UX | 🟡 Medium |
| "No way to verify transcription accuracy by listening" | Quality Assurance | 🟡 Medium |
| "No waveform feedback during recording" | Recording UX | 🟢 Low |
| "Indefinite storage with no retention policy" | Data Management | 🟡 Medium |
| "Can't re-transcribe with better model if AI improves" | System Improvement | 🟢 Low |

#### Use Cases for Audio Playback

| Use Case | Description | Value |
|----------|-------------|-------|
| **Transcription Verification** | Coach reviews if AI misunderstood accent/terminology | High |
| **Dispute Resolution** | Verify what was actually said vs what AI interpreted | Medium |
| **Compliance/GDPR** | Parent requests original audio of communication | Medium |
| **Re-transcription** | Use better Whisper model on existing recordings | Low |
| **Training Data** | Improve AI with Irish accent examples | Low |

#### Recommendations for P8/P9

**P9 (Medium Priority):**
1. **Add Audio Playback to History Tab**
   ```typescript
   // Simple implementation
   const audioUrl = await ctx.storage.getUrl(note.audioStorageId);

   // Component
   <audio controls src={audioUrl} className="w-full">
     Your browser does not support audio playback.
   </audio>
   ```

2. **Add "Listen to Original" Link in Voice Note Detail View**
   - Show only if `audioStorageId` exists
   - Show duration if available
   - Add download button

**Post-P9 (Low Priority):**
- Waveform visualization during recording
- Retention policy with configurable TTL
- Bulk audio export for GDPR requests

**Priority Assessment:** Medium priority for P9. Adds transparency and trust. Low implementation effort.

---

### Section 17: Coach Learning & Feedback Loop

#### What's Implemented

✅ **Data Collection**
- All coach corrections tracked (`coachOverrideAnalytics`)
- Trust level progression visible in Settings tab
- Threshold auto-adjustment based on behavior
- Undo reason analytics (`getUndoReasonStats`)
- Agreement rate calculation for preview mode

✅ **What Coaches Can Currently See**
- Trust level (0-3)
- Progress to next level (percentage)
- Total approvals count

#### What's Missing

❌ **Coach-Facing Feedback**
- Coaches don't see their correction history
- No examples of applied insights
- No tips based on correction patterns
- No comparison with peer benchmarks
- No "learning dashboard"

❌ **System Learning Gaps**
- Prompt improvements not automated from corrections
- Per-coach vocabulary not learned (nicknames)
- Sport-specific terminology not adaptive
- No per-org prompt tuning

#### Critical Insight: Coach Learning Gap

**Quote from Section 17.2:**
> "Coaches see their trust level in Settings tab but have NO visibility into:
> - Suppression rate (how often they reject AI)
> - Correction history over time
> - Examples of successfully applied insights
> - AI accuracy trends for their notes"

#### Insights Extracted

| Insight | Category | Priority |
|---------|----------|----------|
| "Coach corrections tracked but never shown back to coach" | Coach Learning | 🔴 High |
| "No examples gallery of 'insights that went to passport'" | Coach Learning | 🔴 High |
| "Could provide tips: 'Try using full names for better matching'" | Coach Learning | 🟡 Medium |
| "Nickname learning possible ('Tommy' → Thomas for this coach)" | AI Improvement | 🟡 Medium |
| "No clickable links from insight → player passport" | Navigation UX | 🔴 High |
| "No backlinks from passport → source voice note" | Navigation UX | 🟡 Medium |
| "Agreement rate tracked but not shown to coach" | Coach Learning | 🟡 Medium |

#### Proposed: Coach Learning Dashboard (Section 17.3)

```
YOUR AI ACCURACY (Last 30 Days)

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│     87%      │  │     12       │  │      3       │
│  Agreement   │  │  Corrections │  │    Undos     │
│    Rate      │  │   Made       │  │              │
└──────────────┘  └──────────────┘  └──────────────┘

COMMON CORRECTIONS:
• Wrong player assigned (5x) - Try using full names
• Wrong category (4x) - AI confused skill_rating/skill_progress
• Confidence too high (3x) - Threshold may need adjustment
```

#### Proposed: Applied Insights Examples (Section 17.4)

```
RECENT APPLIED INSIGHTS

✅ "Hand pass improved to 4/5" → Sarah's Passport
   Applied: Jan 26, 2026 | Source: Training note
   [View in Passport] [View Original Note]

✅ "Ankle knock during drill" → Sarah's Injury Record
   Applied: Jan 26, 2026 | Source: Training note
   [View Record] [View Original Note]

⏪ "Solo run rating 3/5" → UNDONE (wrong player)
   Undone: Jan 25, 2026 | Original target: Clodagh
   [View Original Note]
```

#### Recommendations for P8/P9

**P8 (Critical - Primary Focus):**
1. **Clickable Navigation: Insights ↔ Passport**
   - Link from insight card → Player Passport
   - Backlink from passport record → Source Voice Note
   - Show in "My Impact" tab (see Section 20)

**P9 (Medium Priority):**
1. **Coach Learning Dashboard**
   - Agreement rate calculation
   - Correction pattern summary
   - Tips based on common mistakes
   - Compare with anonymous peer average

2. **Applied Insights Gallery**
   - Show recent insights that went to profiles
   - Include undo history with reasons
   - Filter by category/player

**Post-P9 (Low Priority):**
- Per-coach vocabulary learning
- Sport-specific prompt tuning
- Correction → prompt feedback automation

**Priority Assessment:** High priority for clickable navigation (P8). Medium priority for learning dashboard (P9).

---

### Section 18: Prompt Flexibility & Tone Controls

#### What's Implemented

✅ **AI Model Configuration**
- Model ID configurable per feature (`aiModelConfig`)
- Temperature, max tokens adjustable
- Provider switchable (OpenAI, Anthropic)
- Config audit trail (`aiModelConfigLog`)

#### What's Hardcoded

❌ **Prompt Text (Not Configurable)**
- System prompts hardcoded in `actions/voiceNotes.ts`
- Categories fixed list
- Matching instructions static
- No sport-specific vocabulary
- No tone/style controls

#### Insights Extracted

| Insight | Category | Priority |
|---------|----------|----------|
| "Parent summary tone fixed - no coach preference for warm vs professional" | Coach Personalization | 🟡 Medium |
| "Prompt templates hardcoded - can't A/B test without code deploy" | System Flexibility | 🟢 Low |
| "No sport-specific terminology adaptation (GAA vs Soccer)" | AI Quality | 🟡 Medium |
| "Verbosity fixed - can't choose 'concise' vs 'detailed' summaries" | Coach Personalization | 🟡 Medium |
| "No per-org prompt customization for formal vs casual clubs" | Org Personalization | 🟢 Low |

#### Proposed: Parent Summary Tone Controls (Section 18.3)

```typescript
// Coach preferences
{
  parentSummaryPreferences: {
    tone: "warm" | "professional" | "brief",
    verbosity: "concise" | "detailed",
    includeActionItems: boolean,
    includeEncouragement: boolean,
  },
}
```

**Tone Examples:**

| Tone | Example |
|------|---------|
| **Warm** | "Hi! Great news - Sarah showed wonderful improvement in her hand pass today. She's really putting in the effort and it's paying off! 🌟" |
| **Professional** | "Sarah demonstrated measurable improvement in hand pass technique during today's session. Rating increased from 3/5 to 4/5." |
| **Brief** | "Sarah: Hand pass improved to 4/5. Good session." |

#### Proposed: Communication Frequency Controls (Section 18.5)

```typescript
{
  parentCommunicationPreferences: {
    frequency: "every_insight" | "daily_digest" | "weekly_digest",
    minInsightsForDigest: 2,
    quietHours: { enabled: boolean, startHour: 21, endHour: 8 },
    maxSummariesPerPlayerPerWeek: 5,
  },
}
```

| Option | Behavior | Use Case |
|--------|----------|----------|
| `every_insight` | Immediate (current) | Engaged parents |
| `daily_digest` | Batch at 6 PM | Reduce notification fatigue |
| `weekly_digest` | Sunday evening | Casual communication |

#### Recommendations for P8/P9

**P9 (Medium Priority):**
1. **Tone Controls in Settings Tab**
   - Dropdown: Warm / Professional / Brief
   - Show example for each option
   - Apply to all future summaries

2. **Frequency Controls**
   - Add to coach preferences
   - Batch summaries if digest mode selected
   - Show preview: "Parents will receive summaries at 6 PM daily"

**Post-P9 (Low Priority):**
- Prompt template system (database-driven)
- Sport-specific vocabulary packs
- Per-org prompt overrides
- A/B testing framework

**Priority Assessment:** Medium priority for P9. Nice-to-have personalization that improves coach satisfaction.

---

### Section 19: Team Insights Collaboration Hub

#### Current Implementation

✅ **Two Separate Features**
1. **Team Insights Tab** (Voice Notes Dashboard)
   - Real-time collaborative insights from fellow coaches
   - Apply/Dismiss actions
   - Filter by pending vs all, search by player
   - Auto-discovery of fellow coaches

2. **Team Insights Page** (`/coach/team-insights`)
   - Persistent team observations (`teamObservations` table)
   - Team culture notes from voice notes
   - Grouped by team with filtering
   - Coach attribution and timestamps

#### What's Missing (Compared to Industry Leaders)

The section provides **extensive research** into collaboration platforms:

##### Notion Patterns (Section 19.6.1)
- **Block-based modularity:** Every insight as draggable, nestable block
- **Synced blocks:** Mirror content across views
- **Real-time presence:** Colored cursors show teammate locations
- **Inline comments:** Thread discussions on any block
- **@mentions:** Notify teammates in context

##### ClickUp Patterns (Section 19.6.2)
- **15+ view types:** List, Board, Calendar, Table, Mind Map, Gantt
- **Hierarchical structure:** Teams → Sessions → Insights → Actions
- **100+ automations:** "When injury insight applied → Create physio task"
- **AI workflow generation:** "Generate pre-match checklist from recent insights"
- **Real-time dashboards:** Custom visualizations

##### Figma Patterns (Section 19.6.3)
- **Live cursors:** See exactly where teammates are working
- **Cursor chat:** Quick contextual messages
- **Observation mode:** Follow teammate's cursor for training
- **Presence indicators:** Avatars show who's in document
- **Conflict resolution:** CRDTs ensure edits don't overwrite

##### Asana/Monday Patterns (Section 19.6.5)
- **Templates:** Pre-built workflows (Pre-Match Review, Season Planning)
- **Scalable permissions:** Multi-level access control
- **Cross-team visibility:** Head coach sees all, assistants see assigned
- **Workload management:** Visualize coach capacity
- **Dependencies:** Link related items

#### Insights Extracted

| Insight | Category | Priority |
|---------|----------|----------|
| "Team Insights split across two locations - should merge" | Navigation UX | 🔴 High |
| "No comments/reactions on insights - can't discuss" | Collaboration | 🔴 High |
| "No @mentions to notify teammates" | Collaboration | 🔴 High |
| "No activity feed showing team actions in real-time" | Collaboration | 🔴 High |
| "Single list view only - no Board/Calendar alternatives" | Collaboration | 🟡 Medium |
| "No shared task management for coaches" | Collaboration | 🟡 Medium |
| "No session preparation hub" | Collaboration | 🟡 Medium |
| "No live presence indicators (who's online)" | Collaboration | 🟢 Low |
| "No templates for common workflows" | Collaboration | 🟡 Medium |

#### Proposed: Unified Collaboration Hub Vision (Section 19.3)

```
┌─────────────────────────────────────────────────────────────────┐
│ TEAM: U14 Female                              [Switch Team ▼]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │INSIGHTS │ │  TASKS  │ │PLANNING │ │ACTIVITY │               │
│  │  (12)   │ │   (5)   │ │(Next:   │ │  FEED   │               │
│  │         │ │         │ │Thu 6PM) │ │         │               │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
│                                                                  │
│  RECENT INSIGHTS FROM COACHING TEAM                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 🏃 Coach Sarah (Yesterday)                                 │  │
│  │ "Great team spirit at training - the girls are gelling"    │  │
│  │ [Team Culture] [Applied ✓]                                 │  │
│  │ 💬 2 comments  👍 Coach Neil liked this                    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  TEAM ACTION ITEMS                                [+ Add Task]  │
│  ☐ Order new training cones (Neil) - Due: Fri                   │
│  ☐ Book pitch for challenge match (Sarah) - Due: Next Mon       │
│  ☑ Update player medical forms (Neil) - Completed ✓             │
│                                                                  │
│  UPCOMING SESSIONS                                               │
│  📅 Thu 23 Jan, 6:00 PM - Training @ Main Pitch                 │
│     Coaches: Neil, Sarah | Players confirmed: 14/16              │
│     [View Session Plan] [Add Notes]                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Proposed: Multi-View Toggle (Section 19.6.2)

```
┌─────────────────────────────────────────────────────────────────┐
│ U14 FEMALE INSIGHTS       [List] [Board] [Calendar] [Players]   │
├─────────────────────────────────────────────────────────────────┤

LIST VIEW:               BOARD VIEW:
• Emma: Tackling ↑       ┌──────────┐ ┌──────────┐ ┌──────────┐
• Sarah: Injury          │ PENDING  │ │ APPLIED  │ │FOLLOW-UP │
• Team: Great vibe       │ [Card 1] │ │ [Card 3] │ │ [Card 5] │
• Clodagh: Solo ↑        │ [Card 2] │ │ [Card 4] │ │          │
                         └──────────┘ └──────────┘ └──────────┘

CALENDAR VIEW:           PLAYER VIEW:
┌─────┬─────┬─────┐      EMMA BARLOW
│ Mon │ Tue │ Wed │      • Tackling 4/5 (Jan 26)
│  ●  │     │ ●●  │      • Performance (Jan 24)
└─────┴─────┴─────┘      • Attendance ✓ (Jan 22)
```

#### Proposed: Activity Feed (Section 19.6.4)

```
TEAM ACTIVITY                          [Filter ▼] [Mark All Read]

TODAY
─────
● 🔴 Coach Neil applied INJURY insight to Sarah    2 min ago
  "Ankle knock during drill - monitor for 48 hours"
  [View Insight] [View Player]

○ ⭐ Coach Sarah applied SKILL insight to Emma     1 hour ago
  "Tackling improved: 3 → 4"
  [View Insight] [View Player]

○ 📝 Coach Mike added COMMENT on "Team spirit"     2 hours ago
  "Agreed - best session this month"
  [View Thread]
```

#### Recommendations for P8/P9

**P9 (Primary Focus - High Priority):**

1. **Merge Team Insights Features** (Week 1)
   - Combine Team Insights Tab + Page into single hub
   - Add quick switcher between teams
   - Show unified view of all team activity

2. **Add Comments & Reactions** (Week 1-2)
   - Thread discussions on insights
   - Like/helpful/flag reactions
   - Notification when mentioned

3. **Add @Mentions** (Week 2)
   - @Coach Sarah mention support
   - Auto-suggest from team coaches
   - In-app + email notifications

4. **Add Activity Feed** (Week 2-3)
   - Actor-verb-object format ("Neil applied injury insight")
   - Read/unread states
   - Filter by type (insights, tasks, comments)
   - High/medium/low attention levels (injury = high)

5. **Add Multi-View Toggle** (Week 3-4)
   - List view (default, existing)
   - Board view (Kanban by status)
   - Calendar view (by date)
   - Player view (grouped by player)

6. **Add Session Templates** (Week 4)
   - Pre-Match Review template
   - Training Session template
   - Season Review template
   - AI suggestion based on recent insights

**Post-P9 (Low Priority):**
- Live presence indicators (Figma-style cursors)
- Shared task management
- Session preparation hub
- Block-based drag & drop

#### Database Schema Additions (Section 19.8)

```typescript
teamActivityFeed: defineTable({
  teamId: v.string(),
  organizationId: v.string(),
  activityType: v.string(),
  actorUserId: v.string(),
  targetType: v.string(),
  targetId: v.string(),
  summary: v.string(),
  createdAt: v.number(),
})

insightComments: defineTable({
  insightId: v.string(),
  voiceNoteId: v.id("voiceNotes"),
  userId: v.string(),
  content: v.string(),
  createdAt: v.number(),
})

sessionPrep: defineTable({
  teamId: v.string(),
  sessionDate: v.string(),
  objectives: v.array(v.string()),
  playerNotes: v.array(v.any()),
  status: v.string(),
})
```

**Priority Assessment:** High priority for P9. This is the major collaboration upgrade that differentiates PlayerARC from simple note-taking tools.

---

### Section 20: Coach Impact Visibility Gap ⚠️ **CRITICAL**

#### The Core Problem

**Quote from Section 20.1:**
> "Coaches at Level 0-1 have NO visibility into the results of their work, while Level 2+ coaches get the 'Sent to Parents' tab. All coaches need to answer basic questions about their coaching impact."

#### Questions Coaches Can't Answer

| Question | Current Answer | Impact |
|----------|----------------|--------|
| "What did I send to Emma's parent last week?" | ❌ No way to check | Can't follow up on conversations |
| "Did that skill rating actually get applied?" | ❌ Must check passport manually | No confidence in system |
| "How many insights did I approve this month?" | ❌ No tracking | Can't measure productivity |
| "Which voice notes led to player updates?" | ❌ No traceability | Can't learn from patterns |
| "What summaries are pending delivery?" | ❌ No visibility | No understanding of parent communication |

#### Visibility Asymmetry (Section 20.1)

**LEVEL 0-1 COACHES (Manual Review Required)**

What They Do:
- Record voice notes
- Review every insight manually
- Approve every parent summary
- Fix unmatched players
- Assign teams to observations

What They Can See After:
- ✅ Voice notes in History tab
- ❌ NO "where did this go" tracking
- ❌ NO sent summary history
- ❌ NO applied insight history
- ❌ NO parent response visibility
- ❌ NO "my impact" dashboard

**LEVEL 2+ COACHES (AI-Assisted)**

What They Do:
- Record voice notes
- AI auto-applies eligible insights
- AI auto-approves parent summaries
- Review edge cases only

What They Can See After:
- ✅ Voice notes in History tab
- ✅ Auto-Applied tab (with undo)
- ✅ Sent to Parents tab (30 days)
- ✅ Parent view/acknowledge status
- ✅ Confidence scores on insights
- ✅ "Would auto-apply" predictions

**RESULT:** Level 0-1 coaches do MORE work but have LESS visibility into outcomes. 🔴 **This is backwards.**

#### Current Tab Availability (Section 20.2)

| Tab | Level 0-1 | Level 2+ | Shows |
|-----|-----------|----------|-------|
| New | ✅ | ✅ | Recording interface |
| Parents | ✅ (pending only) | ✅ (pending only) | Summaries awaiting approval |
| Insights | ✅ (pending only) | ✅ (pending + auto) | Insights needing action |
| Team | ✅ | ✅ | Fellow coaches' insights |
| **Sent to Parents** | ❌ **HIDDEN** | ✅ | History of sent summaries |
| History | ✅ | ✅ | Voice note archive |
| Auto-Applied | ❌ Empty | ✅ | Auto-applied history |

#### What Level 0-1 Coaches Are Missing (Section 20.3)

1. **Sent Summary History**
   - After approving a summary, it disappears
   - No way to see what was communicated
   - Can't check if parent viewed it
   - Can't review past week's communication

2. **Applied Insight Traceability**
   - When insight applied, marked in array but no history view
   - Can't see which insights led to profile changes
   - Can't verify data was correctly applied
   - Can't learn what categories they use most

3. **My Impact Dashboard**
   - No aggregate view of coaching activity
   - Can't answer "How productive was my week?"
   - Can't see "What value did my voice notes create?"
   - Can't track improvement over time

#### Insights Extracted

| Insight | Category | Priority |
|---------|----------|----------|
| "Level 0-1 coaches have ZERO visibility into sent summaries" | Critical UX Gap | 🔴 Critical |
| "No 'applied insight' history for any trust level" | Critical UX Gap | 🔴 Critical |
| "Can't navigate from insight → player passport" | Navigation Gap | 🔴 Critical |
| "No backlinks from passport → source voice note" | Navigation Gap | 🟡 Medium |
| "No aggregate 'My Impact' view for productivity" | Coach Motivation | 🔴 Critical |
| "Parent view/acknowledge status hidden from Level 0-1" | Feedback Gap | 🔴 Critical |
| "Coaches can't learn from their own patterns" | Coach Learning | 🔴 Critical |

#### Proposed Solution: "My Impact" Tab (Section 20.4)

**Add new tab visible to ALL coaches (Level 0+):**

```
┌─────────────────────────────────────────────────────────────────┐
│ MY IMPACT                                        [This Month ▼] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │    12    │  │     8    │  │     5    │  │    85%   │        │
│  │  Voice   │  │ Insights │  │Summaries │  │  Parent  │        │
│  │  Notes   │  │ Applied  │  │   Sent   │  │View Rate │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  SENT TO PARENTS                                  [View All →]  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 👁 Emma Barlow - "Great improvement in tackling..."        │ │
│  │    Sent: 2 hours ago | Viewed by Emma's Mum | ✓ Ack        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  APPLIED TO PLAYER PROFILES                       [View All →]  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ⭐ Emma Barlow - Tackling: 3 → 4                           │ │
│  │    From: "Training session Jan 26" | Applied: 2 hours ago  │ │
│  │    [View in Passport →]                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  TEAM OBSERVATIONS                                [View All →]  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 👥 U14 Female - "Great team spirit at training"            │ │
│  │    From: "Training Jan 26" | Applied: Yesterday            │ │
│  │    [View in Team Insights →]                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Data Already Available (Section 20.6)

The data needed for "My Impact" **already exists:**

| Data | Source | Query Exists? |
|------|--------|---------------|
| Sent summaries | `coachParentSummaries` | ✅ `getAutoApprovedSummaries` (extend) |
| Parent view status | `coachParentSummaries.viewedAt` | ✅ Available |
| Applied insights | `voiceNoteInsights` (status=applied) | ⚠️ Need new query |
| Skill changes | `skillAssessments` (source=voice_note) | ⚠️ Need new query |
| Injury records | `playerInjuries` (source=voice_note) | ⚠️ Need new query |
| Team observations | `teamObservations` | ✅ `getOrganizationObservations` |

#### New Backend Query Needed (Section 20.6)

```typescript
export const getCoachImpactSummary = query({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
    dateRange: v.object({ start: v.number(), end: v.number() }),
  },
  returns: v.object({
    voiceNotesCreated: v.number(),
    insightsApplied: v.number(),
    insightsDismissed: v.number(),
    summariesSent: v.number(),
    summariesViewed: v.number(),
    summariesAcknowledged: v.number(),
    parentViewRate: v.number(),
    skillChanges: v.array(v.object({
      playerName: v.string(),
      skillName: v.string(),
      previousValue: v.optional(v.number()),
      newValue: v.number(),
      appliedAt: v.number(),
      voiceNoteId: v.id("voiceNotes"),
    })),
    injuriesRecorded: v.array(/* ... */),
    recentSummaries: v.array(/* ... */),
    teamObservations: v.array(/* ... */),
  }),
  handler: async (ctx, args) => {
    // Aggregate from:
    // - voiceNotes
    // - voiceNoteInsights
    // - coachParentSummaries
    // - skillAssessments
    // - playerInjuries
    // - teamObservations
  },
});
```

#### Implementation Options (Section 20.5)

**Option A: Extend Existing Tabs**
- Show "Sent to Parents" tab to ALL levels
- Add "Applied History" section to History tab
- Add summary stats to dashboard header

**Pros:** Minimal new code
**Cons:** Fragmented experience, no unified view

**Option B: New "My Impact" Tab** (⭐ **Recommended**)
- New `my-impact-tab.tsx` component
- New `getCoachImpactSummary` query
- Reuse existing summary/insight components

**Pros:** Single destination for all impact questions, clear value
**Cons:** New tab increases navigation (acceptable tradeoff)

#### Recommendations for P8

**P8 PRIMARY FOCUS (Critical Priority):**

1. **Show "Sent to Parents" Tab to Level 0-1 Coaches** (Week 1)
   - Remove trust level gate
   - Show all sent summaries for their org
   - Include parent view/acknowledge status
   - Immediate gap fix with minimal code

2. **Create `getCoachImpactSummary` Query** (Week 1-2)
   - Aggregate from multiple tables
   - Return structured data for dashboard
   - Include date range filtering

3. **Create "My Impact" Tab Component** (Week 2-3)
   - New tab visible to ALL coaches (Level 0+)
   - Summary cards (notes created, insights applied, summaries sent, parent view rate)
   - Recent sent summaries section
   - Applied insights section
   - Team observations section

4. **Add Clickable Navigation** (Week 3)
   - Insight card → Player Passport link
   - Applied skill → Passport skill section link
   - Applied injury → Injury record link
   - Team observation → Team Insights link
   - Summary → Parent summary detail

5. **Add Date Filtering** (Week 3)
   - This week / This month / All time
   - Store preference per coach

**Success Criteria:**
- Coaches can answer "What did I send to Emma's parent?" in < 10 seconds
- 100% of coaches can see their sent summary history (up from 0% for L0-1)
- Coach confidence in system improves (survey: 4.5/5 target)
- Support tickets about "where did it go" reduced by 80%

**Priority Assessment:** 🔴 **CRITICAL PRIORITY for P8.** This is a fundamental UX failure that undermines coach confidence in the system.

---

### Section 21: WhatsApp Integration

#### What's Implemented

✅ **Complete WhatsApp Integration**
- Twilio webhook handler (`POST /whatsapp/incoming`)
- Audio + text message processing
- Coach identification by phone number
- Multi-organization detection (8-step cascade)
- Audio download and storage
- Same AI pipeline as in-app (transcription + insights)
- Trust-based auto-apply
- WhatsApp reply to coach with results
- Session memory (2-hour timeout)
- Multi-org prompting with selection flow

#### Architecture Flow (Section 21.1)

```
Coach WhatsApp → Twilio Webhook → PlayerARC Backend
                                   ↓
                    Phone lookup → Coach identified
                                   ↓
                    Multi-org detection (8 steps)
                                   ↓
                    Audio download (if applicable)
                                   ↓
                    Create voice note (whatsapp_audio/text)
                                   ↓
                    AI Pipeline (transcribe → insights)
                                   ↓
                    Auto-apply (15-30 sec delay)
                                   ↓
                    WhatsApp reply with results
```

#### Multi-Org Detection Cascade (Section 21.3)

**8-Step Fallback Strategy:**

1. Single org check
2. Explicit mention ("@OrgName:", "for OrgName")
3. Team name match
4. Age group match (u12, u-12, under 12, twelves, senior)
5. Sport match (soccer, gaa, hurling, rugby)
6. Player name match
7. Coach name match (fellow coaches)
8. Session memory (2-hour timeout)
9. **Ask user** (if all fail)

#### WhatsApp Reply Format (Section 21.6)

```
✅ Analysis complete!

AUTO-APPLIED (3):
• Emma: Tackling 4/5
• Sarah: Attendance ✓
• U14: Team spirit → Parent notified

NEEDS REVIEW (2):
• Michael: Injury (sensitive)
• Equipment order: Task (no assignee)

UNMATCHED (1):
• "Tommy" not found in roster

📱 Review: https://app.playerarc.com/orgs/xxx/coach/voice-notes
```

#### Database Tables (Section 21.4)

```typescript
whatsappMessages: defineTable({
  messageSid: v.string(),
  fromNumber: v.string(),
  messageType: v.union("text", "audio", "image", "video"),
  body: v.optional(v.string()),
  mediaStorageId: v.optional(v.id("_storage")),
  coachId: v.optional(v.string()),
  organizationId: v.optional(v.string()),
  status: v.union("received", "processing", "completed", "failed"),
  voiceNoteId: v.optional(v.id("voiceNotes")),
  processingResults: v.optional(v.object({...})),
  receivedAt: v.number(),
})

whatsappSessions: defineTable({
  phoneNumber: v.string(),
  coachId: v.string(),
  organizationId: v.string(),
  resolvedVia: v.union("single_org", "explicit_mention", ...),
  lastMessageAt: v.number(),  // 2-hour timeout
})

whatsappPendingMessages: defineTable({
  messageSid: v.string(),
  phoneNumber: v.string(),
  availableOrgs: v.array(v.object({ id, name })),
  status: v.union("awaiting_selection", "resolved", "expired"),
  expiresAt: v.number(),  // 24 hours
})
```

#### Future: WhatsApp Coach Groups (Section 21.13)

**Detailed plan exists:** `docs/features/whatsapp-coach-groups.md`

**Planned Features:**
- **Meeting Mode:** Structured capture with "playerarc start/end meeting"
- **Passive Mode:** Automatic capture in time windows
- **Triggered Mode:** Capture on @playerarc mention
- **Multi-Speaker Attribution:** Track which coach said what
- **Collaborative Insights:** Combine multiple coaches' observations

**New Tables (Proposed):**
- `whatsappGroups` - Group chat configuration
- `whatsappGroupMessages` - Individual messages
- `whatsappMeetingSessions` - Meeting sessions

**Timeline:** 4-week implementation plan ready for future phase.

#### Insights Extracted

| Insight | Category | Priority |
|---------|----------|----------|
| "WhatsApp integration complete and working" | Status | ✅ Done |
| "Multi-org detection sophisticated (8-step cascade)" | Quality | ✅ Done |
| "Coach groups planned but not implemented" | Future Feature | 🟢 Low |
| "WhatsApp replies provide immediate feedback" | Coach Experience | ✅ Done |
| "Same trust system applies (safe vs sensitive)" | Consistency | ✅ Done |

#### Recommendations for P8/P9

**No Action Required:** WhatsApp integration is complete and working well.

**Post-P9 (Low Priority):**
- Implement WhatsApp coach groups (4-week project)
- Add image/video message processing
- Support for multiple Twilio numbers per org

**Priority Assessment:** Low priority for P8/P9. Feature is production-ready.

---

## Priority Matrix

### Priority Levels

| Symbol | Priority | Definition |
|--------|----------|------------|
| 🔴 | Critical | Fundamental UX failure blocking user success |
| 🟡 | High | Significant value add, improves core experience |
| 🟢 | Low | Nice-to-have enhancement for future phases |

### Features by Priority

#### 🔴 Critical Priority (P8 Focus)

| Feature | Section | User Pain Point | Effort |
|---------|---------|-----------------|--------|
| **Show "Sent to Parents" to Level 0-1** | 20 | "I can't see what I sent to parents" | Low |
| **"My Impact" Tab for All Coaches** | 20 | "I can't see results of my work" | Medium |
| **Clickable Links: Insight → Passport** | 17, 20 | "Where did this insight go?" | Low |
| **Applied Insights History** | 20 | "Did that skill rating actually apply?" | Medium |
| **Parent View/Acknowledge Status** | 20 | "Did parent see my message?" | Low |

**Total P8 Critical Scope:** ~3 weeks of focused development

#### 🟡 High Priority (P9 Focus)

| Feature | Section | User Value | Effort |
|---------|---------|------------|--------|
| **Team Collaboration Hub** | 19 | Unified team workspace | High |
| **Comments & @Mentions** | 19 | Discuss insights with teammates | Medium |
| **Activity Feed** | 19 | Real-time team activity visibility | Medium |
| **Multi-View Toggle** | 19 | List/Board/Calendar flexibility | Medium |
| **Session Templates** | 19 | Faster session prep | Medium |
| **Audio Playback** | 16 | Verify transcription accuracy | Low |
| **Tone Controls** | 18 | Personalize parent communication | Low |
| **Coach Learning Dashboard** | 17 | Learn from correction patterns | Medium |

**Total P9 High Priority Scope:** ~4 weeks of focused development

#### 🟢 Low Priority (Post-P9)

| Feature | Section | Value | Effort |
|---------|---------|-------|--------|
| **Admin Analytics Dashboard** | 15 | Visualize platform health | Medium |
| **Live Presence Indicators** | 19 | See who's online (Figma-style) | High |
| **Prompt Template System** | 18 | Database-driven prompts | Medium |
| **Audio Retention Policy** | 16 | GDPR compliance | Medium |
| **Waveform Visualization** | 16 | Recording feedback | Medium |
| **Coach Cost Awareness** | 15 | Show AI usage costs | Low |
| **WhatsApp Coach Groups** | 21 | Multi-coach collaboration | High |

---

## Phase 8 PRD Proposal

### Title: Coach Impact Visibility & Traceability

### Problem Statement

**Current State:**
Coaches at Trust Level 0-1 (manual review users) have **zero visibility** into the outcomes of their work:
- Cannot see what parent summaries they've sent
- Cannot track which insights were applied to player profiles
- Cannot verify data was correctly recorded
- Cannot measure their coaching productivity
- Cannot follow up on previous communications

**Paradox:** Coaches doing MORE work (manual review) get LESS feedback than automated users (Level 2+).

**User Quotes (Anticipated):**
> "I approved a summary for Emma's parent yesterday - what did it say? I can't remember and there's no way to check."

> "Did that skill rating actually get recorded? I have to manually navigate to Emma's passport to check. That takes forever."

> "I've been doing this for weeks and I have no idea if I'm making progress or if parents are even reading what I send."

### Goals

#### Primary Goals
1. **Give ALL coaches visibility into sent summaries** regardless of trust level
2. **Provide traceability from insight → player profile** with clickable navigation
3. **Show aggregate coaching impact** in a single dashboard view
4. **Enable coaches to answer key questions** about their work without manual hunting

#### Success Metrics
- 100% of coaches can see their sent summary history (up from ~30% Level 2+ only)
- Time to find sent summary: < 10 seconds (down from N/A)
- Support tickets about "where did it go": -80%
- Coach confidence in system: 4.5/5 survey rating
- Coach retention: +20% (hypothesis: visibility increases engagement)

### User Stories

#### US-001: Level 0-1 Coach Sees Sent Summaries
**As a** Level 0-1 coach
**I want to** see all parent summaries I've sent
**So that** I can follow up on previous communications and maintain continuity

**Acceptance Criteria:**
- "Sent to Parents" tab visible to Level 0-1 coaches
- Shows all sent summaries for their organization (not just their own initially, for data completeness)
- Includes parent view status (viewed/not viewed)
- Includes parent acknowledge status (acknowledged/not acknowledged)
- Shows date sent, player name, summary preview
- Clickable to view full summary detail

**Priority:** 🔴 Critical

---

#### US-002: Coach Sees Applied Insights
**As a** coach
**I want to** see which insights were applied to player profiles
**So that** I can verify my voice notes led to actual data updates

**Acceptance Criteria:**
- New "My Impact" tab shows "Applied to Player Profiles" section
- Lists recent applied insights with:
  - Player name
  - Change type (skill rating, injury, attendance, etc.)
  - Before/after values (if applicable)
  - Source voice note
  - Date applied
- Clickable link to player passport (specific section)
- Supports date filtering (this week, this month, all time)

**Priority:** 🔴 Critical

---

#### US-003: Coach Navigates Insight → Passport
**As a** coach
**I want to** click an insight card and jump directly to the player's passport
**So that** I can see the full context of what was applied

**Acceptance Criteria:**
- Every insight card with a matched player shows "View in Passport →" link
- Link navigates to `/orgs/[orgId]/players/[playerIdentityId]/passport`
- Deep link to specific section if possible:
  - Skill insight → Skills tab
  - Injury insight → Injury record detail
  - Attendance insight → Attendance tab
- Link opens in same tab (not new window)

**Priority:** 🔴 Critical

---

#### US-004: Coach Sees Aggregate Impact Summary
**As a** coach
**I want to** see a summary of my coaching activity
**So that** I can understand my productivity and impact at a glance

**Acceptance Criteria:**
- "My Impact" tab shows 4 summary cards:
  1. Voice notes created (count)
  2. Insights applied (count)
  3. Summaries sent (count)
  4. Parent view rate (percentage)
- Supports date filtering (this week, this month, all time)
- Default to "this month"
- Store date preference in coach settings

**Priority:** 🔴 Critical

---

#### US-005: Coach Filters Impact by Date Range
**As a** coach
**I want to** filter my impact dashboard by date range
**So that** I can see weekly, monthly, or all-time activity

**Acceptance Criteria:**
- Dropdown with options: "This week", "This month", "All time"
- Updates all sections (summary cards, sent summaries, applied insights)
- Preference saved per coach
- Date range displayed in UI ("Showing: Jan 1-27, 2026")

**Priority:** 🟡 High

---

#### US-006: Coach Sees Team Observations in Impact View
**As a** coach
**I want to** see team observations I've created
**So that** I can track team-level contributions

**Acceptance Criteria:**
- "My Impact" tab shows "Team Observations" section
- Lists recent team observations with:
  - Team name
  - Observation title/preview
  - Date applied
  - Source voice note
- Clickable link to Team Insights page
- Limited to most recent 5, with "View All" link

**Priority:** 🟡 Medium

---

#### US-007: Backlink from Passport to Voice Note
**As a** coach
**I want to** see where a passport entry came from
**So that** I can review the original voice note context

**Acceptance Criteria:**
- When viewing skill assessment with `source: "voice_note"`:
  - Show small badge "From voice note (Jan 26)"
  - Clickable link to voice note detail in History tab
- When viewing injury record with `source: "voice_note"`:
  - Show small badge "From voice note (Jan 26)"
  - Clickable link to voice note detail
- Link includes query param to highlight specific insight

**Priority:** 🟡 Medium

---

### Technical Implementation

#### Backend: New Query

**File:** `packages/backend/convex/models/voiceNotes.ts`

**New Query:** `getCoachImpactSummary`

```typescript
export const getCoachImpactSummary = query({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
    dateRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
  },
  returns: v.object({
    // Summary stats
    voiceNotesCreated: v.number(),
    insightsApplied: v.number(),
    insightsDismissed: v.number(),
    summariesSent: v.number(),
    summariesViewed: v.number(),
    summariesAcknowledged: v.number(),
    parentViewRate: v.number(),

    // Detail lists
    skillChanges: v.array(v.object({
      playerName: v.string(),
      playerIdentityId: v.id("playerIdentities"),
      skillName: v.string(),
      previousValue: v.optional(v.number()),
      newValue: v.number(),
      appliedAt: v.number(),
      voiceNoteId: v.id("voiceNotes"),
    })),

    injuriesRecorded: v.array(v.object({
      playerName: v.string(),
      playerIdentityId: v.id("playerIdentities"),
      type: v.string(),
      severity: v.string(),
      appliedAt: v.number(),
      voiceNoteId: v.id("voiceNotes"),
    })),

    recentSummaries: v.array(v.object({
      summaryId: v.id("coachParentSummaries"),
      playerName: v.string(),
      playerIdentityId: v.id("playerIdentities"),
      summaryPreview: v.string(),
      sentAt: v.number(),
      status: v.string(),
      viewedAt: v.optional(v.number()),
      acknowledgedAt: v.optional(v.number()),
    })),

    teamObservations: v.array(v.object({
      observationId: v.id("teamObservations"),
      teamName: v.string(),
      teamId: v.string(),
      title: v.string(),
      appliedAt: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    // Aggregate from multiple tables:
    // 1. voiceNotes (created count)
    // 2. voiceNoteInsights (applied/dismissed counts)
    // 3. coachParentSummaries (sent/viewed/ack counts)
    // 4. skillAssessments (source=voice_note)
    // 5. playerInjuries (source=voice_note)
    // 6. teamObservations

    // Calculate parent view rate
    // Return structured data
  },
});
```

**Complexity:** Medium (queries 6 tables, aggregates data)

---

#### Backend: Extend Existing Query

**File:** `packages/backend/convex/models/coachParentSummaries.ts`

**Extend:** `getAutoApprovedSummaries` or create new `getSentSummariesForCoach`

```typescript
export const getSentSummariesForCoach = query({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
    limit: v.optional(v.number()),  // Default: 30
  },
  returns: v.array(v.object({...})),
  handler: async (ctx, args) => {
    // Query coachParentSummaries
    // Filter by: coachId, organizationId, status=sent/viewed/acknowledged
    // Sort by sentAt desc
    // Include parent view/ack status
  },
});
```

**Complexity:** Low (extend existing pattern)

---

#### Frontend: New Component

**File:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/my-impact-tab.tsx`

**Component Structure:**

```tsx
export function MyImpactTab() {
  const [dateRange, setDateRange] = useState<"week" | "month" | "all">("month");

  // Query
  const impactData = useQuery(api.models.voiceNotes.getCoachImpactSummary, {
    coachId: user.id,
    organizationId: orgId,
    dateRange: getDateRangeForFilter(dateRange),
  });

  return (
    <div>
      {/* Date filter dropdown */}
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Voice Notes Created" value={impactData.voiceNotesCreated} />
        <StatCard label="Insights Applied" value={impactData.insightsApplied} />
        <StatCard label="Summaries Sent" value={impactData.summariesSent} />
        <StatCard label="Parent View Rate" value={`${impactData.parentViewRate}%`} />
      </div>

      {/* Sent summaries section */}
      <SentSummariesSection summaries={impactData.recentSummaries} />

      {/* Applied insights section */}
      <AppliedInsightsSection
        skills={impactData.skillChanges}
        injuries={impactData.injuriesRecorded}
      />

      {/* Team observations section */}
      <TeamObservationsSection observations={impactData.teamObservations} />
    </div>
  );
}
```

**Complexity:** Medium (new component, reuses existing card components)

---

#### Frontend: Remove Trust Level Gate

**File:** `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/sent-to-parents-tab.tsx`

**Change:**

```tsx
// OLD
if (coachTrustLevel < 2) {
  return <EmptyState message="Available at Trust Level 2+" />;
}

// NEW - Remove gate entirely
// Show for all coaches
```

**Complexity:** Trivial (delete 3 lines)

---

#### Frontend: Add Navigation Links

**Files:**
- `insight-card.tsx` (add "View in Passport" link)
- `applied-insights-section.tsx` (new component with links)
- `skill-assessment-display.tsx` (add backlink badge)
- `injury-record-display.tsx` (add backlink badge)

**Example:**

```tsx
// In insight card
{insight.playerName && (
  <Link
    href={`/orgs/${orgId}/players/${insight.playerIdentityId}/passport`}
    className="text-sm text-primary hover:underline"
  >
    View in {insight.playerName}'s Passport →
  </Link>
)}

// In passport skill display
{assessment.source === "voice_note" && (
  <Link
    href={`/orgs/${orgId}/coach/voice-notes?noteId=${assessment.voiceNoteId}`}
    className="text-xs text-muted-foreground hover:underline"
  >
    From voice note ({formatDate(assessment.createdAt)}) →
  </Link>
)}
```

**Complexity:** Low (add links to existing components)

---

### Timeline (P8 - 3 Weeks)

#### Week 1: Backend + Quick Wins
- **Day 1-2:** Create `getCoachImpactSummary` query
- **Day 3:** Extend/create `getSentSummariesForCoach` query
- **Day 4:** Remove trust level gate from "Sent to Parents" tab (deploy immediately)
- **Day 5:** Test backend queries, validate data accuracy

**Deliverable:** Level 0-1 coaches can see sent summaries (immediate impact)

---

#### Week 2: My Impact Tab
- **Day 1-2:** Create `my-impact-tab.tsx` component skeleton
- **Day 3:** Implement summary cards with date filtering
- **Day 4:** Implement sent summaries section (reuse existing components)
- **Day 5:** Implement applied insights section

**Deliverable:** "My Impact" tab functional with summary cards + sent summaries

---

#### Week 3: Navigation & Polish
- **Day 1:** Add "View in Passport" links to insight cards
- **Day 2:** Add backlinks from passport to voice notes
- **Day 3:** Implement team observations section
- **Day 4:** Add date filtering with preference storage
- **Day 5:** UAT testing, bug fixes, refinement

**Deliverable:** Complete P8 scope ready for production

---

### Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Query performance with 6 tables** | Slow dashboard load | Use indexes, limit results, add pagination |
| **Large orgs with 1000s of summaries** | Memory issues | Limit to most recent 100, paginate if needed |
| **Backlink implementation across multiple components** | Code complexity | Create shared `SourceBadge` component |
| **Date filtering edge cases (timezone)** | Incorrect counts | Use UTC timestamps, test with multiple timezones |

---

### Future Enhancements (Post-P8)

- Export impact report as PDF (coach portfolio)
- Compare with anonymous peer average ("You're in top 20%")
- Email digest: "Your weekly impact summary"
- Coach leaderboard (opt-in, gamification)
- Show AI accuracy metrics per coach

---

## Phase 9 PRD Proposal

### Title: Team Collaboration Hub & AI Personalization

### Problem Statement

**Current State:**
Team Insights features are fragmented across two locations (dashboard tab + separate page) and lack collaborative features found in modern workplace tools. Coaches working on the same team cannot:
- Discuss insights with each other
- React to observations
- Notify teammates with @mentions
- See real-time team activity
- Switch between different views (List/Board/Calendar)
- Use templates for common workflows

Additionally, AI tone and frequency controls are hardcoded, limiting personalization for different coaching styles and parent preferences.

**User Quotes (Anticipated):**
> "I see Coach Sarah added an insight about Emma, but I can't ask her a question about it. I have to text her separately."

> "I want to see all the insights on a calendar view so I can spot patterns by day of week."

> "The parent summaries are great but they're too verbose for my style. I'd prefer brief, professional updates."

### Goals

#### Primary Goals
1. **Unify Team Insights into single collaboration hub** with comments, reactions, activity feed
2. **Enable flexible viewing** with List/Board/Calendar/Player views
3. **Provide session templates** for common coaching workflows
4. **Allow tone/frequency personalization** for parent communication
5. **Surface audio playback** for transcription verification
6. **Show coach learning insights** from correction patterns

#### Success Metrics
- Team insight engagement: +200% (comments, reactions)
- Coach-to-coach @mentions: 50+ per week per org
- Session template usage: 40% of sessions
- Tone customization adoption: 60% of coaches
- Coach satisfaction with collaboration: 4.5/5 survey rating

### User Stories

#### US-008: Coach Comments on Insight
**As a** coach
**I want to** add a comment to another coach's insight
**So that** I can ask clarifying questions or build on observations

**Acceptance Criteria:**
- Every insight card shows comment count ("💬 2 comments")
- Click opens threaded discussion view
- Comment form with text input
- Comments show author name, timestamp
- Real-time updates when new comment added (Convex subscription)
- Comments persist in `insightComments` table

**Priority:** 🟡 High

---

#### US-009: Coach @Mentions Teammate
**As a** coach
**I want to** @mention a teammate in a comment
**So that** they receive a notification and can respond

**Acceptance Criteria:**
- Typing "@" in comment triggers coach autocomplete
- Autocomplete shows coaches from same team
- Mention renders as colored link (@Coach Sarah)
- Mentioned coach receives notification (in-app banner)
- Optional: Email notification if enabled in preferences

**Priority:** 🟡 High

---

#### US-010: Coach Sees Team Activity Feed
**As a** coach
**I want to** see a real-time feed of team activity
**So that** I stay updated without checking multiple tabs

**Acceptance Criteria:**
- New "Activity" section in Team Collaboration Hub
- Shows actor-verb-object format ("Neil applied injury insight to Sarah")
- Activity types: insight_created, insight_applied, task_created, comment_added
- Read/unread states (bold unread items)
- Filter by activity type
- Shows last 24 hours by default, "Load more" for older

**Priority:** 🟡 High

---

#### US-011: Coach Switches View Type
**As a** coach
**I want to** view insights as List, Board, Calendar, or by Player
**So that** I can see patterns and organize mentally

**Acceptance Criteria:**
- Toggle buttons: [List] [Board] [Calendar] [Players]
- **List view:** Current default, chronological
- **Board view:** Kanban columns (Pending | Applied | Follow-up)
- **Calendar view:** Insights plotted by date on calendar grid
- **Player view:** Grouped by player name, expandable sections
- View preference saved per coach per team

**Priority:** 🟡 High

---

#### US-012: Coach Uses Session Template
**As a** coach
**I want to** use a pre-built template for session planning
**So that** I save time and don't miss important steps

**Acceptance Criteria:**
- New "Planning" section in Team Hub
- Template library with 3 templates:
  1. Pre-Match Review
  2. Training Session
  3. Season Review
- Template includes checklist items, suggested focus areas
- AI suggestion: "3 players have injury notes - recommend Pre-Match Review"
- Create session plan from template with one click

**Priority:** 🟡 High

---

#### US-013: Coach Customizes Parent Summary Tone
**As a** coach
**I want to** choose warm, professional, or brief tone for parent summaries
**So that** my communication matches my coaching style

**Acceptance Criteria:**
- New "Communication Preferences" in Settings tab
- Dropdown: Warm / Professional / Brief
- Show example for each option
- Setting applies to all future summaries
- Stored in `coachOrgPreferences.parentSummaryPreferences.tone`

**Priority:** 🟡 Medium

---

#### US-014: Coach Listens to Original Recording
**As a** coach
**I want to** play back my original voice recording
**So that** I can verify transcription accuracy

**Acceptance Criteria:**
- Voice note detail view shows audio player if `audioStorageId` exists
- Player shows duration, play/pause, scrubbing
- "Download" button to save audio file locally
- Works for both app-recorded and WhatsApp audio

**Priority:** 🟡 Medium

---

#### US-015: Coach Sees Learning Insights
**As a** coach
**I want to** see my correction patterns and agreement rate
**So that** I can improve my voice note quality

**Acceptance Criteria:**
- New "Learning" section in Settings tab or My Impact tab
- Shows agreement rate (% of insights not corrected)
- Shows common correction patterns:
  - "Wrong player assigned (5x) - Try using full names"
  - "Wrong category (4x)"
- Tips based on patterns
- Compare with anonymous org average

**Priority:** 🟡 Medium

---

#### US-016: Coach Reacts to Insight
**As a** coach
**I want to** add a quick reaction (like, helpful, flag) to an insight
**So that** I can show support without writing a comment

**Acceptance Criteria:**
- Reaction buttons under insight card: 👍 Like, 🌟 Helpful, 🚩 Flag
- Click toggles reaction on/off
- Shows reaction count and who reacted ("👍 2 - You and Coach Sarah")
- Persists in `insightReactions` table

**Priority:** 🟢 Low

---

#### US-017: Coach Sets Communication Frequency
**As a** coach
**I want to** batch parent summaries into daily or weekly digests
**So that** I don't overwhelm parents with notifications

**Acceptance Criteria:**
- Communication preferences: Every insight / Daily digest / Weekly digest
- Daily digest: Batch summaries sent at 6 PM
- Weekly digest: Sent Sunday evening
- Show preview: "Parents will receive summaries daily at 6 PM"
- Stored in `coachOrgPreferences.parentCommunicationPreferences.frequency`

**Priority:** 🟢 Low

---

### Technical Implementation

#### Backend: New Tables

**File:** `packages/backend/convex/schema.ts`

```typescript
// Comments on insights
insightComments: defineTable({
  insightId: v.string(),
  voiceNoteId: v.id("voiceNotes"),
  teamId: v.optional(v.string()),
  userId: v.string(),
  userName: v.string(),
  userAvatarUrl: v.optional(v.string()),
  content: v.string(),
  mentions: v.array(v.object({
    userId: v.string(),
    userName: v.string(),
  })),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
.index("by_insight", ["insightId"])
.index("by_voice_note", ["voiceNoteId"])
.index("by_team", ["teamId"])
.index("by_user", ["userId"])
.index("by_created", ["createdAt"]),

// Reactions on insights
insightReactions: defineTable({
  insightId: v.string(),
  userId: v.string(),
  type: v.union(
    v.literal("like"),
    v.literal("helpful"),
    v.literal("flag")
  ),
  createdAt: v.number(),
})
.index("by_insight", ["insightId"])
.index("by_user_insight", ["userId", "insightId"]),

// Team activity feed
teamActivityFeed: defineTable({
  teamId: v.string(),
  organizationId: v.string(),
  activityType: v.union(
    v.literal("insight_created"),
    v.literal("insight_applied"),
    v.literal("insight_dismissed"),
    v.literal("comment_added"),
    v.literal("reaction_added"),
    v.literal("session_planned"),
    v.literal("task_created"),
    v.literal("task_completed")
  ),
  actorUserId: v.string(),
  actorName: v.string(),
  actorAvatarUrl: v.optional(v.string()),
  targetType: v.string(),  // "insight", "comment", "session", "task"
  targetId: v.string(),
  summary: v.string(),  // "Neil applied injury insight to Sarah"
  metadata: v.optional(v.any()),
  createdAt: v.number(),
})
.index("by_team", ["teamId"])
.index("by_org", ["organizationId"])
.index("by_created", ["createdAt"]),

// Session prep templates
sessionPrep: defineTable({
  teamId: v.string(),
  organizationId: v.string(),
  sessionDate: v.string(),
  sessionType: v.union(
    v.literal("training"),
    v.literal("match"),
    v.literal("review")
  ),
  createdBy: v.string(),
  createdByName: v.string(),
  objectives: v.array(v.string()),
  focusAreas: v.array(v.string()),
  equipmentNeeded: v.array(v.string()),
  playerNotes: v.array(v.object({
    playerIdentityId: v.id("playerIdentities"),
    playerName: v.string(),
    note: v.string(),
    addedBy: v.string(),
  })),
  status: v.union(
    v.literal("draft"),
    v.literal("shared"),
    v.literal("completed")
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
.index("by_team_date", ["teamId", "sessionDate"])
.index("by_team", ["teamId"])
.index("by_org", ["organizationId"]),
```

---

#### Backend: Extend coachOrgPreferences

**File:** `packages/backend/convex/schema.ts`

```typescript
coachOrgPreferences: defineTable({
  // ... existing fields

  // NEW: Parent communication preferences
  parentSummaryPreferences: v.optional(v.object({
    tone: v.union(
      v.literal("warm"),
      v.literal("professional"),
      v.literal("brief")
    ),
    verbosity: v.union(
      v.literal("concise"),
      v.literal("detailed")
    ),
    includeActionItems: v.boolean(),
    includeEncouragement: v.boolean(),
  })),

  parentCommunicationPreferences: v.optional(v.object({
    frequency: v.union(
      v.literal("every_insight"),
      v.literal("daily_digest"),
      v.literal("weekly_digest")
    ),
    digestTime: v.optional(v.string()),  // "18:00" for 6 PM
    minInsightsForDigest: v.number(),
    maxSummariesPerPlayerPerWeek: v.number(),
  })),

  // NEW: View preferences
  teamInsightsViewPreference: v.optional(v.object({
    viewType: v.union(
      v.literal("list"),
      v.literal("board"),
      v.literal("calendar"),
      v.literal("players")
    ),
    teamId: v.string(),
  })),
})
```

---

#### Backend: New Queries

**File:** `packages/backend/convex/models/teamCollaboration.ts` (new file)

```typescript
// Get comments for insight
export const getInsightComments = query({
  args: { insightId: v.string() },
  returns: v.array(v.object({...})),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("insightComments")
      .withIndex("by_insight", q => q.eq("insightId", args.insightId))
      .order("asc")
      .collect();
  },
});

// Add comment
export const addComment = mutation({
  args: {
    insightId: v.string(),
    content: v.string(),
    mentions: v.array(v.object({ userId: v.string(), userName: v.string() })),
  },
  returns: v.id("insightComments"),
  handler: async (ctx, args) => {
    // Insert comment
    // Create activity feed entry
    // Send notifications to mentioned users
  },
});

// Get team activity feed
export const getTeamActivityFeed = query({
  args: {
    teamId: v.string(),
    limit: v.optional(v.number()),  // Default: 50
  },
  returns: v.array(v.object({...})),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("teamActivityFeed")
      .withIndex("by_team", q => q.eq("teamId", args.teamId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

// Toggle reaction
export const toggleReaction = mutation({
  args: {
    insightId: v.string(),
    type: v.union(v.literal("like"), v.literal("helpful"), v.literal("flag")),
  },
  returns: v.string(),  // "added" | "removed"
  handler: async (ctx, args) => {
    // Check if reaction exists
    // If exists, delete (toggle off)
    // If not, create (toggle on)
    // Create activity feed entry if added
  },
});
```

---

#### Frontend: Unified Team Hub Component

**File:** `apps/web/src/app/orgs/[orgId]/coach/team-insights-hub/page.tsx` (new location)

```tsx
export default function TeamInsightsHubPage() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"insights" | "tasks" | "planning" | "activity">("insights");

  return (
    <div className="container mx-auto py-6">
      {/* Team selector */}
      <TeamSelector value={selectedTeam} onChange={setSelectedTeam} />

      {/* Tab navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="insights">Insights (12)</TabsTrigger>
          <TabsTrigger value="tasks">Tasks (5)</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <InsightsView teamId={selectedTeam} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksView teamId={selectedTeam} />
        </TabsContent>

        <TabsContent value="planning">
          <PlanningView teamId={selectedTeam} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityFeedView teamId={selectedTeam} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

#### Frontend: Multi-View Component

**File:** `apps/web/src/app/orgs/[orgId]/coach/team-insights-hub/components/insights-view.tsx`

```tsx
export function InsightsView({ teamId }: { teamId: string }) {
  const [viewType, setViewType] = useState<"list" | "board" | "calendar" | "players">("list");

  const insights = useQuery(api.models.teamInsights.getTeamInsights, { teamId });

  return (
    <div>
      {/* View type toggle */}
      <ViewTypeTabs value={viewType} onChange={setViewType} />

      {/* Conditional rendering */}
      {viewType === "list" && <InsightsListView insights={insights} />}
      {viewType === "board" && <InsightsBoardView insights={insights} />}
      {viewType === "calendar" && <InsightsCalendarView insights={insights} />}
      {viewType === "players" && <InsightsPlayerView insights={insights} />}
    </div>
  );
}
```

---

#### Frontend: Comments Component

**File:** `apps/web/src/app/orgs/[orgId]/coach/team-insights-hub/components/insight-comments.tsx`

```tsx
export function InsightComments({ insightId }: { insightId: string }) {
  const comments = useQuery(api.models.teamCollaboration.getInsightComments, { insightId });
  const addComment = useMutation(api.models.teamCollaboration.addComment);

  const [commentText, setCommentText] = useState("");
  const [mentions, setMentions] = useState<Array<{ userId: string, userName: string }>>([]);

  // @mention autocomplete logic
  const handleAtMention = () => {
    // Trigger coach search
    // Add to mentions array
  };

  const handleSubmit = async () => {
    await addComment({
      insightId,
      content: commentText,
      mentions,
    });
    setCommentText("");
    setMentions([]);
  };

  return (
    <div className="space-y-4">
      {/* Comment list */}
      {comments?.map(comment => (
        <CommentCard key={comment._id} comment={comment} />
      ))}

      {/* Comment form */}
      <CommentForm
        value={commentText}
        onChange={setCommentText}
        onSubmit={handleSubmit}
        onMention={handleAtMention}
      />
    </div>
  );
}
```

---

### Timeline (P9 - 4 Weeks)

#### Week 1: Collaboration Foundations
- **Day 1-2:** Create database tables (comments, reactions, activity feed)
- **Day 2-3:** Implement `addComment`, `toggleReaction`, `getTeamActivityFeed` mutations/queries
- **Day 4:** Create unified Team Hub page structure
- **Day 5:** Implement comments UI component

**Deliverable:** Coaches can comment on insights

---

#### Week 2: Activity Feed & @Mentions
- **Day 1-2:** Implement activity feed view component
- **Day 3:** Add @mention autocomplete in comment form
- **Day 4:** Create notification system for mentions
- **Day 5:** Implement reactions UI (like, helpful, flag)

**Deliverable:** Team activity feed visible, @mentions working

---

#### Week 3: Multi-View & Templates
- **Day 1:** Implement List view (existing, migrate)
- **Day 2:** Implement Board view (Kanban columns)
- **Day 3:** Implement Calendar view
- **Day 4:** Implement Player view (grouped)
- **Day 5:** Create session template library with 3 templates

**Deliverable:** Multi-view toggle working, templates available

---

#### Week 4: Personalization & Polish
- **Day 1:** Add tone controls to Settings tab
- **Day 2:** Extend parent summary generation with tone parameter
- **Day 3:** Add audio playback to voice note detail view
- **Day 4:** Create coach learning dashboard (correction patterns)
- **Day 5:** UAT testing, bug fixes, refinement

**Deliverable:** Complete P9 scope ready for production

---

### Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Real-time updates performance** | Slow UI with many coaches | Use Convex subscriptions efficiently, debounce updates |
| **@mention autocomplete complexity** | Poor UX if slow | Pre-fetch coach list, client-side filtering |
| **Calendar view with 100s of insights** | Cluttered UI | Limit to current month, use dots for multiple per day |
| **Board view drag-and-drop** | Complex state management | Use library (dnd-kit), keep status in DB |
| **Template customization** | Requires UI builder | Start with fixed templates, allow edit in future |

---

### Future Enhancements (Post-P9)

- Live presence indicators (Figma-style cursors)
- Shared task management with dependencies
- Session prep collaboration (multiple coaches edit)
- Block-based drag & drop layout (Notion-style)
- Voice note transcription editing (correct errors)
- AI prompt customization per org/coach
- WhatsApp coach groups (4-week project)

---

## Implementation Sequencing Recommendations

### Why P8 Before P9?

1. **User Trust:** Coaches need confidence in system (visibility) before investing in collaboration
2. **Foundation:** "My Impact" establishes pattern for showing coach activity, extended in P9
3. **Quick Win:** P8 fixes critical gap faster (3 weeks vs 4 weeks)
4. **Dependency:** Some P9 features (activity feed) benefit from having "My Impact" data available

### Suggested Roadmap

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOICE NOTES ROADMAP                           │
└─────────────────────────────────────────────────────────────────┘

PHASE 8 (3 weeks) - Jan 27 to Feb 14, 2026
─────────────────────────────────────────
FOCUS: Coach Impact Visibility
• Remove trust level gate from "Sent to Parents"
• Create "My Impact" tab for all coaches
• Add clickable navigation (insight → passport)
• Show applied insights history
• Show parent view/acknowledge status

CRITICAL GAP FIXED: Level 0-1 coaches can see results of their work

PHASE 9 (4 weeks) - Feb 17 to Mar 14, 2026
─────────────────────────────────────────
FOCUS: Team Collaboration Hub
• Merge Team Insights into unified hub
• Add comments & @mentions
• Add reactions (like, helpful, flag)
• Add activity feed
• Add multi-view toggle (List/Board/Calendar/Players)
• Add session templates
• Add tone/frequency controls
• Add audio playback
• Add coach learning insights

MAJOR UPGRADE: Transform from note-taking to collaboration platform

POST-P9 (Future Phases)
───────────────────────
• Admin analytics dashboard (visualization)
• Live presence indicators
• Prompt template system
• WhatsApp coach groups
• Video/image processing in voice notes
```

---

## Appendix A: Quick Reference Tables

### Features by Section

| Section | Feature Category | P8 Features | P9 Features | Future Features |
|---------|-----------------|-------------|-------------|-----------------|
| 15 | Admin Analytics | - | - | Admin dashboard, cost visualization |
| 16 | Audio Features | - | Audio playback | Waveform, retention policy |
| 17 | Coach Learning | Clickable links | Learning dashboard | Vocabulary learning, auto-prompt tuning |
| 18 | AI Personalization | - | Tone controls, frequency | Prompt templates, sport packs |
| 19 | Collaboration | - | Hub, comments, views, templates | Live presence, shared tasks |
| 20 | Impact Visibility | My Impact tab, sent history | - | Export reports, benchmarking |
| 21 | WhatsApp | - | - | Coach groups |

---

### Backend Work Summary

#### P8 Backend (Week 1)
- [ ] Create `getCoachImpactSummary` query (6 table aggregation)
- [ ] Extend `getSentSummariesForCoach` query
- [ ] Test query performance with large datasets
- [ ] Add indexes if needed

#### P9 Backend (Week 1-2)
- [ ] Create 4 new tables (comments, reactions, activity, sessions)
- [ ] Create `addComment` mutation
- [ ] Create `toggleReaction` mutation
- [ ] Create `getTeamActivityFeed` query
- [ ] Create `getInsightComments` query
- [ ] Extend `coachOrgPreferences` schema
- [ ] Test real-time subscriptions performance

---

### Frontend Work Summary

#### P8 Frontend (Week 2-3)
- [ ] Create `my-impact-tab.tsx` component
- [ ] Create `sent-summaries-section.tsx` component
- [ ] Create `applied-insights-section.tsx` component
- [ ] Add navigation links to insight cards
- [ ] Add backlink badges to passport displays
- [ ] Remove trust level gate from Sent to Parents tab
- [ ] Add date filtering with preference storage

#### P9 Frontend (Week 1-4)
- [ ] Create unified Team Hub page
- [ ] Create `insights-view.tsx` with multi-view
- [ ] Create `insights-board-view.tsx` (Kanban)
- [ ] Create `insights-calendar-view.tsx`
- [ ] Create `insights-player-view.tsx`
- [ ] Create `insight-comments.tsx` component
- [ ] Create `activity-feed-view.tsx` component
- [ ] Create `session-templates.tsx` component
- [ ] Add tone controls to Settings tab
- [ ] Add audio player to voice note detail
- [ ] Create coach learning dashboard

---

## Appendix B: Data Sources

All insights extracted from:

**File:** `/Users/neil/Documents/GitHub/PDP/docs/technical/VOICE_NOTES_TECHNICAL_OVERVIEW.md`
**Lines:** 2544-4651
**Sections:** 15-21
**Total Content:** ~2,100 lines of technical documentation

### Section Breakdown

- **Section 15 (Lines 2544-2800):** Admin Observability & Platform Analytics
- **Section 16 (Lines 2800-3100):** Audio Storage Architecture
- **Section 17 (Lines 3100-3400):** Coach Learning & Feedback Loop
- **Section 18 (Lines 3400-3700):** Prompt Flexibility & Tone Controls
- **Section 19 (Lines 3700-4000):** Team Insights Collaboration Hub
- **Section 20 (Lines 4000-4300):** Coach Impact Visibility Gap
- **Section 21 (Lines 4300-4651):** WhatsApp Integration

---

## Document Control

**Version:** 1.0
**Created:** January 27, 2026
**Last Updated:** January 27, 2026
**Next Review:** After P8 completion (estimated Feb 14, 2026)

**Approval Status:**
- [ ] Technical Review (Backend Lead)
- [ ] Product Review (Product Manager)
- [ ] Design Review (UX Designer)
- [ ] Executive Approval (CTO/CEO)

---

*This document is a living specification. Updates will be versioned and tracked in git history.*
