# ADR-VN2-023: Draft Confidence Scoring Formula

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 6 (Drafts & Confirmation Workflow)
**Story**: US-VN-019

## Context and Problem Statement

Each insight draft needs an `overallConfidence` score that combines two independent signals:
1. **aiConfidence** (from `voiceNoteClaims.extractionConfidence`): How confident the AI was in extracting this claim from the transcript.
2. **resolutionConfidence** (from entity resolution): How confident the system was in matching the entity mention to a real player/team.

The PRD proposes `overallConfidence = aiConfidence * resolutionConfidence`. We need to validate this formula and define edge cases.

## Analysis

### Multiplication Formula (PRD Proposal)

`overall = ai * resolution`

| aiConfidence | resolutionConfidence | overall | Interpretation |
|-------------|---------------------|---------|----------------|
| 0.95 | 1.00 (alias match) | 0.95 | High AI + alias = very confident |
| 0.95 | 0.85 (fuzzy match) | 0.81 | High AI + good fuzzy = still good |
| 0.70 | 0.90 | 0.63 | Medium AI + good fuzzy = below threshold |
| 0.50 | 0.50 | 0.25 | Low both = very low |
| 0.90 | 0.00 (unresolved) | 0.00 | Good AI but no player = zero |

**Strengths**:
- Simple, predictable
- Both signals must be high for the draft to auto-confirm (AND semantics)
- Zero propagation: if either signal is zero, overall is zero (correct -- unresolved entities should never auto-confirm)

**Weaknesses**:
- Multiplication can be overly punitive. A 0.85 * 0.85 = 0.72 which is below the 0.85 threshold. Both signals are individually strong but the product falls short.
- Does not account for different error profiles (AI extraction errors vs entity resolution errors are independent failure modes)

### Alternative: Weighted Geometric Mean

`overall = (ai^0.6) * (resolution^0.4)` -- weights AI confidence more since extraction accuracy is more established.

This would give: 0.85^0.6 * 0.85^0.4 = 0.85 (exactly at threshold). Better behavior for the "both moderately high" case but adds complexity.

### Alternative: Minimum

`overall = min(ai, resolution)` -- the chain is only as strong as its weakest link.

This would give min(0.85, 0.85) = 0.85 (at threshold). Simple but loses the distinction between (0.95, 0.85) and (0.85, 0.85).

## Decision

**Use simple multiplication** (`overallConfidence = aiConfidence * resolutionConfidence`) with **bounds clamping**.

Rationale:
1. The multiplication formula is the simplest to understand, debug, and explain to coaches
2. The punitive nature is actually a safety feature -- we want HIGH confidence for auto-apply
3. Auto-confirmed coach aliases get resolutionConfidence = 1.0, so for trusted coaches with known players, the formula reduces to just aiConfidence (which is what we want)
4. The 0.85 threshold can be adjusted per-coach via `insightConfidenceThreshold` in coachTrustLevels

### Bounds Clamping

```typescript
const overallConfidence = Math.max(0, Math.min(1, aiConfidence * resolutionConfidence));
```

Both inputs MUST be validated to [0, 1] range before multiplication. The clamp on the output is a safety net.

### Edge Cases

| Case | aiConfidence | resolutionConfidence | overall | Behavior |
|------|-------------|---------------------|---------|----------|
| Unresolved entity | 0.95 | 0.0 | 0.0 | Draft created but `requiresConfirmation = true`, no player linked |
| Coach alias hit | 0.80 | 1.0 | 0.80 | Below 0.85 threshold, requires confirmation |
| Perfect match | 0.95 | 1.0 | 0.95 | Above threshold, auto-confirm candidate |
| Group reference ("the twins") | 0.90 | 0.0 | 0.0 | Unresolved group, requires entity mapping |

### Where resolutionConfidence Comes From

- `auto_resolved` with alias: `1.0` (coach alias is deterministic)
- `auto_resolved` with fuzzy match: top candidate's `score` from `voiceNoteEntityResolutions.candidates[0].score`
- `user_resolved`: `1.0` (human confirmed)
- `needs_disambiguation`: `0.0` (not resolved yet, draft should not be created)
- `unresolved`: `0.0` (no match found, draft created with no player but requires confirmation)

**Important**: Drafts should ONLY be created for claims with status `resolved` or `auto_resolved` entity resolutions. Claims still in `needs_disambiguation` or `unresolved` status should NOT generate drafts yet.

## Consequences

**Positive**: Simple, safe formula. Easy to debug and explain. Correctly blocks auto-confirm when either signal is weak.
**Negative**: Some "both moderately confident" cases (0.85 * 0.85 = 0.72) will not auto-confirm even though both signals are individually strong. This is acceptable -- the coach can still manually confirm via WhatsApp with one message.
