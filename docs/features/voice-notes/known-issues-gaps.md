# Voice Notes Known Issues & Gaps

**Created:** 2026-03-13
**Source:** [Comprehensive Audit](../../audit/voice-insights-comprehensive-audit.md)

---

## Active Bugs

### #624 — Parent Queue Broken (CRITICAL)

| Field | Detail |
|-------|--------|
| **Symptom** | Voice insights not reaching parent approval queue. Injuries auto-applied without coach review even at trust level 0. |
| **Root Cause** | The `processVoiceNoteInsight` action (actions/coachParentSummaries.ts:608) may not trigger after insight status change, OR sensitivity classification fails silently, OR auto-apply bypasses trust level gates. |
| **Affected Code** | `actions/coachParentSummaries.ts` (processVoiceNoteInsight), `actions/whatsapp.ts` (checkAndAutoApply), `models/coachTrustLevels.ts`, `models/coachParentSummaries.ts` |
| **Severity** | Critical - core parent communication workflow completely broken |
| **Fix Complexity** | Medium - needs debugging of trigger chain between insight apply and summary generation |

---

### #592 — iOS Microsite Screen Lock (HIGH)

| Field | Detail |
|-------|--------|
| **Symptom** | Floating approval window locks entire screen on iOS devices |
| **Root Cause** | CSS/JS issue with modal overlay on iOS Safari. Likely `position: fixed` + `overflow: hidden` on body causing iOS viewport lock |
| **Affected Code** | Review microsite frontend (WhatsApp review link pages) |
| **Severity** | High - mobile approval workflow completely broken on iPhones |
| **Fix Complexity** | Low - CSS fix for iOS Safari viewport handling |

---

### #618 — Apply Without Player Assignment (MEDIUM)

| Field | Detail |
|-------|--------|
| **Symptom** | "Apply" button clickable on insights with no player assigned. Creates zombie data. |
| **Root Cause** | `applyInsightFromReview` in `whatsappReviewLinks.ts:725` doesn't check for `playerIdentityId` before allowing apply |
| **Affected Code** | `models/whatsappReviewLinks.ts` (applyInsightFromReview) |
| **Severity** | Medium - creates "applied" insights with no player association |
| **Fix Complexity** | Low - add guard: `if (!insight.playerIdentityId) throw new Error(...)` |

---

### #634 — Duplicate Insight Detection (HIGH)

| Field | Detail |
|-------|--------|
| **Symptom** | Same injury/skill recorded repeatedly from multiple voice notes |
| **Root Cause** | No deduplication check in insight extraction pipeline. `buildInsights` and `extractClaims` don't check existing insights for same player + category + recent timeframe |
| **Affected Code** | `actions/voiceNotes.ts` (buildInsights), `actions/claimsExtraction.ts` (extractClaims), `lib/duplicateDetection.ts` (only handles WhatsApp message dedup, NOT insight dedup) |
| **Severity** | High - inflated data, confused coaches, incorrect "My Impact" numbers |
| **Fix Complexity** | Medium - need to query existing insights during extraction and skip/merge duplicates |

---

### #616 — Ghost Players (MEDIUM)

