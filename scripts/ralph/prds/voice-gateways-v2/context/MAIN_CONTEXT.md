# Voice Gateways v2 - Main Context

**Project**: Voice Enhance Gating-WAPP v2
**Branch**: feat/voice-gateways-v2
**Issue**: #423 - WhatsApp Voice Notes Quality Gates & Feedback Loops
**Status**: Phase 5 (Entity Resolution) — Phases 1-4 COMPLETE

---

## Project Overview

This project comprehensively improves the WhatsApp voice notes pipeline with quality gates, fuzzy player matching, and a phased migration to Voice Notes Pipeline v2 architecture. It addresses the core issues identified in Issue #423: gibberish messages being processed, unclear feedback loops, and poor player name matching.

### Problem Statement

**Current Issues** (from Issue #423):
1. ❌ **No quality gates** - All messages processed regardless of quality (gibberish, empty, duplicates)
2. ❌ **Generic error messages** - "Still processing..." doesn't tell coaches what went wrong
3. ❌ **Exact matching only** - "Shawn" doesn't match "Seán", "Neeve" doesn't match "Niamh"
4. ❌ **Wasted API calls** - ~5-10% of processing cycles on low-quality messages (~$50-100/month waste)
5. ❌ **User confusion** - Coaches don't know if their message worked or why it failed

### Solution Architecture

**6-Phase Incremental Approach**:
```
Phase 1 (Week 1): Quality Gates + Fuzzy Matching
    ↓
Phase 2 (Week 2): Mobile Quick Review UI
    ↓
Phase 3 (Week 3): v2 Artifacts Foundation
    ↓
Phase 4 (Week 4): Claims Extraction
    ↓
Phase 5 (Week 5): Entity Resolution & Disambiguation
    ↓
Phase 6 (Week 6): Drafts & Confirmation Workflow
```

---

## Core Concepts

### 1. Quality Gates

**Purpose**: Validate message quality BEFORE expensive AI processing.

**Entry Points**:
- Text messages → `validateTextMessage()` checks
- Audio transcripts → `validateTranscriptQuality()` checks

**Validation Checks**:
| Check | Threshold | Action if Failed |
|-------|-----------|------------------|
| Empty message | length === 0 | Reject immediately |
| Too short text | < 10 chars | Reject with "Please provide more detail" |
| Too few words | < 3 words | Reject with "Use at least 3 words" |
| Gibberish | avg word length > 20 or < 2 | Reject with "Couldn't understand" |
| Spam | Repeated chars `/(.)\1{5,}/` | Reject with "Looks like a test message" |
| Duplicate | Same message < 5 min ago | Reject with "Similar message X seconds ago" |
| Inaudible audio | > 50% uncertainty markers | Reject with transcript snippet |
| Short audio | < 3 seconds | Reject with "Audio too short" |

**Cost Savings**:
- Before: Process all messages → ~$0.036 per message (transcription + insights)
- After: Reject 5-10% early → Save $40-80/month
- Better UX: Immediate feedback instead of 60+ second wait

### 2. Fuzzy Player Matching

**Purpose**: Match player names despite typos, Irish spellings, and phonetic variations.

**Algorithm**: Levenshtein Distance
- Measures edit distance between two strings
- Converts to similarity score: `1 - (distance / maxLength)`
- Example: `levenshteinSimilarity("Seán", "Shawn")` = 0.85

**Threshold**: 0.5 (configurable)
- < 0.5 → No match
- 0.5-0.7 → Possible match (show with caution)
- 0.7-0.9 → Likely match (show with confidence)
- > 0.9 → Very likely match (can auto-resolve if only candidate)

**Normalization**:
- Lowercase: "Seán" → "seán"
- Remove diacritics: "Seán" → "sean", "Niamh" → "niamh"
- Remove prefixes: "O'Brien" → "brien", "MacLeod" → "leod"
- Trim whitespace

**Context Weighting** (Bonus):
- Recently mentioned player: +0.1 to similarity
- Player from mentioned team: +0.15 to similarity

### 3. Pipeline v2 Architecture

**Current (v1)**:
```
WhatsApp Message
    ↓
Create VoiceNote (single record with embedded insights array)
    ↓
Transcribe (all-or-nothing)
    ↓
Extract Insights (one array, mixed players)
    ↓
Auto-Apply (immediate, no confirmation)
```

**Target (v2)**:
```
WhatsApp Message
    ↓
Artifact (source-agnostic record)
    ↓
Transcript (with segments, confidence scores)
    ↓
Claims (atomic units, one per player mention)
    ↓
Entity Resolution (fuzzy matching, disambiguation)
    ↓
Org Partitioning (multi-org safety)
    ↓
Drafts (pending confirmation)
    ↓
Confirmation (user approves)
    ↓
Commit (apply to player records)
```

**Migration Strategy**: Coexistence
- v1 and v2 tables live side-by-side
- New messages use v2 pipeline (when enabled)
- Old voice notes remain in v1 format
- Bulk migration script available but optional

---

## Feature Flags (featureFlags Table)

**Evaluation Order** (cascade, first match wins):
1. Environment variable `VOICE_NOTES_V2_GLOBAL` (global kill switch)
2. `featureFlags` table — `platform` scope
3. `featureFlags` table — `organization` scope (per-org)
4. `featureFlags` table — `user` scope (per-coach)
5. Default: `false` (v1)

**Implementation**: Uses a new `featureFlags` table (created in US-VN-014) following the `aiModelConfig` cascade pattern. There is NO `platformConfig` table, NO `organization.voiceNotesVersion` field, and NO `member.betaFeatures` field in this codebase.

```typescript
// packages/backend/convex/lib/featureFlags.ts — internalQuery
// Called from actions via: ctx.runQuery(internal.lib.featureFlags.shouldUseV2Pipeline, { ... })

export const shouldUseV2Pipeline = internalQuery({
  args: { organizationId: v.string(), userId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // 1. Env var (global kill switch)
    const envFlag = process.env.VOICE_NOTES_V2_GLOBAL;
    if (envFlag === "true") return true;
    if (envFlag === "false") return false;

    // 2. Platform-level flag (featureFlags table)
    const platformFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_featureKey_and_scope", (q) =>
        q.eq("featureKey", "voice_notes_v2").eq("scope", "platform")
      )
      .first();
    if (platformFlag) return platformFlag.enabled;

    // 3. Org-level flag
    const orgFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_featureKey_scope_org", (q) =>
        q.eq("featureKey", "voice_notes_v2").eq("scope", "organization")
          .eq("organizationId", args.organizationId)
      )
      .first();
    if (orgFlag) return orgFlag.enabled;

    // 4. User-level flag
    const userFlag = await ctx.db
      .query("featureFlags")
      .withIndex("by_featureKey_scope_user", (q) =>
        q.eq("featureKey", "voice_notes_v2").eq("scope", "user")
          .eq("userId", args.userId)
      )
      .first();
    if (userFlag) return userFlag.enabled;

    // 5. Default to v1
    return false;
  },
});
```

---

## Testing Strategy

### Unit Tests (Mandatory)

**Coverage Requirements**:
- All validation functions: 100% coverage
- Levenshtein algorithm: 100% coverage
- Edge cases: Empty strings, single chars, identical strings, no matches

**Test Files**:
```
packages/backend/convex/__tests__/
├── messageValidation.test.ts      (US-VN-001, US-VN-002)
├── duplicateDetection.test.ts     (US-VN-003)
├── whatsappFeedback.test.ts       (US-VN-004)
├── stringMatching.test.ts         (US-VN-005)
└── playerMatching.test.ts         (US-VN-006)
```

**Run Command**: `npm test -- __tests__/messageValidation.test.ts`

### Manual UAT (Required)

**Test Cases** (from ISSUE_423_WHATSAPP_QUALITY_GATES_ANALYSIS.md):

**Quality Gates (QG-001 to QG-008)**:
- QG-001: Send empty text → Rejected
- QG-002: Send "hi" → Rejected (too short)
- QG-003: Send "asdfjkl;" → Rejected (gibberish)
- QG-004: Voice note with background noise only → Rejected after transcription
- QG-005: 1-second voice note → Rejected (too short)
- QG-006: Voice note in French → Detected, asks for confirmation
- QG-007: Same text twice within 2 min → Second rejected as duplicate
- QG-008: Valid message → Processed normally

**Feedback Messages (FB-001 to FB-005)**:
- FB-001: Transcription fails → Specific error with suggestions
- FB-002: No players mentioned → Clear explanation
- FB-003: Success → Summary with counts
- FB-004: Unclear transcript → Shows snippet + CONFIRM/RETRY options
- FB-005: Multi-org ambiguity → Numbered org list

**Fuzzy Matching (FM-001 to FM-005)**:
- FM-001: "Shawn" → Matches "Seán" (0.85), "Shane" (0.75), "Shaun" (0.90)
- FM-002: "Neeve" → Matches "Niamh" (0.60), "Neve" (0.90)
- FM-003: "O'Brian" → Matches "O'Brien" (0.95), "O'Bryan" (0.85)
- FM-004: "Paddy" → Matches "Patrick" (0.70), "Pádraig" (0.65)
- FM-005: "the twins" → Needs disambiguation UI (future)

### Type Checking (Mandatory)

**Command**: `npm run check-types`
**Success Criteria**: 0 errors

**Common Issues to Watch**:
- Missing return validators
- Incorrect v.id() usage (should be v.string() for Better Auth)
- Missing args validators
- Type mismatches in Map lookups

---

## Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Text validation | < 1ms | Simple regex checks |
| Transcript validation | < 5ms | String analysis only |
| Duplicate detection | < 10ms | Index lookup within time window |
| Levenshtein calculation | < 1ms per pair | Optimized DP algorithm |
| Player fuzzy matching | < 100ms for 1000 players | Batch processing with similarity calc |
| WhatsApp feedback | < 500ms | Network call to Twilio |

**Optimization Tips**:
- Use indexes for all queries (never `.filter()`)
- Normalize strings once, cache result
- Short-circuit validation (fail fast on first rejection)
- Batch fetch players before similarity loop

---

## Analytics & Monitoring

### Rejection Metrics (Track in `whatsappMessages` table)

```typescript
// Aggregation query for analytics
export const getRejectionStats = query({
  args: {
    organizationId: v.string(),
    timeRange: v.object({
      start: v.number(),
      end: v.number()
    })
  },
  returns: v.object({
    totalMessages: v.number(),
    rejectedCount: v.number(),
    rejectionRate: v.number(),
    rejectionReasons: v.array(v.object({
      reason: v.string(),
      count: v.number()
    }))
  }),
  handler: async (ctx, args) => {
    // Query messages within time range
    // Group by rejection reason
    // Calculate rates
  }
});
```

**Dashboard Metrics**:
- Rejection rate by reason (empty, too_short, gibberish, etc.)
- Cost savings (rejected messages * $0.036)
- Average similarity score for matched players
- False positive rate (user manually corrected after auto-match)

### Alerts

**Trigger Alerts When**:
- Rejection rate > 20% (possible bug or UX issue)
- Duplicate rate > 10% (network issues or user confusion)
- Fuzzy match success rate < 60% (threshold too high or bad player data)

---

## Migration Path (v1 → v2)

### Phase 3: Parallel Operation
- v1 continues for existing messages
- v2 enabled via feature flags for new messages
- Both pipelines operational

### Phase 4-6: Gradual Migration
- Claims extraction (Phase 4)
- Entity resolution (Phase 5)
- Drafts workflow (Phase 6)

### Bulk Migration Script (Optional)
```bash
# Run once to migrate all historical voice notes
npm run migrate:voice-notes-to-v2

# Script creates:
# - Artifacts from existing voiceNotes
# - Transcripts from existing transcript field
# - Claims from existing insights array
# - Drafts for pending insights
```

**Data Integrity**:
- Original voiceNotes table preserved (read-only)
- New tables link back via `voiceNoteId` field
- Rollback possible (just disable v2 feature flags)

---

## Common Pitfalls (Avoid These)

### ❌ Don't
- Use `.filter()` after `.withIndex()` (performance killer)
- Process messages without quality checks (waste of API calls)
- Use exact string matching for player names (always fuzzy)
- Send generic error messages ("Something went wrong")
- Skip unit tests for validation logic
- Use Better Auth IDs as `v.id()` (should be `v.string()`)

### ✅ Do
- Validate input at entry points (WhatsApp webhook)
- Provide specific, actionable error messages
- Normalize strings before matching
- Use early return pattern for rejection
- Write comprehensive unit tests
- Use composite indexes for multi-field queries
- Batch fetch with Map lookup to avoid N+1

---

## Success Criteria (Phase 1)

**Must Have** (Blocking Phase 2):
- ✅ Quality gates reject gibberish messages
- ✅ Detailed error messages sent to WhatsApp
- ✅ Duplicate detection working within 5 minutes
- ✅ Fuzzy matching returns top 5 candidates (similarity > 0.5)
- ✅ Irish names handled correctly (Seán, Niamh, O'Brien)
- ✅ All unit tests passing (100% coverage)
- ✅ Type check passes (0 errors)
- ✅ Manual UAT: 18 test cases passing
- ✅ Documentation updated

**Nice to Have** (Non-Blocking):
- ⚠️ Analytics dashboard for rejection metrics
- ⚠️ Context weighting (recent mentions)
- ⚠️ Performance optimizations beyond targets
- ⚠️ Email notifications for rejections

---

## Related Documentation

- **Issue #423**: [GitHub](https://github.com/NB-PDP-Testing/PDP/issues/423)
- **Analysis**: `docs/archive/bug-fixes/ISSUE_423_WHATSAPP_QUALITY_GATES_ANALYSIS.md`
- **Quick Review Plan**: `docs/features/MOBILE_QUICK_REVIEW_PLAN.md`
- **v2 Architecture**: `docs/architecture/voice-notes-pipeline-v2.md`
- **WhatsApp Patterns**: `docs/architecture/whatsapp-integration-patterns.md`
- **Validation Patterns**: `.ruler/voice-notes-validation-patterns.md` (to be created)

---

## Next Steps (For Ralph)

1. **Read Phase 4 Context**: `context/PHASE4_CLAIMS_EXTRACTION.md`
2. **Read Working PRD**: `scripts/ralph/prd.json` (updated for Phase 4)
3. **US-VN-015**: Schema + model + helper + extraction action
4. **US-VN-016**: Pipeline hook + claims viewer
5. **Verify**: `npm run check-types` + `npm run build`
6. **Commit**: `feat: US-VN-015 - Claims Table & Extraction Action` then `feat: US-VN-016 - Pipeline Integration & Claims Viewer`

**Questions?** Check `context/PHASE4_CLAIMS_EXTRACTION.md` for detailed implementation guidance.
