# Phase 6: Drafts & Confirmation Workflow - Architecture Review Notes

**Date**: 2026-02-07
**Stories**: US-VN-019, US-VN-020, US-VN-021
**ADRs**: VN2-023 through VN2-032

## Critical Findings (4)

1. **C1**: insightType has 8 types in PRD but claims have 15 topics. FIX: Use 15-topic union.
2. **C2**: PHASE6_PRD proposes bare `by_status` index (anti-pattern). FIX: Remove, use `by_org_and_coach_and_status`.
3. **C3**: Status enum discrepancy (4 vs 5 values). FIX: Use 5 (include "expired").
4. **C4**: handleCommand as "action" impossible (Convex doesn't allow ctx.runAction from action). FIX: Async helper in lib/.

## Schema Corrections

### insightDrafts (ADR-VN2-029)
- Add `displayOrder: v.number()` (1-indexed per artifact)
- Add `resolvedPlayerName: v.optional(v.string())` (denormalized for WhatsApp summary)
- Use 15-topic insightType (not 8)
- Use 5 statuses (pending, confirmed, rejected, applied, expired)
- 5 indexes: by_draftId, by_artifactId, by_artifactId_and_status, by_org_and_coach_and_status, by_playerIdentityId_and_status

## Key Design Decisions

### Confidence Scoring (ADR-VN2-023)
- Formula: `overallConfidence = Math.max(0, Math.min(1, aiConfidence * resolutionConfidence))`
- Multiplication is punitive but safe (both signals must be high)
- Alias match = 1.0 resolutionConfidence, fuzzy = candidate.score, unresolved = 0.0

### Auto-Confirm Gate (ADR-VN2-024)
- Effective trust = min(currentLevel, preferredLevel ?? currentLevel) >= 2
- Never auto-confirm: injury, wellbeing, recovery
- Respect insightAutoApplyPreferences per-category toggle
- Use insightConfidenceThreshold (personalized) or 0.85 default

### Command Routing (ADR-VN2-025)
- Insert between Priority 3 (v1 confirmation) and Priority 4 (normal processing)
- Feature-flag gated (shouldUseV2Pipeline check)
- Anchored regex (^...$) to avoid false positives

### Draft Application (ADR-VN2-026)
- Target: voiceNoteInsights table (bridges to existing auto-apply pipeline)
- Lifecycle: pending -> confirmed -> applied (or rejected/expired)
- Expiry: 7-day TTL, lazy check (no cron)
- Requires artifact.voiceNoteId backward-compat link

### Command Handler (ADR-VN2-031)
- Parser: lib/whatsappCommands.ts (pure function, fully testable)
- Handler: lib/whatsappCommandHandler.ts (async helper, receives ActionCtx)
- NOT a standalone Convex action (can't call ctx.runAction from action)

### Draft Numbering (ADR-VN2-028)
- Stored displayOrder field (stable)
- "CONFIRM 1,2,3" scoped to most recent artifact
- "CONFIRM" (no numbers) confirms ALL pending across all artifacts

### Migration (ADR-VN2-027, ADR-VN2-032)
- Batch size: 50 default, 200 max
- Idempotency: check voiceNoteArtifacts.by_voiceNoteId
- Field mapping: see ADR-VN2-032 for complete mapping tables
- Create artifact first with status "processing", update to "completed" after

## Integration Points

- `entityResolution.ts` line ~187: Add scheduler for draftGeneration after logging summary
- `whatsapp.ts` between line 373 and 375: Add v2 command check
- `schema.ts` after line 4384: Add insightDrafts table

## Open Tech Debt (Cumulative from Phase 3-6)

- coachContext.ts firstName/lastName pattern (Phase 4, still open)
- whatsapp.ts calls public mutations from internalAction (Phase 3, still open)
- resolveEntity backend org membership check deferred (Phase 5)
- getRecentArtifacts/getRecentClaims no platform staff check (Phase 4)
- User-resolved entities from disambiguation UI do NOT trigger draft regeneration (Phase 6 gap)
