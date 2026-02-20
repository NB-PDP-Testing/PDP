# Voice Monitor Harness - Phase M1 Pre-Implementation Review

**Date:** 2026-02-15
**Result:** APPROVED WITH CHANGES (3 issues found, 0 blockers)

## ADRs Generated
- ADR-VNM-001: Event log schema (time-window partitioning, 27 events, 9 indexes)
- ADR-VNM-002: Counter-based metrics (atomic increment, window rotation)
- ADR-VNM-003: Fire-and-forget event logging (mutation vs action patterns)
- ADR-VNM-004: Snapshot-based analytics (hourly/daily aggregation)

## Critical Findings

### C1: computeTimeWindow must use UTC methods
PRD examples use `getHours()` (local time). Must use `getUTCHours()`, `getUTCMonth()`, etc.

### C2: getActiveArtifacts multi-status query problem
Needs to query 4 statuses (received, transcribing, transcribed, processing).
Convex doesn't support OR on indexes. Options:
- 4 separate queries per status with .take(20), merge results
- Add status parameter to API, let frontend handle tabs
Recommended: Add status parameter

### C3: Metadata object missing 3 fields
PRD metadata validator omits `sourceChannel`, `draftCount`, `autoResolvedCount`
which are referenced in US-VNM-003 instrumentation code.

## Verified Correct Patterns
- CRITICAL_FIXES 1-4 all applied to PHASE_M1.json
- Fire-and-forget: mutations use scheduler, actions use await + try/catch
- organizationId: orgContextCandidates[0]?.organizationId (correct)
- Counter atomicity: same transaction as event insert (correct)
- Counter race handling: atomic patch on window expiry (correct)
- All 7 performance patterns properly documented

## Import Status for Instrumented Files
| File | Has `internal` import | Action needed |
|------|-----------------------|---------------|
| voiceNoteArtifacts.ts | NO | Add import |
| voiceNoteTranscripts.ts | NO | Add import |
| voiceNoteClaims.ts | NO | Add import |
| voiceNoteEntityResolutions.ts | YES (reviewAnalytics) | None |
| insightDrafts.ts | YES (applyDraft) | None |
| actions/voiceNotes.ts | YES | None |
| actions/claimsExtraction.ts | YES | None |
| actions/entityResolution.ts | YES | None |
| actions/draftGeneration.ts | YES | None |

## transcribeAudio Instrumentation Note
transcribeAudio processes audio FIRST, then checks for v2 artifacts.
transcription_started event must use voiceNoteId (not artifactId) since
artifact lookup happens after transcription.

## Counter organizationId Note
Schema uses v.optional(v.string()). For platform-wide counters, OMIT the
field (don't set to null). Query with `.eq("organizationId", undefined)`.
Needs runtime verification in Convex dashboard.
