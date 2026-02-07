# Phase 6: Drafts & Confirmation Workflow -- Pre-Implementation Architectural Review

**Reviewer**: Architecture Reviewer Agent
**Date**: 2026-02-07
**Phase**: 6 (Drafts & Confirmation Workflow)
**Stories**: US-VN-019, US-VN-020, US-VN-021
**ADRs Generated**: 10 (ADR-VN2-023 through ADR-VN2-032)

---

## Executive Summary

Phase 6 is architecturally sound with well-defined scope. The main PRD (`prd.json`) and phase PRD (`PHASE6_PRD.json`) have several **discrepancies** that must be resolved before implementation. There are **3 critical findings** (blocking), **5 warnings**, and **4 suggestions**. All findings have been addressed in ADRs with recommended fixes.

---

## CRITICAL: PRD Discrepancies (Resolve Before Implementation)

### C1: insightType field has 8 types in PRD but claims have 15 topics

**File**: `prd.json` lines 94-95
**Issue**: The PRD specifies `insightType: v.union('injury','wellbeing','performance','attendance','behavior','skill_rating','development_milestone','note')` (8 types). But `voiceNoteClaims.topic` has 15 values (injury, skill_rating, skill_progress, behavior, performance, attendance, wellbeing, recovery, development_milestone, physical_development, parent_communication, tactical, team_culture, todo, session_plan).

**Impact**: 7 claim topics would need lossy mapping to the 8 insightType values. This loses granularity.

**Fix**: Use the full 15-topic union from voiceNoteClaims (ADR-VN2-029). The insightDrafts schema should mirror the claim topic taxonomy exactly:

```typescript
insightType: v.union(
  v.literal("injury"),
  v.literal("skill_rating"),
  v.literal("skill_progress"),
  v.literal("behavior"),
  v.literal("performance"),
  v.literal("attendance"),
  v.literal("wellbeing"),
  v.literal("recovery"),
  v.literal("development_milestone"),
  v.literal("physical_development"),
  v.literal("parent_communication"),
  v.literal("tactical"),
  v.literal("team_culture"),
  v.literal("todo"),
  v.literal("session_plan")
)
```

### C2: PHASE6_PRD has `by_status` index (anti-pattern)

**File**: `PHASE6_PRD.json` line 37
**Issue**: The Phase 6 PRD proposes a bare `by_status: ['status']` index with no org scoping. This is a known anti-pattern (unbounded table scan across all orgs) explicitly forbidden in CLAUDE.md.

**Fix**: Remove `by_status`. Use `by_org_and_coach_and_status` for all status-based queries (ADR-VN2-029).

### C3: PRD discrepancy on insightDrafts.status values

**File**: `prd.json` line 102 vs `PHASE6_PRD.json` line 33
**Issue**: Main PRD has 5 statuses (pending, confirmed, rejected, applied, expired). Phase PRD has 4 statuses (pending, confirmed, rejected, applied -- missing "expired").

**Fix**: Use 5 statuses from the main PRD. Expired drafts are handled via lazy expiry check (ADR-VN2-026).

### C4: handleCommand as "action" vs architectural constraint

**File**: `PHASE6_PRD.json` line 106
**Issue**: Phase PRD says `handleCommand (action)` but Convex does not support `ctx.runAction()` from within another action. The handler is called from `processIncomingMessage` (which is an internalAction), so it cannot be a separate action called synchronously.

**Fix**: Implement as an async helper function in `lib/whatsappCommandHandler.ts` instead of a standalone action (ADR-VN2-031). The parser goes in `lib/whatsappCommands.ts` as a pure function.

---

## WARNINGS

### W1: Missing `displayOrder` field in PRD schema

**Issue**: The PRD does not include a `displayOrder` field in insightDrafts. Without it, the "CONFIRM 1,2,3" numbering is unstable (ADR-VN2-028).

**Fix**: Add `displayOrder: v.number()` to schema. Assign 1-indexed when drafts are batch-created.

### W2: Missing `resolvedPlayerName` denormalization

**Issue**: The PRD does not include `resolvedPlayerName` in insightDrafts. The WhatsApp summary message needs player names (e.g., "1. Ella - hamstring tightness"). Without denormalization, the handler must look up each player name, causing N+1 queries.

**Fix**: Add `resolvedPlayerName: v.optional(v.string())` to schema. Populated from the entity resolution's `resolvedEntityName`.

### W3: Migration script location mismatch

**Issue**: Phase PRD says `scripts/migrations/voice-notes-to-v2.ts` but main PRD says `packages/backend/convex/actions/migration.ts`. A Convex internalAction is the correct approach (can use `ctx.runQuery`/`ctx.runMutation`).

**Fix**: Create as `packages/backend/convex/actions/migration.ts` (internalAction). No external script needed.

### W4: Missing `by_artifactId_and_status` index

**Issue**: The command handler needs to query "pending drafts for this artifact" efficiently. The PRD indexes don't include `by_artifactId_and_status`.

**Fix**: Add `.index("by_artifactId_and_status", ["artifactId", "status"])` to insightDrafts (ADR-VN2-029).

### W5: Auto-confirm logic ignores insightAutoApplyPreferences

**Issue**: The PRD's auto-confirm check is `overallConfidence >= 0.85 AND trustLevel >= 2`. This ignores:
- `insightAutoApplyPreferences` (per-category toggle)
- `insightConfidenceThreshold` (personalized threshold)
- `preferredLevel` cap on trust level
- Never-auto-confirm categories (injury, wellbeing, recovery)

**Fix**: Use the full auto-confirm gate from ADR-VN2-024. The simple check is a starting point but must be expanded.

---

## SUGGESTIONS

