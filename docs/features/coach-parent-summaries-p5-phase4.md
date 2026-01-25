# P5 Phase 4 (Learning Loop)

> Auto-generated documentation - Last updated: 2026-01-25 00:44

## Status

- **Branch**: `ralph/coach-parent-summaries-p5-phase4`
- **Progress**: 5 / 5 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-016: Add override tracking fields to coachParentSummaries

As a coach, the system learns from my override decisions.

**Acceptance Criteria:**
- Edit packages/backend/convex/schema.ts
- Add overrideType to coachParentSummaries table:
-   v.optional(v.union(
-     v.literal('coach_approved_low_confidence'),
-     v.literal('coach_rejected_high_confidence'),
-     v.literal('coach_edited'),
-     v.literal('coach_revoked_auto')
-   ))
- Add overrideReason: v.optional(v.string())
- Add overrideFeedback: v.optional(v.object({
-   wasInaccurate: v.boolean(),
-   wasTooSensitive: v.boolean(),
-   timingWasWrong: v.boolean(),
-   otherReason: v.optional(v.string())
- }))
- Run: npx -w packages/backend convex codegen
- Typecheck passes: npm run check-types

### US-017: Capture override data in suppressSummary mutation

As a coach, suppressing a summary gives feedback to improve AI.

**Acceptance Criteria:**
- Edit packages/backend/convex/models/coachParentSummaries.ts
- Find suppressSummary mutation
- Add optional args: reason (v.optional(v.string())), feedback (v.optional(v.object({...})))
- Determine overrideType logic:
-   if (confidenceScore >= 0.7) overrideType = 'coach_rejected_high_confidence'
-   else overrideType = null (suppressing low confidence is normal)
- Store overrideType, overrideReason, overrideFeedback in summary record via ctx.db.patch
- Update mutation returns validator
- Typecheck passes: npm run check-types

### US-018: Add optional feedback UI for suppression

As a coach, I can optionally explain why I suppressed a summary.

**Acceptance Criteria:**
- Edit apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/summary-approval-card.tsx
- Import Dialog, DialogContent, DialogHeader, DialogFooter from '@/components/ui/dialog'
- Import Checkbox from '@/components/ui/checkbox'
- Import Textarea from '@/components/ui/textarea'
- On suppress button click: show dialog with feedback form
- Dialog content:
-   - Checkbox: 'Summary was inaccurate'
-   - Checkbox: 'Too sensitive for parent to see'
-   - Checkbox: 'Timing not right'
-   - Textarea: 'Other reason' (optional)
- Dialog buttons:
-   - 'Skip' (default, closes dialog and suppresses without feedback)
-   - 'Suppress & Send Feedback' (calls suppressSummary with feedback)
- Keep it quick - feedback is optional help, not required
- Typecheck passes: npm run check-types

### US-019: Create getCoachOverridePatterns analytics query

As a platform admin, I see override analytics to understand AI performance.

**Acceptance Criteria:**
- Create packages/backend/convex/models/coachOverrideAnalytics.ts
- Add query getCoachOverridePatterns with args:
-   coachId: v.optional(v.string()) - for per-coach analytics
-   organizationId: v.optional(v.id('organization')) - for per-org analytics
- Query coachParentSummaries with index by_organizationId or by_coachId
- Filter for records where overrideType is not null
- Calculate aggregates:
-   - totalOverrides: count of all overrides
-   - byType: breakdown by overrideType (approved_low, rejected_high, revoked, edited)
-   - avgConfidenceWhenRejected: average confidenceScore for rejected_high_confidence
-   - commonFeedbackReasons: counts of feedback categories
-   - overrideRateByCategory: percentage by sensitivityCategory
- Returns validator: v.object({ totalOverrides: v.number(), byType: v.any(), patterns: v.any() })
- Typecheck passes: npm run check-types

### US-020: Implement adaptive confidence thresholds per coach