| Field | Detail |
|-------|--------|
| **Symptom** | Insights created for players not on any roster (e.g., "Chloe" when no Chloe exists) |
| **Root Cause** | `buildInsights` allows `playerId: null`. Player matching (`findMatchingPlayer`) fails gracefully. Schema allows optional `playerIdentityId`. |
| **Affected Code** | `actions/voiceNotes.ts` (buildInsights), `models/voiceNotes.ts` (findMatchingPlayer), `lib/stringMatching.ts`, `lib/playerMatching.ts` |
| **Severity** | Medium - phantom data in coach dashboards |
| **Fix Complexity** | Medium - partial fix shipped (#612: amber badge + roster injection in STT prompt) |

---

### #614 — Coach Matching Failing (MEDIUM)

| Field | Detail |
|-------|--------|
| **Symptom** | Voice notes mentioning fellow coaches can't resolve them. Microsite doesn't list coaches as assignment targets. |
| **Root Cause** | Entity resolution only searches player roster, not coach roster. Assignment UI only shows players. |
| **Affected Code** | `voiceNoteEntityResolutions.ts` (resolveEntity), assignment dialogs in insights-tab.tsx |
| **Severity** | Medium - limits coach-to-coach task delegation |
| **Fix Complexity** | Medium - extend entity resolution to include coach roster. Partial fix: #615 Layer 1 includes co-coach names in transcription prompt |

---

## Priority Order

1. **#624** (Critical) - Parent queue broken -> core workflow
2. **#592** (High) - iOS lock -> mobile users blocked
3. **#634** (High) - Duplicate insights -> data quality
4. **#618** (Medium) - Apply without assignment -> zombie data
5. **#616** (Medium) - Ghost players -> phantom data
6. **#614** (Medium) - Coach matching -> feature gap

---

## Feature Gaps

### Type-Specific Application Gap

When a coach clicks "Apply", only 5 of 16 categories write to domain tables:

| Working | Not Working |
|---------|------------|
| injury -> playerInjuries | wellbeing - status only |
| skill_rating -> skillAssessments | behavior - status only |
| skill_progress -> skillAssessments/passportGoals | attendance - status only |
| team_culture -> teamObservations | fitness - status only |
| todo -> coachTasks | nutrition, sleep, recovery, attitude, coach_note, general_observation, parent_communication - all status only |

**Impact:** "Applied" status is misleading for 11 categories -- coaches think data is recorded but it's only acknowledged.

### Duplicate Insight Detection

No mechanism to detect when the same insight (same player + category + similar description) is extracted from multiple voice notes. Leads to inflated counts and confused coaches.

### Coach Entity Resolution

Entity resolution only matches against player roster. Coaches mentioned in voice notes (e.g., "Tell Coach Sarah to...") cannot be resolved to coach entities. Limits todo delegation.

---

## Duplication Inventory

### updateInsightStatus Callers (5 components)

| Component | File | Context |
|-----------|------|---------|
| InsightsTab | `coach/voice-notes/components/insights-tab.tsx` | Main insight review (Apply/Dismiss) |
| TeamInsightsTab | `coach/voice-notes/components/team-insights-tab.tsx` | Team insights (Apply to Profile/Dismiss) |
| SwipeableInsightCard | `coach/voice-notes/components/swipeable-insight-card.tsx` | Mobile swipe gestures |
| BoardInsightCard | `coach/voice-notes/components/board-insight-card.tsx` | Kanban board view |
| review-tab.tsx | `coach/voice-notes/components/review-tab.tsx` | **DELETED** - was legacy dead code |

**No shared hook exists.** Each component implements its own handler with error handling and toast notifications.

### approveSummary/suppressSummary Callers (3 components)

| Component | File | Context |
|-----------|------|---------|
| SummaryApprovalCard | `coach/voice-notes/components/summary-approval-card.tsx` | Normal summaries |
| BehaviorApprovalCard | `coach/voice-notes/components/behavior-approval-card.tsx` | Behavior-sensitive summaries |
| ParentsTab | `coach/voice-notes/components/parents-tab.tsx` | Passes mutations to cards |

`InjuryApprovalCard` uses `approveInjurySummary` (different mutation with checklist).

### Trust Level Query Variants (3 functions)

| Function | File | Purpose |
|----------|------|---------|
| `getCoachTrustLevel` | `models/coachTrustLevels.ts` | Public query - returns full trust data |
| `getCoachPlatformTrustLevel` | `models/coachTrustLevels.ts` | Platform-wide trust (cross-org) |
| `getCoachTrustLevelInternal` | `models/coachTrustLevels.ts` | Internal query - skips auth checks |

### Confidence Score Fields (5 locations)

| Field | Table | Purpose |
|-------|-------|---------|
| `confidenceScore` | voiceNoteInsights | AI extraction confidence |
| `confidenceThreshold` | coachTrustLevels | Minimum threshold for auto-apply |
| `personalizedThreshold` | coachTrustLevels | Adjusted threshold per coach |
| `aiConfidence` | insightDrafts | v2 AI confidence |
| `overallConfidence` | insightDrafts | Combined confidence score |

No unified confidence model exists. Each score is calculated independently.

### Team Insight Display (3 locations)

| Location | File | UI |
|----------|------|----|
| Voice Dashboard TeamInsightsTab | `coach/voice-notes/components/team-insights-tab.tsx` | Tab in voice dashboard |
| Team Hub Insights | `coach/team-hub/components/insights-tab.tsx` | Team hub page |
| Team Insights Page | `coach/team-insights/page.tsx` | Standalone page |

Each renders team insights with different UIs, filters, and actions.

---

## My Impact Data Gaps

- `getCoachImpactSummary` does NOT query `autoAppliedInsights` table -- auto-applied counts missing from totals
- Because 11 categories don't write to domain tables, "applied" counts don't reflect actual data changes
- Parent view rate depends on `coachParentSummaries.viewedAt` which requires parent to open the summary
- CSV export should include both manual and auto-applied insights but may only include manual

---

## Dead Code Removed

| Item | Status | Notes |
|------|--------|-------|
| `voice-insights-section.tsx` | **DELETED** (US-VR-005) | 387 lines, replaced by `-improved` variant |
| `review-tab.tsx` | **DELETED** (US-VR-006) | 355 lines, imported nowhere, duplicated ParentsTab + InsightsTab functionality |