### S1: Consider adding `by_org_and_status` index to insightDrafts

For a future admin view ("show all pending drafts in this org"), the index `by_org_and_status: [organizationId, status]` would be useful. Not needed for Phase 6 but keep in mind for Phase 7+.

### S2: Consider WhatsApp summary message format

The PRD shows emoji-rich messages but does not specify the exact template. Define a `lib/draftSummaryFormatter.ts` utility for formatting the WhatsApp summary. This keeps formatting logic out of the handler and makes it testable.

### S3: Unit test coverage for confidence scoring

The confidence scoring formula (ADR-VN2-023) and auto-confirm gate (ADR-VN2-024) should have unit tests. The PRD only specifies tests for the command parser.

### S4: Consider rate limiting on CONFIRM commands

If a coach sends "CONFIRM" rapidly, each invocation processes pending drafts. The Convex serialization handles correctness, but the coach gets multiple response messages. Consider deduplicating within a short window (5 seconds).

---

## ADR Summary

| ADR | Title | Key Decision |
|-----|-------|-------------|
| VN2-023 | Draft Confidence Scoring Formula | Use `ai * resolution` with [0,1] clamping |
| VN2-024 | Auto-Confirm Threshold and Trust Gating | Use personalized threshold + category preferences + never-auto-confirm for sensitive |
| VN2-025 | WhatsApp Command Routing and Concurrency | Insert between Priority 3 and 4 in processIncomingMessage, anchored regex |
| VN2-026 | Draft Application Target and Lifecycle | Apply to voiceNoteInsights table, 7-day lazy expiry |
| VN2-027 | Migration Batch Size and Timeout | Default batch 50, max 200, single action with idempotency |
| VN2-028 | Draft Numbering Stability | Stored `displayOrder` per artifact, CONFIRM numbers scoped to most recent artifact |
| VN2-029 | Insight Drafts Schema and Index Strategy | 5 indexes, 15-topic insightType, displayOrder + resolvedPlayerName fields |
| VN2-030 | Draft Generation Scheduling | Schedule from entityResolution.ts, no separate feature flag |
| VN2-031 | Command Handler Architecture | Parser as pure function in lib/, handler as async helper in lib/ |
| VN2-032 | Migration Field Mapping and Idempotency | Artifact-first creation, by_voiceNoteId idempotency check |

---

## Implementation Order and Dependencies

```
US-VN-019: Drafts Table & Auto-Confirm Logic
  1. Add insightDrafts table to schema.ts (with corrected fields from ADR-VN2-029)
  2. Create models/insightDrafts.ts (8 functions: 3 internal + 5 public)
  3. Create actions/draftGeneration.ts (internalAction)
  4. Hook into entityResolution.ts (scheduler call after line 187)
  5. Run codegen + type check

US-VN-020: WhatsApp Command Parser & Handler
  1. Create lib/whatsappCommands.ts (parseCommand pure function)
  2. Create lib/whatsappCommandHandler.ts (handleCommand async helper)
  3. Create __tests__/whatsappCommands.test.ts (parser unit tests)
  4. Integrate into whatsapp.ts processIncomingMessage (between Priority 3 and 4)
  5. Run codegen + type check

US-VN-021: v1-to-v2 Migration Script
  1. Create actions/migration.ts (internalAction with field mapping from ADR-VN2-032)
  2. Test with dryRun=true on a test org
  3. Test with dryRun=false on small dataset
  4. Run codegen + type check
```

---

## Pre-Implementation Checklist

- [ ] Resolve C1: Use 15-topic insightType (not 8)
- [ ] Resolve C2: Remove bare `by_status` index
- [ ] Resolve C3: Use 5-status enum (include "expired")
- [ ] Resolve C4: Handler as lib/ async function (not action)
- [ ] Add `displayOrder` field (W1)
- [ ] Add `resolvedPlayerName` field (W2)
- [ ] Add `by_artifactId_and_status` index (W4)
- [ ] Use full auto-confirm gate logic (W5)
- [ ] Read all 10 ADRs (VN2-023 through VN2-032) before starting
- [ ] Verify `npm run check-types` passes after each story
- [ ] Verify `npm run build` passes after each story

---

## Blocking Concerns

**None** -- all critical issues have clear fixes documented in ADRs. The phase can proceed after implementing the corrections above.

The existing infrastructure (entity resolution, trust levels, feature flags) is well-suited for Phase 6. The integration points are clean and the scheduling chain is natural.

---

## Architecture Diagram: Phase 6 Pipeline Extension

```
WhatsApp Message
    |
    v
processIncomingMessage (whatsapp.ts)
    |
    +-- Priority 1-3: Existing command handling (unchanged)
    |
    +-- Priority 3.5: [NEW] v2 Command Check
    |       |
    |       +-- parseCommand() -> if command:
    |       |       handleCommand() -> response
    |       |       sendWhatsAppMessage(response)
    |       |       return early
    |       |
    |       +-- not command: continue
    |
    +-- Priority 4: processAudioMessage / processTextMessage
            |
            v
        [v2 path: create artifact]
            |
            v
        transcribeAudio (voiceNotes.ts)
            |
            v
        extractClaims (claimsExtraction.ts)
            |
            v
        resolveEntities (entityResolution.ts)
            |
            +-- [NEW] scheduler: generateDrafts (draftGeneration.ts)
                    |
                    v
                Get resolved claims + entity resolutions
                    |
                    v
                For each resolved claim:
                    - Map topic -> insightType
                    - Calculate overallConfidence
                    - Check auto-confirm gate
                    |
                    v
                createDrafts (insightDrafts.ts)
                    |
                    +-- If auto-confirmed: schedule applyDraft
                    |
                    +-- If pending: send WhatsApp summary
```
