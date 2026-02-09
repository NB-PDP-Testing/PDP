# ADR-VN2-024: Auto-Confirm Threshold and Trust Gating

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 6 (Drafts & Confirmation Workflow)
**Story**: US-VN-019

## Context and Problem Statement

The PRD specifies auto-confirm when `overallConfidence >= 0.85 AND trustLevel >= 2`. We need to validate these thresholds and define the interaction with existing trust infrastructure.

## Analysis

### Trust Level Semantics (Existing)

From `coachTrustLevels` schema and `trustLevelCalculator.ts`:
- Level 0 (New): Manual review required -- < 10 approvals
- Level 1 (Learning): Quick review with AI suggestions -- 10+ approvals
- Level 2 (Trusted): Auto-approve normal, review sensitive -- 50+ approvals, < 10% suppression
- Level 3 (Expert): Full automation with opt-in -- 200+ approvals

### Existing Fields in coachTrustLevels

The schema already has:
- `insightConfidenceThreshold: v.optional(v.number())` -- personalized threshold, default 0.7
- `insightAutoApplyPreferences: v.optional(v.object({ skills, attendance, goals, performance }))` -- per-category toggle
- `insightPreviewModeStats` -- tracking agreement rates

### PRD Proposal: `overallConfidence >= 0.85 AND trustLevel >= 2`

**Analysis of the 0.85 threshold**:
- Higher than the existing `insightConfidenceThreshold` default of 0.7
- This is correct because the v2 pipeline's overallConfidence is a product of TWO signals (see ADR-VN2-023), so 0.85 overall represents both signals being individually very high

**Analysis of `trustLevel >= 2`**:
- Level 2 requires 50+ approved summaries and < 10% suppression rate
- This is a reasonable bar -- the coach has demonstrated good judgment over time
- New coaches (level 0-1) always get manual confirmation, which is the safe default

### Edge Cases

1. **Coach at level 2 with custom `insightConfidenceThreshold = 0.9`**: The personalized threshold should take precedence over the hardcoded 0.85. If a coach wants stricter auto-apply, we should respect that.

2. **Coach at level 2 with `insightAutoApplyPreferences.skills = false`**: Even if confidence is high, the coach has opted out of auto-applying skill insights. We should respect per-category preferences.

3. **Injury/medical insights**: The existing design says "injury and medical always excluded (never auto-apply)". This must be enforced regardless of trust level.

4. **Coach at level 3 with `preferredLevel = 1`**: The effective level is `min(currentLevel, preferredLevel) = 1`, which is below 2, so no auto-confirm.

## Decision

### Auto-Confirm Gate Logic

```typescript
function shouldAutoConfirm(
  overallConfidence: number,
  trustLevel: { currentLevel: number; preferredLevel?: number },
  insightType: string,
  coachPreferences: {
    insightConfidenceThreshold?: number;
    insightAutoApplyPreferences?: { skills: boolean; attendance: boolean; goals: boolean; performance: boolean };
  }
): boolean {
  // 1. Effective trust level (respect preferredLevel cap)
  const effectiveLevel = Math.min(
    trustLevel.currentLevel,
    trustLevel.preferredLevel ?? trustLevel.currentLevel
  );
  if (effectiveLevel < 2) return false;

  // 2. Never auto-confirm injury or medical
  const NEVER_AUTO_CONFIRM = ["injury", "wellbeing", "recovery"];
  if (NEVER_AUTO_CONFIRM.includes(insightType)) return false;

  // 3. Respect per-category preferences
  const categoryMap: Record<string, keyof typeof coachPreferences.insightAutoApplyPreferences> = {
    skill_rating: "skills",
    skill_progress: "skills",
    attendance: "attendance",
    development_milestone: "goals",
    performance: "performance",
  };
  const prefKey = categoryMap[insightType];
  if (prefKey && coachPreferences.insightAutoApplyPreferences) {
    if (!coachPreferences.insightAutoApplyPreferences[prefKey]) return false;
  }

  // 4. Use personalized threshold if set, otherwise default 0.85
  const threshold = coachPreferences.insightConfidenceThreshold ?? 0.85;
  return overallConfidence >= threshold;
}
```

### Key Rules

1. **Effective trust level** = `min(currentLevel, preferredLevel ?? currentLevel)`. Must be >= 2.
2. **Never auto-confirm**: injury, wellbeing, recovery (sensitive topics).
3. **Respect category preferences**: If coach has disabled auto-apply for a category, skip.
4. **Use personalized threshold**: `insightConfidenceThreshold` from coachTrustLevels if set, otherwise 0.85.
5. **Default for new coaches**: All drafts require manual confirmation (trust level 0).

### insightType to Topic Mapping

The `insightDrafts.insightType` maps from `voiceNoteClaims.topic`:

| Claim Topic | Draft insightType | Auto-Confirm? |
|-------------|------------------|---------------|
| injury | injury | NEVER |
| wellbeing | wellbeing | NEVER |
| recovery | recovery | NEVER |
| skill_rating | skill_rating | If skills=true |
| skill_progress | skill_progress | If skills=true |
| performance | performance | If performance=true |
| attendance | attendance | If attendance=true |
| development_milestone | development_milestone | If goals=true |
| behavior | behavior | Yes (if threshold met) |
| physical_development | physical_development | Yes (if threshold met) |
| parent_communication | note | Yes (if threshold met) |
| tactical | note | Yes (if threshold met) |
| team_culture | note | Yes (if threshold met) |
| todo | note | Yes (if threshold met) |
| session_plan | note | Yes (if threshold met) |

## Consequences

**Positive**: Leverages existing trust infrastructure. Respects coach preferences. Safety-first for sensitive topics.
**Negative**: Slightly more complex than the PRD's simple `>= 0.85 AND >= 2` check, but necessary for correctness and safety. The additional checks are all O(1) field reads.
