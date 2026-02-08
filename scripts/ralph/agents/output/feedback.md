
## Phase 7C Pre-Implementation Architecture Review

**Reviewer:** Claude Opus 4.6 (architecture-reviewer)
**Date:** 2026-02-08
**Scope:** US-VN-026 (applyDraft Output Bridge) + US-VN-027 (Auto-Confirm + Quality Gates)
**Overall Verdict: 3 CRITICAL, 5 WARNINGS, 4 SUGGESTIONS**

### ADRs Generated
- ADR-VN2-040: Parent summary enablement check in applyDraft
- ADR-VN2-041: applyDraft mutation complexity and failure modes
- ADR-VN2-042: validateTextMessage quality gate placement in createTypedNote

---

### CRITICAL Issues (All incorporated into Phase 7C PRD)

#### C1: PRD Omits parentSummariesEnabled Check (v1 Behavior Divergence)

**Files:** `actions/voiceNotes.ts:940-951` (v1 check), `models/insightDrafts.ts:462-536` (applyDraft)

The v1 pipeline checks `isParentSummariesEnabled` before scheduling `processVoiceNoteInsight`. The Phase 7C PRD Step 2 now includes this check. Query `coachOrgPreferences` with `by_coach_org` index before scheduling.

**STATUS: INCORPORATED INTO PRD**

#### C2: voiceNotes.insights[] Push Object Missing Fields

**Files:** `schema.ts:1525-1554` (embedded array schema)

PRD Step 1 push object now includes `appliedBy: draft.coachUserId` and `appliedDate: new Date(now).toISOString()` for v1 display compatibility.

**STATUS: INCORPORATED INTO PRD**

#### C3: Schema Change Must Execute FIRST

The PRD now emphasizes the execution order: schema changes (Step 3A + backlinks) -> codegen -> code changes. The `implementationOrder` section in `ralphInstructions` makes this explicit.

**STATUS: INCORPORATED INTO PRD**

---

### WARNINGS (For Ralph's awareness)

#### W1: Concurrent applyDraft Calls May Cause OCC Retries
When multiple drafts for the same note are auto-confirmed, concurrent `applyDraft` calls will read/write `voiceNotes.insights[]` on the same document. Convex OCC handles this safely via retries. No code fix needed — monitor for notes with 10+ auto-confirmed drafts.

#### W2: coachId source consistency
PRD says `draft.coachUserId`, ADR-VN2-037 says `artifact.senderUserId`. Both are equivalent (draft.coachUserId is set from artifact.senderUserId during generation). Use `draft.coachUserId` as the PRD says.

#### W3: confirmDraftInternal doesn't schedule applyDraft
The WhatsApp command handler calls `confirmDraftInternal` then separately schedules `applyDraft`. Fragile but correct. Not a Phase 7C issue.

#### W4: playerId in autoAppliedInsights
After Step 3A makes playerId optional, do NOT include it in the insert. Simply omit the field entirely.

#### W5: insightsStatus may be premature
Setting `insightsStatus: 'completed'` when only some drafts are confirmed is technically premature. Acceptable for Phase 7C MVP.

---

### Auto-Confirm Logic Verification (US-VN-027): ALL 4 CHECKPOINTS PASS

1. **Trust level fetch (line 202-205):** CORRECT
2. **requiresConfirmation (lines 108-132):** CORRECT
3. **checkAutoApplyAllowed (lines 86-106):** CORRECT
4. **Auto-confirmed scheduling (lines 318-326):** CORRECT

**No changes needed to draftGeneration.ts.**

---

### Verified Facts (for Ralph reference)

| Item | Verified Value |
|------|---------------|
| processVoiceNoteInsight args count | 7 (voiceNoteId, insightId, insightTitle, insightDescription, playerIdentityId, organizationId, coachId) |
| processVoiceNoteInsight.insightId type | v.string() (NOT Convex _id) |
| processVoiceNoteInsight.playerIdentityId type | v.id("playerIdentities") (REQUIRED) |
| autoAppliedInsights.insightId type | v.id("voiceNoteInsights") (Convex _id from insert) |
| autoAppliedInsights.playerId current type | v.id("orgPlayerEnrollments") (NOT optional, needs schema change) |
| autoAppliedInsights required fields | insightId, voiceNoteId, playerId, playerIdentityId, coachId, organizationId, category, confidenceScore, insightTitle, insightDescription, appliedAt, autoAppliedByAI, changeType, targetTable, newValue |
| voiceNotes.insights[] id field | v.string() (use draft.draftId) |
| voiceNotes.insights[] status values | "pending", "applied", "dismissed", "auto_applied" |
| claim.recommendedAction | v.optional(v.string()) at schema.ts:4255 |
| internal already imported in insightDrafts.ts | YES, line 11 |
| validateTextMessage is sync | YES, no ctx needed |
| coachOrgPreferences has by_coach_org index | YES, schema.ts:2590+ |
| Existing precedent for mutation scheduling action | YES, voiceNotes.ts:631 |