As a coach, my confidence threshold adapts based on my approval patterns.

**Acceptance Criteria:**
- Edit packages/backend/convex/lib/autoApprovalDecision.ts
- Add calculatePersonalizedThreshold function with args:
-   - coachOverrideHistory (from getCoachOverridePatterns)
-   - defaultThreshold (0.7)
- Logic:
-   - Count approvals of low confidence (60-70% range)
-   - Count rejections of high confidence (80%+ range)
-   - If >50% approval rate for 60-70% confidence: lower threshold by 5% (coach is trusting)
-   - If >20% rejection rate for 80%+ confidence: raise threshold by 5% (coach is conservative)
-   - Cap adjustments: minimum 0.6, maximum 0.85 (safety bounds)
- Add personalizedThreshold field to coachTrustLevels schema: v.optional(v.number())
- Create adjustPersonalizedThresholds scheduled function in packages/backend/convex/crons.ts:
-   - Runs weekly (every Sunday at 2 AM)
-   - For each active coach with >20 override decisions
-   - Calculate new personalized threshold
-   - Update coachTrustLevels record
- Use personalizedThreshold in autoApprovalDecision if it exists (fallback to confidenceThreshold or 0.7)
- Typecheck passes: npm run check-types


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Schema changes for Convex require running codegen immediately after editing schema.ts
- Pre-existing lint errors exist in the codebase (1350+ warnings), but pre-commit hooks only check staged files
- Override tracking fields are all optional to allow gradual rollout and backward compatibility
- Schema.ts file is very large (32k+ tokens), need to use grep/search or offset/limit when reading
- The coachParentSummaries table already had extensive Phase 2 and Phase 3 fields (auto-approval, revocation tracking)
- Pre-commit hooks run biome with --diagnostic-level=error, so only errors block commits, not warnings
--
- The suppressSummary mutation already had preview mode stats tracking - added override tracking alongside it
- Args validators use v.optional() for optional parameters
- The 70% confidence threshold (0.7) is consistent with the auto-approval threshold used elsewhere in the codebase

**Gotchas encountered:**
- Schema.ts file is very large (32k+ tokens), need to use grep/search or offset/limit when reading
- The coachParentSummaries table already had extensive Phase 2 and Phase 3 fields (auto-approval, revocation tracking)
- Pre-commit hooks run biome with --diagnostic-level=error, so only errors block commits, not warnings
- These schema fields will be populated by suppressSummary mutation (US-017)
- These fields will be read by getCoachOverridePatterns query (US-019)
- The overrideType values align with the learning logic needed for adaptive thresholds (US-020)
--
- Must read file before editing (got error on first attempt)
- The mutation already called updateTrustMetrics - no need to modify that flow
- The overrideType value 'coach_rejected_high_confidence' matches the schema union types from US-016

### Files Changed

- packages/backend/convex/schema.ts (+20 lines)
- ✅ Type check: passed (npm run check-types)
- ✅ Codegen: passed (npx -w packages/backend convex codegen)
- ✅ Pre-commit hooks: passed (lint-staged with biome)
- ✅ No browser verification needed (backend schema change only)
- Schema changes for Convex require running codegen immediately after editing schema.ts
- Pre-existing lint errors exist in the codebase (1350+ warnings), but pre-commit hooks only check staged files
- Override tracking fields are all optional to allow gradual rollout and backward compatibility
- Schema.ts file is very large (32k+ tokens), need to use grep/search or offset/limit when reading
- The coachParentSummaries table already had extensive Phase 2 and Phase 3 fields (auto-approval, revocation tracking)
- Pre-commit hooks run biome with --diagnostic-level=error, so only errors block commits, not warnings
--
- packages/backend/convex/models/coachParentSummaries.ts (+20 lines, -1 line)
- ✅ Type check: passed (npm run check-types)
- ✅ Codegen: passed (npx -w packages/backend convex codegen)


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
